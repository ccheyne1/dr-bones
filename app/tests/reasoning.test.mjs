import test from 'node:test';
import assert from 'node:assert/strict';
import {modelChoice,reasoningLevels,resolveReasoning} from '../public/ai-settings.js';
import {createScene} from '../ai.mjs';
import {defaultScene} from '../public/core.js';

test('reasoning choices use catalog metadata or the documented Luna fallback, without assuming other models',()=>{
  assert.deepEqual(reasoningLevels({slug:'gpt-5.6-luna'}),['none','low','medium','high','xhigh','max']);
  assert.deepEqual(reasoningLevels({slug:'other'}),[]);assert.equal(resolveReasoning({slug:'other'}),'default');
  const model=modelChoice({slug:'catalog-model',display_name:'Catalog model',secret:'omit',supported_reasoning_levels:[{effort:'low'},{effort:'high'},'high','unsupported']});
  assert.deepEqual(model,{slug:'catalog-model',name:'Catalog model',reasoningLevels:['low','high']});
  assert.equal(resolveReasoning(model,'high'),'high');assert.throws(()=>resolveReasoning(model,'none'),/not supported/);
  assert.equal(resolveReasoning({slug:'gpt-5.6-luna'}),'none');
});

test('every selected Luna level reaches the OAuth request; model default omits reasoning and invalid levels never call',async()=>{
  const connection={models:[{slug:'gpt-5.6-luna'}],token:async()=>'test-token'};let calls=0;
  for(const level of ['none','low','medium','high','xhigh','max','default']){
    await createScene(connection,'gpt-5.6-luna',defaultScene(),'huge head',{reasoning:level,transport:async(url,options)=>{
      calls++;const body=JSON.parse(options.body);assert.equal(body.model,'gpt-5.6-luna');assert.equal(body.store,false);assert.equal(body.stream,true);
      if(level==='default')assert.equal(Object.hasOwn(body,'reasoning'),false);else assert.deepEqual(body.reasoning,{effort:level});
      return new Response('data: '+JSON.stringify({type:'response.completed',response:{status:'completed',output:[{content:[{type:'output_text',text:'{"set":{"headSize":1.8}}'}]}]}})+'\n\n');
    }});
  }
  await assert.rejects(createScene(connection,'gpt-5.6-luna',defaultScene(),'test',{reasoning:'ultra',transport:()=>{calls++;}}),/not supported/);
  assert.equal(calls,7);
});
