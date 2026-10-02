// Japan: torii gate, Mount Fuji, stone lanterns, sakura trees, a small shrine.
import { v3, deg, lerp, rng, cylinder, cone, box, boxC, torus, ellipsoid, lathe, pyramid, extrude, tube, curve, taper, alongY } from '../core/geo.js';

const RED = '#ff5a3c', WOOD = '#ff8a5a', STONE = '#9fd3ff', SNOW = '#ffffff', FUJI = '#6a7fd8', PINK = '#ffa9d2', TRUNK = '#b06a7a', LIGHT = '#ffe08a';

function torii(parts, { pos, h = 6, w = 6 }) {
  const P = v3(...pos);
  for (const sx of [1, -1]) {
    parts.add(cylinder(0.26, h, 12), { color: RED, pos: [P.x + sx * w * 0.5, P.y, P.z], rot: [0, 0, sx * deg(-2)] });
    parts.add(cylinder(0.4, 0.3, 12), { color: STONE, pos: [P.x + sx * w * 0.5, P.y, P.z] });
  }
  parts.add(box(w + 1.2, 0.35, 0.5), { color: RED, pos: [P.x, P.y + h - 0.15, P.z] }); // shimaki
  parts.add(box(w + 2.4, 0.3, 0.55), { color: RED, pos: [P.x, P.y + h + 0.2, P.z] });   // kasagi
  for (const sx of [1, -1]) parts.add(box(1.2, 0.3, 0.55), { color: RED, pos: [P.x + sx * (w * 0.5 + 1.4), P.y + h + 0.42, P.z], rot: [0, 0, sx * deg(16)] });
  parts.add(box(w + 0.4, 0.26, 0.42), { color: RED, pos: [P.x, P.y + h * 0.78, P.z] });  // nuki
  parts.add(box(0.5, 0.75, 0.2), { color: LIGHT, glow: 0.3, pos: [P.x, P.y + h * 0.8, P.z] }); // gakuzuka plaque
}
function stoneLantern(parts, pos) {
  const P = v3(...pos);
  parts.add(box(0.9, 0.3, 0.9), { color: STONE, pos: P });
  parts.add(cylinder(0.14, 1.3, 8), { color: STONE, pos: [P.x, P.y + 0.3, P.z] });
  parts.add(box(0.7, 0.2, 0.7), { color: STONE, pos: [P.x, P.y + 1.6, P.z] });
  parts.add(box(0.55, 0.55, 0.55), { color: LIGHT, glow: 0.5, pos: [P.x, P.y + 1.8, P.z] });
  parts.add(pyramid(1.3, 0.5, 4), { color: STONE, pos: [P.x, P.y + 2.35, P.z] });
  parts.add(ellipsoid(0.1, 0.14, 0.1, 8, 6), { color: STONE, pos: [P.x, P.y + 2.95, P.z] });
}
function sakura(parts, pos, rand, s = 1) {
  const P = v3(...pos);
  const trunk = curve([P, P.clone().add(v3(0.2 * s, 1.4 * s, 0)), P.clone().add(v3(-0.1 * s, 2.6 * s, 0.2 * s))]);
  parts.add(tube(trunk, { segments: 12, radial: 8, radius: taper(0.22 * s, 0.1 * s), caps: true }), { color: TRUNK });
  const top = trunk.getPointAt(1);
  for (let k = 0; k < 4; k++) {
    const a = k * 1.6 + rand();
    const b = curve([top, top.clone().add(v3(Math.cos(a) * 0.9 * s, 0.5 * s, Math.sin(a) * 0.9 * s)), top.clone().add(v3(Math.cos(a) * 1.7 * s, 0.9 * s, Math.sin(a) * 1.7 * s))]);
    parts.add(tube(b, { segments: 8, radial: 6, radius: taper(0.09 * s, 0.03 * s), caps: true }), { color: TRUNK });
  }
  for (let k = 0; k < 22; k++) {
    const a = rand() * Math.PI * 2, r = rand() * 2.2 * s, y = 2.4 * s + rand() * 1.6 * s - r * 0.2;
    parts.add(ellipsoid((0.45 + rand() * 0.4) * s, (0.3 + rand() * 0.2) * s, (0.45 + rand() * 0.4) * s, 10, 6), { color: PINK, glow: 0.1, pos: [top.x + Math.cos(a) * r, y, top.z + Math.sin(a) * r] });
  }
}

export default {
  key: 'japan', country: 'Japan',
  palette: { floor: '#6b2d5c', accent: '#ff8fb8', skyTop: '#120820', skyHorizon: '#4a1a4a', skyBottom: '#06020a', stars: 1, nebula: 0.4 },
  ambient: { color: '#ffb3d1', vel: [0.35, -0.4, 0.1], size: 3, flutter: 0.6, intensity: 0.7 },
  material: { tint: '#d8d0e8', edge: '#ff9fcf', fill: 0.22, fresnelStr: 0.7, scan: 0.15 },
  build(parts) {
    const rand = rng(5);
    torii(parts, { pos: [0, 0, -9], h: 6.5, w: 6 });
    // Fuji with snow cap
    parts.add(lathe([[0, 15], [1.6, 14.6], [4.5, 11], [9, 6], [15, 2], [20, 0]], 28), { color: FUJI, pos: [-6, 0, -48] });
    parts.add(lathe([[0, 15.1], [1.7, 14.7], [3.6, 12.4], [4.4, 11.6], [3.2, 12.2], [2.0, 13.3]], 28), { color: SNOW, glow: 0.15, pos: [-6, 0, -48] });
    for (let i = 0; i < 6; i++) { const a = lerp(-1.3, 1.3, i / 5) + Math.PI, d = 34 + rand() * 8, h = 4 + rand() * 4, w = 4 + rand() * 4; parts.add(lathe([[0, h], [w * 0.5, h * 0.6], [w, 0]], 12), { color: FUJI, pos: [Math.sin(a) * d, 0, Math.cos(a) * d] }); }
    stoneLantern(parts, [-3.6, 0, -6]); stoneLantern(parts, [3.6, 0, -6]); stoneLantern(parts, [-6.5, 0, 1.5]); stoneLantern(parts, [6.5, 0, 1.5]);
    sakura(parts, [-9, 0, -3], rand, 1.2); sakura(parts, [9.5, 0, -2], rand, 1.1); sakura(parts, [-12, 0, -11], rand, 1.4); sakura(parts, [12, 0, -10], rand, 1.3); sakura(parts, [13, 0, 3], rand, 0.9);
    // small shrine behind the torii
    parts.add(box(3.2, 0.6, 2.6), { color: STONE, pos: [0, 0, -15] });
    parts.add(box(2.6, 2.2, 2.0), { color: WOOD, pos: [0, 0.6, -15] });
    parts.add(extrude([[-2.2, 0], [2.2, 0], [0, 1.5]], 3.0), { color: RED, pos: [0, 2.8, -15] });
    parts.add(box(0.5, 0.6, 0.2), { color: LIGHT, glow: 0.5, pos: [0, 1.4, -13.95] });
    // stepping stones toward the gate
    for (let k = 0; k < 7; k++) parts.add(cylinder(0.45 + rand() * 0.2, 0.08, 7), { color: STONE, pos: [(rand() - 0.5) * 0.8, 0, -4 - k * 0.9] });
  },
};
