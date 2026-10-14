// Reads .engine/settings/settings.env. Values are never logged or returned in errors.
import fs from 'node:fs';
import { paths } from './paths.mjs';

export function loadSettings(file = paths.settings) {
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !line.trim().startsWith('#')) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

export function budgetCap(settings, brief = {}) {
  const raw = brief.budgetUsd ?? settings.BUDGET_CAP_USD ?? '15';
  const cap = Number(raw);
  if (!Number.isFinite(cap) || cap <= 0) throw new Error('The budget cap must be a positive number of dollars.');
  return cap;
}

// Names of keys that are set, never their values.
export function keyStatus(settings, names) {
  return Object.fromEntries(names.map((n) => [n, Boolean(settings[n])]));
}
