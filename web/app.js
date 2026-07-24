// Video -> depth-map video, fully client-side.
// Depth: Depth Anything V2 (small) via transformers.js (WebGPU when available).
// Encoding: WebCodecs VideoEncoder + mp4-muxer.

const TRANSFORMERS_CDN = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.2";
const MP4_MUXER_CDN = "https://cdn.jsdelivr.net/npm/mp4-muxer@5.2.1/+esm";
const MODEL_ID = "onnx-community/depth-anything-v2-small";

const $ = (id) => document.getElementById(id);
const video = $("video");

let currentFile = null;
let cancelled = false;
let depthPipe = null;
let RawImage = null;

// ---------- file loading ----------

function loadFile(file) {
  if (!file || !file.type.startsWith("video/")) return;
  currentFile = file;
  video.src = URL.createObjectURL(file);
  video.addEventListener("error", () => {
    alert("This browser can't decode that video's codec. Try an H.264 mp4 or a webm file.");
  }, { once: true });
  video.addEventListener("loadedmetadata", () => {
    const d = video.duration;
    for (const id of ["start-range", "end-range"]) $(id).max = d.toFixed(1);
    $("start-range").value = 0;
    // Default the clip to the first 5 seconds so conversions start quick.
    $("end-range").value = Math.min(5, d).toFixed(1);
    updateTrimLabels();
    $("editor").classList.remove("hidden");
    $("result").classList.add("hidden");
  }, { once: true });
}

$("browse-btn").addEventListener("click", () => $("file-input").click());
$("drop-zone").addEventListener("click", (e) => {
  if (e.target.id !== "browse-btn") $("file-input").click();
});
$("file-input").addEventListener("change", (e) => loadFile(e.target.files[0]));
$("drop-zone").addEventListener("dragover", (e) => {
  e.preventDefault();
  $("drop-zone").classList.add("dragover");
});
$("drop-zone").addEventListener("dragleave", () => $("drop-zone").classList.remove("dragover"));
$("drop-zone").addEventListener("drop", (e) => {
  e.preventDefault();
  $("drop-zone").classList.remove("dragover");
  loadFile(e.dataTransfer.files[0]);
});

// ---------- trim controls ----------

function trimRange() {
  let start = parseFloat($("start-range").value);
  let end = parseFloat($("end-range").value);
  if (end < start + 0.2) end = Math.min(start + 0.2, video.duration || start + 0.2);
  return { start, end };
}

function updateTrimLabels() {
  const { start, end } = trimRange();
  $("start-label").textContent = `${start.toFixed(1)}s`;
  $("end-label").textContent = `${end.toFixed(1)}s`;
  $("clip-length").textContent = `${(end - start).toFixed(1)}s`;
}

$("start-range").addEventListener("input", () => {
  const start = parseFloat($("start-range").value);
  if (parseFloat($("end-range").value) < start) $("end-range").value = start;
  video.currentTime = start;
  updateTrimLabels();
});
$("end-range").addEventListener("input", () => {
  const end = parseFloat($("end-range").value);
  if (parseFloat($("start-range").value) > end) $("start-range").value = end;
  video.currentTime = end;
  updateTrimLabels();
});
$("full-btn").addEventListener("click", () => {
  $("start-range").value = 0;
  $("end-range").value = video.duration.toFixed(1);
  updateTrimLabels();
});
$("preview-btn").addEventListener("click", () => {
  const { start, end } = trimRange();
  video.currentTime = start;
  video.play();
  const stop = () => { if (video.currentTime >= end) { video.pause(); video.removeEventListener("timeupdate", stop); } };
  video.addEventListener("timeupdate", stop);
});

// ---------- colormaps ----------

const CMAP_ANCHORS = {
  gray: [[0, 0, 0], [255, 255, 255]],
  inferno: [[0, 0, 4], [31, 12, 72], [85, 15, 109], [136, 34, 106],
            [186, 54, 85], [227, 89, 51], [249, 140, 10], [249, 201, 50], [252, 255, 164]],
  magma: [[0, 0, 4], [28, 16, 68], [79, 18, 123], [129, 37, 129],
          [181, 54, 122], [229, 80, 100], [251, 135, 97], [254, 194, 135], [252, 253, 191]],
  viridis: [[68, 1, 84], [72, 40, 120], [62, 74, 137], [49, 104, 142],
            [38, 130, 142], [31, 158, 137], [53, 183, 121], [109, 205, 89], [180, 222, 44], [253, 231, 37]],
};

function buildLUT(name) {
  const anchors = CMAP_ANCHORS[name];
  const lut = new Uint8Array(256 * 3);
  for (let i = 0; i < 256; i++) {
    const p = (i / 255) * (anchors.length - 1);
    const j = Math.min(Math.floor(p), anchors.length - 2);
    const f = p - j;
    for (let c = 0; c < 3; c++) {
      lut[i * 3 + c] = Math.round(anchors[j][c] * (1 - f) + anchors[j + 1][c] * f);
    }
  }
  return lut;
}

// ---------- temporal stabilization (same approach as depth_video.py) ----------

class TemporalStabilizer {
  constructor(rangeMomentum = 0.9, blend = 0.2) {
    this.m = rangeMomentum;
    this.blend = blend;
    this.lo = null;
    this.hi = null;
    this.prev = null;
  }

  // Robust 2%/98% percentiles from a subsample, cheap enough per frame.
  percentiles(data) {
    const stride = Math.max(1, Math.floor(data.length / 20000));
    const sample = [];
    for (let i = 0; i < data.length; i += stride) sample.push(data[i]);
    sample.sort((a, b) => a - b);
    return [sample[Math.floor(sample.length * 0.02)], sample[Math.floor(sample.length * 0.98)]];
  }

  apply(depth) {
    const [lo, hi] = this.percentiles(depth);
    if (this.lo === null) {
      this.lo = lo; this.hi = hi;
    } else {
      this.lo = this.m * this.lo + (1 - this.m) * lo;
      this.hi = this.m * this.hi + (1 - this.m) * hi;
    }
    const span = Math.max(this.hi - this.lo, 1e-6);
    const out = new Float32Array(depth.length);
    const blendPrev = this.prev !== null && this.blend > 0;
    for (let i = 0; i < depth.length; i++) {
      let v = (depth[i] - this.lo) / span;
      v = v < 0 ? 0 : v > 1 ? 1 : v;
      if (blendPrev) v = (1 - this.blend) * v + this.blend * this.prev[i];
      out[i] = v;
    }
    this.prev = out;
    return out;
  }
}

// ---------- depth model ----------

async function ensurePipeline(setStatus) {
  if (depthPipe) return;
  setStatus("Loading transformers.js ...");
  const { pipeline, RawImage: RI, env } = await import(TRANSFORMERS_CDN);
  RawImage = RI;
  env.allowLocalModels = false;

  const device = navigator.gpu ? "webgpu" : "wasm";
  $("device-badge").textContent = device === "webgpu" ? "GPU (WebGPU)" : "CPU (WASM)";
  setStatus("Downloading depth model (first time only, ~45 MB) ...");
  depthPipe = await pipeline("depth-estimation", MODEL_ID, {
    device,
    dtype: device === "webgpu" ? "fp16" : "q8",
    progress_callback: (p) => {
      if (p.status === "progress" && p.total) {
        setStatus(`Downloading model: ${p.file} ${Math.round(100 * p.loaded / p.total)}%`);
      }
    },
  });
}

// Bilinear resize of a single-channel float image.
function resizeDepth(data, sw, sh, dw, dh) {
  if (sw === dw && sh === dh) return data;
  const out = new Float32Array(dw * dh);
  for (let y = 0; y < dh; y++) {
    const sy = (y / dh) * sh;
    const y0 = Math.min(Math.floor(sy), sh - 1);
    const y1 = Math.min(y0 + 1, sh - 1);
    const fy = sy - y0;
    for (let x = 0; x < dw; x++) {
      const sx = (x / dw) * sw;
      const x0 = Math.min(Math.floor(sx), sw - 1);
      const x1 = Math.min(x0 + 1, sw - 1);
      const fx = sx - x0;
      const a = data[y0 * sw + x0] * (1 - fx) + data[y0 * sw + x1] * fx;
      const b = data[y1 * sw + x0] * (1 - fx) + data[y1 * sw + x1] * fx;
      out[y * dw + x] = a * (1 - fy) + b * fy;
    }
  }
  return out;
}

// ---------- encoding (WebCodecs + mp4-muxer) ----------

async function createEncoder(width, height, fps) {
  if (!("VideoEncoder" in window)) {
    throw new Error("Your browser doesn't support WebCodecs (needed to write the video). Use a recent Chrome, Edge, Safari, or Firefox.");
  }
  const { Muxer, ArrayBufferTarget } = await import(MP4_MUXER_CDN);

  let codec = null;
  for (const c of ["avc1.640033", "avc1.4d0028", "avc1.42001f"]) {
    const { supported } = await VideoEncoder.isConfigSupported({ codec: c, width, height, bitrate: 6_000_000 });
    if (supported) { codec = c; break; }
  }
  if (!codec) throw new Error(`No supported H.264 encoder for ${width}x${height} in this browser.`);

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: "avc", width, height },
    fastStart: "in-memory",
  });
  let encodeError = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => { encodeError = e; },
  });
  encoder.configure({ codec, width, height, bitrate: 6_000_000, framerate: fps });

  return {
    async addFrame(canvas, index) {
      if (encodeError) throw encodeError;
      const frame = new VideoFrame(canvas, {
        timestamp: Math.round(index * 1e6 / fps),
        duration: Math.round(1e6 / fps),
      });
      encoder.encode(frame, { keyFrame: index % (fps * 2) === 0 });
      frame.close();
      while (encoder.encodeQueueSize > 4) await new Promise((r) => setTimeout(r, 15));
    },
    async finish() {
      await encoder.flush();
      muxer.finalize();
      return new Blob([muxer.target.buffer], { type: "video/mp4" });
    },
  };
}

// ---------- conversion ----------

function seekTo(t) {
  return new Promise((resolve) => {
    video.addEventListener("seeked", () => resolve(), { once: true });
    video.currentTime = Math.min(t, Math.max(0, video.duration - 0.001));
  });
}

function even(n) { return 2 * Math.floor(n / 2); }

async function convert() {
  const { start, end } = trimRange();
  const fps = parseInt($("fps").value, 10);
  const sideBySide = $("side-by-side").checked;
  const invert = $("invert").checked;
  const lut = buildLUT($("colormap").value);
  const maxH = parseInt($("resolution").value, 10);

  let W = video.videoWidth, H = video.videoHeight;
  if (maxH > 0 && H > maxH) { W = Math.round(W * maxH / H); H = maxH; }
  W = even(W); H = even(H);

  const nFrames = Math.max(1, Math.round((end - start) * fps));
  const setStatus = (s) => { $("status").textContent = s; };

  $("convert-btn").disabled = true;
  $("cancel-btn").classList.remove("hidden");
  $("progress-wrap").classList.remove("hidden");
  $("result").classList.add("hidden");
  cancelled = false;
  video.pause();

  try {
    await ensurePipeline(setStatus);

    // Work canvas holds the current source frame; out canvas is what we encode.
    const work = document.createElement("canvas");
    work.width = W; work.height = H;
    const workCtx = work.getContext("2d", { willReadFrequently: true });

    const outCanvas = $("out-canvas");
    outCanvas.width = sideBySide ? W * 2 : W;
    outCanvas.height = H;
    const outCtx = outCanvas.getContext("2d");

    const encoder = await createEncoder(outCanvas.width, outCanvas.height, fps);
    const stabilizer = new TemporalStabilizer();
    const depthImage = outCtx.createImageData(W, H);
    const t0 = performance.now();

    for (let i = 0; i < nFrames; i++) {
      if (cancelled) throw new Error("cancelled");

      await seekTo(start + i / fps);
      workCtx.drawImage(video, 0, 0, W, H);

      const rgba = workCtx.getImageData(0, 0, W, H);
      const result = await depthPipe(new RawImage(rgba.data, W, H, 4));

      const tensor = result.predicted_depth;
      const [th, tw] = tensor.dims.slice(-2);
      const depth = resizeDepth(tensor.data, tw, th, W, H);

      const norm = stabilizer.apply(depth);
      const px = depthImage.data;
      for (let p = 0; p < norm.length; p++) {
        let v = invert ? 1 - norm[p] : norm[p];
        const idx = (v * 255) | 0;
        px[p * 4] = lut[idx * 3];
        px[p * 4 + 1] = lut[idx * 3 + 1];
        px[p * 4 + 2] = lut[idx * 3 + 2];
        px[p * 4 + 3] = 255;
      }
      if (sideBySide) {
        outCtx.drawImage(work, 0, 0);
        outCtx.putImageData(depthImage, W, 0);
      } else {
        outCtx.putImageData(depthImage, 0, 0);
      }

      await encoder.addFrame(outCanvas, i);

      const done = i + 1;
      const rate = done / ((performance.now() - t0) / 1000);
      const eta = Math.round((nFrames - done) / Math.max(rate, 0.01));
      $("progress-bar").style.width = `${(100 * done / nFrames).toFixed(1)}%`;
      setStatus(`Frame ${done}/${nFrames} — ${rate.toFixed(1)} fps — ~${eta}s left`);
    }

    setStatus("Finalizing video ...");
    const blob = await encoder.finish();
    const url = URL.createObjectURL(blob);
    const link = $("download-link");
    link.href = url;
    link.download = (currentFile?.name.replace(/\.[^.]+$/, "") || "video") + "_depth.mp4";
    $("result").classList.remove("hidden");
    setStatus(`Done — ${(blob.size / 1e6).toFixed(1)} MB`);
    link.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (err) {
    setStatus(err.message === "cancelled" ? "Cancelled." : `Error: ${err.message}`);
    if (err.message !== "cancelled") console.error(err);
  } finally {
    $("convert-btn").disabled = false;
    $("cancel-btn").classList.add("hidden");
  }
}

$("convert-btn").addEventListener("click", convert);
$("cancel-btn").addEventListener("click", () => { cancelled = true; });
