// Holographic shader material (solid / wireframe / floor-reflection passes)
// plus the shared GLSL used by the particle morph system.
import * as THREE from 'three';

export const ANIM_SLOTS = 5;

/**
 * Pack an animation config into 5 vec4 uniforms shared by mesh + particle shaders.
 *  wave:   [ampX, ampY, ampZ, freq, speed]  travelling wave along aParam (limb distance)
 *  flap:   [angle, root, span, speed]       wing flap for |x| > root
 *  bob:    [amp, speed]                      vertical hover
 *  breathe: amp                              gentle scale pulse
 *  sway:   [angle, speed]                    yaw rocking
 */
export function packAnim(cfg = {}) {
  const w = cfg.wave || [0, 0, 0, 1, 1];
  const f = cfg.flap || [0, 0, 1, 1];
  const b = cfg.bob || [0, 1];
  const s = cfg.sway || [0, 1];
  return [
    new THREE.Vector4(w[0], w[1], w[2], w[3]),
    new THREE.Vector4(w[4], f[0], f[1], f[2]),
    new THREE.Vector4(f[3], b[0], b[1], cfg.breathe || 0),
    new THREE.Vector4(s[0], s[1], cfg.waveStart ?? 0.0, cfg.waveRamp ?? 1.0),
    new THREE.Vector4(cfg.phase || 0, 0, 0, 0),
  ];
}
export const emptyAnim = () => packAnim({});

export const GLSL_NOISE = /* glsl */ `
float hash31(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float hash11(float n) { return fract(sin(n) * 43758.5453123); }
float vnoise(vec3 p) {
  vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash31(i), hash31(i + vec3(1,0,0)), f.x), mix(hash31(i + vec3(0,1,0)), hash31(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash31(i + vec3(0,0,1)), hash31(i + vec3(1,0,1)), f.x), mix(hash31(i + vec3(0,1,1)), hash31(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p) { return 0.55 * vnoise(p) + 0.3 * vnoise(p * 2.07 + 11.3) + 0.15 * vnoise(p * 4.3 + 5.1); }
`;

export const GLSL_DEFORM = /* glsl */ `
vec3 deform(vec3 p, float q, vec4 a[${ANIM_SLOTS}], float t) {
  t += a[4].x;
  if (q >= 0.0) {
    float ph = a[0].w * q - t * a[1].x;
    float env = smoothstep(a[3].z, a[3].z + a[3].w, q);
    p += vec3(a[0].x * sin(ph + 1.0), a[0].y * sin(ph), a[0].z * cos(ph + 2.0)) * env;
  }
  float ax = abs(p.x);
  if (a[1].y != 0.0 && ax > a[1].z) {
    float f = clamp((ax - a[1].z) / a[1].w, 0.0, 1.5);
    float ang = a[1].y * sin(t * a[2].x - f * 0.9) * (0.3 + 0.7 * f);
    float s = sign(p.x), r = ax - a[1].z;
    p.x = s * (a[1].z + r * cos(ang));
    p.y += r * sin(ang);
  }
  float sw = a[3].x * sin(t * a[3].y);
  float c = cos(sw), sn = sin(sw);
  p.xz = vec2(c * p.x + sn * p.z, -sn * p.x + c * p.z);
  p.y += a[2].y * sin(t * a[2].z);
  p *= 1.0 + a[2].w * sin(t * 1.9);
  return p;
}
`;

const VERT = /* glsl */ `
attribute vec3 aColor; attribute float aGlow; attribute float aParam;
uniform float uTime; uniform vec4 uAnim[${ANIM_SLOTS}]; uniform float uGlitch;
varying vec3 vColor; varying float vGlow; varying vec3 vN; varying vec3 vW; varying vec3 vL; varying vec2 vUv;
${GLSL_NOISE}
${GLSL_DEFORM}
void main() {
  vec3 p = deform(position, aParam, uAnim, uTime);
  vec3 p2 = deform(position + normal * 0.02, aParam, uAnim, uTime);
  vec3 n = normalize(p2 - p);
  if (uGlitch > 0.001) {
    float band = floor(p.y * 7.0 + uTime * 11.0);
    float fr = floor(uTime * 16.0);
    float h = hash31(vec3(band, fr, 1.0));
    if (h > 1.0 - uGlitch * 0.55) p.x += (hash31(vec3(band, 7.0, fr)) - 0.5) * 0.6 * uGlitch;
  }
  vec4 w = modelMatrix * vec4(p, 1.0);
  vW = w.xyz; vL = position; vN = normalize(mat3(modelMatrix) * n);
  vColor = aColor; vGlow = aGlow; vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

const FRAG = /* glsl */ `
precision highp float;
uniform float uTime, uOpacity, uDissolve, uFill, uFresnelPow, uFresnelStr, uScanFreq, uScanSpeed, uScanStr, uWire, uMirror, uPattern, uEdgeWidth;
uniform vec3 uTint, uEdgeColor, uCamPos; uniform vec4 uDissolveDir; uniform vec2 uFade;
varying vec3 vColor; varying float vGlow; varying vec3 vN; varying vec3 vW; varying vec3 vL; varying vec2 vUv;
${GLSL_NOISE}
void main() {
  vec3 V = normalize(uCamPos - vW);
  vec3 N = normalize(vN);
  float ndv = abs(dot(N, V));
  float fres = pow(1.0 - ndv, uFresnelPow);
  // dissolve: noise + directional sweep, glowing rim at the threshold
  float n = fbm(vL * 1.6) - 0.5;
  float d = n + dot(vL, uDissolveDir.xyz) - uDissolveDir.w;
  float thr = mix(-1.1, 1.1, uDissolve);
  if (d < thr) discard;
  float edge = 1.0 - smoothstep(0.0, uEdgeWidth, d - thr);
  // scanlines (world-space bands) + fine screen lines + flicker
  float scan = 1.0 - uScanStr * (0.5 + 0.5 * sin(vW.y * uScanFreq - uTime * uScanSpeed));
  float fine = 0.92 + 0.08 * sin(gl_FragCoord.y * 1.9 + uTime * 25.0);
  float flick = 0.95 + 0.05 * sin(uTime * 43.0 + sin(uTime * 6.3) * 5.0);
  // hex "scale" pattern driven by uv
  float pat = 1.0;
  if (uPattern > 0.0) {
    vec2 g = vUv * vec2(28.0, 7.0);
    g.x += step(1.0, mod(floor(g.y), 2.0)) * 0.5;
    vec2 f = fract(g) - 0.5;
    pat = 1.0 - uPattern * (smoothstep(0.28, 0.5, length(f)) * 0.6);
  }
  vec3 base = vColor * uTint;
  float a, dist = distance(uCamPos, vW);
  vec3 col;
  if (uWire > 0.5) {
    a = 0.07 * scan;
    col = base * 1.1 + uEdgeColor * edge * 1.2;
  } else {
    a = (uFill * (0.3 + 0.55 * ndv) + fres * uFresnelStr * 0.7 + vGlow * 0.5) * scan * fine * pat;
    col = base * (uFill * 0.5 + fres * 1.05 + vGlow * 1.2) + uEdgeColor * edge * 2.2;
    a += edge * 0.6;
  }
  a *= 1.0 - smoothstep(uFade.x, uFade.y, dist);
  if (uMirror > 0.5) { a *= 0.33 * (1.0 - smoothstep(0.0, 7.0, -vW.y)); col *= 0.8; }
  a = clamp(a * uOpacity * flick, 0.0, 1.0);
  gl_FragColor = vec4(col * flick, a);
}
`;

const registry = new Set();

export function createHoloMaterial({ wire = false, mirror = false, tint = '#ffffff', edge = '#9ff7ff', fill = 0.55, fresnelPow = 2.2, fresnelStr = 1.0, pattern = 0, scan = 0.25, fade = [60, 120], opacity = 1, edgeWidth = 0.12 } = {}) {
  const m = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: !wire && !mirror,
    depthTest: true,
    blending: wire ? THREE.AdditiveBlending : THREE.NormalBlending,
    wireframe: wire,
    side: THREE.FrontSide,
    polygonOffset: wire,
    polygonOffsetFactor: wire ? -1 : 0,
    polygonOffsetUnits: wire ? -1 : 0,
    uniforms: {
      uTime: { value: 0 }, uOpacity: { value: opacity }, uDissolve: { value: 0 }, uFill: { value: fill },
      uFresnelPow: { value: fresnelPow }, uFresnelStr: { value: fresnelStr },
      uScanFreq: { value: 14 }, uScanSpeed: { value: 3.5 }, uScanStr: { value: scan },
      uWire: { value: wire ? 1 : 0 }, uMirror: { value: mirror ? 1 : 0 }, uPattern: { value: pattern }, uEdgeWidth: { value: edgeWidth },
      uTint: { value: new THREE.Color(tint) }, uEdgeColor: { value: new THREE.Color(edge) }, uCamPos: { value: new THREE.Vector3() },
      uDissolveDir: { value: new THREE.Vector4(0, 0.5, 0, 0.35) }, uFade: { value: new THREE.Vector2(fade[0], fade[1]) },
      uAnim: { value: emptyAnim() }, uGlitch: { value: 0 },
    },
  });
  registry.add(m);
  return m;
}

/** Update time / camera on every holo material. */
export function tickHolo(t, camPos) {
  for (const m of registry) { m.uniforms.uTime.value = t; m.uniforms.uCamPos.value.copy(camPos); }
}

/**
 * A holographic object = solid pass + additive wire pass (+ optional floor
 * reflection). Shares one geometry; exposes helpers to drive dissolve etc.
 */
export class HoloObject {
  constructor(geometry, opts = {}) {
    const { reflection = true, wire = true, ...matOpts } = opts;
    this.group = new THREE.Group();
    this.materials = [];
    this.solid = new THREE.Mesh(geometry, createHoloMaterial(matOpts));
    this.solid.frustumCulled = false;
    this.group.add(this.solid); this.materials.push(this.solid.material);
    if (wire) {
      this.wire = new THREE.Mesh(geometry, createHoloMaterial({ ...matOpts, wire: true }));
      this.wire.frustumCulled = false;
      this.group.add(this.wire); this.materials.push(this.wire.material);
    }
    if (reflection) {
      this.mirror = new THREE.Mesh(geometry, createHoloMaterial({ ...matOpts, mirror: true }));
      this.mirror.scale.set(1, -1, 1);
      this.mirror.frustumCulled = false;
      this.group.add(this.mirror); this.materials.push(this.mirror.material);
    }
  }
  set(name, value) { for (const m of this.materials) { const u = m.uniforms[name]; if (u.value && u.value.copy && typeof value !== 'number') u.value.copy(value); else u.value = value; } }
  setAnim(packed) { for (const m of this.materials) m.uniforms.uAnim.value = packed; }
  setDissolveDir(x, y, z, w) { for (const m of this.materials) m.uniforms.uDissolveDir.value.set(x, y, z, w); }
  /** Directional dissolve sweep along an axis, normalised to the geometry's bounds (-0.5..0.5). */
  setSweep(axis = 'y', sign = 1) {
    const bb = this.solid.geometry.boundingBox || this.solid.geometry.computeBoundingBox() || this.solid.geometry.boundingBox;
    const lo = bb.min[axis], hi = bb.max[axis], span = Math.max(1e-3, hi - lo);
    const k = sign / span;
    const d = { x: 0, y: 0, z: 0 }; d[axis] = k;
    this.setDissolveDir(d.x, d.y, d.z, sign > 0 ? lo * k + 0.5 : hi * k + 0.5);
  }
  set visible(v) { this.group.visible = v; }
  get visible() { return this.group.visible; }
}
