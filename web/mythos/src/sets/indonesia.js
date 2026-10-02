// Indonesia: Borobudur's tiers and bell stupas, palms, a smouldering volcano.
import { v3, deg, lerp, rng, cylinder, cone, box, ellipsoid, lathe, tube, curve, taper, disc, alongY, lookMat } from '../core/geo.js';

const STONE = '#9fb8c8', STONE2 = '#c8d8e0', GOLD = '#ffd27a', PALM = '#4fd27a', TRUNK = '#b58a5a', VOLC = '#5a4a6a', LAVA = '#ff6a2a';

function stupa(parts, pos, s = 1) {
  const P = v3(...pos);
  parts.add(lathe([[0.55 * s, 0], [0.55 * s, 0.15 * s], [0.5 * s, 0.6 * s], [0.3 * s, 0.95 * s], [0.12 * s, 1.1 * s], [0, 1.15 * s]], 16), { color: STONE2, pos: P });
  parts.add(cone(0.1 * s, 0.4 * s, 6), { color: GOLD, glow: 0.25, pos: [P.x, P.y + 1.1 * s, P.z] });
}
function palm(parts, pos, rand, s = 1) {
  const P = v3(...pos);
  const lean = v3((rand() - 0.5) * 1.6, 0, (rand() - 0.5) * 1.6);
  const trunk = curve([P, P.clone().add(v3(lean.x * 0.3, 2.5 * s, lean.z * 0.3)), P.clone().add(v3(lean.x, 5.2 * s, lean.z))]);
  parts.add(tube(trunk, { segments: 14, radial: 8, radius: taper(0.26 * s, 0.14 * s), caps: true }), { color: TRUNK });
  const top = trunk.getPointAt(1);
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2 + rand() * 0.3;
    const d = v3(Math.cos(a), 0.55, Math.sin(a)).normalize();
    const c = curve([top, top.clone().addScaledVector(d, 1.3 * s).add(v3(0, 0.1, 0)), top.clone().addScaledVector(d, 2.6 * s).add(v3(0, -1.0 * s, 0))]);
    parts.add(tube(c, { segments: 10, radial: 6, radius: (t) => 0.3 * s * Math.pow(Math.sin(Math.PI * (0.1 + 0.9 * t)), 0.5), squash: () => [0.15, 1], caps: true, up: [0, 1, 0] }), { color: PALM });
  }
  parts.add(ellipsoid(0.35 * s, 0.3 * s, 0.35 * s, 8, 6), { color: GOLD, pos: [top.x, top.y - 0.15, top.z] });
}

export default {
  key: 'indonesia', country: 'Indonesia',
  palette: { floor: '#1f6b3a', accent: '#ffb347', skyTop: '#0a1a12', skyHorizon: '#3a2a10', skyBottom: '#030805', stars: 1, nebula: 0.5 },
  ambient: { color: '#d0ff6a', vel: [0.05, 0.12, 0.05], size: 2, flutter: 0.9, intensity: 0.5 },
  material: { tint: '#d9e4dc', edge: '#ffd27a', fill: 0.24, fresnelStr: 0.7, scan: 0.15 },
  build(parts) {
    const rand = rng(13);
    const P = v3(0, 0, -16);
    const sizes = [18, 14.5, 11.5, 9];
    let y = 0;
    for (let i = 0; i < 4; i++) {
      parts.add(box(sizes[i], 1.1, sizes[i]), { color: STONE, pos: [P.x, y, P.z] });
      const n = Math.round(sizes[i] / 1.3);
      for (let k = 0; k < n; k++) { // balustrade merlons
        const o = -sizes[i] / 2 + (k + 0.5) * (sizes[i] / n);
        parts.add(box(0.5, 0.45, 0.4), { color: STONE2, pos: [P.x + o, y + 1.1, P.z - sizes[i] / 2 + 0.2] });
        parts.add(box(0.4, 0.45, 0.5), { color: STONE2, pos: [P.x - sizes[i] / 2 + 0.2, y + 1.1, P.z + o] });
        parts.add(box(0.4, 0.45, 0.5), { color: STONE2, pos: [P.x + sizes[i] / 2 - 0.2, y + 1.1, P.z + o] });
      }
      y += 1.1;
    }
    const radii = [4.6, 3.6, 2.6];
    for (let i = 0; i < 3; i++) {
      parts.add(cylinder(radii[i], 0.9, 32), { color: STONE, pos: [P.x, y, P.z] });
      const n = [16, 12, 8][i];
      for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2; stupa(parts, [P.x + Math.cos(a) * (radii[i] - 0.6), y + 0.9, P.z + Math.sin(a) * (radii[i] - 0.6)], 0.75); }
      y += 0.9;
    }
    parts.add(cylinder(1.5, 0.5, 32), { color: STONE, pos: [P.x, y, P.z] });
    stupa(parts, [P.x, y + 0.5, P.z], 2.2);
    // stairway down the front
    for (let k = 0; k < 10; k++) parts.add(box(2.2, 0.45, 0.6), { color: STONE2, pos: [P.x, k * 0.45, P.z + 9.6 - k * 0.6] });
    // palms
    for (const [x, z, s] of [[-9, -4, 1.1], [9.5, -3, 1.0], [-13, -12, 1.3], [13, -11, 1.2], [-13, 3, 0.9], [13, 4, 0.85], [-16, -2, 1.1], [16, -3, 1.0]]) palm(parts, [x, 0, z], rand, s);
    // volcano
    parts.add(lathe([[0, 14], [2, 13.6], [6, 10], [14, 4], [22, 0]], 22), { color: VOLC, pos: [14, 0, -52] });
    parts.add(disc(1.9, 24), { color: LAVA, glow: 0.8, pos: [14, 14.05, -52], rot: [-Math.PI / 2, 0, 0] });
    for (let i = 0; i < 4; i++) parts.add(ellipsoid(2.5 + i, 1.2 + i * 0.4, 2.5 + i, 10, 6), { color: '#6a5a6a', pos: [14 + i * 1.5, 15.5 + i * 1.6, -52 - i * 0.5] });
    // rice terraces (left)
    for (let k = 0; k < 6; k++) parts.add(cylinder(9 - k * 1.2, 0.5, 24), { color: '#3fa36b', pos: [-28, k * 0.5, -28] });
  },
};
