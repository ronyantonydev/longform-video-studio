#!/usr/bin/env python3
"""Cut each planned video shot and fit it to 1280x720: 16:9 is scaled, 4:3 archive film is centred over a blurred
copy of itself (never stretched). Usage: fit_clips.py <work_dir> <hf_assets_dir> [workers=3]"""
import json, sys, subprocess, pathlib, concurrent.futures as cf
work, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]); workers = int(sys.argv[3]) if len(sys.argv) > 3 else 3
out.mkdir(parents=True, exist_ok=True)
edit = json.loads((work / "edit.json").read_text())
def job(s):
    dst = out / f"v_{s['scene']}_{s['n']}.mp4"
    if dst.exists() and dst.stat().st_size > 5000: return f"skip {dst.name}"
    src = work / "src" / s["film"]; asp = (s["w"] * (0.92 if "0.92" in s["crop"] else 1)) / s["h"]
    pre = (s["crop"] + ",") if s["crop"] else ""
    if asp >= 1.7:
        vf = f"{pre}scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1,fps=24"
        if s.get("grade") == "bw": vf += ",hue=s=0,eq=contrast=1.06:brightness=-0.01"
        elif s.get("grade") == "natural": vf += ",eq=saturation=0.93:contrast=1.03"
    else:
        vf = (f"{pre}fps=24,split[a][b];[a]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,boxblur=26:5,eq=brightness=-0.12[bg];"
              f"[b]scale=-2:720,setsar=1[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2")
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-ss", str(s["ss"]), "-i", str(src), "-t", str(round(s["dur"] + s.get("extend", 0) + 0.05, 3)), "-an", "-vf", vf,
           "-c:v", "libx264", "-crf", "19", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-g", "24", "-movflags", "+faststart", str(dst)]
    r = subprocess.run(cmd, capture_output=True, text=True)
    return ("ok   " if r.returncode == 0 and dst.exists() else "FAIL ") + dst.name + (" " + r.stderr[-200:] if r.returncode else "")
vids = [s for s in edit["shots"] if s["type"] == "video"]
with cf.ThreadPoolExecutor(workers) as ex:
    for res in ex.map(job, vids): print(res, flush=True)
print("done", len(vids), "clips")
