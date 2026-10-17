import test from 'node:test';import assert from 'node:assert/strict';
import {MusicActivity} from '../public/beat-activity.js';import {BeatClock} from '../public/beat-clock.js';
import {Stage} from '../public/render.js';import {defaultScene,pose} from '../public/core.js';import {neutralElastic} from '../public/elastic.js';import {lightingState} from '../public/lights.js';
const hit=(confidence=.3)=>({event:true,confidence,bpm:120});

test('lower confidence starts dancing; uncertain beats and short missing sections retain music',()=>{
  const gate=new MusicActivity();assert.equal(gate.confidenceNeeded,.2);
  assert.equal(gate.step(hit(),0,.04),false);assert.equal(gate.step(hit(),.5,.04),false);assert.equal(gate.step(hit(),1,.04),true);
  // No well-fitted cadence is required once music has started.
  for(const at of [2.3,5.7,9.2,15.4,22.1])assert.equal(gate.step(hit(.01),at,.04),true);
  assert.equal(gate.step({event:false},33,.04),true);assert.equal(gate.step({event:false},35,.04),false);
  gate.reset();gate.confidenceNeeded=.6;
  for(const at of [0,.5,1,1.5])assert.equal(gate.step(hit(.3),at,.04),false);
  gate.confidenceNeeded=.1;assert.equal(gate.step(hit(.3),2,.04),true);
});

test('silence and stale analysis still settle to idle regardless of the lower threshold',()=>{
  const gate=new MusicActivity(),clock=new BeatClock();clock.beginAudio();
  for(let i=0;i<180;i++){const t=i/60,state={...hit(.3),event:i%30===0};clock.accept({...state,time:t,rms:.04,music:gate.step(state,t,.04),beatTime:t});clock.tick(t);}
  assert.ok(clock.activity>.9);
  for(let i=180;i<360;i++){const t=i/60;clock.accept({time:t,rms:0,music:gate.step({event:false},t,0),confidence:0});clock.tick(t);}
  assert.equal(clock.activity,0);assert.equal(clock.tick(6).silent,true);
  gate.reset();assert.equal(gate.step(hit(1),10,.04),false,'one isolated hit cannot start music');
  for(let i=600;i<780;i++)clock.tick(i/60);assert.equal(clock.activity,0);
});

test('half-speed choreography stays exact below 100 music BPM and rate changes preserve phase',()=>{
  const s=new Stage({getContext:()=>({})},defaultScene());
  let d=s.danceClock({beat:0,bpm:80});assert.equal(d.bpm,40);
  d=s.danceClock({beat:8,bpm:80});assert.equal(d.beat,4);assert.equal(d.bpm,40);
  s.danceRate=1;d=s.danceClock({beat:8,bpm:120});assert.equal(d.beat,4);
  d=s.danceClock({beat:10,bpm:120});assert.equal(d.beat,6);
  s.danceRate=.5;d=s.danceClock({beat:12,bpm:120});assert.equal(d.beat,7);
});

test('real stage draw uses half-speed pose and elastic timing while lights retain the full beat',()=>{
  const rectangles=[],c=new Proxy({globalAlpha:1},{get:(target,key)=>key in target?target[key]:key==='createLinearGradient'||key==='createRadialGradient'?()=>({addColorStop(){}}):key==='fillRect'?((...args)=>rectangles.push({args,alpha:target.globalAlpha})):()=>{}});
  const scene=defaultScene(),s=new Stage({getContext:()=>c},scene);let drawn,motionBeat;
  s.cameosEnabled=s.backgroundsEnabled=s.burstEnabled=false;
  s.skeleton=(_c,p)=>{drawn=p;};s.motion.step=(_t,p,beat)=>{motionBeat=beat;return {pose:p,rig:neutralElastic()};};
  const clock={beat:.5,bpm:120,activity:1,energy:1,silent:false,beatStrength:1};s.draw(.25,clock);
  assert.deepEqual(drawn,pose(scene,.25,1));assert.equal(motionBeat,.25);assert.equal(s.choreographyClock.bpm,60);assert.equal(clock.beat,.5);
  const halo=rectangles.find(r=>r.args[2]===500&&r.args[3]===410);
  assert.equal(halo.alpha,lightingState(clock).haloAlpha);assert.notEqual(halo.alpha,lightingState(s.choreographyClock).haloAlpha);
});

test('surprise dance phases use the same half-time clock as the selected dance',()=>{
  const s=new Stage({getContext:()=>({})},defaultScene());s.burstEnabled=s.backgroundsEnabled=false;s.cameos.nextAllowed=0;
  for(let i=0;i<=1080;i++)s.updateShow(i/60,{beat:i/30,bpm:120,activity:1,energy:1,silent:false,beatStrength:0});
  assert.ok(s.cameos.active);assert.ok(Math.abs(s.cameos.phase-(18-s.cameos.active.started))<.02,`phase ${s.cameos.phase}`);
});
