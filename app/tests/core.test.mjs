import test from 'node:test';import assert from 'node:assert/strict';import {defaultScene,validateScene,localRequest,pose,blendPose,idlePose,BeatClock,dances,clone} from '../public/core.js';
test('silence smoothly settles every routine to a mostly still pose and music restores dancing',()=>{
  const c=new BeatClock();c.mode='mic';c.tick(0);let state;
  for(let i=1;i<=240;i++){const t=i/60;c.accept({time:t,rms:0,confidence:0,music:false,event:false});state=c.tick(t);}
  assert.equal(state.silent,true);assert.ok(state.activity<0.003);
  for(const dance of dances){const s={...defaultScene(),dance,choreography:{beats:4,frames:[{beat:0,joints:{head:30,armL:100}},{beat:2,joints:{head:-30,armL:-100}}]}};
    const positions=[];for(let i=0;i<60;i++){const t=4+i/60;positions.push(blendPose(idlePose(t),pose(s,t*2,1),state.activity));}
    for(const k of ['legL','legR','shinL','shinR','foreL','foreR'])assert.ok(Math.max(...positions.map(p=>p[k]))-Math.min(...positions.map(p=>p[k]))<0.001,`${dance} ${k} must rest`);
    assert.ok(Math.max(...positions.map(p=>p.y))-Math.min(...positions.map(p=>p.y))<0.5);
  }
  for(let i=1;i<=360;i++){const t=4+i/60;c.accept({time:t,rms:.12,confidence:.9,probability:.9,music:true,event:i%30===0,bpm:120,beatTime:t});state=c.tick(t);if(i===1)assert.ok(state.activity<.1);}
  assert.equal(state.silent,false);assert.ok(state.activity>0.99);
  c.mode='demo';c.lastSound=-Infinity;assert.equal(c.tick(10.1).silent,false);
});
test('steady room noise and isolated sounds do not sustain dancing after music stops',()=>{
  const c=new BeatClock();c.mode='mic';c.activity=0;c.tick(0);
  for(let i=1;i<=600;i++){const t=i/60;c.accept({time:t,rms:.03,confidence:0,music:false,event:false});const s=c.tick(t);assert.equal(s.silent,true);assert.equal(s.activity,0);}
  for(let i=1;i<=600;i++){const t=10+i/60;c.accept({time:t,rms:.12,confidence:.9,probability:.9,music:true,event:i%30===0,bpm:120,beatTime:t});c.tick(t);}
  assert.ok(c.activity>.99);
  let resting;for(let i=1;i<=300;i++){const t=20+i/60;c.accept({time:t,rms:.03,confidence:0,music:false,event:false});resting=c.tick(t);}
  assert.equal(resting.silent,true);assert.equal(resting.activity,0);
  for(const k of ['armL','foreL','armR','foreR','legL','shinL','legR','shinR'])assert.equal(idlePose(0)[k],idlePose(20)[k]);
  assert.ok(Math.abs(idlePose(3).head)<0.007);assert.ok(Math.abs(idlePose(3).y)<=0.1);
});
test('head proportions are bounded, preserve unrelated details, and accept older saved scenes',()=>{
  const current=defaultScene();current.hat='witch';current.dance='moonwalk';current.boa=true;
  const result=localRequest(current,'Give him a huge head');assert.equal(result.recognized,true);assert.equal(result.scene.headSize,1.8);
  assert.equal(result.scene.hat,current.hat);assert.equal(result.scene.dance,current.dance);assert.equal(result.scene.boa,true);
  assert.equal(localRequest(result.scene,'Give him a normal head').scene.headSize,1);
  const old=clone(current);delete old.headSize;assert.equal(validateScene(old).headSize,1);
  for(const size of [0,2,Infinity,'huge',null])assert.throws(()=>validateScene({...current,headSize:size}));
});
test('examples work and incremental edits preserve unrelated choices',()=>{
  const cowboy=localRequest(defaultScene(),'Make him a disco cowboy doing the moonwalk.').scene;
  assert.equal(cowboy.hat,'cowboy');assert.equal(cowboy.outfit,'disco');assert.equal(cowboy.dance,'moonwalk');
  const witch=localRequest(cowboy,'Give him a witch hat and make him dance dramatically.').scene;
  const boa=localRequest(witch,'Now keep the hat but add a pink feather boa.').scene;
  assert.equal(boa.hat,'witch');assert.equal(boa.outfit,'disco');assert.equal(boa.dance,'dramatic');assert.equal(boa.boa,true);assert.equal(boa.boaColor,'#ff65b5');assert.equal(boa.accent,witch.accent);
  const rattle=localRequest(boa,'Make him dance like his bones are falling apart.').scene;assert.equal(rattle.dance,'rattle');assert.equal(rattle.hat,'witch');assert.equal(rattle.boa,true);
  const water=localRequest(rattle,'Turn the stage into a haunted underwater nightclub.').scene;assert.equal(water.theme,'underwater');assert.equal(water.hat,'witch');assert.equal(water.dance,'rattle');
  const unknown=localRequest(water,'Build a real flying dragon');assert.equal(unknown.recognized,false);assert.equal(unknown.scene.theme,'underwater');
});
test('strict bounded scene import rejects code, malformed shapes, limits and unsafe values',()=>{
  const shape={anchor:'head',shape:'star',x:0,y:-40,w:20,h:20,rotation:0,color:'#ff65b5',pattern:'dots',behind:false};
  const ok=defaultScene();ok.layers=[shape];ok.choreography={beats:4,frames:[{beat:0,joints:{head:12}},{beat:2,joints:{head:-12}}]};assert.deepEqual(validateScene(ok),ok);
  const invalid=[s=>s.script='alert(1)',s=>s.hat='dragon',s=>s.accent='url(evil)',s=>s.intensity=Infinity,s=>s.effects=['fog','fog'],s=>s.layers=Array(25).fill(shape),s=>s.layers=[{...shape,x:101}],s=>s.layers=[{...shape,w:10000}],s=>s.layers=[{...shape,anchor:'window'}],s=>s.layers=[{...shape,onclick:'x'}],s=>s.choreography={beats:33,frames:[]},s=>s.choreography={beats:4,frames:[{beat:0,joints:{head:36}}]},s=>s.choreography={beats:4,frames:[{beat:2,joints:{head:1}},{beat:1,joints:{head:2}}]},s=>delete s.boa];
  for(const mutation of invalid){const s=defaultScene();mutation(s);assert.throws(()=>validateScene(s));}assert.throws(()=>validateScene(JSON.parse('{"__proto__":{"polluted":true}}')));assert.equal({}.polluted,undefined);
});
test('all routines have distinct continuous trajectories with bounded joints',()=>{
  const signatures=[];for(const dance of dances){const s={...defaultScene(),dance};const samples=[];for(let beat=0;beat<8;beat+=.125){const p=pose(s,beat,1);assert.ok(Object.values(p).every(Number.isFinite));for(const k of ['armL','armR','legL','legR','foreL','foreR'])assert.ok(Math.abs(p[k])<=110*Math.PI/180+1e-9);samples.push(p);}signatures.push(JSON.stringify(samples));assert.notDeepEqual(samples[0],samples[5]);}assert.equal(new Set(signatures).size,dances.length);
  const a=pose(defaultScene(),1),b=pose({...defaultScene(),dance:'disco'},1);assert.deepEqual(blendPose(a,b,0),a);assert.deepEqual(blendPose(a,b,1),b);
});
