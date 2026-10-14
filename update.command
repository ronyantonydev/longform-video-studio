#!/bin/bash
cd "$(dirname "$0")"
if git pull --ff-only; then echo "Up to date."; else echo "Could not update. Ask for help."; fi
