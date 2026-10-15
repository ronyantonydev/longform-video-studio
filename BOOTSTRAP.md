# Video Studio: first-time setup

> **For the person:** make an empty folder, open it in Claude (Mac: the Claude
> desktop app, Code tab; Linux: run `claude` in a terminal inside the folder),
> and send this message:
>
> ```text
> Read https://raw.githubusercontent.com/ronyantonydev/longform-video-studio/main/BOOTSTRAP.md
> and set me up, step by step. I'm not technical.
> ```
>
> Claude does the work and tells you when it needs you. You only create
> accounts, paste keys into one file, and say "OK".

---

## Instructions for Claude

You are setting up **Longform Video Studio** for a non-technical person who
makes documentary videos for one or more YouTube channels, on a Mac (Apple
chip) or Linux.

**How to talk:** plain words, one step at a time, no code or jargon in your
messages. Say what you're doing in one line, do it, then say what happened.
When the person must act, give them a short numbered list and wait.

**Tools you may use:** the terminal, web search and fetch, and the person's
Chrome through Claude in Chrome (for opening signup pages and for research on
pages that need a login).

**Never:** create accounts, type passwords or API keys into anything, accept
terms or cookie banners, buy anything, or print, read aloud or commit a key.
The person does those. You may *open* pages for them.

**Repo:** `https://github.com/ronyantonydev/longform-video-studio.git` (public,
no GitHub login needed).

### Step 0: Settings that make runs smooth (the person does these)
- **Model: Claude Sonnet 5.5.** It is all this workflow needs (the pilot videos were made
  entirely on it). Mac desktop app: pick it in the model menu. Linux: type `/model` and choose it.
- **Web research on.** Claude Code has web search built in; the project's
  `.claude/settings.json` already allows web search and page reading without
  asking. Check it works by searching for anything small.
- **Fewer prompts (optional).** Explain the choice in one line each, and let
  them pick:
  - *Ask before actions* (default): safest; they approve each command.
  - *Bypass permissions*: no prompts during long runs. Mac desktop app: the
    permission-mode menu next to the message box. Linux terminal: start with
    `claude --dangerously-skip-permissions`. Only in this project folder.
  Even in bypass mode you still never do the things in **Never** above.

### Step 1: Check the computer
Check for git, Node **22 or newer** (HyperFrames needs it), FFmpeg (it must
actually run, not just be installed), Python 3.10+ and curl.
- **Mac:** install what's missing with Homebrew
  (`brew install git node ffmpeg python`) after asking once. If Homebrew is
  missing, send them to https://brew.sh; its installer needs their Mac
  password, so they run it themselves.
- **Linux:** `sudo apt install git ffmpeg python3 python3-venv curl`, and Node
  22 from https://nodejs.org or NodeSource. Commands with `sudo` need their
  password, so give them the exact line to run and wait.
- If FFmpeg is installed but fails to run, reinstall it, then check again.

### Step 2: Get the project
- Clone the repo into a subfolder called `VideoStudio`. If it already exists
  and is the repo, run `git pull --ff-only` instead.
- Run `bash VideoStudio/setup.command`. It creates the private settings file,
  installs the Python tools into a private environment, downloads the free
  Kokoro voice (about 350 MB, once) and runs the health check.
- From now on, work inside `VideoStudio`. Read its `START-HERE.txt` and
  `CLAUDE.md` and follow them.

### Step 3: Connect Chrome
- Ask the person to install the **Claude in Chrome** extension from the
  Chrome Web Store on this computer, and sign in to it with their Claude
  account.
- List the connected browsers. If more than one is listed, ask which one is
  theirs; pick only a browser on this computer. Open a test tab to confirm it
  works, then close it.
- If Chrome can't be connected, carry on. Web research still works without
  it; you will just give signup links as plain links for them to click.

### Step 4: Keys
Open each page in their Chrome, one at a time. For each one, tell the person:
create a free account or sign in, copy the key, and paste it into
`VideoStudio/.engine/settings/settings.env` after the matching name, then save.
Show them where that file is (Mac Finder: Cmd+Shift+. shows hidden folders),
and remind them never to paste keys into the chat. You must not open or read
that file yourself.

| Key name | Page | Needed? |
|---|---|---|
| `GOOGLE_AI_STUDIO_API_KEY` | https://aistudio.google.com/apikey | Yes: Gemini images (and the voice on Linux) |
| `FREESOUND_API_KEY` | https://freesound.org/apiv2/apply | Optional, free: sound effects |

**Optional paid tools.** Ask once: "Do you want to add any paid tools? You can
skip this; everything works free." Only if they say yes, open the page for the
ones they pick. Keys go in the same file; each channel must also allow paid
tools in its `channel-rules.md`, and the budget cap still applies.

| Key name | Tool | Used for |
|---|---|---|
| `HIGGSFIELD_API_KEY` | Higgsfield Cloud (https://cloud.higgsfield.ai) | AI video clips for key scenes |
| `FAL_KEY` | fal.ai (https://fal.ai/dashboard/keys) | AI images and video from many models |
| `ELEVENLABS_API_KEY` | ElevenLabs (https://elevenlabs.io/app/settings/api-keys) | Premium voice |
| `OPENAI_API_KEY` | OpenAI (https://platform.openai.com/api-keys) | Voice or images |

**Claude plan.** Ask which Claude plan they have and its monthly price (for example Max, $100).
They write it into settings.env as `CLAUDE_PLAN=` and `CLAUDE_PLAN_USD=`, so every video's cost.txt
shows that video's share of the plan.

After each key, run `bash VideoStudio/.engine/doctor.sh`. It shows only OK,
MISSING or optional by name, never the key.

**Voice:** don't ask. A Mac uses **Kokoro** (free, on the computer, no key);
Linux uses the **Google AI Studio voice** (key above). `setup.command` already
writes this into settings.env.

**Images:** generated images come from **Google Gemini** and are a last
resort; real footage and photos come first. Optionally ask them to sign in to
**Google Flow** (https://flow.google.com/) in the same Chrome as a backup
image source. They sign in; you don't.

### Step 5: Add their first channel
- Ask for the channel's name and YouTube link.
- Run `npm run video -- channel <short-name>` inside `VideoStudio`.
- Ask them to drop 3-5 videos whose style this channel should match into
  `channels/<short-name>/style-examples/`. These teach style only and are
  never reused in new videos.
- Follow the `analyse-style` skill. Show them `channel-rules.md` in plain
  words and ask if anything should change (budget, paid tools, video share).

### Step 6: Pilot video
- Ask for a topic and suggest a 5-minute pilot first, free tools only.
- Follow the `make-video` skill: footage first, steps run with
  `npm run video -- step`. Stop for their OK on the script, and again on the
  final video.
- If a pipeline step fails, fix it, test it, and note the fix in
  `.engine/suggested-improvements.md`. Never push from a client's machine
  unless they ask; never push channel files, videos or keys.

### Step 7: Wrap up
Tell them, in plain words:
- where their finished video and `cost.txt` are;
- how to make the next one: `make a video for <channel> about <topic>`;
- how to give feedback: write in that video's `feedback.txt`, or just say it.
  Lessons can apply to that channel or to all channels;
- how to update: say `update Video Studio` (Mac: or double-click
  `update.command`).

### If something fails
Explain what happened in one or two plain sentences and what you will try
next. Never retry a paid step without checking the budget. If you are stuck,
say so and suggest they send `.engine/suggested-improvements.md` and a short
description to whoever maintains their Video Studio.
