// Procedural 2D interpretations; no game assets, sound or network requests.
export const fortniteRoutines=[
  {id:'floss',name:'Floss'},
  {id:'orangejustice',name:'Orange Justice'},
  {id:'takethel',name:'Take the L'},
  {id:'electroshuffle',name:'Electro Shuffle'},
];
const TAU=Math.PI*2;

// Degrees, shared by selectable dances and occasional interludes. The caller
// applies the normal rig limits and converts to radians after custom keyframes.
export function fortnitePose(id,beat,intensity=1){
  const p=beat*TAU,s=Math.sin(p/2),c=Math.cos(p/2),bounce=(1-Math.cos(p))/2;
  const a=Math.max(.25,Math.min(1.35,intensity));
  switch(id){
    case 'floss':return {
      x:-s*18*a,y:-bounce*3*a,body:-s*12*a,head:s*15*a,
      armL:12+s*54*a,foreL:-8+c*12*a,armR:-12+s*54*a,foreR:8+c*12*a,
      legL:13+s*9*a,shinL:-12-bounce*8*a,legR:-13+s*9*a,shinR:12+bounce*8*a,
    };
    case 'orangejustice':return {
      x:s*20*a,y:14+bounce*12*a,body:s*19*a,head:-s*20*a,
      armL:38+s*57*a,foreL:-65+Math.cos(p)*32*a,
      armR:-38+s*57*a,foreR:65+Math.cos(p)*32*a,
      legL:38+s*12*a,shinL:-65-bounce*18*a,legR:-38+s*12*a,shinR:65+bounce*18*a,
    };
    case 'takethel':{const left=Math.max(0,s),right=Math.max(0,-s);return {
      x:s*9*a,y:-bounce*8*a,body:s*9*a,head:5-s*12*a,
      armL:-108+c*2,foreL:-65+c*3,armR:-35+s*15*a,foreR:100,
      legL:15+left*48*a,shinL:-left*55*a,legR:-15-right*48*a,shinR:right*55*a,
    };}
    case 'electroshuffle':{const step=Math.sin(p),cross=Math.sin(p/4);return {
      x:cross*28*a,y:-bounce*9*a,body:-7+cross*10*a,head:7-cross*14*a,
      armL:30-step*36*a,foreL:-65+c*22*a,armR:-30-step*36*a,foreR:65+c*22*a,
      legL:cross*13+step*38*a,shinL:-Math.max(0,step)*78*a,
      legR:cross*13-step*38*a,shinR:Math.max(0,-step)*78*a,
    };}
    default:throw Error('Unknown Fortnite-inspired routine');
  }
}
