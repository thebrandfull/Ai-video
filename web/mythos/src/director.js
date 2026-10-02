// Sequencer: builds every creature + country set, drives the idle / transform
// timeline, the camera, stage palette, particles and the name-plate.
import * as THREE from 'three';
import { Parts, samplePoints, fitGeometry, smooth, lerp } from './core/geo.js';
import { HoloObject, packAnim } from './core/holo.js';

export const IDLE = 7.0;
export const MORPH = 3.4;

export class Director {
  constructor({ scene, creatures, sets, particles, stage, label, ambient, camera }) {
    this.scene = scene; this.particles = particles; this.stage = stage; this.label = label; this.ambient = ambient; this.camera = camera;
    this.defs = creatures; this.setDefs = sets;
    this.n = creatures.length; this.slot = IDLE + MORPH; this.cycle = this.slot * this.n;
    this.creatures = []; this.sets = [];
    this.loaded = -1; this.labelIdx = -1; this.target = new THREE.Vector3(0, 1.7, 0);
  }

  /** Build everything, yielding to the browser between steps so a loader can update. */
  async build(onProgress = () => {}) {
    const steps = this.n * 2;
    let done = 0;
    for (let i = 0; i < this.n; i++) {
      const def = this.defs[i];
      const parts = new Parts();
      def.build(parts);
      const g = parts.merge();
      g.rotateY(def.yaw ?? Math.PI); // creatures are modelled facing -z; turn them toward the camera
      fitGeometry(g, def.size, { lift: def.lift || 0 });
      const holo = new HoloObject(g, { ...def.material, reflection: true });
      const anim = packAnim(def.anim || {});
      holo.setAnim(anim); holo.setSweep('y', -1);
      holo.visible = false;
      this.scene.add(holo.group);
      const samples = samplePoints(g, this.particles.count, 100 + i);
      this.creatures.push({ def, holo, anim, samples, geometry: g });
      onProgress(++done / steps, `forming ${def.name}`);
      await nextFrame();
      const setDef = this.setDefs.find((s) => s.key === def.key) || this.setDefs[0];
      const sp = new Parts();
      setDef.build(sp);
      const sg = sp.merge();
      const sholo = new HoloObject(sg, { ...setDef.material, reflection: false, fade: [70, 130], edgeWidth: 0.05 });
      sholo.setAnim(packAnim(setDef.anim || {})); sholo.setSweep('x', 1);
      sholo.visible = false;
      this.scene.add(sholo.group);
      this.sets.push({ def: setDef, holo: sholo });
      onProgress(++done / steps, `building ${setDef.country}`);
      await nextFrame();
    }
  }

  state(time) {
    const t = ((time % this.cycle) + this.cycle) % this.cycle;
    const i = Math.floor(t / this.slot), local = t - i * this.slot;
    const morph = this.n < 2 ? 0 : Math.max(0, (local - IDLE) / MORPH);
    return { i, next: (i + 1) % this.n, local, morph, t };
  }

  /** Absolute timeline time for creature `i` at `local` seconds into its slot. */
  timeFor(i, local = 2.5) { return i * this.slot + local; }

  update(time, dt = 1 / 60) {
    const { i, next, local, morph } = this.state(time);
    const A = this.creatures[i], B = this.creatures[next];
    const SA = this.sets[i], SB = this.sets[next];
    const arc = Math.sin(Math.PI * morph);
    for (const c of this.creatures) c.holo.visible = false;
    for (const s of this.sets) s.holo.visible = false;
    const glitch = Math.pow(arc, 2) * 0.9;
    if (B !== A) {
      B.holo.visible = morph > 0.38; B.holo.set('uDissolve', 1 - smooth(0.4, 1.0, morph)); B.holo.set('uGlitch', glitch);
      SB.holo.visible = morph > 0.48; SB.holo.set('uDissolve', 1 - smooth(0.5, 0.98, morph));
    }
    A.holo.visible = morph < 0.62 || B === A; A.holo.set('uDissolve', smooth(0.0, 0.6, morph)); A.holo.set('uGlitch', glitch);
    SA.holo.visible = morph < 0.52 || B === A; SA.holo.set('uDissolve', smooth(0.02, 0.5, morph));
    // materialisation glitch when a creature first forms, settle afterwards
    if (morph === 0) { const g = (1 - smooth(0, 0.8, local)) * 0.5; A.holo.set('uGlitch', g); }

    if (this.loaded !== i) {
      this.particles.load('A', A.samples, A.anim);
      this.particles.load('B', B.samples, B.anim);
      this.loaded = i;
    }
    this.particles.morph = morph;
    this.particles.intensity = 0.3 + 0.55 * Math.pow(arc, 0.7);

    const pal = morph < 0.5 ? SA.def.palette : SB.def.palette;
    const k = 1 - Math.pow(0.02, dt); // frame-rate independent ease
    this.stage.applyPalette(pal, k);
    this.ambient.setTarget((morph < 0.5 ? SA : SB).def.ambient);
    this.ambient.tick(time, this.pixelRatio || 1, k, 1 - arc * 0.7);

    // name plate
    const labelFor = morph < 0.5 ? i : next;
    if (this.labelIdx !== labelFor) {
      const d = this.creatures[labelFor].def;
      this.label.setContent({ name: d.name, native: d.native, country: d.country, index: labelFor, total: this.n, accent: d.material?.edge || '#8ff' });
      this.labelIdx = labelFor;
    }
    const reveal = morph === 0 ? smooth(0.5, 1.9, local) : (morph < 0.5 ? 1 - smooth(0.0, 0.3, morph) : 0);
    this.label.tick(time, this.camera, reveal);

    this.stage.tick(time, 0.07 + 0.14 * arc);
    this.updateCamera(time, arc);
    return { i, next, local, morph, arc };
  }

  updateCamera(time, arc) {
    const yaw = 0.38 * Math.sin(time * 0.12) + 0.12 * Math.sin(time * 0.071 + 1.0);
    const radius = 11.6 + 0.9 * Math.sin(time * 0.09) - 1.6 * arc;
    const height = 3.7 + 0.7 * Math.sin(time * 0.17);
    const shake = arc * arc * 0.09;
    const cam = this.camera;
    cam.position.set(
      Math.sin(yaw) * radius + shake * Math.sin(time * 61.0),
      height + shake * Math.sin(time * 47.0),
      Math.cos(yaw) * radius + shake * Math.cos(time * 53.0),
    );
    this.target.set(0, 2.1 + 0.25 * Math.sin(time * 0.23), 0);
    cam.lookAt(this.target);
  }
}

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
