// Reusable anatomy builders shared by the creatures.
import * as THREE from 'three';
import { v3, deg, lerp, curve, quadCurve, line, tube, profile, taper, ellipsoid, cone, cylinder, torus, Parts, mat, alongY, lookMat, mirrorX, rng } from '../core/geo.js';

const UP = new THREE.Vector3(0, 1, 0);

/** Frame (point, tangent, up', side) at t along a curve, with up projected perpendicular to the tangent. */
export function frameAt(c, t, up = UP) {
  const P = c.getPointAt(t), T = c.getTangentAt(t).normalize();
  const U = up.clone().addScaledVector(T, -T.dot(up)).normalize();
  const S = new THREE.Vector3().crossVectors(T, U).normalize();
  return { P, T, U, S };
}

/** Row of flattened fin spikes along the top of a body curve. */
export function spikeRow(parts, c, { count = 30, from = 0.05, to = 0.95, size = () => 0.3, radius = () => 0.3, color = '#fc8', lean = 0.35, width = 0.35, alternate = true, param = null, flat = true } = {}) {
  for (let i = 0; i < count; i++) {
    const t = lerp(from, to, count === 1 ? 0 : i / (count - 1));
    const { P, T, U, S } = frameAt(c, t);
    let h = size(t) * (alternate && i % 2 ? 0.65 : 1);
    const g = cone(h * width, h, 6);
    if (flat) g.scale(0.35, 1, 1);
    g.rotateX(lean);
    const m = new THREE.Matrix4().makeBasis(S, U, T);
    m.setPosition(P.clone().addScaledVector(U, radius(t) * 0.85));
    parts.add(g, { color, matrix: m, param: param ? param(t) : null });
  }
}

/** Glowing eye. */
export function eye(parts, pos, r, color = '#fff6b0', glow = 1.3) {
  parts.add(ellipsoid(r, r * 0.8, r * 0.9, 14, 10), { color, glow, pos });
}

/** Curved horn / tusk / spike from `from` along `dir`, bending by `curl`. */
export function horn(parts, { from, dir, len = 0.8, curl = [0, 0.3, 0], r = 0.08, color = '#fd9', segments = 16, radial = 8, param = null, twist = 0, squash = null }) {
  const F = v3(...from), D = v3(...dir).normalize();
  const c = quadCurve(F, F.clone().addScaledVector(D, len * 0.55), F.clone().addScaledVector(D, len).add(v3(...curl)));
  parts.add(tube(c, { segments, radial, radius: taper(r, 0.012, 0.9), caps: true, param, twist, squash }), { color });
  return c;
}

/** Cluster of flowing strands (mane, beard, tail hair). */
export function mane(parts, { center, dir, count = 16, len = 0.8, spread = 0.6, r = 0.035, color = '#fc6', seed = 3, wave = 0.15, param = true, radial = 6 }) {
  const rand = rng(seed);
  const C = v3(...center), D = v3(...dir).normalize();
  const A = Math.abs(D.y) < 0.9 ? v3(0, 1, 0) : v3(1, 0, 0);
  const S1 = new THREE.Vector3().crossVectors(D, A).normalize(), S2 = new THREE.Vector3().crossVectors(D, S1).normalize();
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2, rr = Math.sqrt(rand()) * spread;
    const off = S1.clone().multiplyScalar(Math.cos(a) * rr).addScaledVector(S2, Math.sin(a) * rr);
    const L = len * (0.6 + rand() * 0.6);
    const p0 = C.clone().add(off.clone().multiplyScalar(0.35));
    const p1 = p0.clone().addScaledVector(D, L * 0.4).add(off.clone().multiplyScalar(0.5)).addScaledVector(S1, (rand() - 0.5) * wave);
    const p2 = p0.clone().addScaledVector(D, L * 0.75).add(off.clone().multiplyScalar(0.9)).addScaledVector(S2, (rand() - 0.5) * wave * 2);
    const p3 = p0.clone().addScaledVector(D, L).add(off.clone().multiplyScalar(1.2)).addScaledVector(S1, (rand() - 0.5) * wave * 2);
    const c = curve([p0, p1, p2, p3]);
    parts.add(tube(c, { segments: 10, radial, radius: taper(r * (0.7 + rand() * 0.6), 0.004, 0.8), caps: true, param: param ? (t) => t * L : null }), { color });
  }
}

/** A clawed foot: pad + toes + claws. `fwd` is the direction the toes point. */
export function paw(parts, { pos, fwd = [0, 0, -1], r = 0.14, toes = 4, color = '#fff', claw = '#ffe', spread = 0.9, clawLen = null, flat = 0.55 }) {
  const P = v3(...pos), F = v3(...fwd).normalize();
  const S = new THREE.Vector3().crossVectors(UP, F).normalize();
  parts.add(ellipsoid(r * 1.05, r * flat, r * 1.15, 14, 10), { color, pos: P.clone().addScaledVector(F, r * 0.2) });
  const cl = clawLen ?? r * 0.9;
  for (let k = 0; k < toes; k++) {
    const a = toes === 1 ? 0 : (k / (toes - 1) - 0.5) * spread;
    const d = F.clone().multiplyScalar(Math.cos(a)).addScaledVector(S, Math.sin(a)).normalize();
    const base = P.clone().addScaledVector(F, r * 0.5);
    const tip = base.clone().addScaledVector(d, r * 1.25);
    tip.y -= r * 0.1;
    parts.add(tube(line(base, tip), { segments: 4, radial: 7, radius: taper(r * 0.3, r * 0.2), caps: true }), { color });
    const g = cone(r * 0.17, cl, 7);
    parts.add(g, { color: claw, quat: alongY(d.clone().add(v3(0, -0.6, 0)).normalize()), pos: tip.clone().addScaledVector(d, r * 0.05) });
  }
}

/** Bird talon: 3 front toes + 1 rear. */
export function talon(parts, { pos, fwd = [0, 0, -1], r = 0.12, color = '#fc6', claw = '#fff' }) {
  paw(parts, { pos, fwd, r, toes: 3, color, claw, spread: 1.2, flat: 0.7 });
  const F = v3(...fwd).normalize();
  const back = v3(...pos).addScaledVector(F, -r * 0.6);
  parts.add(tube(line(v3(...pos), back), { segments: 3, radial: 6, radius: taper(r * 0.28, r * 0.18), caps: true }), { color });
  parts.add(cone(r * 0.15, r * 0.7, 7), { color: claw, quat: alongY(F.clone().multiplyScalar(-1).add(v3(0, -0.5, 0)).normalize()), pos: back });
}

/** Hooked beak (upper + lower mandible). Head-local: +z forward. */
export function beak(parts, { pos = [0, 0, 0.3], len = 0.45, r = 0.13, color = '#ffd86a', hook = 0.18, cere = '#ff9b3d' }) {
  const P = v3(...pos);
  const up = quadCurve(P, P.clone().add(v3(0, 0.04, len * 0.6)), P.clone().add(v3(0, -hook, len)));
  parts.add(tube(up, { segments: 14, radial: 10, radius: profile([[0, r], [0.5, r * 0.8], [0.85, r * 0.45], [1, 0.01]]), squash: () => [1, 0.85], caps: true, up: [0, 1, 0] }), { color });
  const lo = quadCurve(P.clone().add(v3(0, -r * 0.7, 0)), P.clone().add(v3(0, -r * 0.8, len * 0.45)), P.clone().add(v3(0, -r * 0.6, len * 0.68)));
  parts.add(tube(lo, { segments: 10, radial: 8, radius: profile([[0, r * 0.8], [0.7, r * 0.5], [1, 0.02]]), squash: () => [1, 0.6], caps: true, up: [0, 1, 0] }), { color });
  parts.add(ellipsoid(r * 0.9, r * 0.5, r * 0.5, 10, 8), { color: cere, pos: P.clone().add(v3(0, r * 0.45, 0.05)) });
}

/**
 * Feathered wing built in wing-local space: root at the origin, span along +x,
 * trailing edge toward +z. Returns the merged geometry (already transformed).
 */
export function featherWing(parts, { span = 3, chord = 1.0, primaries = 9, secondaries = 7, color = '#fff', tip = '#fff', covert = null, lift = 0.4, droop = 0.3, pos = [0, 0, 0], rot = [0, 0, 0], mirror = false, thickness = 0.1, coverts = 2 }) {
  const w = new Parts();
  const arm = curve([[0, 0, 0], [span * 0.42, lift * 0.45, -0.12 * chord], [span * 0.78, lift * 0.95, -0.25 * chord], [span, lift * 1.15, -0.1 * chord]]);
  w.add(tube(arm, { segments: 24, radial: 10, radius: profile([[0, 0.1 * chord], [0.5, 0.075 * chord], [1, 0.03 * chord]]), caps: true }), { color });
  const total = secondaries + primaries;
  const feather = (A, ang, len, wmax, col, layer) => {
    const dir = v3(Math.sin(ang), 0, Math.cos(ang));
    const end = A.clone().addScaledVector(dir, len); end.y -= droop * len * 0.55 * Math.max(0.2, Math.sin(ang));
    const mid = A.clone().addScaledVector(dir, len * 0.5); mid.y += 0.015;
    const c = quadCurve(A, mid, end);
    const g = tube(c, { segments: 9, radial: 8, radius: (t) => wmax * Math.pow(Math.sin(Math.PI * (0.05 + 0.95 * t)), 0.55) * (1 - 0.25 * t), squash: () => [thickness, 1], caps: true, up: [0, 1, 0] });
    g.translate(0, -0.012 * layer, 0);
    w.add(g, { color: col });
  };
  for (let i = 0; i < total; i++) {
    const u = 0.12 + 0.88 * (i / (total - 1));
    const A = arm.getPointAt(u);
    const isPrim = i >= secondaries;
    const k = isPrim ? (i - secondaries) / Math.max(1, primaries - 1) : i / Math.max(1, secondaries);
    const ang = isPrim ? lerp(0.18, 1.3, k) : lerp(-0.12, 0.18, k);
    let len = isPrim ? chord * lerp(1.2, 1.8, Math.sin(k * Math.PI * 0.8)) : chord * lerp(0.95, 1.15, k);
    if (isPrim && k > 0.8) len *= lerp(1, 0.78, (k - 0.8) / 0.2);
    const col = isPrim && k > 0.45 ? tip : color;
    feather(A, ang, len, chord * 0.16 * (isPrim ? 1 : 1.2), col, i);
    if (coverts >= 1) feather(A.clone().add(v3(0, 0.03, -0.02)), ang * 0.85, len * 0.48, chord * 0.14, covert || color, i - 30);
    if (coverts >= 2) feather(A.clone().add(v3(0, 0.055, -0.06)), ang * 0.7, len * 0.26, chord * 0.1, covert || color, i - 60);
  }
  return parts.addParts(w, { pos, rot, mirror });
}

/**
 * Generic quadruped: arched body tube, four legs (stand / sit / lie poses),
 * neck and tail. Returns head attachment info.
 */
export function quadruped(parts, o = {}) {
  const {
    len = 2.2, chest = 0.5, waist = 0.42, hip = 0.46, bodyY = 1.15, arch = 0.08, legR = 0.12, stance = 0.3,
    color = '#fff', belly = null, pawR = 0.13, toes = 4, clawColor = '#fff', pose = 'stand',
    neck = { len: 0.8, r0: 0.3, r1: 0.2, angle: 55 }, tail = { len: 1.6, r: 0.08, pts: null, tuft: null, color: null },
    legColor = null, hooves = false, param = null, chestFur = null, frontTalons = false, talonColor = null, legPts = null,
  } = o;
  const zc = -len / 2 + chest * 0.3, zh = len / 2 - hip * 0.3;
  const lieDrop = pose === 'lie' ? bodyY * 0.55 : 0;
  const by = bodyY - lieDrop;
  const hy = pose === 'sit' ? hip * 0.95 : by - 0.03; // hip height (sitting drops the rump)
  const body = curve([[0, hy, zh + hip * 0.55], [0, lerp(hy, by, 0.35) + arch * 0.5, lerp(zh, zc, 0.3)], [0, lerp(hy, by, 0.75) + arch, lerp(zh, zc, 0.7)], [0, by + 0.02, zc - chest * 0.55]]);
  parts.add(tube(body, { segments: 40, radial: 22, radius: profile([[0, hip * 0.5], [0.12, hip], [0.5, waist], [0.82, chest], [1, chest * 0.5]]), caps: true, up: [0, 1, 0], squash: () => [0.92, 1] }), { color });
  if (belly) {
    const bc = curve([[0, by - hip * 0.55, zh + hip * 0.2], [0, by - waist * 0.75, (zh + zc) / 2], [0, by - chest * 0.6, zc]]);
    parts.add(tube(bc, { segments: 20, radial: 12, radius: profile([[0, hip * 0.35], [0.5, waist * 0.5], [1, chest * 0.4]]), caps: true, up: [0, 1, 0], squash: () => [1.3, 0.5] }), { color: belly });
  }
  if (chestFur) mane(parts, { center: [0, by - chest * 0.3, zc - chest * 0.4], dir: [0, -0.6, -0.4], count: 14, len: 0.35, spread: 0.35, color: chestFur, seed: 11, r: 0.03 });
  const lc = legColor || color;
  const fz = zc - chest * 0.05, hz = zh + hip * 0.05;
  const headInfo = {};
  for (const [sx, z, front] of [[1, fz, true], [-1, fz, true], [1, hz, false], [-1, hz, false]]) {
    const x = sx * stance;
    let pts, fwd = [0, 0, -1];
    if (pose === 'stand') {
      const kz = front ? z + 0.03 : z - 0.18;
      pts = [[x * 0.75, by + 0.12, z], [x, by * 0.55, kz], [x, by * 0.28, front ? z + 0.02 : z + 0.1], [x, 0.09, front ? z - 0.04 : z]];
    } else if (pose === 'sit') {
      if (front) pts = [[x * 0.75, by + 0.08, z], [x, by * 0.5, z - 0.06], [x, 0.09, z - 0.12]];
      else pts = [[x * 0.8, hy + 0.05, z - 0.05], [x * 1.3, 0.38, z - 0.35], [x * 1.35, 0.14, z + 0.25], [x * 1.15, 0.09, z - 0.4]];
    } else {
      if (front) pts = [[x * 0.8, by - 0.05, z], [x * 1.05, 0.28, z - 0.3], [x * 1.05, 0.12, z - 0.95], [x * 1.05, 0.1, z - 1.45]];
      else pts = [[x * 0.9, by - 0.05, z], [x * 1.45, 0.3, z + 0.15], [x * 1.4, 0.11, z - 0.55]];
    }
    if (legPts) pts = legPts(sx, front, pts, { x, z, by }) || pts;
    const c = curve(pts);
    parts.add(tube(c, { segments: 22, radial: 12, radius: profile([[0, legR * 1.7], [0.3, legR * 1.15], [0.7, legR * 0.85], [1, legR * 0.9]]), caps: true }), { color: lc });
    const end = c.getPointAt(1);
    if (hooves) parts.add(cylinder(pawR * 0.95, pawR * 0.9, 12, pawR * 0.8), { color: clawColor, pos: [end.x, end.y - pawR * 0.5, end.z - pawR * 0.1], quat: alongY(c.getTangentAt(1).multiplyScalar(-1)) });
    else if (front && frontTalons) talon(parts, { pos: [end.x, pawR * 0.5, end.z], fwd, r: pawR * 1.1, color: talonColor || lc, claw: clawColor });
    else paw(parts, { pos: [end.x, pawR * 0.5, end.z], fwd, r: pawR, toes, color: lc, claw: clawColor });
  }
  // neck
  const n0 = v3(0, by + chest * 0.35, zc - chest * 0.15);
  const ang = deg(neck.angle);
  const n1 = n0.clone().add(v3(0, Math.sin(ang) * neck.len, -Math.cos(ang) * neck.len));
  const nc = quadCurve(n0, n0.clone().lerp(n1, 0.5).add(v3(0, neck.bulge ?? 0.08, 0.08)), n1);
  parts.add(tube(nc, { segments: 18, radial: 16, radius: profile([[0, neck.r0], [0.6, lerp(neck.r0, neck.r1, 0.6)], [1, neck.r1]]), caps: true, up: [0, 1, 0] }), { color });
  headInfo.pos = n1; headInfo.dir = nc.getTangentAt(1);
  // tail
  if (tail) {
    const t0 = v3(0, hy + hip * 0.25, zh + hip * 0.45);
    const pts = tail.pts || [[0, 0, 0], [0, 0.25, 0.55], [0, 0.15, 1.05], [0, -0.25, 1.45]];
    const tc = curve(pts.map((p) => t0.clone().add(v3(...p))));
    const L = tail.len;
    parts.add(tube(tc, { segments: 30, radial: 10, radius: taper(tail.r, tail.r * (tail.tuft ? 0.5 : 0.12), 0.9), caps: true, param: (t) => t * L }), { color: tail.color || color });
    if (tail.tuft) {
      const e = tc.getPointAt(1), d = tc.getTangentAt(1);
      mane(parts, { center: [e.x, e.y, e.z], dir: [d.x, d.y, d.z], count: 12, len: 0.4, spread: 0.12, color: tail.tuft, seed: 5, r: 0.03, param: false });
    }
    headInfo.tailEnd = tc.getPointAt(1);
  }
  headInfo.chest = v3(0, by, zc); headInfo.hip = v3(0, by, zh); headInfo.bodyY = by;
  return headInfo;
}

/** Teeth along a jaw curve (points toward -up). */
export function teeth(parts, c, { count = 6, from = 0.2, to = 0.9, size = 0.06, color = '#fff', side = 0.2, down = true }) {
  for (let i = 0; i < count; i++) {
    const t = lerp(from, to, i / (count - 1));
    const { P, U, S } = frameAt(c, t);
    for (const sx of [-1, 1]) {
      const g = cone(size * 0.35, size * (i % 2 ? 0.8 : 1.1), 6);
      const d = U.clone().multiplyScalar(down ? -1 : 1);
      parts.add(g, { color, quat: alongY(d), pos: P.clone().addScaledVector(S, sx * side).addScaledVector(U, down ? -0.02 : 0.02) });
    }
  }
}

/** Convenience: place a head-local Parts list at a position facing a direction. */
export function placeHead(parts, headParts, pos, dir, { roll = 0, scale = 1 } = {}) {
  const m = lookMat(pos, v3(pos.x + dir.x, pos.y + dir.y, pos.z + dir.z));
  if (roll || scale !== 1) m.multiply(mat({ rot: [0, 0, roll], scale }));
  return parts.addParts(headParts, { matrix: m });
}

/** Eagle / raptor head in head-local space (+z forward). */
export function eagleHead({ color = '#fff', beakColor = '#ffd86a', eyeColor = '#fff6b0', nape = '#fff', size = 1, crown = null } = {}) {
  const h = new Parts();
  h.add(ellipsoid(0.3 * size, 0.3 * size, 0.36 * size, 20, 14), { color, pos: [0, 0, 0.12 * size] });
  beak(h, { pos: [0, -0.02 * size, 0.42 * size], len: 0.42 * size, r: 0.13 * size, color: beakColor });
  for (const sx of [1, -1]) {
    eye(h, [sx * 0.2 * size, 0.08 * size, 0.33 * size], 0.07 * size, eyeColor);
    h.add(ellipsoid(0.14 * size, 0.05 * size, 0.1 * size, 10, 6), { color: nape, pos: [sx * 0.2 * size, 0.17 * size, 0.32 * size], rot: [0.3, 0, sx * -0.3] });
  }
  for (let i = 0; i < 12; i++) { // nape feathers
    const a = (i / 12) * Math.PI * 2;
    const d = v3(Math.cos(a) * 0.5, Math.sin(a) * 0.5 + 0.1, -1).normalize();
    h.add(cone(0.05 * size, 0.32 * size, 6).scale(1, 1, 0.4), { color: nape, quat: alongY(d), pos: [Math.cos(a) * 0.22 * size, Math.sin(a) * 0.22 * size + 0.02, -0.08 * size] });
  }
  if (crown) {
    h.add(torus(0.27 * size, 0.035 * size, 8, 32), { color: crown, glow: 0.3, pos: [0, 0.2 * size, 0.08 * size], rot: [Math.PI / 2 + 0.25, 0, 0] });
    for (let i = -3; i <= 3; i++) {
      const a = i * 0.32;
      const d = v3(Math.sin(a) * 0.35, 1, -0.15).normalize();
      h.add(cone(0.035 * size, (0.42 - Math.abs(i) * 0.06) * size, 6), { color: crown, glow: 0.3, quat: alongY(d), pos: [Math.sin(a) * 0.25 * size, 0.22 * size, Math.cos(a) * 0.1 * size] });
    }
    h.add(ellipsoid(0.05 * size, 0.07 * size, 0.05 * size, 10, 8), { color: '#ffffff', glow: 0.8, pos: [0, 0.62 * size, 0.03 * size] });
  }
  return h;
}
