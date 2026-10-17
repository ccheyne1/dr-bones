import {cameoPose,partyRoutines} from '../public/cameos.js';
import test from 'node:test';import assert from 'node:assert/strict';import {Stage} from '../public/render.js';import {defaultScene,pose,dances} from '../public/core.js';
const multiply=(a,b)=>[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];
function context(){return {matrix:[1,0,0,1,0,0],stack:[],marks:[],save(){this.stack.push({matrix:[...this.matrix],fillStyle:this.fillStyle});},restore(){Object.assign(this,this.stack.pop());},translate(x,y){this.matrix=multiply(this.matrix,[1,0,0,1,x,y]);},scale(x,y){this.matrix=multiply(this.matrix,[x,0,0,y,0,0]);},rotate(a){this.matrix=multiply(this.matrix,[Math.cos(a),Math.sin(a),-Math.sin(a),Math.cos(a),0,0]);},fill(){if(this.fillStyle==='#123abc')this.marks.push([...this.matrix]);},beginPath(){},moveTo(){},lineTo(){},closePath(){},stroke(){},arc(){},ellipse(){},rect(){},clip(){},fillRect(){},strokeRect(){},bezierCurveTo(){},quadraticCurveTo(){}};}
test('custom costume layers follow skull and wrist transforms throughout all routines',()=>{
  for(const size of [1,1.8])for(const dance of [...dances,...partyRoutines.map(r=>r.id)])for(const beat of [0,.7,1.5,3.25])for(const anchor of ['head','handR']){
    const s=defaultScene();s.dance=dance;s.headSize=size;s.layers=[{anchor,shape:'rect',x:10,y:-12,w:20,h:10,rotation:15,color:'#123abc',pattern:'solid',behind:false}];
    const p=dances.includes(dance)?pose(s,beat):cameoPose(dance,beat),c=context(),stage=new Stage({getContext:()=>c},s);stage.skeleton(c,p,s,0);
    const rot=a=>[Math.cos(a),Math.sin(a),-Math.sin(a),Math.cos(a),0,0],trans=(x,y)=>[1,0,0,1,x,y];
    let expected=rot(p.body);if(anchor==='head'){expected=multiply(expected,trans(0,-98));expected=multiply(expected,rot(p.head));expected=multiply(expected,[size,0,0,size,0,0]);}else{expected=multiply(expected,trans(34,-73));expected=multiply(expected,rot(p.armR));expected=multiply(expected,trans(0,36));expected=multiply(expected,rot(p.foreR));expected=multiply(expected,trans(0,34));}
    expected=multiply(multiply(expected,trans(10,-12)),rot(15*Math.PI/180));assert.equal(c.marks.length,1);expected.forEach((v,i)=>assert.ok(Math.abs(v-c.marks[0][i])<1e-8));
  }
});
test('head, wrist and foot layers remain attached while the elastic segments stretch',()=>{
  for(const anchor of ['head','handR','footR'])for(const beat of [.15,.7,1.4,2.3]){
    const s=defaultScene();s.layers=[{anchor,shape:'rect',x:0,y:0,w:10,h:10,rotation:0,color:'#123abc',pattern:'solid',behind:false}];
    const c=context(),stage=new Stage({getContext:()=>c},s),p=pose(s,beat);stage.elastic={...stage.elastic,neckX:9,neckY:-5,armR:1.25,foreR:0.8,legR:1.12,shinR:0.9,bend:12};stage.skeleton(c,p,s,0);
    const rot=a=>[Math.cos(a),Math.sin(a),-Math.sin(a),Math.cos(a),0,0],trans=(x,y)=>[1,0,0,1,x,y];let expected=rot(p.body);
    if(anchor==='head')expected=multiply(multiply(expected,trans(9,-103)),rot(p.head));
    else if(anchor==='handR'){expected=multiply(multiply(expected,trans(34,-73)),rot(p.armR));expected=multiply(multiply(expected,trans(0,36*1.25)),rot(p.foreR));expected=multiply(expected,trans(0,34*0.8));}
    else{expected=multiply(multiply(expected,trans(15,0)),rot(p.legR));expected=multiply(multiply(expected,trans(0,41*1.12)),rot(p.shinR));expected=multiply(expected,trans(0,40*0.9));}
    assert.equal(c.marks.length,1);expected.forEach((v,i)=>assert.ok(Math.abs(v-c.marks[0][i])<1e-8,`${anchor} ${i}`));
  }
});
