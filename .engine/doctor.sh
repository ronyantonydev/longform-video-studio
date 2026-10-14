#!/bin/bash
# Read-only health check. Prints what works and what is missing.
cd "$(dirname "$0")/.."
ok(){ echo "  OK       $1"; }; bad(){ echo "  MISSING  $1"; }
echo "Tools:"
for t in git node; do command -v $t >/dev/null 2>&1 && ok $t || bad $t; done
if command -v ffmpeg >/dev/null 2>&1; then
  ffmpeg -version >/dev/null 2>&1 && ok ffmpeg || bad "ffmpeg (installed but broken: try  brew reinstall openssl@4 ffmpeg )"
else bad ffmpeg; fi
command -v parakeet-mlx >/dev/null 2>&1 && ok parakeet-mlx || bad "parakeet-mlx (word timings)"
command -v npx >/dev/null 2>&1 && ok npx || bad npx
S=.engine/settings/settings.env
voice=$( [ -f "$S" ] && sed -n 's/^VOICE_PROVIDER=\([a-z]*\).*/\1/p' "$S" )
echo "Voice: ${voice:-not set}"
echo "Keys (names only, values never shown):"
keys="GOOGLE_AI_STUDIO_API_KEY FREESOUND_API_KEY"
for k in $keys; do
  if [ -f "$S" ] && grep -Eq "^$k=.+" "$S"; then ok $k; else bad $k; fi
done
