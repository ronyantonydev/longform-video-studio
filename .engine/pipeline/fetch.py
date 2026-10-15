#!/usr/bin/env python3
"""Download every file listed in <work>/sources.json into <work>/src/, resuming partial downloads.

sources.json:
  {"files": [{"url": "https://archive.org/download/<id>/<file>.mp4", "dest": "ia/plow.mp4"},
             {"url": "https://upload.wikimedia.org/.../clip.webm", "dest": "commons/clip.webm"}]}

A finished file gets a .complete marker, so re-running only fetches what is missing.
Usage: fetch.py <work_dir>"""
import json
import pathlib
import subprocess
import sys
import time

from common import UA


def main():
    work = pathlib.Path(sys.argv[1])
    files = json.loads((work / "sources.json").read_text())["files"]
    failed = []
    for f in files:
        dest = work / "src" / f["dest"]
        done = dest.with_name(dest.name + ".complete")
        if dest.exists() and done.exists():
            print("have ", f["dest"], flush=True)
            continue
        dest.parent.mkdir(parents=True, exist_ok=True)
        r = subprocess.run(["curl", "-sSL", "-C", "-", "--retry", "8", "--retry-delay", "8", "-A", UA,
                            "-o", str(dest), f["url"]], capture_output=True, text=True)
        if r.returncode == 0 and dest.exists() and dest.stat().st_size > 1000:
            done.touch()
            print("ok   ", f["dest"], f"{dest.stat().st_size // 1_000_000} MB", flush=True)
        else:
            failed.append(f["dest"])
            print("FAIL ", f["dest"], r.stderr.strip()[-160:], flush=True)
        time.sleep(2)  # be polite to free archives
    print(f"{len(files) - len(failed)} of {len(files)} files ready")
    if failed:
        sys.exit("could not download: " + ", ".join(failed))


if __name__ == "__main__":
    main()
