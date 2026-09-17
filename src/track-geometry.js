import * as THREE from 'three';

// A curb is one mesh per side. Each color band follows the centerline in
// small steps, so it meets the next band cleanly even around tight corners.
export function makeCurbGeometry(curve, length, width, side) {
  const bands = Math.max(1, Math.ceil(length / 2));
  const stepsPerBand = 3;
  const positions = [];
  const colors = [];
  const indices = [];
  const red = new THREE.Color('#c84c39');
  const cream = new THREE.Color('#eee8d9');
  const inner = side < 0 ? -width / 2 - .88 : width / 2 - .04;
  const outer = side < 0 ? -width / 2 + .04 : width / 2 + .88;

  for (let band = 0; band < bands; band++) {
    const color = band % 2 ? cream : red;
    const start = positions.length / 3;
    for (let step = 0; step <= stepsPerBand; step++) {
      const t = (band + step / stepsPerBand) / bands;
      const p = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t);
      const nx = -tangent.z;
      const nz = tangent.x;
      for (const offset of [inner, outer]) {
        positions.push(p.x + nx * offset, .085, p.z + nz * offset);
        colors.push(color.r, color.g, color.b);
      }
      if (step < stepsPerBand) {
        const j = start + step * 2;
        indices.push(j, j + 1, j + 2, j + 1, j + 3, j + 2);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
