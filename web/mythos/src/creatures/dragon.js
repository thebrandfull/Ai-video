// The Chinese Dragon (龍) — serpentine body, five-clawed legs, antler horns,
// flowing mane and whiskers, chasing the flaming pearl.
import { v3, deg, lerp, curve, tube, profile, taper, ellipsoid, cone, torus, Parts, alongY } from '../core/geo.js';
import { frameAt, spikeRow, eye, horn, mane, paw, teeth, placeHead } from './anatomy.js';

const C = { body: '#35e3b5', belly: '#ffe7a3', spine: '#ffc24d', mane: '#ffb03a', horn: '#ffd98a', eye: '#fff4a8', whisker: '#ff7a63', tongue: '#ff3d63', claw: '#fff1cc', pearl: '#ffffff', tooth: '#ffffff' };

function dragonHead() {
  const h = new Parts();
  h.add(ellipsoid(0.4, 0.36, 0.5, 24, 16), { color: C.body, pos: [0, 0.05, 0.25] });
  const snout = curve([[0, 0.02, 0.4], [0, 0.06, 0.9], [0, 0.12, 1.35]]);
  h.add(tube(snout, { segments: 24, radial: 16, radius: profile([[0, 0.34], [0.5, 0.27], [0.85, 0.22], [1, 0.13]]), squash: () => [0.8, 1], caps: true, up: [0, 1, 0] }), { color: C.body });
  h.add(ellipsoid(0.16, 0.1, 0.16, 12, 8), { color: C.body, pos: [0, 0.3, 1.2] });
  for (const sx of [1, -1]) h.add(ellipsoid(0.05, 0.04, 0.05, 8, 6), { color: C.belly, glow: 0.3, pos: [sx * 0.1, 0.27, 1.33] });
  // open lower jaw with teeth and tongue
  const jaw = new Parts();
  const jc = curve([[0, 0, 0], [0, -0.02, 0.45], [0, 0.02, 0.85]]);
  jaw.add(tube(jc, { segments: 16, radial: 12, radius: profile([[0, 0.24], [0.6, 0.18], [1, 0.1]]), squash: () => [0.55, 1], caps: true, up: [0, 1, 0] }), { color: C.body });
  teeth(jaw, jc, { count: 5, from: 0.3, to: 0.9, size: 0.07, color: C.tooth, side: 0.13, down: false });
  jaw.add(tube(curve([[0, 0.05, 0.1], [0, 0.1, 0.5], [0, 0.2, 0.85], [0, 0.1, 1.05]]), { segments: 12, radial: 8, radius: taper(0.06, 0.01), squash: () => [0.5, 1], caps: true, up: [0, 1, 0] }), { color: C.tongue, glow: 0.3 });
  h.addParts(jaw, { pos: [0, -0.2, 0.42], rot: [deg(26), 0, 0] });
  teeth(h, snout, { count: 6, from: 0.3, to: 0.95, size: 0.075, color: C.tooth, side: 0.19, down: true });
  // eyes and brow ridges
  eye(h, [0.3, 0.22, 0.62], 0.09, C.eye); eye(h, [-0.3, 0.22, 0.62], 0.09, C.eye);
  h.add(ellipsoid(0.16, 0.06, 0.12, 10, 6), { color: C.spine, pos: [0.3, 0.33, 0.6], rot: [0, 0, deg(-15)] });
  h.add(ellipsoid(0.16, 0.06, 0.12, 10, 6), { color: C.spine, pos: [-0.3, 0.33, 0.6], rot: [0, 0, deg(15)] });
  for (const sx of [1, -1]) {
    // antler horns with a tine
    const c1 = horn(h, { from: [sx * 0.22, 0.34, 0.25], dir: [sx * 0.35, 0.75, -0.55], len: 1.0, curl: [sx * 0.15, 0.15, -0.35], r: 0.09, color: C.horn });
    const m = c1.getPointAt(0.5);
    horn(h, { from: [m.x, m.y, m.z], dir: [sx * 0.6, 0.5, 0.2], len: 0.45, curl: [0, 0.1, 0.1], r: 0.05, color: C.horn });
    // long whiskers (wave along their length)
    const wc = curve([[sx * 0.2, -0.02, 1.25], [sx * 0.65, 0.12, 1.4], [sx * 1.2, -0.12, 1.1], [sx * 1.6, 0.22, 0.6], [sx * 1.9, 0.0, 0.2]]);
    const wl = wc.getLength();
    h.add(tube(wc, { segments: 40, radial: 6, radius: taper(0.028, 0.004, 0.7), caps: true, param: (t) => t * wl * 1.5 }), { color: C.whisker, glow: 0.2 });
    // cheek fins
    for (let i = 0; i < 5; i++) {
      const a = lerp(-0.5, 0.9, i / 4);
      const d = v3(sx * Math.cos(a) * 0.9, Math.sin(a), -0.5).normalize();
      horn(h, { from: [sx * 0.3, -0.02, 0.35], dir: [d.x, d.y, d.z], len: 0.5 + 0.1 * (i % 2), curl: [0, 0, -0.1], r: 0.05, color: C.mane, squash: () => [0.4, 1] });
    }
    h.add(cone(0.08, 0.3, 6).scale(1, 1, 0.4), { color: C.body, quat: alongY(v3(sx * 0.8, 0.5, -0.4)), pos: [sx * 0.33, 0.25, 0.3] });
  }
  mane(h, { center: [0, 0.15, 0.0], dir: [0, 0.25, -1], count: 26, len: 1.1, spread: 0.45, color: C.mane, seed: 4, r: 0.04, wave: 0.3 });
  mane(h, { center: [0, -0.3, 0.75], dir: [0, -0.8, 0.3], count: 8, len: 0.5, spread: 0.12, color: C.mane, seed: 8, r: 0.03 });
  h.add(cone(0.06, 0.22, 6), { color: C.spine, quat: alongY(v3(0, 0.8, -0.4)), pos: [0, 0.3, 0.95] });
  return h;
}

function legAt(parts, body, t, sx, r, prm) {
  const { T, U, S, P } = frameAt(body, t);
  const fwd = T.clone().multiplyScalar(-1);
  const root = P.clone().addScaledVector(S, sx * r * 0.7).addScaledVector(U, -r * 0.2);
  const knee = root.clone().addScaledVector(S, sx * r * 1.1).addScaledVector(U, -r * 0.9).addScaledVector(fwd, r * 0.5);
  const ankle = knee.clone().addScaledVector(S, sx * r * 0.3).addScaledVector(U, -r * 1.3).addScaledVector(fwd, -r * 0.3);
  const foot = ankle.clone().addScaledVector(U, -r * 0.5).addScaledVector(fwd, r * 0.5);
  const c = curve([root, knee, ankle, foot]);
  parts.defaultParam = prm;
  parts.add(tube(c, { segments: 20, radial: 12, radius: profile([[0, r * 0.5], [0.35, r * 0.4], [0.7, r * 0.28], [1, r * 0.3]]), caps: true }), { color: C.body });
  mane(parts, { center: [knee.x, knee.y, knee.z], dir: [-fwd.x, -fwd.y, -fwd.z], count: 5, len: 0.35, spread: 0.08, color: C.mane, seed: 20 + Math.round(t * 100) + sx, r: 0.025, param: false });
  paw(parts, { pos: [foot.x, foot.y, foot.z], fwd: [fwd.x, fwd.y * 0.2, fwd.z], r: r * 0.45, toes: 5, color: C.body, claw: C.claw, spread: 1.3 });
  parts.defaultParam = null;
}

export default {
  name: 'Dragon', native: '龍 · Lóng', country: 'China', key: 'china', size: 7.8, lift: 0.4, yaw: -0.75,
  material: { tint: '#ffffff', edge: '#7cffd9', fill: 0.5, pattern: 0.5 },
  anim: { wave: [0.06, 0.1, 0.06, 1.3, 2.0], bob: [0.08, 0.9], breathe: 0.004, sway: [0.03, 0.5], waveRamp: 1.2 },
  build(parts) {
    const body = curve([
      [2.3, 2.5, 1.3], [1.3, 3.0, 0.9], [0.0, 3.1, 0.1], [-1.4, 2.7, -0.7], [-2.5, 1.9, -0.4], [-2.6, 1.1, 0.7], [-1.5, 0.75, 1.7],
      [0.0, 1.0, 2.0], [1.4, 1.45, 1.2], [2.4, 1.2, -0.3], [1.9, 0.7, -1.7], [0.5, 0.45, -2.5], [-1.1, 0.5, -2.7], [-2.7, 0.6, -2.3], [-3.6, 0.9, -1.6],
    ]);
    const L = body.getLength();
    const R = profile([[0, 0.34], [0.08, 0.4], [0.3, 0.42], [0.6, 0.36], [0.85, 0.2], [1, 0.03]]);
    const param = (t) => t * L;
    parts.add(tube(body, { segments: 320, radial: 24, radius: R, caps: true, up: [0, 1, 0], uScale: 40, param }), { color: C.body });
    const bpts = [];
    for (let i = 0; i <= 60; i++) { const t = i / 60; const { P, U } = frameAt(body, t); bpts.push(P.clone().addScaledVector(U, -R(t) * 0.7)); }
    parts.add(tube(curve(bpts), { segments: 200, radial: 10, radius: (t) => R(t) * 0.5, squash: () => [0.4, 1.4], caps: true, up: [0, 1, 0], param, uScale: 60 }), { color: C.belly });
    spikeRow(parts, body, { count: 54, from: 0.03, to: 0.97, size: (t) => R(t) * 1.3 * (0.6 + 0.4 * Math.sin(t * Math.PI)), radius: R, color: C.spine, param, lean: 0.4 });
    for (const [t, sx] of [[0.1, 1], [0.1, -1], [0.47, 1], [0.47, -1]]) legAt(parts, body, t, sx, R(t), param(t));
    const te = body.getPointAt(1), td = body.getTangentAt(1);
    parts.defaultParam = L;
    mane(parts, { center: [te.x, te.y, te.z], dir: [td.x, td.y, td.z], count: 14, len: 0.9, spread: 0.2, color: C.mane, seed: 9, r: 0.04, param: false });
    parts.defaultParam = null;
    const hp = body.getPointAt(0), hd = body.getTangentAt(0).multiplyScalar(-1);
    placeHead(parts, dragonHead(), hp, hd);
    const pearl = hp.clone().addScaledVector(hd, 2.0).add(v3(0, -0.15, 0));
    parts.add(ellipsoid(0.22, 0.22, 0.22, 20, 14), { color: C.pearl, glow: 0.8, pos: pearl });
    parts.add(torus(0.36, 0.025, 8, 48), { color: C.mane, glow: 0.8, pos: pearl, rot: [deg(70), 0, deg(20)] });
    parts.add(torus(0.46, 0.02, 8, 48), { color: C.whisker, glow: 0.6, pos: pearl, rot: [deg(-60), deg(30), 0] });
    for (let i = 0; i < 6; i++) { // flames around the pearl
      const a = i / 6 * Math.PI * 2;
      horn(parts, { from: [pearl.x + Math.cos(a) * 0.2, pearl.y + Math.sin(a) * 0.2, pearl.z], dir: [Math.cos(a) * 0.8, Math.sin(a) * 0.8 + 0.3, 0], len: 0.45, curl: [-Math.sin(a) * 0.15, 0.15, 0], r: 0.045, color: C.whisker });
    }
  },
};
