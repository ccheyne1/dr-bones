// No analysis on the animation thread. Audio timestamps come from sample
// positions; transfers are short-lived RAM buffers, never recordings/files.
class BeatCapture extends AudioWorkletProcessor {
  constructor(){super();this.running=true;this.sink=null;this.buffer=new Float32Array(2048);this.used=0;this.at=0;this.pending=[];
    this.port.onmessage=({data})=>{if(data.type==='connect'){this.sink=data.port;this.sink.onmessage=({data:ack})=>{if(ack.type==='processed')this.pending=this.pending.filter(end=>end>ack.until+.00001);};this.sink.start();}else if(data.type==='stop'){this.running=false;this.sink?.close();}};
  }
  process(inputs,outputs){
    // The connected output exists solely to keep the audio graph processing.
    // It is always zero, with a second zero-gain safety sink in RoomAudio.
    for(const output of outputs)for(const channel of output)channel.fill(0);
    const channels=inputs[0];if(!this.sink||!channels?.length)return this.running;
    for(let i=0;i<channels[0].length;i++){
      if(!this.used)this.at=(currentFrame+i)/sampleRate;
      let sample=0;for(const channel of channels)sample+=channel[i]||0;this.buffer[this.used++]=sample/channels.length;
      if(this.used===this.buffer.length){if(this.pending.length<4){this.pending.push(this.at+this.buffer.length/sampleRate);this.sink.postMessage({type:'audio',samples:this.buffer,at:this.at,rate:sampleRate},[this.buffer.buffer]);}this.buffer=new Float32Array(2048);this.used=0;}
    }return this.running;
  }
}
registerProcessor('beat-capture',BeatCapture);
