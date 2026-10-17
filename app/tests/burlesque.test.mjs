import test from 'node:test';import assert from 'node:assert/strict';
import {adultRoutines,partyRoutines,cameoRoutines,cameoPose} from '../public/cameos.js';
import {adultBackgroundRoutines,partyBackgroundRoutines,backgroundSprites} from '../public/backgrounds.js';
import {Stage} from '../public/render.js';import {defaultScene} from '../public/core.js';

test('five burlesque routines have distinct bounded continuous choreography',()=>{
  const signatures=new Set();
  for(const {id}of adultRoutines){const samples=[];let previous;
    for(let i=0;i<=960;i++){const p=cameoPose(id,i/60);assert.ok(Object.values(p).every(Number.isFinite));
      for(const [key,value]of Object.entries(p))if(!['x','y'].includes(key))assert.ok(Math.abs(value)<=(key==='head'||key==='body'?35:110)*Math.PI/180+1e-10);
      if(previous)assert.ok(Math.abs(p.body-previous.body)<.03);previous=p;if(i%60===0)samples.push(p);
    }signatures.add(JSON.stringify(samples));
  }assert.equal(signatures.size,5);assert.equal(partyRoutines.length,new Set(partyRoutines.map(r=>r.id)).size);assert.ok(partyRoutines.length>=cameoRoutines.length+adultRoutines.length);
  for(const {id}of adultBackgroundRoutines)for(let beat=0;beat<=16;beat+=.1){const sprites=backgroundSprites(id,beat);assert.equal(sprites.length,4);assert.ok(sprites.every(s=>Object.entries(s).every(([k,v])=>k==='kind'||Number.isFinite(v))));}
});

test('the normal stage rotation includes burlesque routines and fan ghosts without changing saved scene choices',()=>{
  const scene={...defaultScene(),hat:'witch',boa:true,boaColor:'#00ff00',dance:'salsa'},original=JSON.stringify(scene),stage=new Stage({getContext:()=>({})},scene);
  assert.equal(stage.cameos.routines.length,partyRoutines.length);assert.equal(stage.backgrounds.routines.length,partyBackgroundRoutines.length);
  const chosen=new Set();for(let i=0;i<partyRoutines.length;i++)chosen.add(stage.cameos.pick());
  for(const {id}of adultRoutines)assert.ok(chosen.has(id));
  const backgroundChosen=new Set();for(let i=0;i<partyBackgroundRoutines.length;i++)backgroundChosen.add(stage.backgrounds.pick());assert.ok(backgroundChosen.has('fans'));
  stage.apply({...scene,mood:'sassy'},0);assert.equal(stage.cameos.routines.length,partyRoutines.length);assert.equal(JSON.stringify(scene),original);
});

test('temporary boa and kiss decoration render without mutating the look or leaking canvas state',()=>{
  for(const id of ['boa','kiss'])for(const hasBoa of [false,true]){
    const stack=[],colors=[];const target={globalAlpha:1,fillStyle:'',save(){stack.push({globalAlpha:this.globalAlpha,fillStyle:this.fillStyle});},restore(){Object.assign(this,stack.pop());},fillRect(){colors.push(this.fillStyle);}};
    const context=new Proxy(target,{get(t,k){return k in t?t[k]:()=>{};}});
    const scene={...defaultScene(),boa:hasBoa,boaColor:'#00ff00'},original=JSON.stringify(scene),stage=new Stage({getContext:()=>context},scene);stage.cameos.active={id};stage.cameos.weight=.8;stage.cameos.phase=3;
    stage.skeleton(context,cameoPose(id,3),scene,1);
    assert.ok(colors.includes(id==='boa'?(hasBoa?'#00ff00':'#ff65b5'):'#ed84bc'));assert.equal(stack.length,0);assert.equal(context.globalAlpha,1);assert.equal(JSON.stringify(scene),original);
  }
});
