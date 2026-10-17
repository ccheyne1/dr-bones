const TAU=Math.PI*2;
const clamp=(x,lo,hi,fallback)=>Number.isFinite(x)?Math.max(lo,Math.min(hi,x)):fallback;

// Use the full music clock, including its display offset and silence fade.
// A pronounced, rounded beat accent in the beams and floor pools. Keep the
// shared beat clock/TV offset, slow sweeps, quiet-room fade and steady mode.
export function lightingState(clock,amount=.7,reducedMotion=false){
  const level=clamp(amount,0,1,.7),activity=clamp(clock.activity,0,1,clock.silent?0:1);
  const beat=Number.isFinite(clock.beat)?clock.beat:0,energy=reducedMotion?.5:clamp(clock.energy,0,1.4,.7)/1.4;
  const pulse=reducedMotion?.2:Math.pow((1+Math.cos(beat*TAU))/2,3);
  const sweep=reducedMotion?0:Math.sin(beat*TAU/32)*activity;
  return {level,activity,pulse,sweep,
    beamAlpha:level*(.035+activity*(.035+.015*energy+.32*pulse)),
    poolAlpha:level*(.045+activity*(.03+.015*energy+.4*pulse)),
    haloAlpha:level*(.02+activity*(.015+.045*pulse)),
    pumpkinAlpha:level*activity*(.06+.56*pulse),
  };
}

// Colored shells stay readable between beats; light only lifts their rims,
// carved faces and nearby floor. This shares the beams' exact beat/TV offset.
export function drawForegroundPumpkins(c,clock,accent,amount=.7,reducedMotion=false){
  const light=lightingState(clock,amount,reducedMotion);
  for(const [x,color,palette,litSide]of [[220,'#b18cff',['#29243f','#4e3c78','#8061b2','#c2aaff'],-1],[740,accent,['#48291e','#a54c24','#db7734','#ffd090'],1]]){
    c.save();c.translate(x,393);
    if(light.pumpkinAlpha){
      c.save();c.translate(0,13);c.scale(1,.28);
      const floor=c.createRadialGradient(0,0,3,0,0,88);floor.addColorStop(0,color);floor.addColorStop(1,color+'00');
      c.globalAlpha=light.pumpkinAlpha*.65;c.fillStyle=floor;c.fillRect(-88,-88,176,176);c.restore();
    }
    // Soft cast shadow points away from each overhead spotlight. Gradients
    // keep it inexpensive; no canvas blur/filter or beat-analysis changes.
    c.save();c.translate(-litSide*12,17);c.scale(1,.24);
    const shadow=c.createRadialGradient(0,0,3,0,0,57);shadow.addColorStop(0,'#01030bd9');shadow.addColorStop(.5,'#01030b8c');shadow.addColorStop(1,'#01030b00');
    c.fillStyle=shadow;c.fillRect(-58,-58,116,116);c.restore();
    c.fillStyle='#02040bc4';c.beginPath();c.ellipse(0,15,23,4,0,0,TAU);c.fill();
    c.fillStyle='#070a12';c.fillRect(-29,-22,58,32);c.fillRect(-23,-31,46,48);
    c.fillStyle=palette[1];c.fillRect(-26,-20,52,29);c.fillRect(-20,-28,40,43);
    c.fillStyle=palette[0];c.fillRect(18,-19,8,27);c.fillRect(-18,10,36,5);
    c.fillStyle=palette[2];c.fillRect(-18,-24,7,32);c.fillRect(-4,-27,7,39);c.fillRect(10,-23,5,30);
    // Round the ribbed shell with a shaded underside and far side, clipped
    // to the existing stepped sprite silhouette so its outline stays crisp.
    c.save();c.beginPath();c.moveTo(-20,-28);c.lineTo(20,-28);c.lineTo(20,-20);c.lineTo(26,-20);c.lineTo(26,9);c.lineTo(20,9);c.lineTo(20,15);c.lineTo(-20,15);c.lineTo(-20,9);c.lineTo(-26,9);c.lineTo(-26,-20);c.lineTo(-20,-20);c.closePath();c.clip();
    const shell=c.createLinearGradient(litSide*26,-22,-litSide*26,20);shell.addColorStop(0,'#02040d00');shell.addColorStop(.45,'#02040d0c');shell.addColorStop(1,'#02040db8');
    c.fillStyle=shell;c.fillRect(-26,-28,52,44);c.restore();
    c.fillStyle=palette[3];c.globalAlpha=.3+light.pumpkinAlpha*.6;
    c.fillRect(-18,-24,7,4);c.fillRect(-4,-27,7,4);c.fillRect(litSide<0?-24:21,-18,3,16);c.globalAlpha=1;
    c.fillStyle='#47604b';c.fillRect(-3,-38,7,11);c.fillStyle='#8ba174';c.fillRect(-3,-38,3,9);
    const face=()=>{c.beginPath();c.moveTo(-16,-9);c.lineTo(-9,-19);c.lineTo(-3,-9);c.closePath();c.fill();c.beginPath();c.moveTo(4,-9);c.lineTo(11,-19);c.lineTo(17,-9);c.closePath();c.fill();c.fillRect(-12,1,25,6);};
    c.fillStyle=palette[0];face();c.fillStyle=palette[3];c.globalAlpha=.38+light.pumpkinAlpha;face();
    c.globalAlpha=1;c.fillStyle=palette[1];c.fillRect(-7,0,4,4);c.fillRect(5,4,4,4);
    c.restore();
  }
}

export function drawPartyLights(c,clock,accent,amount=.7,reducedMotion=false){
  const light=lightingState(clock,amount,reducedMotion);if(!light.level)return;
  c.save();
  // Keep the two pools at the sides of the character; the costume stays clear.
  for(const [i,x,color] of [[0,145,'#b18cff'],[1,815,accent]]){
    const direction=i?-1:1,target=x+direction*(115+light.sweep*85);
    const halo=c.createRadialGradient(x,160,5,x,160,250);
    halo.addColorStop(0,color);halo.addColorStop(1,color+'00');
    c.globalAlpha=light.haloAlpha;c.fillStyle=halo;c.fillRect(x-250,0,500,410);
    const beam=c.createLinearGradient(x,28,target,418);
    beam.addColorStop(0,color);beam.addColorStop(.65,color);beam.addColorStop(1,color+'00');
    for(const [width,strength] of [[165,.4],[125,.6],[85,.35]]){
      c.globalAlpha=light.beamAlpha*strength;c.fillStyle=beam;
      c.beginPath();c.moveTo(x-7,30);c.lineTo(x+7,30);c.lineTo(target+width,418);c.lineTo(target-width,418);c.closePath();c.fill();
    }
    c.save();c.translate(target,418);c.scale(1,.22);
    const pool=c.createRadialGradient(0,0,5,0,0,175);pool.addColorStop(0,color);pool.addColorStop(.4,color);pool.addColorStop(1,color+'00');
    c.globalAlpha=light.poolAlpha;c.fillStyle=pool;c.fillRect(-175,-175,350,350);c.restore();
    c.globalAlpha=.7;c.fillStyle='#171725';c.fillRect(x-16,8,32,21);c.fillStyle=color;c.globalAlpha=.28+light.beamAlpha;c.fillRect(x-11,26,22,4);
  }
  c.restore();
}
