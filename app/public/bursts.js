const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ease=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
export const BURST_COOLDOWN=300;

// A local flourish, gated by sustained rhythmic music, never volume alone.
export class ElasticBurst {
  constructor(random=Math.random){this.random=random;this.nextAllowed=0;this.startedAt=null;this.endsAt=0;this.strongProgress=0;this.previousBeat=null;this.last=null;this.envelope=0;this.interrupted=false;this.status='Waiting for strong beats';this.played=0;this.paused=false;this.wasDancing=false;this.elapsedActive=0;this.duration=8;this.extraWait=0;}
  step(t,clock,base=1,enabled=true,reducedMotion=false,blocked=false){
    const gap=this.last===null?0:Math.max(0,t-this.last),dt=gap>1?0:clamp(gap,0,.1);this.last=t;
    const beat=Number.isFinite(clock.beat)?clock.beat:0;
    let justStarted=false;
    const allowed=enabled&&!reducedMotion&&base>0;
    const impact=Number.isFinite(clock.beatStrength)?clock.beatStrength:clock.confidence>=.25?clock.energy:0;
    const dancing=!clock.silent&&clock.activity>.85,strong=allowed&&dancing&&impact>=.6;
    const delta=this.previousBeat===null?0:beat-this.previousBeat;
    const boundary=delta>0&&delta<2&&Math.floor(beat)>Math.floor(this.previousBeat);
    // Strong-beat credit survives song breaks and changes of tempo.
    if(this.startedAt===null&&strong&&t>=this.nextAllowed)this.strongProgress=Math.min(4,this.strongProgress+dt*clamp(clock.bpm||120,50,200)/60);
    this.previousBeat=beat;
    if(this.startedAt===null&&allowed&&dancing&&!blocked&&t>=this.nextAllowed&&this.strongProgress>=4-1e-8&&boundary){
      const bpm=Number.isFinite(clock.bpm)?clamp(clock.bpm,50,200):120;
      justStarted=true;this.startedAt=t;this.duration=clamp(16*60/bpm,6,12);this.elapsedActive=0;this.endsAt=t+this.duration;this.interrupted=false;this.paused=false;this.strongProgress=0;this.played++;
      // The five-minute quiet interval starts AFTER the sequence finishes.
      this.extraWait=clamp(this.random(),0,1)*60;this.nextAllowed=this.endsAt+BURST_COOLDOWN+this.extraWait;
    }
    if(this.startedAt!==null){
      if(!allowed)this.interrupted=true;
      this.paused=!dancing||gap>1||!this.wasDancing;
      if(!this.paused&&!this.interrupted&&!justStarted)this.elapsedActive+=dt;
      const target=this.paused||this.interrupted?0:ease(this.elapsedActive/(this.duration/8))*ease((this.duration-this.elapsedActive)/(this.duration/4));
      this.envelope=gap>1?0:this.envelope+clamp(target-this.envelope,-dt*2,dt*2);
      this.endsAt=t+Math.max(0,this.duration-this.elapsedActive);this.nextAllowed=this.endsAt+BURST_COOLDOWN+this.extraWait;
      if(this.elapsedActive>=this.duration||this.interrupted&&this.envelope<.002){this.startedAt=null;this.envelope=0;this.strongProgress=0;this.endsAt=t;this.nextAllowed=t+BURST_COOLDOWN+this.extraWait;this.paused=false;}
    }
    this.wasDancing=dancing&&gap<=1;
    this.status=!enabled?'Off':reducedMotion?'Windows/browser reduced motion is on':base<=0?'Bendiness is zero':this.startedAt!==null?this.paused?'Rubber bones paused between songs':'Rubber bones · '+Math.round((base+(2-base)*this.envelope)*100)+'%':t<this.nextAllowed?'Cooling down · '+Math.ceil(this.nextAllowed-t)+'s':!dancing?'Waiting for music · strong-beat progress kept':blocked?'Giving another surprise some space':'Strong beats: '+Math.floor(this.strongProgress)+'/4 · waiting for a musical moment';
    return clamp(base,0,1.5)+(2-clamp(base,0,1.5))*this.envelope;
  }
}
