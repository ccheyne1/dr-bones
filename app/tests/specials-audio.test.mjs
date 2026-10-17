import test from 'node:test';import assert from 'node:assert/strict';
import {Stage} from '../public/render.js';import {BeatClock,defaultScene} from '../public/core.js';import {DanceCameos} from '../public/cameos.js';
import {ElasticBurst} from '../public/bursts.js';import {BackgroundCameos} from '../public/backgrounds.js';
const music=t=>({beat:t*2,bpm:120,activity:1,energy:.4,beatStrength:.9,confidence:.08,silent:false,mode:'mic'});
const stage=()=>{const s=new Stage({getContext:()=>({})},defaultScene());s.backgrounds.random=s.cameos.random=s.burst.random=()=>0;return s;};

test('ten minutes of dancing with a weak tempo lock still plays every type of special without overlap',()=>{
  const s=stage();let lastBurst=-Infinity,previousBurst=null,burstStarts=0;
  for(let i=0;i<60*600;i++){
    const t=i/60;s.updateShow(t,music(t));
    assert.ok([s.backgrounds.active,s.cameos.active,s.burst.startedAt!==null].filter(Boolean).length<=1);
    if(previousBurst===null&&s.burst.startedAt!==null){assert.ok(t-lastBurst>=300);lastBurst=t;burstStarts++;}
    previousBurst=s.burst.startedAt;
  }
  assert.ok(s.cameos.played>=4);assert.ok(s.backgrounds.played>=4);assert.ok(burstStarts>=2);assert.ok(burstStarts<=2);
});

test('real presentation clock with quiet low-confidence model frames drives specials, then silence settles the stage',()=>{
  const clock=new BeatClock();clock.beginAudio();const s=stage();
  const gaps=[.37,.64,.42,.71,.32,.56];let next=.37,n=0,maxEnergy=0,state;
  for(let i=0;i<60*360;i++){
    const t=i/60,hit=t>=next;if(hit){n++;next+=gaps[n%gaps.length];}
    clock.accept({time:t,rms:hit?.0012:.0004,confidence:.08,probability:hit?.9:.75,music:true,event:hit,bpm:120,beatTime:t});state=clock.tick(t);state.mode='mic';s.updateShow(t,state);maxEnergy=Math.max(maxEnergy,state.energy);
  }
  assert.ok(maxEnergy<.5);assert.ok(s.cameos.played>=2);assert.ok(s.backgrounds.played>=2);assert.ok(s.burst.played>=1);
  assert.ok(state.beatStrength>.6);
  for(let i=60*360;i<60*370;i++){const t=i/60;clock.accept({time:t,rms:0,confidence:0,probability:0,music:false,event:false});state=clock.tick(t);s.updateShow(t,state);}
  assert.equal(state.silent,true);assert.equal(state.activity,0);assert.equal(state.beatStrength,0);assert.equal(s.cameos.weight,0);assert.equal(s.backgrounds.weight,0);assert.equal(s.burst.envelope,0);
  const counts=[s.cameos.played,s.backgrounds.played,s.burst.played];
  for(let i=60*370;i<60*430;i++){const t=i/60,clap=i%600===0;clock.accept({time:t,rms:clap?.05:.02,confidence:0,probability:clap?.6:0,music:false,event:false});state=clock.tick(t);s.updateShow(t,state);}
  assert.equal(state.silent,true);assert.deepEqual([s.cameos.played,s.backgrounds.played,s.burst.played],counts);
});

test('confidence dips and a brief quiet classification do not abort a visible routine',()=>{
  const c=new DanceCameos(()=>0);c.nextAllowed=0;let reachedFull=false;
  for(let i=0;i<60*6;i++){
    const t=i/60;c.step(t,{...music(t),silent:i>=120&&i<132});
    if(c.phase>=8){assert.ok(c.active);reachedFull=true;}
  }
  assert.equal(reachedFull,true);assert.equal(c.played,1);assert.ok(c.weight>.9);
  for(let i=360;i<60*9;i++)c.step(i/60,{...music(i/60),silent:true,activity:0});
  assert.ok(c.active);assert.equal(c.weight,0);assert.match(c.status,/Paused between songs/);
  const phase=c.phase;for(let i=540;i<60*16;i++)c.step(i/60,music(i/60));assert.ok(phase>0);assert.equal(c.active,null);assert.equal(c.played,1);
});

test('host diagnostics distinguish timer, quiet, disabled, reduced motion and shared-stage waits',()=>{
  const c=new DanceCameos(()=>0);
  c.step(0,{...music(0),silent:true});assert.match(c.status,/Waiting for music/);
  c.step(.1,music(.1),false);assert.equal(c.status,'Off');
  c.step(.2,music(.2),true,true);assert.match(c.status,/reduced motion/);
  c.step(.3,music(.3),true,false,true);assert.match(c.status,/another surprise/);
  c.step(.4,music(.4));assert.match(c.status,/Next opportunity/);
});

test('a due dance/background stays due through a long song break, then starts at the new tempo',()=>{
  for(const c of [new DanceCameos(()=>0),new BackgroundCameos(()=>0)]){
    c.nextAllowed=5;
    for(let i=0;i<60*60;i++){const t=i/60;c.step(t,{...music(t),silent:true,activity:0});}
    assert.equal(c.nextAllowed,5);assert.equal(c.played,0);
    for(let i=60*60;i<60*62;i++){const t=i/60;c.step(t,{...music(t),beat:120+(t-60)*100/60,bpm:100});}
    assert.equal(c.played,1);assert.ok(c.active);
  }
});

test('partial strong-beat progress survives a song break and completes at a different BPM',()=>{
  const b=new ElasticBurst(()=>0);
  for(let i=0;i<=60;i++)b.step(i/60,music(i/60));const credit=b.strongProgress;assert.ok(credit>1.9&&credit<2.1);
  for(let i=61;i<=60*31;i++){const t=i/60;b.step(t,{...music(t),silent:true,activity:0});}
  assert.equal(b.strongProgress,credit);assert.equal(b.played,0);
  for(let i=60*31+1;i<60*32.5;i++){const t=i/60;b.step(t,{...music(t),beat:62+(t-31)*2.5,bpm:150});}
  assert.equal(b.played,1);assert.notEqual(b.startedAt,null);
});

test('an unfinished dance/background holds its phase in silence and resumes once, without spending its cooldown',()=>{
  for(const c of [new DanceCameos(()=>0),new BackgroundCameos(()=>0)]){
    c.nextAllowed=0;for(let i=0;i<60*3;i++)c.step(i/60,music(i/60));
    const phase=c.phase,id=c.active.id;
    for(let i=60*3;i<60*63;i++){const t=i/60;c.step(t,{...music(t),silent:true,activity:0});}
    assert.equal(c.active.id,id);assert.equal(c.phase,phase);assert.equal(c.weight,0);assert.equal(c.played,1);assert.equal(c.nextAllowed,0);
    for(let i=60*63;i<60*73;i++){const t=i/60;c.step(t,{...music(t),beat:126+(t-63)*1.5,bpm:90});}
    assert.equal(c.active,null);assert.equal(c.played,1);assert.ok(c.nextAllowed>=145);
  }
});
