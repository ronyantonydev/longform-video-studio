# Longform Video Studio

Make 25–30 minute narrated documentary videos from a plain-text brief, using
Claude Code. Built for people who never want to open a terminal.

```text
brief.txt → research → script → ✋ OK? → voice → timing → footage → ✋ OK? → render → ✋ OK? → video.mp4
```

## Use it

1. Clone into a folder named after your channel, then double-click `setup.command`.
2. Drop 3–5 videos whose style you want to match into `style-examples/`.
3. Open Claude Code in the folder and say: `start a new video called my-topic`.
4. Fill in `videos/my-topic/brief.txt`, then say: `make the video in my-topic`.

Finished files appear in `videos/my-topic/`: `video.mp4`, `thumbnail.png`,
`youtube-description.txt`, `captions.srt` and `cost.txt`.

Double-click `update.command` to get the latest version. Your videos, keys and
learned style are never touched by updates.

## Rules it enforces

- **A budget cap per video**, checked before every paid call. An unknown price
  stops the run instead of being guessed.
- **Only free-licensed, public-domain, licensed or generated media.** Every
  asset is logged with its source and licence; credits go in the description.
- **Every fact in the script needs a source link.**
- **Three human approvals:** script, look, final video.
- **Feedback becomes lessons** only after you approve each one.

## Layout

```text
style-examples/   videos whose style to match (yours, never committed)
videos/<name>/    brief, status, outputs, feedback (yours, never committed)
.engine/          the engine: code, templates, settings (keys stay local)
.claude/skills/   how Claude runs each step
```

## Status

Early. Done: project setup, budget guard and ledger, cost report, research and
script validation. Next: voice-over, Parakeet timing, footage sourcing,
HyperFrames render.

## Development

```bash
npm test
```

Node 18+. No dependencies.
