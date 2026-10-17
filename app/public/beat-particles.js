// Adapted from BeatNet's online particle filter and coral/beatnet-rs repairs.
// Attribution/licenses: vendor/beatnet/LICENSE.txt. No offline lookahead.
const TAU=2*Math.PI;
class Space {
  constructor(min,max,beat){this.states=[];this.first=[];this.cdf=[];
    for(let interval=min;interval<=max;interval++){this.first.push(this.states.length);for(let offset=0;offset<interval;offset++)this.states.push({interval,offset,tempo:interval-min,sin:Math.sin(TAU*offset/interval),cos:Math.cos(TAU*offset/interval)});
      const weights=Array.from({length:max-min+1},(_,j)=>beat?Math.exp(-60*Math.abs((j+min)/interval-1)):min===max?1:j+min===interval?.9:.1/(max-min)),total=weights.reduce((a,b)=>a+b,0);let sum=0;this.cdf.push(weights.map(w=>sum+=w/total));this.cdf.at(-1)[weights.length-1]=1;
    }
  }
  advance(id,random){const s=this.states[id];if(s.offset+1<s.interval)return id+1;const row=this.cdf[s.tempo],draw=random();let i=0;while(i<row.length-1&&row[i]<=draw)i++;return this.first[i];}
}
class Population {
  constructor(n,space,random){this.n=n;this.ids=new Uint32Array(n);this.counts=new Uint32Array(space.states.length);this.reset(space,random);}
  reset(space,random){for(let i=0;i<this.n;i++)this.ids[i]=Math.floor(random()*space.states.length);}
  motion(space,random){this.candidates=Array.from(this.ids,id=>space.advance(id,random));}
  resample(weights,random){let total=weights.reduce((a,b)=>a+b,0);if(!Number.isFinite(total)||total<=0){weights.fill(1);total=weights.length;}let index=0,cumulative=weights[0]/total;
    for(let j=0;j<this.n;j++){const point=(j+random())/this.n;while(point>=cumulative&&index+1<weights.length)cumulative+=weights[++index]/total;this.ids[j]=this.candidates[index];}
  }
  median(){this.counts.fill(0);for(const id of this.ids)this.counts[id]++;let count=0,low=null;for(let id=0;id<this.counts.length;id++){count+=this.counts[id];if(low===null&&count>(this.n-1)/2)low=id;if(count>this.n/2)return Math.floor((low+id)/2);}return 0;}
}
export class BeatParticles {
  constructor({minBpm=70,maxBpm=180,particles=3000}={}){if(minBpm<50||maxBpm>215||minBpm>=maxBpm||particles<500||particles>10000)throw Error('Invalid beat tracker bounds');this.space=new Space(Math.round(3000/maxBpm),Math.round(3000/minBpm),true);this.n=particles;this.reset();}
  reset(){let seed=1387;this.random=()=>{seed|=0;seed=seed+0x6d2b79f5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};this.pop=new Population(this.n,this.space,this.random);this.lastBeat=-Infinity;this.locked=false;}
  step(p,time){if(p.length!==3||p.some(x=>!Number.isFinite(x)||x<0||x>1)||Math.abs(p.reduce((a,b)=>a+b)-1)>.001)throw Error('Invalid beat probabilities');
    const activation=Math.max(p[0],p[1]),gated=activation<.4?.03:activation,pop=this.pop,space=this.space;pop.motion(space,this.random);
    if(gated>.1){if(gated>.8){const start=Math.floor(this.random()*4);for(let i=start;i<space.first.length;i+=6)pop.candidates.push(space.first[i]);}
      pop.resample(pop.candidates.map(id=>{const s=space.states[id];return s.offset/s.interval<1/56?gated:.03;}),this.random);
    }else pop.ids.set(pop.candidates);
    const selected=space.states[pop.median()];let sin=0,cos=0;for(const id of pop.ids){sin+=space.states[id].sin;cos+=space.states[id].cos;}const confidence=Math.min(1,Math.hypot(sin,cos)/pop.n);
    const event=gated>.4&&selected.offset<4&&time-this.lastBeat>.4*.02*selected.interval;
    if(event){this.lastBeat=time;this.locked=true;}
    return {bpm:this.locked?3000/selected.interval:0,phase:this.locked?selected.offset/selected.interval:0,confidence,event,probability:activation,beatTime:this.lastBeat};
  }
}
