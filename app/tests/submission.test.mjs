import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import * as core from '../public/core.js';

// Exercise the actual form handler with a fake DOM and local transport.
// No browser or external service is involved.
async function app(savedStorage){
  const nodes=new Map(),storage=new Map(savedStorage),posts=[];
  const node=id=>{if(!nodes.has(id))nodes.set(id,{value:'',textContent:'',dataset:{},style:{},hidden:true,disabled:false,classList:{toggle(){},remove(){}},setAttribute(){},addEventListener(type,fn){this[type]=fn;},replaceChildren(){},append(){}});return nodes.get(id);};
  let now=10000,responseMode='normal',releaseRequest;const bootstrap={key:'test-key',paused:false,cooldown:0};const frames=[],timeouts=[];let draws=0,hostChannel,currentStage;
  const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
  const danceButtons=[...html.matchAll(/data-dance="([a-z]+)"/g)].map(([,id])=>{const b=node('dance-'+id);b.dataset.dance=id;return b;});
  const document={getElementById:node,createElement:()=>node('button-'+nodes.size),querySelectorAll:selector=>selector==='[data-dance]'?danceButtons:[],addEventListener(){},body:node('body'),activeElement:null};
  const context={...core,document,window:{addEventListener(){}},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},
    BroadcastChannel:class{constructor(){hostChannel=this;}postMessage(){}close(){}},
    Stage:class{constructor(){currentStage=this;this.burst={nextAllowed:0,envelope:0};}draw(){draws++;}apply(){}},
    RoomAudio:class{devices(){return new Promise(()=>{});}update(){}diagnostics(){return {}; }},
    performance:{now:()=>now},Date:{now:()=>now},AbortController,AbortSignal,setTimeout:(fn,ms)=>{timeouts.push(ms);return setTimeout(fn,ms);},clearTimeout,setInterval(){},requestAnimationFrame:fn=>frames.push(fn),
    fetch:async(path,options)=>{if(path==='/api/bootstrap')return {json:async()=>bootstrap};
      const body=JSON.parse(options.body);posts.push(body);if(responseMode==='fail')throw Error('Network failed');if(responseMode==='slow')await new Promise(resolve=>{releaseRequest=resolve;});
      return {ok:true,json:async()=>core.localRequest(body.scene,body.prompt)};
    }};
  const source=(await readFile(new URL('../public/app.js',import.meta.url),'utf8')).replace(/^import .*$/gm,'');
  vm.runInNewContext(source,context);await Promise.resolve();await Promise.resolve();
  return {node,posts,storage,timeouts,async configureAi(values){Object.assign(bootstrap,values);await hostChannel.onmessage({data:{type:'ai-settings'}});},channel:()=>hostChannel,stage:()=>currentStage,mode:v=>{responseMode=v;},release:()=>releaseRequest(),advance(ms){now+=ms;frames.shift()(now);},draws:()=>draws,async submit(text){now+=3000;node('prompt').value=text;let prevented=false;await node('request-form').onsubmit({preventDefault(){prevented=true;}});assert.equal(prevented,true);}};
}
test('the form submits a huge-head request, clears accepted input and preserves follow-up choices',async()=>{
  const a=await app();await a.submit('Give him a huge head');assert.equal(a.posts.length,1);assert.equal(a.posts[0].prompt,'Give him a huge head');
  assert.equal(a.node('prompt').value,'');assert.equal(JSON.parse(a.storage.get('boogie.scene')).headSize,1.8);
  await a.submit('Give him a witch hat');const scene=JSON.parse(a.storage.get('boogie.scene'));assert.equal(scene.hat,'witch');assert.equal(scene.headSize,1.8);
});

test('Fortnite Moves buttons apply locally, preserve the look, and survive scene reloads',async()=>{
  const a=await app();await a.submit('witch underwater pink boa');const requests=a.posts.length;
  for(const dance of ['floss','orangejustice','takethel','electroshuffle']){
    a.node('dance-'+dance).onclick();
    const scene=JSON.parse(a.storage.get('boogie.scene'));
    assert.equal(scene.dance,dance);assert.equal(scene.hat,'witch');assert.equal(scene.boa,true);assert.equal(scene.theme,'underwater');assert.equal(scene.choreography.frames.length,0);
    assert.equal(a.posts.length,requests);const reloaded=await app(a.storage);assert.equal(JSON.parse(reloaded.storage.get('boogie.scene')).dance,dance);
  }
});
test('slow requests keep an obvious progress timer and animation, accept late success, and can be cancelled safely',async()=>{
  const a=await app();a.mode('slow');const pending=a.submit('Give him a huge head');
  assert.equal(a.node('request-progress').hidden,false);assert.equal(a.node('submit').disabled,true);assert.ok(a.timeouts.includes(330000));
  a.advance(75000);assert.equal(a.node('progress-time').textContent,'75s');assert.match(a.node('progress-label').textContent,/Still creating/);assert.equal(a.draws(),1);
  a.advance(16000);assert.equal(a.draws(),2);a.release();await pending;
  assert.equal(a.node('request-progress').hidden,true);assert.equal(a.node('prompt').value,'');const saved=a.storage.get('boogie.scene');assert.equal(JSON.parse(saved).headSize,1.8);
  const cancelled=a.submit('Give him a witch hat');a.node('cancel-creation').onclick();assert.equal(a.node('request-progress').hidden,true);assert.equal(a.node('submit').disabled,false);a.release();await cancelled;assert.equal(a.storage.get('boogie.scene'),saved);
});
test('unsupported requests and failed submissions show feedback and preserve the scene',async()=>{
  const a=await app();await a.submit('Give him a huge head');const saved=a.storage.get('boogie.scene');
  await a.submit('Turn into a real flying dragon');assert.equal(a.node('request-error').hidden,false);assert.match(a.node('request-error').textContent,/AI is off/);assert.equal(a.storage.get('boogie.scene'),saved);assert.equal(a.node('submit').disabled,false);
  a.mode('fail');await a.submit('Give him a cowboy hat');assert.match(a.node('request-error').textContent,/Network failed/);assert.equal(a.storage.get('boogie.scene'),saved);assert.equal(a.node('submit').disabled,false);assert.equal(a.node('request-light').dataset.state,'warning');
  a.node('prompt').input();assert.equal(a.node('request-error').hidden,true);
});


test('host lighting control clamps brightness, saves off across reloads, and leaves the scene intact',async()=>{
  const a=await app();await a.submit('Give him a witch hat');const saved=a.storage.get('boogie.scene');
  assert.equal(a.stage().lighting,.7);
  await a.channel().onmessage({data:{type:'lighting',value:0}});
  assert.equal(a.stage().lighting,0);assert.equal(a.storage.get('drboner.lighting'),'0');
  const reloaded=await app(a.storage);assert.equal(reloaded.stage().lighting,0);
  await a.channel().onmessage({data:{type:'lighting',value:99}});assert.equal(a.stage().lighting,1);
  await a.channel().onmessage({data:{type:'lighting',value:NaN}});assert.equal(a.stage().lighting,1);
  assert.equal(a.storage.get('boogie.scene'),saved);
});


test('AI cache separates reasoning/model settings and retains saved scenes',async()=>{
  const a=await app();await a.configureAi({automaticAI:true,aiSignature:'luna:none'});
  await a.submit('Give him a huge head');assert.equal(a.posts.length,1);
  a.node('reset').onclick();await a.submit('Give him a huge head');assert.equal(a.posts.length,1);
  await a.configureAi({aiSignature:'luna:high'});a.node('reset').onclick();await a.submit('Give him a huge head');assert.equal(a.posts.length,2);
  assert.ok(JSON.parse(a.storage.get('boogie.cache')).length>=2);
});


test('burst toggle and five-minute cooldown survive page reload without changing the base bendiness',async()=>{
  const a=await app();assert.equal(a.stage().burstEnabled,true);
  await a.channel().onmessage({data:{type:'bursts',value:false}});assert.equal(a.storage.get('drboner.bursts'),'false');
  a.stage().burst.nextAllowed=330;a.advance(1000);assert.ok(Number(a.storage.get('drboner.burstUntil'))>300000);
  const reloaded=await app(a.storage);assert.equal(reloaded.stage().burstEnabled,false);assert.ok(reloaded.stage().burst.nextAllowed>=329);
  assert.equal(reloaded.stage().elasticity,1);
});


test('surprise routine host toggle persists independently of the selected scene',async()=>{
  const a=await app();assert.equal(a.stage().cameosEnabled,true);await a.submit('Give him a witch hat');const scene=a.storage.get('boogie.scene');
  await a.channel().onmessage({data:{type:'cameos',value:false}});assert.equal(a.stage().cameosEnabled,false);assert.equal(a.storage.get('drboner.cameos'),'false');
  const reloaded=await app(a.storage);assert.equal(reloaded.stage().cameosEnabled,false);assert.equal(reloaded.storage.get('boogie.scene'),scene);
});


test('background surprise toggle persists without changing the chosen stage or dance',async()=>{
  const a=await app();assert.equal(a.stage().backgroundsEnabled,true);await a.submit('Make the stage underwater');const scene=a.storage.get('boogie.scene');
  await a.channel().onmessage({data:{type:'backgrounds',value:false}});assert.equal(a.stage().backgroundsEnabled,false);assert.equal(a.storage.get('drboner.backgrounds'),'false');
  const reloaded=await app(a.storage);assert.equal(reloaded.stage().backgroundsEnabled,false);assert.equal(reloaded.storage.get('boogie.scene'),scene);
});

test('automatic half/double beat correction persists without changing a scene or requesting AI',async()=>{
  const a=await app();await a.submit('witch moonwalk');const scene=a.storage.get('boogie.scene'),requests=a.posts.length;
  await a.channel().onmessage({data:{type:'timing',beatScale:.5}});assert.equal(a.storage.get('drboner.beatScale'),'0.5');
  const reload=await app(a.storage);assert.equal(reload.storage.get('drboner.beatScale'),'0.5');
  await a.channel().onmessage({data:{type:'timing',beatScale:4}});assert.equal(a.storage.get('drboner.beatScale'),'0.5');
  assert.equal(a.storage.get('boogie.scene'),scene);assert.equal(a.posts.length,requests);
});

test('dance rate and music confidence are saved independently, reject invalid values, and never request AI',async()=>{
  const a=await app();assert.equal(a.stage().danceRate,.5);await a.submit('witch moonwalk');const scene=a.storage.get('boogie.scene'),requests=a.posts.length;
  await a.channel().onmessage({data:{type:'timing',danceRate:1,confidenceNeeded:.1}});
  assert.equal(a.stage().danceRate,1);assert.equal(a.storage.get('drboner.confidenceNeeded'),'0.1');
  const reload=await app(a.storage);assert.equal(reload.stage().danceRate,1);assert.equal(reload.storage.get('drboner.confidenceNeeded'),'0.1');
  await a.channel().onmessage({data:{type:'timing',danceRate:10,confidenceNeeded:NaN}});assert.equal(a.stage().danceRate,1);assert.equal(a.storage.get('drboner.confidenceNeeded'),'0.1');
  await a.channel().onmessage({data:{type:'timing',confidenceNeeded:-10}});assert.equal(a.storage.get('drboner.confidenceNeeded'),'0');
  await a.channel().onmessage({data:{type:'timing',confidenceNeeded:99}});assert.equal(a.storage.get('drboner.confidenceNeeded'),'0.9');
  assert.equal(a.storage.get('boogie.scene'),scene);assert.equal(a.posts.length,requests);
});
