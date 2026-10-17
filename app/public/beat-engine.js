import * as ort from './vendor/ort/ort.wasm.min.mjs';
import {BeatFeatures,BeatResampler} from './beat-features.js';
import {BeatParticles} from './beat-particles.js';
import {MusicActivity} from './beat-activity.js';

export class NeuralBeatEngine {
  static async create(read){ort.env.wasm.numThreads=1;ort.env.wasm.proxy=false;ort.env.logLevel='error';
    ort.env.wasm.wasmPaths=new URL('./vendor/ort/',import.meta.url).href;
    const [window,filters,...models]=await Promise.all([read('window.f64'),read('filterbank.f32'),...[1,2,3].map(i=>read(`beatnet-${i}.onnx`))]);
    const engine=new NeuralBeatEngine(new Float64Array(window),new Float32Array(filters));engine.models=[];
    for(const bytes of models){const session=await ort.InferenceSession.create(bytes,{executionProviders:['wasm'],graphOptimizationLevel:'all',enableCpuMemArena:true});engine.models.push({session,h:new Float32Array(300),c:new Float32Array(300)});}
    engine.reset(22050,0);return engine;
  }
  constructor(window,filters){this.features=new BeatFeatures(window,filters);this.tracker=new BeatParticles();this.activity=new MusicActivity();this.frames=0;this.gain=1;this.sensitivity=1;}
  reset(rate,origin){this.features.reset();this.resampler=new BeatResampler(rate);this.tracker.reset();this.activity.reset();this.origin=origin;this.rate=rate;this.quiet=0;this.avgRms=.03;this.avgNovelty=.002;this.frames=0;for(const m of this.models||[]){m.h.fill(0);m.c.fill(0);}}
  async infer(features){const result=new Float32Array(3);
    for(const m of this.models){const output=await m.session.run({features:new ort.Tensor('float32',features,[1,1,272]),hidden:new ort.Tensor('float32',m.h,[2,1,150]),cell:new ort.Tensor('float32',m.c,[2,1,150])});
      const p=output.probabilities.data;if(p.length!==3||p.some(x=>!Number.isFinite(x)))throw Error('Invalid neural tracker output');for(let i=0;i<3;i++)result[i]+=p[i]/this.models.length;m.h=output.hidden_out.data;m.c=output.cell_out.data;
    }return result;
  }
  async push(samples,emit){let sum=0,peak=0;for(const x of samples){sum+=x*x;peak=Math.max(peak,Math.abs(x));}const rms=Math.sqrt(sum/Math.max(1,samples.length));
    const duration=samples.length/this.rate,alpha=1-Math.exp(-duration/.5);this.avgRms+=(rms-this.avgRms)*alpha;
    const gain=Math.min(64,Math.max(.25,.08/Math.max(.0001,this.avgRms)))*this.gain;
    const normalized=Float32Array.from(samples,x=>Math.max(-1,Math.min(1,Number.isFinite(x)?x*gain:0))),frames=[];
    this.features.push(this.resampler.push(normalized),(features,time)=>frames.push({features,time}));
    for(const {features,time}of frames){let p=await this.infer(features);if(rms<.0001)p=new Float32Array([0,0,1]);
      else if(this.sensitivity!==1){const boost=Math.sqrt(this.sensitivity),total=(p[0]+p[1])*boost+p[2];p=new Float32Array([p[0]*boost/total,p[1]*boost/total,p[2]/total]);}
      const state=this.tracker.step(p,time),at=this.origin+time;
      let novelty=0;for(let i=0;i<80;i++)novelty+=features[136+i]/80;
      const strength=Math.min(1,novelty/Math.max(.002,this.avgNovelty*2))*Math.min(1,state.probability*1.5);this.avgNovelty=this.avgNovelty*.97+novelty*.03;
      const music=this.activity.step(state,at,rms);
      this.frames++;emit({...state,at,beatTime:Number.isFinite(state.beatTime)?this.origin+state.beatTime:null,rms,peak,strength,music,frames:this.frames});
    }
    // Clear neural/tracker history after a true song gap, while keeping the
    // transport's sample timeline continuous. Browser/show timers are separate.
    this.quiet=rms<.0001?this.quiet+duration:0;
    if(this.quiet>1.5){this.tracker.reset();for(const m of this.models){m.h.fill(0);m.c.fill(0);}this.activity.reset();}
  }
}
