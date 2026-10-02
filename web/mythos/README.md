# HOLO MYTHOS — a holographic 3D dragon that becomes the world's myths

A real-time, volumetric-hologram style animation written in JavaScript (Three.js, WebGL 2, no build step).
A Chinese dragon materialises on a projector stage, then dissolves into a vortex of light particles and
re-forms as another mythical creature — and the whole set changes to that creature's country around it.

Open it: serve the `web` folder and visit `/mythos/` (on the Vercel deployment it's `https://<your-app>/mythos/`).

```bash
# from the repo root
python3 -m http.server -d web 8787      # or: cd web/mythos && npm start
# → http://localhost:8787/mythos/
```

## The sequence

| # | Creature | Native name | Country set |
|---|----------|-------------|-------------|
| 1 | Dragon (Lóng) | 龍 | China — five-tier pagoda, karst mountains, moon bridge, floating lanterns |
| 2 | Kitsune (nine-tailed fox) | 狐 · 九尾の狐 | Japan — torii gate, Mount Fuji, stone lanterns, sakura, falling petals |
| 3 | Garuda | Garuḍa · गरुड | Indonesia — Borobudur tiers and bell stupas, palms, smouldering volcano |
| 4 | Griffin | Γρύψ | Greece — Doric temple, cypresses, fallen column drums, the Aegean |
| 5 | Sphinx | أبو الهول | Egypt — Giza pyramids, obelisk, dunes, the Nile, setting sun |
| 6 | Firebird | Жар-птица | Russia — onion-domed cathedral, Kremlin wall, birches, snowfall |
| 7 | Quetzalcoatl | Quetzalcōātl | Mexico — El Castillo stepped pyramid, Sun Stone, ceibas, agaves |
| 8 | Kraken | Krake | Norway — fjord peaks, Viking longships, aurora ribbons, snow |
| 9 | Unicorn | Aon-adharcach | Scotland — castle on a crag, standing stones, loch bridge, thistles |

Every creature idles for 7 s and transforms over 3.4 s, so one full cycle is ~94 s.

## Controls

| Key | Action |
|-----|--------|
| `Space` / `→` | jump to the next transformation |
| `←` | previous creature |
| `P` | pause / resume |
| `R` | record one full cycle to a `.webm` file (downloads automatically) |
| `F` | fullscreen |
| `H` | hide the HUD (the floating 3D name-plate stays, it is part of the hologram) |

URL parameters: `?creature=3` start on a creature · `?w=1920&h=1080` pixel-exact fixed canvas (letterboxed) ·
`?q=ultra|high|low` quality · `?record=1` start recording on load · `?pause=1&local=3` freeze a frame ·
`?morph=0.5` freeze mid-transformation.

## Making a video file

**In the browser (quickest):** open `?w=1920&h=1080`, press `R`, wait one cycle; a VP9 `.webm` lands in your downloads.
Convert to MP4 if you need it: `ffmpeg -i holo-mythos.webm -c:v libx264 -crf 16 -pix_fmt yuv420p mythos.mp4`.

**Frame-exact offline render (best quality, any resolution / frame rate):**

```bash
cd web/mythos && npm install            # installs Playwright (Chromium)
npx playwright install chromium
npm start                               # serves the page on :8787 (keep it running)
node tools/render-video.mjs --out mythos.mp4 --w 3840 --h 2160 --fps 60
```

The tool steps the timeline one frame at a time, captures the canvas losslessly and streams the PNGs into
ffmpeg (H.264 for `.mp4`, VP9 for `.webm`). Useful flags: `--duration 20`, `--creature 6`, `--fps 30`,
`--png-dir frames/` (keep the stills), `--software` (no GPU, slow), `--headed` (lets Chromium use the GPU on
systems where headless mode cannot).

## How it is built

* `src/core/geo.js` — procedural geometry kit: variable-radius tubes swept along curves, lathes, mirroring,
  area-weighted surface sampling, and a `Parts` list that bakes transforms + per-vertex colour into one merged
  geometry (one draw call per creature and per set).
* `src/creatures/anatomy.js` — shared anatomy: feathered wings (arm bone, primaries, secondaries, two rows of
  coverts), quadruped bodies in stand / sit / lie poses, paws with claws, talons, hooked beaks, horns, manes,
  teeth, spine rows.
* `src/creatures/*.js` — the nine creatures (each ~15–30k vertices, a few hundred parts).
* `src/sets/*.js` — the nine country environments and their palettes / weather.
* `src/core/holo.js` — the hologram shader: Fresnel rim light, world-space scanlines, hex scale pattern, flicker,
  noise + directional dissolve with a glowing edge, glitch slicing, and the idle animation (travelling waves along
  limbs, wing flap, hover, breathe) that runs on the GPU for both the mesh and the particles. Each object is
  drawn as a translucent solid, an additive wireframe and a fading floor reflection.
* `src/core/particles.js` — 40k GPU particles that live on the current creature's surface and fly through a
  spiralling vortex to the next creature's surface during a transformation.
* `src/core/postfx.js` — bloom, chromatic aberration, scanlines, vignette, film grain.
* `src/core/stage.js`, `label.js`, `ambient.js` — projector floor grid with pulse rings, sky dome with stars and
  nebula, light cone, the floating holographic name-plate, and the weather particles (petals, snow, embers, sand…).
* `src/director.js` — the timeline: dissolve / re-form choreography, particle hand-off, palette cross-fade, camera.

Three.js is vendored under `vendor/three/` so the page works offline and needs no bundler.
