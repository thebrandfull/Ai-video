// Scotland: castle on a crag, standing stones, a loch bridge, thistles in the mist.
import { v3, deg, lerp, rng, cylinder, cone, box, boxC, ellipsoid, lathe, torus, alongY } from '../core/geo.js';

const STONE = '#9fb4c8', STONE2 = '#c8d8e8', ROCK = '#5a6a7a', HILL = '#2f7a5a', THISTLE = '#b48cff', GREEN = '#6fd28a', FLAG = '#5a8aff';

function castleTower(parts, pos, r, h) {
  const P = v3(...pos);
  parts.add(cylinder(r, h, 14), { color: STONE, pos: P });
  parts.add(cylinder(r * 1.15, 0.5, 14), { color: STONE2, pos: [P.x, P.y + h, P.z] });
  for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; parts.add(box(0.5, 0.6, 0.35), { color: STONE2, pos: [P.x + Math.cos(a) * r * 1.0, P.y + h + 0.5, P.z + Math.sin(a) * r], rot: [0, -a, 0] }); }
  parts.add(cone(r * 0.9, h * 0.45, 14), { color: '#6a7a9a', pos: [P.x, P.y + h + 0.6, P.z] });
}
function wall(parts, a, b, h = 3) {
  const A = v3(...a), B = v3(...b), d = B.clone().sub(A), len = d.length(), mid = A.clone().lerp(B, 0.5);
  const ry = Math.atan2(d.x, d.z);
  parts.add(box(1.0, h, len), { color: STONE, pos: mid, rot: [0, ry, 0] });
  const n = Math.floor(len / 1.1);
  for (let k = 0; k < n; k++) parts.add(box(1.0, 0.6, 0.5), { color: STONE2, pos: A.clone().lerp(B, (k + 0.5) / n).add(v3(0, h, 0)), rot: [0, ry, 0] });
}

export default {
  key: 'scotland', country: 'Scotland',
  palette: { floor: '#1e4a3a', accent: '#b48cff', skyTop: '#0a1226', skyHorizon: '#2a3a5a', skyBottom: '#04060a', stars: 0.8, nebula: 0.7, water: 0.6 },
  ambient: { color: '#cfe0ff', vel: [0.35, 0.02, 0.1], size: 3.5, flutter: 0.5, intensity: 0.35 },
  material: { tint: '#dde6f0', edge: '#c9a6ff', fill: 0.24, fresnelStr: 0.7, scan: 0.15 },
  build(parts) {
    const rand = rng(41);
    // crag + castle
    const C = v3(0, 0, -38);
    parts.add(lathe([[0, 6.5], [5, 6.2], [7.5, 4.5], [9.5, 2], [11.5, 0]], 16), { color: ROCK, pos: C });
    parts.add(box(9, 6, 7), { color: STONE, pos: [C.x, 6.5, C.z] });
    for (let k = 0; k < 8; k++) parts.add(box(0.7, 0.7, 0.6), { color: STONE2, pos: [C.x - 4 + k * 1.15, 12.5, C.z - 3.5] });
    castleTower(parts, [C.x - 4.5, 6.5, C.z - 3.5], 1.6, 7.5); castleTower(parts, [C.x + 4.5, 6.5, C.z - 3.5], 1.6, 8.5);
    castleTower(parts, [C.x - 4.5, 6.5, C.z + 3.5], 1.3, 6.5); castleTower(parts, [C.x + 4.5, 6.5, C.z + 3.5], 1.3, 6.0);
    castleTower(parts, [C.x, 12.5, C.z - 1], 1.0, 4.5);
    parts.add(cylinder(0.06, 2.5, 5), { color: STONE2, pos: [C.x, 19.7, C.z - 1] });
    parts.add(box(1.6, 1.0, 0.05), { color: FLAG, glow: 0.4, pos: [C.x + 0.8, 21.0, C.z - 1] });
    wall(parts, [C.x - 4.5, 6.5, C.z - 3.5], [C.x + 4.5, 6.5, C.z - 3.5], 3.5);
    for (let k = 0; k < 7; k++) parts.add(box(0.7, 1.0, 0.06), { color: '#ffd27a', glow: 0.5, pos: [C.x - 3 + k * 1.0, 8.5 + (k % 2) * 1.5, C.z - 3.49] });
    // standing stone circle
    for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI * 2; parts.add(box(0.9 + rand() * 0.5, 2.6 + rand() * 1.6, 0.5), { color: STONE, pos: [-12 + Math.cos(a) * 4.5, 0, -2 + Math.sin(a) * 4.5], rot: [0, -a + (rand() - 0.5) * 0.4, (rand() - 0.5) * 0.12] }); }
    parts.add(box(1.4, 4.8, 0.7), { color: STONE2, pos: [-12, 0, -2] });
    // hills
    for (let i = 0; i < 9; i++) { const a = lerp(-1.5, 1.5, i / 8) + Math.PI, d = 30 + rand() * 14, w = 10 + rand() * 10, h = 3 + rand() * 6; parts.add(lathe([[0, h], [w * 0.5, h * 0.7], [w, 0]], 14), { color: HILL, pos: [Math.sin(a) * d, 0, Math.cos(a) * d] }); }
    // stone bridge over the loch
    parts.add(torus(2.4, 0.45, 8, 32, Math.PI), { color: STONE, pos: [9, 0, 3], rot: [0, Math.PI / 2, 0] });
    parts.add(box(1.3, 0.3, 7.5), { color: STONE2, pos: [9, 2.55, 3] });
    for (let k = 0; k < 7; k++) for (const sx of [1, -1]) parts.add(box(0.2, 0.5, 0.35), { color: STONE2, pos: [9 + sx * 0.6, 2.85, -0.4 + k * 1.1] });
    // thistles
    for (let i = 0; i < 10; i++) {
      const a = rand() * Math.PI * 2, d = 4.6 + rand() * 4, x = Math.cos(a) * d, z = Math.sin(a) * d + 1, s = 0.7 + rand() * 0.6;
      parts.add(cylinder(0.03 * s, 1.0 * s, 5), { color: GREEN, pos: [x, 0, z] });
      parts.add(ellipsoid(0.16 * s, 0.2 * s, 0.16 * s, 8, 6), { color: GREEN, pos: [x, 1.05 * s, z] });
      for (let k = 0; k < 10; k++) { const b = (k / 10) * Math.PI * 2; parts.add(cone(0.02 * s, 0.32 * s, 4), { color: THISTLE, glow: 0.4, quat: alongY(v3(Math.cos(b) * 0.45, 1, Math.sin(b) * 0.45).normalize()), pos: [x, 1.2 * s, z] }); }
      for (let k = 0; k < 4; k++) parts.add(cone(0.05 * s, 0.4 * s, 4).scale(1, 1, 0.2), { color: GREEN, quat: alongY(v3(Math.cos(k * 1.6), 0.3, Math.sin(k * 1.6)).normalize()), pos: [x, 0.3 * s + k * 0.15 * s, z] });
    }
  },
};
