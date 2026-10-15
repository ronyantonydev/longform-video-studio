#!/usr/bin/env python3
"""Render the picture, mix voice and music, join them, and pick a thumbnail.

1. Render <work>/hf with HyperFrames -> <work>/out/picture.mp4 (skipped if already newer than the edit).
2. Mix: narration plus optional music from plan.json ("music": {"file": "music/x.ogg", "volume": 0.3, ...}), music ducked
   under the voice and faded out, whole mix normalised to -14 LUFS (YouTube's loudness).
3. Join picture and sound -> <video_dir>/video.mp4.
4. Thumbnail: the strongest of 12 frames from the finished video -> <video_dir>/thumbnail.png.

Needs Node 22+ for HyperFrames. Usage: finish.py <work_dir> <video_dir> [--force-render]"""
import json
import pathlib
import shutil
import subprocess
import sys

from PIL import Image, ImageStat

from common import probe

HF_VERSION = "0.8.159"


def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if r.returncode:
        sys.exit(f"step failed: {' '.join(map(str, cmd[:4]))} ...\n{r.stderr[-800:]}")
    return r


def node_major():
    try:
        return int(subprocess.run(["node", "--version"], capture_output=True, text=True).stdout.strip().lstrip("v").split(".")[0])
    except (OSError, ValueError):
        return 0


def render(work, force):
    hf, out = work / "hf", work / "out" / "picture.mp4"
    out.parent.mkdir(exist_ok=True)
    newest_input = max(p.stat().st_mtime for p in [hf / "index.html", *(hf / "assets").glob("*")])
    if out.exists() and out.stat().st_mtime > newest_input and not force:
        print("picture is up to date")
        return out
    if node_major() < 22:
        sys.exit("HyperFrames needs Node 22 or newer. Run setup again, or install Node 22.")
    print("rendering the picture (this is the slow part) ...", flush=True)
    with open(work / "out" / "render.log", "w") as log:
        r = subprocess.run(["npx", "--yes", "--prefer-offline", f"hyperframes@{HF_VERSION}", "render", str(hf), "-o", str(out),
                            "-f", "24", "-q", "high"], stdout=log, stderr=subprocess.STDOUT)
    if r.returncode or not out.exists():
        sys.exit(f"render failed; see {work / 'out' / 'render.log'}")
    return out


def mix(work):
    narration = work / "audio" / "narration.wav"
    mixed = work / "audio" / "mix.wav"
    total = json.loads((work / "audio" / "timeline.json").read_text())["total"]
    plan = json.loads((work / "plan.json").read_text()) if (work / "plan.json").exists() else {}
    music = plan.get("music")
    loud = "loudnorm=I=-14:TP=-1.5:LRA=11"
    if music:
        fade = max(total - 4, 0)
        volume = float(music.get("volume", 0.30))  # plan.json: music.volume, 0.1 quiet to 0.6 loud
        graph = (f"[0:a]aresample=48000,asplit=2[v1][v2];"
                 f"[1:a]aresample=48000,volume={volume:.2f},afade=t=out:st={fade:.2f}:d=4[m];"
                 f"[m][v1]sidechaincompress=threshold=0.03:ratio=6:attack=30:release=500[md];"
                 f"[v2][md]amix=inputs=2:duration=first:normalize=0,{loud}[a]")
        cmd = ["ffmpeg", "-y", "-loglevel", "error", "-i", str(narration), "-stream_loop", "-1",
               "-i", str(work / music["file"]), "-filter_complex", graph, "-map", "[a]", "-t", f"{total:.3f}",
               "-ar", "48000", str(mixed)]
    else:
        cmd = ["ffmpeg", "-y", "-loglevel", "error", "-i", str(narration), "-af", f"aresample=48000,{loud}",
               "-ar", "48000", str(mixed)]
    run(cmd)
    return mixed


def mux(picture, mixed, video_dir):
    final = video_dir / "video.mp4"
    run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(picture), "-i", str(mixed), "-map", "0:v:0", "-map", "1:a:0",
         "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", str(final)])
    return final


def thumbnail(final, video_dir, work):
    dur = probe(final)[0]
    tmp = work / "out" / "thumbs"
    shutil.rmtree(tmp, ignore_errors=True)
    tmp.mkdir(parents=True)
    best, best_score = None, -1.0
    for i in range(12):
        t = dur * (0.08 + 0.84 * i / 11)  # stay away from fades at the start and end
        f = tmp / f"t{i:02d}.png"
        run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{t:.2f}", "-i", str(final), "-frames:v", "1", str(f)])
        score = sum(ImageStat.Stat(Image.open(f).convert("L")).stddev)
        if score > best_score:
            best, best_score = f, score
    Image.open(best).convert("RGB").resize((1280, 720)).save(video_dir / "thumbnail.png")


def main():
    work, video_dir = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
    picture = render(work, "--force-render" in sys.argv)
    mixed = mix(work)
    final = mux(picture, mixed, video_dir)
    thumbnail(final, video_dir, work)
    print(f"done: {final} ({probe(final)[0]:.1f}s) and thumbnail.png")


if __name__ == "__main__":
    main()
