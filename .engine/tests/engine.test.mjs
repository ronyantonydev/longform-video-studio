import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Run against a throwaway folder, never the real one.
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'video-engine-'));
process.env.VIDEO_ROOT = root;
fs.mkdirSync(path.join(root, '.engine', 'templates'), { recursive: true });
for (const t of ['brief.txt', 'channel-rules.md']) {
  fs.copyFileSync(new URL(`../templates/${t}`, import.meta.url), path.join(root, '.engine', 'templates', t));
}

const { Ledger, BudgetStop } = await import('../src/budget.mjs');
const {
  initChannel, listChannels, initProject, readBrief, setStage, getStage, readApprovals,
} = await import('../src/project.mjs');
const { validateResearch, validateScript, estimateMinutes } = await import('../src/validate.mjs');
const { costText } = await import('../src/cost-report.mjs');
const { loadSettings, budgetCap, keyStatus } = await import('../src/settings.mjs');
const { checkName, paths } = await import('../src/paths.mjs');

const ledgerFile = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ledger-')), 'ledger.json');
const videoDir = (c, v) => path.join(root, 'channels', c, 'videos', v);

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
  l.release(l.authorize({ step: 'a', item: 'A', estimateUsd: 4 }));
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

test('channel: setup creates its folders and rules', () => {
  initChannel('nature-channel');
  assert.ok(fs.existsSync(path.join(root, 'channels', 'nature-channel', 'style-examples')));
  assert.ok(fs.existsSync(path.join(root, 'channels', 'nature-channel', 'channel-rules.md')));
  assert.ok(fs.existsSync(path.join(root, '.engine', 'channels', 'nature-channel')));
  assert.ok(listChannels().includes('nature-channel'));
});

test('channel: approvals default to script and final; look only when asked', () => {
  initChannel('plain-channel');
  assert.deepEqual(readApprovals('plain-channel'), ['script', 'final']);
  fs.writeFileSync(paths.channelRules('plain-channel'), 'approvals: script, look, final\n');
  assert.deepEqual(readApprovals('plain-channel'), ['script', 'look', 'final']);
  fs.writeFileSync(paths.channelRules('plain-channel'), 'approvals: none\n');
  assert.deepEqual(readApprovals('plain-channel'), ['script', 'final'], 'script and final cannot be removed');
});

test('channel: two channels keep separate videos', () => {
  initChannel('channel-a');
  initChannel('channel-b');
  initProject('channel-a', 'same-topic');
  initProject('channel-b', 'same-topic');
  setStage('channel-a', 'same-topic', 'done');
  assert.equal(getStage('channel-a', 'same-topic'), 'done');
  assert.equal(getStage('channel-b', 'same-topic'), 'new');
});

test('project: needs an existing channel', () => {
  assert.throws(() => initProject('no-such-channel', 'x'), /no channel/);
});

test('project: creates the folders, brief and status', () => {
  initProject('nature-channel', 'test-video');
  assert.ok(fs.existsSync(path.join(videoDir('nature-channel', 'test-video'), 'brief.txt')));
  assert.ok(fs.existsSync(path.join(videoDir('nature-channel', 'test-video'), 'feedback.txt')));
  assert.equal(getStage('nature-channel', 'test-video'), 'new');
  setStage('nature-channel', 'test-video', 'waiting-script-ok');
  assert.match(
    fs.readFileSync(path.join(videoDir('nature-channel', 'test-video'), 'status.txt'), 'utf8'),
    /Waiting for your OK on the script/,
  );
});

test('project: reads the brief', () => {
  initProject('nature-channel', 'brief-video');
  fs.writeFileSync(
    path.join(videoDir('nature-channel', 'brief-video'), 'brief.txt'),
    'Topic: Desert farming\nLength (minutes): 27\nNotes (what to focus on): water\nBudget cap in dollars: $12\n',
  );
  assert.deepEqual(readBrief('nature-channel', 'brief-video'), {
    topic: 'Desert farming', minutes: 27, notes: 'water', budgetUsd: 12,
  });
});

test('project: an empty brief reads as empty, not as the next line', () => {
  initProject('nature-channel', 'empty-brief');
  assert.deepEqual(readBrief('nature-channel', 'empty-brief'), {
    topic: '', minutes: null, notes: '', budgetUsd: undefined,
  });
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
  const txt = costText(l, { title: 'Desert farming' });
  assert.match(txt, /TOTAL COST: \$3\.60 \(under budget by \$11\.40\)/);
  assert.match(txt, /Stock video\s+\$0\.00 {2}free/);
});

test('settings: parses the file and reports key names only', () => {
  const f = path.join(root, 'settings.env');
  fs.writeFileSync(f, '# comment\nBUDGET_CAP_USD=12\nFREESOUND_API_KEY=abc\nGOOGLE_AI_STUDIO_API_KEY=\n');
  const s = loadSettings(f);
  assert.equal(budgetCap(s), 12);
  assert.deepEqual(keyStatus(s, ['FREESOUND_API_KEY', 'GOOGLE_AI_STUDIO_API_KEY']), { FREESOUND_API_KEY: true, GOOGLE_AI_STUDIO_API_KEY: false });
  assert.throws(() => budgetCap({ BUDGET_CAP_USD: 'abc' }));
});

test('steps: every step maps to a pipeline script with the video paths filled in', async () => {
  const { STEPS, stepCommand } = await import('../src/steps.mjs');
  for (const name of Object.keys(STEPS)) {
    const [, args] = stepCommand(name, 'nature-channel', 'test-video', ['a.mp4', 'film']);
    assert.match(args[0], /\.engine\/pipeline\/\w+\.py$/, name);
    assert.ok(fs.existsSync(args[0]), `${name}: ${args[0]} exists`);
  }
  const [, cap] = stepCommand('captions', 'nature-channel', 'test-video');
  assert.ok(cap.at(-1).endsWith(path.join('channels', 'nature-channel', 'videos', 'test-video', 'captions.srt')));
  assert.throws(() => stepCommand('nope', 'nature-channel', 'test-video'), /Unknown step/);
});

const usage = await import('../src/claude-usage.mjs');
const W1 = '2026-10-20T19:00:00Z';
const W2 = '2026-10-27T19:00:00Z';

test('claude usage: weekly share counts the rise across readings', () => {
  const marks = [{ percent: 10, resetsAt: W1 }, { percent: 12, resetsAt: W1 }, { percent: 15, resetsAt: W1 }];
  assert.deepEqual(usage.weeklyPercentUsed(marks), { used: 5, resets: 0 });
  const share = usage.planShare(marks, 100);
  assert.ok(Math.abs(share.usd - 0.05 * (100 * 12 / 52)) < 1e-9);
});

test('claude usage: a weekly reset counts the new week from zero', () => {
  const marks = [{ percent: 90, resetsAt: W1 }, { percent: 95, resetsAt: W1 }, { percent: 4, resetsAt: W2 }];
  assert.deepEqual(usage.weeklyPercentUsed(marks), { used: 9, resets: 1 });
});

test('claude usage: no share without a plan price or with one reading', () => {
  assert.equal(usage.planShare([{ percent: 1, resetsAt: W1 }, { percent: 2, resetsAt: W1 }], 0), null);
  assert.equal(usage.planShare([{ percent: 1, resetsAt: W1 }], 100), null);
});

test('claude usage: readings are validated and saved', () => {
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'usage-')), 'claude-usage.json');
  assert.throws(() => usage.addMark(f, { percent: 'lots', resetsAt: W1 }));
  assert.throws(() => usage.addMark(f, { percent: 5, resetsAt: 'soon' }));
  usage.addMark(f, { percent: 5, resetsAt: W1 });
  assert.equal(usage.readMarks(f).length, 1);
});

test('claude usage: tokens count each reply once, only inside the window', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-home-'));
  const dir = usage.logDir('/Users/me/My Videos', home);
  assert.ok(dir.endsWith(path.join('projects', '-Users-me-My-Videos')));
  fs.mkdirSync(path.join(dir, 'sub'), { recursive: true });
  const line = (id, ts, out) => JSON.stringify({ timestamp: ts, message: { id, model: 'claude-sonnet-5-5',
    usage: { input_tokens: 1, cache_creation_input_tokens: 10, cache_read_input_tokens: 100, output_tokens: out } } });
  fs.writeFileSync(path.join(dir, 'a.jsonl'), [
    line('r1', '2026-10-15T10:00:00Z', 5), line('r1', '2026-10-15T10:00:01Z', 50), // same reply twice: keep the last
    line('r2', '2026-10-15T11:00:00Z', 20),
    line('r3', '2026-10-16T10:00:00Z', 999), // outside the window
    'not json',
  ].join('\n'));
  fs.writeFileSync(path.join(dir, 'sub', 'b.jsonl'), line('r4', '2026-10-15T12:00:00Z', 30));
  const t = usage.tokensBetween(dir, '2026-10-15T00:00:00Z', '2026-10-15T23:59:59Z');
  assert.deepEqual(t, { 'claude-sonnet-5-5': { input: 3, cacheWrite: 30, cacheRead: 300, output: 100 } });
});

test('claude usage: cost lines name the model and the plan share, never an API price', () => {
  const lines = usage.claudeLines({
    marks: [{ percent: 10, resetsAt: W1 }, { percent: 13, resetsAt: W1 }],
    monthlyUsd: 100,
    plan: 'Max',
    tokens: { 'claude-sonnet-5-5': { input: 1000, cacheWrite: 0, cacheRead: 2_000_000, output: 250_000 } },
  }).join('\n');
  assert.match(lines, /Claude Sonnet 5\.5: 2\.0M tokens read \(2\.0M from cache\), 250K written/);
  assert.match(lines, /Share of your Max plan: \$0\.69 \(3% of a week's limit/);
  assert.doesNotMatch(lines, /API/);
});
