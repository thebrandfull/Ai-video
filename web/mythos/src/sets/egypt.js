// Egypt: pyramids of Giza, an obelisk, dunes, palms by the Nile, a setting sun.
import { v3, deg, lerp, rng, cylinder, cone, box, boxC, pyramid, ellipsoid, lathe, disc, tube, curve, taper, lookMat } from '../core/geo.js';

const SAND = '#f0c78a', STONE = '#ffd9a0', GOLD = '#ffd27a', SUN = '#ffb347', PALM = '#6fd28a', TRUNK = '#c9a06a', NILE = '#3a7bd5';

function palm(parts, pos, rand, s = 1) {
  const P = v3(...pos);
  const trunk = curve([P, P.clone().add(v3(0.3 * s, 2.2 * s, 0)), P.clone().add(v3(0.5 * s, 4.4 * s, 0.1 * s))]);
  parts.add(tube(trunk, { segments: 12, radial: 8, radius: taper(0.22 * s, 0.12 * s), caps: true }), { color: TRUNK });
  const top = trunk.getPointAt(1);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + rand() * 0.3, d = v3(Math.cos(a), 0.5, Math.sin(a)).normalize();
    const c = curve([top, top.clone().addScaledVector(d, 1.1 * s), top.clone().addScaledVector(d, 2.2 * s).add(v3(0, -0.9 * s, 0))]);
    parts.add(tube(c, { segments: 8, radial: 6, radius: (t) => 0.25 * s * Math.pow(Math.sin(Math.PI * (0.1 + 0.9 * t)), 0.5), squash: () => [0.15, 1], caps: true, up: [0, 1, 0] }), { color: PALM });
  }
}

export default {
  key: 'egypt', country: 'Egypt',
  palette: { floor: '#7a5a1a', accent: '#ffd27a', skyTop: '#1a0a2a', skyHorizon: '#8a3a1a', skyBottom: '#0a0405', stars: 0.5, nebula: 0.3 },
  ambient: { color: '#ffd9a0', vel: [-0.9, -0.05, 0.2], size: 1.6, flutter: 0.2, intensity: 0.45 },
  material: { tint: '#e8dcc8', edge: '#ffd27a', fill: 0.24, fresnelStr: 0.7, scan: 0.15 },
  build(parts) {
    const rand = rng(17);
    parts.add(pyramid(26, 16), { color: STONE, pos: [-6, 0, -42], rot: [0, deg(12), 0] });
    parts.add(pyramid(20, 12.5), { color: STONE, pos: [16, 0, -34], rot: [0, deg(8), 0] });
    parts.add(pyramid(11, 7), { color: STONE, pos: [-24, 0, -28], rot: [0, deg(-10), 0] });
    parts.add(pyramid(1.6, 1.6), { color: GOLD, glow: 0.4, pos: [-6, 16, -42], rot: [0, deg(12), 0] });
    // obelisk
    parts.add(cylinder(0.55, 9, 4, 0.32), { color: STONE, pos: [-9, 0, -8], rot: [0, Math.PI / 4, 0] });
    parts.add(pyramid(0.64, 0.8, 4), { color: GOLD, glow: 0.5, pos: [-9, 9, -8] });
    parts.add(box(2.2, 0.8, 2.2), { color: STONE, pos: [-9, 0, -8] });
    // dunes
    for (let i = 0; i < 9; i++) { const a = lerp(-1.4, 1.4, i / 8) + Math.PI, d = 22 + rand() * 14, w = 8 + rand() * 8; parts.add(lathe([[0, 1.6 + rand() * 1.5], [w * 0.5, 0.9], [w, 0]], 14), { color: SAND, pos: [Math.sin(a) * d, 0, Math.cos(a) * d] }); }
    // the Nile and palms along it
    parts.add(box(9, 0.06, 70), { color: NILE, glow: 0.15, pos: [24, 0, -20], rot: [0, deg(8), 0] });
    for (let k = 0; k < 7; k++) palm(parts, [19 - k * 0.3, 0, 2 - k * 5], rand, 0.9 + rand() * 0.4);
    for (let k = 0; k < 3; k++) palm(parts, [-15 + k * 2.5, 0, -6 + k * 1.5], rand, 0.8 + rand() * 0.3);
    // setting sun with rays
    parts.add(disc(4.5, 48), { color: SUN, glow: 0.5, matrix: lookMat([10, 7, -60], [0, 2, 0]) });
    for (let k = 0; k < 9; k++) { const a = lerp(-0.9, 0.9, k / 8) + Math.PI / 2; parts.add(boxC(0.3, 14, 0.3), { color: SUN, glow: 0.15, pos: [10 + Math.cos(a) * 11, 7 + Math.sin(a) * 11, -60], rot: [0, 0, a - Math.PI / 2] }); }
    // sphinx-era temple pylons at the front edges
    for (const sx of [1, -1]) {
      parts.add(cylinder(1.3, 5.5, 4, 0.9), { color: STONE, pos: [sx * 11, 0, -13], rot: [0, Math.PI / 4, 0] });
      parts.add(box(1.4, 1.8, 0.6), { color: GOLD, glow: 0.3, pos: [sx * 11, 1.2, -12.3] });
    }
  },
};
