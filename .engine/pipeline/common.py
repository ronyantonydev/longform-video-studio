"""Shared helpers for the pipeline steps: polite HTTP with retries, and ffprobe."""
import json
import ssl
import subprocess
import time
import urllib.request

import certifi

UA = "LongformVideoStudio/0.2 (https://github.com/ronyantonydev/longform-video-studio; documentary tool)"
CTX = ssl.create_default_context(cafile=certifi.where())


def http_get(url, timeout=120, tries=5):
    """Fetch bytes. Backs off harder on 429 (rate limited). Raises after the last try."""
    err = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            return urllib.request.urlopen(req, timeout=timeout, context=CTX).read()
        except Exception as e:  # network errors are retried, then reported
            err = e
            time.sleep(12 * (i + 1) if getattr(e, "code", 0) == 429 else 2 * (i + 1))
    raise RuntimeError(f"request failed after {tries} tries: {url} ({type(err).__name__}: {str(err)[:120]})")


def http_json(url, **kw):
    return json.loads(http_get(url, **kw))


def probe(path):
    """Duration in seconds and size of the first video stream."""
    r = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=width,height",
         "-of", "json", str(path)], capture_output=True, text=True, check=True)
    j = json.loads(r.stdout)
    vs = [s for s in j.get("streams", []) if "width" in s]
    w, h = (vs[0]["width"], vs[0]["height"]) if vs else (0, 0)
    return float(j["format"]["duration"]), w, h
