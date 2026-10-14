import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Run against a throwaway folder, never the real one.
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'video-engine-'));
process.env.VIDEO_ROOT = root;
fs.mkdirSync(path.join(root, '.engine', 'templates'), { recursive: true });
fs.copyFileSync(
  new URL('../templates/brief.txt', import.meta.url),
  path.join(root, '.engine', 'templates', 'brief.txt'),
);

const { Ledger, BudgetStop } = await import('../src/budget.mjs');
const { initProject, readBrief, setStage, getStage } = await import('../src/project.mjs');
const { validateResearch, validateScript, estimateMinutes } = await import('../src/validate.mjs');
const { costText } = await import('../src/cost-report.mjs');
const { loadSettings, budgetCap, keyStatus } = await import('../src/settings.mjs');
const { checkName } = await import('../src/paths.mjs');

const ledgerFile = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ledger-')), 'ledger.json');

test('budget: allows spend within the cap and records it', () => {
  const l = new Ledger(ledgerFile(), 10);
  const id = l.authorize({ step: 'voice', item: 'Voice-over', estimateUsd: 4 });
  l.charge(id, 3.6);
  assert.equal(l.spent, 3.6);
  assert.equal(l.reserved, 0);
});

test('budget: refuses a call that would pass the cap', () => {
  const l = new Ledger(ledgerFile(), 5);
  l.charge(l.authorize({ step: 'voice', item: 'Voice-over', estimateUsd: 4 }), 4);
  assert.throws(() => l.authorize({ step: 'images', item: 'Images', estimateUsd: 2 }), BudgetStop);
});

test('budget: reservations count, so two calls cannot share the last dollar', () => {
  const l = new Ledger(ledgerFile(), 5);
  l.authorize({ step: 'a', item: 'A', estimateUsd: 3 });
  assert.throws(() => l.authorize({ step: 'b', item: 'B', estimateUsd: 3 }), BudgetStop);
});

test('budget: an unknown price is refused, never guessed', () => {
  const l = new Ledger(ledgerFile(), 100);
  for (const bad of [undefined, null, NaN, -1, '2']) {
    assert.throws(() => l.authorize({ step: 'x', item: 'X', estimateUsd: bad }), BudgetStop);
  }
});

test('budget: a released (failed) call costs nothing and frees the reservation', () => {
  const l = new Ledger(ledgerFile(), 5);
  const id = l.authorize({ step: 'a', item: 'A', estimateUsd: 4 });
  l.release(id);
  assert.equal(l.spent, 0);
  assert.doesNotThrow(() => l.authorize({ step: 'b', item: 'B', estimateUsd: 4 }));
});

test('budget: an entry cannot be charged twice', () => {
  const l = new Ledger(ledgerFile(), 10);
  const id = l.authorize({ step: 'a', item: 'A', estimateUsd: 1 });
  l.charge(id, 1);
  assert.throws(() => l.charge(id, 1));
});

test('budget: the ledger survives a reload', () => {
  const f = ledgerFile();
  const l = new Ledger(f, 10);
  l.charge(l.authorize({ step: 'a', item: 'A', estimateUsd: 2 }), 2);
  assert.equal(new Ledger(f, 10).spent, 2);
});

test('project: creates the folders, brief and status', () => {
  initProject('test-video');
  assert.ok(fs.existsSync(path.join(root, 'videos', 'test-video', 'brief.txt')));
  assert.ok(fs.existsSync(path.join(root, 'videos', 'test-video', 'feedback.txt')));
  assert.equal(getStage('test-video'), 'new');
  setStage('test-video', 'waiting-script-ok');
  assert.match(
    fs.readFileSync(path.join(root, 'videos', 'test-video', 'status.txt'), 'utf8'),
    /Waiting for your OK on the script/,
  );
});

test('project: reads the brief', () => {
  initProject('brief-video');
  fs.writeFileSync(
    path.join(root, 'videos', 'brief-video', 'brief.txt'),
    'Topic: Desert farming\nLength (minutes): 27\nNotes (what to focus on): water\nBudget cap in dollars: $12\n',
  );
  assert.deepEqual(readBrief('brief-video'), { topic: 'Desert farming', minutes: 27, notes: 'water', budgetUsd: 12 });
});

test('project: an empty brief reads as empty, not as the next line', () => {
  initProject('empty-brief');
  assert.deepEqual(readBrief('empty-brief'), { topic: '', minutes: null, notes: '', budgetUsd: undefined });
});

test('project: rejects unsafe names', () => {
  for (const bad of ['../x', 'Has Spaces', '', 'a/b']) assert.throws(() => checkName(bad));
});

const research = {
  topic: 'Desert farming',
  facts: [{ id: 'f1', claim: 'Drip irrigation saves water', sources: ['https://example.org/a'] }],
};
const script = {
  title: 'Desert farming',
  chapters: [{
    title: 'Water',
    scenes: [{ id: 's1', narration: 'Water is scarce here.', visual: 'dry riverbed', keywords: ['desert'], facts: ['f1'] }],
  }],
};

test('validate: accepts good research and script', () => {
  assert.deepEqual(validateResearch(research), []);
  assert.deepEqual(validateScript(script, research), []);
});

test('validate: every fact needs a source link', () => {
  const r = { topic: 't', facts: [{ id: 'f1', claim: 'c', sources: ['not a url'] }] };
  assert.match(validateResearch(r).join(), /source link/);
});

test('validate: a scene cannot cite a fact that is not in the research', () => {
  const s = structuredClone(script);
  s.chapters[0].scenes[0].facts = ['f9'];
  assert.match(validateScript(s, research).join(), /not in the research/);
});

test('validate: estimates length at 150 words per minute', () => {
  assert.deepEqual(estimateMinutes(script), { words: 4, minutes: 0 });
});

test('cost report: shows total, free items and budget left', () => {
  const l = new Ledger(ledgerFile(), 15);
  l.charge(l.authorize({ step: 'voice', item: 'Voice-over', estimateUsd: 4 }), 3.6);
  l.recordFree({ step: 'footage', item: 'Stock video', note: 'free' });
  const txt = costText('v', l, { title: 'Desert farming' });
  assert.match(txt, /TOTAL COST: \$3\.60 \(under budget by \$11\.40\)/);
  assert.match(txt, /Stock video\s+\$0\.00 {2}free/);
});

test('settings: parses the file and reports key names only', () => {
  const f = path.join(root, 'settings.env');
  fs.writeFileSync(f, '# comment\nBUDGET_CAP_USD=12\nPEXELS_API_KEY=abc\nPIXABAY_API_KEY=\n');
  const s = loadSettings(f);
  assert.equal(budgetCap(s), 12);
  assert.deepEqual(keyStatus(s, ['PEXELS_API_KEY', 'PIXABAY_API_KEY']), { PEXELS_API_KEY: true, PIXABAY_API_KEY: false });
  assert.throws(() => budgetCap({ BUDGET_CAP_USD: 'abc' }));
});
