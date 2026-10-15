---
name: learn-from-feedback
description: Turn feedback on a video into fixes for that video, approved lessons for its channel or for all channels, and suggested engine improvements.
---
Read channels/<c>/videos/<v>/feedback.txt (or the user's message).

1. **Fix this video** where the comment is specific to it (a shot, a word, a fact).
2. **Sort** each comment: pacing, shot-match, voice, facts, music, captions, hook, structure, images.
3. **Propose lessons** in plain words and ask about each one: keep it for this channel, for all
   channels, or not at all. Never save a lesson without approval.
   - This channel -> .engine/channels/<c>/learned-style.md
   - All channels -> .engine/learned-global.md
4. **Engine improvements.** If the fix needed a change to a pipeline step or skill, record it in
   .engine/suggested-improvements.md (what, why, which file). Tell the user they can send that file to
   whoever maintains their Video Studio, so everyone gets the improvement through `update`.
5. Track rejected shots and review time per video, so improvement can be measured.
