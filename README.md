# AI Video Depth Map

Give it a video, get back the same video as a **depth map** — every frame shows how far each pixel is from the camera, so all the movement and structure of the original is preserved in depth form.

## Web app (deploy on Vercel)

The `web/` folder is a full browser app: **upload a video → trim the seconds you want → convert to a depth video → download**. The AI model (Depth Anything V2) runs entirely in the visitor's browser via transformers.js (WebGPU when available), so there is no server compute, no upload, and hosting is free.

Deploy it in ~2 minutes:

1. Go to [vercel.com/new](https://vercel.com/new) and sign in with your GitHub account.
2. Import this repository (`thebrandfull/Ai-video`).
3. Leave every setting as-is (the included `vercel.json` configures everything) and press **Deploy**.
4. Open the URL Vercel gives you — that's your app.

Any push to the repo's default branch auto-redeploys. To test locally: `python3 -m http.server -d web 8000` and open http://localhost:8000.

Notes: the first conversion downloads the model (~45 MB) into the browser cache; Chrome/Edge with WebGPU is fastest. Default output is grayscale depth (bright = near); side-by-side mode puts the original and depth next to each other.

## Holo Mythos (`web/mythos/`)

A second page in the same deployment: a real-time holographic 3D animation in which a Chinese dragon
transforms into nine mythical creatures (Kitsune, Garuda, Griffin, Sphinx, Firebird, Quetzalcoatl, Kraken,
Unicorn) while the set changes to each creature's country. Pure JavaScript / Three.js, no build step.
Open `/mythos/` on the deployed site (or `http://localhost:8000/mythos/` locally), press `R` to record a
video, or use `web/mythos/tools/render-video.mjs` for a frame-exact MP4. See `web/mythos/README.md`.

## Python CLI

Under the hood it runs [Depth Anything V2](https://huggingface.co/depth-anything/Depth-Anything-V2-Small-hf) on every frame, then stabilizes the depth scale across frames (monocular depth is only defined up to scale, so naive per-frame normalization flickers — this tool smooths that out).

## Install

```bash
pip install -r requirements.txt
```

`ffmpeg` on your PATH is optional but recommended (it's used to carry the original audio into the output).

The model weights (~100 MB for `small`) download automatically from Hugging Face on first run.

## Use

```bash
# simplest: writes input_depth.mp4 next to your input
python depth_video.py input.mp4

# pick output path and color style
python depth_video.py input.mp4 -o depth.mp4 --colormap gray

# original + depth side by side (great for checking quality)
python depth_video.py input.mp4 --side-by-side

# higher quality (slower): base or large model
python depth_video.py input.mp4 --model large

# quick test on just the first 60 frames
python depth_video.py input.mp4 --max-frames 60
```

### Options

| Flag | What it does | Default |
|---|---|---|
| `--model` | `small` / `base` / `large` — quality vs speed | `small` |
| `--colormap` | `inferno`, `gray`, `magma`, `viridis`, `turbo`, `plasma` | `inferno` |
| `--side-by-side` | original and depth next to each other | off |
| `--invert` | bright = far instead of bright = near | off |
| `--smoothing` | temporal blend 0..1 — higher = smoother but more ghosting on fast motion | `0.2` |
| `--no-smoothing` | raw per-frame depth (will flicker) | off |
| `--no-audio` | skip copying the audio track | off |
| `--max-frames N` | only process the first N frames | all |
| `--device` | `auto` / `cuda` / `mps` / `cpu` | `auto` |

## Notes

- **GPU strongly recommended.** On CPU the `small` model runs roughly 1–3 frames/sec; on a GPU it's real-time or faster.
- Bright pixels = **near**, dark = far (use `--invert` to flip).
- Depth is *relative* per scene, not metric meters — right for visualization, parallax/3D effects, and ML preprocessing.
- On hard scene cuts the temporal smoothing takes a few frames to adapt; pass `--no-smoothing` if your video is mostly cuts.
