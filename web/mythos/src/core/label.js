// Floating holographic name-plate rendered from a canvas so it is part of the
// WebGL frame (and therefore of any recorded video).
import * as THREE from 'three';

const VERT = /* glsl */ `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const FRAG = /* glsl */ `
precision highp float; uniform sampler2D uMap; uniform float uTime, uReveal; uniform vec3 uTint; varying vec2 vUv; varying vec3 vW;
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
void main(){
  // reveal sweeps left -> right with a glitchy edge
  float edge = uReveal * 1.2 - 0.1;
  float jitter = (hash(vec2(floor(vUv.y * 40.0), floor(uTime * 20.0))) - 0.5) * 0.08;
  float vis = step(vUv.x, edge + jitter);
  vec2 uv = vUv;
  if (uReveal < 0.98) uv.x += (hash(vec2(floor(vUv.y * 60.0), floor(uTime * 24.0))) - 0.5) * 0.02 * (1.0 - uReveal);
  vec4 tex = texture2D(uMap, uv);
  float scan = 0.85 + 0.15 * sin(vW.y * 60.0 - uTime * 8.0);
  float flick = 0.93 + 0.07 * sin(uTime * 37.0 + sin(uTime * 5.0) * 4.0);
  float a = tex.a * vis * scan * flick;
  vec3 col = tex.rgb * uTint * 1.6 + uTint * smoothstep(0.03, 0.0, abs(vUv.x - edge)) * vis * 2.0;
  gl_FragColor = vec4(col * a, a);
}`;

export class Label {
  constructor(scene) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1024; this.canvas.height = 512;
    this.ctx = this.canvas.getContext('2d');
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 8;
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uMap: { value: this.texture }, uTime: { value: 0 }, uReveal: { value: 0 }, uTint: { value: new THREE.Color('#ffffff') } },
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.1), this.material);
    this.group = new THREE.Group();
    this.group.add(this.mesh);
    this.mesh.position.set(0, 0.95, 0);
    // leader line from the floor
    const lineMat = new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending });
    this.leader = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-1.9, 0, 0), new THREE.Vector3(-1.9, 0.05, 0)]), lineMat);
    this.group.add(this.leader);
    this.group.position.set(-4.9, 1.1, 1.4);
    scene.add(this.group);
  }
  setContent({ name, native, country, index, total, accent = '#8ff' }) {
    const c = this.ctx, W = this.canvas.width, H = this.canvas.height;
    c.clearRect(0, 0, W, H);
    c.textBaseline = 'alphabetic';
    c.fillStyle = 'rgba(255,255,255,0.55)';
    c.font = '600 26px "Segoe UI", Helvetica, Arial, sans-serif';
    this.spaced(`MYTHOS // ${String(index + 1).padStart(2, '0')} OF ${String(total).padStart(2, '0')}`, 54, 70, 6);
    c.fillStyle = '#ffffff';
    c.font = '700 112px "Segoe UI", Helvetica, Arial, sans-serif';
    this.spaced(name.toUpperCase(), 50, 196, 10);
    c.fillStyle = accent;
    c.font = '400 64px "Segoe UI", "Noto Sans", "Noto Sans CJK SC", "Noto Sans JP", "Noto Sans Arabic", Helvetica, Arial, sans-serif';
    c.fillText(native, 54, 288);
    c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(54, 330); c.lineTo(W - 120, 330); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.6)';
    c.font = '600 24px "Segoe UI", Helvetica, Arial, sans-serif';
    this.spaced('ORIGIN', 54, 380, 8);
    c.fillStyle = '#ffffff';
    c.font = '600 58px "Segoe UI", Helvetica, Arial, sans-serif';
    this.spaced(country.toUpperCase(), 54, 450, 8);
    // corner brackets
    c.strokeStyle = accent; c.lineWidth = 4;
    const L = 40;
    const corner = (x, y, sx, sy) => { c.beginPath(); c.moveTo(x, y + sy * L); c.lineTo(x, y); c.lineTo(x + sx * L, y); c.stroke(); };
    corner(14, 14, 1, 1); corner(W - 14, 14, -1, 1); corner(14, H - 14, 1, -1); corner(W - 14, H - 14, -1, -1);
    this.texture.needsUpdate = true;
    this.material.uniforms.uTint.value.set('#ffffff');
  }
  spaced(text, x, y, spacing) {
    const c = this.ctx;
    for (const ch of text) { c.fillText(ch, x, y); x += c.measureText(ch).width + spacing; }
  }
  tick(t, camera, reveal) {
    this.material.uniforms.uTime.value = t;
    this.material.uniforms.uReveal.value = reveal;
    this.leader.material.opacity = 0.35 * reveal;
    // keep the plate at the camera's left and facing it
    const yaw = Math.atan2(camera.position.x, camera.position.z);
    const lx = -5.3, lz = 0.9;
    this.group.position.set(Math.cos(yaw) * lx + Math.sin(yaw) * lz, 1.1, -Math.sin(yaw) * lx + Math.cos(yaw) * lz);
    const dx = camera.position.x - this.group.position.x, dz = camera.position.z - this.group.position.z;
    this.group.rotation.y = Math.atan2(dx, dz);
    const lp = this.leader.geometry.getAttribute('position');
    lp.setY(1, 0.9 * reveal); lp.needsUpdate = true;
  }
}
