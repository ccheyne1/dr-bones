import test from 'node:test';import assert from 'node:assert/strict';
import {fortniteRoutines} from '../public/fortnite.js';
import {defaultScene,dances,joints,pose,localRequest,validateScene,schemaGuide,clone} from '../public/core.js';
import {cameoPose,partyRoutines,DanceCameos} from '../public/cameos.js';
const rad=Math.PI/180;

test('Fortnite names work offline, clear old choreography, and preserve costume and stage edits',()=>{
  const saved={...defaultScene(),accent:'#6cd9ff',hat:'witch',boa:true,boaColor:'#ff65b5',theme:'underwater',choreography:{beats:2,frames:[{beat:0,joints:{head:30}}]}};
  const before=JSON.stringify(saved);
  for(const [text,id]of [['do the floss','floss'],['keep the hat, start flossing','floss'],['Orange Justice please','orangejustice'],['orange-justice','orangejustice'],['take the L','takethel'],['TakeTheL','takethel'],['electro shuffle','electroshuffle'],['ElectroShuffle','electroshuffle']]){
    const r=localRequest(saved,text);assert.equal(r.recognized,true);assert.equal(r.scene.dance,id);assert.equal(r.scene.choreography.frames.length,0);
    for(const key of Object.keys(saved).filter(k=>!['dance','description','choreography'].includes(k)))assert.deepEqual(r.scene[key],saved[key]);
    assert.deepEqual(validateScene(JSON.parse(JSON.stringify(r.scene))),r.scene);
  }
  assert.equal(JSON.stringify(saved),before);
  assert.equal(localRequest(saved,'put a glittery little globe behind him').recognized,false);
});

test('new dances are distinct, continuous, bounded at every intensity, and share their cameo choreography',()=>{
  const signatures=new Set();
  for(const {id}of fortniteRoutines){assert.ok(dances.includes(id));assert.ok(schemaGuide.includes(id));assert.ok(partyRoutines.some(r=>r.id===id));
    const scene={...defaultScene(),dance:id,intensity:1};const samples=[];
    for(const intensity of [.2,.8,1.4])for(const energy of [.4,1,1.4]){let previous;
      for(let i=0;i<=960;i++){const beat=i/120,p=pose({...scene,intensity},beat,energy);
        assert.ok(Object.values(p).every(Number.isFinite));
        for(const key of joints)assert.ok(Math.abs(p[key])<=(key==='head'||key==='body'?35:110)*rad+1e-9);
        if(previous)for(const key of joints)assert.ok(Math.abs(p[key]-previous[key])<.14,`${id} ${key} jumps`);
        previous=p;
        if(intensity===.8&&energy===1&&i%30===0)samples.push(p);
      }
    }
    for(const beat of [0,.25,.5,1,1.5,7.75,16])assert.deepEqual(pose(scene,beat),cameoPose(id,beat));
    signatures.add(JSON.stringify(samples));
  }
  assert.equal(signatures.size,4);
  const invalid=clone(defaultScene());invalid.dance='download-a-script';assert.throws(()=>validateScene(invalid));
});

test('signature motions swing together, squat, alternate kicks and shuffle faster',()=>{
  const p=(dance,beat)=>pose({...defaultScene(),dance,intensity:1},beat);
  const f=p('floss',.5);assert.ok(f.armL>0&&f.armR>0&&f.body<0&&f.x<0);
  assert.ok(p('orangejustice',.5).y>20);assert.ok(p('orangejustice',.5).shinL<-.9);
  assert.ok(p('takethel',.5).legL>.9);assert.ok(p('takethel',1.5).legR<-.9);
  assert.ok(p('takethel',.5).armL<-1.7);assert.ok(p('takethel',.5).foreL<-1);
  assert.ok(p('electroshuffle',.25).legL>0);assert.ok(p('electroshuffle',.75).legL<0);
});

test('the full surprise bag includes each Fortnite routine once and leaves existing routines in rotation',()=>{
  const scheduler=new DanceCameos(()=>.42,{routines:partyRoutines});
  const picked=Array.from({length:partyRoutines.length},()=>scheduler.pick());
  assert.equal(new Set(picked).size,partyRoutines.length);
  for(const {id}of fortniteRoutines)assert.ok(picked.includes(id));
  assert.ok(picked.includes('booty'));assert.ok(picked.includes('sneak'));
});
