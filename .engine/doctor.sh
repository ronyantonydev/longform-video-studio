#!/bin/bash
# Read-only health check. Prints what works and what is missing. Never prints a key.
cd "$(dirname "$0")/.."
ok(){ echo "  OK        $1"; }; bad(){ echo "  MISSING   $1"; }; opt(){ echo "  optional  $1"; }

echo "Tools:"
command -v git >/dev/null 2>&1 && ok git || bad git
node_v=$(node --version 2>/dev/null)
if [ "$(echo "$node_v" | sed 's/^v\([0-9]*\).*/\1/')" -ge 22 ] 2>/dev/null; then ok "node $node_v"; else bad "node 22+ (found: ${node_v:-none}; HyperFrames needs 22)"; fi
if command -v ffmpeg >/dev/null 2>&1; then
  ffmpeg -version >/dev/null 2>&1 && ok ffmpeg || bad "ffmpeg (installed but broken: try  brew reinstall ffmpeg )"
else bad ffmpeg; fi
PY=.engine/.venv/bin/python
if [ -x "$PY" ] && "$PY" -c "import numpy, soundfile, PIL, certifi, kokoro_onnx" 2>/dev/null; then ok "python tools"; else bad "python tools (run setup again)"; fi
for f in kokoro-v1.0.onnx voices-v1.0.bin; do
  [ -s ".engine/work/models/$f" ] && ok "voice file $f" || bad "voice file $f (run setup again)"
done

S=.engine/settings/settings.env
has(){ [ -f "$S" ] && grep -Eq "^$1=.+" "$S"; }
voice=$( [ -f "$S" ] && sed -n 's/^VOICE_PROVIDER=\([a-z]*\).*/\1/p' "$S" )
echo "Voice: ${voice:-not set}"
echo "Keys (names only, values never shown):"
has GOOGLE_AI_STUDIO_API_KEY && ok GOOGLE_AI_STUDIO_API_KEY || bad "GOOGLE_AI_STUDIO_API_KEY (Gemini images$( [ "$voice" = google ] && echo ' and voice'))"
has FREESOUND_API_KEY && ok FREESOUND_API_KEY || opt "FREESOUND_API_KEY (sound effects)"
for k in HIGGSFIELD_API_KEY FAL_KEY ELEVENLABS_API_KEY OPENAI_API_KEY; do
  has $k && ok "$k (paid, optional)" || opt "$k (paid, off)"
done
