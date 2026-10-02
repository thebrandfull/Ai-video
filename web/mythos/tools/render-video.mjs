#!/usr/bin/env node
// Frame-exact offline render of HOLO MYTHOS to MP4 (or WebM) via Playwright + ffmpeg.
//
//   node tools/render-video.mjs --out mythos.mp4 --w 1920 --h 1080 --fps 60
//
// Options:
//   --url <url>        page to render           (default http://127.0.0.1:8787/mythos/)
//   --out <file>       output video              (default holo-mythos.mp4; .webm → VP9)
//   --w / --h          canvas size in pixels     (default 1920 × 1080)
//   --fps <n>          frames per second         (default 60)
//   --creature <i>     start at creature i       (default 0)
//   --duration <sec>   seconds to render         (default one full cycle of every creature)
//   --crf <n>          x264 / vp9 quality        (default 16, lower = better)
//   --png-dir <dir>    also keep every frame as PNG
//   --software         force SwiftShader (no GPU); slow but works anywhere
//   --headed           show the browser window (lets Chromium use the real GPU on some systems)
//
// Requires: `npm install` in web/mythos (Playwright) and ffmpeg on PATH. Serve the page first:
//   npx http-server web -p 8787 -c-1
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => {
  if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]);
  return acc;
}, []));
const url = args.url || 'http://127.0.0.1:8787/mythos/';
const out = args.out || 'holo-mythos.mp4';
const W = +(args.w || 1920), H = +(args.h || 1080), FPS = +(args.fps || 60), CRF = +(args.crf || 16);

async function loadPlaywright() {
  try { return await import('playwright'); } catch (e) {
    if (process.env.PLAYWRIGHT_MODULE) return import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
    throw new Error('Playwright not found: run `npm install` in web/mythos (or set PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs)');
  }
}

const { chromium } = await loadPlaywright();
const flags = ['--ignore-gpu-blocklist', '--enable-webgl', '--enable-gpu-rasterization'];
if (args.software) flags.push('--use-angle=swiftshader', '--enable-unsafe-swiftshader');
const browser = await chromium.launch({ headless: !args.headed, args: flags });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('[page error]', e.message));
const sep = url.includes('?') ? '&' : '?';
await page.goto(`${url}${sep}pause=1&w=${W}&h=${H}&q=high`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__done === true, null, { timeout: 300000 });
await page.waitForTimeout(1200);

const info = await page.evaluate((creature) => {
  const d = window.__mythos.director;
  return { start: d.timeFor(creature, 0), cycle: d.cycle, names: d.defs.map((x) => `${x.name} (${x.country})`) };
}, +(args.creature || 0));
const duration = args.duration ? +args.duration : info.cycle;
const total = Math.round(duration * FPS);
console.log(`Rendering ${total} frames @ ${FPS} fps, ${W}x${H} → ${out}`);
console.log(`Sequence: ${info.names.join(' → ')}`);

const isWebm = out.endsWith('.webm');
const codec = isWebm ? ['-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', String(CRF), '-row-mt', '1'] : ['-c:v', 'libx264', '-preset', 'slow', '-crf', String(CRF), '-pix_fmt', 'yuv420p', '-movflags', '+faststart'];
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-', ...codec, out], { stdio: ['pipe', 'inherit', 'inherit'] });
if (args['png-dir']) await mkdir(args['png-dir'], { recursive: true });

const t0 = Date.now();
for (let k = 0; k < total; k++) {
  const t = info.start + k / FPS;
  const dataUrl = await page.evaluate(([tt, dt]) => { window.__mythos.render(tt, dt); return document.querySelector('#view').toDataURL('image/png'); }, [t, 1 / FPS]);
  const buf = Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  if (args['png-dir']) await writeFile(`${args['png-dir']}/${String(k).padStart(5, '0')}.png`, buf);
  if (k % FPS === 0 || k === total - 1) {
    const el = (Date.now() - t0) / 1000, eta = (el / (k + 1)) * (total - k - 1);
    process.stdout.write(`\r  frame ${k + 1}/${total}  t=${t.toFixed(2)}s  elapsed ${el.toFixed(0)}s  eta ${eta.toFixed(0)}s   `);
  }
}
process.stdout.write('\n');
ff.stdin.end();
await new Promise((resolve, reject) => ff.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${code}`)))));
await browser.close();
console.log(`Done: ${out}`);
