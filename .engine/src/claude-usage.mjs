// What Claude itself cost for one video, at the person's plan price.
//
// Two sources:
// 1. Plan meter. During a run Claude reads the plan's weekly usage (percent used + reset time) and
//    records it with `npm run video -- usage <c> <v> <percent> <resetsAt>`. The rise in percent across
//    the run, times the plan's weekly price, is this video's share of the plan.
// 2. Tokens. Claude Code keeps a log of every session on this computer; the tokens used between the
//    first and last mark, per model, are added up. Shown for information, never priced at API rates.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const WEEKS_PER_MONTH = 52 / 12;

export function readMarks(file) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')).marks : [];
}

export function addMark(file, { percent, resetsAt, at = new Date().toISOString() }) {
  const p = Number(percent);
  if (!Number.isFinite(p) || p < 0 || p > 100) throw new Error('Usage percent must be a number from 0 to 100.');
  if (Number.isNaN(Date.parse(resetsAt))) throw new Error('Reset time must be a date, e.g. 2026-10-20T19:00:00Z.');
  const marks = readMarks(file);
  marks.push({ at, percent: p, resetsAt });
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ marks }, null, 2));
  return marks;
}

// Percent of the weekly limit used across the marks. When the week resets between two marks,
// the later mark counts from zero; usage just before a reset that no mark caught is not counted.
export function weeklyPercentUsed(marks) {
  let used = 0;
  let resets = 0;
  for (let i = 1; i < marks.length; i += 1) {
    const a = marks[i - 1];
    const b = marks[i];
    if (b.resetsAt !== a.resetsAt) {
      used += b.percent;
      resets += 1;
    } else {
      used += Math.max(0, b.percent - a.percent);
    }
  }
  return { used, resets };
}

export function planShare(marks, monthlyUsd) {
  if (marks.length < 2 || !(monthlyUsd > 0)) return null;
  const { used, resets } = weeklyPercentUsed(marks);
  const weeklyUsd = monthlyUsd / WEEKS_PER_MONTH;
  return { percent: used, usd: (used / 100) * weeklyUsd, weeklyUsd, resets };
}

// Claude Code names each project's log folder after its path, with every other character a dash.
export function logDir(projectRoot, home = process.env.CLAUDE_CONFIG_DIR ?? path.join(os.homedir(), '.claude')) {
  return path.join(home, 'projects', projectRoot.replace(/[^A-Za-z0-9]/g, '-'));
}

function jsonlFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return jsonlFiles(p);
    return d.name.endsWith('.jsonl') ? [p] : [];
  });
}

// Tokens per model for messages between `from` and `to` (ISO times), from every session log.
export function tokensBetween(dir, from, to) {
  const lo = Date.parse(from);
  const hi = Date.parse(to);
  // One reply is logged on several lines (one per content block), each repeating its usage.
  // Keep only the last line per reply: it carries the final, complete counts.
  const replies = new Map();
  for (const f of jsonlFiles(dir)) {
    for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
      if (!line.includes('"usage"')) continue;
      let d;
      try { d = JSON.parse(line); } catch { continue; }
      const m = d.message;
      const t = Date.parse(d.timestamp);
      if (!m?.usage || !m.model || !(t >= lo && t <= hi)) continue;
      replies.set(m.id ?? d.uuid ?? `${f}:${replies.size}`, m);
    }
  }
  const byModel = {};
  for (const m of replies.values()) {
    const u = m.usage;
    const s = (byModel[m.model] ??= { input: 0, cacheWrite: 0, cacheRead: 0, output: 0 });
    s.input += u.input_tokens ?? 0;
    s.cacheWrite += u.cache_creation_input_tokens ?? 0;
    s.cacheRead += u.cache_read_input_tokens ?? 0;
    s.output += u.output_tokens ?? 0;
  }
  return byModel;
}

const MODEL_NAMES = {
  'claude-sonnet-5-5': 'Claude Sonnet 5.5',
  'claude-opus-5-5': 'Claude Opus 5.5',
  'claude-fable-5-1': 'Claude Fable 5.1',
  'claude-haiku-4-5-20251001': 'Claude Haiku 4.5',
};
export const modelName = (id) => MODEL_NAMES[id] ?? id;

export function tokenCount(n) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${Math.round(n / 1e3)}K`;
  return String(n);
}

// Plain-words lines for cost.txt.
export function claudeLines({ marks, monthlyUsd, plan, tokens }) {
  const lines = ['Claude (research, script, planning and editing decisions):'];
  const models = Object.entries(tokens ?? {});
  if (models.length) {
    for (const [id, s] of models) {
      lines.push(`  ${modelName(id)}: ${tokenCount(s.input + s.cacheWrite + s.cacheRead)} tokens read `
        + `(${tokenCount(s.cacheRead)} from cache), ${tokenCount(s.output)} written`);
    }
  } else {
    lines.push('  Token counts: not available on this computer');
  }
  const share = planShare(marks, monthlyUsd);
  if (share) {
    lines.push(`  Share of your ${plan ? `${plan} ` : ''}plan: $${share.usd.toFixed(2)} `
      + `(${share.percent}% of a week's limit; your plan is about $${share.weeklyUsd.toFixed(2)} a week)`);
    if (share.resets) lines.push('  The weekly limit reset during this video, so the share may be slightly low.');
    lines.push('  Covered by your plan, not charged separately. Includes any other Claude use during the run.');
  } else if (!(monthlyUsd > 0)) {
    lines.push('  Share of your plan: add CLAUDE_PLAN_USD to settings to see it');
  } else {
    lines.push('  Share of your plan: not measured (needs usage readings at the start and end of the video)');
  }
  return lines;
}
