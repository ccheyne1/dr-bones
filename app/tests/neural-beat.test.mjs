import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {BeatFeatures,BeatResampler} from '../public/beat-features.js';import {NeuralBeatEngine} from '../public/beat-engine.js';import {BeatClock} from '../public/beat-clock.js';import {music,noise} from './music-fixtures.mjs';
const bytes=async path=>{const b=await readFile(new URL(path,import.meta.url));return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);};
const enginePromise=NeuralBeatEngine.create(name=>bytes('../public/vendor/beatnet/'+name));
const track=async(engine,pcm,{rate=22050,origin=0,clock=null}={})=>{engine.reset(rate,origin);const frames=[];for(let i=0;i<pcm.length;i+=2048)await engine.push(pcm.subarray(i,i+2048),s=>{if(clock){clock.accept({...s,time:s.at});s.display=clock.tick(s.at+.075);}frames.push(s);});return frames;};

test('frontend matches independent madmom reference features, including the odd-length FFT',async()=>{
  const window=new Float64Array(await bytes('../public/vendor/beatnet/window.f64')),filters=new Float32Array(await bytes('../public/vendor/beatnet/filterbank.f32'));
  for(const name of ['tone','rhythm']){const pcm=new Float32Array(await bytes('fixtures/'+name+'.pcm')),expected=new Float32Array(await bytes('fixtures/'+name+'.features')),actual=[];const extractor=new BeatFeatures(window,filters);
    const emit=(f,time)=>{if(time<pcm.length/22050)actual.push(...f);};extractor.push(pcm,emit);extractor.push(new Float32Array(706),emit);
    assert.equal(actual.length,expected.length);let error=0;for(let i=0;i<expected.length;i++)error=Math.max(error,Math.abs(actual[i]-expected[i]));assert.ok(error<3e-6,`${name}: ${error}`);
  }
});

test('bundled ONNX models match independent PyTorch probabilities and recurrent states',async()=>{
  const engine=await enginePromise,all=engine.models,features=new Float32Array(await bytes('fixtures/rhythm.features'));
  try{for(let model=0;model<3;model++){engine.models=[all[model]];engine.reset(22050,0);const expected=new Float32Array(await bytes(`fixtures/model-${model+1}.reference`));
    for(let frame=0;frame<200;frame++){const p=await engine.infer(features.subarray(frame*272,(frame+1)*272)),actual=[...p,...engine.models[0].h,...engine.models[0].c];
      for(let i=0;i<603;i++){const ref=expected[frame*603+i];assert.ok(Math.abs(actual[i]-ref)<5e-5+Math.abs(ref)*5e-4,`model ${model+1}, frame ${frame}, value ${i}`);}
    }
  }}finally{engine.models=all;engine.reset(22050,0);}
});

for(const bpm of [100,120,128,150])test(`full PCM music with vocals and missing kicks acquires and holds ${bpm} BPM`,async()=>{
  const engine=await enginePromise,clock=new BeatClock();clock.beginAudio();const frames=await track(engine,music({bpm,missing:true}),{clock});
  const settled=frames.filter(f=>f.at>12),bpms=settled.map(f=>f.display.bpm);
  assert.ok(frames.find(f=>f.music)?.at<5);assert.ok(settled.every(f=>f.music));
  assert.ok(Math.max(...bpms)-Math.min(...bpms)<2,`${bpm}: ${Math.min(...bpms)}–${Math.max(...bpms)}`);
  assert.ok(Math.abs(bpms.reduce((a,b)=>a+b)/bpms.length-bpm)<1);
  const errors=settled.filter(f=>Math.abs(f.at*bpm/60-Math.round(f.at*bpm/60))<.025).map(f=>{const d=f.display.beat-(f.at+.075)*bpm/60;return Math.abs(d-Math.round(d))*60/bpm;}).sort((a,b)=>a-b);
  assert.ok(errors[Math.floor(errors.length*.95)]<.075,`${bpm}: phase error ${errors.at(-1)}`);
});

test('half/double tempo hypotheses cannot flip a locked song during fills; host correction retains automatic tracking',async()=>{
  const engine=await enginePromise,c=new BeatClock();c.beginAudio();const frames=await track(engine,music({bpm:80,seconds:30,missing:true}),{clock:c});
  const settled=frames.filter(f=>f.at>12).map(f=>f.display.bpm);assert.ok(Math.max(...settled)-Math.min(...settled)<3);assert.ok(Math.abs(settled.at(-1)-160)<2);
  c.setBeatScale(.5);assert.ok(Math.abs(c.tick(30).bpm-80)<2);assert.equal(c.mode,'mic');
  c.manual(132);assert.ok(Math.abs(c.tick(31).bpm-132)<15);assert.equal(c.mode,'manual');
});

test('real PCM steady noise and isolated claps do not sustain music activity',async()=>{
  const engine=await enginePromise;
  for(const claps of [false,true]){const frames=await track(engine,noise({claps}));assert.equal(frames.filter(f=>f.music).length,0);}
});

test('a silent song break clears model history, retains the display clock, and reacquires a different tempo',async()=>{
  const engine=await enginePromise,c=new BeatClock();c.beginAudio();const first=await track(engine,music({bpm:120,seconds:16}),{clock:c});assert.ok(first.at(-1).music);
  const before=c.beat;let last;
  for(let i=0;i<22050*4;i+=2048)await engine.push(new Float32Array(Math.min(2048,22050*4-i)),s=>{c.accept({...s,time:s.at});last=c.tick(s.at+.075);});
  assert.equal(last.silent,true);assert.ok(c.beat>=before);
  // Audio transport remains continuous across the break.
  const next=music({bpm:150,seconds:22}),frames=[];for(let i=0;i<next.length;i+=2048)await engine.push(next.subarray(i,i+2048),s=>{c.accept({...s,time:s.at});frames.push(c.tick(s.at+.075));});
  assert.ok(Math.abs(frames.at(-1).bpm-150)<2,`got ${frames.at(-1).bpm}`);assert.equal(frames.at(-1).silent,false);
});

test('48 kHz source audio resamples on its sample clock and preserves tempo',async()=>{
  const engine=await enginePromise,c=new BeatClock();c.beginAudio();const frames=await track(engine,music({bpm:128,rate:48000,seconds:20}),{rate:48000,origin:12,clock:c});
  assert.ok(Math.abs(frames.at(-1).display.bpm-128)<2);assert.ok(frames.at(-1).at>31.8&&frames.at(-1).at<32);
  const resampler=new BeatResampler(48000);let length=0;for(let i=0;i<48000;i+=128)length+=resampler.push(new Float32Array(128)).length;assert.ok(Math.abs(length-22050)<20);
});
