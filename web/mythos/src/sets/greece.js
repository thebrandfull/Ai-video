// Greece: Doric temple on a stepped stylobate, cypresses, fallen column drums, the Aegean.
import { v3, deg, lerp, rng, cylinder, cone, box, boxC, ellipsoid, extrude, disc, lookMat } from '../core/geo.js';

const MARBLE = '#e8f4ff', MARBLE2 = '#bcd6ef', CYPRESS = '#3fa36b', OLIVE = '#9fd8a0', GOLD = '#ffd27a', SUN = '#fff3c4';

function column(parts, pos, h = 5.2, r = 0.4) {
  const P = v3(...pos);
  parts.add(cylinder(r * 0.9, h, 20, r * 0.78), { color: MARBLE, pos: P });
  parts.add(cylinder(r * 0.8, 0.28, 20, r * 1.1), { color: MARBLE, pos: [P.x, P.y + h - 0.05, P.z] });
  parts.add(box(r * 2.4, 0.22, r * 2.4), { color: MARBLE, pos: [P.x, P.y + h + 0.2, P.z] });
}
function temple(parts, { pos, cols = 6, rows = 11, h = 5.2 }) {
  const P = v3(...pos), dx = 2.1, dz = 2.1, W = (cols - 1) * dx, D = (rows - 1) * dz;
  for (let s = 0; s < 3; s++) parts.add(box(W + 4 - s * 0.7, 0.32, D + 4 - s * 0.7), { color: MARBLE2, pos: [P.x, P.y + s * 0.32, P.z] });
  const y = P.y + 0.96;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    if (i > 0 && i < cols - 1 && j > 0 && j < rows - 1) continue;
    column(parts, [P.x - W / 2 + i * dx, y, P.z - D / 2 + j * dz], h);
  }
  parts.add(box(W + 2.2, 0.9, D + 2.2), { color: MARBLE, pos: [P.x, y + h + 0.42, P.z] });
  for (let i = 0; i < cols * 2 - 1; i++) parts.add(boxC(0.45, 0.6, 0.12), { color: MARBLE2, pos: [P.x - W / 2 + i * dx * 0.5, y + h + 0.9, P.z - D / 2 - 1.05] });
  for (const sz of [1, -1]) parts.add(extrude([[-(W + 2.4) / 2, 0], [(W + 2.4) / 2, 0], [0, 1.9]], 0.5), { color: MARBLE, pos: [P.x, y + h + 1.32, P.z + sz * (D / 2 + 0.85)] });
  parts.add(extrude([[-(W + 2.6) / 2, 0], [(W + 2.6) / 2, 0], [0, 2.0]], D + 1.4), { color: MARBLE2, pos: [P.x, y + h + 1.3, P.z] });
  parts.add(boxC(2.2, 2.2, 1.2), { color: GOLD, glow: 0.4, pos: [P.x, y + 1.6, P.z] }); // altar / cult statue plinth
}

export default {
  key: 'greece', country: 'Greece',
  palette: { floor: '#1a5a8a', accent: '#9fd8ff', skyTop: '#04102a', skyHorizon: '#123a66', skyBottom: '#03070f', stars: 1, nebula: 0.35, water: 1 },
  ambient: { color: '#bfe8ff', vel: [0.1, 0.06, 0], size: 2, flutter: 0.3, intensity: 0.35 },
  material: { tint: '#dde9f5', edge: '#ffffff', fill: 0.24, fresnelStr: 0.7, scan: 0.15 },
  build(parts) {
    const rand = rng(9);
    temple(parts, { pos: [0, 0, -16], cols: 6, rows: 9 });
    for (let i = 0; i < 12; i++) {
      const x = (rand() - 0.5) * 60, z = -8 - rand() * 30, h = 5 + rand() * 6;
      if (Math.abs(x) < 10) continue;
      parts.add(ellipsoid(0.7, h, 0.7, 10, 10), { color: CYPRESS, pos: [x, h, z] });
      parts.add(cylinder(0.12, 1.2, 6), { color: CYPRESS, pos: [x, 0, z] });
    }
    for (let i = 0; i < 4; i++) { // olive trees
      const x = i < 2 ? -11 - i * 4 : 11 + (i - 2) * 4, z = -4 + rand() * 3;
      parts.add(cylinder(0.3, 1.6, 8, 0.22), { color: '#b89a6a', pos: [x, 0, z] });
      for (let k = 0; k < 6; k++) parts.add(ellipsoid(0.9, 0.55, 0.9, 10, 6), { color: OLIVE, pos: [x + (rand() - 0.5) * 1.8, 1.8 + rand() * 1.1, z + (rand() - 0.5) * 1.8] });
    }
    // fallen column drums
    for (let i = 0; i < 5; i++) parts.add(cylinder(0.42, 1.3, 20), { color: MARBLE2, pos: [-10 + i * 0.9, 0.42, -3 + rand() * 2], rot: [Math.PI / 2, 0, rand() * 0.8] });
    column(parts, [10.5, 0, 1], 3.4);
    parts.add(cylinder(0.42, 0.6, 20), { color: MARBLE2, pos: [-10.5, 0, 1] });
    // low sun over the sea
    parts.add(disc(3.8, 48), { color: SUN, glow: 0.35, matrix: lookMat([-22, 6, -42], [0, 2, 0]) });
    // islands on the horizon
    for (let i = 0; i < 5; i++) { const a = lerp(-1.4, 1.4, i / 4) + Math.PI, d = 44 + rand() * 6, h = 2.5 + rand() * 3; parts.add(ellipsoid(6 + rand() * 4, h, 4, 12, 8), { color: '#3a6a9a', pos: [Math.sin(a) * d, 0, Math.cos(a) * d] }); }
  },
};
