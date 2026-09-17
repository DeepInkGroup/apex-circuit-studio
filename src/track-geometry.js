import * as THREE from 'three';
import ClipperLib from 'clipper-lib';

const SCALE = 1000;
const EPS = 1e-7;
const toInt = p => ({X: Math.round(p.x * SCALE), Y: Math.round(p.z * SCALE)});
const fromInt = p => ({x: p.X / SCALE, z: p.Y / SCALE});
const cross = (a, b) => a.x * b.z - a.z * b.x;
const sub = (a, b) => ({x: a.x - b.x, z: a.z - b.z});
const length = v => Math.hypot(v.x, v.z);
const distance = (a, b) => length(sub(a, b));

// Refine where the spline bends, while also limiting the longest straight span.
// Duplicate and near-coincident control points are collapsed before offsetting.
export function adaptiveCenterline(curve, closed, {maxStep = 1.25, maxError = .055, maxAngle = .095} = {}) {
  const chunks = Math.max(8, curve.points.length * 4);
  const result = [];
  const push = p => {
    const q = {x: p.x, z: p.z};
    if (!result.length || distance(result.at(-1), q) > .015) result.push(q);
  };
  const visit = (a, b, pa, pb, depth) => {
    const m = (a + b) / 2, pm = curve.getPointAt(m);
    const ab = sub({x: pb.x, z: pb.z}, {x: pa.x, z: pa.z});
    const left = sub({x: pm.x, z: pm.z}, {x: pa.x, z: pa.z});
    const right = sub({x: pb.x, z: pb.z}, {x: pm.x, z: pm.z});
    const error = length(ab) > EPS ? Math.abs(cross(ab, left)) / length(ab) : length(left);
    const angle = Math.atan2(Math.abs(cross(left, right)), left.x * right.x + left.z * right.z);
    if (depth < 11 && (length(ab) > maxStep || error > maxError || angle > maxAngle)) {
      visit(a, m, pa, pm, depth + 1);
      visit(m, b, pm, pb, depth + 1);
    } else push(pb);
  };
  push(curve.getPointAt(0));
  for (let i = 0; i < chunks; i++) visit(i / chunks, (i + 1) / chunks, curve.getPointAt(i / chunks), curve.getPointAt((i + 1) / chunks), 0);
  if (closed && result.length > 1 && distance(result[0], result.at(-1)) < .015) result.pop();
  return result;
}

// Intersect neighboring offset lines at ordinary bends. Bevel the join when
// the miter exceeds the configured limit or a hairpin reverses direction.
export function offsetPolyline(points, offset, {closed = true, miterLimit = 2} = {}) {
  if (points.length < 2) return [];
  const out = [];
  const n = points.length;
  const segment = (a, b) => {
    const d = sub(b, a), l = length(d);
    return l < EPS ? null : {direction: {x: d.x / l, z: d.z / l}, normal: {x: -d.z / l, z: d.x / l}};
  };
  for (let i = 0; i < n; i++) {
    const prev = i ? segment(points[i - 1], points[i]) : closed ? segment(points[n - 1], points[0]) : null;
    const next = i < n - 1 ? segment(points[i], points[i + 1]) : closed ? segment(points[n - 1], points[0]) : null;
    const p = points[i];
    if (!prev && !next) continue;
    if (!prev || !next) {
      const normal = (prev || next).normal;
      out.push({x: p.x + normal.x * offset, z: p.z + normal.z * offset});
      continue;
    }
    const a = {x: p.x + prev.normal.x * offset, z: p.z + prev.normal.z * offset};
    const b = {x: p.x + next.normal.x * offset, z: p.z + next.normal.z * offset};
    const denom = cross(prev.direction, next.direction);
    const t = Math.abs(denom) > EPS ? cross(sub(b, a), next.direction) / denom : NaN;
    const join = {x: a.x + prev.direction.x * t, z: a.z + prev.direction.z * t};
    if (Number.isFinite(t) && distance(p, join) <= Math.abs(offset) * miterLimit &&
        prev.direction.x * next.direction.x + prev.direction.z * next.direction.z > -.97) out.push(join);
    else {out.push(a);if (distance(a, b) > .001) out.push(b);}
  }
  return out;
}

function execute(subject, clip, type, clean = true) {
  const c = new ClipperLib.Clipper();
  c.StrictlySimple = true;
  if (subject.length) c.AddPaths(subject, ClipperLib.PolyType.ptSubject, true);
  if (clip.length) c.AddPaths(clip, ClipperLib.PolyType.ptClip, true);
  const tree = new ClipperLib.PolyTree();
  c.Execute(type, tree, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
  if(!clean)return {tree,paths:ClipperLib.Clipper.ClosedPathsFromPolyTree(tree)};
  const cleaned = ClipperLib.Clipper.CleanPolygons(ClipperLib.Clipper.ClosedPathsFromPolyTree(tree), 3);
  const canonical = new ClipperLib.Clipper();
  canonical.StrictlySimple = true;
  if (cleaned.length) canonical.AddPaths(cleaned, ClipperLib.PolyType.ptSubject, true);
  const cleanTree = new ClipperLib.PolyTree();
  canonical.Execute(ClipperLib.ClipType.ctUnion, cleanTree, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
  return {tree:cleanTree, paths: ClipperLib.Clipper.ClosedPathsFromPolyTree(cleanTree)};
}

// Boolean difference makes the curb wholly external to the repaired road.
// The inner opening may collapse at a hairpin; no spike survives this repair.
function bufferCenterline(points, closed, radius, miterLimit, simple) {
  if(simple){
    const left=offsetPolyline(points,radius,{closed,miterLimit});
    const right=offsetPolyline(points,-radius,{closed,miterLimit});
    if(!closed)return execute([[...left,...right.reverse()].map(toInt)],[],ClipperLib.ClipType.ctUnion);
    const winding=points.reduce((sum,p,i)=>sum+cross(p,points[(i+1)%points.length]),0);
    const outer=winding>0?right:left,inner=winding>0?left:right;
    const outerRegion=execute([outer.map(toInt)],[],ClipperLib.ClipType.ctUnion);
    const innerRegion=execute([inner.map(toInt)],[],ClipperLib.ClipType.ctUnion);
    return execute(outerRegion.paths,innerRegion.paths,ClipperLib.ClipType.ctDifference);
  }
  // A crossing centerline has no meaningful interior side. Offset the line
  // as a whole and union the result so both arms remain drivable.
  const offset = new ClipperLib.ClipperOffset(miterLimit, 40);
  offset.AddPath(points.map(toInt), ClipperLib.JoinType.jtMiter, closed ? ClipperLib.EndType.etClosedLine : ClipperLib.EndType.etOpenButt);
  const raw = new ClipperLib.Paths();
  offset.Execute(raw, Math.round(radius * SCALE));
  return execute(raw, [], ClipperLib.ClipType.ctUnion);
}

function expandRegion(paths, amount) {
  const offset=new ClipperLib.ClipperOffset(2,1);
  offset.AddPaths(paths,ClipperLib.JoinType.jtRound,ClipperLib.EndType.etClosedPolygon);
  const raw=new ClipperLib.Paths();offset.Execute(raw,Math.round(amount*SCALE));
  return execute(raw,[],ClipperLib.ClipType.ctUnion);
}

function pathsToContours(tree) {
  const polygons = [];
  function walk(node) {
    if (!node.IsHole() && node.Contour().length >= 3) {
      polygons.push({outer: node.Contour().map(fromInt), holes: node.Childs().filter(child => child.IsHole()).map(child => child.Contour().map(fromInt))});
    }
    node.Childs().forEach(walk);
  }
  tree.Childs().forEach(walk);
  return polygons;
}

function makeSurface(polygons, y, {uvScale = .2, uvBox = null} = {}) {
  const positions = [], uvs = [], indices = [];
  let rejected = 0;
  function triangle(a, b, c) {
    const signed = cross(sub(b, a), sub(c, a));
    const area = Math.abs(signed) / 2;
    if (area < 1e-5 || !Number.isFinite(area)) {rejected++;return;}
    const ordered = signed > 0 ? [a,c,b] : [a,b,c]; // Clockwise in X/Z gives an upward Y normal.
    const start = positions.length / 3;
    for (const p of ordered) {
      positions.push(p.x, y, p.z);
      uvs.push(uvBox ? (p.x-uvBox.minX)/uvBox.width : p.x*uvScale, uvBox ? (p.z-uvBox.minZ)/uvBox.height : p.z*uvScale);
    }
    indices.push(start,start+1,start+2);
  }
  for (const polygon of polygons) {
    const outer = polygon.outer.map(p=>new THREE.Vector2(p.x,p.z));
    const holes = polygon.holes.map(h=>h.map(p=>new THREE.Vector2(p.x,p.z)));
    const vertices = polygon.outer.concat(...polygon.holes);
    const faces = THREE.ShapeUtils.triangulateShape(outer, holes);
    for (const [i,j,k] of faces) triangle(vertices[i],vertices[j],vertices[k]);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs,2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.userData = {rejectedTriangles:rejected};
  return geometry;
}

function segmentCrossing(a,b,c,d) {
  const r=sub(b,a),s=sub(d,c),denom=cross(r,s);
  if(Math.abs(denom)<EPS)return null;
  const diff=sub(c,a),t=cross(diff,s)/denom,u=cross(diff,r)/denom;
  return t>1e-5&&t<1-1e-5&&u>1e-5&&u<1-1e-5?{x:a.x+r.x*t,z:a.z+r.z*t}:null;
}
export function intersections(path, closed = true) {
  const found=[],count=closed?path.length:path.length-1;
  for(let i=0;i<count;i++)for(let j=i+2;j<count;j++){
    if(closed&&i===0&&j===count-1)continue;
    const p=segmentCrossing(path[i],path[(i+1)%path.length],path[j],path[(j+1)%path.length]);
    if(p&&!found.some(q=>distance(p,q)<.03))found.push(p);
  }
  return found;
}

export function buildTrackGeometry(curve, {closed = true, width = 8, curbWidth = .9, runoffWidth = 1.1, miterLimit = 2, debug = false} = {}) {
  const centerline = adaptiveCenterline(curve,closed);
  if(centerline.length<2)return null;
  const radius=width/2;
  const simple=intersections(centerline,closed).length===0;
  const road=bufferCenterline(centerline,closed,radius,miterLimit,simple);
  const curbOuter=bufferCenterline(centerline,closed,radius+curbWidth,miterLimit,simple);
  const shoulder=bufferCenterline(centerline,closed,radius+curbWidth+runoffWidth,miterLimit,simple);
  const whiteInner=bufferCenterline(centerline,closed,Math.max(.2,radius-.3),miterLimit,simple);
  const roadClearance=expandRegion(road.paths,.006);
  const curb=execute(curbOuter.paths,roadClearance.paths,ClipperLib.ClipType.ctDifference);
  const white=execute(road.paths,whiteInner.paths,ClipperLib.ClipType.ctDifference);
  const result={
    centerline,
    road:makeSurface(pathsToContours(road.tree),.045),
    shoulder:makeSurface(pathsToContours(shoulder.tree),.012),
    white:makeSurface(pathsToContours(white.tree),.065),
    curb:makeSurface(pathsToContours(curb.tree),.085,{uvBox:{minX:-135,minZ:-105,width:270,height:210}}),
    boundaries:pathsToContours(road.tree),
    curbEdges:pathsToContours(curb.tree),
    roadPaths:road.paths,
    curbPaths:curb.paths,
    outerPaths:shoulder.paths,
    intersectionPoints:[],
  };
  if(debug){
    const left=offsetPolyline(centerline,radius,{closed,miterLimit});
    const right=offsetPolyline(centerline,-radius,{closed,miterLimit});
    result.leftBoundary=left;
    result.rightBoundary=right;
    result.intersectionPoints=[...intersections(left,closed),...intersections(right,closed)];
  }
  return result;
}
