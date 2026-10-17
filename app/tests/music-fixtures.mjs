// Original deterministic PCM fixtures, synthesized here; no recorded music or
// microphone data. This goes through resampling, FFT, neural models and decoding.
export function music({bpm=120,seconds=24,rate=22050,vocals=true,missing=false,volume=1}={}){
  const pcm=new Float32Array(Math.ceil(seconds*rate)),period=60/bpm;let seed=11,previousNoise=0;
  for(let i=0;i<pcm.length;i++){const t=i/rate,beat=t/period,n=Math.floor(beat),phase=t-n*period,half=beat*2-Math.floor(beat*2),hat=half*period/2;
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=seed/2147483648-1;
    const kick=missing&&n%7===5?0:Math.sin(2*Math.PI*(52*phase+2.5*(1-Math.exp(-phase*30))))*Math.exp(-phase*24)*.7;
    const snare=n%2?(.8*(noise-previousNoise)+.2*Math.sin(2*Math.PI*180*phase))*Math.exp(-phase*35)*.25:0;
    const hats=(noise-previousNoise)*Math.exp(-hat*90)*.09;
    const note=[130.81,155.56,174.61,116.54][Math.floor(beat/8)%4],bass=Math.sin(2*Math.PI*note*t)*(.06+.07*Math.exp(-phase*9));
    const syllable=(Math.sin(t*2*Math.PI*2.73)+Math.sin(t*2*Math.PI*1.19+.8))*.5;
    const voice=vocals?Math.max(0,syllable)*(.17*Math.sin(2*Math.PI*225*t+Math.sin(t*5)*.5)+.13*Math.sin(2*Math.PI*675*t)+.06*Math.sin(2*Math.PI*1125*t)):0;
    pcm[i]=(kick+snare+hats+bass+voice)*volume;previousNoise=noise;
  }return pcm;
}

export function noise({seconds=12,rate=22050,claps=false}={}){let seed=5;return Float32Array.from({length:seconds*rate},(_,i)=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;const t=i/rate,clap=claps&&t%5<.04;return (seed/2147483648-1)*(clap?.6:.004);});}
