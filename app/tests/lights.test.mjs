import test from 'node:test';
import assert from 'node:assert/strict';
import {lightingState,drawPartyLights,drawForegroundPumpkins} from '../public/lights.js';
import {BeatClock} from '../public/core.js';

test('lighting clearly accents the dancer beat at several tempos with rounded pulses and slow sweeps',()=>{
  for(const bpm of [80,120,180]){
    const state=seconds=>lightingState({beat:seconds*bpm/60,activity:1,energy:1},1);
    assert.ok(state(0).beamAlpha>state(30/bpm).beamAlpha*4);
    assert.ok(state(0).poolAlpha-state(30/bpm).poolAlpha>=.39);
    // The narrower pulse is already mostly faded before the next half-beat.
    assert.ok(state(15/bpm).pulse<.13);
    assert.ok(Math.abs(state(0).beamAlpha-state(60/bpm).beamAlpha)<1e-10);
    let previous=state(0);
    for(let frame=1;frame<60*24;frame++){
      const next=state(frame/60);
      assert.ok(Math.abs(next.beamAlpha-previous.beamAlpha)<.09);
      assert.ok(Math.abs(next.sweep-previous.sweep)<.011);
      assert.ok(next.beamAlpha<=.41&&next.poolAlpha<=.5&&next.haloAlpha<=.081);
      previous=next;
    }
  }
});

test('foreground pumpkins follow the same pulse, stay colored when off, and restore canvas state',()=>{
  const make=()=>{const stack=[],marks=[];const c={globalAlpha:1,fillStyle:'',x:0,
    save(){stack.push({globalAlpha:this.globalAlpha,fillStyle:this.fillStyle,x:this.x});},restore(){Object.assign(this,stack.pop());},
    translate(x){this.x+=x;},scale(){},createRadialGradient(){return {addColorStop(){}};},createLinearGradient(){return {addColorStop(){}};},
    fillRect(){marks.push({x:this.x,color:typeof this.fillStyle==='string'?this.fillStyle:'gradient',alpha:this.globalAlpha});},fill(){marks.push({x:this.x,color:typeof this.fillStyle==='string'?this.fillStyle:'gradient',alpha:this.globalAlpha});},
    beginPath(){},moveTo(){},lineTo(){},closePath(){},clip(){},ellipse(){}};return {c,marks,stack};};
  const render=(beat,amount=.7,reduced=false)=>{const r=make();drawForegroundPumpkins(r.c,{beat,activity:1,energy:1},'#ff923e',amount,reduced);assert.equal(r.stack.length,0);assert.equal(r.c.globalAlpha,1);return r.marks;};
  const peak=render(0),between=render(.5);
  for(const [x,base,face]of [[220,'#4e3c78','#c2aaff'],[740,'#a54c24','#ffd090']]){
    assert.ok(peak.some(m=>m.x===x&&m.color===base));
    const alpha=marks=>Math.max(...marks.filter(m=>m.x===x&&m.color===face).map(m=>m.alpha));
    assert.ok(alpha(peak)-alpha(between)>.35);
    assert.ok(render(0,0).some(m=>m.x===x&&m.color===base));
  }
  assert.deepEqual(render(0,0),render(.5,0));assert.deepEqual(render(0,.7,true),render(.5,.7,true));
  const quiet=beat=>lightingState({beat,activity:0,energy:.15},1).pumpkinAlpha;
  assert.equal(quiet(0),0);assert.equal(quiet(.5),0);
});

test('music silence fades the lights to a static dim glow; off and reduced motion work',()=>{
  const clock=new BeatClock();clock.mode='mic';let state;
  for(let frame=0;frame<60*20;frame++){const t=frame/60;clock.accept({time:t,rms:0,confidence:0,music:false,event:false});state=clock.tick(t);}
  const quiet=lightingState(state),later=lightingState({...state,beat:state.beat+.5});
  assert.ok(state.activity<.001);assert.ok(quiet.beamAlpha<.025);
  assert.ok(Math.abs(quiet.beamAlpha-later.beamAlpha)<.0001);assert.ok(Math.abs(quiet.sweep)<.001);
  const reduced=lightingState({beat:1,activity:1,energy:0},1,true);
  assert.deepEqual(reduced,lightingState({beat:9.5,activity:1,energy:1.4},1,true));
  assert.equal(lightingState(state,0).beamAlpha,0);
  let calls=0;drawPartyLights({save(){calls++;}},state,'#ff923e',0);assert.equal(calls,0);
});

test('lighting handles missing or invalid clock values with finite bounded output',()=>{
  for(const clock of [{},{beat:NaN,energy:Infinity,activity:-100},{beat:-1234,energy:-1,activity:100}]){
    const state=lightingState(clock,Infinity);
    assert.ok(Object.values(state).every(Number.isFinite));assert.ok(state.level>=0&&state.level<=1);
    assert.ok(state.beamAlpha>=0&&state.beamAlpha<=.41);
  }
});
