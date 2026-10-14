// Creating a video project, reading its brief, and plain-words status.
import fs from 'node:fs';
import path from 'node:path';
import { paths, checkName } from './paths.mjs';

export const STAGES = [
  'new', 'research', 'script', 'waiting-script-ok', 'voice', 'timing', 'sourcing',
  'waiting-look-ok', 'render', 'waiting-final-ok', 'done',
];

const SAY = {
  new: 'Ready to start.',
  research: 'Researching the topic.',
  script: 'Writing the script.',
  'waiting-script-ok': 'Waiting for your OK on the script.',
  voice: 'Recording the voice-over.',
  timing: 'Timing scenes and captions.',
  sourcing: 'Finding footage, images and music.',
  'waiting-look-ok': 'Waiting for your OK on how it looks.',
  render: 'Building the video.',
  'waiting-final-ok': 'Waiting for your OK on the final video.',
  done: 'Finished.',
};

export function initProject(name) {
  checkName(name);
  const video = paths.video(name);
  const work = paths.work(name);
  fs.mkdirSync(video, { recursive: true });
  fs.mkdirSync(work, { recursive: true });
  const brief = path.join(video, 'brief.txt');
  if (!fs.existsSync(brief)) fs.copyFileSync(path.join(paths.templates, 'brief.txt'), brief);
  const feedback = path.join(video, 'feedback.txt');
  if (!fs.existsSync(feedback)) fs.writeFileSync(feedback, '');
  if (!fs.existsSync(path.join(work, 'state.json'))) setStage(name, 'new');
  return { video, work };
}

export function readBrief(name) {
  const text = fs.readFileSync(path.join(paths.video(checkName(name)), 'brief.txt'), 'utf8');
  const field = (label) => text.match(new RegExp(`^${label}[^:\\n]*:[ \\t]*(.*)$`, 'mi'))?.[1].trim() || '';
  const budget = field('Budget');
  return {
    topic: field('Topic'),
    minutes: Number(field('Length')) || null,
    notes: field('Notes'),
    budgetUsd: budget ? Number(budget.replace(/[$\s]/g, '')) : undefined,
  };
}

export function getStage(name) {
  const f = path.join(paths.work(checkName(name)), 'state.json');
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')).stage : null;
}

export function setStage(name, stage, detail = '') {
  if (!STAGES.includes(stage)) throw new Error(`Unknown stage "${stage}"`);
  const work = paths.work(checkName(name));
  fs.mkdirSync(work, { recursive: true });
  fs.writeFileSync(
    path.join(work, 'state.json'),
    JSON.stringify({ stage, updatedAt: new Date().toISOString() }, null, 2),
  );
  const line = `${SAY[stage]}${detail ? ` ${detail}` : ''}\nLast update: ${new Date().toLocaleString()}\n`;
  fs.mkdirSync(paths.video(name), { recursive: true });
  fs.writeFileSync(path.join(paths.video(name), 'status.txt'), line);
}
