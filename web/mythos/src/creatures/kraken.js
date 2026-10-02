// Kraken — rising from the fjord: mantle, fins, lantern eyes and ten suckered arms.
import { v3, deg, lerp, curve, tube, profile, taper, ellipsoid, cone, torus, lathe, Parts, alongY } from '../core/geo.js';
import { frameAt, eye } from './anatomy.js';

const C = { mantle: '#3d6bff', arm: '#5aa0ff', under: '#8fd0ff', sucker: '#aef0ff', eyeC: '#ff4fa3', fin: '#7cc0ff', ridge: '#9fe8ff' };

export default {
  name: 'Kraken', native: 'Krake · Sjøtroll', country: 'Norway', key: 'norway', size: 7.4, lift: 0, yaw: Math.PI,
  material: { tint: '#ffffff', edge: '#8fe8ff', fill: 0.5, pattern: 0.3 },
  anim: { wave: [0.1, 0.09, 0.1, 1.5, 1.6], bob: [0.05, 0.7], breathe: 0.006, sway: [0.04, 0.35], waveRamp: 1.0 },
  build(parts) {
    // mantle: tall tapered body
    parts.add(lathe([[0.01, 5.4], [0.45, 5.0], [0.95, 4.0], [1.25, 2.9], [1.3, 2.0], [1.15, 1.4], [0.9, 1.1]], 28), { color: C.mantle });
    // mantle ridges
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; for (let k = 0; k < 6; k++) { const y = 1.6 + k * 0.6, r = 1.3 - Math.pow(Math.max(0, (y - 2.0) / 3.4), 1.6) * 1.25; parts.add(ellipsoid(0.08, 0.14, 0.08, 6, 5), { color: C.ridge, glow: 0.15, pos: [Math.cos(a) * r, y, Math.sin(a) * r] }); } }
    // fins
    for (const sx of [1, -1]) parts.add(ellipsoid(1.5, 0.08, 0.9, 16, 8), { color: C.fin, pos: [sx * 1.1, 4.2, 0], rot: [0, 0, sx * deg(-25)] });
    // head band + eyes
    parts.add(torus(1.05, 0.12, 10, 36), { color: C.under, pos: [0, 1.25, 0], rot: [Math.PI / 2, 0, 0] });
    for (const sx of [1, -1]) {
      parts.add(ellipsoid(0.42, 0.42, 0.3, 18, 12), { color: C.under, pos: [sx * 0.95, 1.65, -0.75] });
      eye(parts, [sx * 1.02, 1.65, -1.0], 0.26, C.eyeC, 1.2);
      parts.add(ellipsoid(0.1, 0.1, 0.06, 10, 8), { color: '#ffffff', glow: 1.5, pos: [sx * 1.05, 1.7, -1.24] });
    }
    // beak at the centre underneath
    parts.add(cone(0.22, 0.4, 8), { color: '#1a2a5a', quat: alongY(v3(0, -1, 0)), pos: [0, 1.1, 0] });
    // ten arms: 8 regular + 2 long tentacles
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + 0.3, long = i % 5 === 2;
      const dir = v3(Math.cos(a), 0, Math.sin(a));
      const reach = long ? 4.6 : 3.0 + 0.5 * Math.sin(i * 2.1);
      const base = v3(dir.x * 0.75, 1.1, dir.z * 0.75);
      const curlUp = long ? 2.6 : 1.1 + 0.7 * ((i * 7) % 3) / 2;
      const side = v3(-dir.z, 0, dir.x).multiplyScalar((i % 2 ? 1 : -1) * 0.6);
      const c = curve([base, base.clone().addScaledVector(dir, reach * 0.3).add(v3(0, -0.6, 0)), base.clone().addScaledVector(dir, reach * 0.65).add(v3(0, -1.0, 0)),
        base.clone().addScaledVector(dir, reach * 0.95).add(side).add(v3(0, -1.0 + curlUp * 0.4, 0)), base.clone().addScaledVector(dir, reach * 0.8).add(side.clone().multiplyScalar(1.6)).add(v3(0, -0.9 + curlUp, 0))]);
      const L = c.getLength();
      const r0 = long ? 0.2 : 0.3;
      parts.add(tube(c, { segments: 60, radial: 12, radius: (t) => lerp(r0, 0.03, Math.pow(t, 0.8)) + (long && t > 0.8 ? 0.12 * Math.sin((t - 0.8) / 0.2 * Math.PI) : 0), caps: true, up: [0, 1, 0], param: (t) => t * L }), { color: C.arm });
      // underside membrane + two rows of suckers
      const n = long ? 26 : 20;
      for (let k = 2; k < n; k++) {
        const t = k / n; const { P, U, S } = frameAt(c, t); const r = lerp(r0, 0.03, Math.pow(t, 0.8));
        const sr = Math.max(0.03, r * 0.42);
        for (const sx of [1, -1]) {
          const q = alongY(U.clone().multiplyScalar(-1).addScaledVector(S, sx * 0.4).normalize());
          parts.add(torus(sr, sr * 0.32, 6, 12), { color: C.sucker, glow: 0.2, pos: P.clone().addScaledVector(U, -r * 0.85).addScaledVector(S, sx * r * 0.5), quat: q.clone().multiply(alongY([0, 0, 1])), param: t * L });
        }
      }
    }
  },
};
