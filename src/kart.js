import * as THREE from 'three';

export function createKart(){
  const kart=new THREE.Group();
  const paint=new THREE.MeshStandardMaterial({color:'#ee6535',metalness:.17,roughness:.42});
  const rubber=new THREE.MeshStandardMaterial({color:'#181d1b',roughness:.96});
  const frame=new THREE.MeshStandardMaterial({color:'#303934',metalness:.45,roughness:.52});
  const seat=new THREE.MeshStandardMaterial({color:'#121b1a',roughness:.75});
  const trim=new THREE.MeshStandardMaterial({color:'#f6ede0',roughness:.58});
  const metal=new THREE.MeshStandardMaterial({color:'#aeb9ad',metalness:.7,roughness:.35});
  function add(geometry,material,x,y,z,parent=kart){const part=new THREE.Mesh(geometry,material);part.position.set(x,y,z);part.castShadow=true;part.receiveShadow=true;parent.add(part);return part;}
  const box=(w,h,d,x,y,z,m,parent)=>add(new THREE.BoxGeometry(w,h,d),m,x,y,z,parent);
  box(1.35,.16,2.65,0,.43,0,frame);
  for(const x of [-.61,.61])box(.11,.18,2.52,x,.49,0,metal);
  box(.9,.2,.75,0,.58,1.06,paint);
  const nose=add(new THREE.ConeGeometry(.5,1.22,5),paint,0,.58,1.77);nose.rotation.x=Math.PI/2;
  box(.72,.04,.72,0,.7,1.13,trim);
  for(const x of [-.82,.82]){box(.36,.28,1.16,x,.65,.14,paint);box(.3,.04,.66,x,.81,.15,trim);}
  box(1.78,.16,.32,0,.48,1.7,paint);box(1.75,.08,.11,0,.55,-1.46,frame);
  box(.83,.22,.8,0,.66,-.92,frame);
  box(.74,.5,.47,0,.98,-.66,seat);
  const back=box(.75,.75,.12,0,1.13,-1.02,seat);back.rotation.x=-.22;
  box(.78,.32,.12,0,1.14,-1.12,paint);
  box(.42,.4,.57,.66,.75,-.82,metal);
  add(new THREE.CylinderGeometry(.22,.22,.3,12),frame,.65,1.01,-.82).rotation.z=Math.PI/2;
  // Steering wheel, driver body, visor and helmet make the driving view legible.
  const wheel=add(new THREE.TorusGeometry(.28,.055,8,18),rubber,0,1.23,.38);wheel.rotation.x=.65;
  box(.07,.38,.07,0,1.03,.43,metal);
  add(new THREE.SphereGeometry(.38,16,12),paint,0,1.39,-.47).scale.set(1,.72,.7);
  add(new THREE.SphereGeometry(.34,18,14),trim,0,1.84,-.43);
  const visor=add(new THREE.SphereGeometry(.3,16,12),rubber,0,1.85,-.19);visor.scale.set(.91,.34,.31);
  const wheels=[],frontPivots=[];
  for(const x of [-.94,.94])for(const z of [-1.04,1.05]){
    const pivot=new THREE.Group();pivot.position.set(x,.43,z);kart.add(pivot);
    const tire=add(new THREE.CylinderGeometry(.42,.42,.32,16),rubber,0,0,0,pivot);tire.rotation.z=Math.PI/2;
    add(new THREE.CylinderGeometry(.22,.22,.34,14),metal,0,0,0,pivot).rotation.z=Math.PI/2;
    wheels.push(tire);if(z>0)frontPivots.push(pivot);
  }
  return {kart,wheels,frontPivots};
}
