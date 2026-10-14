#!/usr/bin/env node
// Small command line used by Claude (and by you, if you want).
//   node .engine/src/cli.mjs new <name>
//   node .engine/src/cli.mjs status <name>
//   node .engine/src/cli.mjs check <name>     validate research.json and script.json
//   node .engine/src/cli.mjs cost <name>      write cost.txt
import fs from 'node:fs';
import path from 'node:path';
import { paths, checkName } from './paths.mjs';
import { loadSettings, budgetCap } from './settings.mjs';
import { Ledger } from './budget.mjs';
import { initProject, readBrief, getStage } from './project.mjs';
import { validateResearch, validateScript, estimateMinutes } from './validate.mjs';
import { writeCostReport } from './cost-report.mjs';

const [cmd, name] = process.argv.slice(2);
const readJson = (f) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null);

function ledgerFor(n) {
  return new Ledger(path.join(paths.work(n), 'ledger.json'), budgetCap(loadSettings(), readBrief(n)));
}

try {
  switch (cmd) {
    case 'new': {
      const { video } = initProject(checkName(name));
      console.log(`Created ${path.relative(paths.root, video)}. Fill in brief.txt, then ask Claude to make the video.`);
      break;
    }
    case 'status':
      console.log(fs.readFileSync(path.join(paths.video(checkName(name)), 'status.txt'), 'utf8').trim());
      console.log(`(stage: ${getStage(name)})`);
      break;
    case 'check': {
      const work = paths.work(checkName(name));
      const research = readJson(path.join(work, 'research.json'));
      const script = readJson(path.join(work, 'script.json'));
      const errs = [
        ...(research ? validateResearch(research) : ['research.json is missing']),
        ...(script ? validateScript(script, research) : []),
      ];
      if (errs.length) {
        console.log(`Found ${errs.length} problem(s):`);
        errs.forEach((e) => console.log(`  - ${e}`));
        process.exitCode = 1;
      } else {
        const est = script ? estimateMinutes(script) : null;
        console.log(`OK.${est ? ` Script is ${est.words} words, about ${est.minutes} minutes.` : ''}`);
      }
      break;
    }
    case 'cost': {
      const out = writeCostReport(checkName(name), ledgerFor(name), { title: readBrief(name).topic || name });
      console.log(fs.readFileSync(out, 'utf8'));
      break;
    }
    default:
      console.log('Commands: new <name> | status <name> | check <name> | cost <name>');
      process.exitCode = cmd ? 1 : 0;
  }
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
}
