#!/usr/bin/env python3
"""Turn any video into a depth-map video.

Runs monocular depth estimation (Depth Anything V2) on every frame,
stabilizes the depth scale across frames so motion stays coherent
(no flicker), and writes the result back out as a video — optionally
side-by-side with the original and with the original audio track.

Usage:
    python depth_video.py input.mp4
    python depth_video.py input.mp4 -o out.mp4 --colormap inferno --side-by-side
"""

import argparse
import os
import shutil
import subprocess
import sys
import tempfile

import cv2
import numpy as np


COLORMAPS = {
    "gray": None,
    "inferno": cv2.COLORMAP_INFERNO,
    "magma": cv2.COLORMAP_MAGMA,
    "viridis": cv2.COLORMAP_VIRIDIS,
    "turbo": cv2.COLORMAP_TURBO,
    "plasma": cv2.COLORMAP_PLASMA,
}

MODELS = {
    "small": "depth-anything/Depth-Anything-V2-Small-hf",
    "base": "depth-anything/Depth-Anything-V2-Base-hf",
    "large": "depth-anything/Depth-Anything-V2-Large-hf",
}


def build_pipeline(model_size: str, device_arg: str):
    import torch
    from transformers import pipeline

    if device_arg == "auto":
        if torch.cuda.is_available():
            device = "cuda"
        elif getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
            device = "mps"
        else:
            device = "cpu"
    else:
        device = device_arg

    print(f"Loading {MODELS[model_size]} on {device} ...")
    return pipeline(
        task="depth-estimation",
        model=MODELS[model_size],
        device=device,
    )


class TemporalStabilizer:
    """Keeps depth consistent across frames.

    Per-frame monocular depth is only defined up to an unknown scale/shift,
    so raw per-frame normalization flickers badly. We align each frame's
    depth range to a running estimate of the scene's min/max (exponential
    moving average), then blend the aligned depth with the previous frame.
    """

    def __init__(self, range_momentum: float = 0.9, blend: float = 0.2):
        self.range_momentum = range_momentum
        self.blend = blend
        self.lo = None
        self.hi = None
        self.prev = None

    def __call__(self, depth: np.ndarray) -> np.ndarray:
        # Robust range: ignore extreme outlier pixels.
        lo = float(np.percentile(depth, 2))
        hi = float(np.percentile(depth, 98))
        if self.lo is None:
            self.lo, self.hi = lo, hi
        else:
            m = self.range_momentum
            self.lo = m * self.lo + (1 - m) * lo
            self.hi = m * self.hi + (1 - m) * hi

        span = max(self.hi - self.lo, 1e-6)
        norm = np.clip((depth - self.lo) / span, 0.0, 1.0)

        if self.prev is not None and self.blend > 0:
            norm = (1 - self.blend) * norm + self.blend * self.prev
        self.prev = norm
        return norm


def colorize(norm_depth: np.ndarray, colormap_name: str) -> np.ndarray:
    """0..1 float depth -> BGR uint8 frame."""
    d8 = (norm_depth * 255.0).astype(np.uint8)
    cmap = COLORMAPS[colormap_name]
    if cmap is None:
        return cv2.cvtColor(d8, cv2.COLOR_GRAY2BGR)
    return cv2.applyColorMap(d8, cmap)


def mux_audio(video_no_audio: str, source: str, dest: str) -> bool:
    """Copy the audio track from source onto the rendered video."""
    ffmpeg = shutil.which("ffmpeg")
    if ffmpeg is None:
        return False
    cmd = [
        ffmpeg, "-y", "-loglevel", "error",
        "-i", video_no_audio, "-i", source,
        "-map", "0:v:0", "-map", "1:a:0?",
        "-c:v", "copy", "-c:a", "aac", "-shortest",
        dest,
    ]
    return subprocess.run(cmd).returncode == 0


def process(args: argparse.Namespace) -> None:
    cap = cv2.VideoCapture(args.input)
    if not cap.isOpened():
        sys.exit(f"error: could not open video: {args.input}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    out_w = width * 2 if args.side_by_side else width
    tmp_out = tempfile.mktemp(suffix=".mp4")
    writer = cv2.VideoWriter(
        tmp_out, cv2.VideoWriter_fourcc(*"mp4v"), fps, (out_w, height)
    )
    if not writer.isOpened():
        sys.exit("error: could not open output video writer")

    pipe = build_pipeline(args.model, args.device)
    stabilizer = TemporalStabilizer(blend=0.0 if args.no_smoothing else args.smoothing)

    from PIL import Image

    frame_idx = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        frame_idx += 1
        if args.max_frames and frame_idx > args.max_frames:
            break

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        result = pipe(Image.fromarray(rgb))
        depth = np.array(result["predicted_depth"], dtype=np.float32)

        # Model output resolution can differ from the frame; resize back.
        if depth.shape[:2] != (height, width):
            depth = cv2.resize(depth, (width, height), interpolation=cv2.INTER_CUBIC)

        norm = stabilizer(depth)
        if args.invert:
            norm = 1.0 - norm
        depth_bgr = colorize(norm, args.colormap)

        writer.write(np.hstack([frame, depth_bgr]) if args.side_by_side else depth_bgr)

        if frame_idx % 10 == 0 or frame_idx == total:
            pct = f" ({100 * frame_idx / total:.0f}%)" if total > 0 else ""
            print(f"\rframe {frame_idx}/{total or '?'}{pct}", end="", flush=True)

    print()
    cap.release()
    writer.release()

    if frame_idx == 0:
        os.remove(tmp_out)
        sys.exit("error: no frames could be read from the input video")

    if not args.no_audio and mux_audio(tmp_out, args.input, args.output):
        os.remove(tmp_out)
    else:
        shutil.move(tmp_out, args.output)
    print(f"done -> {args.output}")


def main() -> None:
    p = argparse.ArgumentParser(
        description="Convert a video into a depth-map video (Depth Anything V2)."
    )
    p.add_argument("input", help="path to the input video")
    p.add_argument("-o", "--output", default=None,
                   help="output path (default: <input>_depth.mp4)")
    p.add_argument("--model", choices=list(MODELS), default="small",
                   help="model size: small is fast, large is most detailed (default: small)")
    p.add_argument("--colormap", choices=list(COLORMAPS), default="inferno",
                   help="color style of the depth map (default: inferno)")
    p.add_argument("--side-by-side", action="store_true",
                   help="write original and depth next to each other")
    p.add_argument("--invert", action="store_true",
                   help="flip near/far (bright = far instead of bright = near)")
    p.add_argument("--smoothing", type=float, default=0.2,
                   help="temporal blend with previous frame, 0..1 (default: 0.2)")
    p.add_argument("--no-smoothing", action="store_true",
                   help="disable all temporal smoothing")
    p.add_argument("--no-audio", action="store_true",
                   help="do not copy the audio track to the output")
    p.add_argument("--max-frames", type=int, default=0,
                   help="only process the first N frames (0 = all)")
    p.add_argument("--device", choices=["auto", "cuda", "mps", "cpu"], default="auto",
                   help="compute device (default: auto)")
    args = p.parse_args()

    if args.output is None:
        root, _ = os.path.splitext(args.input)
        args.output = f"{root}_depth.mp4"

    process(args)


if __name__ == "__main__":
    main()
