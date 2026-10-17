const TAU=Math.PI*2;
export const guestRoutines=[
  {id:'poleghosts',name:'Poletergeist Revue'},
  {id:'devils',name:'Hell’s Belles'},
  {id:'mummies',name:'Mummy After Hours'},
  {id:'heels',name:'Pumpkin Spice After Dark'},
];
export function guestSprites(id,beat){
  if(!guestRoutines.some(r=>r.id===id))throw Error('Unknown party guest act');
  const b=Number.isFinite(beat)?Math.max(0,Math.min(16,beat)):0,p=b*TAU;
  const positions=id==='mummies'?[155,255,705,805]:id==='heels'?[155,255,705,805]:[190,770];
  return positions.map((x,i)=>{const phase=p/2+i*Math.PI;
    return {kind:id,x:x+Math.sin(phase)*8,y:337-Math.abs(Math.sin(phase))*5,rotation:Math.sin(phase/2)*.08,scale:id==='heels'?1.1:1.2,wing:Math.sin(phase),phase:phase/TAU};
  });
}
const line=(c,x,y,xx,yy,w,color)=>{c.strokeStyle='#171326';c.lineWidth=w+4;c.beginPath();c.moveTo(x,y);c.lineTo(xx,yy);c.stroke();c.strokeStyle=color;c.lineWidth=w;c.stroke();};
function bow(c,y,color){c.fillStyle=color;for(const side of [-1,1]){c.beginPath();c.moveTo(0,y);c.lineTo(side*9,y-5);c.lineTo(side*9,y+5);c.closePath();c.fill();}c.fillStyle='#ffe0bd';c.fillRect(-2,y-2,4,4);}
function face(c,color,horns=false){
  c.fillStyle='#171326';c.beginPath();c.ellipse(0,-52,16,17,0,0,TAU);c.fill();c.fillStyle=color;c.beginPath();c.ellipse(0,-53,13,14,0,0,TAU);c.fill();
  c.fillStyle='#23172f';c.fillRect(-9,-56,5,5);c.fillRect(4,-56,5,5);c.fillRect(-4,-46,9,3);c.fillStyle='#fbd5ac';c.fillRect(-7,-56,2,2);c.fillRect(6,-56,2,2);
  if(horns){c.fillStyle='#efbe83';for(const side of [-1,1]){c.beginPath();c.moveTo(side*7,-64);c.quadraticCurveTo(side*23,-83,side*17,-60);c.closePath();c.fill();}}
}
function legs(c,s,color,heels=false){
  for(const side of [-1,1]){const kick=Math.max(0,side*s.wing)*13,knee=side*(14+kick),foot=side*(18+kick*1.6);
    line(c,side*7,2,knee,18,7,color);line(c,knee,18,foot,38-kick,6,heels?'#393044':color);
    c.fillStyle='#171326';c.fillRect(foot-6,34-kick,15,6);if(heels){c.fillStyle='#e18ab3';c.fillRect(foot-6,34-kick,15,4);c.fillRect(foot-5,38-kick,3,6);}
  }
}
export function drawPartyGuest(c,s){
  const beat=s.phase,roll=Math.sin(beat*TAU),color=s.kind==='devils'?'#d76675':'#d8cfae';
  if(s.kind==='poleghosts'){
    c.save();c.translate(-s.wing*8,0);line(c,0,-102,0,48,4,'#9985b3');c.fillStyle='#d7c8e8';c.fillRect(-5,-103,10,4);c.restore();
    c.save();c.translate(s.wing*13,-Math.abs(s.wing)*9);c.rotate(s.wing*.22);
    c.fillStyle='#171326';c.beginPath();c.ellipse(0,-28,24,39,0,0,TAU);c.fill();c.fillStyle='#d5d3c4';c.beginPath();c.moveTo(-21,7);c.quadraticCurveTo(-25,-72,0,-69);c.quadraticCurveTo(25,-72,21,7);c.lineTo(11,0);c.lineTo(0,12);c.lineTo(-11,0);c.closePath();c.fill();
    c.fillStyle='#2b203b';c.fillRect(-11,-50,6,8);c.fillRect(5,-50,6,8);c.fillRect(-4,-36,8,4);
    line(c,-15,-30,-31,-58+s.wing*12,6,'#d5d3c4');line(c,15,-30,22,-77-s.wing*8,6,'#d5d3c4');
    c.fillStyle='#8e4a85';c.fillRect(-19,-16,38,9);bow(c,-29,'#ef9bc1');c.restore();return;
  }
  if(s.kind==='heels'){
    legs(c,s,'#68577d',true);c.save();c.rotate(roll*.1);c.fillStyle='#342136';c.beginPath();c.ellipse(0,-16,26,23,0,0,TAU);c.fill();c.fillStyle='#e08a39';c.beginPath();c.ellipse(0,-18,23,20,0,0,TAU);c.fill();c.fillStyle='#f3b25c';c.fillRect(-10,-34,5,30);c.fillRect(5,-35,5,32);
    c.fillStyle='#9eaf78';c.fillRect(-3,-46,6,12);c.fillStyle='#30203b';c.fillRect(-14,-24,8,7);c.fillRect(6,-24,8,7);c.fillRect(-10,-10,20,5);bow(c,3,'#ec8ebc');c.restore();
    for(const side of [-1,1]){line(c,side*21,-18,side*(31+roll*5),-30,4,'#d08a50');}return;
  }
  legs(c,s,color,true);
  c.save();c.rotate(roll*.14);
  c.fillStyle='#171326';c.fillRect(-15,-39,30,45);c.fillStyle=color;c.fillRect(-12,-38,24,42);
  if(s.kind==='devils'){
    c.fillStyle='#522448';c.beginPath();c.moveTo(-15,-35);c.lineTo(15,-35);c.lineTo(10,-17);c.lineTo(17,3);c.lineTo(-17,3);c.lineTo(-10,-17);c.closePath();c.fill();
    c.strokeStyle='#f7bc99';c.lineWidth=2;for(let y=-29;y<-5;y+=7){c.beginPath();c.moveTo(-4,y);c.lineTo(4,y+5);c.moveTo(4,y);c.lineTo(-4,y+5);c.stroke();}
    c.strokeStyle='#d76675';c.lineWidth=4;c.beginPath();c.moveTo(13,0);c.bezierCurveTo(42,5,35,-19,43,-24+roll*7);c.stroke();c.fillStyle='#d76675';c.beginPath();c.moveTo(38,-22+roll*7);c.lineTo(47,-33+roll*7);c.lineTo(49,-18+roll*7);c.closePath();c.fill();
  }else{
    c.strokeStyle='#9c927f';c.lineWidth=2;for(let y=-35;y<3;y+=7){c.beginPath();c.moveTo(-12,y);c.lineTo(12,y+5);c.stroke();}c.fillStyle='#43304b';c.fillRect(-14,-2,28,8);
    c.strokeStyle='#e1d7b7';c.lineWidth=4;c.beginPath();c.moveTo(12,-25);c.bezierCurveTo(37,-20+roll*8,31,3,46,-3-roll*12);c.stroke();
  }
  for(const side of [-1,1]){const elbow=side*(24+roll*4),hand=side*(33-roll*5);line(c,side*13,-33,elbow,-18,6,color);line(c,elbow,-18,hand,-39+side*roll*12,5,color);}
  face(c,color,s.kind==='devils');
  if(s.kind==='mummies'){c.strokeStyle='#9c927f';c.lineWidth=2;for(const y of [-61,-47]){c.beginPath();c.moveTo(-11,y);c.lineTo(11,y+4);c.stroke();}c.fillStyle='#33223f';c.fillRect(-11,-81,22,16);c.fillRect(-17,-67,34,5);c.fillStyle='#d28cba';c.fillRect(-10,-71,20,3);}
  bow(c,-36,'#ed91ba');c.restore();
}
