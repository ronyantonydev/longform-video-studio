#!/usr/bin/env python3
"""Search Wikimedia Commons for freely reusable images and videos, one search per script keyword.
Keeps only public domain, CC0 and CC BY (attribution only); drops NC / ND / SA and unclear licences.
Resumable: keywords already in the output file are skipped.
Usage: find_commons.py <script.json> <candidates.json>"""
import json
import pathlib
import re
import sys
import time
import urllib.parse

from common import http_json

API = "https://commons.wikimedia.org/w/api.php"
OK = re.compile(r"^(public domain|pd\b|cc0|cc[- ]by[- ]\d|cc[- ]by\b(?![- ]?(sa|nc|nd)))", re.I)
BAD = re.compile(r"(nc|nd|sa)\b|gfdl|fair use|non-?free|unknown|copyrighted", re.I)


def strip(h):
    return re.sub(r"<[^>]+>", "", h or "").strip()


def search(q, limit=20):
    params = {"action": "query", "format": "json", "generator": "search", "gsrnamespace": 6,
              "gsrsearch": q + " filetype:bitmap|video", "gsrlimit": limit, "prop": "imageinfo",
              "iiprop": "url|size|mime|extmetadata", "iiurlwidth": 1280}
    try:
        d = http_json(API + "?" + urllib.parse.urlencode(params), timeout=60)
    except RuntimeError as e:
        print("SEARCH FAILED:", q, e, file=sys.stderr)
        return []
    out = []
    for p in (d.get("query", {}).get("pages", {}) or {}).values():
        ii = (p.get("imageinfo") or [{}])[0]
        md = ii.get("extmetadata", {})
        lic = strip(md.get("LicenseShortName", {}).get("value"))
        if not lic or not OK.search(lic) or BAD.search(lic):
            continue
        if ii.get("mime", "").startswith("image/") and ii.get("width", 0) < 1280:
            continue
        out.append({"title": p["title"], "page": ii.get("descriptionurl"), "url": ii.get("url"),
                    "thumb": ii.get("thumburl"), "mime": ii.get("mime"), "w": ii.get("width"),
                    "h": ii.get("height"), "bytes": ii.get("size"), "license": lic,
                    "licenseUrl": strip(md.get("LicenseUrl", {}).get("value")),
                    "artist": strip(md.get("Artist", {}).get("value")),
                    "credit": strip(md.get("Credit", {}).get("value")),
                    "desc": strip(md.get("ImageDescription", {}).get("value"))[:200], "query": q})
    return out


def main():
    script, outp = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
    queries = []
    for c in json.loads(script.read_text())["chapters"]:
        for s in c["scenes"]:
            for k in s["keywords"]:
                if k not in queries:
                    queries.append(k)
    res = json.loads(outp.read_text()) if outp.exists() else {}
    for q in queries:
        if res.get(q):
            continue
        res[q] = search(q)
        videos = sum(1 for x in res[q] if (x["mime"] or "").startswith("video"))
        print(f"{len(res[q]):3d} found ({videos} video)  {q}", flush=True)
        outp.write_text(json.dumps(res, indent=1))  # save as we go, so a stop loses nothing
        time.sleep(1.5)
    outp.write_text(json.dumps(res, indent=1))


if __name__ == "__main__":
    main()
