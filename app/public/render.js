import {pose,blendPose,idlePose} from './core.js';
import {drawPartyLights,drawForegroundPumpkins} from './lights.js';
import {ElasticMotion,neutralElastic} from './elastic.js';
import {ElasticBurst} from './bursts.js';
import {DanceCameos,partyRoutines} from './cameos.js';
import {BackgroundCameos,drawBackgroundCameo,partyBackgroundRoutines} from './backgrounds.js';
import {drawCabaretProp,drawCabaretStagewear} from './cabaret.js';
const TAU=Math.PI*2;
export class Stage {
  constructor(canvas,scene){this.canvas=canvas;this.c=canvas.getContext('2d',{alpha:false});this.scene=scene;this.old=scene;this.transition=-10;this.frames=0;this.fps=60;this.last=0;this.motion=new ElasticMotion();this.elastic=neutralElastic();this.elasticity=1;this.backgrounds=new BackgroundCameos();this.backgrounds.setRoutines(partyBackgroundRoutines);this.backgroundsEnabled=true;this.cameos=new DanceCameos(Math.random,{routines:partyRoutines});this.cameosEnabled=true;this.burst=new ElasticBurst();this.burstEnabled=true;this.effectiveElasticity=1;}
  apply(s,beat){this.old=this.scene;this.scene=s;this.transition=beat;this.cameos?.cancel();this.backgrounds?.cancel();}
  danceClock(clock){
    const rate=this.danceRate??.5;
    if(this.lastMusicBeat===undefined)this.danceBeat=clock.beat*rate;
    else this.danceBeat+=Math.max(0,clock.beat-this.lastMusicBeat)*rate;
    this.lastMusicBeat=clock.beat;
    return {...clock,beat:this.danceBeat,bpm:clock.bpm*rate};
  }
  updateShow(t,clock){
    this.choreographyClock=this.danceClock(clock);
    this.effectiveElasticity=this.burst.step(t,clock,this.elasticity,this.burstEnabled,this.reducedMotion,!!this.cameos.active||t<this.cameos.restUntil||!!this.backgrounds.active||t<this.backgrounds.restUntil);
    const cameo=this.cameos.step(t,this.choreographyClock,this.cameosEnabled,this.reducedMotion,this.burst.startedAt!==null||t<this.burst.endsAt+12||!!this.backgrounds.active||t<this.backgrounds.restUntil);
    this.backgrounds.step(t,clock,this.backgroundsEnabled,this.reducedMotion,this.burst.startedAt!==null||t<this.burst.endsAt+12||!!this.cameos.active||t<this.cameos.restUntil);
    return cameo;
  }
  draw(t,clock){const c=this.c,s=this.scene;
    if(this.canvas.width!==960||this.canvas.height!==540){this.canvas.width=960;this.canvas.height=540;}c.imageSmoothingEnabled=false;
    const colors={halloween:['#06090e','#1c2426','#bd8246'],underwater:['#041015','#143034','#77bfb4'],space:['#060812','#1a1d32','#9385b4'],graveyard:['#080e10','#1d2825','#9cac7c'],candy:['#120b16','#302036','#c77993']}[s.theme];
    const g=c.createLinearGradient(0,0,0,540);g.addColorStop(0,colors[0]);g.addColorStop(1,colors[1]);c.fillStyle=g;c.fillRect(0,0,960,540);
    if(s.effects.includes('stars')||s.theme==='space')for(let i=0;i<24;i++){const x=(i*137+37)%960,y=(i*71+30)%310;c.fillStyle=i%3?'#645377':'#bb91bc';c.globalAlpha=0.4+0.2*Math.sin(t/4+i);c.fillRect(x,y,i%5?2:4,2);}c.globalAlpha=1;
    // Tall gothic window and silhouettes give the sprite a theatrical home.
    c.fillStyle='#120f21';c.beginPath();c.moveTo(375,355);c.lineTo(375,160);c.quadraticCurveTo(375,65,480,37);c.quadraticCurveTo(585,65,585,160);c.lineTo(585,355);c.fill();
    c.strokeStyle='#35423e';c.lineWidth=3;c.stroke();c.fillStyle=colors[1];c.fillRect(477,67,6,275);c.fillRect(385,180,190,5);
    const moon=c.createRadialGradient(684,100,10,684,100,100);moon.addColorStop(0,'#bccda51c');moon.addColorStop(1,'#bccda500');c.fillStyle=moon;c.fillRect(584,0,200,200);
    c.fillStyle='#b9c2a1';c.globalAlpha=0.65;c.beginPath();c.arc(684,100,31,0,TAU);c.fill();c.fillStyle=colors[0];c.beginPath();c.arc(698,90,29,0,TAU);c.fill();c.globalAlpha=1;
    for(let i=0;i<3;i++){const x=255+i*225+Math.sin(t*.19+i)*18,y=95+(i%2)*62+Math.sin(t*.7+i)*5,wing=Math.sin(t*2+i)*4;c.save();c.translate(x,y);c.fillStyle='#070a10';c.beginPath();c.moveTo(0,2);c.lineTo(-5,-4);c.lineTo(-21,-10-wing);c.lineTo(-14,4);c.lineTo(-7,1);c.lineTo(0,8);c.lineTo(7,1);c.lineTo(14,4);c.lineTo(21,-10-wing);c.lineTo(5,-4);c.closePath();c.fill();c.restore();}
    if(s.theme==='graveyard'||s.theme==='halloween')for(let i=0;i<6;i++){const x=i<3?70+i*72:730+(i-3)*70;c.fillStyle='#151427';c.fillRect(x,315-i%2*15,38,90);c.beginPath();c.arc(x+19,315-i%2*15,19,Math.PI,0);c.fill();c.fillStyle='#393044';c.fillRect(x+16,325-i%2*15,5,24);c.fillRect(x+9,332-i%2*15,19,4);}
    if(s.theme==='underwater')for(let i=0;i<8;i++){c.strokeStyle=i%2?'#235b60':'#347370';c.lineWidth=5;c.beginPath();const x=i<4?35+i*38:790+(i-4)*38;c.moveTo(x,415);c.bezierCurveTo(x+30,375,x-25,350,x+10*Math.sin(t+i),320);c.stroke();}
    c.fillStyle='#080d12';c.fillRect(0,405,960,135);const pool=c.createRadialGradient(480,393,10,480,393,225);pool.addColorStop(0,'#b6bea215');pool.addColorStop(1,'#b6bea200');c.fillStyle=pool;c.fillRect(240,315,480,170);
    drawPartyLights(c,clock,s.accent,this.lighting,this.reducedMotion);
    c.save();c.translate(480,276);for(const l of s.elements.filter(l=>l.behind))shape(c,l);c.restore();
    if(s.effects.includes('bubbles'))for(let i=0;i<28;i++){c.strokeStyle='#6cd9ff';c.globalAlpha=0.25;c.lineWidth=1;c.beginPath();c.arc((i*151+20)%960,410-((t*17+i*37)%370),3+i%5,0,TAU);c.stroke();}c.globalAlpha=1;
    // Pixel pumpkins and little audience ghosts.
    drawForegroundPumpkins(c,clock,s.accent,this.lighting,this.reducedMotion);
    c.save();c.globalAlpha=0.22;c.fillStyle='#aebba0';for(const [x,y]of [[96,236],[856,208]]){c.save();c.translate(x,y+Math.sin(t*0.8+x)*10);c.beginPath();c.arc(0,0,15,Math.PI,0);c.lineTo(15,28);c.lineTo(7,22);c.lineTo(0,29);c.lineTo(-7,22);c.lineTo(-15,28);c.fill();c.fillStyle='#221b35';c.fillRect(-7,-1,4,7);c.fillRect(4,-1,4,7);c.restore();}c.restore();
    const cameo=this.updateShow(t,clock);
    const dance=this.choreographyClock;
    let p=pose(s,dance.beat,clock.energy);if(clock.beat-this.transition<1.5)p=blendPose(pose(this.old,dance.beat,clock.energy),p,(clock.beat-this.transition)/1.5);
    drawBackgroundCameo(c,this.backgrounds);
    drawCabaretProp(c,this.cameos);
    if(cameo)p=blendPose(p,cameo.pose,cameo.weight);
    p=blendPose(idlePose(t),p,clock.activity??(clock.silent?0:1));
    const elastic=this.motion.step(t,p,dance.beat,clock.energy,clock.activity??(clock.silent?0:1),this.effectiveElasticity);p=elastic.pose;this.elastic=elastic.rig;
    c.fillStyle='#080812';c.globalAlpha=0.6;c.beginPath();c.ellipse(480+p.x,398,79,11,0,0,TAU);c.fill();c.globalAlpha=1;
    c.save();c.translate(480+p.x,276+p.y+81*1.35*(1-this.elastic.sy));c.scale(1.35*this.elastic.sx,1.35*this.elastic.sy);if(this.elastic.shear)c.transform(1,0,this.elastic.shear,1,0,0);this.skeleton(c,p,s,t);c.restore();
    c.save();c.translate(480,276);for(const l of s.elements.filter(l=>!l.behind))shape(c,l);c.restore();
    if(s.effects.includes('fog'))for(let i=0;i<6;i++){const fog=c.createRadialGradient((i*190+t*9)%1200-120,407+Math.sin(t/3+i)*7,1,(i*190+t*9)%1200-120,407,130);fog.addColorStop(0,'#b6a0cc19');fog.addColorStop(1,'#b6a0cc00');c.fillStyle=fog;c.fillRect(0,360,960,100);}
    if(s.effects.includes('confetti'))for(let i=0;i<40;i++){c.fillStyle=['#ff923e','#b18cff','#ff65b5'][i%3];c.globalAlpha=0.5;c.fillRect((i*73+Math.sin(t+i)*8)%960,(i*47+t*12)%400,3,5);}c.globalAlpha=1;
    this.frames++;if(t-this.last>1){this.fps=this.frames/(t-this.last);this.frames=0;this.last=t;}
  }
  skeleton(c,p,s,t){const bone='#fff0cc',shade='#cabd9f',dark='#191526';c.lineJoin='round';c.lineCap='round';
    const e=this.elastic;
    const activeDance=this.cameos.weight>.5?this.cameos.active?.id:s.dance;
    const line=(x,y,xx,yy,w=8,col=bone)=>{c.strokeStyle=dark;c.lineWidth=w+5;c.beginPath();c.moveTo(x,y);if(Math.abs(yy-y)>22&&Math.abs(e.bend)>0.01)c.quadraticCurveTo((x+xx)/2+e.bend,(y+yy)/2,xx,yy);else c.lineTo(xx,yy);c.stroke();c.strokeStyle=col;c.lineWidth=w;c.stroke();};
    const joint=(x,y,r=5)=>{c.fillStyle=dark;c.beginPath();c.arc(x,y,r+2,0,TAU);c.fill();c.fillStyle=bone;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();};
    const layers=(anchor,behind=false)=>{for(const l of s.layers.filter(l=>l.anchor===anchor&&l.behind===behind))shape(c,l);};
    c.rotate(p.body);
    if(s.outfit==='vampire'){c.fillStyle='#643051';c.strokeStyle=dark;c.lineWidth=4;c.beginPath();c.moveTo(-35,-60);c.lineTo(-65,62);c.lineTo(0,43);c.lineTo(65,62);c.lineTo(35,-60);c.closePath();c.fill();c.stroke();}
    // Legs are hierarchical: costume cuffs and shoes follow lower joints.
    for(const [side,x]of [['L',-15],['R',15]]){const upper=e['leg'+side],lower=e['shin'+side];c.save();c.translate(x,0);c.rotate(p['leg'+side]);c.save();c.scale(1/Math.sqrt(upper),upper);line(0,0,0,41,9);joint(0,40);c.restore();c.translate(0,41*upper);c.rotate(p['shin'+side]);c.save();c.scale(1/Math.sqrt(lower),lower);line(-3,4,-3,39,5);line(4,4,4,39,4,shade);c.restore();c.translate(0,40*lower);layers('foot'+side,true);c.fillStyle=dark;c.fillRect(-9,-5,28,14);c.fillStyle=s.outfit==='disco'?s.accent:bone;c.fillRect(-7,-3,23,10);c.fillStyle=shade;c.fillRect(-7,4,23,3);if(s.hat==='cowboy'){c.fillStyle='#9e623b';c.fillRect(-9,-13,16,22);c.fillRect(-6,3,26,9);}layers('foot'+side);c.restore();}
    layers('pelvis',true);c.fillStyle=dark;c.beginPath();c.moveTo(-27,-9);c.lineTo(-20,13);c.lineTo(-8,17);c.lineTo(0,8);c.lineTo(8,17);c.lineTo(20,13);c.lineTo(27,-9);c.closePath();c.fill();c.strokeStyle=bone;c.lineWidth=7;c.stroke();line(-20,-10,20,-10,7);layers('pelvis');
    // Spine, sternum and five curved ribs on both sides.
    c.save();c.translate(0,-42);layers('torso',true);for(let i=0;i<7;i++){c.fillStyle=dark;c.fillRect(-7,-26+i*7,14,6);c.fillStyle=shade;c.fillRect(-5,-27+i*7,10,5);}
    for(let i=0;i<5;i++){c.strokeStyle=dark;c.lineWidth=8;c.beginPath();c.moveTo(-1,-29+i*9);c.bezierCurveTo(-32,-40+i*9,-35,-12+i*7,-4,-14+i*8);c.stroke();c.moveTo(1,-29+i*9);c.bezierCurveTo(32,-40+i*9,35,-12+i*7,4,-14+i*8);c.stroke();c.strokeStyle=bone;c.lineWidth=4;c.stroke();}
    line(0,-33,0,5,5);line(-3,-37,-33,-34,6);line(3,-37,33,-34,6);
    if(s.outfit==='disco'||s.outfit==='pirate'){c.fillStyle=s.outfit==='disco'?s.accent:'#aa3e54';c.strokeStyle=dark;c.lineWidth=3;for(const sign of [-1,1]){c.beginPath();c.moveTo(sign*12,-39);c.lineTo(sign*34,-35);c.lineTo(sign*27,14);c.lineTo(sign*7,11);c.closePath();c.fill();c.stroke();}if(s.outfit==='disco'){c.fillStyle='#ffe4a8';for(let i=0;i<12;i++)c.fillRect((i%2?19:-23),-30+Math.floor(i/2)*7,3,3);}}
    if(s.outfit==='astronaut'){c.fillStyle='#d6e4e5';c.strokeStyle=dark;c.lineWidth=3;c.fillRect(-29,-38,58,52);c.strokeRect(-29,-38,58,52);c.fillStyle='#42617e';c.fillRect(-19,-12,38,17);c.fillStyle=s.accent;c.fillRect(-12,-7,8,7);}
    layers('torso');c.restore();drawCabaretStagewear(c,this.cameos);
    // Arms use shoulder -> elbow -> wrist transforms. Props live at wrists.
    for(const [side,x]of [['L',-34],['R',34]]){const upper=e['arm'+side],lower=e['fore'+side];c.save();c.translate(x,-73);c.rotate(p['arm'+side]);c.save();c.scale(1/Math.sqrt(upper),upper);layers('arm'+side,true);joint(0,0);line(0,4,0,34,7);if(s.outfit==='astronaut'){line(0,4,0,29,14,'#d6e4e5');}layers('arm'+side);c.restore();c.translate(0,36*upper);joint(0,0);c.rotate(p['fore'+side]);c.save();c.scale(1/Math.sqrt(lower),lower);line(-2,4,-2,32,4);line(4,4,4,32,3,shade);c.restore();c.translate(0,34*lower);layers('hand'+side,true);joint(0,0,6);for(let i=0;i<3;i++)line(-5+i*5,3,-6+i*6,13,3);if(side==='R')drawProp(c,s.prop,s.accent);layers('hand'+side);c.restore();}
    const boaTease=this.cameos.active?.id==='boa'?this.cameos.weight:0;
    if(s.boa||boaTease>0){c.save();c.globalAlpha*=s.boa?1:boaTease;c.strokeStyle='#36172b';c.lineWidth=17;c.beginPath();c.moveTo(-30,-76);c.quadraticCurveTo(0,-42,31,-76);c.lineTo(35,-20);c.stroke();for(let i=0;i<29;i++){const x=i<18?-30+i*3.5:35+Math.sin(i*3)*4,y=i<18?-76+Math.sin(i/17*Math.PI)*22:-76+(i-18)*5;c.fillStyle=i%2?(s.boa?s.boaColor:'#ff65b5'):'#ffd0ec';c.fillRect(x-6+Math.sin(t*2+i*.2)*boaTease*3,y-5,12,10);}c.restore();}
    // A friendly big skull, tilting on a neck joint.
    const headSize=s.headSize??1;line(0,-77,e.neckX-Math.sin(p.head)*18*headSize,-98+e.neckY+Math.cos(p.head)*18*headSize,7);
    c.save();c.translate(e.neckX,-98+e.neckY);c.rotate(p.head);c.scale(headSize,headSize);layers('head',true);c.fillStyle=dark;c.beginPath();c.moveTo(-26,-20);c.lineTo(-18,-32);c.lineTo(18,-32);c.lineTo(26,-20);c.lineTo(26,4);c.lineTo(17,12);c.lineTo(16,25);c.lineTo(-16,25);c.lineTo(-17,12);c.lineTo(-26,4);c.closePath();c.fill();c.fillStyle=bone;c.beginPath();c.moveTo(-23,-19);c.lineTo(-16,-29);c.lineTo(16,-29);c.lineTo(23,-19);c.lineTo(23,2);c.lineTo(14,10);c.lineTo(13,21);c.lineTo(-13,21);c.lineTo(-14,10);c.lineTo(-23,2);c.closePath();c.fill();c.fillStyle='#e0d2b2';c.fillRect(-23,-15,4,14);c.fillRect(18,-19,5,16);c.fillStyle=dark;
    const blink=Math.sin(t*0.41)>0.995;for(const x of [-12,12]){c.beginPath();c.ellipse(x,-7,7,s.mood==='sleepy'||blink?2:8,s.mood==='sassy'?x*0.02:0,0,TAU);c.fill();if(!blink&&s.mood!=='sleepy'){c.fillStyle=s.mood==='spooky'?'#b18cff':'#fff0cc';c.fillRect(x+1,-10,2,3);c.fillStyle=dark;}}
    c.beginPath();c.moveTo(0,0);c.lineTo(-4,7);c.lineTo(4,7);c.fill();c.fillRect(-12,12,24,3);for(let x=-9;x<=9;x+=6)c.fillRect(x,12,2,8);
    if(s.glasses){c.fillStyle='#20192f';c.fillRect(-23,-16,20,14);c.fillRect(3,-16,20,14);c.fillRect(-4,-12,8,4);c.fillStyle='#b18cff';c.fillRect(-19,-14,10,2);c.fillRect(7,-14,10,2);}
    if(s.outfit==='astronaut'){c.strokeStyle='#6cd9ff';c.lineWidth=5;c.beginPath();c.arc(0,-4,39,0,TAU);c.stroke();c.fillStyle='#6cd9ff22';c.fill();}
    drawHat(c,s.hat,s.accent);layers('head');c.restore();
    // Forehead gesture is drawn in front of the skull, using the same wrist transform.
    if(activeDance==='takethel'&&p.armL<-1.45&&p.foreL<-.6){c.save();c.translate(-34,-73);c.rotate(p.armL);c.translate(0,36*e.armL);c.rotate(p.foreL);c.translate(0,34*e.foreL);joint(0,0,6);line(0,3,0,24,3);line(0,4,-16,4,3);line(5,3,5,9,3);c.restore();}
    if(this.cameos.active?.id==='kiss'&&this.cameos.weight>0){c.save();c.fillStyle='#ed84bc';for(let i=0;i<2;i++){const u=((this.cameos.phase+i*1.2)%4)/4;c.globalAlpha=.85*this.cameos.weight*(1-u);c.save();c.translate(e.neckX+30+u*40,-108+e.neckY-u*30-i*9);c.scale(1.3,1.3);c.fillRect(-3,-3,3,3);c.fillRect(1,-3,3,3);c.fillRect(-4,0,9,2);c.fillRect(-2,2,5,2);c.fillRect(0,4,1,1);c.restore();}c.restore();}
  }
}
function drawHat(c,hat,col){c.strokeStyle='#191526';c.lineWidth=3;c.fillStyle=col;
  if(hat==='witch'){c.beginPath();c.moveTo(-33,-26);c.lineTo(-15,-36);c.lineTo(-3,-79);c.lineTo(12,-69);c.lineTo(9,-61);c.lineTo(22,-33);c.lineTo(36,-25);c.closePath();c.fill();c.stroke();c.fillStyle='#ffc05c';c.fillRect(-15,-39,35,7);c.fillStyle='#342340';c.fillRect(0,-39,8,7);}
  if(hat==='cowboy'){c.fillStyle='#b77b49';c.beginPath();c.moveTo(-39,-32);c.lineTo(-25,-24);c.lineTo(26,-24);c.lineTo(40,-34);c.lineTo(36,-38);c.lineTo(20,-34);c.lineTo(18,-54);c.lineTo(5,-59);c.lineTo(-4,-52);c.lineTo(-18,-58);c.lineTo(-22,-34);c.closePath();c.fill();c.stroke();c.fillStyle=col;c.fillRect(-22,-37,43,7);}
  if(hat==='crown'){c.beginPath();c.moveTo(-24,-26);c.lineTo(-28,-52);c.lineTo(-14,-42);c.lineTo(0,-58);c.lineTo(14,-42);c.lineTo(28,-52);c.lineTo(24,-26);c.closePath();c.fill();c.stroke();c.fillStyle='#ff65b5';c.fillRect(-3,-40,6,6);}
  if(hat==='tophat'){c.fillRect(-22,-65,44,36);c.strokeRect(-22,-65,44,36);c.fillRect(-34,-32,68,8);c.strokeRect(-34,-32,68,8);c.fillStyle='#b18cff';c.fillRect(-21,-41,42,7);}
  if(hat==='pirate'){c.fillStyle='#433046';c.beginPath();c.moveTo(-39,-26);c.lineTo(-25,-52);c.lineTo(0,-39);c.lineTo(25,-52);c.lineTo(39,-26);c.closePath();c.fill();c.stroke();c.fillStyle='#fff0cc';c.fillRect(-5,-38,10,9);c.fillRect(-3,-28,6,3);}
}
function drawProp(c,p,col){c.strokeStyle='#191526';c.lineWidth=3;if(p==='none')return;c.save();c.rotate(-0.3);
  if(p==='wand'||p==='sword'){c.fillStyle=p==='wand'?'#b18cff':'#d9e4e5';c.fillRect(-3,-48,6,55);c.strokeRect(-3,-48,6,55);if(p==='wand')shape(c,{shape:'star',x:0,y:-50,w:23,h:23,rotation:0,color:col,pattern:'solid'});else{c.fillStyle=col;c.fillRect(-12,-1,24,5);}}
  if(p==='microphone'){c.fillStyle='#584965';c.fillRect(-4,-15,8,25);c.fillStyle='#d8d4de';c.beginPath();c.arc(0,-20,9,0,TAU);c.fill();c.stroke();}
  if(p==='pumpkin'){c.fillStyle='#e98338';c.beginPath();c.ellipse(6,20,20,17,0,0,TAU);c.fill();c.stroke();c.strokeStyle='#9c582c';c.beginPath();c.arc(6,3,13,Math.PI,0);c.stroke();c.fillStyle='#3b2427';c.fillRect(-3,17,4,4);c.fillRect(10,17,4,4);c.fillRect(1,25,10,3);}
  c.restore();
}
function shape(c,l){c.save();c.translate(l.x,l.y);c.rotate(l.rotation*Math.PI/180);c.fillStyle=l.color;c.strokeStyle='#191526';c.lineWidth=2;c.beginPath();
  if(l.shape==='rect')c.rect(-l.w/2,-l.h/2,l.w,l.h);else if(l.shape==='ellipse')c.ellipse(0,0,l.w/2,l.h/2,0,0,TAU);else if(l.shape==='triangle'){c.moveTo(0,-l.h/2);c.lineTo(l.w/2,l.h/2);c.lineTo(-l.w/2,l.h/2);c.closePath();}else{for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,r=i%2?0.23:0.5;c.lineTo(Math.cos(a)*l.w*r,Math.sin(a)*l.h*r);}c.closePath();}c.fill();c.stroke();c.clip();
  c.globalAlpha=0.32;c.fillStyle='#ffffff';if(l.pattern==='stripes')for(let x=-l.w;x<l.w;x+=10)c.fillRect(x,-l.h,4,l.h*2);if(l.pattern==='dots')for(let x=-l.w/2;x<l.w/2;x+=10)for(let y=-l.h/2;y<l.h/2;y+=10)c.fillRect(x,y,3,3);c.restore();
}
