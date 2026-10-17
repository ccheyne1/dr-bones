export class RoomAudio {
  constructor(clock){this.clock=clock;this.stream=null;this.context=null;this.worker=null;this.capture=null;this.generation=0;this.gain=3;this.rawLevel=0;this.peak=0;this.inputDevice='';this.sourceKind='none';this.status='Demo beat · audio input off';this.trackingBand='Local neural music tracker';this.lastFrame=-Infinity;this.computeMs=0;}
  async devices(){if(!navigator.mediaDevices)return [];return (await navigator.mediaDevices.enumerateDevices()).filter(x=>x.kind==='audioinput');}
  startSystem(){
    if(!navigator.mediaDevices?.getDisplayMedia){this.status='Laptop audio capture unavailable · use the microphone';return Promise.resolve();}
    let capture;try{capture=navigator.mediaDevices.getDisplayMedia({video:{frameRate:1},audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false,suppressLocalAudioPlayback:false},systemAudio:'include',selfBrowserSurface:'exclude'}).then(stream=>({stream}),error=>({error}));}catch{this.status='Click 🔊 directly in the party window to share laptop audio';return Promise.resolve();}
    return this.start(undefined,'system',capture);
  }
  async start(device,kind='mic',selection=null){const generation=++this.generation;await this.stop(false);
    try{
      this.context=new AudioContext();const context=this.context,resuming=context.resume().catch(()=>{});
      const result=selection?await selection:null;if(result?.error)throw result.error;
      const stream=result?result.stream:await navigator.mediaDevices.getUserMedia({audio:{deviceId:device?{exact:device}:undefined,echoCancellation:false,noiseSuppression:false,autoGainControl:false},video:false});
      if(generation!==this.generation){stream.getTracks().forEach(t=>t.stop());return;}
      this.stream=stream;this.sourceKind=kind;
      if(kind==='system'&&!stream.getAudioTracks().length)throw Object.assign(Error('No playback audio shared'),{name:'NoSharedAudio'});
      if(kind==='system')stream.getVideoTracks().forEach(track=>{track.enabled=false;});
      if(!context.audioWorklet||typeof Worker==='undefined')throw Error('This browser needs AudioWorklet support');
      this.status='Loading local music models…';this.trackingBand='Loading BeatNet ensemble';
      const worker=this.worker=new Worker('/beat-worker.js',{type:'module'});this.sentSettings='';
      await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Local music models took too long to load')),20000);
        this.cancelStart=()=>{clearTimeout(timer);reject(Error('Audio start cancelled'));};
        worker.onmessage=({data})=>{if(generation!==this.generation)return;
          if(data.type==='ready'){clearTimeout(timer);this.cancelStart=null;resolve();}
          else if(data.type==='error'){clearTimeout(timer);this.cancelStart=null;this.status=data.message;this.clock.resetEvidence();this.trackingBand='Music tracker unavailable · use manual/demo';reject(Error(data.message));}
          else if(data.type==='gap'){this.clock.resetEvidence();this.trackingBand='Reacquiring after an audio gap';}
          else if(data.type==='tracking'){
            const now=performance.now()/1000,offset=now-context.currentTime;
            if(!Number.isFinite(data.at)||!Number.isFinite(data.rms)||now-(data.at+offset)>.5)return;
            this.rawLevel=data.rms;this.peak=data.peak;this.lastFrame=now;this.computeMs=data.computeMs??this.computeMs;
            this.clock.accept({...data,time:data.at+offset,beatTime:data.beatTime===null?null:data.beatTime+offset});
            this.trackingBand='BeatNet · 3-model ensemble · '+this.clock.trackingStatus;
          }
        };
        worker.onerror=()=>{clearTimeout(timer);this.cancelStart=null;this.status='Music analysis stopped · use manual or demo tempo';this.trackingBand='Music tracker unavailable';this.clock.resetEvidence();reject(Error(this.status));};
        worker.postMessage({type:'init'});
      });
      if(generation!==this.generation)return;
      await context.audioWorklet.addModule('/beat-capture.js');await resuming;if(generation!==this.generation)return;
      const capture=this.capture=new AudioWorkletNode(context,'beat-capture',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[1]});
      const channel=new MessageChannel();capture.port.postMessage({type:'connect',port:channel.port1},[channel.port1]);worker.postMessage({type:'connect',port:channel.port2},[channel.port2]);
      // Only zeros leave the worklet. A zero-gain sink also guarantees silence
      // while keeping Chromium's capture graph running, even on a hidden tab.
      const silent=context.createGain();silent.gain.value=0;capture.connect(silent);silent.connect(context.destination);
      context.createMediaStreamSource(kind==='system'?new MediaStream(stream.getAudioTracks()):stream).connect(capture);
      this.inputDevice=stream.getAudioTracks?.()[0]?.label||'Selected microphone';this.clock.beginAudio();
      this.status=kind==='system'?'Listening to laptop audio locally':'Listening locally';this.trackingBand='BeatNet · finding the pulse';this.update();
      stream.getTracks().forEach(track=>track.addEventListener('ended',()=>{if(generation!==this.generation)return;this.stop();this.status=kind==='system'?'Laptop audio sharing ended · demo beat':'Microphone disconnected · demo beat';}));
    }catch(e){if(selection&&!this.stream)selection.then(x=>x.stream?.getTracks().forEach(track=>track.stop()));if(generation!==this.generation)return;await this.stop();
      this.status=kind==='system'?(e.name==='NoSharedAudio'?'No audio shared · choose a music tab or screen and enable Share audio':e.name==='NotAllowedError'?'Laptop audio sharing cancelled · microphone and demo remain available':e.message+' · use microphone, manual or demo'):e.name==='NotAllowedError'?'Microphone denied · demo beat':e.name==='NotFoundError'?'No microphone · demo beat':e.message+' · manual and demo remain available';
    }
  }
  async activate(){if(this.context){await this.context.resume();this.status=this.sourceKind==='system'?'Listening to laptop audio locally':'Listening locally';}}
  diagnostics(){return {audioSource:this.sourceKind,audioState:this.context?.state||'off',rawMicLevel:this.rawLevel,micPeak:this.peak,inputDevice:this.inputDevice,trackingBand:this.trackingBand,analysisMs:this.computeMs,analysisAge:Number.isFinite(this.lastFrame)?Math.max(0,performance.now()/1000-this.lastFrame):null};}
  update(){if(!this.context||!this.worker)return;
    if(this.context.state==='suspended')this.status=this.sourceKind==='system'?'Laptop audio connected · click 🔊 on the party screen to activate audio':'Microphone connected · click ♪ on the party screen to activate audio';
    const gain=this.sourceKind==='system'?1:this.gain,settings=gain+':'+this.clock.sensitivity+':'+this.clock.confidenceNeeded;
    if(settings!==this.sentSettings){this.worker.postMessage({type:'gain',value:gain});this.worker.postMessage({type:'sensitivity',value:this.clock.sensitivity});this.worker.postMessage({type:'confidenceNeeded',value:this.clock.confidenceNeeded});this.sentSettings=settings;}
  }
  async stop(invalidate=true){if(invalidate)this.generation++;this.cancelStart?.();this.cancelStart=null;
    this.capture?.port.postMessage({type:'stop'});this.capture?.disconnect();this.capture=null;this.worker?.terminate();this.worker=null;
    const stream=this.stream;this.stream=null;stream?.getTracks().forEach(t=>t.stop());const context=this.context;this.context=null;if(context)await context.close().catch(()=>{});
    this.rawLevel=0;this.peak=0;this.inputDevice='';this.sourceKind='none';this.lastFrame=-Infinity;this.clock.resetEvidence();this.clock.mode='demo';this.trackingBand='Local neural music tracker';this.status='Demo beat · audio input off';
  }
}
