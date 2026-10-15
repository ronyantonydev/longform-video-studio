// Every path the engine touches, in one place.
//
// channels/<channel>/                  visible: style-examples, channel-rules.md, videos/<topic>/
// .engine/channels/<channel>/          hidden:  channel-profile.json, learned-style.md, monthly-costs.txt
// .engine/work/<channel>/<topic>/      hidden:  research, script, audio, clips, ledger, renders
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const ROOT = process.env.VIDEO_ROOT
  ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const ENGINE = path.join(ROOT, '.engine');

export const paths = {
  root: ROOT,
  settings: path.join(ENGINE, 'settings', 'settings.env'),
  templates: path.join(ENGINE, 'templates'),
  channel: (c) => path.join(ROOT, 'channels', c),
  styleExamples: (c) => path.join(ROOT, 'channels', c, 'style-examples'),
  channelRules: (c) => path.join(ROOT, 'channels', c, 'channel-rules.md'),
  channelEngine: (c) => path.join(ENGINE, 'channels', c),
  globalLessons: path.join(ENGINE, 'learned-global.md'),
  suggestions: path.join(ENGINE, 'suggested-improvements.md'),
  monthlyCosts: (c) => path.join(ENGINE, 'channels', c, 'monthly-costs.txt'),
  video: (c, v) => path.join(ROOT, 'channels', c, 'videos', v),
  work: (c, v) => path.join(ENGINE, 'work', c, v),
};

// Channel and video names become folder names, so keep them plain.
export function checkName(name, kind = 'name') {
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(name ?? '')) {
    throw new Error(`"${name}" is not a valid ${kind}. Use lowercase letters, numbers and dashes, e.g. israel-desert-farming.`);
  }
  return name;
}
