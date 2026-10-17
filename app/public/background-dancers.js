const TAU=Math.PI*2;
export const dancerRoutines=[
  {id:'minibones',name:'Pocket Crypt Crew'},
  {id:'cats',name:'Hex Cats'},
  {id:'parts',name:'Some Assembly Required'},
];

// Small fixed casts, with an open centre for Dr. Boner and his accessories.
export function dancerSprites(id,beat){
  if(!dancerRoutines.some(r=>r.id===id))throw Error('Unknown background dance crew');
  const b=Number.isFinite(beat)?Math.max(0,Math.min(16,beat)):0;
  const positions=id==='parts'?[125,205,285,675,755,835]:[145,265,695,815];
  return positions.map((x,i)=>{
    const phase=b/2+i/2,w=Math.sin(phase*TAU),variant=i%3;
    return {kind:id,variant,phase,x:x+w*(id==='parts'?7:9),y:id==='parts'?[245,293,344][variant]+w*9:344-Math.abs(w)*5,rotation:w*(id==='parts'?.18:.05),scale:id==='parts'?1.25:1.15,wing:w};
  });
}
function bone(c,x,y,xx,yy,width=4,color='#ddd5b9'){
  c.beginPath();c.moveTo(x,y);c.lineTo(xx,yy);c.strokeStyle='#151321';c.lineWidth=width+3;c.stroke();c.strokeStyle=color;c.lineWidth=width;c.stroke();
}
function skull(c){
  c.fillStyle='#181423';c.beginPath();c.moveTo(-15,-9);c.lineTo(-10,-16);c.lineTo(10,-16);c.lineTo(15,-9);c.lineTo(14,7);c.lineTo(8,10);c.lineTo(8,17);c.lineTo(-8,17);c.lineTo(-8,10);c.lineTo(-14,7);c.closePath();c.fill();
  c.fillStyle='#ece0bf';c.fillRect(-11,-10,22,17);c.fillRect(-7,6,14,9);c.fillStyle='#181423';c.fillRect(-9,-5,6,7);c.fillRect(3,-5,6,7);c.fillRect(-2,3,4,4);c.fillRect(-7,10,14,2);for(const x of [-5,0,5])c.fillRect(x,10,1,5);
}
function shadow(c,y=39){c.save();c.globalAlpha*=.4;c.fillStyle='#01040b';c.beginPath();c.ellipse(0,y,24,4,0,0,TAU);c.fill();c.restore();}
function miniSkeleton(c,s){
  const w=s.wing,q=Math.cos(s.phase*TAU);shadow(c);c.save();c.rotate(w*.12);
  // Hierarchical hips/knees and shoulders/elbows give each tiny dancer a rig.
  for(const side of [-1,1]){
    const kick=Math.max(0,side*w);c.save();c.translate(side*7,0);c.rotate(side*.2+w*.45);bone(c,0,0,0,18,5);c.translate(0,18);c.rotate(-side*kick*.9);bone(c,0,1,0,18,4);bone(c,-4,18,8,18,5);c.restore();
    c.save();c.translate(side*17,-32);c.rotate(-side*.4+w*.8);bone(c,0,0,0,17,4);c.translate(0,17);c.rotate(side*(.7+q*.6));bone(c,0,0,0,16,3);c.fillStyle='#e8dcba';c.fillRect(-4,14,8,6);c.restore();
  }
  bone(c,0,0,0,-38,4);for(let i=0;i<4;i++){c.fillStyle='#baa98c';c.fillRect(-3,-30+i*7,6,3);}
  c.strokeStyle='#e6d8b6';c.lineWidth=3;for(let i=0;i<3;i++){const y=-32+i*7;c.beginPath();c.moveTo(-1,y);c.bezierCurveTo(-20,y-8,-20,y+9,-1,y+6);c.moveTo(1,y);c.bezierCurveTo(20,y-8,20,y+9,1,y+6);c.stroke();}
  c.strokeStyle='#e6d8b6';c.lineWidth=4;c.beginPath();c.moveTo(-12,-3);c.lineTo(-8,7);c.lineTo(0,3);c.lineTo(8,7);c.lineTo(12,-3);c.closePath();c.stroke();
  c.save();c.translate(0,-52);c.rotate(-w*.2);skull(c);
  if(s.variant===1){c.fillStyle='#8d65b9';c.beginPath();c.moveTo(-16,-14);c.lineTo(-2,-38);c.lineTo(13,-14);c.closePath();c.fill();c.fillRect(-20,-15,40,4);}else{c.fillStyle='#30223e';c.fillRect(-10,-29,20,15);c.fillRect(-17,-17,34,4);c.fillStyle=s.variant===0?'#c788ab':'#df9a53';c.fillRect(-9,-21,18,3);}
  c.restore();c.restore();
}
function cat(c,s){
  const w=s.wing,q=Math.cos(s.phase*TAU),fur=s.variant===1?'#51465f':'#30283f',edge='#82708f';shadow(c);
  // Tail keeps its own delayed beat, while paws alternate on the main pulse.
  c.strokeStyle='#11121d';c.lineWidth=10;c.beginPath();c.moveTo(11,-3);c.bezierCurveTo(46,8,45,-20+w*10,32,-32+q*7);c.stroke();c.strokeStyle=fur;c.lineWidth=6;c.stroke();
  for(const side of [-1,1]){const kick=Math.max(0,w*side)*10;bone(c,side*7,0,side*(14+kick),17-kick,7,fur);bone(c,side*(14+kick),17-kick,side*(17+kick),33-kick,6,fur);c.fillStyle='#11121d';c.beginPath();c.ellipse(side*(17+kick),34-kick,9,5,0,0,TAU);c.fill();}
  c.save();c.rotate(w*.14);c.fillStyle=fur;c.strokeStyle=edge;c.lineWidth=2;c.beginPath();c.ellipse(0,-18,15,25,0,0,TAU);c.fill();c.stroke();c.fillStyle='#6c5876';c.beginPath();c.ellipse(0,-13,8,14,0,0,TAU);c.fill();
  for(const side of [-1,1]){const elbow=side*(24+side*w*4),pawY=-26-side*w*19;bone(c,side*12,-30,elbow,-18-side*w*6,6,fur);bone(c,elbow,-18-side*w*6,side*29,pawY,5,fur);c.fillStyle=fur;c.strokeStyle=edge;c.lineWidth=2;c.beginPath();c.arc(side*29,pawY,6,0,TAU);c.fill();c.stroke();}
  c.save();c.translate(0,-49);c.rotate(-w*.18);c.fillStyle=fur;c.strokeStyle=edge;c.lineWidth=2;
  c.beginPath();c.moveTo(-18,-3);c.lineTo(-18,-24);c.lineTo(-6,-15);c.lineTo(6,-15);c.lineTo(18,-24);c.lineTo(18,-3);c.quadraticCurveTo(16,13,0,14);c.quadraticCurveTo(-16,13,-18,-3);c.fill();c.stroke();
  c.fillStyle='#bc86a4';for(const side of [-1,1]){c.beginPath();c.moveTo(side*14,-19);c.lineTo(side*9,-13);c.lineTo(side*15,-9);c.fill();}
  c.fillStyle=s.variant===1?'#d1e69a':'#e9bd76';for(const side of [-1,1]){c.beginPath();c.ellipse(side*8,-3,6,4,side*.12,0,TAU);c.fill();c.fillStyle='#11121d';c.fillRect(side*8-1,-7,2,8);c.fillStyle=s.variant===1?'#d1e69a':'#e9bd76';}
  c.fillStyle='#dd9eae';c.beginPath();c.moveTo(-3,4);c.lineTo(3,4);c.lineTo(0,7);c.closePath();c.fill();c.strokeStyle='#af9dab';c.lineWidth=1;for(const side of [-1,1])for(const y of [4,8]){c.beginPath();c.moveTo(side*7,y);c.lineTo(side*24,y-2);c.stroke();}
  c.restore();c.strokeStyle='#c48cbd';c.lineWidth=4;c.beginPath();c.moveTo(-11,-33);c.lineTo(11,-33);c.stroke();c.fillStyle='#e9bf77';c.fillRect(-3,-33,6,6);c.restore();
}
function parts(c,s){
  const w=s.wing;
  if(s.variant===0){c.save();c.rotate(w*.2);skull(c);c.strokeStyle='#ab88c8';c.lineWidth=3;for(const side of [-1,1]){c.beginPath();c.moveTo(side*18,8);c.lineTo(side*23,3);c.moveTo(side*22,14);c.lineTo(side*28,9);c.stroke();}c.restore();}
  else if(s.variant===1){
    c.save();c.rotate(w*.3);c.fillStyle='#e3d6b7';c.strokeStyle='#181423';c.lineWidth=3;c.beginPath();c.moveTo(-10,12);c.lineTo(-12,-3);c.lineTo(-19,-12);c.quadraticCurveTo(-17,-18,-12,-12);c.lineTo(-8,-7);c.lineTo(-9,-27);c.quadraticCurveTo(-6,-32,-3,-27);c.lineTo(-2,-10);c.lineTo(-1,-32);c.quadraticCurveTo(2,-37,5,-31);c.lineTo(5,-10);c.lineTo(8,-26);c.quadraticCurveTo(12,-30,14,-24);c.lineTo(12,-7);c.lineTo(16,-18);c.quadraticCurveTo(21,-19,20,-13);c.lineTo(17,7);c.lineTo(9,14);c.closePath();c.fill();c.stroke();
    c.strokeStyle='#a39383';c.lineWidth=2;for(const x of [-5,3,11]){c.beginPath();c.moveTo(x,-7);c.lineTo(x,5);c.stroke();}bone(c,-1,15,-1,27,6);c.fillStyle='#ae87bb';c.fillRect(-8,15,15,6);c.restore();
  }else{
    shadow(c,24);c.save();c.rotate(w*.35);bone(c,-3,-23,-3,3,9);c.fillStyle='#171422';c.strokeStyle='#b2a0ba';c.lineWidth=2;c.beginPath();c.moveTo(-12,-3);c.lineTo(5,-3);c.quadraticCurveTo(7,4,21,7);c.quadraticCurveTo(29,11,23,18);c.lineTo(-12,18);c.closePath();c.fill();c.stroke();c.fillStyle='#b99cc7';c.fillRect(-10,15,33,4);c.fillStyle='#e2c099';for(const x of [3,10,17])c.fillRect(x,7,3,3);c.restore();
  }
}
export function drawBackgroundDancer(c,s){
  c.lineCap='round';c.lineJoin='round';
  if(s.kind==='minibones')miniSkeleton(c,s);else if(s.kind==='cats')cat(c,s);else if(s.kind==='parts')parts(c,s);else throw Error('Unknown background dancer');
}
