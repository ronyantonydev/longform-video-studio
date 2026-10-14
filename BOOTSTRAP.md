# Video Studio: first-time setup

> **For the person:** put this file in an empty folder, open that folder in the
> Claude desktop app (Code tab), and send this message:
>
> ```text
> Read BOOTSTRAP.md and set me up, step by step. I'm not technical.
> ```
>
> Claude does the work and tells you when it needs you. You only create
> accounts, paste keys into one file, and say "OK".

---

## Instructions for Claude

You are setting up **Longform Video Studio** for a non-technical person who
makes documentary videos for one or more YouTube channels.

**How to talk:** plain words, one step at a time, no code or jargon in your
messages. Say what you're doing in one line, do it, then say what happened.
When the person must act, give them a short numbered list and wait.

**Tools you may use:** the terminal, web search and fetch (on), and the
person's Chrome through Claude in Chrome (for opening signup pages and for
research on pages that need a login).

**Never:** create accounts, type passwords or API keys into anything, accept
terms or cookie banners, buy anything, or print, read aloud or commit a key.
The person does those. You may *open* pages for them.

**Repo:** `git@github.com:ronyantonydev/longform-video-studio.git`
(HTTPS: `https://github.com/ronyantonydev/longform-video-studio.git`, which
is public and works without a GitHub login.)

### Step 1: Check the computer
Check for: macOS on Apple silicon, Homebrew, git, Node 18+, FFmpeg (it must
actually run, not just be installed), and Python 3.10+.
- If something is missing, list it in plain words, ask once, then install
  with Homebrew (`brew install git node ffmpeg python`).
- If Homebrew itself is missing, send the person to https://brew.sh. Its
  install command needs their Mac password, so they run it themselves. Wait
  until they say it's done.
- If FFmpeg is installed but fails to run, try `brew reinstall ffmpeg`, then
  check again.

### Step 2: Get the project
- Clone the repo into a subfolder called `VideoStudio` inside this folder,
  using HTTPS. If `VideoStudio` already exists and is the repo, run
  `git pull --ff-only` instead.
- Run `VideoStudio/setup.command`. It creates the private settings file and
  prints what is missing.
- From now on, work inside `VideoStudio`. Read its `START-HERE.txt` and
  `CLAUDE.md` and follow them.

### Step 3: Connect Chrome
- Ask the person to install the **Claude in Chrome** extension from the
  Chrome Web Store on this Mac, and sign in to it with their Claude account.
- Then list the connected browsers. If more than one is listed, ask the
  person which one is theirs; pick only a browser on this Mac. Open a test
  tab to confirm it works, then close it.
- If Chrome can't be connected, carry on. Web research still works without
  it; you will just open signup links as plain links for them to click.

### Step 4: Free accounts and keys
Open each page in their Chrome, one at a time. For each one, tell the person:
create a free account or sign in, copy the key, and paste it into
`VideoStudio/.engine/settings/settings.env` after the matching name, then save.
Show them where that file is (Finder: Cmd+Shift+. shows hidden folders), and
remind them not to paste keys into the chat.

| Order | Key name | Page | Needed? |
|---|---|---|---|
| 1 | `PEXELS_API_KEY` | https://www.pexels.com/api/ | Yes: free stock video and photos |
| 2 | `PIXABAY_API_KEY` | https://pixabay.com/api/docs/ (key shown after login) | Yes: more stock, plus free music |
| 3 | `GOOGLE_AI_STUDIO_API_KEY` | https://aistudio.google.com/apikey | Only for the Google voice; skip if using Kokoro |
| 4 | `FREESOUND_API_KEY` | https://freesound.org/apiv2/apply | Optional: sound effects |

After each one, run `VideoStudio/.engine/doctor.sh`. It shows only OK or
MISSING by name, never the key. If a key is still MISSING, help them fix
where or how it was pasted.

Also ask them to sign in to **Google Flow** (https://flow.google.com/)
in the same Chrome, for free generated images. They sign in; you don't.

### Step 5: Local tools
Ask once, then install:
- **Parakeet** for word timings and captions: `pip3 install parakeet-mlx`
- **Kokoro** for a free local voice, if they chose it
- **HyperFrames** for editing and rendering, through `npx`
Run `doctor.sh` again and report in plain words.

### Step 6: Add their first channel
- Ask for the channel's name and YouTube link.
- Run `npm run video -- channel <short-name>` inside `VideoStudio`.
- Ask them to drop 3-5 videos whose style this channel should match into
  `channels/<short-name>/style-examples/`. Explain these teach style only and
  are never reused in new videos.
- Then follow the `analyse-style` skill. Show them `channel-rules.md` in plain
  words and ask if anything should change.

### Step 7: Proof video
- Ask for a topic and suggest a short proof first: about 4 minutes, free
  tools only.
- Follow the `make-video` skill. Stop for their OK on the script, and again
  on the final video.
- If a step of the engine is not built yet, build it, test it, and keep
  going. Engine code may be pushed to GitHub only by the repo owner; never
  push channel files, videos or keys, and don't push from a client's machine
  unless they ask.

### Step 8: Wrap up
Tell them, in plain words:
- where their finished video and `cost.txt` are;
- how to make the next one: `make a video for <channel> about <topic>`;
- how to give feedback: write in that video's `feedback.txt`, or just say it;
- how to update: double-click `update.command`.

### If something fails
Explain what happened in one or two plain sentences and what you will try
next. Never retry a paid step without checking the budget. If you are
stuck, say so and suggest the person contact whoever set up their system.
