// Garuda — the divine golden eagle, standing with wings outstretched.
import { v3, deg, curve, tube, profile, taper, ellipsoid, cone, torus, Parts, alongY } from '../core/geo.js';
import { eagleHead, featherWing, talon, placeHead } from './anatomy.js';

const C = { body: '#ffd36b', chest: '#fff1c4', wing: '#ff5a4a', tip: '#fff5dc', crown: '#ffe9a8', eye: '#ffffff', leg: '#ffb347', tail: '#ff7a4a' };

export default {
  name: 'Garuda', native: 'Garuḍa · गरुड', country: 'Indonesia', key: 'indonesia', size: 7.6, lift: 0, yaw: Math.PI,
  material: { tint: '#ffffff', edge: '#ffb347', fill: 0.5 },
  anim: { flap: [0.22, 0.6, 2.4, 1.7], bob: [0.05, 0.9], breathe: 0.005, sway: [0.02, 0.6] },
  build(parts) {
    // upright torso
    const torso = curve([[0, 0.9, 0.1], [0, 1.6, 0.0], [0, 2.3, -0.05], [0, 2.75, 0.0]]);
    parts.add(tube(torso, { segments: 24, radial: 20, radius: profile([[0, 0.3], [0.3, 0.52], [0.7, 0.5], [1, 0.3]]), caps: true, up: [0, 1, 0], squash: () => [0.85, 1] }), { color: C.body });
    // chest feathers (scalloped rows)
    for (let row = 0; row < 5; row++) for (let k = -3; k <= 3; k++) {
      const y = 1.25 + row * 0.28, a = k * 0.3;
      parts.add(cone(0.07, 0.3, 6).scale(1, 1, 0.35), { color: C.chest, quat: alongY(v3(Math.sin(a) * 0.3, -1, 0.5).normalize()), pos: [Math.sin(a) * 0.46, y, -0.32 - Math.cos(a) * 0.14] });
    }
    // neck + head
    const neck = curve([[0, 2.7, 0], [0, 3.05, -0.05], [0, 3.3, -0.1]]);
    parts.add(tube(neck, { segments: 10, radial: 14, radius: profile([[0, 0.3], [1, 0.22]]), caps: true, up: [0, 0, -1] }), { color: C.body });
    placeHead(parts, eagleHead({ color: C.body, beakColor: C.crown, eyeColor: C.eye, nape: C.chest, size: 1.1, crown: C.crown }), v3(0, 3.35, -0.1), v3(-0.25, -0.12, -1).normalize());
    // legs with talons
    for (const sx of [1, -1]) {
      const leg = curve([[sx * 0.3, 1.0, 0.05], [sx * 0.45, 0.55, -0.1], [sx * 0.45, 0.12, 0.0]]);
      parts.add(tube(leg, { segments: 12, radial: 10, radius: profile([[0, 0.2], [0.5, 0.11], [1, 0.1]]), caps: true }), { color: C.leg });
      talon(parts, { pos: [sx * 0.45, 0.1, 0.0], fwd: [0, 0, -1], r: 0.16, color: C.leg, claw: C.tip });
      // feathered thigh
      for (let i = 0; i < 6; i++) parts.add(cone(0.06, 0.3, 6).scale(1, 1, 0.4), { color: C.chest, quat: alongY(v3(sx * 0.3, -1, (i - 3) * 0.15).normalize()), pos: [sx * 0.4, 1.05, (i - 2.5) * 0.09] });
    }
    // tail fan
    for (let i = -5; i <= 5; i++) {
      const a = i * 0.16;
      const c = curve([[0, 1.0, 0.25], [Math.sin(a) * 0.6, 0.55, 0.75], [Math.sin(a) * 1.0, 0.12, 1.1]]);
      parts.add(tube(c, { segments: 10, radial: 8, radius: (t) => 0.14 * Math.pow(Math.sin(Math.PI * (0.1 + 0.9 * t)), 0.6), squash: () => [0.12, 1], caps: true, up: [0, 1, 0] }), { color: i % 2 ? C.tail : C.tip });
    }
    // ornamental collar and armbands
    parts.add(torus(0.5, 0.05, 8, 40), { color: C.crown, glow: 0.4, pos: [0, 2.65, 0], rot: [deg(80), 0, 0] });
    for (const side of [1, -1]) {
      featherWing(parts, { span: 2.7, chord: 1.05, primaries: 11, secondaries: 8, color: C.wing, tip: C.tip, covert: C.body, lift: 0.8, droop: 0.15, pos: [0.45, 2.35, 0.05], rot: [deg(-38), deg(-4), deg(20)], mirror: side < 0 });
      parts.add(torus(0.2, 0.04, 8, 24), { color: C.crown, glow: 0.3, pos: [side * 0.62, 2.35, 0.05], rot: [0, 0, deg(90)] });
    }
  },
};
