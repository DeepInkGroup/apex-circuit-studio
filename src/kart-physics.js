export function stepKart(state,input,dt,onRoad=true){
  const step=Math.max(0,Math.min(dt,.05));
  const throttle=Number(Boolean(input.throttle)),brake=Number(Boolean(input.brake));
  const steer=Math.max(-1,Math.min(1,input.steer||0));
  let {x,z,heading,speed,steering=0}=state;
  const steeringTarget=steer*.53;
  steering+=(steeringTarget-steering)*(1-Math.exp(-9*step));
  const acceleration=throttle?13.5:0;
  const braking=brake?(speed>0?23:8):0;
  speed+=(acceleration-braking)*step;
  speed*=Math.exp(-(onRoad?.34:2.2)*step);
  speed=Math.max(-8,Math.min(onRoad?30:11,speed));
  if(!throttle&&!brake&&Math.abs(speed)<.12)speed=0;
  // Bicycle steering: turn radius follows the wheel angle, while high-speed grip
  // limits how quickly the kart can rotate and grass reduces that grip further.
  const yaw=speed/2.25*Math.tan(steering)*(onRoad?1:.57);
  const yawLimit=(onRoad?1.65:.76)*Math.max(.3,1-Math.abs(speed)/55);
  heading+=Math.max(-yawLimit,Math.min(yawLimit,yaw))*step;
  x+=Math.sin(heading)*speed*step;
  z+=Math.cos(heading)*speed*step;
  return {x,z,heading,speed,steering};
}
