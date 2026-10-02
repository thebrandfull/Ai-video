// Procedural geometry toolkit: curves, variable-radius tubes, primitives,
// mirroring and a part list that bakes transforms + per-vertex colour into a
// single merged BufferGeometry (one draw call per creature / set).
import * as THREE from 'three';

export const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const deg = (d) => (d * Math.PI) / 180;
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const toV = (p) => (p instanceof THREE.Vector3 ? p : v3(p[0], p[1], p[2]));

/** Deterministic PRNG (mulberry32) so builds and screenshots are reproducible. */
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- curves
export function curve(points, { closed = false, tension = 0.5 } = {}) {
  return new THREE.CatmullRomCurve3(points.map(toV), closed, 'catmullrom', tension);
}
export function line(a, b) { return new THREE.LineCurve3(toV(a), toV(b)); }
export function bezier(a, b, c, d) { return new THREE.CubicBezierCurve3(toV(a), toV(b), toV(c), toV(d)); }
export function quadCurve(a, b, c) { return new THREE.QuadraticBezierCurve3(toV(a), toV(b), toV(c)); }

/** Radius profile helpers (t in 0..1). */
export const taper = (r0, r1, pow = 1) => (t) => lerp(r0, r1, Math.pow(t, pow));
export const bulge = (rEnd, rMid, pow = 0.8) => (t) => lerp(rEnd, rMid, Math.pow(Math.sin(Math.PI * t), pow));
export const profile = (stops) => (t) => { // stops: [[t, r], ...] piecewise-linear
  if (t <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) { const [t0, r0] = stops[i - 1], [t1, r1] = stops[i]; return lerp(r0, r1, (t - t0) / (t1 - t0)); }
  }
  return stops[stops.length - 1][1];
};

// ---------------------------------------------------------------- tube
/**
 * Tube swept along a curve with per-t radius, elliptical squash and an
 * optional per-vertex "param" (distance along the limb) used by the shaders
 * for travelling-wave animation. Caps are closed with fans.
 */
export function tube(curveObj, opts = {}) {
  const {
    segments = 64, radial = 14, radius = 0.2, squash = null, uScale = 1,
    caps = true, twist = 0, param = null, up = null,
  } = opts;
  const rf = typeof radius === 'function' ? radius : () => radius;
  const pf = typeof param === 'function' ? param : (param == null ? () => -1 : () => param);
  const frames = curveObj.computeFrenetFrames(segments, false);
  if (up) { // stabilise frames against a reference up vector (no rolling along the limb)
    const U = toV(up).clone().normalize();
    for (let i = 0; i <= segments; i++) {
      const T = frames.tangents[i];
      const N = U.clone().addScaledVector(T, -T.dot(U));
      if (N.lengthSq() < 1e-6) continue;
      N.normalize();
      frames.normals[i].copy(N);
      frames.binormals[i].crossVectors(T, N);
    }
  }
  const pos = [], nor = [], uv = [], prm = [], idx = [];
  const P = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    curveObj.getPointAt(t, P);
    const r = rf(t);
    const sq = squash ? squash(t) : [1, 1];
    const tw = twist * t;
    const N = frames.normals[i], B = frames.binormals[i];
    const pv = pf(t);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2 + tw;
      const c = Math.cos(a), s = Math.sin(a);
      v.set(0, 0, 0).addScaledVector(N, c * r * sq[0]).addScaledVector(B, s * r * sq[1]);
      pos.push(P.x + v.x, P.y + v.y, P.z + v.z);
      v.set(0, 0, 0).addScaledVector(N, c / sq[0]).addScaledVector(B, s / sq[1]).normalize();
      nor.push(v.x, v.y, v.z);
      uv.push(t * uScale, j / radial);
      prm.push(pv);
    }
  }
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j, b = a + radial + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  if (caps) {
    for (const end of [0, 1]) {
      const i = end === 0 ? 0 : segments;
      curveObj.getPointAt(end, P);
      const T = frames.tangents[i].clone().multiplyScalar(end === 0 ? -1 : 1);
      const ci = pos.length / 3;
      pos.push(P.x, P.y, P.z); nor.push(T.x, T.y, T.z); uv.push(end, 0.5); prm.push(pf(end));
      const ring = i * (radial + 1);
      for (let j = 0; j < radial; j++) {
        if (end === 0) idx.push(ci, ring + j + 1, ring + j);
        else idx.push(ci, ring + j, ring + j + 1);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('aParam', new THREE.Float32BufferAttribute(prm, 1));
  g.setIndex(idx);
  g.userData.hasParam = param != null;
  // make sure the winding faces outward (frames can be left- or right-handed)
  const pa = g.getAttribute('position'), na = g.getAttribute('normal');
  const A = new THREE.Vector3().fromBufferAttribute(pa, idx[0]);
  const Bv = new THREE.Vector3().fromBufferAttribute(pa, idx[1]);
  const C = new THREE.Vector3().fromBufferAttribute(pa, idx[2]);
  const fn = new THREE.Vector3().subVectors(Bv, A).cross(new THREE.Vector3().subVectors(C, A));
  const vn = new THREE.Vector3().fromBufferAttribute(na, idx[0]);
  if (fn.dot(vn) < 0) flipWinding(g);
  return g;
}

export function flipWinding(g) {
  const ix = g.index.array;
  for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; }
  g.index.needsUpdate = true;
  return g;
}

/** Mirror a geometry across the YZ plane (x -> -x) keeping outward winding. */
export function mirrorX(g) {
  const m = g.clone();
  const p = m.getAttribute('position'), n = m.getAttribute('normal');
  for (let i = 0; i < p.count; i++) { p.setX(i, -p.getX(i)); if (n) n.setX(i, -n.getX(i)); }
  if (!m.index) m.setIndex([...Array(p.count).keys()]);
  flipWinding(m);
  return m;
}

// ---------------------------------------------------------------- primitives
export function ellipsoid(rx, ry = rx, rz = rx, ws = 24, hs = 16) {
  const g = new THREE.SphereGeometry(1, ws, hs);
  g.scale(rx, ry, rz);
  g.computeVertexNormals();
  return g;
}
export function cone(r, h, radial = 16, rTop = 0) {
  const g = new THREE.CylinderGeometry(rTop, r, h, radial, 1, false);
  g.translate(0, h / 2, 0); // base at origin, points +y
  return g;
}
export function cylinder(r, h, radial = 16, rTop = r) {
  const g = new THREE.CylinderGeometry(rTop, r, h, radial, 1, false);
  g.translate(0, h / 2, 0);
  return g;
}
export function box(w, h, d, seg = 1) { const g = new THREE.BoxGeometry(w, h, d, seg, seg, seg); g.translate(0, h / 2, 0); return g; }
export function boxC(w, h, d) { return new THREE.BoxGeometry(w, h, d); }
export function disc(r, seg = 32) { return new THREE.CircleGeometry(r, seg); }
export function ring(ri, ro, seg = 48) { return new THREE.RingGeometry(ri, ro, seg); }
export function torus(r, t, rs = 12, ts = 48, arc = Math.PI * 2) { return new THREE.TorusGeometry(r, t, rs, ts, arc); }
export function pyramid(side, h, sides = 4) {
  const r = side / (2 * Math.sin(Math.PI / sides));
  const g = new THREE.ConeGeometry(r, h, sides, 1, false);
  g.rotateY(Math.PI / sides);
  g.translate(0, h / 2, 0);
  return g;
}
export function lathe(points, seg = 32, phiStart = 0, phiLength = Math.PI * 2) {
  const g = new THREE.LatheGeometry(points.map((p) => new THREE.Vector2(p[0], p[1])), seg, phiStart, phiLength);
  g.computeVertexNormals();
  return g;
}
export function extrude(points2d, depth, { bevel = 0, curveSegments = 12 } = {}) {
  const shape = new THREE.Shape(points2d.map((p) => new THREE.Vector2(p[0], p[1])));
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments });
  g.translate(0, 0, -depth / 2);
  return g;
}
export function plane(w, h, ws = 1, hs = 1) { return new THREE.PlaneGeometry(w, h, ws, hs); }

// ---------------------------------------------------------------- transforms
const Y = new THREE.Vector3(0, 1, 0);
export function mat({ pos, rot, scale, quat } = {}) {
  const m = new THREE.Matrix4();
  const q = quat ? quat.clone() : new THREE.Quaternion();
  if (rot) q.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2])));
  const s = scale == null ? v3(1, 1, 1) : (typeof scale === 'number' ? v3(scale, scale, scale) : toV(scale));
  m.compose(pos ? toV(pos) : v3(), q, s);
  return m;
}
/** Rotation that takes +y onto `dir` (for cones / cylinders). */
export function alongY(dir) { return new THREE.Quaternion().setFromUnitVectors(Y, toV(dir).clone().normalize()); }
/** Matrix placing a +z-forward part at `from` looking at `to`. */
export function lookMat(from, to, up = Y) {
  const m = new THREE.Matrix4().lookAt(toV(to), toV(from), toV(up));
  m.setPosition(toV(from));
  return m;
}
export function applyMat(g, m) { g.applyMatrix4(m); return g; }

// ---------------------------------------------------------------- parts
/**
 * Collects geometries with a colour / glow each, bakes their transforms and
 * merges everything into one geometry with aColor, aGlow and aParam attributes.
 */
export class Parts {
  constructor() { this.list = []; this.defaultParam = null; }
  add(geo, opts = {}) {
    const { color = '#9ff', glow = 0, pos, rot, scale, quat, matrix, param = null } = opts;
    const m = matrix ? matrix : (pos || rot || scale || quat ? mat({ pos, rot, scale, quat }) : null);
    if (m) geo.applyMatrix4(m);
    if (!geo.getAttribute('normal')) geo.computeVertexNormals();
    // param priority: explicit number > tube's own param function > list default > none (-1)
    if (typeof param === 'number' || !geo.userData.hasParam) {
      const n = geo.getAttribute('position').count;
      const v = typeof param === 'number' ? param : (this.defaultParam ?? -1);
      geo.setAttribute('aParam', new THREE.BufferAttribute(new Float32Array(n).fill(v), 1));
    }
    this.list.push({ geo, color: new THREE.Color(color), glow });
    return geo;
  }
  addParts(other, opts = {}) { // merge another Parts (keeps its colours), applying a transform
    const g = other.merge();
    const { matrix, pos, rot, scale, quat, mirror = false } = opts;
    const m = matrix ? matrix : (pos || rot || scale || quat ? mat({ pos, rot, scale, quat }) : null);
    if (m) g.applyMatrix4(m);
    const gg = mirror ? mirrorX(g) : g;
    this.list.push({ geo: gg, color: null, glow: 0 });
    return gg;
  }
  merge() {
    let vCount = 0, iCount = 0;
    for (const p of this.list) {
      const c = p.geo.getAttribute('position').count;
      vCount += c; iCount += p.geo.index ? p.geo.index.count : c;
    }
    const position = new Float32Array(vCount * 3), normal = new Float32Array(vCount * 3), uv = new Float32Array(vCount * 2);
    const aColor = new Float32Array(vCount * 3), aGlow = new Float32Array(vCount), aParam = new Float32Array(vCount);
    const index = new Uint32Array(iCount);
    let vo = 0, io = 0;
    for (const p of this.list) {
      const g = p.geo, c = g.getAttribute('position').count;
      position.set(g.getAttribute('position').array.subarray(0, c * 3), vo * 3);
      normal.set(g.getAttribute('normal').array.subarray(0, c * 3), vo * 3);
      const ua = g.getAttribute('uv'); if (ua) uv.set(ua.array.subarray(0, c * 2), vo * 2);
      const ca = g.getAttribute('aColor'), ga = g.getAttribute('aGlow'), pa = g.getAttribute('aParam');
      if (ca) aColor.set(ca.array.subarray(0, c * 3), vo * 3);
      else for (let i = 0; i < c; i++) { aColor[(vo + i) * 3] = p.color.r; aColor[(vo + i) * 3 + 1] = p.color.g; aColor[(vo + i) * 3 + 2] = p.color.b; }
      if (ga) aGlow.set(ga.array.subarray(0, c), vo); else aGlow.fill(p.glow, vo, vo + c);
      if (pa) aParam.set(pa.array.subarray(0, c), vo); else aParam.fill(-1, vo, vo + c);
      if (g.index) { const ia = g.index.array; for (let i = 0; i < ia.length; i++) index[io + i] = ia[i] + vo; io += ia.length; }
      else { for (let i = 0; i < c; i++) index[io + i] = vo + i; io += c; }
      vo += c;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(position, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setAttribute('aColor', new THREE.BufferAttribute(aColor, 3));
    g.setAttribute('aGlow', new THREE.BufferAttribute(aGlow, 1));
    g.setAttribute('aParam', new THREE.BufferAttribute(aParam, 1));
    g.setIndex(new THREE.BufferAttribute(index, 1));
    g.computeBoundingBox();
    g.computeBoundingSphere();
    return g;
  }
}

// ---------------------------------------------------------------- sampling
/** Area-weighted random surface samples (position, colour, param) of a merged geometry. */
export function samplePoints(geo, count, seed = 7) {
  const rand = rng(seed);
  const pa = geo.getAttribute('position'), ca = geo.getAttribute('aColor'), ga = geo.getAttribute('aGlow'), pr = geo.getAttribute('aParam');
  const ix = geo.index.array, triCount = ix.length / 3;
  const cum = new Float32Array(triCount);
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), t1 = new THREE.Vector3(), t2 = new THREE.Vector3();
  let total = 0;
  for (let i = 0; i < triCount; i++) {
    A.fromBufferAttribute(pa, ix[i * 3]); B.fromBufferAttribute(pa, ix[i * 3 + 1]); C.fromBufferAttribute(pa, ix[i * 3 + 2]);
    total += t1.subVectors(B, A).cross(t2.subVectors(C, A)).length() * 0.5;
    cum[i] = total;
  }
  const positions = new Float32Array(count * 3), colors = new Float32Array(count * 3), params = new Float32Array(count);
  for (let k = 0; k < count; k++) {
    const r = rand() * total;
    let lo = 0, hi = triCount - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < r) lo = mid + 1; else hi = mid; }
    const i0 = ix[lo * 3], i1 = ix[lo * 3 + 1], i2 = ix[lo * 3 + 2];
    let u = rand(), v = rand();
    if (u + v > 1) { u = 1 - u; v = 1 - v; }
    const w = 1 - u - v;
    for (let c = 0; c < 3; c++) {
      positions[k * 3 + c] = pa.array[i0 * 3 + c] * w + pa.array[i1 * 3 + c] * u + pa.array[i2 * 3 + c] * v;
      const glow = 1 + (ga.array[i0] * w + ga.array[i1] * u + ga.array[i2] * v) * 1.5;
      colors[k * 3 + c] = (ca.array[i0 * 3 + c] * w + ca.array[i1 * 3 + c] * u + ca.array[i2 * 3 + c] * v) * glow;
    }
    params[k] = pr.array[i0] * w + pr.array[i1] * u + pr.array[i2] * v;
    if (pr.array[i0] < 0 || pr.array[i1] < 0 || pr.array[i2] < 0) params[k] = -1;
  }
  return { positions, colors, params };
}

/** Normalise a merged geometry so its longest side is `size`, centred on x/z, base at y=0. */
export function fitGeometry(g, size, { lift = 0, center = true } = {}) {
  g.computeBoundingBox();
  const bb = g.boundingBox, dim = new THREE.Vector3(); bb.getSize(dim);
  const s = size / Math.max(dim.x, dim.y, dim.z);
  const cx = center ? (bb.min.x + bb.max.x) / 2 : 0, cz = center ? (bb.min.z + bb.max.z) / 2 : 0;
  g.translate(-cx, -bb.min.y, -cz);
  g.scale(s, s, s);
  g.translate(0, lift, 0);
  g.computeBoundingBox(); g.computeBoundingSphere();
  return s;
}
