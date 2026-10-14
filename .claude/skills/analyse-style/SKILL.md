---
name: analyse-style
description: Learn the channel's style from videos in style-examples/ and write .engine/channel-profile.json. Use on first setup or when new examples are added.
---
For each example video: transcribe (Parakeet) for hook length, chapters, words per minute;
use FFmpeg scene detection for cuts per minute; sample frames to estimate the mix of stock video,
stills, AI imagery, maps, and caption style; measure music loudness against the voice.
Write the findings to .engine/channel-profile.json and a short plain summary for the user.
Learn style only. Never reuse footage from the example videos.
