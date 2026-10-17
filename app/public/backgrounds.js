import {DanceCameos} from './cameos.js';
import {guestRoutines,guestSprites,drawPartyGuest} from './party-guests.js';
import {dancerRoutines,dancerSprites,drawBackgroundDancer} from './background-dancers.js';
const TAU=Math.PI*2;
export const backgroundRoutines=[
  {id:'ghosts',name:'Ghost Conga'},
  {id:'bats',name:'Bat Ballet'},
  {id:'pumpkins',name:'Pumpkin Parade'},
  {id:'moon',name:'Moon’s Big Wink'},
];
export const adultBackgroundRoutines=[{id:'fans',name:'Ghosts Gone Wild'}];
export const partyBackgroundRoutines=[...backgroundRoutines,...adultBackgroundRoutines,...guestRoutines,...dancerRoutines];
export class BackgroundCameos extends DanceCameos {
  constructor(random=Math.random){super(random,{routines:backgroundRoutines,firstDelay:[25,45],delay:[90,150],poseFor:null});}
}

// Fixed counts and paths, all behind the dancer; nothing is model-generated.
export function backgroundSprites(id,beat){
  const b=Number.isFinite(beat)?Math.max(0,Math.min(16,beat)):0,p=b*TAU,u=b/16;
  switch(id){
    case 'minibones':case 'cats':case 'parts':return dancerSprites(id,b);
    case 'poleghosts':case 'devils':case 'mummies':case 'heels':return guestSprites(id,b);
    case 'ghosts':return Array.from({length:5},(_,i)=>({kind:'ghost',x:-90+u*1350-i*58,y:351+Math.sin(p-i*.7)*6,rotation:Math.sin(p/2-i*.4)*.12,scale:.88+i*.025,wing:0}));
    case 'bats':return Array.from({length:5},(_,i)=>({kind:'bat',x:480+Math.cos(u*TAU+i*.7)*350,y:109+Math.sin(u*TAU+i*.7)*40,rotation:Math.sin(p/4+i)*.18,scale:1+i*.06,wing:Math.sin(p/2+i*.5)*9}));
    case 'pumpkins':return Array.from({length:4},(_,i)=>({kind:'pumpkin',x:1040-u*1350+i*72,y:355-Math.abs(Math.sin(p-i*.7))*9,rotation:Math.sin(p/2-i*.7)*.13,scale:1,wing:Math.sin(p-i*.7)*8}));
    case 'moon':return [{kind:'moon',x:684,y:100+Math.sin(p/8)*4,rotation:Math.sin(p/8)*.16,scale:1,wing:Math.pow((1+Math.cos(p/8))/2,6)}];
    case 'fans':return [190,270,690,770].map((x,i)=>({kind:'fanGhost',x:x+Math.sin(p/2+i)*12,y:340+Math.sin(p+i)*4,rotation:Math.sin(p/2+i)*.13,scale:1.1,wing:Math.sin(p/2+i)*.3}));
    default:throw Error('Unknown background routine');
  }
}

export function drawBackgroundCameo(c,cameo){
  if(!cameo.active||cameo.weight<=0)return;
  const a=Math.max(0,Math.min(1,cameo.weight));
  c.save();c.globalAlpha=.72*a;c.lineCap='round';c.lineJoin='round';
  for(const s of backgroundSprites(cameo.active.id,cameo.phase)){
    c.save();c.translate(s.x,s.y);c.rotate(s.rotation);c.scale(s.scale,s.scale);
    c.strokeStyle='#171326';c.lineWidth=3;
    if(s.kind==='ghost'||s.kind==='fanGhost'){
      c.fillStyle='#d7d5b7';c.beginPath();c.arc(0,-6,17,Math.PI,0);c.lineTo(17,22);c.lineTo(8,16);c.lineTo(0,23);c.lineTo(-8,16);c.lineTo(-17,22);c.closePath();c.fill();c.stroke();
      c.fillStyle='#251d37';c.fillRect(-8,-7,5,7);c.fillRect(4,-7,5,7);c.fillRect(-3,6,6,5);
      c.strokeStyle='#d7d5b7';c.lineWidth=5;c.beginPath();c.moveTo(-15,5);c.lineTo(-24,0);c.moveTo(15,5);c.lineTo(27,0);c.stroke();
      c.fillStyle='#b18cff';c.beginPath();c.moveTo(-10,-22);c.lineTo(0,-42);c.lineTo(11,-22);c.closePath();c.fill();c.fillStyle='#ffb65c';c.fillRect(-7,-28,13,3);
      if(s.kind==='fanGhost'){
        c.save();c.translate(0,12);c.rotate(s.wing);c.strokeStyle='#33213c';c.lineWidth=4;
        for(let i=0;i<7;i++){const angle=-Math.PI+i*Math.PI/6;c.fillStyle=i%2?'#ed84bc':'#a18ac9';c.beginPath();c.ellipse(Math.cos(angle)*19,Math.sin(angle)*19,15,5,angle,0,TAU);c.fill();c.stroke();}c.restore();
      }
    }else if(s.kind==='bat'){
      c.fillStyle='#8c78ab';c.beginPath();c.moveTo(0,5);c.lineTo(-8,-8);c.lineTo(-31,-17-s.wing);c.lineTo(-24,6);c.lineTo(-14,1);c.lineTo(-7,13);c.lineTo(0,9);c.lineTo(7,13);c.lineTo(14,1);c.lineTo(24,6);c.lineTo(31,-17-s.wing);c.lineTo(8,-8);c.closePath();c.fill();c.stroke();
      c.fillStyle='#f0ca86';c.fillRect(-5,-4,3,4);c.fillRect(2,-4,3,4);
    }else if(s.kind==='pumpkin'){
      c.strokeStyle='#a7ad77';c.lineWidth=4;c.beginPath();c.moveTo(-8,14);c.lineTo(-14+s.wing,27);c.moveTo(8,14);c.lineTo(14-s.wing,27);c.stroke();
      c.fillStyle='#d97d35';c.strokeStyle='#392335';c.lineWidth=3;c.beginPath();c.ellipse(0,0,22,18,0,0,TAU);c.fill();c.stroke();c.fillStyle='#edaa53';c.fillRect(-9,-13,5,25);c.fillRect(5,-13,4,25);
      c.fillStyle='#9ea776';c.fillRect(-3,-26,6,10);c.fillStyle='#312039';c.fillRect(-12,-4,7,6);c.fillRect(5,-4,7,6);c.fillRect(-9,8,18,4);
    }else if(dancerRoutines.some(r=>r.id===s.kind)){
      drawBackgroundDancer(c,s);
    }else if(guestRoutines.some(r=>r.id===s.kind)){
      drawPartyGuest(c,s);
    }else{
      c.fillStyle='#b8c495';c.beginPath();c.arc(0,0,34,0,TAU);c.fill();c.stroke();
      c.fillStyle='#242237';c.fillRect(-16,-8,8,7);c.fillRect(7,-6,9,Math.max(2,7*(1-s.wing)));
      c.strokeStyle='#242237';c.lineWidth=3;c.beginPath();c.arc(0,5,13,.15,Math.PI-.15);c.stroke();
      c.fillStyle='#b18cff';c.beginPath();c.moveTo(-22,-26);c.lineTo(-9,-53);c.lineTo(16,-29);c.closePath();c.fill();c.fillStyle='#efad5c';c.fillRect(-16,-33,27,4);
    }
    c.restore();
  }
  c.restore();
}
