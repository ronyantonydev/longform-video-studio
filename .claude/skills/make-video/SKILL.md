---
name: make-video
description: Make a long-form documentary video from videos/<name>/brief.txt. Use when the user says "make the video in <name>".
---
Read CLAUDE.md, .engine/learned-style.md, .engine/channel-profile.json, and the brief first.
To start a new video: `npm run video -- new <name>`. Check files with `npm run video -- check <name>`
after writing research.json and script.json in .engine/work/<name>/; fix every problem it lists.
Every paid call goes through the Ledger in .engine/src/budget.mjs (authorize, then charge or release).
Record free items with recordFree so cost.txt shows them. Write cost.txt with `npm run video -- cost <name>`.
Steps, saving state in videos/<name>/status.txt after each:
1. Research: web search; 20-40 facts each with a source URL -> work/<name>/research.json.
2. Script in the channel style: hook, chapters, payoff; about 250 scenes (narration, visual note, keywords).
3. STOP 1: show the script and its sources in plain words; wait for OK.
4. Voiceover (VOICE_PROVIDER), then Parakeet word timings -> scene lengths and captions.
5. Per scene: free video -> free photo -> generated image. Log each asset in the ledger.
   Keep real motion high; do not let stills dominate. Music and effects from .engine/sources.md.
6. STOP 2: contact sheet per chapter; wait for OK.
7. Render per chapter with HyperFrames, join with FFmpeg, normalise loudness.
8. STOP 3: final review; swap shots by scene number if asked.
9. Write video.mp4, thumbnail.png, youtube-description.txt (title, chapters, credits), captions.srt, cost.txt (total and breakdown), and update .engine/monthly-costs.txt.
Check the cost cap before each paid call. Report problems in plain words.
