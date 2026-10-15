#!/usr/bin/env python3
"""Turn plan.json + shot catalogs + the voice timeline into edit.json (every shot with its source,
in-point and duration), write licence-ledger.json, and check how much of the video is real footage.

plan.json (written by Claude after looking at the contact sheets):
{
  "sources": {"plow": {"file": "ia/plow.mp4", "catalog": "plow", "label": "The Plow That Broke the Plains (1936)",
                       "crop": "crop=iw*0.97:ih*0.97", "url": "https://archive.org/details/...",
                       "licence": "Public domain (US government work)"}},
  "modern":  {"clip.webm": {"label": "USDA · NRCS", "url": "https://commons.wikimedia.org/...", "licence": "Public domain"}},
  "photos":  {"fdr1": {"label": "Photograph · National Archives", "url": "...", "licence": "Public domain"}},
  "music":   {"file": "music/track.ogg", "title": "...", "artist": "...", "url": "...", "licence": "CC BY 3.0"},
  "plan": {"s01": [["v", "plow", 134], ["v", "plow", 141, 2.0], ["m", "clip.webm", 20, {"d": 3.7, "bw": true}],
                   ["p", "fdr1"], ["c", "Big line", "Small line"]]}
}
Items: "v" archive shot (source, shot index from the catalog, optional offset); "m" whole clip from src/commons
(file, start second); "p" photo (key -> photos/<key>.jpg); "c" text card. A trailing {} holds options:
d (fixed seconds), overlay [line1, line2], bw, dissolve (seconds).

Usage: plan_shots.py <work_dir> [--video-target 70]"""
import json
import pathlib
import sys

from common import probe

MARGIN, MINDUR = 0.18, 1.6


def label_for(meta, default=""):
    return meta if isinstance(meta, str) else (meta or {}).get("label", default)


def main():
    work = pathlib.Path(sys.argv[1])
    target = float(sys.argv[sys.argv.index("--video-target") + 1]) if "--video-target" in sys.argv else 70.0
    p = json.loads((work / "plan.json").read_text())
    sources, plan = p.get("sources", {}), p["plan"]
    modern, modern_tags, photos = p.get("modern", {}), p.get("modern_tags", {}), p.get("photos", {})

    tl = json.loads((work / "audio" / "timeline.json").read_text())
    scenes, total = tl["scenes"], tl["total"]
    starts = [0.0] + [s["start"] for s in scenes[1:]] + [total]
    cat = {k: json.loads((work / "cat" / v["catalog"] / "shots.json").read_text()) for k, v in sources.items()}
    info_file = work / "cat" / "commons" / "info.json"
    minfo = json.loads(info_file.read_text()) if info_file.exists() else {}

    def modern_info(f):
        if f not in minfo:
            d, w, h = probe(work / "src" / "commons" / f)
            minfo[f] = {"duration": d, "w": w, "h": h}
        return minfo[f]

    def modern_label(f):
        if f in modern:
            return label_for(modern[f])
        return next((v for k, v in modern_tags.items() if k in f), "Wikimedia Commons")

    missing = [s["id"] for s in scenes if s["id"] not in plan]
    if missing:
        sys.exit("plan.json has no shots for: " + ", ".join(missing))

    out, warn = [], []
    for si, sc in enumerate(scenes):
        D = starts[si + 1] - starts[si]
        items, opts = [], []
        for it in plan[sc["id"]]:
            o = it[-1] if isinstance(it[-1], dict) else {}
            items.append(it[:-1] if o else it)
            opts.append(o)
        recs = []
        for it in items:
            if it[0] == "v":
                src = sources[it[1]]
                sh = cat[it[1]]["shots"][it[2]]
                off = it[3] if len(it) > 3 else 0.0
                recs.append({"type": "video", "src": it[1], "idx": it[2], "ss": round(sh["start"] + off + MARGIN, 3),
                             "cap": sh["dur"] - off - 2 * MARGIN, "tag": src.get("label", it[1]), "film": src["file"],
                             "w": cat[it[1]]["w"], "h": cat[it[1]]["h"], "crop": src.get("crop", "")})
            elif it[0] == "m":
                mi = modern_info(it[1])
                recs.append({"type": "video", "src": "modern", "file": it[1], "ss": it[2],
                             "cap": min(9.0, mi["duration"] - it[2] - 0.3), "tag": modern_label(it[1]),
                             "film": "commons/" + it[1], "w": mi["w"], "h": mi["h"], "crop": ""})
            elif it[0] == "p":
                recs.append({"type": "photo", "key": it[1], "cap": 4.5, "tag": label_for(photos.get(it[1]), it[1])})
            elif it[0] == "c":
                recs.append({"type": "card", "line1": it[1], "line2": it[2] if len(it) > 2 else "", "cap": 8.0})
            else:
                sys.exit(f"{sc['id']}: unknown item type {it[0]!r}")
        for r, o in zip(recs, opts):
            for key in ("overlay", "bw", "dissolve"):
                if key in o:
                    r[key] = o[key]
            if r["type"] == "video" and r.get("src") == "modern":
                r["grade"] = "bw" if r.get("bw") else "natural"

        # Fixed durations first, then share the rest equally, capped by each shot's length.
        fixed = {k: o["d"] for k, o in enumerate(opts) if "d" in o}
        alloc, remaining, open_ = [0.0] * len(recs), D, set(range(len(recs)))
        for k, d in fixed.items():
            recs[k]["cap"] = max(recs[k]["cap"], d)
            alloc[k] = d
            remaining -= d
            open_.discard(k)
        if not open_ and fixed:
            scale = D / sum(alloc)
            alloc = [a * scale for a in alloc]
            remaining = 0
        while open_ and remaining > 1e-6:
            share, done = remaining / len(open_), set()
            for i in list(open_):
                room = recs[i]["cap"] - alloc[i]
                if room <= share + 1e-9:
                    alloc[i] += room
                    remaining -= room
                    done.add(i)
            if not done:
                for i in open_:
                    alloc[i] += share
                remaining = 0
            open_ -= done
        if remaining > 1e-3:
            warn.append(f"{sc['id']}: short by {remaining:.1f}s (not enough footage; last shot extended)")
            alloc[-1] += remaining
        for k, (r, a) in enumerate(zip(recs, alloc)):
            if a < MINDUR:
                warn.append(f"{sc['id']}#{k}: only {a:.1f}s")
            r.update({"scene": sc["id"], "n": k, "dur": round(a, 3)})
            r.pop("cap")
            out.append(r)

    t = 0.0
    for r in out:
        r["start"] = round(t, 3)
        t += r["dur"]
    for i, r in enumerate(out):
        if r.get("dissolve") and i > 0:
            out[i - 1]["extend"] = r["dissolve"]
    (work / "edit.json").write_text(json.dumps({"total": total, "shots": out}, indent=1))

    # Licence ledger: one line per asset actually used.
    ledger, unlicensed = [], set()
    for r in out:
        if r["type"] == "video" and r.get("src") != "modern":
            meta = sources[r["src"]]
            entry = {"kind": "video", "source": meta.get("label", r["src"]), "url": meta.get("url"),
                     "licence": meta.get("licence"), "in": r["ss"]}
        elif r["type"] == "video":
            meta = modern.get(r["file"], {})
            entry = {"kind": "video", "source": r["tag"], "file": r["file"], "url": meta.get("url"),
                     "licence": meta.get("licence")}
        elif r["type"] == "photo":
            meta = photos.get(r["key"])
            meta = meta if isinstance(meta, dict) else {}
            entry = {"kind": "photo", "source": r["tag"], "url": meta.get("url"), "licence": meta.get("licence")}
        else:
            continue
        entry.update({"scene": r["scene"], "n": r["n"], "dur": r["dur"]})
        if not entry["licence"] or not entry["url"]:
            unlicensed.add(entry["source"])
        ledger.append(entry)
    music = p.get("music")
    if music and (not music.get("licence") or not music.get("url")):
        unlicensed.add("music: " + music.get("title", "?"))
    (work / "licence-ledger.json").write_text(json.dumps({"clips": ledger, "music": music}, indent=1))

    vid = sum(r["dur"] for r in out if r["type"] == "video")
    pho = sum(r["dur"] for r in out if r["type"] == "photo")
    car = sum(r["dur"] for r in out if r["type"] == "card")
    share = 100 * vid / t
    print(f"{len(out)} shots | video {vid:.0f}s ({share:.0f}%) | photos {pho:.0f}s ({100 * pho / t:.0f}%) | "
          f"cards {car:.0f}s ({100 * car / t:.0f}%) | cuts/min {len(out) / (t / 60):.1f}")
    print(f"VIDEO SHARE {'OK' if share >= target else 'LOW'}: {share:.0f}% (target {target:.0f}%, flexible)")
    for u in sorted(unlicensed):
        warn.append(f"no licence or link recorded for: {u}")
    print("\n".join(warn) or "no warnings")


if __name__ == "__main__":
    main()
