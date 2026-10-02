// Unicorn (Aon-adharcach) — Scotland's national animal, rearing with a spiral horn.
import { v3, deg, lerp, curve, line, tube, profile, taper, ellipsoid, cone, torus, Parts, alongY } from '../core/geo.js';
import { quadruped, eye, mane, placeHead } from './anatomy.js';

const C = { body: '#d7def5', mane: '#b48cff', mane2: '#7cf3ff', horn: '#ffe9a8', hoof: '#c8b0ff', eye: '#7cf3ff', nose: '#ffc4d6' };

function horseHead() {
  const h = new Parts();
  h.add(ellipsoid(0.26, 0.3, 0.36, 18, 12), { color: C.body, pos: [0, 0.05, 0.1] });
  const muzzle = curve([[0, 0.0, 0.3], [0, -0.12, 0.65], [0, -0.22, 0.95]]);
  h.add(tube(muzzle, { segments: 14, radial: 14, radius: profile([[0, 0.25], [0.6, 0.18], [1, 0.13]]), squash: () => [1.1, 1], caps: true, up: [0, 1, 0] }), { color: C.body });
  for (const sx of [1, -1]) {
    h.add(ellipsoid(0.04, 0.03, 0.025, 8, 6), { color: C.nose, glow: 0.3, pos: [sx * 0.07, -0.2, 1.02] });
    eye(h, [sx * 0.2, 0.12, 0.3], 0.06, C.eye);
    h.add(cone(0.07, 0.3, 7).scale(1, 1, 0.5), { color: C.body, quat: alongY(v3(sx * 0.35, 1, -0.2).normalize()), pos: [sx * 0.14, 0.25, -0.05] });
  }
  // spiral horn
  const hc = line(v3(0, 0.3, 0.12), v3(0, 1.25, 0.55));
  h.add(tube(hc, { segments: 40, radial: 10, radius: taper(0.075, 0.008, 0.85), squash: () => [1, 0.6], twist: Math.PI * 7, caps: true }), { color: C.horn, glow: 0.45 });
  h.add(torus(0.1, 0.02, 6, 16), { color: C.horn, glow: 0.4, pos: [0, 0.3, 0.12], quat: alongY(v3(0, 0.95, 0.43).normalize()).multiply(alongY([0, 0, 1])) });
  // forelock + mane start
  mane(h, { center: [0, 0.3, -0.05], dir: [0.3, 0.2, -1], count: 10, len: 0.6, spread: 0.12, color: C.mane, seed: 7, r: 0.03, wave: 0.2 });
  mane(h, { center: [0.05, 0.28, 0.05], dir: [0.6, -0.5, 0.6], count: 6, len: 0.45, spread: 0.08, color: C.mane2, seed: 12, r: 0.025, wave: 0.2 });
  return h;
}

export default {
  name: 'Unicorn', native: 'Aon-adharcach · Unicorn', country: 'Scotland', key: 'scotland', size: 6.4, lift: 0, yaw: Math.PI - 0.45,
  material: { tint: '#ffffff', edge: '#c9a6ff', fill: 0.5 },
  anim: { wave: [0.08, 0.05, 0.1, 2.4, 2.2], bob: [0.03, 1.0], breathe: 0.004, waveRamp: 0.4 },
  build(parts) {
    const info = quadruped(parts, {
      len: 2.5, chest: 0.5, waist: 0.42, hip: 0.5, bodyY: 1.5, arch: 0.04, legR: 0.1, stance: 0.3, color: C.body, belly: null,
      pawR: 0.12, clawColor: C.hoof, hooves: true, pose: 'stand', neck: { len: 1.05, r0: 0.36, r1: 0.2, angle: 62, bulge: 0.2 },
      tail: { len: 2.0, r: 0.06, pts: [[0, 0, 0], [0, 0.2, 0.5], [0, -0.2, 1.0], [0, -0.9, 1.3]], color: C.mane },
      legPts: (sx, front, pts, { x, z, by }) => (front && sx > 0 ? [[x * 0.75, by + 0.12, z], [x, by * 0.62, z - 0.45], [x, by * 0.45, z - 0.3], [x, by * 0.35, z - 0.15]] : null),
    });
    placeHead(parts, horseHead(), info.pos, info.dir.clone().add(v3(0, -0.55, 0)).normalize());
    // flowing mane along the crest of the neck
    for (let k = 0; k < 7; k++) {
      const t = k / 6;
      const p = v3(0.02, info.bodyY + 0.3 + t * 0.95, info.chest.z - 0.1 - t * 0.55);
      mane(parts, { center: [p.x, p.y, p.z], dir: [0.75, 0.15 - t * 0.3, 0.45], count: 7, len: 0.9 - t * 0.15, spread: 0.12, color: k % 2 ? C.mane : C.mane2, seed: 30 + k, r: 0.035, wave: 0.35 });
    }
    // tail hair
    const te = info.tailEnd;
    mane(parts, { center: [0, info.bodyY + 0.15, info.hip.z + 0.3], dir: [0.1, -0.35, 1], count: 22, len: 1.9, spread: 0.2, color: C.mane, seed: 41, r: 0.035, wave: 0.5 });
    mane(parts, { center: [0, info.bodyY + 0.1, info.hip.z + 0.3], dir: [-0.1, -0.5, 1], count: 12, len: 1.6, spread: 0.15, color: C.mane2, seed: 42, r: 0.03, wave: 0.5 });
    // feathered fetlocks
    for (const [x, z] of [[0.3, info.hip.z + 0.05], [-0.3, info.hip.z + 0.05], [-0.3, info.chest.z]]) mane(parts, { center: [x, 0.35, z], dir: [0, -1, 0.2], count: 8, len: 0.3, spread: 0.12, color: C.mane2, seed: 50, r: 0.025, param: false });
  },
};
