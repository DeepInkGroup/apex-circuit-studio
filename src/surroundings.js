import * as THREE from 'three';
import ClipperLib from 'clipper-lib';

export function createSurroundings(group) {
  const materials={};
  function material(color){return materials[color]??=new THREE.MeshStandardMaterial({color,roughness:.88});}
  function add(geo,color,x,y,z,parent=group){const m=new THREE.Mesh(geo,material(color));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
  const box=(w,h,d,x,y,z,c,parent)=>add(new THREE.BoxGeometry(w,h,d),c,x,y,z,parent);
  let seed=51;function rand(){seed=(seed*16807)%2147483647;return(seed-1)/2147483646;}
  function clear(){group.traverse(o=>o.geometry?.dispose());group.clear();}
  return function rebuild({samples,width,siteScale=1,outerPaths=[],density=105,trees=true,facilities=true,barriers=true,biome='park'}){
    clear();seed=51;
    function distance(x,z){let d=Infinity;for(let i=0;i<samples.length;i+=3)d=Math.min(d,Math.hypot(samples[i].x-x,samples[i].z-z));return d;}
    function free(x,z,r){
      if(distance(x,z)<width/2+r)return false;
      const point={X:Math.round(x*1000),Y:Math.round(z*1000)};
      let winding=0,nearest=Infinity;
      for(const path of outerPaths){
        if(ClipperLib.Clipper.PointInPolygon(point,path)!==0)winding+=Math.sign(ClipperLib.Clipper.Area(path));
        for(let i=0;i<path.length;i++){
          const a=path[i],b=path[(i+1)%path.length],dx=b.X-a.X,dz=b.Y-a.Y,den=dx*dx+dz*dz;
          const t=den?Math.max(0,Math.min(1,((point.X-a.X)*dx+(point.Y-a.Y)*dz)/den)):0;
          nearest=Math.min(nearest,Math.hypot(point.X-a.X-dx*t,point.Y-a.Y-dz*t)/1000);
        }
      }
      return winding===0&&nearest>r;
    }
    if(trees)for(let i=0;i<Math.min(480,density*siteScale);i++){const x=(-118+rand()*236)*siteScale,z=(-92+rand()*180)*siteScale,size=.6+rand()*.6;if(!free(x,z,8)||z>56*siteScale&&Math.abs(x)<52*siteScale)continue;
      add(new THREE.CylinderGeometry(.22,.42,3.8,7),'#786650',x,1.9,z);
      if(biome==='forest'){for(let j=0;j<3;j++)add(new THREE.ConeGeometry((3.8-j*.7)*size,5*size,8),['#3c644d','#4a7554','#5c865c'][j],x,4+j*1.7,z);}
      else{for(let j=0;j<3;j++){const crown=add(new THREE.IcosahedronGeometry((3.1-j*.3)*size,1),['#5b7950','#78915b','#8fa76a'][j],x+(j-1)*1.2,4+j*1.2,z);crown.scale.y=.85;}}
      if(i%4===0)for(let j=0;j<3;j++)add(new THREE.IcosahedronGeometry(.7+rand()*.6,0),'#7f8b74',x+4+j, .55,z+2);
    }
    if(facilities){
      // Facilities sit outside the drawing boundary, with an additional road-clearance check.
      if(free(0,70*siteScale,27)){box(78,.1,24,0,0,70*siteScale,'#b8baa9');box(52,4.5,11,0,2.25,77*siteScale,'#e7e4d7');box(55,.4,13,0,4.7,77*siteScale,'#39493e');
        for(let i=0;i<7;i++){const x=-22+i*7.2;box(5.5,3,.2,x,1.5,71.4*siteScale,'#727e72');box(5.5,.3,.3,x,3.6,71.2*siteScale,'#e88651');box(5,.03,4,x,.09,66*siteScale,'#d5d2c1');box(.13,.03,7,x-3,.1,64*siteScale,'#f5f2df');}
        for(let i=0;i<4;i++){const x=-28+i*18;box(.16,8,.16,x,4,86*siteScale,'#636e63');const flag=box(3,1.3,.08,x+1.5,7.1,86*siteScale,i%2?'#ede8d8':'#e67942');flag.rotation.y=.3;}
      }
      for(const side of [-1,1]){const x=side*91*siteScale;if(free(x,63*siteScale,15)){for(let i=0;i<5;i++){box(25,.6,2,x,1+i*.8,(60+i*2)*siteScale,'#c3c5b6');box(24,.4,.7,x,1.5+i*.8,(60+i*2)*siteScale,'#567865');}box(27,.3,12,x,7,65*siteScale,'#dedfd0');for(const dx of [-12,12])box(.25,7,.25,x+dx,3.5,65*siteScale,'#646e63');}}
      for(const x of [-112,112])for(const z of [-70,40]){box(.25,12,.25,x*siteScale,6,z*siteScale,'#727d70');box(3,.4,.8,x*siteScale,12,z*siteScale,'#e9ebdf');}
    }
    // Continuous boundary rail, away from the editable track area.
    if(barriers){for(const z of [-97,96]){box(242*siteScale,.12,.12,0,1.2,z*siteScale,'#7d8a74');box(242*siteScale,.12,.12,0,2.3,z*siteScale,'#7d8a74');for(let x=-120*siteScale;x<=120*siteScale;x+=8)box(.15,2.7,.15,x,1.35,z*siteScale,'#697963');}for(const x of [-122,122]){box(.12,.12,193*siteScale,x*siteScale,1.2,0,'#7d8a74');box(.12,.12,193*siteScale,x*siteScale,2.3,0,'#7d8a74');for(let z=-96*siteScale;z<=96*siteScale;z+=8)box(.15,2.7,.15,x*siteScale,1.35,z,'#697963');}
      const stride=Math.max(12,Math.round(samples.length/55));for(let i=0;i<samples.length-3;i+=stride){const p=samples[i],next=samples[i+2],dx=next.x-p.x,dz=next.z-p.z,l=Math.hypot(dx,dz)||1;for(const side of [-1,1]){const x=p.x-dz/l*(width/2+4)*side,z=p.z+dx/l*(width/2+4)*side;if(Math.abs(x)>117*siteScale||Math.abs(z)>91*siteScale||!free(x,z,2.5))continue;for(let j=0;j<2;j++)add(new THREE.CylinderGeometry(.68,.68,.48,10),i%36?'#354237':'#d4774f',x,.3+j*.48,z);}}}
  };
}
