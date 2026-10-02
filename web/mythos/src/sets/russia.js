// Russia: onion-domed cathedral, Kremlin wall and tower, birches in falling snow.
import { v3, deg, lerp, rng, cylinder, cone, box, boxC, ellipsoid, lathe, pyramid, torus } from '../core/geo.js';

const BRICK = '#ff5a5a', WHITE = '#f4f8ff', GOLD = '#ffd27a', GREEN = '#4fd28a', BLUE = '#5a8aff', TEAL = '#5ae0d2', STAR = '#ff4f6a', BIRCH = '#f0f4ff';

function onion(parts, pos, s, color) {
  const P = v3(...pos);
  parts.add(lathe([[0.55 * s, 0], [0.8 * s, 0.25 * s], [0.78 * s, 0.6 * s], [0.52 * s, 1.0 * s], [0.22 * s, 1.3 * s], [0.08 * s, 1.5 * s], [0.0, 1.7 * s]], 20), { color, pos: P });
  parts.add(torus(0.8 * s, 0.04 * s, 6, 24), { color: GOLD, pos: [P.x, P.y + 0.25 * s, P.z], rot: [Math.PI / 2, 0, 0] });
  parts.add(boxC(0.05 * s, 0.6 * s, 0.05 * s), { color: GOLD, glow: 0.4, pos: [P.x, P.y + 1.95 * s, P.z] });
  parts.add(boxC(0.3 * s, 0.05 * s, 0.05 * s), { color: GOLD, glow: 0.4, pos: [P.x, P.y + 2.05 * s, P.z] });
}
function tower(parts, pos, r, h, color, domeColor, domeS = 1) {
  const P = v3(...pos);
  parts.add(cylinder(r, h, 12), { color, pos: P });
  for (let k = 0; k < 8; k++) parts.add(box(0.5, 0.9, 0.12), { color: WHITE, pos: [P.x + Math.cos((k / 8) * Math.PI * 2) * r, P.y + h - 1.4, P.z + Math.sin((k / 8) * Math.PI * 2) * r], rot: [0, -(k / 8) * Math.PI * 2, 0] });
  parts.add(cylinder(r * 0.8, 0.6, 12), { color: WHITE, pos: [P.x, P.y + h, P.z] });
  onion(parts, [P.x, P.y + h + 0.6, P.z], domeS, domeColor);
}

export default {
  key: 'russia', country: 'Russia',
  palette: { floor: '#1a2e6a', accent: '#ffd27a', skyTop: '#060a24', skyHorizon: '#2a1a4a', skyBottom: '#03040a', stars: 1.3, nebula: 0.4 },
  ambient: { color: '#eaf4ff', vel: [0.25, -0.55, 0.1], size: 2.6, flutter: 0.45, intensity: 0.75 },
  material: { tint: '#e0e4f0', edge: '#ffd27a', fill: 0.24, fresnelStr: 0.7, scan: 0.15 },
  build(parts) {
    const rand = rng(31);
    const P = v3(0, 0, -33);
    parts.add(box(14, 1.2, 14), { color: WHITE, pos: P });
    parts.add(box(9, 3.5, 9), { color: BRICK, pos: [P.x, 1.2, P.z] });
    // central tented tower
    parts.add(cylinder(2.0, 6, 8), { color: BRICK, pos: [P.x, 4.7, P.z] });
    parts.add(cone(2.3, 4.0, 8), { color: GREEN, pos: [P.x, 10.5, P.z] });
    onion(parts, [P.x, 14.4, P.z], 0.7, GOLD);
    // surrounding domed towers
    const specs = [[-4.2, -4.2, 1.5, 6.5, BLUE, 1.5], [4.2, -4.2, 1.5, 7.0, GREEN, 1.6], [-4.2, 4.2, 1.5, 6.0, TEAL, 1.5], [4.2, 4.2, 1.5, 6.5, STAR, 1.55], [0, 5.6, 1.1, 5.0, GOLD, 1.2], [0, -5.6, 1.1, 5.5, BLUE, 1.2], [5.6, 0, 1.1, 5.0, GREEN, 1.2], [-5.6, 0, 1.1, 5.5, TEAL, 1.2]];
    for (const [x, z, r, h, c, ds] of specs) tower(parts, [P.x + x, 1.2, P.z + z], r, h, BRICK, c, ds);
    // Kremlin wall with swallowtail merlons + corner tower with a star
    for (const sx of [1, -1]) {
      parts.add(box(16, 3.2, 1.2), { color: BRICK, pos: [sx * 17, 0, -10] });
      for (let k = 0; k < 14; k++) { parts.add(box(0.45, 0.8, 0.5), { color: BRICK, pos: [sx * 17 - 7.5 + k * 1.15, 3.2, -10] }); parts.add(box(0.45, 0.8, 0.5), { color: BRICK, pos: [sx * 17 - 7.5 + k * 1.15 + 0.5, 3.2, -10] }); }
      parts.add(cylinder(1.5, 7, 8), { color: BRICK, pos: [sx * 25, 0, -9] });
      parts.add(cone(1.8, 4, 8), { color: GREEN, pos: [sx * 25, 7, -9] });
      parts.add(ellipsoid(0.35, 0.35, 0.1, 10, 8), { color: STAR, glow: 1.2, pos: [sx * 25, 11.4, -9] });
    }
    // birch trees
    for (let i = 0; i < 14; i++) {
      const x = (rand() - 0.5) * 50, z = -3 - rand() * 20;
      if (Math.abs(x) < 9) continue;
      const h = 5 + rand() * 4;
      parts.add(cylinder(0.14, h, 6, 0.06), { color: BIRCH, pos: [x, 0, z] });
      for (let k = 0; k < 5; k++) parts.add(boxC(0.3, 0.12, 0.3), { color: '#2a2a3a', pos: [x, 0.8 + k * (h / 6), z] });
      for (let k = 0; k < 4; k++) parts.add(cylinder(0.04, 1.6 + rand(), 4, 0.01), { color: BIRCH, pos: [x, h * 0.55 + k * h * 0.1, z], rot: [(rand() - 0.5) * 1.2, rand() * 6, (rand() - 0.5) * 1.2] });
    }
    // snow mounds
    for (let i = 0; i < 6; i++) parts.add(ellipsoid(2 + rand() * 2, 0.5, 2 + rand() * 2, 10, 5), { color: WHITE, pos: [(rand() - 0.5) * 36, 0, -4 - rand() * 14] });
  },
};
