import test from 'node:test';import assert from 'node:assert/strict';
import {backgroundRoutines,backgroundSprites,BackgroundCameos} from '../public/backgrounds.js';
import {Stage} from '../public/render.js';import {defaultScene} from '../public/core.js';
const music=t=>({beat:t*2,bpm:120,activity:1,energy:1,confidence:.8,silent:false});

test('background sprites have fixed small counts and finite bounded paths across every routine',()=>{
  for(const {id}of backgroundRoutines){let motion=0,first;
    for(let i=0;i<=960;i++){
      const sprites=backgroundSprites(id,i/60);assert.ok(sprites.length>=1&&sprites.length<=5);
      for(const sprite of sprites){for(const key of ['x','y','rotation','scale','wing'])assert.ok(Number.isFinite(sprite[key]));assert.ok(sprite.x>=-600&&sprite.x<=1500);assert.ok(sprite.y>=60&&sprite.y<=370);assert.ok(sprite.scale>=.8&&sprite.scale<=1.3);}
      const value=JSON.stringify(sprites);first??=value;if(first!==value)motion++;
    }assert.ok(motion>500);
  }
  assert.throws(()=>backgroundSprites('unsupported',0));assert.ok(backgroundSprites('ghosts',NaN).every(s=>Number.isFinite(s.x)));
});

test('background events fade smoothly, shuffle all four gags and wait at least ninety seconds',()=>{
  const bg=new BackgroundCameos(()=>0),starts=[],ends=[],ids=[];let previous=null,weight=0;
  for(let i=0;i<60*700;i++){
    const t=i/60,result=bg.step(t,music(t));if(result)assert.equal(result.pose,null);
    if(!previous&&bg.active){starts.push(t);ids.push(bg.active.id);}
    if(previous&&!bg.active)ends.push(t);
    assert.ok(Math.abs(bg.weight-weight)<.03);weight=bg.weight;previous=bg.active;
  }
  assert.equal(starts[0],25);assert.equal(new Set(ids.slice(0,4)).size,4);
  for(let i=1;i<starts.length;i++){assert.ok(starts[i]-ends[i-1]>=90-.02);assert.notEqual(ids[i],ids[i-1]);}
});

test('the actual stage scheduler separates background, dance and rubber-bones events by twelve seconds',()=>{
  const stage=new Stage({getContext:()=>({})},defaultScene());stage.backgrounds.random=stage.cameos.random=stage.burst.random=()=>0;
  let previous=-1,lastEnd=-Infinity;const starts=[0,0,0];
  for(let i=0;i<60*1200;i++){
    const t=i/60;stage.updateShow(t,music(t));const active=[stage.backgrounds.active,stage.cameos.active,stage.burst.startedAt!==null];
    assert.ok(active.filter(Boolean).length<=1);const index=active.findIndex(Boolean);
    if(previous!==-1&&index===-1)lastEnd=t;
    if(previous===-1&&index!==-1){assert.ok(t-lastEnd>=12-.02);starts[index]++;}
    previous=index;
  }
  assert.ok(starts.every(n=>n>=3));
});

test('silence/off/reduced motion suppress events and guest scene edits cancel without changing the chosen scene',()=>{
  for(const [clock,enabled,reduced]of [[{silent:true},true,false],[{},false,false],[{},true,true]]){
    const bg=new BackgroundCameos(()=>0);for(let i=0;i<60*50;i++)assert.equal(bg.step(i/60,{...music(i/60),...clock},enabled,reduced),null);
  }
  const original={...defaultScene(),theme:'underwater'},stage=new Stage({getContext:()=>({})},original);stage.backgrounds.nextAllowed=0;
  for(let i=0;i<120;i++)stage.backgrounds.step(i/60,music(i/60));assert.ok(stage.backgrounds.active);
  const next={...original,hat:'witch'};stage.apply(next,4);assert.equal(stage.backgrounds.interrupted,true);
  for(let i=120;i<240;i++)stage.backgrounds.step(i/60,{...music(i/60),silent:true});
  assert.equal(stage.backgrounds.active,null);assert.deepEqual(stage.scene,next);assert.equal(original.hat,'none');
});

test('background art is drawn before the skeleton, with bounded opacity and no render-state leaks',()=>{
  const marks=[],stack=[];const target={globalAlpha:1,fillStyle:'',save(){stack.push({globalAlpha:this.globalAlpha,fillStyle:this.fillStyle});},restore(){Object.assign(this,stack.pop());},fill(){if(this.fillStyle==='#d7d5b7'){marks.push('ghost');assert.ok(this.globalAlpha<=.72);}},createLinearGradient(){return {addColorStop(){}};},createRadialGradient(){return {addColorStop(){}};}};
  const context=new Proxy(target,{get(t,k){return k in t?t[k]:()=>{};}});
  const stage=new Stage({getContext:()=>context},defaultScene());stage.backgrounds.active={id:'ghosts'};stage.backgrounds.phase=8;stage.backgrounds.weight=1;stage.backgrounds.step=()=>null;
  stage.skeleton=()=>marks.push('skeleton');stage.draw(0,music(0));
  assert.equal(marks.filter(x=>x==='ghost').length,5);assert.ok(marks.indexOf('ghost')<marks.indexOf('skeleton'));assert.equal(stack.length,0);assert.equal(context.globalAlpha,1);
});
