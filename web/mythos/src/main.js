// HOLO MYTHOS — entry point. Sets up the renderer, stage, post-processing and
// the director; handles input, URL parameters and WebM recording.
import * as THREE from 'three';
import { createPostFX } from './core/postfx.js';
import { Stage } from './core/stage.js';
import { Label } from './core/label.js';
import { Ambient } from './core/ambient.js';
import { ParticleMorph } from './core/particles.js';
import { tickHolo } from './core/holo.js';
import { Director, IDLE, MORPH } from './director.js';
import { CREATURES } from './creatures/index.js';
import { SETS } from './sets/index.js';

const params = new URLSearchParams(location.search);
const fixedW = +params.get('w') || 0, fixedH = +params.get('h') || 0;
const quality = params.get('q') || 'high';
const $ = (s) => document.querySelector(s);

const canvas = $('#view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;
const pixelRatio = Math.min(window.devicePixelRatio || 1, quality === 'ultra' ? 3 : 2);
renderer.setPixelRatio(pixelRatio);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.1, 500);
const stage = new Stage(scene);
const label = new Label(scene);
const ambient = new Ambient(scene, 1800);
const particles = new ParticleMorph(quality === 'low' ? 12000 : 40000);
scene.add(particles.points);
const post = createPostFX(renderer, scene, camera, { bloom: 0.5, radius: 0.45, threshold: 0.7 });

function resize() {
  let w = fixedW || window.innerWidth, h = fixedH || window.innerHeight;
  renderer.setSize(w, h, false);
  canvas.style.width = fixedW ? `${w}px` : '100vw';
  canvas.style.height = fixedH ? `${h}px` : '100vh';
  camera.aspect = w / h; camera.updateProjectionMatrix();
  post.setSize(w, h, pixelRatio);
  if (fixedW) { // letterbox a fixed-size canvas inside the window
    const s = Math.min(window.innerWidth / w, window.innerHeight / h, 1);
    canvas.style.transform = `translate(-50%, -50%) scale(${s})`;
  }
}
window.addEventListener('resize', resize);
resize();

const director = new Director({ scene, creatures: CREATURES, sets: SETS, particles, stage, label, ambient, camera });
director.pixelRatio = pixelRatio;

// ---------------------------------------------------------------- timeline
let time = 0, paused = false, last = performance.now();
const startCreature = params.has('creature') ? +params.get('creature') : 0;
if (params.has('t')) time = +params.get('t');
else if (params.has('morph')) time = director.timeFor(startCreature, IDLE + MORPH * +params.get('morph'));
else time = director.timeFor(startCreature, params.has('local') ? +params.get('local') : 0);
if (params.has('pause')) paused = true;

function skip(dir) {
  const { i, local } = director.state(time);
  const target = (i + dir + director.n) % director.n;
  time = local < IDLE && dir > 0 ? director.timeFor(i, IDLE) : director.timeFor(target, dir > 0 ? 0 : IDLE);
}

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!paused) time += dt;
  if (recorder && time >= recStop) stopRecording();
  render(dt);
  requestAnimationFrame(frame);
}

function render(dt) {
  const st = director.update(time, dt);
  tickHolo(time, camera.position);
  particles.tick(time, pixelRatio);
  post.tick(time, { aberration: 0.002 + 0.014 * st.arc * st.arc, flash: Math.exp(-Math.pow((st.morph - 0.5) / 0.045, 2)) * 0.07 * (st.morph > 0 ? 1 : 0) });
  post.composer.render();
  const d = CREATURES[st.i], n = CREATURES[st.next];
  $('#hud-status').textContent = st.morph > 0 ? `TRANSFORMING  ${d.name.toUpperCase()}  →  ${n.name.toUpperCase()}` : `${d.name.toUpperCase()}  ·  ${d.country.toUpperCase()}`;
  const dots = $('#dots');
  if (dots.childElementCount !== director.n) { dots.innerHTML = ''; for (let k = 0; k < director.n; k++) dots.appendChild(document.createElement('i')); }
  [...dots.children].forEach((el, k) => el.classList.toggle('on', k === st.i));
}

// ---------------------------------------------------------------- recording
let recorder = null, chunks = [], recStop = 0;
function startRecording({ seconds = null, download = true } = {}) {
  if (recorder) return null;
  const stream = canvas.captureStream(60);
  const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m));
  recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 40_000_000 });
  chunks = [];
  recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  const done = new Promise((resolve) => {
    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      recorder = null; $('#rec').classList.remove('on');
      if (download) await saveFile(blob, `holo-mythos-${Date.now()}.webm`);
      resolve(blob);
    };
  });
  const { i } = director.state(time);
  if (seconds == null) time = director.timeFor(i, 0);
  recStop = time + (seconds ?? director.cycle);
  recorder.start(250);
  $('#rec').classList.add('on');
  return done;
}
// Hand the file to the viewer: through the claude.ai artifact "downloads" capability when the page is
// published there (plain downloads are blocked in that sandbox), otherwise a normal browser download.
async function saveFile(blob, filename) {
  try {
    const dl = typeof window.claude?.use === 'function' ? await window.claude.use('downloads') : null;
    if (dl) { await dl.save({ filename, data: blob }); return; }
  } catch (e) { /* viewer declined or the capability is unavailable — fall through to a normal download */ }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
}
function stopRecording() { if (recorder && recorder.state !== 'inactive') recorder.stop(); }

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') { e.preventDefault(); skip(1); }
  else if (e.code === 'ArrowRight') skip(1);
  else if (e.code === 'ArrowLeft') skip(-1);
  else if (e.key === 'p' || e.key === 'P') paused = !paused;
  else if (e.key === 'r' || e.key === 'R') recorder ? stopRecording() : startRecording();
  else if (e.key === 'h' || e.key === 'H') $('#hud').classList.toggle('hidden');
  else if (e.key === 'f' || e.key === 'F') document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {});
});
canvas.addEventListener('click', () => skip(1));

// ---------------------------------------------------------------- boot
(async () => {
  const bar = $('#load-bar'), msg = $('#load-msg');
  await director.build((p, m) => { bar.style.width = `${Math.round(p * 100)}%`; msg.textContent = m.toUpperCase(); });
  // warm the stage colours so the first frame is already graded
  for (let k = 0; k < 90; k++) director.update(time, 1 / 60);
  $('#loader').classList.add('done');
  last = performance.now();
  if (params.has('record')) startRecording();
  requestAnimationFrame(frame);
  // frame-exact hook used by the screenshot harness
  window.__mythos = { director, record: startRecording, render: (t, dt = 1 / 60) => { time = t; render(dt); }, get time() { return time; }, set time(v) { time = v; }, set paused(v) { paused = v; } };
  window.__done = true;
})();
