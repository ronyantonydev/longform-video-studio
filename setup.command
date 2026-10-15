#!/bin/bash
# One-time setup. Safe to run again: it only adds what is missing.
# Mac: double-click this file. Linux: run  bash setup.command
cd "$(dirname "$0")"
OS=$(uname -s)
echo "== Setup ($OS) =="

# 1. Tools the engine needs
need=()
command -v git >/dev/null 2>&1 || need+=(git)
command -v ffmpeg >/dev/null 2>&1 || need+=(ffmpeg)
command -v python3 >/dev/null 2>&1 || need+=(python3)
node_major=$(node --version 2>/dev/null | sed 's/^v\([0-9]*\).*/\1/')
[ "${node_major:-0}" -ge 22 ] 2>/dev/null || need+=("node 22+")
if [ ${#need[@]} -gt 0 ]; then
  echo "Missing: ${need[*]}"
  if [ "$OS" = Darwin ]; then
    echo "Install with:  brew install git ffmpeg python node"
  else
    echo "Install with:  sudo apt install git ffmpeg python3 python3-venv curl"
    echo "Node 22:       https://nodejs.org (or: curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash - && sudo apt install nodejs)"
  fi
fi

# 2. Folders and the private settings file
mkdir -p .engine/settings .engine/work/models .engine/channels channels
if [ ! -f .engine/settings/settings.env ]; then
  cp .engine/templates/settings.env.sample .engine/settings/settings.env
  chmod 600 .engine/settings/settings.env
  echo "Created .engine/settings/settings.env  - add your keys there (never in the chat)."
  # Voice rule: Kokoro on a Mac, the Google voice everywhere else.
  if [ "$OS" != Darwin ]; then
    sed -i.bak 's/^VOICE_PROVIDER=.*/VOICE_PROVIDER=google/' .engine/settings/settings.env && rm -f .engine/settings/settings.env.bak
  fi
fi

# 3. Python tools (voice, captions, footage search, editing) in a private environment
if command -v python3 >/dev/null 2>&1; then
  [ -d .engine/.venv ] || python3 -m venv .engine/.venv
  .engine/.venv/bin/pip install -q --upgrade pip
  .engine/.venv/bin/pip install -q -r .engine/pipeline/requirements.txt && echo "Python tools installed."
fi

# 4. Kokoro voice files (free local voice, about 350 MB, downloaded once)
K=https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0
for f in kokoro-v1.0.onnx voices-v1.0.bin; do
  if [ ! -s ".engine/work/models/$f" ]; then
    echo "Downloading $f ..."
    curl -fL --retry 5 -o ".engine/work/models/$f" "$K/$f" || echo "Could not download $f; run setup again later."
  fi
done

bash .engine/doctor.sh
echo "Done. Read START-HERE.txt next."
