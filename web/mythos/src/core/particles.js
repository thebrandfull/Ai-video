// GPU particle cloud that lives on the creature surface and flies through a
// vortex from creature A to creature B during a transformation.
import * as THREE from 'three';
import { ANIM_SLOTS, GLSL_NOISE, GLSL_DEFORM, emptyAnim } from './holo.js';

const VERT = /* glsl */ `
attribute vec3 aPosA; attribute vec3 aPosB; attribute vec3 aColA; attribute vec3 aColB; attribute vec4 aRand; attribute vec2 aParams;
uniform float uTime, uMorph, uSize, uIntensity, uSpread, uSpin, uPixelRatio;
uniform vec4 uAnimA[${ANIM_SLOTS}]; uniform vec4 uAnimB[${ANIM_SLOTS}];
varying vec3 vColor; varying float vAlpha;
${GLSL_NOISE}
${GLSL_DEFORM}
void main() {
  vec3 pa = deform(aPosA, aParams.x, uAnimA, uTime);
  vec3 pb = deform(aPosB, aParams.y, uAnimB, uTime);
  float m = clamp((uMorph - aRand.x * 0.3) / 0.7, 0.0, 1.0);
  m = m * m * (3.0 - 2.0 * m);
  float arc = sin(m * 3.14159265);
  vec3 p = mix(pa, pb, m);
  float ang = arc * uSpin * (aRand.y - 0.5) * 2.0 + arc * 1.2;
  float c = cos(ang), s = sin(ang);
  p.xz = vec2(c * p.x + s * p.z, -s * p.x + c * p.z);
  vec3 dir = normalize(vec3(p.x, 0.4 + aRand.w, p.z) + vec3(0.001, 0.0, 0.0));
  p += dir * arc * uSpread * (0.3 + aRand.z);
  p.y += arc * uSpread * 0.5 * (aRand.w - 0.35);
  p += 0.012 * vec3(sin(uTime * 3.1 + aRand.x * 120.0), cos(uTime * 2.3 + aRand.y * 90.0), sin(uTime * 2.7 + aRand.z * 70.0));
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float twinkle = 0.55 + 0.45 * sin(uTime * (3.0 + aRand.y * 5.0) + aRand.x * 40.0);
  vColor = mix(aColA, aColB, m) * (1.0 + arc * 1.1);
  vAlpha = uIntensity * (0.3 + 0.7 * arc) * twinkle * (0.5 + 0.5 * aRand.w);
  gl_PointSize = min(uSize * uPixelRatio * (0.5 + aRand.w) * (1.0 + arc * 1.1) * (220.0 / -mv.z), 12.0 * uPixelRatio);
  gl_Position = projectionMatrix * mv;
}
`;
const FRAG = /* glsl */ `
precision highp float;
varying vec3 vColor; varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float a = smoothstep(1.0, 0.0, d); a = a * a * (0.4 + 0.6 * smoothstep(0.6, 0.0, d));
  gl_FragColor = vec4(vColor * a * vAlpha, a * vAlpha);
}
`;

export class ParticleMorph {
  constructor(count = 36000) {
    this.count = count;
    const g = new THREE.BufferGeometry();
    this.posA = new Float32Array(count * 3); this.posB = new Float32Array(count * 3);
    this.colA = new Float32Array(count * 3); this.colB = new Float32Array(count * 3);
    this.params = new Float32Array(count * 2);
    const rand = new Float32Array(count * 4);
    for (let i = 0; i < rand.length; i++) rand[i] = Math.random();
    g.setAttribute('position', new THREE.BufferAttribute(this.posA, 3)); // unused but required
    g.setAttribute('aPosA', new THREE.BufferAttribute(this.posA, 3));
    g.setAttribute('aPosB', new THREE.BufferAttribute(this.posB, 3));
    g.setAttribute('aColA', new THREE.BufferAttribute(this.colA, 3));
    g.setAttribute('aColB', new THREE.BufferAttribute(this.colB, 3));
    g.setAttribute('aParams', new THREE.BufferAttribute(this.params, 2));
    g.setAttribute('aRand', new THREE.BufferAttribute(rand, 4));
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 }, uMorph: { value: 0 }, uSize: { value: 2.8 }, uIntensity: { value: 0.35 }, uSpread: { value: 2.4 }, uSpin: { value: 2.6 },
        uPixelRatio: { value: 1 }, uAnimA: { value: emptyAnim() }, uAnimB: { value: emptyAnim() },
      },
    });
    this.points = new THREE.Points(g, this.material);
    this.points.frustumCulled = false;
    this.geometry = g;
  }
  /** Load creature samples into slot 'A' or 'B'. */
  load(slot, samples, anim) {
    const g = this.geometry;
    const pos = slot === 'A' ? this.posA : this.posB, col = slot === 'A' ? this.colA : this.colB;
    pos.set(samples.positions.subarray(0, this.count * 3)); col.set(samples.colors.subarray(0, this.count * 3));
    const off = slot === 'A' ? 0 : 1;
    for (let i = 0; i < this.count; i++) this.params[i * 2 + off] = samples.params[i];
    g.getAttribute(slot === 'A' ? 'aPosA' : 'aPosB').needsUpdate = true;
    g.getAttribute(slot === 'A' ? 'aColA' : 'aColB').needsUpdate = true;
    g.getAttribute('aParams').needsUpdate = true;
    this.material.uniforms[slot === 'A' ? 'uAnimA' : 'uAnimB'].value = anim;
  }
  set morph(v) { this.material.uniforms.uMorph.value = v; }
  set intensity(v) { this.material.uniforms.uIntensity.value = v; }
  tick(t, pixelRatio) { this.material.uniforms.uTime.value = t; this.material.uniforms.uPixelRatio.value = pixelRatio; }
}
