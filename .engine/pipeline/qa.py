#!/usr/bin/env python3
"""Free, automatic checks on the finished video. Writes <work>/qa-report.json and prints plain lines.
Fails (exit 1) on: missing picture or sound, wrong length, black gaps. Warns on: long frozen picture
(old film can be static, so a person should look), long silence, loudness far from -14 LUFS.
A check that cannot run is reported as "unknown", never as a pass.
Usage: qa.py <work_dir> <video_dir>"""
import json
import pathlib
import re
import subprocess
import sys


def ffmpeg_log(video, filters, audio=False):
    flag = "-af" if audio else "-vf"
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(video), flag, filters,
                        "-f", "null", "-"], capture_output=True, text=True)
    return r.stderr if r.returncode == 0 else None


def main():
    work, video_dir = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
    video = video_dir / "video.mp4"
    checks = []

    def add(name, status, detail):
        checks.append({"check": name, "status": status, "detail": detail})

    if not video.exists():
        add("file", "fail", "video.mp4 is missing")
    else:
        r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=codec_type",
                            "-of", "json", str(video)], capture_output=True, text=True)
        info = json.loads(r.stdout or "{}")
        kinds = {s["codec_type"] for s in info.get("streams", [])}
        add("picture and sound", "pass" if {"video", "audio"} <= kinds else "fail", f"streams: {sorted(kinds)}")
        dur = float(info.get("format", {}).get("duration", 0))
        expected = json.loads((work / "audio" / "timeline.json").read_text())["total"]
        add("length", "pass" if abs(dur - expected) <= 1.0 else "fail", f"{dur:.1f}s, expected {expected:.1f}s")

        log = ffmpeg_log(video, "blackdetect=d=1.0:pix_th=0.10")
        if log is None:
            add("black gaps", "unknown", "check could not run")
        else:
            gaps = re.findall(r"black_start:([\d.]+)", log)
            add("black gaps", "fail" if gaps else "pass", f"black at {', '.join(gaps)}s" if gaps else "none")

        log = ffmpeg_log(video, "freezedetect=n=0.003:d=4")
        if log is None:
            add("frozen picture", "unknown", "check could not run")
        else:
            frz = re.findall(r"freeze_start: ([\d.]+)", log)
            add("frozen picture", "warn" if frz else "pass",
                f"still for 4s+ at {', '.join(f[:6] for f in frz)}s (fine if it is a deliberate still)" if frz else "none")

        log = ffmpeg_log(video, "silencedetect=n=-45dB:d=4", audio=True)
        if log is None:
            add("silence", "unknown", "check could not run")
        else:
            sil = re.findall(r"silence_start: ([\d.]+)", log)
            add("silence", "warn" if sil else "pass", f"4s+ of silence at {', '.join(sil)}s" if sil else "none")

        log = ffmpeg_log(video, "ebur128", audio=True)
        m = re.search(r"I:\s+(-?[\d.]+) LUFS\s*\n\s*Threshold", log or "")
        if not m:
            add("loudness", "unknown", "check could not run")
        else:
            lufs = float(m.group(1))
            add("loudness", "pass" if -16 <= lufs <= -12 else "warn", f"{lufs:.1f} LUFS (target -14)")

    (work / "qa-report.json").write_text(json.dumps(checks, indent=1))
    for c in checks:
        print(f"{c['status'].upper():8} {c['check']}: {c['detail']}")
    if any(c["status"] == "fail" for c in checks):
        sys.exit(1)


if __name__ == "__main__":
    main()
