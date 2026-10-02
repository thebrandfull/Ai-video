// Norway: a fjord between sheer peaks, a Viking longship, aurora ribbons overhead.
import { v3, deg, lerp, rng, cylinder, cone, box, boxC, ellipsoid, lathe, disc, torus, tube, curve, taper, profile, alongY } from '../core/geo.js';

const ROCK = '#4a6a8a', SNOW = '#e8f4ff', WOOD = '#c89a6a', SAIL1 = '#ff5a5a', SAIL2 = '#f4f8ff', SHIELD = '#ffd27a', AUR1 = '#5affc8', AUR2 = '#b48cff', AUR3 = '#7cf3ff';

function peak(parts, pos, w, h, seg = 12) {
  const P = v3(...pos);
  parts.add(lathe([[0, h], [w * 0.18, h * 0.86], [w * 0.4, h * 0.6], [w * 0.75, h * 0.25], [w, 0]], seg), { color: ROCK, pos: P });
  parts.add(lathe([[0, h + 0.05], [w * 0.17, h * 0.87], [w * 0.3, h * 0.72], [w * 0.2, h * 0.74], [w * 0.1, h * 0.84]], seg), { color: SNOW, glow: 0.1, pos: P });
}
function longship(parts, { pos, rot = 0 }) {
  const s = new (class {})();
  const P = v3(...pos);
  const keel = curve([[0, 1.6, -5.2], [0, 0.55, -3.2], [0, 0.35, 0], [0, 0.55, 3.2], [0, 1.4, 5.0]]);
  const hull = tube(keel, { segments: 40, radial: 14, radius: profile([[0, 0.08], [0.2, 0.9], [0.5, 1.15], [0.8, 0.9], [1, 0.1]]), squash: () => [0.5, 1], caps: true, up: [0, 1, 0] });
  hull.translate(P.x, P.y, P.z); hull.rotateY(rot);
  parts.add(hull, { color: WOOD });
  const place = (g, p, c, extra = {}) => { g.translate(p[0], p[1], p[2]); g.rotateY(rot); parts.add(g, { color: c, ...extra }); };
  for (let k = 0; k < 7; k++) { const z = -2.6 + k * 0.9; const y = 0.75 + Math.abs(z) * 0.05; for (const sx of [1, -1]) place(disc(0.42, 16), [P.x + sx * 1.05 * (1 - Math.abs(z) * 0.08), P.y + y, P.z + z], SHIELD, { rot: [0, sx * Math.PI / 2, 0] }); }
  place(cylinder(0.12, 6.5, 8), [P.x, P.y + 0.5, P.z], WOOD);
  place(boxC(5.0, 0.12, 0.12), [P.x, P.y + 6.6, P.z], WOOD);
  for (let k = 0; k < 8; k++) place(boxC(0.6, 4.2, 0.08), [P.x - 2.1 + k * 0.6, P.y + 4.4, P.z + 0.1], k % 2 ? SAIL1 : SAIL2, { glow: 0.1 });
  const prow = curve([[0, 1.5, -5.0], [0, 2.6, -5.3], [0, 3.4, -4.9], [0, 3.6, -4.3]]);
  place(tube(prow, { segments: 14, radial: 8, radius: taper(0.3, 0.1), caps: true }), [P.x, P.y, P.z], WOOD);
  place(ellipsoid(0.22, 0.26, 0.42, 10, 8), [P.x, P.y + 3.6, P.z - 4.3], SHIELD, { glow: 0.3 });
  place(cylinder(0.08, 1.6, 6), [P.x, P.y + 1.3, P.z + 5.0], WOOD, { rot: [0.6, 0, 0] });
  for (let k = 0; k < 6; k++) for (const sx of [1, -1]) place(cylinder(0.04, 3.2, 5), [P.x + sx * 1.0, P.y + 0.7, P.z - 2 + k * 0.8], WOOD, { rot: [0, 0, sx * deg(-115)] });
}

export default {
  key: 'norway', country: 'Norway',
  palette: { floor: '#0f4a5a', accent: '#5affc8', skyTop: '#03101e', skyHorizon: '#0d3a4a', skyBottom: '#02060a', stars: 1.5, nebula: 0.5, water: 1 },
  ambient: { color: '#e8f8ff', vel: [0.2, -0.5, 0], size: 2.4, flutter: 0.4, intensity: 0.6 },
  material: { tint: '#cfe4f0', edge: '#8fe8ff', fill: 0.24, fresnelStr: 0.7, scan: 0.15 },
  anim: { wave: [0.0, 0.9, 0.35, 0.6, 0.7], waveRamp: 0.1 },
  build(parts) {
    const rand = rng(37);
    // fjord walls
    for (let i = 0; i < 7; i++) { const z = -14 - i * 7, h = 12 + rand() * 10, w = 7 + rand() * 4; peak(parts, [-19 - i * 1.5 - rand() * 3, 0, z], w, h); peak(parts, [19 + i * 1.5 + rand() * 3, 0, z - 3], w, h * (0.8 + rand() * 0.4)); }
    peak(parts, [4, 0, -62], 16, 24, 14); peak(parts, [-14, 0, -70], 18, 20, 14);
    longship(parts, { pos: [13, 0, -6], rot: deg(-35) });
    longship(parts, { pos: [-15, 0, -18], rot: deg(20) });
    // aurora ribbons (animated by the set's wave)
    for (let i = 0; i < 3; i++) {
      const y = 11 + i * 3.5, col = [AUR1, AUR2, AUR3][i];
      const pts = []; for (let k = 0; k <= 8; k++) { const u = k / 8; pts.push([-50 + u * 100, y + Math.sin(u * 5 + i) * 2.0, -32 - i * 8 + Math.cos(u * 3) * 5]); }
      const c = curve(pts); const L = c.getLength();
      parts.add(tube(c, { segments: 80, radial: 6, radius: (t) => 3.2 + 1.2 * Math.sin(t * 9 + i), squash: () => [1, 0.05], caps: false, up: [0, 1, 0], param: (t) => t * L * 0.1 }), { color: col, glow: 0.35 });
    }
    // stave church on the shore
    const S = v3(-13, 0, -14);
    parts.add(box(4, 2.5, 4), { color: WOOD, pos: S });
    parts.add(cone(3.1, 1.6, 4), { color: '#8a6a4a', pos: [S.x, S.y + 2.5, S.z], rot: [0, Math.PI / 4, 0] });
    parts.add(box(2.2, 2.2, 2.2), { color: WOOD, pos: [S.x, S.y + 3.3, S.z] });
    parts.add(cone(1.8, 2.2, 4), { color: '#8a6a4a', pos: [S.x, S.y + 5.5, S.z], rot: [0, Math.PI / 4, 0] });
    parts.add(cylinder(0.12, 1.2, 6), { color: SHIELD, glow: 0.3, pos: [S.x, S.y + 7.7, S.z] });
    for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + Math.PI / 4; parts.add(cone(0.08, 0.8, 5), { color: SHIELD, quat: alongY(v3(Math.cos(a) * 0.4, 1, Math.sin(a) * 0.4).normalize()), pos: [S.x + Math.cos(a) * 2.2, S.y + 2.5, S.z + Math.sin(a) * 2.2] }); }
  },
};
