// Firebird (Жар-птица) — perched on a golden bough, wings raised, trailing plumes of flame.
import { v3, deg, lerp, curve, tube, profile, taper, ellipsoid, cone, torus, Parts, alongY } from '../core/geo.js';
import { eagleHead, featherWing, talon, placeHead, eye, beak } from './anatomy.js';

const C = { body: '#ff8a2a', chest: '#ffd36b', wing: '#ffb347', tip: '#ff4fa3', plume: '#ff6a3d', spot: '#7cf3ff', ring: '#ffe08a', crest: '#ffd36b', beak: '#ffe9a8', eye: '#ffffff', branch: '#c8a060' };

function birdHead() {
  const h = new Parts();
  h.add(ellipsoid(0.24, 0.24, 0.3, 18, 12), { color: C.body, pos: [0, 0, 0.1] });
  beak(h, { pos: [0, -0.02, 0.36], len: 0.28, r: 0.09, color: C.beak, hook: 0.08 });
  for (const sx of [1, -1]) eye(h, [sx * 0.16, 0.07, 0.26], 0.06, C.eye);
  for (let i = -2; i <= 2; i++) { // crest plumes
    const a = i * 0.3;
    const c = curve([[0, 0.15, 0.0], [Math.sin(a) * 0.3, 0.55, -0.25], [Math.sin(a) * 0.55, 0.9, -0.55 + Math.abs(i) * 0.1]]);
    h.add(tube(c, { segments: 10, radial: 6, radius: taper(0.03, 0.006), caps: true, param: (t) => t }), { color: C.crest, glow: 0.2 });
    const e = c.getPointAt(1);
    h.add(ellipsoid(0.07, 0.09, 0.03, 10, 8), { color: C.spot, glow: 0.6, pos: e, param: 1 });
  }
  return h;
}

export default {
  name: 'Firebird', native: 'Жар-птица · Zhar-ptitsa', country: 'Russia', key: 'russia', size: 7.0, lift: 0.2, yaw: Math.PI - 0.7,
  material: { tint: '#ffffff', edge: '#ff7a3d', fill: 0.5 },
  anim: { flap: [0.2, 0.45, 2.0, 2.2], wave: [0.1, 0.12, 0.08, 1.5, 2.6], bob: [0.04, 1.0], breathe: 0.004, waveRamp: 0.8 },
  build(parts) {
    // golden bough perch
    const bough = curve([[-3.2, 0.2, 0.6], [-1.5, 0.75, 0.2], [0, 0.95, 0], [1.6, 0.8, -0.2], [3.2, 0.3, -0.6]]);
    parts.add(tube(bough, { segments: 30, radial: 10, radius: profile([[0, 0.12], [0.5, 0.17], [1, 0.1]]), caps: true }), { color: C.branch });
    for (let i = 0; i < 6; i++) { const t = 0.15 + i * 0.14; const p = bough.getPointAt(t); parts.add(ellipsoid(0.1, 0.16, 0.07, 8, 6), { color: C.ring, glow: 0.3, pos: [p.x + (i % 2 ? 0.15 : -0.15), p.y + 0.18, p.z], rot: [0.3, 0, (i % 2 ? -0.5 : 0.5)] }); }
    // body (tilted torso)
    const torso = curve([[0, 1.3, 0.9], [0, 1.6, 0.2], [0, 2.05, -0.45], [0, 2.4, -0.8]]);
    parts.add(tube(torso, { segments: 24, radial: 18, radius: profile([[0, 0.22], [0.35, 0.48], [0.7, 0.42], [1, 0.26]]), caps: true, up: [0, 1, 0] }), { color: C.body });
    for (let row = 0; row < 4; row++) for (let k = -2; k <= 2; k++) parts.add(cone(0.06, 0.26, 6).scale(1, 1, 0.35), { color: C.chest, quat: alongY(v3(k * 0.1, -1, 0.6).normalize()), pos: [k * 0.17, 1.6 + row * 0.22, -0.35 - row * 0.16 + Math.abs(k) * 0.03] });
    // neck + head
    const neck = curve([[0, 2.35, -0.8], [0, 2.75, -1.0], [0, 3.1, -0.95], [0, 3.35, -0.8]]);
    parts.add(tube(neck, { segments: 16, radial: 12, radius: profile([[0, 0.24], [0.5, 0.17], [1, 0.15]]), caps: true, up: [0, 0, -1] }), { color: C.body });
    placeHead(parts, birdHead(), v3(0, 3.4, -0.8), v3(0.1, -0.15, -1).normalize());
    // legs gripping the bough
    for (const sx of [1, -1]) {
      const leg = curve([[sx * 0.2, 1.4, 0.4], [sx * 0.35, 1.15, 0.2], [sx * 0.4, 1.0, 0.0]]);
      parts.add(tube(leg, { segments: 8, radial: 8, radius: taper(0.11, 0.06), caps: true }), { color: C.beak });
      talon(parts, { pos: [sx * 0.4, 1.0, 0.0], fwd: [0, 0, -1], r: 0.11, color: C.beak, claw: '#fff' });
    }
    // wings, raised
    for (const side of [1, -1]) featherWing(parts, { span: 2.3, chord: 0.95, primaries: 10, secondaries: 7, color: C.wing, tip: C.tip, covert: C.body, lift: 1.0, droop: 0.1, pos: [0.4, 2.1, -0.3], rot: [deg(-30), deg(-10), deg(40)], mirror: side < 0 });
    // tail plumes with eye-spots
    for (let i = -3; i <= 3; i++) {
      const a = i * 0.22, L = 3.6 - Math.abs(i) * 0.35;
      const c = curve([[0, 1.35, 0.8], [Math.sin(a) * 0.6, 1.1, 1.6], [Math.sin(a) * 1.6, 0.9 + Math.abs(i) * 0.1, 2.5], [Math.sin(a) * 2.4, 1.4 - Math.abs(i) * 0.2, 3.2]]);
      parts.add(tube(c, { segments: 36, radial: 8, radius: profile([[0, 0.05], [0.6, 0.045], [1, 0.02]]), caps: true, param: (t) => t * L }), { color: C.plume, glow: 0.15 });
      for (let k = 0; k < 10; k++) { // barbs
        const t = 0.25 + k * 0.07; const p = c.getPointAt(t); const T = c.getTangentAt(t);
        for (const s of [1, -1]) parts.add(cone(0.02, 0.22 + k * 0.015, 5).scale(1, 1, 0.3), { color: k % 2 ? C.wing : C.tip, quat: alongY(v3(s * 0.8 - T.x * 0.2, 0.3, -T.z * 0.3).normalize()), pos: p, param: t * L });
      }
      const e = c.getPointAt(1), tp = c.getTangentAt(1);
      parts.add(ellipsoid(0.2, 0.26, 0.05, 14, 10), { color: C.ring, glow: 0.3, pos: e, quat: alongY(tp).multiply(alongY([0, 0, 1])), param: L });
      parts.add(ellipsoid(0.11, 0.15, 0.06, 12, 8), { color: C.spot, glow: 0.8, pos: e, quat: alongY(tp).multiply(alongY([0, 0, 1])), param: L });
    }
  },
};
