import assert from 'node:assert/strict';
import {stepKart} from '../src/kart-physics.js';
import {siteBounds,clampToSite,pointInsideSite} from '../src/site.js';

let kart={x:0,z:0,heading:0,speed:0,steering:0};
for(let i=0;i<60;i++)kart=stepKart(kart,{throttle:true,steer:0},1/60,true);
assert.ok(kart.speed>10&&kart.z>4,'kart should accelerate and move forward');
const before=kart.heading;
kart=stepKart(kart,{throttle:true,steer:1},1/60,true);
assert.ok(kart.steering>0&&kart.steering<.53,'steering should build smoothly');
assert.ok(kart.heading>before,'kart should turn in the requested direction');
const roadSpeed=kart.speed;
for(let i=0;i<60;i++)kart=stepKart(kart,{throttle:false,steer:0},1/60,false);
assert.ok(kart.speed<roadSpeed/4,'grass should slow the kart');
assert.deepEqual(siteBounds(3),{minX:-315,maxX:315,minZ:-234,maxZ:135,scale:3});
assert.deepEqual(clampToSite([400,-300],3),[315,-234]);
assert.equal(pointInsideSite([250,-150],3),true);
assert.equal(pointInsideSite([250,-150],1),false);
console.log('PASS: kart acceleration, smooth steering, grass drag, and circuit-area bounds.');
