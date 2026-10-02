// Bloom + holographic screen pass (chromatic aberration, scanlines, vignette, grain).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const HoloScreenShader = {
  uniforms: {
    tDiffuse: { value: null }, uTime: { value: 0 }, uAberration: { value: 0.0025 }, uScan: { value: 0.08 },
    uVignette: { value: 0.55 }, uGrain: { value: 0.035 }, uResolution: { value: new THREE.Vector2(1, 1) }, uFlash: { value: 0 },
  },
  vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    precision highp float;
    uniform sampler2D tDiffuse; uniform float uTime, uAberration, uScan, uVignette, uGrain, uFlash; uniform vec2 uResolution;
    varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec2 c = vUv - 0.5;
      float r2 = dot(c, c);
      vec2 off = c * (uAberration * (1.0 + r2 * 6.0));
      float rr = texture2D(tDiffuse, vUv + off).r;
      float gg = texture2D(tDiffuse, vUv).g;
      float bb = texture2D(tDiffuse, vUv - off).b;
      vec3 col = vec3(rr, gg, bb);
      float scan = 1.0 - uScan * (0.5 + 0.5 * sin(vUv.y * uResolution.y * 1.5 + uTime * 6.0));
      col *= scan;
      float vig = 1.0 - uVignette * smoothstep(0.15, 0.75, r2);
      col *= vig;
      col += (hash(vUv * uResolution.xy * 0.5 + fract(uTime) * 100.0) - 0.5) * uGrain;
      col += uFlash;
      gl_FragColor = vec4(col, 1.0);
    }`,
};

export function createPostFX(renderer, scene, camera, { bloom = 0.95, radius = 0.55, threshold = 0.3 } = {}) {
  const size = renderer.getSize(new THREE.Vector2());
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(size, bloom, radius, threshold);
  composer.addPass(bloomPass);
  const screen = new ShaderPass(HoloScreenShader);
  composer.addPass(screen);
  composer.addPass(new OutputPass());
  return {
    composer, bloomPass, screen,
    setSize(w, h, pr) {
      composer.setSize(w, h); composer.setPixelRatio(pr);
      screen.uniforms.uResolution.value.set(w * pr, h * pr);
    },
    tick(t, { aberration = 0.0025, flash = 0 } = {}) {
      screen.uniforms.uTime.value = t;
      screen.uniforms.uAberration.value = aberration;
      screen.uniforms.uFlash.value = flash;
    },
  };
}
