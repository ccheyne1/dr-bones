import test from 'node:test';import assert from 'node:assert/strict';
import {DanceCameos,cameoPose,cameoRoutines} from '../public/cameos.js';
import {ElasticBurst} from '../public/bursts.js';
import {Stage} from '../public/render.js';import {defaultScene} from '../public/core.js';
const music=t=>({beat:t*2,bpm:120,activity:1,energy:1,confidence:.8,silent:false});

test('all five cameos have distinct, finite trajectories and bounded rig joints',()=>{
  const signatures=new Set();
  for(const {id}of cameoRoutines){const samples=[];let previous;
    for(let i=0;i<=960;i++){const p=cameoPose(id,i/60);assert.ok(Object.values(p).every(Number.isFinite));
      for(const [key,value]of Object.entries(p))if(!['x','y'].includes(key))assert.ok(Math.abs(value)<=(key==='body'||key==='head'?35:110)*Math.PI/180+1e-10);
      if(previous)assert.ok(Math.abs(p.armR-previous.armR)<.15);previous=p;if(i%60===0)samples.push(p);
    }signatures.add(JSON.stringify(samples));
  }assert.equal(signatures.size,5);assert.throws(()=>cameoPose('unsupported',0));
});

test('periodic cameos start on beats, blend in/out, stay spaced and visit every routine before repeating',()=>{
  const cameos=new DanceCameos(()=>0),starts=[],ends=[],ids=[];let previous=null,lastWeight=0;
  for(let i=0;i<60*800;i++){
    const t=i/60;cameos.step(t,music(t));
    if(!previous&&cameos.active){starts.push(t);ids.push(cameos.active.id);assert.ok(Math.abs(t*2-Math.round(t*2))<.04);}
    if(previous&&!cameos.active)ends.push(t);
    assert.ok(Math.abs(cameos.weight-lastWeight)<.03);lastWeight=cameos.weight;previous=cameos.active;
  }
  assert.ok(starts[0]>=45);assert.ok(starts.length>=8);
  for(let i=1;i<starts.length;i++){assert.ok(starts[i]-ends[i-1]>=75-.02);assert.notEqual(ids[i],ids[i-1]);}
  assert.equal(new Set(ids.slice(0,5)).size,5);
});

test('silence, off and reduced motion prevent cameos, while demo rhythm can run them',()=>{
  for(const [change,enabled,reduced]of [[{silent:true},true,false],[{activity:0},true,false],[{},false,false],[{},true,true]]){
    const c=new DanceCameos(()=>0);for(let i=0;i<60*90;i++)assert.equal(c.step(i/60,{...music(i/60),...change},enabled,reduced),null);
  }
  const c=new DanceCameos(()=>0);for(let i=0;i<60*46;i++)c.step(i/60,{...music(i/60),confidence:0,mode:'demo'});assert.ok(c.active);
});

test('new scenes and silence gently cancel the cameo without altering costume or selected choreography',()=>{
  const scene={...defaultScene(),hat:'witch'},stage=new Stage({getContext:()=>({})},scene);stage.cameos.nextAllowed=0;
  for(let i=0;i<120;i++)stage.cameos.step(i/60,music(i/60));assert.ok(stage.cameos.weight>.9);
  const next={...scene,dance:'salsa'};stage.apply(next,4);assert.equal(stage.cameos.interrupted,true);
  for(let i=120;i<240;i++)stage.cameos.step(i/60,{...music(i/60),silent:true,activity:0});
  assert.equal(stage.cameos.active,null);assert.deepEqual(stage.scene,next);assert.equal(scene.dance,'groove');
});

test('cameos and rubber-bones never overlap and leave a twelve-second separation',()=>{
  const c=new DanceCameos(()=>0),b=new ElasticBurst(()=>0);let previousC=false,previousB=false,lastCEnd=-Infinity,lastBEnd=-Infinity;let cStarts=0,bStarts=0;
  for(let i=0;i<60*1000;i++){
    const t=i/60,clock=music(t);
    b.step(t,clock,1,true,false,!!c.active||t<c.restUntil);
    c.step(t,clock,true,false,b.startedAt!==null||t<b.endsAt+12);
    const ca=!!c.active,ba=b.startedAt!==null;assert.equal(ca&&ba,false);
    if(!previousC&&ca){assert.ok(t-lastBEnd>=12-.02);cStarts++;}
    if(!previousB&&ba){assert.ok(t-lastCEnd>=12-.02);bStarts++;}
    if(previousC&&!ca)lastCEnd=t;if(previousB&&!ba)lastBEnd=t;
    previousC=ca;previousB=ba;
  }assert.ok(cStarts>5);assert.ok(bStarts>=3);
});

test('a long background-tab gap preserves the current cameo without replaying missed routines',()=>{
  const c=new DanceCameos(()=>0);c.nextAllowed=0;c.step(0,music(0));c.step(.5,music(.5));assert.ok(c.active);
  const id=c.active.id,phase=c.phase;c.step(1000,music(1000));assert.equal(c.active.id,id);assert.equal(c.phase,phase);assert.equal(c.weight,0);
  for(let i=1;i<60*10;i++)c.step(1000+i/60,music(1000+i/60));assert.equal(c.active,null);assert.equal(c.played,1);
});
