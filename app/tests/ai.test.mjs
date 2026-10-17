import test from 'node:test';
import assert from 'node:assert/strict';
import {createScene,applyCreation,aiAllowed,CREATION_TIMEOUT_MS} from '../ai.mjs';
import {defaultScene} from '../public/core.js';
const connection={models:[{slug:'discovered-test-model'}],token:async()=>'test-only-token'};
const stream=events=>new Response(new ReadableStream({start(c){const data=events.map(e=>'data: '+JSON.stringify(e)+'\n\n').join('');const bytes=new TextEncoder().encode(data);for(let i=0;i<bytes.length;i+=17)c.enqueue(bytes.slice(i,i+17));c.close();}}),{status:200});
const completed=scene=>[
  {type:'response.output_text.delta',delta:JSON.stringify(scene)},
  {type:'response.completed',response:{status:'completed'}},
];
test('creation allows five minutes and caller cancellation still interrupts a pending stream',async()=>{
  assert.equal(CREATION_TIMEOUT_MS,300000);const controller=new AbortController();let ready;
  const started=new Promise(resolve=>{ready=resolve;});
  const pending=createScene(connection,'discovered-test-model',defaultScene(),'slow change',{signal:controller.signal,transport:async(url,options)=>{
    return new Response(new ReadableStream({start(streamController){options.signal.addEventListener('abort',()=>streamController.error(new DOMException('Cancelled','AbortError')),{once:true});ready();}}));
  }});
  await started;controller.abort();await assert.rejects(pending,e=>e.name==='AbortError');
});
test('AI requires session credit confirmation, explicit enablement, granted permission and a discovered model',()=>{
  const config={creditUseBlocked:true,aiEnabled:true,aiBlocked:'',model:'discovered-test-model'},auth={...connection,profile:{scopes:['chatgpt.tokens.use.direct']}};
  assert.equal(aiAllowed(config,auth),true);
  for(const change of [{creditUseBlocked:false},{aiEnabled:false},{aiBlocked:'Usage limit'},{model:'unknown'}])assert.equal(aiAllowed({...config,...change},auth),false);
  assert.equal(aiAllowed(config,{...auth,profile:{scopes:[]}}),false);assert.equal(aiAllowed(config,{...auth,models:[]}),false);
});
test('official inference uses a discovered model, explicit scene context and only OAuth; completed scene validates',async()=>{
  const current=defaultScene(),scene={...current,headSize:1.8,description:'A gloriously huge head.'};
  const result=await createScene(connection,'discovered-test-model',current,'Give him a huge head',{transport:async(url,options)=>{
    assert.equal(url,'https://api.openai.com/v1/responses');assert.equal(options.headers.Authorization,'Bearer test-only-token');
    const body=JSON.parse(options.body);assert.equal(body.model,'discovered-test-model');assert.equal(body.store,false);assert.equal(body.stream,true);assert.ok(Array.isArray(body.input));assert.match(body.input[0].content,/Give him a huge head/);assert.match(body.instructions,/custom attached shapes/);
    assert.deepEqual(Object.keys(body).sort(),['input','instructions','model','store','stream']);return stream(completed(scene));
  }});assert.deepEqual(result,scene);
});
test('incomplete, interrupted, refused, unsafe and oversized generated scenes fail without changing the original',async()=>{
  const current=defaultScene(),original=JSON.stringify(current);
  const cases=[
    [{type:'response.output_text.delta',delta:JSON.stringify(current)}],
    [{type:'response.incomplete'}],
    [{type:'response.refusal.delta',delta:'No'},...completed(current)],
    completed({...current,script:'alert(1)'}),
    completed({...current,headSize:100}),
    [{type:'response.output_text.delta',delta:'x'.repeat(32001)}],
  ];
  for(const events of cases)await assert.rejects(createScene(connection,'discovered-test-model',current,'test',{transport:async()=>stream(events)}));
  assert.equal(JSON.stringify(current),original);
});
test('usage-limit errors both before and during a stream stop with the exact code; there is no retry or paid fallback',async()=>{
  let calls=0;
  for(const response of [new Response(JSON.stringify({error:{code:'subscription_sharing_usage_limit_exceeded'}}),{status:429}),stream([{type:'response.failed',response:{error:{code:'subscription_sharing_usage_limit_exceeded'}}}])]){
    await assert.rejects(createScene(connection,'discovered-test-model',defaultScene(),'test',{transport:async()=>{calls++;return response;}}),e=>e.code==='subscription_sharing_usage_limit_exceeded');
  }assert.equal(calls,2);
  await assert.rejects(createScene(connection,'invented-model',defaultScene(),'test',{transport:()=>{throw Error('must not run');}}),/Choose an available model/);
});

const shape={anchor:'head',shape:'star',x:0,y:-20,w:12,h:12,rotation:0,color:'#ff65b5',pattern:'solid',behind:false};
test('small streamed edits preserve unrelated custom costumes, backgrounds and choreography',async()=>{
  const current={...defaultScene(),hat:'witch',layers:[shape],elements:[{...shape,anchor:'stage'}],choreography:{beats:4,frames:[{beat:0,joints:{head:12}}]}},original=JSON.stringify(current);
  const edit={set:{headSize:1.8}};
  const result=await createScene(connection,'discovered-test-model',current,'huge head',{transport:async()=>stream(completed(edit))});
  assert.deepEqual(result,{...current,headSize:1.8});assert.equal(JSON.stringify(current),original);
  assert.ok(JSON.stringify(edit).length<JSON.stringify(result).length/10);
});
test('edits append shapes, replace arrays for removal, and validate the resulting total limits',()=>{
  const current={...defaultScene(),layers:[shape]};
  assert.deepEqual(applyCreation(current,{addLayers:[{...shape,color:'#ffffff'}]}).layers,[shape,{...shape,color:'#ffffff'}]);
  assert.deepEqual(applyCreation(current,{set:{layers:[]}}).layers,[]);
  const result=applyCreation(current,{addElements:[{...shape,anchor:'stage'}],set:{dance:'dramatic',choreography:{beats:4,frames:[{beat:0,joints:{armL:45}},{beat:2,joints:{armL:-45}}]}}});
  assert.equal(result.elements.length,1);assert.equal(result.choreography.frames.length,2);
  assert.throws(()=>applyCreation({...current,layers:Array(24).fill(shape)},{addLayers:[shape]}),/Too many shapes/);
});
test('invalid edits reject unknown fields, prototype keys, unsafe values and malformed append lists without mutation',()=>{
  const current=defaultScene(),original=JSON.stringify(current);
  for(const edit of [{},[],null,{set:null},{set:{headSize:100}},{set:{version:2}},{script:'code'},{set:{script:'code'}},{addLayers:{}},{addElements:[shape]},JSON.parse('{"set":{"__proto__":{"headSize":100}}}'),JSON.parse('{"__proto__":{}}')])assert.throws(()=>applyCreation(current,edit));
  assert.equal(JSON.stringify(current),original);assert.equal({}.headSize,undefined);
});
test('discovered 5.6 Luna uses documented none reasoning without unsupported token caps or other paid routes',async()=>{
  const discovered={...connection,models:[{slug:'gpt-5.6-luna'}]};let calls=0;
  await createScene(discovered,'gpt-5.6-luna',defaultScene(),'pink boa',{transport:async(url,options)=>{
    calls++;assert.equal(url,'https://api.openai.com/v1/responses');const body=JSON.parse(options.body);
    assert.deepEqual(body.reasoning,{effort:'none'});assert.deepEqual(Object.keys(body).sort(),['input','instructions','model','reasoning','store','stream']);
    return stream(completed({set:{boa:true,boaColor:'#ff65b5'}}));
  }});assert.equal(calls,1);
});
test('completed response is applied immediately even if the network stream remains open',async()=>{
  let cancelled=false;
  const result=await createScene(connection,'discovered-test-model',defaultScene(),'huge head',{transport:async()=>new Response(new ReadableStream({
    start(controller){controller.enqueue(new TextEncoder().encode(completed({set:{headSize:1.8}}).map(e=>'data: '+JSON.stringify(e)+'\n\n').join('')));},
    cancel(){cancelled=true;},
  }))});
  assert.equal(result.headSize,1.8);assert.equal(cancelled,true);
});
