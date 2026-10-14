---
name: make-video
description: Make a long-form documentary video for one channel. Use when the user says "make a video for <channel> about <topic>".
---
1. `npm run video -- new <channel> <video>`; write the topic, length and notes into brief.txt.
2. Read CLAUDE.md, channels/<c>/channel-rules.md, .engine/channels/<c>/channel-profile.json and
   learned-style.md. Follow the channel's structure, editing style, image style, sources and voice.
3. Research: web search (Chrome for logged-in or script-heavy pages); 20-40 facts, each with a
   source URL -> .engine/work/<c>/<v>/research.json.
4. Script in the channel's style: hook, chapters, payoff; scenes with narration, visual note,
   keywords, cited fact ids -> script.json. Run `npm run video -- check <c> <v>` until OK.
5. STOP (script): show the script and its sources in plain words; wait for OK.
6. Voice-over with the channel's voice, then Parakeet word timings -> scene lengths, captions.srt.
7. Per scene, in the channel's source order: free video -> free photo -> generated image in the
   channel's image style. Log every asset in licence-ledger.json. Keep real motion high.
   Music and effects from .engine/sources.md. If the channel lists "look", STOP and show contact sheets.
8. Render per chapter with HyperFrames, join with FFmpeg, normalise loudness. Run quality checks.
9. STOP (final): show the video; swap shots by scene number if asked.
10. Write video.mp4, thumbnail.png, youtube-description.txt (title, chapters, credits),
    captions.srt, and `npm run video -- cost <c> <v>`.
Every paid call: Ledger.authorize, then charge or release. Record free items with recordFree.
