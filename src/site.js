export const SITE_SCALES=[1,2,3];

export function siteBounds(scale=1){
  const size=SITE_SCALES.includes(Number(scale))?Number(scale):1;
  return {minX:-105*size,maxX:105*size,minZ:-78*size,maxZ:45*size,scale:size};
}

export function pointInsideSite(point,scale=1){
  const b=siteBounds(scale);
  return point[0]>=b.minX&&point[0]<=b.maxX&&point[1]>=b.minZ&&point[1]<=b.maxZ;
}

export function clampToSite(point,scale=1){
  const b=siteBounds(scale);
  return [Math.max(b.minX,Math.min(b.maxX,point[0])),Math.max(b.minZ,Math.min(b.maxZ,point[1]))];
}
