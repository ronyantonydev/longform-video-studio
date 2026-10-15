#!/usr/bin/env python3
"""Split a film into shots with scene detection and build numbered contact sheets.
Usage: shot_catalog.py <video> <out_dir> [scene_threshold=0.30] [min_shot_sec=1.2]
Writes <out_dir>/shots.json and <out_dir>/sheet_N.jpg (56 shots per sheet)."""
import json, re, subprocess, sys, pathlib, shutil
from PIL import Image, ImageDraw
vid, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
thr = float(sys.argv[3]) if len(sys.argv) > 3 else 0.30
minlen = float(sys.argv[4]) if len(sys.argv) > 4 else 1.2
out.mkdir(parents=True, exist_ok=True)
fr = out / "frames"; shutil.rmtree(fr, ignore_errors=True); fr.mkdir()
def probe():
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=width,height", "-of", "json", str(vid)], capture_output=True, text=True)
    j = json.loads(r.stdout); s = [x for x in j["streams"] if "width" in x][0]
    return float(j["format"]["duration"]), s["width"], s["height"]
dur, w, h = probe()
log = out / "scenes.txt"
subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-loglevel", "error", "-i", str(vid), "-an", "-vf", f"scale=320:-2,select='gt(scene,{thr})',metadata=print:file={log}", "-f", "null", "-"], check=True)
cuts = [float(m) for m in re.findall(r"pts_time:([\d.]+)", log.read_text())] if log.exists() else []
b = [0.0] + cuts + [dur]
shots = []
for a, z in zip(b, b[1:]):
    if shots and z - a < minlen: shots[-1]["end"] = z; continue
    shots.append({"start": a, "end": z})
shots = [s for s in shots if s["end"] - s["start"] >= minlen]
for i, s in enumerate(shots): s["idx"] = i; s["dur"] = round(s["end"] - s["start"], 2)
step = 1 if dur > 120 else 0.5
subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-loglevel", "error", "-i", str(vid), "-an", "-vf", f"fps={1/step},scale=240:-2", "-q:v", "6", str(fr / "f%05d.jpg")], check=True)
W, H, cols, rows = 240, 190, 8, 7
for si in range(0, len(shots), cols * rows):
    chunk = shots[si:si + cols * rows]
    sheet = Image.new("RGB", (cols * W, ((len(chunk) + cols - 1) // cols) * (H + 14)), "white"); d = ImageDraw.Draw(sheet)
    for n, s in enumerate(chunk):
        mid = (s["start"] + s["end"]) / 2; f = fr / f"f{int(mid / step) + 1:05d}.jpg"
        if not f.exists(): f = sorted(fr.glob("f*.jpg"))[-1]
        im = Image.open(f); im.thumbnail((W - 4, H - 2)); r, c = divmod(n, cols)
        sheet.paste(im, (c * W + 2, r * (H + 14) + 1)); d.text((c * W + 4, r * (H + 14) + H), f"#{s['idx']} {s['start']:.0f}s ({s['dur']}s)", fill="black")
    sheet.save(out / f"sheet_{si // (cols * rows)}.jpg", quality=80)
(out / "shots.json").write_text(json.dumps({"video": str(vid), "duration": dur, "w": w, "h": h, "shots": shots}, indent=1))
print(vid.name, f"{dur:.0f}s {w}x{h}: {len(shots)} shots, {(len(shots) + 55) // 56} sheets")
