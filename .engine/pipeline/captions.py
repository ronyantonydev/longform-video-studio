#!/usr/bin/env python3
"""Build captions.srt from the script text and the scene timeline (never from raw speech-to-text,
so a transcription slip cannot put a wrong word on screen). Timing inside a scene is spread
by word length, anchored to Parakeet's measured scene boundaries.
Usage: captions.py <script.json> <timeline.json> <out.srt>"""
import json, re, sys, pathlib
script, tl, out = (pathlib.Path(a) for a in sys.argv[1:4])
scenes = {s["id"]: s for c in json.loads(script.read_text())["chapters"] for s in c["scenes"]}
def ts(x):
    return f"{int(x//3600):02d}:{int(x%3600//60):02d}:{x%60:06.3f}".replace(".", ",")
lines = []
for s in json.loads(tl.read_text())["scenes"]:
    words = scenes[s["id"]]["narration"].split()
    groups, g = [], []
    for w in words:
        g.append(w)
        weak = w.lower().strip(",.") in {"a","an","the","of","to","in","and","or","at","for","with","by","from","that","than","as","is","was","on","but","so","its","their","his","her","our","into","over","about"}
        if re.search(r"[.?!]$", w) or (len(g) >= 4 and w.endswith(",")) or (len(g) >= 7 and not weak) or len(g) >= 10:
            groups.append(g); g = []
    if g: groups.append(g)
    weights = [sum(len(w) + 1 for w in g) for g in groups]
    t, span = s["start"], s["end"] - s["start"]
    for g, wt in zip(groups, weights):
        d = span * wt / sum(weights)
        lines.append((t, t + d, " ".join(g))); t += d
out.write_text("".join(f"{i}\n{ts(a)} --> {ts(b)}\n{x}\n\n" for i, (a, b, x) in enumerate(lines, 1)))
print(len(lines), "caption lines")
