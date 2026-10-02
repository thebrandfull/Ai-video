// Sphinx (أبو الهول) — lion couchant with a pharaoh's head and striped nemes.
import { v3, deg, lathe, box, boxC, ellipsoid, cone, torus, curve, tube, taper, Parts, alongY } from '../core/geo.js';
import { quadruped, eye, placeHead, horn } from './anatomy.js';

const C = { body: '#d9a95e', belly: '#f0d2a0', face: '#f2c98a', gold: '#ffd36b', lapis: '#4a7bff', eye: '#6fd0ff', red: '#ff5a4a' };

function pharaohHead() {
  const h = new Parts();
  h.add(ellipsoid(0.3, 0.37, 0.3, 20, 16), { color: C.face, pos: [0, 0.05, 0.12] });
  h.add(cone(0.06, 0.16, 6), { color: C.face, quat: alongY(v3(0, -0.25, 1).normalize()), pos: [0, 0.02, 0.36] });
  h.add(ellipsoid(0.09, 0.03, 0.04, 10, 6), { color: C.red, glow: 0.2, pos: [0, -0.12, 0.4] });
  for (const sx of [1, -1]) {
    eye(h, [sx * 0.12, 0.1, 0.36], 0.05, C.eye, 1.0);
    h.add(ellipsoid(0.1, 0.02, 0.03, 8, 4), { color: C.lapis, glow: 0.3, pos: [sx * 0.12, 0.17, 0.38] });
  }
  // striped nemes: alternating gold / lapis bands, open at the front
  const prof = [[0.02, 0.56], [0.3, 0.52], [0.4, 0.38], [0.42, 0.1], [0.5, -0.2], [0.62, -0.5], [0.66, -0.62]];
  const bands = 14, start = deg(50), total = deg(260), step = total / bands;
  for (let k = 0; k < bands; k++) h.add(lathe(prof, 2, start + k * step, step), { color: k % 2 ? C.lapis : C.gold, pos: [0, 0.05, 0.05] });
  // brow band + lappets
  h.add(torus(0.34, 0.03, 8, 32, Math.PI * 1.1), { color: C.gold, glow: 0.3, pos: [0, 0.3, 0.1], rot: [Math.PI / 2, 0, -Math.PI * 0.05 - Math.PI / 2 + Math.PI * 0.5] });
  for (const sx of [1, -1]) {
    for (let k = 0; k < 4; k++) h.add(boxC(0.22, 0.18, 0.09), { color: k % 2 ? C.lapis : C.gold, pos: [sx * 0.33, -0.1 - k * 0.18, 0.28] });
  }
  // uraeus cobra
  const cobra = curve([[0, 0.25, 0.3], [0, 0.5, 0.42], [0, 0.72, 0.4]]);
  h.add(tube(cobra, { segments: 10, radial: 8, radius: taper(0.05, 0.02), caps: true }), { color: C.gold, glow: 0.3 });
  h.add(ellipsoid(0.11, 0.14, 0.04, 12, 10), { color: C.gold, glow: 0.4, pos: [0, 0.72, 0.4] });
  h.add(ellipsoid(0.03, 0.03, 0.03, 8, 6), { color: C.red, glow: 1, pos: [0, 0.76, 0.44] });
  // false beard
  h.add(boxC(0.1, 0.36, 0.1), { color: C.lapis, pos: [0, -0.4, 0.3] });
  h.add(boxC(0.11, 0.08, 0.11), { color: C.gold, pos: [0, -0.22, 0.3] });
  return h;
}

export default {
  name: 'Sphinx', native: 'أبو الهول · Abu al-Hawl', country: 'Egypt', key: 'egypt', size: 7.0, lift: 0, yaw: Math.PI - 0.3,
  material: { tint: '#ffffff', edge: '#ffd27a', fill: 0.55 },
  anim: { breathe: 0.005, wave: [0.06, 0.02, 0.06, 2.0, 1.8], waveRamp: 0.6, sway: [0.015, 0.4] },
  build(parts) {
    const info = quadruped(parts, {
      len: 2.9, chest: 0.6, waist: 0.5, hip: 0.56, bodyY: 1.3, arch: 0.05, legR: 0.15, stance: 0.36, color: C.body, belly: C.belly,
      pawR: 0.17, toes: 4, clawColor: C.gold, pose: 'lie', neck: { len: 0.55, r0: 0.4, r1: 0.3, angle: 80, bulge: 0 },
      tail: { len: 1.6, r: 0.08, tuft: C.gold, pts: [[0, 0, 0], [0.3, 0.05, 0.5], [0.7, 0.05, 0.3], [1.0, 0.1, -0.2]] },
    });
    placeHead(parts, pharaohHead(), info.pos.clone().add(v3(0, 0.15, 0)), v3(0, 0, -1), { scale: 1.25 });
    // broad collar (usekh) and shoulder plates
    parts.add(torus(0.55, 0.07, 10, 40, Math.PI), { color: C.lapis, glow: 0.3, pos: [0, info.bodyY + 0.25, info.chest.z - 0.35], rot: [deg(100), 0, Math.PI] });
    parts.add(torus(0.68, 0.05, 10, 40, Math.PI), { color: C.gold, glow: 0.3, pos: [0, info.bodyY + 0.2, info.chest.z - 0.35], rot: [deg(100), 0, Math.PI] });
    // sun disc above the head (Ra)
    const top = info.pos.clone().add(v3(0, 1.0, 0));
    parts.add(torus(0.28, 0.03, 8, 40), { color: C.gold, glow: 0.8, pos: top, rot: [0, 0, 0] });
    parts.add(ellipsoid(0.2, 0.2, 0.04, 20, 12), { color: C.red, glow: 0.6, pos: top });
  },
};
