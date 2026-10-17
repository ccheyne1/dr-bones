// Music presence is separate from confidence in the exact tempo/phase.
// Once a rhythm starts the party, imperfect beats can keep it going.
export class MusicActivity {
  constructor(){this.confidenceNeeded=.2;this.reset();}
  reset(){this.lastMusic=-Infinity;this.evidence=[];}
  step(state,at,rms){
    if(rms<=.0001)return false;
    if(state.event){
      this.evidence=this.evidence.filter(e=>at-e.at<4);
      this.evidence.push({at,confidence:state.confidence});
      const recent=this.evidence.slice(-3),period=60/state.bpm;
      const regular=recent.length===3&&recent.slice(1).every((e,i)=>{
        const gap=(e.at-recent[i].at)/period,k=Math.round(gap);
        return k>=1&&k<=3&&Math.abs(gap-k)<.22;
      });
      if(at-this.lastMusic<12||regular&&recent.reduce((sum,e)=>sum+e.confidence,0)/3>=this.confidenceNeeded)this.lastMusic=at;
    }
    // Keep the last estimated rhythm through fills and uncertain sections.
    // True silence above, or a stale audio stream in BeatClock, still idles.
    return at-this.lastMusic<12;
  }
}
