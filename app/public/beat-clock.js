const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const wrapped=x=>x-Math.round(x);
const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];

// Presentation clock only. Tempo/beat evidence comes from the independent
// sample-timed neural tracker, never from render-frame loudness peaks.
export class BeatClock {
  constructor(){this.bpm=120;this.target=120;this.beat=0;this.last=null;this.mode='demo';this.sensitivity=1;this.confidenceNeeded=.2;this.offset=0;this.beatScale=1;this.activity=1;this.energy=.7;this.level=0;this.confidence=0;this.resetEvidence();}
  resetEvidence(){this.events=[];this.lastFrame=-Infinity;this.lastMusicFrame=-Infinity;this.lastBeat=-Infinity;this.lastImpact=-Infinity;this.music=false;this.attackStrength=0;this.trackingStatus='Listening for music';this.fitReady=false;}
  beginAudio(){this.resetEvidence();this.mode='mic';this.activity=0;this.confidence=0;this.energy=0;}
  manual(bpm){if(!Number.isFinite(bpm))return;this.bpm=this.target=clamp(bpm,50,200);this.mode='manual';this.confidence=1;this.trackingStatus='Manual tempo';}
  setBeatScale(scale){if([.5,1,2].includes(scale))this.beatScale=scale;}
  accept(frame){if(!Number.isFinite(frame.time)||frame.time<this.lastFrame)return;
    this.lastFrame=frame.time;this.level=Number.isFinite(frame.rms)?Math.max(0,frame.rms):0;
    this.energy+=(Math.min(1.4,this.level*30)-this.energy)*.15;this.music=!!frame.music;
    if(this.music)this.lastMusicFrame=frame.time;
    else if(frame.time-this.lastMusicFrame>1.5){this.events=[];this.fitReady=false;this.lastBeat=-Infinity;}
    const confidence=clamp(Number.isFinite(frame.confidence)?frame.confidence:0,0,1);
    this.confidence=this.mode==='mic'?confidence:this.confidence;
    if(frame.event){this.attackStrength=clamp(Number.isFinite(frame.strength)?frame.strength:Number.isFinite(frame.probability)?frame.probability:0,0,1);this.lastImpact=frame.time;}
    let raw=frame.bpm;
    if(this.mode!=='mic')return;
    if(!this.music){this.trackingStatus='Listening for music';return;}
    // Meter ambiguity must not cause a locked song to jump between half and
    // double tempo during fills. A real song gap clears this continuity rule.
    if(this.fitReady&&this.events.length>=6){if(raw/this.target>1.7&&raw/this.target<2.3)raw/=2;else if(raw/this.target>.43&&raw/this.target<.59)raw*=2;}
    if(frame.event&&Number.isFinite(frame.beatTime)&&raw>=50&&raw<=215&&confidence>.15){
      const time=frame.beatTime,last=this.events.at(-1),period=60/raw;
      if(!last||time-last.time>.22){
        if(last&&time-last.time>3)this.events=[];
        const prev=this.events.at(-1),steps=prev?Math.max(1,Math.round((time-prev.time)/period)):0;
        this.events.push({time,index:prev?prev.index+steps:0});if(this.events.length>12)this.events.shift();this.lastBeat=time;
        // Robust regression across accepted musical beats refines the particle
        // filter's 20ms tempo bins; single loud events do not define the BPM.
        if(this.events.length>=4){const intervals=[];for(let i=1;i<this.events.length;i++)intervals.push((this.events[i].time-this.events[i-1].time)/(this.events[i].index-this.events[i-1].index));
          const center=median(intervals),recent=median(intervals.slice(-3));
          if(Math.abs(recent-period)<period*.15&&Math.abs(recent-center)>center*.07)this.events=this.events.slice(-4);
          const n=this.events.length,meanX=this.events.reduce((a,e)=>a+e.index,0)/n,meanY=this.events.reduce((a,e)=>a+e.time,0)/n;
          let xx=0,xy=0;for(const e of this.events){xx+=(e.index-meanX)**2;xy+=(e.index-meanX)*(e.time-meanY);}const slope=xy/xx,bpm=60/slope;
          if(bpm>=50&&bpm<=215&&Math.abs(slope-period)<period*.18){this.target=clamp(bpm,50,200);this.fitReady=true;}
        }else this.target=clamp(raw,50,200);
      }
    }
    this.trackingStatus=!this.music?'Listening for music':this.confidence>.6&&this.events.length>=4?'Rhythm locked':this.events.length?'Following music':'Finding the pulse';
  }
  tick(t){if(this.last===null)this.last=t;const elapsed=Math.max(0,t-this.last),dt=Math.min(.1,elapsed);this.last=t;
    const fresh=t-this.lastFrame<1.2,silent=this.mode==='mic'&&(!fresh||!this.music);
    this.bpm+=(this.target-this.bpm)*(1-Math.exp(-dt*(this.fitReady?1.4:.7)));
    const effectiveBpm=this.mode==='mic'?clamp(this.bpm*this.beatScale,50,200):this.bpm,scale=effectiveBpm/this.bpm;let speed=effectiveBpm/60;
    if(this.mode==='mic'&&!silent&&t-this.lastBeat<3&&this.confidence>.25){const desired=(this.events.at(-1)?.index||0)*scale+(t-this.lastBeat)*effectiveBpm/60,error=wrapped(desired-this.beat);speed+=clamp(error*1.8,-.25,.25);}
    this.beat+=elapsed*Math.max(.1,speed);
    const target=silent?0:1;this.activity+=(target-this.activity)*(1-Math.exp(-dt*3.5));if(silent&&this.activity<.0025)this.activity=0;
    if(this.mode==='mic'&&silent)this.confidence*=Math.exp(-dt*.6);
    return {beat:this.beat+this.offset*effectiveBpm/60000,bpm:effectiveBpm,confidence:this.confidence,beatStrength:silent?0:this.mode==='mic'?(t-this.lastImpact<1.5?this.attackStrength:0):1,energy:silent?.15:this.mode==='mic'?Math.max(.4,this.energy):1,silent,activity:this.activity};
  }
}
