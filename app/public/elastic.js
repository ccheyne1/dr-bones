const TAU=Math.PI*2,rad=Math.PI/180;
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
export const neutralElastic=()=>({sx:1,sy:1,shear:0,neckX:0,neckY:0,bend:0,armL:1,armR:1,foreL:1,foreR:1,legL:1,legR:1,shinL:1,shinR:1});

// Bounded spring channels: no ragdoll solver, no accumulating procedural drift.
// Angles lag by different amounts so an impulse ripples through the character.
export class ElasticMotion {
  constructor(){this.channels=new Map();this.last=null;}
  spring(key,target,dt,frequency=3,damping=0.65){
    let s=this.channels.get(key);if(!s){s={x:target,v:0};this.channels.set(key,s);}
    const steps=Math.max(1,Math.ceil(dt*120)),h=dt/steps,w=frequency*TAU;
    for(let i=0;i<steps;i++){s.v+=(w*w*(target-s.x)-2*damping*w*s.v)*h;s.x+=s.v*h;}
    if(!Number.isFinite(s.x)||!Number.isFinite(s.v)){s.x=target;s.v=0;}
    return s.x;
  }
  step(t,p,beat,energy=1,activity=1,amount=1){
    if(this.last!==null&&t<this.last)this.channels.clear();
    const dt=this.last===null?0:clamp(t-this.last,0,0.05);this.last=t;
    const active=clamp(activity,0,1),strength=clamp(amount,0,2),extra=Math.max(0,strength-1.5),a=strength*active*clamp(energy,0.4,1.25),phase=beat*TAU;
    const e=neutralElastic(),targetSy=1-0.18*a*Math.cos(phase);
    e.sy=clamp(this.spring('sy',targetSy,dt,3.2),0.68-.2*extra,1.35+.26*extra);
    e.sx=clamp(this.spring('sx',1/Math.sqrt(targetSy)+0.045*a*Math.sin(phase/2),dt,2.7),0.8-.1*extra,1.35+.3*extra);
    e.shear=clamp(this.spring('shear',0.12*a*Math.sin(phase/2-0.35),dt,2.5),-0.24-.2*extra,0.24+.2*extra);
    e.neckX=clamp(this.spring('neckX',9*a*Math.sin(phase/2-0.7),dt,2.1),-18-12*extra,18+12*extra);
    e.neckY=clamp(this.spring('neckY',4*a*Math.sin(phase-0.6),dt,2.5),-8-6*extra,8+6*extra);
    e.bend=clamp(this.spring('bend',9*a*Math.sin(phase/2-0.3),dt,2.6),-17-12*extra,17+12*extra);
    for(const [key,offset,size]of [['armL',0,0.22],['foreL',-0.8,0.19],['armR',Math.PI,0.22],['foreR',Math.PI-0.8,0.19],['legL',1.2,0.10],['shinL',0.7,0.08],['legR',Math.PI+1.2,0.10],['shinR',Math.PI+0.7,0.08]])e[key]=clamp(this.spring(key,1+size*a*Math.sin(phase/2+offset),dt,3),0.66-.28*extra,1.4+.4*extra);
    const out={...p};
    for(const key of ['body','head','armL','foreL','armR','foreR','legL','shinL','legR','shinR']){
      const frequency=key==='head'?2.1:key.startsWith('fore')?2.6:key.startsWith('shin')?3.1:3.6;
      const filtered=this.spring('angle:'+key,p[key],dt,frequency,active>0.05?0.58:0.9);
      const limit=(key==='body'||key==='head'?35:110)*rad;
      out[key]=clamp(p[key]+(filtered-p[key])*Math.min(1,strength),-limit,limit);
    }
    // Zero elasticity is a true comparison with the original rig.
    if(strength===0)return {pose:{...p},rig:neutralElastic()};
    return {pose:out,rig:e};
  }
}
