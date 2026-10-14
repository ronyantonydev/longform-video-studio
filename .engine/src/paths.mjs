// Every path the engine touches, in one place.
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const ROOT = process.env.VIDEO_ROOT
  ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const ENGINE = path.join(ROOT, '.engine');

export const paths = {
  root: ROOT,
  settings: path.join(ENGINE, 'settings', 'settings.env'),
  templates: path.join(ENGINE, 'templates'),
  monthlyCosts: path.join(ENGINE, 'monthly-costs.txt'),
  learnedStyle: path.join(ENGINE, 'learned-style.md'),
  video: (name) => path.join(ROOT, 'videos', name),
  work: (name) => path.join(ENGINE, 'work', name),
};

// Project names become folder names, so keep them plain.
export function checkName(name) {
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(name ?? '')) {
    throw new Error(`"${name}" is not a valid video name. Use lowercase letters, numbers and dashes, e.g. israel-desert-farming.`);
  }
  return name;
}
