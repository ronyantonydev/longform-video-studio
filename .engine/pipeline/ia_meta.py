#!/usr/bin/env python3
"""Fetch Internet Archive metadata for item ids: rights fields and downloadable video files.
Use it to confirm an item is public domain before downloading. Results are added to the output file.
Usage: ia_meta.py <ia_meta.json> <item_id> [item_id ...]"""
import json
import pathlib
import sys
import time

from common import http_json

FORMATS = ("mpeg4", "h.264", "512kb mpeg4", "h.264 hd", "ogg video", "matroska", "mpeg2", "quicktime")


def main():
    out, ids = pathlib.Path(sys.argv[1]), sys.argv[2:]
    res = json.loads(out.read_text()) if out.exists() else {}
    for i in ids:
        try:
            d = http_json(f"https://archive.org/metadata/{i}", timeout=60)
        except RuntimeError as e:
            print("FAILED", i, e, file=sys.stderr)
            continue
        m = d.get("metadata", {})
        desc = m.get("description")
        vids = [{"name": f["name"], "format": f.get("format"), "size": int(f.get("size", 0) or 0),
                 "w": f.get("width"), "h": f.get("height"), "len": f.get("length")}
                for f in d.get("files", []) if f.get("format", "").lower() in FORMATS]
        res[i] = {"title": m.get("title"), "year": m.get("year") or m.get("date"), "creator": m.get("creator"),
                  "licenseurl": m.get("licenseurl"), "rights": m.get("rights"),
                  "copyright_status": m.get("possible-copyright-status"),
                  "copyright_region": m.get("copyright-region"), "collection": m.get("collection"),
                  "description": (desc if isinstance(desc, str) else str(desc))[:300],
                  "runtime": m.get("runtime"), "page": f"https://archive.org/details/{i}", "files": vids}
        r = res[i]
        print(f"== {i}: {r['title']} ({r['year']}) status={r['copyright_status']} "
              f"rights={str(r['rights'])[:80]} licence={r['licenseurl']}")
        for f in vids:
            print("    ", f["format"], f["name"][:60], f["size"] // 1000000, "MB", f["w"], "x", f["h"], f["len"])
        time.sleep(1)
    out.write_text(json.dumps(res, indent=1))


if __name__ == "__main__":
    main()
