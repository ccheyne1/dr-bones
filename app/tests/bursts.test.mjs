import test from 'node:test';import assert from 'node:assert/strict';
import {ElasticBurst} from '../public/bursts.js';
const music=t=>({beat:t*2,bpm:120,activity:1,energy:1,confidence:.8,silent:false});

test('strong music triggers a smooth 200% sequence and waits at least five minutes after each sequence',()=>{
  const burst=new ElasticBurst(()=>0),starts=[],ends=[];let previous=null,peak=0,last=1;
  for(let i=0;i<=60*700;i++){
    const t=i/60,value=burst.step(t,music(t));peak=Math.max(peak,value);
    if(previous===null&&burst.startedAt!==null)starts.push(t);
    if(previous!==null&&burst.startedAt===null)ends.push(t);
    assert.ok(Math.abs(value-last)<.04);assert.ok(value>=1&&value<=2);last=value;previous=burst.startedAt;
  }
  assert.equal(peak,2);assert.equal(starts.length,3);assert.ok(starts[0]>=2);
  for(let i=1;i<starts.length;i++)assert.ok(starts[i]-ends[i-1]>=300-.02);
});

test('loudness, weak rhythm and short isolated rhythmic bursts cannot trigger the flourish',()=>{
  for(const change of [{confidence:0},{energy:.5},{activity:.4},{silent:true}]){
    const burst=new ElasticBurst(()=>0);for(let i=0;i<60*20;i++)assert.equal(burst.step(i/60,{...music(i/60),...change}),1);
    assert.equal(burst.startedAt,null);
  }
  const burst=new ElasticBurst(()=>0);for(let i=0;i<60*30;i++){const t=i/60;burst.step(t,{...music(t),energy:t%3<1?1:.4});}assert.equal(burst.startedAt,null);
});

test('a song break pauses the burst and the five-minute cooldown starts after its eventual completion',()=>{
  const burst=new ElasticBurst(()=>0);for(let i=0;i<=300;i++)burst.step(i/60,music(i/60));
  assert.equal(burst.envelope,1);const elapsed=burst.elapsedActive;
  for(let i=301;i<=540;i++){const t=i/60;burst.step(t,{...music(t),silent:true,activity:0});}
  assert.equal(burst.envelope,0);assert.equal(burst.elapsedActive,elapsed);assert.equal(burst.paused,true);assert.notEqual(burst.startedAt,null);
  let end;for(let i=541;i<60*30;i++){const t=i/60;const wasActive=burst.startedAt!==null;burst.step(t,music(t));if(wasActive&&burst.startedAt===null)end=t;}
  assert.ok(end>13);assert.equal(burst.played,1);assert.ok(burst.nextAllowed-end>=300);
});

test('host off, zero bendiness and reduced motion prevent automatic bursts',()=>{
  for(const [base,enabled,reduced] of [[1,false,false],[0,true,false],[1,true,true]]){
    const burst=new ElasticBurst(()=>0);for(let i=0;i<60*20;i++)assert.equal(burst.step(i/60,music(i/60),base,enabled,reduced),base);
    assert.equal(burst.startedAt,null);
  }
});

test('restored cooldown is respected and a long frame gap preserves a single pending burst',()=>{
  const burst=new ElasticBurst(()=>1);burst.nextAllowed=300;
  for(let i=0;i<60*300;i++)assert.equal(burst.step(i/60,music(i/60)),1);
  for(let i=60*300;i<=60*304;i++)burst.step(i/60,music(i/60));
  assert.notEqual(burst.startedAt,null);const elapsed=burst.elapsedActive;
  burst.step(900,music(900));assert.equal(burst.elapsedActive,elapsed);assert.equal(burst.envelope,0);assert.equal(burst.played,1);
  for(let i=1;i<60*12;i++)burst.step(900+i/60,music(900+i/60));
  assert.equal(burst.startedAt,null);assert.equal(burst.played,1);assert.ok(burst.nextAllowed>1200);
});
