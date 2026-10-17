import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import vm from 'node:vm';import {Worker,MessageChannel} from 'node:worker_threads';import {once} from 'node:events';import {music} from './music-fixtures.mjs';

test('worklet captures on sample time without animation frames, always outputs silence, and bounds pending audio',async()=>{
  let Capture;const messages=[],control={};
  const scope={AudioWorkletProcessor:class{constructor(){this.port=control;}},Float32Array,sampleRate:48000,currentFrame:0,registerProcessor(name,cls){assert.equal(name,'beat-capture');Capture=cls;}};
  vm.runInNewContext(await readFile(new URL('../public/beat-capture.js',import.meta.url),'utf8'),scope);
  const capture=new Capture(),sink={postMessage:m=>messages.push(m),start(){},close(){this.closed=true;}};control.onmessage({data:{type:'connect',port:sink}});
  for(let frame=0;frame<128*120;frame+=128){scope.currentFrame=frame;const output=new Float32Array(128).fill(1);capture.process([[new Float32Array(128).fill(.3),new Float32Array(128).fill(.1)]],[[output]]);assert.ok(output.every(x=>x===0));}
  assert.equal(messages.length,4);assert.equal(capture.pending.length,4);assert.equal(messages[0].at,0);assert.equal(messages[1].at,2048/48000);assert.ok(Math.abs(messages[0].samples[0]-.2)<1e-6);
  sink.onmessage({data:{type:'processed',until:messages[3].at+2048/48000}});assert.equal(capture.pending.length,0);
  for(let i=0;i<16;i++){scope.currentFrame+=128;capture.process([[new Float32Array(128)]],[[new Float32Array(128)]]);}assert.equal(messages.length,5);
  control.onmessage({data:{type:'stop'}});assert.equal(sink.closed,true);assert.equal(capture.process([],[]),false);
});

test('actual model worker tracks PCM while no rendering loop runs and recovers after transport gaps',async()=>{
  const url=new URL('../public/beat-worker.js',import.meta.url).href;
  const source=`import {parentPort} from 'node:worker_threads';import {readFile} from 'node:fs/promises';globalThis.self=globalThis;globalThis.postMessage=m=>parentPort.postMessage(m);globalThis.fetch=async url=>new Response(await readFile(url));parentPort.on('message',data=>self.onmessage({data}));await import(${JSON.stringify(url)});parentPort.postMessage({type:'boot'});`;
  const worker=new Worker(new URL('data:text/javascript,'+encodeURIComponent(source)),{type:'module'}),channel=new MessageChannel(),updates=[];
  const waitFor=type=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>{worker.off('message',handler);reject(Error('worker '+type+' timed out'));},15000);const handler=data=>{if(data.type==='error'){clearTimeout(timer);worker.off('message',handler);reject(Error(data.message));}else if(data.type===type){clearTimeout(timer);worker.off('message',handler);resolve(data);}};worker.on('message',handler);});
  try{await waitFor('boot');const ready=waitFor('ready');worker.postMessage({type:'init'});await ready;
    worker.on('message',data=>{if(data.type==='tracking')updates.push(data);});worker.postMessage({type:'connect',port:channel.port2},[channel.port2]);
    const pcm=music({seconds:10});
    for(let i=0;i<pcm.length;i+=2048){const samples=pcm.slice(i,i+2048),ack=once(channel.port1,'message');channel.port1.postMessage({type:'audio',samples,at:i/22050,rate:22050},[samples.buffer]);await ack;}
    assert.ok(updates.some(s=>s.music));assert.ok(updates.some(s=>s.event&&s.confidence>.8&&Math.abs(s.bpm-120)<6));
    const samples=new Float32Array(2048),ack=once(channel.port1,'message');channel.port1.postMessage({type:'audio',samples,at:20,rate:22050},[samples.buffer]);await ack;
    await new Promise(resolve=>setTimeout(resolve,20));assert.equal(updates.at(-1).music,false);assert.ok(updates.at(-1).at>=20);
  }finally{channel.port1.close();await worker.terminate();}
});
