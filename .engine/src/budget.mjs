// Budget guard and spend ledger. Every paid call goes through authorize() first.
//
// Rules (from agentic-video-pipeline):
// - spent + reserved + this call must stay within the cap, checked before every call
// - an unknown price is a refusal, never a guess
// - reservations stop two parallel calls claiming the same last dollar
// - entries are appended, never rewritten
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export class BudgetStop extends Error {}

export class Ledger {
  constructor(file, capUsd) {
    this.file = file;
    this.cap = capUsd;
    this.data = fs.existsSync(file)
      ? JSON.parse(fs.readFileSync(file, 'utf8'))
      : { entries: [] };
  }

  get spent() {
    return this.data.entries
      .filter((e) => e.status === 'charged')
      .reduce((s, e) => s + e.actualUsd, 0);
  }

  get reserved() {
    return this.data.entries
      .filter((e) => e.status === 'reserved')
      .reduce((s, e) => s + e.estimateUsd, 0);
  }

  // Returns a reservation id, or throws BudgetStop.
  authorize({ step, item, estimateUsd }) {
    if (typeof estimateUsd !== 'number' || !Number.isFinite(estimateUsd) || estimateUsd < 0) {
      throw new BudgetStop(`No reliable price for "${item}". Stopping instead of guessing.`);
    }
    const after = this.spent + this.reserved + estimateUsd;
    if (after > this.cap + 1e-9) {
      throw new BudgetStop(
        `"${item}" would bring this video to $${after.toFixed(2)}, over the $${this.cap.toFixed(2)} cap.`,
      );
    }
    const id = crypto.randomUUID();
    this.data.entries.push({
      id, step, item, estimateUsd, actualUsd: null, status: 'reserved', at: new Date().toISOString(),
    });
    this.save();
    return id;
  }

  charge(id, actualUsd) {
    const e = this.#find(id);
    if (typeof actualUsd !== 'number' || !Number.isFinite(actualUsd) || actualUsd < 0) {
      throw new BudgetStop(`Charge for "${e.item}" has no valid amount.`);
    }
    e.actualUsd = actualUsd;
    e.status = 'charged';
    this.save();
  }

  // A failed call: release the reservation, record nothing spent.
  release(id) {
    const e = this.#find(id);
    e.status = 'released';
    this.save();
  }

  // Free items are recorded too, so the cost report can show them as $0.
  recordFree({ step, item, note }) {
    this.data.entries.push({
      id: crypto.randomUUID(), step, item, note, estimateUsd: 0, actualUsd: 0,
      status: 'charged', at: new Date().toISOString(),
    });
    this.save();
  }

  #find(id) {
    const e = this.data.entries.find((x) => x.id === id);
    if (!e) throw new Error(`Unknown ledger entry ${id}`);
    if (e.status !== 'reserved') throw new Error(`Ledger entry ${id} is already ${e.status}`);
    return e;
  }

  save() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
    fs.renameSync(tmp, this.file);
  }
}
