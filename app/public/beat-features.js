// BeatNet's trained frontend: 22,050 Hz, 1,411-sample centered Hann windows,
// 441-sample hops, 136 log-frequency bands plus positive spectral differences.
// Coefficients/reference: coral/beatnet-rs; BeatNet CC BY 4.0, madmom BSD.
export const RATE=22050,HOP=441,WINDOW=1411,BANDS=136;
const f32=Math.fround;

class RadixFFT {
  constructor(n){this.n=n;this.cos=Float64Array.from({length:n/2},(_,i)=>Math.cos(2*Math.PI*i/n));this.sin=Float64Array.from({length:n/2},(_,i)=>Math.sin(2*Math.PI*i/n));}
  run(re,im,inverse=false){const n=this.n;if(inverse)for(let i=0;i<n;i++)im[i]=-im[i];
    for(let i=1,j=0;i<n;i++){let b=n>>1;for(;j&b;b>>=1)j^=b;j^=b;if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]];}}
    for(let size=2;size<=n;size*=2){const half=size/2,step=n/size;for(let start=0;start<n;start+=size)for(let j=0;j<half;j++){
      const a=start+j,b=a+half,k=j*step,r=re[b]*this.cos[k]+im[b]*this.sin[k],v=im[b]*this.cos[k]-re[b]*this.sin[k];
      re[b]=re[a]-r;im[b]=im[a]-v;re[a]+=r;im[a]+=v;
    }}
    if(inverse)for(let i=0;i<n;i++){re[i]/=n;im[i]/=-n;}
  }
}

// Bluestein convolution preserves the training model's odd FFT length rather
// than substituting a convenient power-of-two window with different features.
class OddFFT {
  constructor(n){this.n=n;let m=1;while(m<2*n-1)m*=2;this.m=m;this.fft=new RadixFFT(m);
    this.cos=Float64Array.from({length:n},(_,i)=>Math.cos(Math.PI*(i*i%(2*n))/n));this.sin=Float64Array.from({length:n},(_,i)=>Math.sin(Math.PI*(i*i%(2*n))/n));
    this.br=new Float64Array(m);this.bi=new Float64Array(m);this.re=new Float64Array(m);this.im=new Float64Array(m);
    for(let i=0;i<n;i++){this.br[i]=this.cos[i];this.bi[i]=this.sin[i];if(i){this.br[m-i]=this.cos[i];this.bi[m-i]=this.sin[i];}}
    this.fft.run(this.br,this.bi);
  }
  magnitudes(input,out){const {n,m,re,im}=this;re.fill(0);im.fill(0);for(let i=0;i<n;i++){re[i]=input[i]*this.cos[i];im[i]=-input[i]*this.sin[i];}
    this.fft.run(re,im);for(let i=0;i<m;i++){const r=re[i]*this.br[i]-im[i]*this.bi[i];im[i]=re[i]*this.bi[i]+im[i]*this.br[i];re[i]=r;}this.fft.run(re,im,true);
    for(let i=0;i<out.length;i++){const r=f32(re[i]*this.cos[i]+im[i]*this.sin[i]),v=f32(im[i]*this.cos[i]-re[i]*this.sin[i]);out[i]=f32(Math.hypot(r,v));}
  }
}

export class BeatFeatures {
  constructor(window,filterbank){if(window.length!==WINDOW||filterbank.length!==705*BANDS)throw Error('Invalid beat frontend coefficients');
    this.window=window;this.filters=[];
    for(let band=0;band<BANDS;band++){const bins=[],weights=[];for(let bin=0;bin<705;bin++)if(filterbank[bin*BANDS+band]){bins.push(bin);weights.push(filterbank[bin*BANDS+band]);}this.filters.push({bins,weights});}
    this.fft=new OddFFT(WINDOW);this.ring=new Float32Array(WINDOW);this.input=new Float64Array(WINDOW);this.mag=new Float32Array(705);this.previous=new Float32Array(BANDS);this.reset();
  }
  reset(){this.ring.fill(0);this.previous.fill(0);this.write=705;this.received=0;this.nextEnd=706;this.frame=0;}
  push(samples,emit){for(const sample of samples){this.ring[this.write]=Number.isFinite(sample)?sample:0;this.write=(this.write+1)%WINDOW;this.received++;
    if(this.received<this.nextEnd)continue;
    for(let i=0;i<WINDOW;i++)this.input[i]=this.ring[(this.write+i)%WINDOW]*this.window[i];this.fft.magnitudes(this.input,this.mag);
    const out=new Float32Array(2*BANDS);
    for(let band=0;band<BANDS;band++){const {bins,weights}=this.filters[band];let sum=0;for(let i=0;i<bins.length;i++)sum=f32(sum+f32(this.mag[bins[i]]*weights[i]));const value=f32(Math.log10(1+sum));out[band]=value;out[BANDS+band]=this.frame?Math.max(0,value-this.previous[band]):0;this.previous[band]=value;}
    emit(out,this.frame*HOP/RATE);this.frame++;this.nextEnd+=HOP;
  }}
}

export class BeatResampler {
  constructor(rate){if(!Number.isFinite(rate)||rate<8000||rate>192000)throw Error('Unsupported audio sample rate');this.rate=rate;this.ratio=rate/RATE;this.half=24;this.phases=[];
    const cutoff=.47*Math.min(1,RATE/rate);
    for(let phase=0;phase<512;phase++){const weights=new Float64Array(48);let total=0;for(let j=0;j<48;j++){const d=j-23-phase/512,z=2*Math.PI*cutoff*d,w=(Math.abs(d)<24?.5+.5*Math.cos(Math.PI*d/24):0)*(Math.abs(z)<1e-10?2*cutoff:Math.sin(z)/(Math.PI*d));weights[j]=w;total+=w;}for(let j=0;j<48;j++)weights[j]/=total;this.phases.push(weights);}this.reset();
  }
  reset(){this.buffer=new Float32Array(24);this.offset=-24;this.next=0;}
  push(samples){if(this.rate===RATE)return samples;const joined=new Float32Array(this.buffer.length+samples.length);joined.set(this.buffer);joined.set(samples,this.buffer.length);this.buffer=joined;
    const out=new Float32Array(Math.ceil(samples.length/this.ratio)+4);let length=0;
    while(this.next+24<this.offset+joined.length){const center=Math.floor(this.next),weights=this.phases[Math.min(511,Math.floor((this.next-center)*512))];let sum=0;const start=center-23-this.offset;for(let j=0;j<48;j++)sum+=(joined[start+j]||0)*weights[j];out[length++]=sum;this.next+=this.ratio;}
    const trim=Math.max(0,Math.floor(this.next)-24-this.offset);this.buffer=joined.slice(trim);this.offset+=trim;return out.subarray(0,length);
  }
}
