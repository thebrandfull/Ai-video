# AI Video Depth Map

Give it a video, get back the same video as a **depth map** — every frame shows how far each pixel is from the camera, so all the movement and structure of the original is preserved in depth form.

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
