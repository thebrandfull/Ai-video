// Mexico: El Castillo stepped pyramid, the Sun Stone, jungle ceibas, palms and agaves.
import { v3, deg, lerp, rng, cylinder, cone, box, boxC, ellipsoid, lathe, torus, disc, tube, curve, taper, alongY, lookMat } from '../core/geo.js';

const STONE = '#d9c49a', STONE2 = '#f0dcb0', GOLD = '#ffb347', JADE = '#3fd8a0', TRUNK = '#9a7a5a', LEAF = '#4fd27a', AGAVE = '#7fe0b0', SUN = '#ff8a3d';

function ceiba(parts, pos, rand, s = 1) {
  const P = v3(...pos);
  parts.add(cylinder(0.9 * s, 5 * s, 10, 0.5 * s), { color: TRUNK, pos: P });
  for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; parts.add(cone(0.5 * s, 1.6 * s, 5).scale(0.4, 1, 1), { color: TRUNK, quat: alongY(v3(Math.cos(a), 1.2, Math.sin(a)).normalize()), pos: [P.x + Math.cos(a) * 0.8 * s, P.y, P.z + Math.sin(a) * 0.8 * s] }); }
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 + 0.3; const c = curve([[P.x, P.y + 4.8 * s, P.z], [P.x + Math.cos(a) * 2 * s, P.y + 6 * s, P.z + Math.sin(a) * 2 * s], [P.x + Math.cos(a) * 3.6 * s, P.y + 6.6 * s, P.z + Math.sin(a) * 3.6 * s]]); parts.add(tube(c, { segments: 8, radial: 6, radius: taper(0.3 * s, 0.1 * s), caps: true }), { color: TRUNK }); }
  for (let k = 0; k < 14; k++) { const a = rand() * Math.PI * 2, r = rand() * 4 * s; parts.add(ellipsoid((1 + rand()) * s, 0.6 * s, (1 + rand()) * s, 10, 6), { color: LEAF, pos: [P.x + Math.cos(a) * r, P.y + 6.5 * s + rand() * 1.5 * s, P.z + Math.sin(a) * r] }); }
}
function agave(parts, pos, s = 1) {
  const P = v3(...pos);
  for (let k = 0; k < 11; k++) { const a = (k / 11) * Math.PI * 2, e = 0.35 + 0.5 * ((k * 5) % 3) / 2; parts.add(cone(0.18 * s, 1.5 * s, 5).scale(1, 1, 0.3), { color: AGAVE, quat: alongY(v3(Math.cos(a), e, Math.sin(a)).normalize()), pos: [P.x, P.y + 0.1, P.z] }); }
}

export default {
  key: 'mexico', country: 'Mexico',
  palette: { floor: '#2a6a3a', accent: '#ff8a3d', skyTop: '#0a0a24', skyHorizon: '#5a2a1a', skyBottom: '#040208', stars: 1, nebula: 0.45 },
  ambient: { color: '#aaff5a', vel: [0.1, 0.1, 0.05], size: 2, flutter: 0.9, intensity: 0.5 },
  material: { tint: '#e8dcc8', edge: '#ffb347', fill: 0.24, fresnelStr: 0.7, scan: 0.15 },
  build(parts) {
    const rand = rng(23);
    const P = v3(0, 0, -18);
    let y = 0;
    for (let i = 0; i < 9; i++) { const s = 18 - i * 1.6; parts.add(box(s, 0.9, s), { color: i % 2 ? STONE : STONE2, pos: [P.x, y, P.z] }); y += 0.9; }
    parts.add(box(4.2, 2.6, 4.2), { color: STONE2, pos: [P.x, y, P.z] });
    parts.add(box(3.2, 0.5, 3.2), { color: GOLD, glow: 0.3, pos: [P.x, y + 2.6, P.z] });
    for (const [dx, dz, ry] of [[0, 1, 0], [0, -1, Math.PI], [1, 0, Math.PI / 2], [-1, 0, -Math.PI / 2]]) { // four staircases
      for (let k = 0; k < 18; k++) {
        const d = 9 - k * 0.45;
        parts.add(box(2.2, 0.45, 0.5), { color: STONE2, pos: [P.x + dx * d, k * 0.45, P.z + dz * d], rot: [0, ry, 0] });
      }
      for (const sx of [1, -1]) parts.add(box(0.5, 0.6, 1.2), { color: JADE, glow: 0.3, pos: [P.x + dx * 9.3 + (dz !== 0 ? sx * 1.4 : 0), 0, P.z + dz * 9.3 + (dx !== 0 ? sx * 1.4 : 0)], rot: [0, ry, 0] });
    }
    // sun stone standing behind
    const m = lookMat([-13, 4.5, -30], [0, 3, 0]);
    parts.add(disc(4.2, 48), { color: STONE, glow: 0.1, matrix: m.clone() });
    for (let k = 0; k < 4; k++) parts.add(torus(1.0 + k * 0.95, 0.1, 6, 48), { color: k % 2 ? GOLD : JADE, glow: 0.25, matrix: m.clone() });
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; parts.add(cone(0.35, 1.1, 4), { color: GOLD, glow: 0.3, matrix: m.clone().multiply(new (Object.getPrototypeOf(m).constructor)().makeRotationZ(a)).multiply(new (Object.getPrototypeOf(m).constructor)().makeTranslation(0, 3.9, 0)) }); }
    parts.add(ellipsoid(0.6, 0.6, 0.2, 14, 10), { color: SUN, glow: 0.8, matrix: m.clone() });
    // jungle
    ceiba(parts, [-14, 0, -10], rand, 1.1); ceiba(parts, [15, 0, -8], rand, 1.0); ceiba(parts, [-22, 0, -24], rand, 1.4); ceiba(parts, [24, 0, -22], rand, 1.3);
    for (const [x, z] of [[-9, 2], [9.5, 3], [-10, -5], [11, -4], [-12, 5], [12, 6]]) agave(parts, [x, 0, z], 0.9 + rand() * 0.4);
    for (let i = 0; i < 6; i++) { const x = i < 3 ? -18 - i * 3 : 18 + (i - 3) * 3, z = -14 - rand() * 10; const c = curve([[x, 0, z], [x + 0.5, 3, z], [x + 1.2, 5.5, z]]); parts.add(tube(c, { segments: 8, radial: 6, radius: taper(0.22, 0.12), caps: true }), { color: TRUNK }); const t = c.getPointAt(1); for (let k = 0; k < 7; k++) { const a = (k / 7) * Math.PI * 2; const f = curve([t, t.clone().add(v3(Math.cos(a) * 1.2, 0.5, Math.sin(a) * 1.2)), t.clone().add(v3(Math.cos(a) * 2.4, -0.8, Math.sin(a) * 2.4))]); parts.add(tube(f, { segments: 8, radial: 5, radius: (q) => 0.28 * Math.pow(Math.sin(Math.PI * (0.1 + 0.9 * q)), 0.5), squash: () => [0.15, 1], caps: true, up: [0, 1, 0] }), { color: LEAF }); } }
  },
};
