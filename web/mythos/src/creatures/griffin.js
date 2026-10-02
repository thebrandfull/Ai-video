// Griffin (Γρύψ) — lion body, eagle head and great feathered wings.
import { v3, deg, ellipsoid, cone, Parts, alongY } from '../core/geo.js';
import { quadruped, eagleHead, featherWing, placeHead } from './anatomy.js';

const C = { body: '#f0c070', belly: '#ffe6b0', feather: '#fff5dc', tip: '#ffb347', head: '#fff5dc', beak: '#ffd86a', eye: '#fff', claw: '#fff' };

export default {
  name: 'Griffin', native: 'Γρύψ · Gryps', country: 'Greece', key: 'greece', size: 7.2, lift: 0, yaw: Math.PI - 0.4,
  material: { tint: '#ffffff', edge: '#ffd27a', fill: 0.5 },
  anim: { flap: [0.14, 0.55, 2.2, 2.0], bob: [0.03, 1.1], breathe: 0.004, wave: [0.08, 0.03, 0.08, 2.5, 2.2], waveRamp: 0.5 },
  build(parts) {
    const info = quadruped(parts, {
      len: 2.4, chest: 0.52, waist: 0.42, hip: 0.46, bodyY: 1.2, arch: 0.08, legR: 0.13, stance: 0.32, color: C.body, belly: C.belly,
      pawR: 0.14, toes: 4, clawColor: C.claw, pose: 'stand', neck: { len: 0.75, r0: 0.34, r1: 0.22, angle: 58 },
      tail: { len: 1.8, r: 0.07, tuft: C.tip, pts: [[0, 0, 0], [0, 0.35, 0.5], [0, 0.45, 1.0], [0, 0.1, 1.45]] }, frontTalons: true, talonColor: C.tip,
    });
    placeHead(parts, eagleHead({ color: C.head, beakColor: C.beak, eyeColor: C.eye, nape: C.feather, size: 1.05 }), info.pos, info.dir.clone().add(v3(0, -0.5, 0)).normalize());
    // chest feather ruff
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const p = v3(Math.cos(a) * 0.4, info.bodyY + 0.25 + Math.sin(a) * 0.3, info.chest.z - 0.25);
      parts.add(cone(0.06, 0.35, 6).scale(1, 1, 0.4), { color: C.feather, quat: alongY(v3(Math.cos(a) * 0.5, Math.sin(a) * 0.5 - 0.2, 0.9).normalize()), pos: p });
    }
    for (const side of [1, -1]) {
      featherWing(parts, { span: 2.5, chord: 0.95, primaries: 10, secondaries: 8, color: C.feather, tip: C.tip, covert: C.body, lift: 0.5, droop: 0.25, pos: [0.42, info.bodyY + 0.42, info.chest.z + 0.35], rot: [deg(-32), deg(-14), deg(30)], mirror: side < 0 });
    }
  },
};
