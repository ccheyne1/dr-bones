import {NeuralBeatEngine} from './beat-engine.js';
let engine,port,busy=false,queue=[],expected=null,latest=-Infinity,running=true,lastPost=-Infinity;
const read=async name=>{const response=await fetch(new URL('./vendor/beatnet/'+name,import.meta.url));if(!response.ok)throw Error('Local music model is missing');return response.arrayBuffer();};
async function drain(){if(busy||!engine||!running)return;busy=true;
  try{while(queue.length&&running){let block=queue.shift();const stale=latest-block.at>.25;
    if(stale){block=queue.pop()||block;queue=[];expected=null;postMessage({type:'gap'});}
    if(expected===null||Math.abs(block.at-expected)>.004){engine.reset(block.rate,block.at);lastPost=-Infinity;}
    expected=block.at+block.samples.length/block.rate;const started=performance.now();let latestState;
    await engine.push(block.samples,state=>{latestState=state;if(state.event){postMessage({type:'tracking',...state});lastPost=state.at;}});
    if(latestState&&latestState.at-lastPost>=.055){postMessage({type:'tracking',...latestState,computeMs:performance.now()-started});lastPost=latestState.at;}
    port?.postMessage({type:'processed',until:expected});
    // Yield a task so incoming audio can expose stale queues. Backlog never
    // accumulates into seconds of increasingly delayed dancing.
    if(queue.length)await new Promise(resolve=>setTimeout(resolve,0));
  }}catch{running=false;queue=[];postMessage({type:'error',message:'Music analysis stopped · use manual or demo tempo'});}finally{busy=false;}
}
self.onmessage=async({data})=>{
  if(data.type==='init'){try{engine=await NeuralBeatEngine.create(read);postMessage({type:'ready'});}catch{postMessage({type:'error',message:'Local music model could not load · manual and demo tempo are available'});}}
  else if(data.type==='connect'){port=data.port;port.onmessage=({data:block})=>{if(!running||block.type!=='audio'||!(block.samples instanceof Float32Array)||block.samples.length>4096||!Number.isFinite(block.at)||block.rate<8000||block.rate>192000)return;latest=block.at;queue.push(block);if(queue.length>8){queue=queue.slice(-1);expected=null;}drain();};port.start();}
  else if(data.type==='gain'&&engine&&Number.isFinite(data.value))engine.gain=Math.max(.5,Math.min(12,data.value));
  else if(data.type==='sensitivity'&&engine&&Number.isFinite(data.value))engine.sensitivity=Math.max(.5,Math.min(2,data.value));
  else if(data.type==='confidenceNeeded'&&engine&&Number.isFinite(data.value))engine.activity.confidenceNeeded=Math.max(0,Math.min(.9,data.value));
  else if(data.type==='stop'){running=false;queue=[];port?.close();self.close();}
};
