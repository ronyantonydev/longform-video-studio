---
name: analyse-style
description: Learn one channel's style from its style-examples videos. Use when the user says "learn the style of <channel>" or adds new examples.
---
For each video in channels/<c>/style-examples/:
- transcribe (Parakeet on a Mac, faster-whisper on Linux, both in .engine/.venv): hook length, chapters, words per minute, tone;
- FFmpeg scene detection: cuts per minute, average shot length;
- sample frames: mix of stock video, stills, generated images, maps; caption and title look;
  what generated images look like (realistic, illustrated, colours);
- FFmpeg loudness: music level under the voice.
Write .engine/channels/<c>/channel-profile.json, then fill channels/<c>/channel-rules.md in plain
words (structure, editing style, image style, preferred free sources, voice style, video share
target, paid tools allowed). Keep any line
the user already edited. Learn style only; never reuse footage from the examples.
