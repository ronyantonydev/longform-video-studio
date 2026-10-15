// The pipeline steps, in order. Each maps to a Python script in .engine/pipeline/ with its paths filled in,
// so Claude runs every video the same way: `npm run video -- step <name> <channel> <video> [extra args]`.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { paths } from './paths.mjs';

// The code lives next to this file, wherever the videos are kept.
const ENGINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pipeline = (f) => path.join(ENGINE, 'pipeline', f);

export const STEPS = {
  voice: { what: 'Record the narration, one file per scene', args: (w) => [pipeline('voice.py'), `${w}/script.json`, `${w}/audio`] },
  join: { what: 'Join the scenes and write the timeline', args: (w) => [pipeline('join_voice.py'), `${w}/script.json`, `${w}/audio`] },
  captions: { what: 'Write captions.srt from the script and timeline', args: (w, v) => [pipeline('captions.py'), `${w}/script.json`, `${w}/audio/timeline.json`, `${v}/captions.srt`] },
  find: { what: 'Search Wikimedia Commons for every keyword', args: (w) => [pipeline('find_commons.py'), `${w}/script.json`, `${w}/candidates.json`] },
  sheets: { what: 'Contact sheets of the candidates, one per scene', args: (w) => [pipeline('contact_sheets.py'), `${w}/script.json`, `${w}/candidates.json`, `${w}/review`] },
  ia: { what: 'Check Internet Archive items (rights and files); pass item ids', args: (w) => [pipeline('ia_meta.py'), `${w}/ia_meta.json`] },
  fetch: { what: 'Download everything in sources.json', args: (w) => [pipeline('fetch.py'), w] },
  catalog: { what: 'Split one film into shots; pass <file in src/> <name>', args: (w, v, extra) => [pipeline('shot_catalog.py'), `${w}/src/${extra.shift() ?? ''}`, `${w}/cat/${extra.shift() ?? ''}`] },
  plan: { what: 'Build edit.json and the licence ledger from plan.json', args: (w) => [pipeline('plan_shots.py'), w] },
  fit: { what: 'Cut and fit every video shot', args: (w) => [pipeline('fit_clips.py'), w, `${w}/hf/assets`] },
  build: { what: 'Build the HyperFrames edit', args: (w, v) => [pipeline('build_hf.py'), w, `${v}/captions.srt`, `${w}/hf`] },
  finish: { what: 'Render, mix, join, thumbnail', args: (w, v) => [pipeline('finish.py'), w, v] },
  qa: { what: 'Automatic checks on the finished video', args: (w, v) => [pipeline('qa.py'), w, v] },
};

export function python() {
  const venv = path.join(ENGINE, '.venv', 'bin', 'python');
  return fs.existsSync(venv) ? venv : 'python3';
}

export function stepCommand(name, channel, video, extra = []) {
  const step = STEPS[name];
  if (!step) throw new Error(`Unknown step "${name}". Steps: ${Object.keys(STEPS).join(', ')}`);
  const rest = [...extra];
  const args = step.args(paths.work(channel, video), paths.video(channel, video), rest);
  return [python(), [...args, ...rest]];
}

export function runStep(name, channel, video, extra) {
  const [cmd, args] = stepCommand(name, channel, video, extra);
  fs.mkdirSync(paths.work(channel, video), { recursive: true });
  return spawnSync(cmd, args, { stdio: 'inherit' }).status ?? 1;
}
