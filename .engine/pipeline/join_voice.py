#!/usr/bin/env python3
"""Join per-scene WAVs with pauses; write narration.wav and timeline.json (scene start/end).
Usage: join_voice.py <script.json> <audio_dir>"""
import json, sys, pathlib
import numpy as np, soundfile as sf
script, ad = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
SCENE_GAP, CHAPTER_GAP, LEAD, TAIL = 0.35, 0.8, 0.6, 1.5
chunks, tl, t, sr = [], [], 0.0, None
def silence(sec): return np.zeros(int(sr * sec), dtype="float32")
for ci, ch in enumerate(json.loads(script.read_text())["chapters"]):
    for si, sc in enumerate(ch["scenes"]):
        x, sr = sf.read(ad / f"{sc['id']}.wav", dtype="float32")
        if not chunks: chunks.append(silence(LEAD)); t = LEAD
        elif si == 0: chunks.append(silence(CHAPTER_GAP)); t += CHAPTER_GAP
        else: chunks.append(silence(SCENE_GAP)); t += SCENE_GAP
        tl.append({"id": sc["id"], "chapter": ch["title"], "start": round(t, 3), "end": round(t + len(x) / sr, 3)})
        chunks.append(x); t += len(x) / sr
chunks.append(silence(TAIL)); t += TAIL
sf.write(ad / "narration.wav", np.concatenate(chunks), sr)
(ad / "timeline.json").write_text(json.dumps({"total": round(t, 3), "scenes": tl}, indent=2))
print("total", round(t, 1), "seconds")
