// The holographic stage: glowing floor grid with projector disc, sky dome,
// projector light cone. All colours are driven by the active country set.
import * as THREE from 'three';

const FLOOR_VERT = /* glsl */ `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const FLOOR_FRAG = /* glsl */ `
precision highp float;
uniform vec3 uColor, uAccent; uniform float uTime, uWater;
varying vec3 vW;
void main(){
  vec2 p = vW.xz; float r = length(p);
  vec2 g1 = abs(fract(p * 0.5) - 0.5) / fwidth(p * 0.5); float major = 1.0 - min(min(g1.x, g1.y), 1.0);
  vec2 g2 = abs(fract(p * 2.0) - 0.5) / fwidth(p * 2.0); float minor = 1.0 - min(min(g2.x, g2.y), 1.0);
  float fade = 1.0 - smoothstep(4.0, 34.0, r);
  float disc = 1.0 - smoothstep(3.3, 3.6, r);
  float rimA = smoothstep(0.06, 0.0, abs(r - 3.55));
  float rimB = smoothstep(0.03, 0.0, abs(r - 3.2));
  float rimC = smoothstep(0.03, 0.0, abs(r - 0.9));
  float spokes = smoothstep(0.985, 1.0, abs(sin(atan(p.y, p.x) * 12.0 + uTime * 0.2))) * (1.0 - smoothstep(3.1, 3.4, r)) * step(0.95, r);
  float pulse = exp(-abs(r - mod(uTime * 2.2, 14.0)) * 2.5) * 0.6 * (1.0 - smoothstep(0.0, 14.0, r));
  float water = uWater * (0.5 + 0.5 * sin(r * 6.0 - uTime * 2.0)) * 0.12 * fade;
  vec3 col = uColor * (major * 0.3 + minor * 0.07) * fade;
  col += uAccent * (disc * 0.02 + rimA * 0.45 + rimB * 0.22 + rimC * 0.25 + spokes * 0.12 + pulse * 0.5);
  col += uColor * water;
  gl_FragColor = vec4(col, 1.0);
}`;

const SKY_VERT = /* glsl */ `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const SKY_FRAG = /* glsl */ `
precision highp float;
uniform vec3 uTop, uHorizon, uBottom; uniform float uTime, uStars, uNebula;
varying vec3 vDir;
float hash(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float vnoise(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(hash(i), hash(i+vec3(1,0,0)), f.x), mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x), mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y), f.z); }
void main(){
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 col = mix(uHorizon, uTop, smoothstep(0.0, 0.7, h));
  col = mix(uBottom, col, smoothstep(-0.25, 0.05, h));
  float neb = vnoise(d * 3.0 + vec3(0.0, uTime * 0.01, 0.0)) * 0.6 + vnoise(d * 7.0 - uTime * 0.02) * 0.4;
  col += uTop * neb * neb * uNebula * smoothstep(-0.1, 0.4, h);
  vec3 sp = floor(d * 260.0);
  float st = step(1.0 - uStars * 0.0025, hash(sp)) * (0.6 + 0.4 * sin(uTime * 2.0 + hash(sp + 1.0) * 30.0));
  col += vec3(st) * smoothstep(0.0, 0.2, h) * 0.9;
  float horizonGlow = exp(-abs(h) * 9.0) * 0.35;
  col += uHorizon * horizonGlow;
  gl_FragColor = vec4(col, 1.0);
}`;

const CONE_VERT = /* glsl */ `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const CONE_FRAG = /* glsl */ `
precision highp float; uniform vec3 uColor; uniform float uTime, uStrength; varying vec2 vUv; varying vec3 vW;
void main(){
  float rays = 0.6 + 0.4 * sin(vUv.x * 80.0 + uTime * 0.8) * sin(vUv.x * 23.0 - uTime * 0.3);
  float v = pow(1.0 - vUv.y, 1.6);
  float a = v * rays * uStrength * (0.9 + 0.1 * sin(uTime * 30.0));
  gl_FragColor = vec4(uColor * a, a);
}`;

export class Stage {
  constructor(scene) {
    this.floor = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.ShaderMaterial({
      vertexShader: FLOOR_VERT, fragmentShader: FLOOR_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uColor: { value: new THREE.Color('#1f6f8f') }, uAccent: { value: new THREE.Color('#5ef2ff') }, uTime: { value: 0 }, uWater: { value: 0 } },
    }));
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.renderOrder = -1;
    scene.add(this.floor);

    this.sky = new THREE.Mesh(new THREE.SphereGeometry(220, 48, 32), new THREE.ShaderMaterial({
      vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false,
      uniforms: { uTop: { value: new THREE.Color('#050b1e') }, uHorizon: { value: new THREE.Color('#0d2a40') }, uBottom: { value: new THREE.Color('#02050c') }, uTime: { value: 0 }, uStars: { value: 1 }, uNebula: { value: 0.5 } },
    }));
    this.sky.renderOrder = -2;
    scene.add(this.sky);

    const coneGeo = new THREE.CylinderGeometry(3.4, 0.7, 7.5, 64, 1, true);
    coneGeo.translate(0, 3.75, 0);
    this.cone = new THREE.Mesh(coneGeo, new THREE.ShaderMaterial({
      vertexShader: CONE_VERT, fragmentShader: CONE_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uColor: { value: new THREE.Color('#5ef2ff') }, uTime: { value: 0 }, uStrength: { value: 0.07 } },
    }));
    scene.add(this.cone);

    // emitter ring on the floor
    this.ringMat = new THREE.MeshBasicMaterial({ color: '#5ef2ff', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.035, 8, 96), this.ringMat);
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.02;
    scene.add(ring);
    this.ring = ring;
  }
  /** Blend stage colours toward a set's palette. */
  applyPalette(p, k = 1) {
    const u = this.floor.material.uniforms;
    u.uColor.value.lerp(new THREE.Color(p.floor), k);
    u.uAccent.value.lerp(new THREE.Color(p.accent), k);
    u.uWater.value += ((p.water || 0) - u.uWater.value) * k;
    const s = this.sky.material.uniforms;
    s.uTop.value.lerp(new THREE.Color(p.skyTop), k);
    s.uHorizon.value.lerp(new THREE.Color(p.skyHorizon), k);
    s.uBottom.value.lerp(new THREE.Color(p.skyBottom), k);
    s.uStars.value += ((p.stars ?? 1) - s.uStars.value) * k;
    s.uNebula.value += ((p.nebula ?? 0.5) - s.uNebula.value) * k;
    this.cone.material.uniforms.uColor.value.lerp(new THREE.Color(p.accent), k);
    this.ringMat.color.lerp(new THREE.Color(p.accent), k);
  }
  tick(t, coneStrength = 0.07) {
    this.floor.material.uniforms.uTime.value = t;
    this.sky.material.uniforms.uTime.value = t;
    this.cone.material.uniforms.uTime.value = t;
    this.cone.material.uniforms.uStrength.value = coneStrength;
    this.cone.rotation.y = t * 0.05;
  }
}
