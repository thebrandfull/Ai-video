// Ambient weather particles (petals, snow, embers, sand, bubbles...) that
// blend between country sets.
import * as THREE from 'three';

const VERT = /* glsl */ `
attribute vec4 aRand; uniform float uTime, uSize, uPixelRatio, uFlutter; uniform vec3 uVel, uBox; varying float vA; varying float vShape;
void main(){
  vec3 base = (aRand.xyz - 0.5) * uBox;
  float life = uTime * (0.6 + aRand.w * 0.8);
  vec3 p = base + uVel * life;
  p.x += sin(life * 1.7 + aRand.x * 30.0) * uFlutter;
  p.z += cos(life * 1.3 + aRand.y * 30.0) * uFlutter;
  p = mod(p + uBox * 0.5, uBox) - uBox * 0.5;
  p.y += uBox.y * 0.5 - 0.5;
  vA = 0.5 + 0.5 * sin(uTime * (2.0 + aRand.z * 4.0) + aRand.w * 50.0);
  vShape = aRand.w;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = min(uSize * uPixelRatio * (0.5 + aRand.z) * (90.0 / -mv.z), 14.0 * uPixelRatio);
  gl_Position = projectionMatrix * mv;
}`;
const FRAG = /* glsl */ `
precision highp float; uniform vec3 uColor; uniform float uIntensity; varying float vA; varying float vShape;
void main(){
  vec2 q = gl_PointCoord - 0.5;
  float d = length(q) * 2.0;
  float a = smoothstep(1.0, 0.1, d);
  gl_FragColor = vec4(uColor * a * vA * uIntensity, a * vA * uIntensity);
}`;

export class Ambient {
  constructor(scene, count = 1600) {
    const g = new THREE.BufferGeometry();
    const r = new Float32Array(count * 4); for (let i = 0; i < r.length; i++) r[i] = Math.random();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute('aRand', new THREE.BufferAttribute(r, 4));
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 }, uSize: { value: 3 }, uPixelRatio: { value: 1 }, uFlutter: { value: 0.3 }, uVel: { value: new THREE.Vector3(0, -0.3, 0) },
        uBox: { value: new THREE.Vector3(30, 14, 30) }, uColor: { value: new THREE.Color('#ffffff') }, uIntensity: { value: 0.6 },
      },
    });
    this.points = new THREE.Points(g, this.material);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.target = { color: new THREE.Color('#fff'), vel: new THREE.Vector3(0, -0.3, 0), size: 3, flutter: 0.3, intensity: 0.6 };
  }
  setTarget(a) {
    this.target = { color: new THREE.Color(a.color), vel: new THREE.Vector3(...a.vel), size: a.size, flutter: a.flutter, intensity: a.intensity };
  }
  tick(t, pixelRatio, k = 0.03, fade = 1) {
    const u = this.material.uniforms, T = this.target;
    u.uTime.value = t; u.uPixelRatio.value = pixelRatio;
    u.uColor.value.lerp(T.color, k); u.uVel.value.lerp(T.vel, k);
    u.uSize.value += (T.size - u.uSize.value) * k; u.uFlutter.value += (T.flutter - u.uFlutter.value) * k;
    u.uIntensity.value += (T.intensity * fade - u.uIntensity.value) * k;
  }
}
