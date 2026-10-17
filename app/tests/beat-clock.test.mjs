import test from 'node:test';import assert from 'node:assert/strict';
import {BeatClock} from '../public/beat-clock.js';
const observation=(t,bpm=120,extra={})=>({time:t,bpm,confidence:.9,probability:.9,rms:.08,music:true,event:Math.abs(t*bpm/60-Math.round(t*bpm/60))<.002,beatTime:Math.round(t*bpm/60)*60/bpm,...extra});

test('sample-timed beat fits stay steady and phase corrections never run animation backwards',()=>{
  const clock=new BeatClock();clock.beginAudio();let previous=0;const bpms=[],errors=[];
  for(let i=0;i<60*35;i++){const t=i/60;if(i%3===0)clock.accept(observation(t));const s=clock.tick(t);assert.ok(s.beat>=previous);previous=s.beat;
    if(t>10){bpms.push(s.bpm);if(i%30===0)errors.push(Math.abs((s.beat-Math.round(s.beat))*60/s.bpm));}}
  assert.ok(Math.max(...bpms)-Math.min(...bpms)<.1);assert.ok(Math.max(...errors)<.025);assert.ok(Math.abs(clock.target-120)<.01);
  const before=clock.tick(35);clock.offset=-100;const offset=clock.tick(35);assert.ok(Math.abs(before.beat-offset.beat-.2)<.01);
});

test('manual/tap tempo cannot be overwritten by automatic observations; silence settles idle',()=>{
  const c=new BeatClock();c.beginAudio();c.manual(132);
  for(let i=0;i<120;i++){c.accept(observation(i/10,100));c.tick(i/10);}assert.equal(c.target,132);assert.equal(c.mode,'manual');
  c.beginAudio();for(let i=0;i<360;i++){const t=12+i/60;c.accept(observation(t,120,{music:false,event:false,rms:0,probability:0,confidence:0}));c.tick(t);}
  assert.equal(c.tick(18).silent,true);assert.equal(c.activity,0);
  c.mode='demo';assert.equal(c.tick(18.1).silent,false);
});

test('lost/stale/out-of-order analysis frames idle safely and never replace the current estimate',()=>{
  const c=new BeatClock();c.beginAudio();for(let i=0;i<300;i++){c.accept(observation(i/10));c.tick(i/10);}
  const target=c.target;c.accept(observation(2,180));assert.equal(c.target,target);
  for(let i=300;i<600;i++)c.tick(i/10);assert.equal(c.activity,0);assert.equal(c.tick(60).silent,true);
  c.resetEvidence();assert.equal(c.events.length,0);assert.equal(c.lastBeat,-Infinity);
});

test('strong beat accents come from spectral attacks, independently of tempo confidence and room volume',()=>{
  const c=new BeatClock();c.beginAudio();
  c.accept(observation(0,120,{strength:.1,event:true,confidence:.99,rms:1}));assert.ok(c.tick(0).beatStrength<.2);
  c.accept(observation(.5,120,{strength:.9,event:true,confidence:.2,rms:.001}));assert.ok(c.tick(.5).beatStrength>.8);
  c.accept(observation(2.2,120,{event:false}));assert.equal(c.tick(2.2).beatStrength,0);
});
