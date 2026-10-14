// Channels, video projects, the brief, and plain-words status.
import fs from 'node:fs';
import path from 'node:path';
import { paths, checkName } from './paths.mjs';

// The look check is skipped unless the channel turns it on (approvals: script, look, final).
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

export function initChannel(channel) {
  checkName(channel, 'channel name');
  fs.mkdirSync(paths.styleExamples(channel), { recursive: true });
  fs.mkdirSync(path.join(paths.channel(channel), 'videos'), { recursive: true });
  fs.mkdirSync(paths.channelEngine(channel), { recursive: true });
  if (!fs.existsSync(paths.channelRules(channel))) {
    fs.copyFileSync(path.join(paths.templates, 'channel-rules.md'), paths.channelRules(channel));
  }
  return paths.channel(channel);
}

export function listChannels() {
  const dir = path.join(paths.root, 'channels');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
}

// "approvals: script, final" -> ['script', 'final']. Script and final can never be turned off.
export function readApprovals(channel) {
  const f = paths.channelRules(channel);
  const text = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
  const line = text.match(/^approvals:[ \t]*(.*)$/mi)?.[1] ?? '';
  const asked = line.toLowerCase().split(/[,\s]+/).filter(Boolean);
  return ['script', 'look', 'final'].filter((a) => a !== 'look' || asked.includes('look'));
}

export function initProject(channel, video) {
  checkName(channel, 'channel name');
  checkName(video, 'video name');
  if (!fs.existsSync(paths.channel(channel))) {
    throw new Error(`There is no channel called "${channel}". Set it up first.`);
  }
  const dir = paths.video(channel, video);
  const work = paths.work(channel, video);
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(work, { recursive: true });
  const brief = path.join(dir, 'brief.txt');
  if (!fs.existsSync(brief)) fs.copyFileSync(path.join(paths.templates, 'brief.txt'), brief);
  const feedback = path.join(dir, 'feedback.txt');
  if (!fs.existsSync(feedback)) fs.writeFileSync(feedback, '');
  if (!fs.existsSync(path.join(work, 'state.json'))) setStage(channel, video, 'new');
  return { video: dir, work };
}

export function readBrief(channel, video) {
  const text = fs.readFileSync(path.join(paths.video(channel, video), 'brief.txt'), 'utf8');
  const field = (label) => text.match(new RegExp(`^${label}[^:\\n]*:[ \\t]*(.*)$`, 'mi'))?.[1].trim() || '';
  const budget = field('Budget');
  return {
    topic: field('Topic'),
    minutes: Number(field('Length')) || null,
    notes: field('Notes'),
    budgetUsd: budget ? Number(budget.replace(/[$\s]/g, '')) : undefined,
  };
}

export function getStage(channel, video) {
  const f = path.join(paths.work(channel, video), 'state.json');
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')).stage : null;
}

export function setStage(channel, video, stage, detail = '') {
  if (!STAGES.includes(stage)) throw new Error(`Unknown stage "${stage}"`);
  const work = paths.work(channel, video);
  fs.mkdirSync(work, { recursive: true });
  fs.writeFileSync(
    path.join(work, 'state.json'),
    JSON.stringify({ stage, updatedAt: new Date().toISOString() }, null, 2),
  );
  const line = `${SAY[stage]}${detail ? ` ${detail}` : ''}\nLast update: ${new Date().toLocaleString()}\n`;
  fs.mkdirSync(paths.video(channel, video), { recursive: true });
  fs.writeFileSync(path.join(paths.video(channel, video), 'status.txt'), line);
}
