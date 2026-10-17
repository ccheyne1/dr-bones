import test from 'node:test';import assert from 'node:assert/strict';
import {dancerRoutines,dancerSprites} from '../public/background-dancers.js';
import {backgroundSprites,drawBackgroundCameo,partyBackgroundRoutines} from '../public/backgrounds.js';
import {Stage} from '../public/render.js';import {defaultScene} from '../public/core.js';

test('the three background casts have bounded counts, finite paths and an open centre',()=>{
  for(const {id}of dancerRoutines)for(let i=0;i<=960;i++){
    const cast=backgroundSprites(id,i/60);assert.equal(cast.length,id==='parts'?6:4);
    for(const s of cast){assert.ok(s.x<315||s.x>645);assert.ok(s.y>230&&s.y<355);assert.ok(s.scale>1&&s.scale<1.3);for(const [key,v]of Object.entries(s))if(key!=='kind')assert.ok(Number.isFinite(v));}
  }
  assert.throws(()=>dancerSprites('run-script',0));assert.deepEqual(dancerSprites('cats',NaN),dancerSprites('cats',0));
});

test('crews follow a continuous beat phase with alternating dancers and visibly different poses',()=>{
  for(const {id}of dancerRoutines){assert.notDeepEqual(dancerSprites(id,.5),dancerSprites(id,1.5));let previous;
    for(let i=0;i<=1920;i++){const next=dancerSprites(id,i/120);if(previous)for(let j=0;j<next.length;j++){assert.ok(Math.abs(next[j].x-previous[j].x)<.3);assert.ok(Math.abs(next[j].rotation-previous[j].rotation)<.006);}previous=next;}
    const cast=dancerSprites(id,.5);assert.ok(cast[0].wing*cast[1].wing<0);
  }
  assert.deepEqual(new Set(dancerSprites('parts',0).map(s=>s.variant)),new Set([0,1,2]));
});

test('actual skeleton, cat and body-part drawing preserves canvas state with bounded work',()=>{
  for(const {id}of dancerRoutines)for(const phase of [0,.5,2.25,8,15.5]){
    const stack=[];let calls=0;
    const target={globalAlpha:.9,fillStyle:'original',strokeStyle:'original',lineWidth:1,lineCap:'butt',lineJoin:'miter',
      save(){stack.push(Object.fromEntries(Object.entries(this).filter(([,v])=>typeof v!=='function')));},restore(){assert.ok(stack.length);Object.assign(this,stack.pop());}};
    const c=new Proxy(target,{get:(t,k)=>k in t?t[k]:(...args)=>{calls++;assert.ok(args.every(v=>typeof v!=='number'||Number.isFinite(v)));}});
    drawBackgroundCameo(c,{active:{id},weight:.8,phase});assert.equal(stack.length,0);assert.equal(c.globalAlpha,.9);assert.equal(c.fillStyle,'original');assert.equal(c.lineCap,'butt');assert.ok(calls>100&&calls<1800,`${id}: ${calls} drawing calls`);
  }
});

test('all new crews rotate automatically, retain phase over song gaps and leave the selected scene intact',()=>{
  const original=JSON.stringify(defaultScene()),s=new Stage({getContext:()=>({})},defaultScene());s.burstEnabled=s.cameosEnabled=false;s.backgrounds.random=()=>0;s.backgrounds.setRoutines(dancerRoutines);
  const seen=new Set();let frozen;
  for(let i=0;i<60*650;i++){
    const t=i/60,silent=t>=28&&t<40;s.updateShow(t,{beat:t*2,bpm:120,silent,activity:silent?0:1,energy:1,beatStrength:0});
    if(s.backgrounds.active)seen.add(s.backgrounds.active.id);
    if(i===28*60)frozen=s.backgrounds.phase;if(t>28&&t<40)assert.equal(s.backgrounds.phase,frozen);
    if(t>30&&t<40)assert.equal(s.backgrounds.weight,0);
  }
  assert.equal(seen.size,3);assert.ok(s.backgrounds.played>=6);assert.equal(JSON.stringify(s.scene),original);
  for(const r of dancerRoutines)assert.ok(partyBackgroundRoutines.some(item=>item.id===r.id));
});
