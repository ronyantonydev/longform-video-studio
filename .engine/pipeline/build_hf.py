#!/usr/bin/env python3
"""Build the HyperFrames page from edit.json: video clips (with an optional cross-dissolve), photos with a slow zoom,
title cards, period-style text overlays on moving footage, and captions. No source credits on screen (they live in
the description). Creates the HyperFrames project files on first run.
Usage: build_hf.py <work_dir> <captions.srt> <hf_dir>"""
import json, sys, shutil, html, random, pathlib
from PIL import Image, ImageFilter, ImageEnhance
from common import http_get
HF_VERSION = "0.8.159"
GSAP_URL = "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"
work, srt, hf = (pathlib.Path(a) for a in sys.argv[1:4])
W, H, FPS = 1280, 720, 24
edit = json.loads((work / "edit.json").read_text()); TOTAL = edit["total"]; shots = edit["shots"]
(hf / "assets").mkdir(parents=True, exist_ok=True)
if not (hf / "hyperframes.json").exists():
    (hf / "hyperframes.json").write_text(json.dumps({"$schema": "https://hyperframes.heygen.com/schema/hyperframes.json",
        "paths": {"blocks": "compositions", "components": "compositions/components", "assets": "assets"},
        "media": {"autoProxy": True}}, indent=2))
    (hf / "package.json").write_text(json.dumps({"name": "hf", "private": True, "type": "module", "scripts": {
        "check": f"npx --yes hyperframes@{HF_VERSION} check", "render": f"npx --yes hyperframes@{HF_VERSION} render"}}, indent=2))
if not (hf / "vendor" / "gsap.min.js").exists():
    (hf / "vendor").mkdir(exist_ok=True); (hf / "vendor" / "gsap.min.js").write_bytes(http_get(GSAP_URL))
random.seed(1935)  # fixed seed: the grain tile is identical on every build
g = Image.new("LA", (256, 256))
g.putdata([(random.randint(0, 255), random.randint(14, 34)) for _ in range(256 * 256)]); g.save(hf / "assets" / "grain.png")
def esc(t): return html.escape(t, quote=True)
def r3(x): return round(x, 3)
els, tws = [], []
for s in shots:
    cid = f"s-{s['scene']}-{s['n']}"; t0, d = s["start"], s["dur"] - 0.001
    if s["type"] == "video":
        dd = d + s.get("extend", 0.0)
        track = 2 if s.get("dissolve") else 1
        v = f'<video id="{cid}" data-start="{r3(t0)}" data-duration="{r3(dd)}" data-track-index="{track}" src="assets/v_{s["scene"]}_{s["n"]}.mp4" muted playsinline></video>'
        if s.get("dissolve"):
            els.append(f'<div id="{cid}-wrap" class="dz">{v}</div>')
            tws.append(f'tl.fromTo("#{cid}-wrap",{{opacity:0}},{{opacity:1,duration:{s["dissolve"]},ease:"sine.inOut"}},{r3(t0)});')
        else:
            els.append(v)
    elif s["type"] == "photo":
        base = f'id="{cid}" data-start="{r3(t0)}" data-duration="{r3(d)}" data-track-index="1"'
        src = work / "photos" / f"{s['key']}.jpg"; name = f"{s['key']}.jpg"; shutil.copy(src, hf / "assets" / name)
        im = Image.open(src).convert("RGB"); asp = im.width / im.height; cover = asp >= 1.5; bg = ""
        if not cover:
            bgn = f"bg_{name}"; ImageEnhance.Brightness(im.resize((W, H)).filter(ImageFilter.GaussianBlur(26))).enhance(0.5).save(hf / "assets" / bgn, quality=82)
            bg = f'<img class="bg" src="assets/{bgn}" alt="">'
        fid = f"{cid}-img"
        els.append(f'<div class="clip shot" {base}><div class="in">{bg}<img id="{fid}" class="fg {"cover" if cover else "contain"}" src="assets/{name}" alt=""></div></div>')
        z0, z1 = (1.0, 1.07) if s["n"] % 2 == 0 else (1.07, 1.0)
        tws.append(f'tl.fromTo("#{fid}",{{scale:{z0}}},{{scale:{z1},duration:{r3(d)},ease:"none"}},{r3(t0)});')
    elif s["type"] == "card":
        els.append(f'<div class="clip card" id="{cid}" data-start="{r3(t0)}" data-duration="{r3(d)}" data-track-index="1">'
                   f'<div class="txt"><div class="rule"></div><div class="h">{esc(s["line1"])}</div><div class="sub">{esc(s.get("line2", ""))}</div></div></div>')
    if s.get("overlay"):
        l1, l2 = s["overlay"]; big = " big" if len(l1) <= 8 else ""
        els.append(f'<div class="clip ov" id="{cid}-ov" data-start="{r3(t0)}" data-duration="{r3(d)}" data-track-index="5">'
                   f'<div class="ovin" id="{cid}-ovin"><div class="dim"></div><div class="grad"></div><div class="vig"></div><div class="grain"></div>'
                   f'<div class="txt"><div class="rule"></div><div class="h{big}">{esc(l1)}</div><div class="sub">{esc(l2)}</div></div></div></div>')
        tws.append(f'tl.fromTo("#{cid}-ovin",{{opacity:0}},{{opacity:1,duration:0.55,ease:"power1.out"}},{r3(t0 + 0.15)});')
        tws.append(f'tl.to("#{cid}-ovin",{{opacity:0,duration:0.55,ease:"power1.in"}},{r3(t0 + d - 0.6)});')
def ts(x):
    h, m, rest = x.split(":"); sec, ms = rest.split(","); return int(h) * 3600 + int(m) * 60 + int(sec) + int(ms) / 1000
caps = []
for blk in srt.read_text().strip().split("\n\n"):
    ln = blk.split("\n"); a, b = ln[1].split(" --> "); caps.append((ts(a), ts(b), " ".join(ln[2:])))
for i, (a, b, t) in enumerate(caps):
    els.append(f'<div class="clip cap" id="cap-{i}" data-start="{r3(a)}" data-duration="{r3(b - a - 0.001)}" data-track-index="3"><span>{esc(t)}</span></div>')
SERIF = '"Baskerville",Georgia,"Times New Roman",serif'
page = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width={W}, height={H}" />
<script src="vendor/gsap.min.js"></script>
<style>
@font-face{{font-family:"Baskerville";font-weight:400;font-style:normal;src:local("Baskerville"),local("Baskerville-Regular")}}
@font-face{{font-family:"Baskerville";font-weight:600;font-style:normal;src:local("Baskerville SemiBold"),local("Baskerville-SemiBold")}}
@font-face{{font-family:"Baskerville";font-weight:400;font-style:italic;src:local("Baskerville Italic"),local("Baskerville-Italic")}}
*{{margin:0;padding:0;box-sizing:border-box}}
html,body{{margin:0;width:{W}px;height:{H}px;overflow:hidden;background:#0b0d0f}}
#root{{position:relative;width:{W}px;height:{H}px;overflow:hidden;background:#0b0d0f;font-family:"Helvetica Neue",Helvetica,Arial,sans-serif}}
.shot{{position:absolute;left:0;top:0;width:{W}px;height:{H}px;overflow:hidden}}
.shot .in{{position:absolute;left:0;top:0;width:{W}px;height:{H}px}}
.bg,.fg{{position:absolute;left:0;top:0;width:{W}px;height:{H}px;display:block}}
.fg.cover{{object-fit:cover}} .fg.contain{{object-fit:contain}}
video{{position:absolute;left:0;top:0;width:{W}px;height:{H}px;object-fit:cover}}
.dz{{position:absolute;left:0;top:0;width:{W}px;height:{H}px}}
.ov{{position:absolute;left:0;top:0;width:{W}px;height:{H}px;overflow:hidden}}
.ovin{{position:absolute;left:0;top:0;width:{W}px;height:{H}px;opacity:0}}
.ovin .dim{{position:absolute;inset:0;background:rgba(0,0,0,.08)}}
.ovin .grad{{position:absolute;inset:0;background:linear-gradient(90deg,rgba(6,7,5,.80) 0%,rgba(6,7,5,.58) 30%,rgba(6,7,5,.20) 52%,rgba(6,7,5,0) 68%)}}
.ovin .vig{{position:absolute;inset:0;background:radial-gradient(ellipse at 62% 50%,rgba(0,0,0,0) 58%,rgba(0,0,0,.24) 100%)}}
.ovin .grain{{position:absolute;inset:0;background:url(assets/grain.png);background-size:256px 256px;opacity:.07}}
.ovin .txt{{position:absolute;left:84px;top:0;width:540px;height:{H}px;display:flex;flex-direction:column;justify-content:center}}
.ovin .rule{{width:64px;height:2px;background:#C4A46A;margin-bottom:26px}}
.ovin .h{{font-family:{SERIF};font-weight:600;font-size:58px;line-height:1.08;color:#F2EFE6;letter-spacing:.2px;text-shadow:0 2px 10px rgba(0,0,0,.45)}}
.ovin .h.big{{font-size:118px;line-height:1.0}}
.ovin .sub{{font-family:{SERIF};font-style:italic;font-weight:400;font-size:31px;line-height:1.3;color:rgba(242,239,230,.92);margin-top:20px;text-shadow:0 2px 8px rgba(0,0,0,.45)}}
.card{{position:absolute;left:0;top:0;width:{W}px;height:{H}px;background:#0b0d0f;display:flex;align-items:center;justify-content:center;text-align:center}}
.card .txt{{max-width:900px}} .card .rule{{width:64px;height:2px;background:#C4A46A;margin:0 auto 26px}}
.card .h{{font-family:{SERIF};font-weight:600;font-size:64px;line-height:1.1;color:#F2EFE6}}
.card .sub{{font-family:{SERIF};font-style:italic;font-size:31px;line-height:1.3;color:rgba(242,239,230,.85);margin-top:18px}}
.cap{{position:absolute;left:0;top:{H-118}px;width:{W}px;height:84px;display:flex;align-items:center;justify-content:center;text-align:center}}
.cap span{{display:inline-block;max-width:1060px;padding:8px 22px;font-size:34px;font-weight:600;line-height:1.25;color:#fff;background:rgba(8,10,12,.74);border-radius:10px;text-shadow:0 2px 6px rgba(0,0,0,.7)}}
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="{r3(TOTAL)}" data-width="{W}" data-height="{H}" data-fps="{FPS}">
{chr(10).join(els)}
</div>
<script>
window.__timelines = window.__timelines || {{}};
const tl = gsap.timeline({{ paused: true }});
{chr(10).join(tws)}
window.__timelines["main"] = tl;
</script>
</body>
</html>'''
(hf / "index.html").write_text(page)
print(len(shots), "shots,", len(caps), "captions,", round(TOTAL, 1), "s;", sum(1 for s in shots if s.get("overlay")), "overlays")
