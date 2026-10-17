import {fortniteRoutines,fortnitePose} from './fortnite.js';
import {cabaretRoutines,cabaretPose} from './cabaret.js';
const TAU=Math.PI*2,rad=Math.PI/180;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const cameoRoutines=[
  {id:'sneak',name:'Graveyard Sneak'},
  {id:'bow',name:'Too Much Applause'},
  {id:'juggle',name:'Jellybone Juggle'},
  {id:'lasso',name:'Invisible Lasso'},
  {id:'charleston',name:'Haunted Charleston'},
];
export const adultRoutines=[
  {id:'shimmy',name:'Crypt Club Shimmy'},
  {id:'boa',name:'Boa After Dark'},
  {id:'kiss',name:'Kiss of Death'},
  {id:'grind',name:'Graveyard Grind'},
  {id:'booty',name:'Afterlife Booty Pop'},
];
export const partyRoutines=[...cameoRoutines,...adultRoutines,...fortniteRoutines,...cabaretRoutines];

// Complete, bounded rig poses. Costumes and props use the same joint anchors.
export function cameoPose(id,beat){
  const p=beat*TAU,w=Math.sin(p),q=Math.cos(p),v=Math.sin(p/2);
  const r={x:0,y:0,body:0,head:0,armL:18,foreL:-25,armR:-18,foreR:25,legL:0,shinL:0,legR:0,shinR:0};
  switch(id){
    case 'chair':case 'bodyroll':case 'dropdead':case 'suspenders':Object.assign(r,cabaretPose(id,beat));break;
    case 'floss':case 'orangejustice':case 'takethel':case 'electroshuffle':Object.assign(r,fortnitePose(id,beat));break;
    case 'sneak':Object.assign(r,{x:Math.sin(p/8)*32,y:9+Math.abs(w)*3,body:18+v*5,head:-22+Math.sin(p/4)*9,armL:55+w*8,foreL:-95,armR:-55-w*8,foreR:95,legL:w*30,shinL:35+q*30,legR:-w*30,shinR:35-q*30});break;
    case 'bow':{const bow=(1-Math.cos(p/8))/2;Object.assign(r,{y:bow*15,body:bow*30,head:bow*24,armL:75-bow*55,foreL:-45-bow*45,armR:-75+bow*40,foreR:40+v*18,legL:12+bow*10,legR:-12,shinL:bow*22,shinR:bow*15});break;}
    case 'juggle':Object.assign(r,{y:-Math.abs(w)*4,body:v*9,head:-10+q*13,armL:45+w*22,foreL:-65+q*40,armR:-45+w*22,foreR:65+q*40,legL:v*12,legR:-v*12,shinL:10+q*10,shinR:10-q*10});break;
    case 'lasso':Object.assign(r,{x:v*14,body:v*12,head:-v*16,armL:45,foreL:-95,armR:-85+Math.sin(p/2)*24,foreR:Math.cos(p/2)*80,legL:16+w*17,legR:-16-w*17,shinL:Math.max(0,q)*32,shinR:Math.max(0,-q)*32});break;
    case 'charleston':Object.assign(r,{x:v*12,y:-Math.abs(w)*5,body:-8+v*7,head:12-v*12,armL:30+q*38,foreL:-40-w*22,armR:-30+q*38,foreR:40-w*22,legL:w*48,legR:-w*48,shinL:Math.max(0,-q)*70,shinR:Math.max(0,q)*70});break;
    case 'shimmy':Object.assign(r,{x:v*19,y:7+Math.sin(p)*3,body:v*19,head:-v*17,armL:-95+q*5,foreL:-100,armR:95+q*5,foreR:100,legL:25-v*13,legR:-25-v*13,shinL:24+q*12,shinR:24-q*12});break;
    case 'boa':Object.assign(r,{x:Math.sin(p/4)*18,y:4+v*3,body:Math.sin(p/4)*23,head:-18-Math.sin(p/4)*12,armL:60+v*22,foreL:-80+q*20,armR:-60-v*22,foreR:80-q*20,legL:13+v*12,legR:-13+v*12,shinL:12-q*10,shinR:12+q*10});break;
    case 'kiss':{const tease=(1+Math.sin(p/4))/2;Object.assign(r,{x:-15+tease*18,y:3,body:-14+tease*22,head:12-tease*22,armL:38,foreL:-100,armR:45-tease*100,foreR:110-tease*80,legL:18,legR:-18,shinL:10+tease*12,shinR:10});break;}
    case 'grind':{const thrust=(1+Math.sin(p))/2;Object.assign(r,{x:Math.sin(p/4)*16,y:9+thrust*7,body:-19+thrust*30,head:16-thrust*24,armL:45,foreL:-105,armR:-45,foreR:105,legL:42-thrust*10,legR:-42+thrust*10,shinL:-40-thrust*15,shinR:40+thrust*15});break;}
    case 'booty':Object.assign(r,{x:Math.sin(p/2)*24,y:14+Math.abs(w)*5,body:24+v*9,head:-24-v*8,armL:22,foreL:-70,armR:-22,foreR:70,legL:35-v*5,legR:-60-v*5,shinL:-55-q*12,shinR:85+q*12});break;
    default:throw Error('Unknown cameo routine');
  }
  for(const key of Object.keys(r))if(key!=='x'&&key!=='y')r[key]=clamp(r[key],key==='body'||key==='head'?-35:-110,key==='body'||key==='head'?35:110)*rad;
  return r;
}

export class DanceCameos {
  constructor(random=Math.random,options={}){this.random=random;this.routines=options.routines||cameoRoutines;this.firstDelay=options.firstDelay||[45,75];this.delay=options.delay||[75,120];this.poseFor=Object.hasOwn(options,'poseFor')?options.poseFor:cameoPose;this.nextAllowed=null;this.active=null;this.bag=[];this.lastId=null;this.previousBeat=null;this.last=null;this.phase=0;this.weight=0;this.interrupted=false;this.restUntil=0;this.paused=false;this.wasDancing=false;this.elapsedActive=0;this.played=0;this.lastPlayed='';this.status='Waiting for music';}
  cancel(){this.interrupted=true;}
  setRoutines(routines){if(this.routines===routines)return;this.routines=routines;this.bag=[];if(this.active&&!routines.some(r=>r.id===this.active.id))this.cancel();}
  pick(){
    if(!this.bag.length){this.bag=this.routines.map(r=>r.id);for(let i=this.bag.length-1;i>0;i--){const j=Math.floor(clamp(this.random(),0,.999999)*(i+1));[this.bag[i],this.bag[j]]=[this.bag[j],this.bag[i]];}if(this.bag.at(-1)===this.lastId)[this.bag[0],this.bag[this.bag.length-1]]=[this.bag.at(-1),this.bag[0]];}
    return this.lastId=this.bag.pop();
  }
  finish(t){this.active=null;this.weight=0;this.restUntil=t+12;this.nextAllowed=t+this.delay[0]+clamp(this.random(),0,1)*(this.delay[1]-this.delay[0]);this.paused=false;}
  step(t,clock,enabled=true,reducedMotion=false,blocked=false){
    const gap=this.last===null?0:Math.max(0,t-this.last),dt=Math.min(.1,gap);this.last=t;
    const beat=Number.isFinite(clock.beat)?clock.beat:0,delta=this.previousBeat===null?0:beat-this.previousBeat;
    const boundary=delta>0&&delta<2&&Math.floor(beat)>Math.floor(this.previousBeat);this.previousBeat=beat;
    if(this.nextAllowed===null)this.nextAllowed=t+this.firstDelay[0]+clamp(this.random(),0,1)*(this.firstDelay[1]-this.firstDelay[0]);
    // Tempo precision and temporary detection gaps must not discard a due event.
    const dancing=!clock.silent&&clock.activity>.8;
    const advance=gap<=1&&dancing&&this.wasDancing;
    const move=(value,target)=>value+Math.max(-dt*1.5,Math.min(dt*1.5,target-value));
    if(this.active){
      if(!enabled||reducedMotion||blocked)this.interrupted=true;
      if(this.interrupted){this.weight=move(this.weight,0);if(this.weight<.002)this.finish(t);}
      else if(!advance){this.paused=true;this.weight=gap>1?0:move(this.weight,0);}
      else{
        this.paused=false;this.elapsedActive+=dt;
        this.phase+=delta>=0&&delta<2?delta:dt*(clock.bpm||120)/60;
        this.weight=move(this.weight,Math.max(0,Math.min(1,this.phase/2,(16-this.phase)/3)));
        if(this.phase>=16||this.elapsedActive>22)this.finish(t);
      }
    }else if(enabled&&!reducedMotion&&dancing&&!blocked&&t>=this.nextAllowed&&t>=this.restUntil&&boundary){
      const id=this.pick();this.active={id,name:this.routines.find(r=>r.id===id).name,started:t};this.phase=0;this.weight=0;this.elapsedActive=0;this.paused=false;this.interrupted=false;this.played++;this.lastPlayed=this.active.name;
    }
    this.wasDancing=dancing&&gap<=1;
    this.status=!enabled?'Off':reducedMotion?'Windows/browser reduced motion is on':this.active?(this.paused?'Paused between songs: ':'Playing: ')+this.active.name:!dancing?'Waiting for music · due timers are kept':blocked?'Giving another surprise some space':t<this.nextAllowed?'Next opportunity in '+Math.ceil(this.nextAllowed-t)+'s':'Ready on the next beat';
    return this.active?{pose:this.poseFor?this.poseFor(this.active.id,this.phase):null,weight:clamp(this.weight,0,1)}:null;
  }
}
