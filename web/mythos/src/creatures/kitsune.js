// Kitsune (狐) — nine-tailed celestial fox, sitting, ringed by foxfire.
import { v3, deg, lerp, curve, tube, profile, taper, ellipsoid, cone, torus, Parts, alongY } from '../core/geo.js';
import { quadruped, eye, mane, placeHead, horn } from './anatomy.js';

const C = { fur: '#dde6f8', inner: '#ffb6cf', accent: '#ff6b9d', eye: '#7cf3ff', nose: '#ff8fb0', fire: '#8df5ff', tip: '#ffe3ee' };

function foxHead() {
  const h = new Parts();
  h.add(ellipsoid(0.3, 0.27, 0.34, 20, 14), { color: C.fur, pos: [0, 0, 0.15] });
  const muzzle = curve([[0, -0.03, 0.3], [0, -0.05, 0.55], [0, -0.03, 0.72]]);
  h.add(tube(muzzle, { segments: 12, radial: 12, radius: profile([[0, 0.2], [0.6, 0.13], [1, 0.07]]), squash: () => [0.85, 1], caps: true, up: [0, 1, 0] }), { color: C.fur });
  h.add(ellipsoid(0.055, 0.045, 0.05, 10, 8), { color: C.nose, glow: 0.5, pos: [0, -0.01, 0.75] });
  for (const sx of [1, -1]) {
    mane(h, { center: [sx * 0.26, -0.08, 0.2], dir: [sx * 0.8, -0.4, -0.3], count: 7, len: 0.28, spread: 0.1, color: C.fur, seed: 3 + sx, r: 0.03, param: false });
    const ed = v3(sx * 0.35, 1, -0.25).normalize();
    h.add(cone(0.12, 0.42, 8).scale(1, 1, 0.45), { color: C.fur, quat: alongY(ed), pos: [sx * 0.17, 0.2, 0.05] });
    h.add(cone(0.07, 0.3, 8).scale(1, 1, 0.3), { color: C.inner, glow: 0.2, quat: alongY(ed), pos: [sx * 0.17, 0.22, 0.09] });
    h.add(ellipsoid(0.075, 0.045, 0.04, 12, 8), { color: C.eye, glow: 1.2, pos: [sx * 0.14, 0.07, 0.4], rot: [0, 0, sx * 0.35] });
    h.add(ellipsoid(0.05, 0.02, 0.1, 8, 6), { color: C.accent, glow: 0.3, pos: [sx * 0.13, 0.15, 0.38] });
  }
  h.add(ellipsoid(0.03, 0.06, 0.02, 6, 4), { color: C.accent, glow: 0.7, pos: [0, 0.2, 0.3] });
  return h;
}

export default {
  name: 'Kitsune', native: '狐 · 九尾の狐', country: 'Japan', key: 'japan', size: 6.2, lift: 0, yaw: Math.PI + 0.35,
  material: { tint: '#ffffff', edge: '#ffa6cc', fill: 0.5, pattern: 0 },
  anim: { wave: [0.05, 0.04, 0.06, 2.2, 2.4], bob: [0.02, 1.2], breathe: 0.006, waveRamp: 0.6 },
  build(parts) {
    const info = quadruped(parts, {
      len: 1.9, chest: 0.42, waist: 0.38, hip: 0.46, bodyY: 1.05, arch: 0.05, legR: 0.09, stance: 0.24, color: C.fur, belly: C.inner,
      pawR: 0.1, toes: 4, clawColor: C.accent, pose: 'sit', neck: { len: 0.55, r0: 0.26, r1: 0.19, angle: 62 }, tail: null, chestFur: C.inner,
    });
    // nine tails fanning out behind
    const base = v3(0, 0.45, info.hip.z + 0.25);
    for (let k = 0; k < 9; k++) {
      const a = (k / 8 - 0.5) * 2.4;
      const e = 0.3 + 0.95 * Math.cos(a * 0.9);
      const c = curve([base, base.clone().add(v3(Math.sin(a) * 0.45, 0.25, 0.4)), base.clone().add(v3(Math.sin(a) * 1.15, 0.35 + e * 0.8, 0.85)), base.clone().add(v3(Math.sin(a) * 1.65, 0.4 + e * 1.65, 0.55))]);
      const L = c.getLength();
      parts.add(tube(c, { segments: 30, radial: 12, radius: profile([[0, 0.07], [0.3, 0.13], [0.75, 0.12], [1, 0.03]]), caps: true, param: (t) => t * L }), { color: C.fur });
      const tp = c.getPointAt(0.88);
      parts.add(ellipsoid(0.12, 0.14, 0.12, 12, 8), { color: C.tip, glow: 0.25, pos: tp, param: L * 0.88 });
    }
    placeHead(parts, foxHead(), info.pos, info.dir.clone().add(v3(0, -0.35, 0)).normalize());
    // foxfire wisps (hitodama) orbiting
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.4, r = 1.35 + (i % 2) * 0.35, y = 0.9 + 0.55 * Math.sin(i * 1.7);
      const p = v3(Math.cos(a) * r, y, Math.sin(a) * r);
      parts.add(ellipsoid(0.11, 0.11, 0.11, 12, 8), { color: C.fire, glow: 0.9, pos: p });
      horn(parts, { from: [p.x, p.y + 0.05, p.z], dir: [Math.cos(a + 1.3) * 0.5, 0.9, Math.sin(a + 1.3) * 0.5], len: 0.4, curl: [Math.cos(a) * 0.15, 0.1, Math.sin(a) * 0.15], r: 0.07, color: C.fire });
    }
    // sacred rope collar with a bell
    parts.add(torus(0.3, 0.035, 8, 32), { color: C.accent, glow: 0.3, pos: [0, info.bodyY + 0.28, info.chest.z - 0.35], rot: [deg(55), 0, 0] });
    parts.add(ellipsoid(0.07, 0.07, 0.07, 10, 8), { color: '#ffd36b', glow: 0.5, pos: [0, info.bodyY + 0.05, info.chest.z - 0.6] });
  },
};
