# Longform Video Studio

Make 20–30 minute narrated documentary videos for one or many YouTube
channels, using Claude Code and free tools by default. Each channel keeps its
own style, image look, sources, voice and budget. Built for people who never
want to open a terminal.

```text
"make a video for <channel> about <topic>"
  → research → script → ✋ OK? → voice → timing → footage → render → ✋ OK? → video.mp4
```

## Use it

1. Easiest: open an empty folder in Claude and say
   `Read https://raw.githubusercontent.com/ronyantonydev/longform-video-studio/main/BOOTSTRAP.md and set me up`.
   Or clone, then run `bash setup.command`.
2. In Claude Code: `set up channel my-channel`, drop 3–5 example videos into
   `channels/my-channel/style-examples/`, then `learn the style of my-channel`.
3. `make a video for my-channel about <topic>`.

Finished files appear in `channels/my-channel/videos/<topic>/`: `video.mp4`,
`thumbnail.png`, `youtube-description.txt`, `captions.srt` and `cost.txt`.

Double-click `update.command` to get the latest version. Channels, videos,
keys and learned style are never touched by updates.

## Rules it enforces

- **Free tools first.** Paid tools only where a channel opts in.
- **A budget cap per video**, checked before every paid call. An unknown price
  stops the run instead of being guessed.
- **Only free-licensed, public-domain, licensed or generated media.** Every
  asset is logged with its source and licence; credits go in the description.
- **Every fact in the script needs a source link.**
- **Two human approvals:** the script and the final video (a look check is
  optional per channel).
- **Feedback becomes channel lessons** only after you approve each one.

## Layout

```text
channels/<channel>/
  channel-rules.md      style, images, sources, voice, budget, approvals
  style-examples/       videos whose style to match (never committed)
  videos/<topic>/       brief, status, outputs, feedback (never committed)
.engine/                shared engine: code, templates, settings (keys stay local)
.claude/skills/         how Claude runs each step
```

## How a video is made

```text
research → script ✋ → voice (Kokoro) → timeline + captions
  → footage first: archive films (National Archives, Internet Archive, USDA, NPS ...),
    Wikimedia Commons video and photos, Gemini images only as a last resort
  → shot catalog → plan.json → edit (HyperFrames) → render, music, loudness → checks ✋
```

Each stage is one command: `npm run video -- steps` lists them. A real 4.7-minute
pilot came out 98% real archive footage, $0.

## Model

**Claude Sonnet 5.5 is all it needs.** Both pilot videos, from research to final render decisions,
ran entirely on Sonnet 5.5. Each video's `cost.txt` shows the tokens Claude used and that video's share
of your Claude plan.

## Optional paid tools

Higgsfield, fal.ai, ElevenLabs and OpenAI can be switched on per channel. Every
paid call is checked against the budget cap first; an unknown price stops the run.

## Development

```bash
npm test
```

Mac (Apple chip) or Linux. Node 22+, Python 3.10+, FFmpeg. Python packages are
listed in `.engine/pipeline/requirements.txt` and installed by `setup.command`.
