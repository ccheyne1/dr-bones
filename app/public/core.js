import {fortniteRoutines,fortnitePose} from './fortnite.js';
export const dances = ['groove','disco','moonwalk','dramatic','rattle','robot','salsa',...fortniteRoutines.map(r=>r.id)];
export const hats = ['none','cowboy','witch','crown','pirate','tophat'];
export const outfits = ['bones','disco','vampire','pirate','astronaut'];
export const props = ['none','pumpkin','wand','microphone','sword'];
export const moods = ['happy','spooky','sleepy','sassy'];
export const themes = ['halloween','underwater','space','graveyard','candy'];
export const joints = ['body','head','armL','foreL','armR','foreR','legL','shinL','legR','shinR'];
export const anchors = ['head','torso','pelvis','handL','handR','footL','footR','armL','armR'];
export const defaultScene = () => ({version:1,headSize:1,hat:'none',outfit:'bones',boa:false,boaColor:'#ff65b5',glasses:false,prop:'none',mood:'happy',dance:'groove',intensity:0.8,accent:'#ff923e',theme:'halloween',effects:['fog','stars'],layers:[],elements:[],choreography:{beats:8,frames:[]},description:'A little rhythm. A lot of spirit.'});
export const clone = x => JSON.parse(JSON.stringify(x));
const keys = (x, allowed) => { if (!x || typeof x !== 'object' || Array.isArray(x) || Object.keys(x).some(k=>!allowed.includes(k))) throw Error('Unknown or missing data fields'); };
const num = (x,a,b) => { if(typeof x!=='number'||!Number.isFinite(x)||x<a||x>b) throw Error(`Number must be between ${a} and ${b}`); };
const choice=(x,values)=> { if(!values.includes(x)) throw Error('Unsupported choice'); };
const color=x=> { if(typeof x!=='string'||!/^#[0-9a-f]{6}$/i.test(x)) throw Error('Use a six-digit hex color'); };
export function validateScene(input) {
  if(JSON.stringify(input).length>32000) throw Error('Scene is too large');
  keys(input,Object.keys(defaultScene()));
  const s=clone(input);
  // Scenes saved before adjustable heads keep their original proportions.
  if(!Object.hasOwn(s,'headSize'))s.headSize=1;
  num(s.headSize,0.65,1.8);
  if(s.version!==1) throw Error('Scene version must be 1');
  choice(s.hat,hats); choice(s.outfit,outfits); choice(s.prop,props); choice(s.mood,moods); choice(s.dance,dances); choice(s.theme,themes);
  if(typeof s.boa!=='boolean'||typeof s.glasses!=='boolean') throw Error('Accessories must be true or false');
  num(s.intensity,0.2,1.4); color(s.accent);color(s.boaColor);
  if(typeof s.description!=='string'||s.description.length>160) throw Error('Description must be at most 160 characters');
  if(!Array.isArray(s.effects)||s.effects.length>3||new Set(s.effects).size!==s.effects.length) throw Error('At most three distinct effects');
  s.effects.forEach(e=>choice(e,['fog','stars','bubbles','confetti']));
  if(!Array.isArray(s.layers)||s.layers.length>24||!Array.isArray(s.elements)||s.elements.length>16) throw Error('Too many shapes');
  for(const [list,stage] of [[s.layers,false],[s.elements,true]]) for(const l of list) {
    keys(l,['anchor','shape','x','y','w','h','rotation','color','pattern','behind']);
    choice(l.anchor,stage?['stage']:anchors); choice(l.shape,['rect','ellipse','triangle','star']);
    num(l.x,stage?-480:-100,stage?480:100); num(l.y,stage?-260:-100,stage?260:100);
    num(l.w,2,stage?160:100); num(l.h,2,stage?160:100);num(l.rotation,-180,180);color(l.color);
    choice(l.pattern,['solid','stripes','dots']);if(typeof l.behind!=='boolean')throw Error('Layer order must be boolean');
  }
  keys(s.choreography,['beats','frames']);num(s.choreography.beats,1,32);
  if(!Array.isArray(s.choreography.frames)||s.choreography.frames.length>32)throw Error('At most 32 keyframes');
  let last=-1;
  for(const f of s.choreography.frames) {
    keys(f,['beat','joints']);num(f.beat,0,s.choreography.beats);if(f.beat<=last)throw Error('Keyframes must be ordered');last=f.beat;
    keys(f.joints,joints);if(!Object.keys(f.joints).length)throw Error('Empty keyframe');
    for(const [k,v] of Object.entries(f.joints))num(v,k==='body'||k==='head'?-35:-110,k==='body'||k==='head'?35:110);
  }
  return s;
}
export const schemaGuide = `Return ONLY one complete JSON scene, no code or markdown. Preserve all unrelated choices from CURRENT SCENE. Describe approximations honestly in description (max 160 chars). Fields: version=1; headSize=0.65..1.8 (default 1, scales skull and attached accessories); hat=none|cowboy|witch|crown|pirate|tophat; outfit=bones|disco|vampire|pirate|astronaut; boa and glasses booleans; boaColor=#RRGGBB (independent of other costumes); prop=none|pumpkin|wand|microphone|sword; mood=happy|spooky|sleepy|sassy; dance=${dances.join('|')}; intensity=0.2..1.4; accent=#RRGGBB; theme=halloween|underwater|space|graveyard|candy; effects up to 3 unique fog|stars|bubbles|confetti; layers up to 24 rig-attached shapes; elements up to 16 stage shapes. Each shape has anchor (layers: head|torso|pelvis|handL|handR|footL|footR|armL|armR; elements: stage), shape=rect|ellipse|triangle|star, x,y (local units, layers -100..100; stage x -480..480,y -260..260), w,h=2..100 (stage 2..160), rotation=-180..180 degrees, color=#RRGGBB, pattern=solid|stripes|dots, behind=boolean. Rig units: skull centered at (0,0), torso center (0,0), hand (0,0), with body about 220 units tall. choreography: {beats:1..32,frames:[up to 32 ordered {beat:0..beats,joints:{joint:degrees}}]}. joints=body|head (±35),armL|foreL|armR|foreR|legL|shinL|legR|shinR (±110); keyframes are additive offsets to chosen dance, repeated each cycle and smoothly interpolated. Use modest joint offsets. No images, scripts, URLs, audio, rapid flashes, or new data fields.`;
export function localRequest(current, text) {
  const s=clone(current),t=text.toLowerCase().trim(); let changed=false;
  const set=(k,v)=> {s[k]=v;changed=true;};
  if(/reset|start over/.test(t))return {scene:defaultScene(),recognized:true};
  if(/\bhead\b/.test(t)){
    if(/\b(huge|giant|gigantic|massive|enormous)\b/.test(t))set('headSize',1.8);
    else if(/\b(big|bigger|large|larger|grow|enlarge)\b/.test(t))set('headSize',Math.min(1.8,(s.headSize??1)+0.3));
    else if(/\b(tiny|small|smaller|shrink)\b/.test(t))set('headSize',Math.max(0.65,(s.headSize??1)-0.3));
    else if(/\b(normal|regular|original|restore|reset)\b/.test(t))set('headSize',1);
  }
  if(/remove.*hat|no hat|without.*hat/.test(t))set('hat','none');
  else if(/cowboy/.test(t))set('hat','cowboy');else if(/witch/.test(t))set('hat','witch');else if(/crown|royal/.test(t))set('hat','crown');else if(/top ?hat/.test(t))set('hat','tophat');
  if(/pirate/.test(t)){set('hat','pirate');set('outfit','pirate');}
  if(/vampire|dracula/.test(t))set('outfit','vampire');if(/astronaut/.test(t))set('outfit','astronaut');if(/disco/.test(t))set('outfit','disco');
  if(/bare bones|remove.*costume/.test(t))set('outfit','bones');
  if(/boa|feather/.test(t))set('boa',!/remove|without|no boa/.test(t));
  if(/glasses|sunglasses/.test(t))set('glasses',!/remove|without/.test(t));
  if(/remove.*prop|empty hand/.test(t))set('prop','none');else for(const p of props.slice(1))if(t.includes(p))set('prop',p);
  const fortniteDance=/\bfloss(?:ing)?\b/.test(t)?'floss':/\borange[\s-]*justice\b/.test(t)?'orangejustice':/\btake[\s-]*(?:the[\s-]*)?l\b/.test(t)?'takethel':/\belectro[\s-]*shuffle\b/.test(t)?'electroshuffle':null;
  if(fortniteDance){set('dance',fortniteDance);s.choreography={beats:8,frames:[]};}
  else if(/moonwalk/.test(t))set('dance','moonwalk');else if(/falling apart|rattle|loose bones/.test(t))set('dance','rattle');else if(/dramatic/.test(t))set('dance','dramatic');else if(/robot/.test(t))set('dance','robot');else if(/salsa/.test(t))set('dance','salsa');else if(/disco/.test(t))set('dance','disco');else if(/groove/.test(t))set('dance','groove');
  for(const m of moods)if(t.includes(m))set('mood',m);
  if(/underwater|ocean/.test(t)){set('theme','underwater');set('effects',['fog','bubbles','stars']);}
  else if(/space|galaxy/.test(t)){set('theme','space');set('effects',['stars']);}
  else if(/graveyard|cemetery/.test(t))set('theme','graveyard');else if(/candy/.test(t))set('theme','candy');else if(/halloween/.test(t))set('theme','halloween');
  const colors={pink:'#ff65b5',purple:'#b18cff',orange:'#ff923e',green:'#9fe78c',blue:'#6cd9ff',red:'#ff6262',gold:'#ffd56a'};
  const colorText=t.replace(/\borange[\s-]*justice\b/g,'');
  for(const [name,c]of Object.entries(colors))if(colorText.includes(name))set(/boa|feather/.test(t)?'boaColor':'accent',c);
  if(/wild|energetic|party hard/.test(t))set('intensity',1.3);if(/gentle|slow|calm/.test(t))set('intensity',0.4);
  if(/confetti/.test(t))set('effects',[...new Set([...s.effects.slice(0,2),'confetti'])]);
  s.description=changed?`${s.hat==='none'?'Bone':s.hat} vibes, ${s.dance} moves. ${s.boa?'Feathers included!':'Let’s haunt the dance floor.'}`:'Try a hat, costume, dance, prop, color or stage. The local interpreter understands the examples.';
  return {scene:validateScene(s),recognized:changed};
}
const rad=Math.PI/180;
export function pose(scene, beat, energy=1) {
  const p=beat*2*Math.PI,a=scene.intensity*energy,w=Math.sin(p),v=Math.sin(p/2),q=Math.cos(p);
  let r={x:0,y:Math.abs(w)*-5*a,body:v*5,head:-v*8,armL:20+w*20*a,foreL:-20-q*20,armR:-20+w*20*a,foreR:20+q*20,legL:w*12*a,shinL:Math.max(0,q)*20*a,legR:-w*12*a,shinR:Math.max(0,-q)*20*a};
  switch(scene.dance){
    case 'floss':case 'orangejustice':case 'takethel':case 'electroshuffle':Object.assign(r,fortnitePose(scene.dance,beat,a));break;
    case 'disco':Object.assign(r,{body:v*10,armL:70+v*30,foreL:-55,armR:-100+v*20,foreR:-15,head:12*q,legL:15+w*15,legR:-15-w*15});break;
    case 'moonwalk':Object.assign(r,{x:Math.sin(p/4)*55,y:-3,body:-12,armL:10+v*15,armR:-10-v*15,foreL:-40,foreR:40,legL:25*w,legR:-25*w,shinL:Math.max(0,-w)*35,shinR:Math.max(0,w)*35});break;
    case 'dramatic':Object.assign(r,{y:-10*Math.abs(v),body:v*22,head:-v*24,armL:75+v*30,armR:-75+v*30,foreL:-70*q,foreR:70*q,legL:v*22,legR:-v*22});break;
    case 'rattle':Object.assign(r,{body:Math.sin(p*1.5)*14,head:Math.sin(p*2)*20,armL:35+Math.sin(p*1.5)*50,armR:-35+Math.cos(p*1.5)*50,foreL:Math.sin(p*2)*75,foreR:Math.cos(p*2)*75,legL:w*30,legR:q*30,shinL:25+25*q,shinR:25-25*w});break;
    case 'robot':{const step=Math.floor((beat%4)*2);Object.assign(r,{body:step%2?8:-8,head:step%2?-15:15,armL:step%4<2?80:15,armR:step%4>=2?-80:-15,foreL:-90,foreR:90,legL:step%2?12:0,legR:step%2?0:-12});break;}
    case 'salsa':Object.assign(r,{x:v*25,body:v*12,head:-v*12,armL:45+v*20,armR:-45+v*20,foreL:-75,foreR:75,legL:w*27,legR:-w*27,shinL:Math.max(0,q)*45,shinR:Math.max(0,-q)*45});break;
  }
  if(scene.dance==='groove'&&beat%16>14){const flourish=Math.sin((beat%16-14)*Math.PI/2);r.armR-=70*flourish;r.foreR+=Math.sin(p*2)*25*flourish;r.head-=10*flourish;}
  const fs=scene.choreography.frames,cycle=scene.choreography.beats,b=((beat%cycle)+cycle)%cycle;
  if(fs.length){let lo=fs.at(-1),hi=fs[0],lb=lo.beat-cycle,hb=hi.beat;for(let i=0;i<fs.length;i++){if(fs[i].beat<=b){lo=fs[i];lb=lo.beat;hi=fs[(i+1)%fs.length];hb=hi.beat+(i===fs.length-1?cycle:0);}}
    const t=hb===lb?0:Math.max(0,Math.min(1,(b-lb)/(hb-lb))),smooth=t*t*(3-2*t);
    for(const k of joints)r[k]+=((lo.joints[k]||0)*(1-smooth)+(hi.joints[k]||0)*smooth);
  }
  for(const k of joints)r[k]=Math.max(k==='body'||k==='head'?-35:-110,Math.min(k==='body'||k==='head'?35:110,r[k]))*rad;
  return r;
}
export function blendPose(a,b,t){const r={};t=Math.max(0,Math.min(1,t));t=t*t*(3-2*t);for(const k of Object.keys(b))r[k]=a[k]*(1-t)+b[k]*t;return r;}
// Quiet-room idle is independent of the beat and selected choreography.
export function idlePose(t){const breathe=Math.sin(t*0.6);return {x:0,y:breathe*0.1,body:breathe*0.1*rad,head:Math.sin(t*0.3)*0.35*rad,armL:12*rad,foreL:-8*rad,armR:-12*rad,foreR:8*rad,legL:0,shinL:0,legR:0,shinR:0};}
// The sample-timed music tracker is separate from scene/choreography data.
export {BeatClock} from './beat-clock.js';
