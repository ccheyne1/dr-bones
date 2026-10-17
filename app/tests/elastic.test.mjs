import test from 'node:test';import assert from 'node:assert/strict';
import {ElasticMotion,neutralElastic} from '../public/elastic.js';
import {defaultScene,pose,idlePose,dances} from '../public/core.js';

test('elastic animation genuinely deforms the body and limbs throughout every routine, within bounds',()=>{
  for(const dance of dances){const motion=new ElasticMotion(),scene={...defaultScene(),dance};let min=2,max=0,bend=0,lag=0;
    for(let i=0;i<1200;i++){const t=i/60,p=pose(scene,t*2,1.2),r=motion.step(t,p,t*2,1.2,1,1.5);assert.ok(Object.values(r.pose).every(Number.isFinite));assert.ok(Object.values(r.rig).every(Number.isFinite));
      assert.ok(r.rig.sy>=0.68&&r.rig.sy<=1.35);for(const k of ['armL','foreL','armR','foreR','legL','shinL','legR','shinR'])assert.ok(r.rig[k]>=0.66&&r.rig[k]<=1.4);
      min=Math.min(min,r.rig.sy);max=Math.max(max,r.rig.sy);bend=Math.max(bend,Math.abs(r.rig.bend));lag=Math.max(lag,Math.abs(r.pose.head-p.head));}
    assert.ok(max-min>.2);assert.ok(bend>5);assert.ok(lag>.01);
  }
});
test('elastic deformation settles to neutral in silence, with no perpetual wobble',()=>{
  const motion=new ElasticMotion(),scene=defaultScene();for(let i=0;i<240;i++){const t=i/60;motion.step(t,pose(scene,t*2),t*2,1,1);}
  let r;for(let i=240;i<=600;i++){const t=i/60;r=motion.step(t,idlePose(t),t*2,0.15,0);}
  for(const [k,v]of Object.entries(neutralElastic()))assert.ok(Math.abs(r.rig[k]-v)<0.0001,k);
  assert.ok(Math.abs(r.pose.legL)<0.0001);assert.ok(Math.abs(r.pose.head)<0.01);
});
test('zero bendiness matches original poses and long pauses never destabilize springs',()=>{
  const motion=new ElasticMotion(),scene=defaultScene();for(let i=0;i<120;i++){const t=i/60,p=pose(scene,t*2);const r=motion.step(t,p,t*2,1,1,0);assert.deepEqual(r.pose,p);assert.deepEqual(r.rig,neutralElastic());}
  for(const t of [3600,3600.016,0,0.016]){const r=motion.step(t,pose(scene,1),1,1.4,1,1.5);assert.ok(Object.values(r.rig).every(Number.isFinite));assert.ok(Object.values(r.pose).every(Number.isFinite));}
});
test('spring motion stays comparable at different display frame rates',()=>{
  const sample=fps=>{const motion=new ElasticMotion(),s=defaultScene();let r;for(let i=0;i<=fps*6;i++){const t=i/fps;r=motion.step(t,pose(s,t*2),t*2);}return r;};
  const a=sample(60),b=sample(120);for(const k of ['sx','sy','shear'])assert.ok(Math.abs(a.rig[k]-b.rig[k])<0.06,k);assert.ok(Math.abs(a.pose.head-b.pose.head)<0.08);
});

test('200% is visibly more elastic than 150%, and extreme springs stay finite with positive segment scales',()=>{
  const span=amount=>{const m=new ElasticMotion(),s=defaultScene();let lo=2,hi=0;for(let i=0;i<600;i++){const t=i/60,r=m.step(t,pose(s,t*2,1.2),t*2,1.2,1,amount).rig;lo=Math.min(lo,r.sy);hi=Math.max(hi,r.sy);}return hi-lo;};
  assert.ok(span(2)>span(1.5)+.1);
  for(const dance of dances){const m=new ElasticMotion(),s={...defaultScene(),dance};for(let i=0;i<600;i++){const t=i/60,r=m.step(t,pose(s,t*3,1.4),t*3,1.4,1,2);assert.ok(Object.values(r.rig).every(Number.isFinite));assert.ok(Object.values(r.pose).every(Number.isFinite));assert.ok(r.rig.sy>=.58&&r.rig.sy<=1.48);for(const key of ['armL','foreL','armR','foreR','legL','shinL','legR','shinR'])assert.ok(r.rig[key]>=.52&&r.rig[key]<=1.6);}}
});
