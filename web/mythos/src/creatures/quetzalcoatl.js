// Quetzalcoatl — the Feathered Serpent, rising in a spiral, crowned with quetzal plumes.
import { v3, deg, lerp, curve, tube, profile, taper, ellipsoid, cone, torus, Parts, alongY } from '../core/geo.js';
import { frameAt, spikeRow, eye, horn, mane, teeth, placeHead, featherWing } from './anatomy.js';

const C = { body: '#2fd37a', belly: '#ffd36b', f1: '#19e3c9', f2: '#8dff3a', red: '#ff4f6a', eye: '#ffe08a', fang: '#ffffff', tongue: '#ff6a8a', gold: '#ffd27a' };

function serpentHead() {
  const h = new Parts();
  h.add(ellipsoid(0.42, 0.3, 0.55, 22, 14), { color: C.body, pos: [0, 0.05, 0.3] });
  const upper = curve([[0, 0.05, 0.5], [0, 0.1, 1.0], [0, 0.06, 1.45]]);
  h.add(tube(upper, { segments: 16, radial: 14, radius: profile([[0, 0.34], [0.6, 0.27], [1, 0.14]]), squash: () => [0.6, 1], caps: true, up: [0, 1, 0] }), { color: C.body });
  teeth(h, upper, { count: 4, from: 0.35, to: 0.9, size: 0.1, color: C.fang, side: 0.17, down: true });
  const jaw = new Parts();
  const jc = curve([[0, 0, 0], [0, 0.0, 0.5], [0, 0.03, 0.95]]);
  jaw.add(tube(jc, { segments: 12, radial: 12, radius: profile([[0, 0.28], [0.6, 0.2], [1, 0.1]]), squash: () => [0.5, 1], caps: true, up: [0, 1, 0] }), { color: C.belly });
  teeth(jaw, jc, { count: 4, from: 0.35, to: 0.9, size: 0.09, color: C.fang, side: 0.14, down: false });
  jaw.add(tube(curve([[0, 0.06, 0.2], [0, 0.1, 0.8], [0, 0.25, 1.25]]), { segments: 10, radial: 6, radius: taper(0.05, 0.015), caps: true }), { color: C.tongue, glow: 0.3 });
  for (const sx of [1, -1]) jaw.add(cone(0.015, 0.2, 5), { color: C.tongue, glow: 0.3, quat: alongY(v3(sx * 0.5, 0.4, 1).normalize()), pos: [0, 0.25, 1.22] });
  h.addParts(jaw, { pos: [0, -0.16, 0.45], rot: [deg(32), 0, 0] });
  for (const sx of [1, -1]) {
    eye(h, [sx * 0.3, 0.2, 0.55], 0.1, C.eye);
    h.add(torus(0.13, 0.025, 6, 20), { color: C.gold, glow: 0.3, pos: [sx * 0.3, 0.2, 0.6], rot: [0, sx * 0.6, 0] });
    for (let i = 0; i < 6; i++) { // ear / cheek feather fans
      const a = lerp(-0.6, 0.9, i / 5);
      horn(h, { from: [sx * 0.3, 0.05, 0.25], dir: [sx * Math.cos(a), Math.sin(a), -0.55], len: 0.75 + 0.1 * (i % 2), curl: [0, 0.1, -0.15], r: 0.07, color: i % 2 ? C.f1 : C.f2, squash: () => [0.35, 1] });
    }
  }
  // great crest of quetzal plumes
  for (let i = -5; i <= 5; i++) {
    const a = i * 0.28;
    const c = curve([[0, 0.25, 0.1], [Math.sin(a) * 0.5, 0.9, -0.4], [Math.sin(a) * 1.1, 1.6 - Math.abs(i) * 0.12, -1.0], [Math.sin(a) * 1.5, 1.9 - Math.abs(i) * 0.2, -1.7]]);
    const L = c.getLength();
    h.add(tube(c, { segments: 20, radial: 6, radius: (t) => 0.09 * Math.pow(Math.sin(Math.PI * (0.05 + 0.95 * t)), 0.5) + 0.01, squash: () => [0.25, 1], caps: true, up: [0, 1, 0], param: (t) => t * L }), { color: i % 2 ? C.f2 : C.f1, glow: 0.1 });
    const e = c.getPointAt(1);
    h.add(ellipsoid(0.08, 0.1, 0.03, 8, 6), { color: C.red, glow: 0.5, pos: e, param: L });
  }
  return h;
}

export default {
  name: 'Quetzalcoatl', native: 'Quetzalcōātl · Feathered Serpent', country: 'Mexico', key: 'mexico', size: 6.0, lift: 0.25, yaw: Math.PI,
  material: { tint: '#ffffff', edge: '#8dff3a', fill: 0.5, pattern: 0.45 },
  anim: { wave: [0.07, 0.1, 0.07, 1.2, 1.8], bob: [0.06, 0.8], breathe: 0.004, sway: [0.03, 0.45], waveRamp: 1.5 },
  build(parts) {
    const pts = [[0.3, 3.3, -1.5], [0.5, 3.35, -0.5], [1.4, 3.1, 0.4]];
    for (let k = 1; k <= 11; k++) { const u = k / 11; const a = u * Math.PI * 2 * 1.45 + 0.4; const r = 1.4 + u * 1.3; pts.push([Math.cos(a) * r, 2.9 - u * 2.6 + 0.25 * Math.sin(u * 7), Math.sin(a) * r]); }
    const body = curve(pts);
    const L = body.getLength();
    const R = profile([[0, 0.36], [0.1, 0.42], [0.4, 0.4], [0.75, 0.3], [0.92, 0.14], [1, 0.03]]);
    const param = (t) => t * L;
    parts.add(tube(body, { segments: 300, radial: 24, radius: R, caps: true, up: [0, 1, 0], uScale: 36, param }), { color: C.body });
    const bpts = []; for (let i = 0; i <= 60; i++) { const t = i / 60; const { P, U } = frameAt(body, t); bpts.push(P.clone().addScaledVector(U, -R(t) * 0.7)); }
    parts.add(tube(curve(bpts), { segments: 180, radial: 10, radius: (t) => R(t) * 0.5, squash: () => [0.35, 1.5], caps: true, up: [0, 1, 0], param, uScale: 50 }), { color: C.belly });
    // feather crest along the whole spine, alternating turquoise / green with red tips
    spikeRow(parts, body, { count: 70, from: 0.02, to: 0.96, size: (t) => R(t) * 1.6 * (0.7 + 0.3 * Math.sin(t * Math.PI)), radius: R, color: C.f1, param, lean: 0.55, width: 0.3, alternate: false });
    spikeRow(parts, body, { count: 35, from: 0.03, to: 0.95, size: (t) => R(t) * 1.15, radius: (t) => R(t) * 1.05, color: C.f2, param, lean: 0.9, width: 0.4, alternate: false });
    for (let i = 0; i < 24; i++) { const t = 0.05 + i * 0.038; const { P, U } = frameAt(body, t); parts.add(ellipsoid(0.05, 0.07, 0.02, 6, 5), { color: C.red, glow: 0.5, pos: P.clone().addScaledVector(U, R(t) * 0.85 + R(t) * 1.55), param: param(t) }); }
    // side feather ruffs along the body
    for (let i = 0; i < 16; i++) { const t = 0.08 + i * 0.055; const { P, U, S, T } = frameAt(body, t); for (const sx of [1, -1]) parts.add(cone(0.04, R(t) * 0.9, 5).scale(1, 1, 0.35), { color: C.f2, quat: alongY(S.clone().multiplyScalar(sx).addScaledVector(T, 0.5).addScaledVector(U, -0.3).normalize()), pos: P.clone().addScaledVector(S, sx * R(t) * 0.8), param: param(t) }); }
    // wings near the front third
    const wt = 0.22, wf = frameAt(body, wt);
    for (const side of [1, -1]) {
      const wp = wf.P.clone().addScaledVector(wf.S, side * R(wt) * 0.6).addScaledVector(wf.U, R(wt) * 0.3);
      parts.defaultParam = param(wt);
      featherWing(parts, { span: 2.4, chord: 0.95, primaries: 8, secondaries: 6, color: C.f1, tip: C.red, covert: C.f2, lift: 0.6, droop: 0.3, pos: wp, rot: [0, Math.atan2(wf.T.x, wf.T.z) + (side > 0 ? -Math.PI / 2 : Math.PI / 2) + Math.PI, deg(30)], mirror: side < 0 });
      parts.defaultParam = null;
    }
    const hp = body.getPointAt(0), hd = body.getTangentAt(0).multiplyScalar(-1);
    placeHead(parts, serpentHead(), hp, hd);
    // rattle / tail tip ring
    const te = body.getPointAt(1);
    parts.add(torus(0.18, 0.04, 8, 20), { color: C.gold, glow: 0.4, pos: te, param: L });
  },
};
