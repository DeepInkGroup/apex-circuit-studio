import assert from 'node:assert/strict';
import * as THREE from 'three';
import ClipperLib from 'clipper-lib';
import {adaptiveCenterline,buildTrackGeometry,intersections,offsetPolyline} from '../src/track-geometry.js';

const cases=[
  ['90-degree corner',[[-45,0],[0,0],[0,42]],8],
  ['135-degree corner',[[-45,0],[0,0],[-30,30]],8],
  ['near-180-degree hairpin',[[-42,-3],[-8,-3],[0,-2],[1,0],[0,2],[-8,3],[-42,3]],8],
  ['two close control points',[[-45,-18],[-4,-8],[-3.997,-7.998],[0,0],[38,26]],8],
  ['sharp S-curve',[[-48,-25],[-28,10],[-5,-12],[20,12],[47,-20]],8],
  ['wide track, tiny turn radius',[[-40,-2],[-8,-2],[0,-1],[1,0],[0,1],[-8,2],[-40,2]],12],
  ['closed hairpin circuit',[[-45,-30],[-10,-30],[5,-27],[8,-24],[6,-20],[-12,-20],[-42,-17],[-48,10],[-40,30],[20,30],[45,10],[42,-27]],10,true],
  ['closed crossing layout',[[-45,-30],[45,30],[45,-30],[-45,30]],8,true],
];
function area(paths){return paths.reduce((sum,path)=>sum+ClipperLib.Clipper.Area(path),0);}
function overlap(a,b){const c=new ClipperLib.Clipper();c.AddPaths(a,ClipperLib.PolyType.ptSubject,true);c.AddPaths(b,ClipperLib.PolyType.ptClip,true);const result=new ClipperLib.Paths();c.Execute(ClipperLib.ClipType.ctIntersection,result,ClipperLib.PolyFillType.pftNonZero,ClipperLib.PolyFillType.pftNonZero);return Math.abs(area(result))/1e6;}
function validateSurface(geometry,label){const pos=geometry.getAttribute('position'),normal=geometry.getAttribute('normal');assert.ok(pos.count>0,`${label}: empty surface`);for(let i=0;i<pos.count;i+=3){const a=new THREE.Vector3().fromBufferAttribute(pos,i),b=new THREE.Vector3().fromBufferAttribute(pos,i+1),c=new THREE.Vector3().fromBufferAttribute(pos,i+2);const twiceArea=b.clone().sub(a).cross(c.clone().sub(a));assert.ok(Number.isFinite(a.x+a.y+a.z+b.x+b.y+b.z+c.x+c.y+c.z),`${label}: non-finite vertex`);assert.ok(twiceArea.length()>1e-5,`${label}: near-zero triangle`);assert.ok(twiceArea.y>0,`${label}: reversed triangle`);assert.ok(normal.getY(i)>.99,`${label}: incorrect normal`);}}
function meshArea(geometry){const pos=geometry.getAttribute('position');let sum=0;for(let i=0;i<pos.count;i+=3){const ax=pos.getX(i),az=pos.getZ(i),bx=pos.getX(i+1)-ax,bz=pos.getZ(i+1)-az,cx=pos.getX(i+2)-ax,cz=pos.getZ(i+2)-az;sum+=Math.abs(bx*cz-bz*cx)/2;}return sum;}
function distanceToRings(p,rings){let nearest=Infinity;for(const ring of rings)for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length],dx=b.x-a.x,dz=b.z-a.z,den=dx*dx+dz*dz;const t=den?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/den)):0;nearest=Math.min(nearest,Math.hypot(p.x-a.x-dx*t,p.z-a.z-dz*t));}return nearest;}
for(const [name,control,width,closed=false] of cases){
  const curve=new THREE.CatmullRomCurve3(control.map(([x,z])=>new THREE.Vector3(x,0,z)),closed,'catmullrom',.18);
  const sampled=adaptiveCenterline(curve,closed);
  assert.ok(sampled.length>control.length,`${name}: no adaptive samples`);
  const start=performance.now();const model=buildTrackGeometry(curve,{closed,width,curbWidth:1.2,miterLimit:1.8,debug:true});
  if(name==='closed crossing layout')assert.ok(model.intersectionPoints.length>0,'debug mode did not report repaired crossings');
  validateSurface(model.road,`${name} road`);validateSurface(model.curb,`${name} curb`);
  const curbArea=Math.abs(area(model.curbPaths))/1e6;
  assert.ok(Math.abs(meshArea(model.curb)-curbArea)<Math.max(.01,curbArea*.0001),`${name}: curb triangles overlap or leave gaps`);
  assert.ok(overlap(model.roadPaths,model.curbPaths)<.00001,`${name}: curb penetrates asphalt`);
  for(const boundary of [...model.boundaries,...model.curbEdges]){
    assert.equal(intersections(boundary.outer).length,0,`${name}: self-intersecting outer boundary`);
    for(const hole of boundary.holes)assert.equal(intersections(hole).length,0,`${name}: self-intersecting inner boundary`);
  }
  const roadRings=model.boundaries.flatMap(p=>[p.outer,...p.holes]);
  for(const edge of model.curbEdges)for(const p of [...edge.outer,...edge.holes.flat()])assert.ok(distanceToRings(p,roadRings)<1.5,`${name}: curb grows wider than its miter limit`);
  console.log(`${name}: ${sampled.length} samples, ${model.curb.getAttribute('position').count/3} curb triangles, ${Math.round(performance.now()-start)} ms`);
}
const corner=[{x:-10,z:0},{x:0,z:0},{x:-9,z:1}];
assert.ok(offsetPolyline(corner,4,{closed:false,miterLimit:1.2}).length>corner.length,'sharp corner did not bevel');
let seed=1107;const random=()=>{seed=(seed*16807)%2147483647;return(seed/2147483647);};
for(let run=0;run<80;run++){
  const control=Array.from({length:7},()=>new THREE.Vector3(-45+random()*90,0,-35+random()*70));
  if(run%3===0)control[3].copy(control[2]).add(new THREE.Vector3(.002,0,.003));
  const closed=run%2===0,curve=new THREE.CatmullRomCurve3(control,closed,'catmullrom',.1+random()*.7);
  const model=buildTrackGeometry(curve,{closed,width:5+random()*7,curbWidth:.5+random(),miterLimit:1.2+random()*1.8});
  validateSurface(model.road,`stress ${run} road`);validateSurface(model.curb,`stress ${run} curb`);
  assert.ok(overlap(model.roadPaths,model.curbPaths)<.00001,`stress ${run}: curb penetrates asphalt`);
  const regionArea=Math.abs(area(model.curbPaths))/1e6;
  if(Math.abs(meshArea(model.curb)-regionArea)>=Math.max(.02,regionArea*.0001))console.log('DIAGNOSTIC',JSON.stringify({run,polygons:model.curbEdges.filter(p=>p.outer.length<15)}));
  assert.ok(Math.abs(meshArea(model.curb)-regionArea)<Math.max(.02,regionArea*.0001),`stress ${run}: curb mesh ${meshArea(model.curb).toFixed(4)} differs from region ${regionArea.toFixed(4)}`);
}
console.log('PASS: sharp and closed geometries, bounded joins, valid triangles, repaired boundaries, and no curb/road overlap.');
