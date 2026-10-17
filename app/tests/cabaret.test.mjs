import test from 'node:test';import assert from 'node:assert/strict';
import {cabaretRoutines,drawCabaretProp} from '../public/cabaret.js';import {partyRoutines,cameoPose} from '../public/cameos.js';
import {guestRoutines,guestSprites} from '../public/party-guests.js';import {partyBackgroundRoutines,backgroundSprites,drawBackgroundCameo} from '../public/backgrounds.js';
import {Stage} from '../public/render.js';import {defaultScene} from '../public/core.js';
function canvas(){const stack=[],colors=[];let calls=0;
  const c=new Proxy({globalAlpha:1,fillStyle:'',strokeStyle:'',lineWidth:1,lineCap:'butt',lineJoin:'miter',save(){stack.push(Object.fromEntries(Object.entries(this).filter(([,v])=>typeof v!=='function')));},restore(){assert.ok(stack.length);Object.assign(this,stack.pop());},fillRect(){colors.push(this.fillStyle);calls++;},fill(){colors.push(this.fillStyle);calls++;}},{get:(t,k)=>k in t?t[k]:(...args)=>{assert.ok(args.every(x=>typeof x!=='number'||Number.isFinite(x)));calls++;}});
  return {c,stack,colors,calls:()=>calls};
}

test('four new cabaret dances have distinct continuous bounded joint motion',()=>{
  const signatures=new Set();
  for(const {id}of cabaretRoutines){const samples=[];let prev;
    for(let i=0;i<=960;i++){const p=cameoPose(id,i/60);assert.ok(Math.abs(p.x)<=50&&Math.abs(p.y)<=40);
      for(const [key,v]of Object.entries(p)){assert.ok(Number.isFinite(v));if(key==='x'||key==='y')continue;assert.ok(Math.abs(v)<=(['body','head'].includes(key)?35:110)*Math.PI/180+1e-9);if(prev)assert.ok(Math.abs(v-prev[key])<.15);}
      if(i%15===0)samples.push(p);prev=p;
    }signatures.add(JSON.stringify(samples));
  }assert.equal(signatures.size,4);
});

test('new characters move on musical phase, stay beside the skeleton, and have fixed bounded counts',()=>{
  for(const {id}of guestRoutines){let changed=0,previous;
    for(let i=0;i<=960;i++){const sprites=backgroundSprites(id,i/60);assert.ok(sprites.length>=2&&sprites.length<=4);
      for(const s of sprites){assert.ok(s.x<300||s.x>660);assert.ok(s.y>=325&&s.y<=345);for(const [key,v]of Object.entries(s))if(key!=='kind')assert.ok(Number.isFinite(v));}
      const value=JSON.stringify(sprites);if(previous&&previous!==value)changed++;previous=value;
    }assert.ok(changed>900);assert.notDeepEqual(backgroundSprites(id,.5),backgroundSprites(id,1.5));
    assert.ok(guestSprites(id,NaN).every(s=>Number.isFinite(s.x)));
  }assert.throws(()=>guestSprites('remote-script',0));
});

test('new guest art and temporary stagewear draw without state leaks or scene mutations',()=>{
  for(const {id}of guestRoutines){const h=canvas();drawBackgroundCameo(h.c,{active:{id},weight:.9,phase:3.25});assert.equal(h.stack.length,0);assert.equal(h.c.globalAlpha,1);assert.ok(h.calls()>50&&h.calls()<1500);}
  for(const {id}of cabaretRoutines){const h=canvas(),scene={...defaultScene(),hat:'witch',boa:true},original=JSON.stringify(scene),s=new Stage({getContext:()=>h.c},scene);
    s.cameos.active={id};s.cameos.weight=.8;s.cameos.phase=3.25;drawCabaretProp(h.c,s.cameos);s.skeleton(h.c,cameoPose(id,3.25),scene,1);
    assert.equal(h.stack.length,0);assert.equal(h.c.globalAlpha,1);assert.ok(h.colors.includes('#ee93bd'));assert.equal(JSON.stringify(scene),original);
  }
});

test('all eighteen dances and twelve background acts enter automatic shuffled rotations without repeats',()=>{
  const scene=defaultScene(),s=new Stage({getContext:()=>({})},scene);
  assert.equal(partyRoutines.length,18);assert.equal(partyBackgroundRoutines.length,12);
  for(const [scheduler,routines]of [[s.cameos,partyRoutines],[s.backgrounds,partyBackgroundRoutines]]){
    scheduler.random=()=>.4;const ids=routines.map(()=>scheduler.pick());assert.equal(new Set(ids).size,routines.length);for(const r of routines)assert.ok(ids.includes(r.id));assert.notEqual(scheduler.pick(),ids.at(-1));
  }
  assert.equal(scene, s.scene);
});

test('new automatic guests pause in silence and finish before another act, without consuming AI',()=>{
  const s=new Stage({getContext:()=>({})},defaultScene());s.burstEnabled=false;
  s.backgrounds.setRoutines(guestRoutines);s.cameos.setRoutines(cabaretRoutines);s.cameos.random=s.backgrounds.random=()=>0;
  const seen=new Set();let previous=-1,end=-Infinity;
  for(let i=0;i<60*1000;i++){const t=i/60,silent=t>=30&&t<45;s.updateShow(t,{beat:t*2,bpm:120,activity:silent?0:1,energy:1,beatStrength:0,silent});
    const acts=[s.cameos.active,s.backgrounds.active],index=acts.findIndex(Boolean);assert.ok(acts.filter(Boolean).length<=1);
    if(index!==-1)seen.add(acts[index].id);if(previous!==-1&&index===-1)end=t;if(previous===-1&&index!==-1)assert.ok(t-end>=12-.02);previous=index;
    if(t>32&&t<44)assert.equal(s.backgrounds.weight+s.cameos.weight,0);
  }
  for(const r of [...cabaretRoutines,...guestRoutines])assert.ok(seen.has(r.id),r.id);
});
