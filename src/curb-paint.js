import * as THREE from 'three';

const BOUNDS = {minX:-135,minZ:-105,width:270,height:210};
export function makeCurbTexture(centerline, width, curbWidth, closed) {
  const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=1593;
  const ctx=canvas.getContext('2d');
  const toCanvas=p=>({x:(p.x-BOUNDS.minX)/BOUNDS.width*canvas.width,y:(BOUNDS.minZ+BOUNDS.height-p.z)/BOUNDS.height*canvas.height});
  const scale=canvas.width/BOUNDS.width;
  ctx.lineWidth=(width+2*curbWidth+.5)*scale;
  ctx.lineJoin='round';ctx.lineCap='butt';
  const points=closed?[...centerline,centerline[0]]:centerline;
  function stroke(path,color){if(path.length<2)return;ctx.strokeStyle=color;ctx.beginPath();const first=toCanvas(path[0]);ctx.moveTo(first.x,first.y);for(let i=1;i<path.length;i++){const p=toCanvas(path[i]);ctx.lineTo(p.x,p.y);}ctx.stroke();}
  stroke(points,'#f4eee1');
  let current=[points[0]],band=0,progress=0;
  for(let i=1;i<points.length;i++){
    let a=points[i-1],b=points[i],segment=Math.hypot(b.x-a.x,b.z-a.z);
    while(segment>1e-6){
      const remaining=2-progress;
      if(segment<=remaining+1e-6){current.push(b);progress+=segment;segment=0;}
      else{const t=remaining/segment,m={x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};current.push(m);if(band%2===0)stroke(current,'#ca513b');band++;current=[m];a=m;segment=Math.hypot(b.x-a.x,b.z-a.z);progress=0;}
      if(progress>=2-1e-6){if(band%2===0)stroke(current,'#ca513b');band++;current=[b];progress=0;}
    }
  }
  if(band%2===0)stroke(current,'#ca513b');
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;texture.minFilter=THREE.LinearMipmapLinearFilter;
  return texture;
}
