#!/bin/bash
cd "$(dirname "$0")"
echo "== Setup =="
missing=()
for t in git node ffmpeg; do command -v "$t" >/dev/null 2>&1 || missing+=("$t"); done
if [ ${#missing[@]} -gt 0 ]; then
  echo "Missing tools: ${missing[*]}"
  echo "Install with:  brew install ${missing[*]}"
fi
mkdir -p .engine/settings .engine/work .engine/channels channels
if [ ! -f .engine/settings/settings.env ]; then
  cp .engine/templates/settings.env.sample .engine/settings/settings.env
  chmod 600 .engine/settings/settings.env
  echo "Created .engine/settings/settings.env  - open it and fill in your keys."
fi
bash .engine/doctor.sh
echo "Done. Read START-HERE.txt next."
