#!/usr/bin/env python3
"""Record one WAV per scene with Kokoro (free, local) and write durations.json.
Usage: voice.py <script.json> <out_dir> [voice] [speed]
Needs the Python packages in requirements.txt and the two Kokoro model files in .engine/work/models/
(setup.command downloads them)."""
import json, sys, pathlib
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

script, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
voice = sys.argv[3] if len(sys.argv) > 3 else "am_michael"
speed = float(sys.argv[4]) if len(sys.argv) > 4 else 1.1
models = pathlib.Path(__file__).resolve().parents[1] / "work" / "models"
k = Kokoro(str(models / "kokoro-v1.0.onnx"), str(models / "voices-v1.0.bin"))
out.mkdir(parents=True, exist_ok=True)
durations = {}
for ch in json.loads(script.read_text())["chapters"]:
    for sc in ch["scenes"]:
        samples, sr = k.create(sc["narration"], voice=voice, speed=speed, lang="en-us")
        sf.write(out / f"{sc['id']}.wav", samples, sr)
        durations[sc["id"]] = round(len(samples) / sr, 3)
        print(sc["id"], durations[sc["id"]], flush=True)
(out / "durations.json").write_text(json.dumps({"voice": voice, "speed": speed, "durations": durations}, indent=2))
print("total seconds", round(sum(durations.values()), 1))
