import test from 'node:test';import assert from 'node:assert/strict';import {RoomAudio} from '../public/audio.js';import {BeatClock} from '../public/core.js';import {audioHarness} from './audio-harness.mjs';

test('microphone denial returns to usable demo mode and releases resources',async()=>{
  const h=audioHarness({outcome:'denied'});try{const c=new BeatClock(),audio=new RoomAudio(c);await audio.start();assert.equal(c.mode,'demo');assert.equal(audio.stream,null);assert.match(audio.status,/denied/);assert.equal(h.contexts[0].state,'closed');}finally{h.restore();}
});

test('capture loads local models and an audio worklet; only a silent safety sink connects to speakers',async()=>{
  const h=audioHarness();try{const c=new BeatClock(),audio=new RoomAudio(c);await audio.start('test');
    assert.equal(c.mode,'mic');assert.equal(h.workers[0].url,'/beat-worker.js');assert.deepEqual(h.workers[0].options,{type:'module'});assert.deepEqual(h.modules,['/beat-capture.js']);
    assert.equal(h.filters[0].gain.value,0);assert.ok(h.edges.some(([from,to])=>from===h.filters[0]&&to===h.contexts[0].destination));
    assert.ok(!h.edges.some(([from,to])=>from==='source'&&to===h.contexts[0].destination));assert.equal((await audio.devices()).length,1);
    assert.equal(h.picked[0][1].audio.deviceId.exact,'test');await audio.stop();assert.equal(h.audioTrack.stopped,1);assert.equal(h.workers[0].terminated,true);assert.equal(c.mode,'demo');
  }finally{h.restore();}
});

test('music results update from the worker without any render-loop audio reads',async()=>{
  const h=audioHarness();try{const c=new BeatClock(),audio=new RoomAudio(c);await audio.start();const now=h.feed({at:2,event:true});assert.equal(audio.rawLevel,.1);assert.equal(c.music,true);assert.ok(c.lastFrame<=now);assert.match(audio.diagnostics().trackingBand,/3-model/);
    const context=h.contexts[0];context.currentTime=10;h.workers[0].emit({type:'tracking',at:1,rms:.9});assert.equal(audio.rawLevel,.1,'stale results must be ignored');
    audio.gain=5;c.sensitivity=1.5;c.confidenceNeeded=.1;audio.update();assert.ok(h.workers[0].messages.some(m=>m.type==='gain'&&m.value===5));assert.ok(h.workers[0].messages.some(m=>m.type==='sensitivity'&&m.value===1.5));assert.ok(h.workers[0].messages.some(m=>m.type==='confidenceNeeded'&&m.value===.1));
    c.manual(132);h.feed({at:3,event:true,bpm:100});assert.equal(c.target,132);await audio.stop();
  }finally{h.restore();}
});

test('missing model and worker failures leave manual/demo controls usable',async()=>{
  for(const loadFailure of [true,false]){const h=audioHarness({loadFailure});try{const c=new BeatClock(),audio=new RoomAudio(c);await audio.start();
    if(loadFailure){assert.equal(c.mode,'demo');assert.equal(audio.stream,null);assert.match(audio.status,/model/);}else{h.workers[0].onerror();assert.equal(c.music,false);assert.match(audio.status,/manual/);await audio.stop();}
    c.manual(128);assert.equal(c.target,128);
  }finally{h.restore();}}
});

test('suspended audio can be activated and an ended input stops the model worker',async()=>{
  const h=audioHarness({suspended:true});try{const c=new BeatClock(),audio=new RoomAudio(c);await audio.start();audio.update();assert.match(audio.status,/activate audio/);assert.equal(audio.diagnostics().audioState,'suspended');h.resume();await audio.activate();assert.equal(audio.diagnostics().audioState,'running');
    h.audioTrack.ended();await Promise.resolve();await Promise.resolve();assert.equal(audio.worker,null);assert.equal(audio.stream,null);
  }finally{h.restore();}
});
