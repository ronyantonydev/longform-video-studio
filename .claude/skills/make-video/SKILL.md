---
name: make-video
description: Make a documentary video for one channel, footage first. Use when the user says "make a video for <channel> about <topic>" (pilot or full length).
---
Run every step through `npm run video -- step <name> <c> <v>` (list: `npm run video -- steps`).
Work files live in .engine/work/<c>/<v>/ ("work"); outputs in channels/<c>/videos/<v>/.
Keep status.txt current with plain words.

**Plan usage readings.** At the start, at each STOP, and at the end, read the plan's usage (in the
Claude desktop app: the get_usage tool, window "Weekly · all models") and record it with
`npm run video -- usage <c> <v> <percentUsed> <resetsAt>`. If plan limits can't be read here, skip it;
cost.txt then shows tokens only. Never improvise a pipeline script that already exists;
if a step is missing or wrong, fix it in .engine/pipeline/, test it, and note it in
.engine/suggested-improvements.md.

1. **Start.** `npm run video -- new <c> <v>`; write topic, length and notes into brief.txt.
   Read CLAUDE.md, channels/<c>/channel-rules.md, .engine/channels/<c>/channel-profile.json,
   .engine/channels/<c>/learned-style.md and .engine/learned-global.md. Follow all of them.
2. **Research.** Web search (Chrome for pages that need it). 20-40 facts, each with source URLs ->
   work/research.json. Where sources disagree, keep both and say so.
3. **Script.** Channel structure: hook, chapters, payoff. Scenes with narration, visual note,
   keywords (concrete, filmable: "dust storm farm 1930s", not "hardship"), cited fact ids ->
   work/script.json. Run `npm run video -- check <c> <v>` until OK.
4. **STOP: script.** Write script-for-review.md in the video folder (plain words, sources listed) and
   wait for the user's OK.
5. **Voice.** steps `voice`, `join`, `captions`.
6. **Footage first** (target: channel's video share, default 70%, flexible):
   - Find archive films: search the web for public-domain films on the topic (National Archives,
     Internet Archive including Prelinger, USDA, NPS, NOAA, NASA, USGS, DVIDS). For Internet Archive
     items run step `ia <ids>` and keep only items whose rights say public domain / US government.
   - step `find` (Wikimedia Commons, images and video) and step `sheets` to look at candidates.
   - Write work/sources.json (url, dest) for every chosen film/clip/photo; step `fetch`.
   - For each long film: step `catalog <file in src/> <name>`, then look at the contact sheets.
   - Write work/plan.json (format in .engine/pipeline/plan_shots.py): sources with url and licence,
     every scene's shots, music with url and licence. Real video first; photos only where no video
     fits; Gemini images only as a last resort, logged like any asset.
   - step `plan`. If VIDEO SHARE is LOW, search more before accepting; if still low, explain why in
     the report. Fix every "no licence or link" warning.
7. **Edit.** steps `fit`, `build`. If the channel lists "look", STOP and show contact sheets.
8. **Finish.** step `finish` (render, music ducked under the voice, loudness -14 LUFS, thumbnail),
   then step `qa`. Fix any FAIL. Look at frames around any WARN.
9. **STOP: final.** Show the video; swap shots by editing plan.json and re-running `plan`, `fit`,
   `build`, `finish`, `qa`.
10. **Deliver.** youtube-description.txt (title, chapter timestamps, every credit from
    work/licence-ledger.json), take the last usage reading, then `npm run video -- cost <c> <v>`
    (adds Claude's tokens and the video's share of the plan). Report in plain words:
    video share, clips per source, scenes without real footage, cost, what to improve.

**Corrections after a review.** Edit work/plan.json or the script, then re-run only what changed:
- swap, add or remove a shot, change a shot's length (`d`), an on-screen line (`overlay`), or the
  music (`music.volume`): `plan`, `fit`, `build`, `finish`, `qa`;
- change narration or fix a fact: update research.json and script.json, run `check`, then `voice`,
  `join`, `captions`, re-plan any scene whose length changed, then `plan` through `qa`;
- captions come from the script text, so fix a caption by fixing the script line.
Always say which timestamps changed, and keep youtube-description.txt credits in step with the
licence ledger after any change to the clips.

Paid tools (Higgsfield, fal, ElevenLabs, OpenAI) only if the channel's rules allow them and the key
exists. Every paid call: Ledger.authorize first, then charge or release. Free items: recordFree.
