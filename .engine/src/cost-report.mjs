// Writes videos/<name>/cost.txt from the ledger, and appends to monthly-costs.txt.
import fs from 'node:fs';
import path from 'node:path';
import { paths } from './paths.mjs';

const money = (n) => `$${n.toFixed(2)}`;

export function costText(name, ledger, { title = name } = {}) {
  const charged = ledger.data.entries.filter((e) => e.status === 'charged');
  const total = charged.reduce((s, e) => s + e.actualUsd, 0);
  const width = Math.max(10, ...charged.map((e) => e.item.length));
  const lines = charged.map((e) => {
    const amount = e.actualUsd === 0 ? `$0.00  ${e.note ?? 'free'}` : money(e.actualUsd);
    return `  ${e.item.padEnd(width)}  ${amount}`;
  });
  const left = ledger.cap - total;
  return [
    `Video: ${title}`,
    `Budget: ${money(ledger.cap)}`,
    '',
    `TOTAL COST: ${money(total)} (${left >= 0 ? `under budget by ${money(left)}` : `OVER budget by ${money(-left)}`})`,
    '',
    'What it cost:',
    ...(lines.length ? lines : ['  nothing yet']),
    '',
    'Monthly subscriptions (for example Epidemic Sound) are not included above.',
    '',
  ].join('\n');
}

export function writeCostReport(name, ledger, opts) {
  const out = path.join(paths.video(name), 'cost.txt');
  fs.writeFileSync(out, costText(name, ledger, opts));
  return out;
}

export function appendMonthly(name, totalUsd, file = paths.monthlyCosts) {
  const month = new Date().toISOString().slice(0, 7);
  fs.appendFileSync(file, `${month}  ${name}  ${money(totalUsd)}\n`);
}
