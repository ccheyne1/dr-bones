import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import vm from 'node:vm';
import * as core from '../public/core.js';import * as settings from '../public/ai-settings.js';
test('host selector applies and remembers reasoning without enabling AI, and shows measured timing records',async()=>{
  const nodes=new Map(),storage=new Map(),posts=[],messages=[],listeners=[];let channel,state={models:[{slug:'gpt-5.6-luna',name:'Luna'}],profiles:[],message:'Ready',config:{reasoning:'auto',model:'gpt-5.6-luna',aiEnabled:false},automaticAI:false,recentRequests:[{at:Date.now(),model:'gpt-5.6-luna',reasoning:'none',seconds:8.4,status:'completed'}]};
  const node=id=>{if(!nodes.has(id))nodes.set(id,{value:'',children:[],replaceChildren(...items){this.children=[];this.value='';for(const item of items)this.append(item);},append(item){this.children.push(item);if(this.children.length===1&&item.value!==undefined)this.value=item.value;},});return nodes.get(id);};
  const context={...core,...settings,document:{getElementById:node,createElement:()=>({}),activeElement:null},location:{hash:'#host-code',pathname:'/host'},history:{replaceState(){}},window:{addEventListener(){}},Option:class{constructor(text,value){this.text=text;this.value=value;}},BroadcastChannel:class{constructor(){channel=this;}postMessage(data){messages.push(data);}addEventListener(_type,fn){listeners.push(fn);}},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},setInterval(){},fetch:async(path,options)=>{
    const data=JSON.parse(options.body);posts.push({path,data});if(path==='/api/host/ai-settings')state={...state,config:{...state.config,...data}};return {ok:true,json:async()=>state};
  }};
  const source=(await readFile(new URL('../public/host.js',import.meta.url),'utf8')).replace(/^import .*$/gm,'');vm.runInNewContext(source,context);
  await new Promise(r=>setImmediate(r));assert.equal(node('ai-reasoning').value,'none');
  assert.match(node('request-times').children[0].textContent,/none · 8.4 s · completed/);
  node('ai-reasoning').value='high';await node('apply-ai-settings').onclick();
  const saved=posts.find(p=>p.path==='/api/host/ai-settings');assert.deepEqual(saved.data,{model:'gpt-5.6-luna',reasoning:'high'});
  assert.equal(state.automaticAI,false);assert.equal(JSON.parse(storage.get('drboner.reasoning'))['gpt-5.6-luna'],'high');assert.ok(messages.some(m=>m.type==='ai-settings'));
  assert.match(node('active-ai-settings').textContent,/high/);assert.equal(node('ai-reasoning').value,'high');
  const event={data:{type:'stats',scene:core.defaultScene(),devices:[],beat:120,danceBpm:60,danceRate:.5,confidenceNeeded:.2,confidence:.4}};
  channel.onmessage(event);for(const listener of listeners)listener(event);
  assert.equal(node('dance-rate').value,'0.5');assert.equal(node('confidence-needed-value').textContent,'20%');
  assert.ok(node('stats').children.some(x=>x.textContent==='60 dance BPM'));
  node('dance-rate').value='1';node('dance-rate').onchange();node('confidence-needed').value='.1';node('confidence-needed').oninput();
  assert.equal(JSON.stringify(messages.at(-2)),JSON.stringify({type:'timing',danceRate:1}));assert.equal(JSON.stringify(messages.at(-1)),JSON.stringify({type:'timing',confidenceNeeded:.1}));
});
