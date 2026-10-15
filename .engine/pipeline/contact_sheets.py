#!/usr/bin/env python3
"""Download small previews of Commons candidates and build one numbered contact sheet per scene,
so Claude can look at the options and pick. Video candidates are labelled VID.
Usage: contact_sheets.py <script.json> <candidates.json> <out_dir>"""
import io
import json
import pathlib
import re
import sys
import time

from PIL import Image, ImageDraw

from common import http_get


def thumb(x, out):
    f = out / "thumbs" / (re.sub(r"[^A-Za-z0-9]+", "_", x["title"])[:80] + ".jpg")
    if f.exists():
        return f
    u = re.sub(r"/\d+px-", "/320px-", x["thumb"] or x["url"])
    try:
        Image.open(io.BytesIO(http_get(u, timeout=60))).convert("RGB").save(f, quality=80)
        time.sleep(1.6)
        return f
    except Exception as e:  # a missing preview is shown as a blank tile, not a crash
        print("no preview:", x["title"], str(e)[:80], file=sys.stderr)
        return None


def main():
    script = pathlib.Path(sys.argv[1])
    cand = json.loads(pathlib.Path(sys.argv[2]).read_text())
    out = pathlib.Path(sys.argv[3])
    (out / "thumbs").mkdir(parents=True, exist_ok=True)
    index = {}
    W, H, cols = 300, 200, 6
    for ch in json.loads(script.read_text())["chapters"]:
        for s in ch["scenes"]:
            seen, items = set(), []
            for k in s["keywords"]:
                for x in cand.get(k, []):
                    if x["title"] not in seen:
                        seen.add(x["title"])
                        items.append(x)
            # videos first: footage beats photos
            items.sort(key=lambda x: not (x["mime"] or "").startswith("video"))
            items = items[:30]
            index[s["id"]] = [x["title"] for x in items]
            rows = (len(items) + cols - 1) // cols or 1
            sheet = Image.new("RGB", (cols * W, rows * (H + 28)), "white")
            d = ImageDraw.Draw(sheet)
            for n, x in enumerate(items):
                f = thumb(x, out)
                r, c = divmod(n, cols)
                if f:
                    im = Image.open(f)
                    im.thumbnail((W - 6, H - 4))
                    sheet.paste(im, (c * W + 3, r * (H + 28) + 2))
                tag = ("VID " if (x["mime"] or "").startswith("video") else "") + str(n)
                d.text((c * W + 4, r * (H + 28) + H + 2), f"{tag} {x['title'][5:42]}", fill="black")
            sheet.save(out / f"{s['id']}.jpg", quality=85)
            print(s["id"], len(items), "candidates", flush=True)
    (out / "index.json").write_text(json.dumps(index, indent=1))


if __name__ == "__main__":
    main()
