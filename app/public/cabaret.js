const TAU=Math.PI*2;
export const cabaretRoutines=[
  {id:'chair',name:'Coffin Club Chair Tease'},
  {id:'bodyroll',name:'Rated Rigor Mortis'},
  {id:'dropdead',name:'Drop It Like It’s Dead'},
  {id:'suspenders',name:'Suspender Offender'},
];

// Degrees, like the other hand-authored cameos. The common rig clamps them.
export function cabaretPose(id,beat){
  const p=beat*TAU,v=Math.sin(p/2),q=Math.cos(p/2),slow=Math.sin(p/4);
  switch(id){
    case 'chair':return {x:v*9,y:16+q*5,body:-12+slow*17,head:15-slow*19,armL:65+v*18,foreL:-100,armR:-65+v*18,foreR:100,legL:58+v*15,shinL:-78-q*15,legR:-58+v*15,shinR:78-q*15};
    case 'bodyroll':return {x:slow*22,y:8+Math.sin(p/2+.7)*9,body:Math.sin(p/2)*25,head:-Math.sin(p/2-.8)*23,armL:-92+q*12,foreL:-100,armR:92+q*12,foreR:100,legL:27+Math.sin(p/2+1.4)*12,shinL:20+q*17,legR:-27+Math.sin(p/2+1.4)*12,shinR:20-q*17};
    case 'dropdead':{const drop=(1-Math.cos(p/4))/2;return {x:slow*12,y:drop*31,body:drop*29,head:-drop*27,armL:24+drop*22,foreL:-30-drop*65,armR:-24-drop*22,foreR:30+drop*65,legL:12+drop*55,shinL:-drop*90,legR:-12-drop*55,shinR:drop*90};}
    case 'suspenders':return {x:slow*20,y:2-Math.abs(v)*6,body:v*14,head:-v*18,armL:38+q*19,foreL:-104+v*5,armR:-38+q*19,foreR:104+v*5,legL:13+q*22,shinL:18+v*17,legR:-13+q*22,shinR:18-v*17};
    default:throw Error('Unknown cabaret routine');
  }
}

export function drawCabaretProp(c,cameo){
  if(cameo.active?.id!=='chair'||cameo.weight<=0)return;
  c.save();c.globalAlpha*=cameo.weight;c.translate(480,316);c.lineJoin='round';
  c.strokeStyle='#11101c';c.lineWidth=10;
  c.beginPath();c.moveTo(-42,75);c.lineTo(-34,-66);c.lineTo(34,-66);c.lineTo(42,75);c.stroke();
  c.strokeStyle='#886348';c.lineWidth=5;c.stroke();
  c.fillStyle='#201526';c.fillRect(-39,-72,78,51);c.fillStyle='#6e294b';c.fillRect(-33,-66,66,39);
  c.fillStyle='#c77993';c.beginPath();c.moveTo(0,-37);c.bezierCurveTo(-29,-52,-9,-65,0,-54);c.bezierCurveTo(9,-65,29,-52,0,-37);c.fill();
  c.fillStyle='#160f1c';c.fillRect(-49,-7,98,17);c.fillStyle='#9a4266';c.fillRect(-44,-8,88,10);c.fillStyle='#ce8596';c.fillRect(-40,-8,80,3);
  c.restore();
}

// Temporary stagewear follows the torso transform, never changes the scene.
export function drawCabaretStagewear(c,cameo){
  const id=cameo.active?.id;if(!cabaretRoutines.some(r=>r.id===id)||cameo.weight<=0)return;
  c.save();c.globalAlpha*=cameo.weight;
  if(id==='suspenders'){
    const tug=5+Math.sin(cameo.phase*Math.PI)*4;c.strokeStyle='#332039';c.lineWidth=7;
    for(const side of [-1,1]){c.beginPath();c.moveTo(side*23,-75);c.quadraticCurveTo(side*(23+tug),-36,side*16,-6);c.stroke();c.strokeStyle='#e285a7';c.lineWidth=3;c.stroke();c.strokeStyle='#332039';c.lineWidth=7;}
  }
  c.fillStyle='#ee93bd';c.strokeStyle='#24182f';c.lineWidth=2;
  for(const side of [-1,1]){c.beginPath();c.moveTo(0,-70);c.lineTo(side*13,-77);c.lineTo(side*13,-62);c.closePath();c.fill();c.stroke();}
  c.fillStyle='#ffe0bd';c.fillRect(-3,-72,6,5);c.restore();
}
