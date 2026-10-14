#!/usr/bin/env node
// Small command line used by Claude (and by you, if you want).
//   npm run video -- channel <channel>          set up a channel
//   npm run video -- channels                   list channels
//   npm run video -- new <channel> <video>      start a video
//   npm run video -- status <channel> <video>
//   npm run video -- check <channel> <video>    validate research.json and script.json
//   npm run video -- cost <channel> <video>     write cost.txt
import fs from 'node:fs';
import path from 'node:path';
import { paths, checkName } from './paths.mjs';
import { loadSettings, budgetCap } from './settings.mjs';
import { Ledger } from './budget.mjs';
import {
  initChannel, listChannels, initProject, readBrief, getStage, readApprovals,
} from './project.mjs';
import { validateResearch, validateScript, estimateMinutes } from './validate.mjs';
import { writeCostReport } from './cost-report.mjs';

const [cmd, channel, video] = process.argv.slice(2);
const readJson = (f) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null);

function names() {
  checkName(channel, 'channel name');
  checkName(video, 'video name');
}

function channelBudget(c) {
  const text = fs.existsSync(paths.channelRules(c)) ? fs.readFileSync(paths.channelRules(c), 'utf8') : '';
  const n = Number(text.match(/^budget per video[^:\n]*:[ \t]*\$?([\d.]+)/mi)?.[1]);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function ledgerFor(c, v) {
  const brief = readBrief(c, v);
  const budgetUsd = brief.budgetUsd ?? channelBudget(c);
  return new Ledger(path.join(paths.work(c, v), 'ledger.json'), budgetCap(loadSettings(), { budgetUsd }));
}

try {
  switch (cmd) {
    case 'channel': {
      const dir = initChannel(channel);
      console.log(`Channel ready: ${path.relative(paths.root, dir)}. Drop 3-5 example videos into its style-examples folder.`);
      break;
    }
    case 'channels':
      console.log(listChannels().join('\n') || 'No channels yet.');
      break;
    case 'new': {
      names();
      const { video: dir } = initProject(channel, video);
      console.log(`Created ${path.relative(paths.root, dir)}. Fill in brief.txt.`);
      console.log(`Approval stops for this channel: ${readApprovals(channel).join(', ')}.`);
      break;
    }
    case 'status':
      names();
      console.log(fs.readFileSync(path.join(paths.video(channel, video), 'status.txt'), 'utf8').trim());
      console.log(`(stage: ${getStage(channel, video)})`);
      break;
    case 'check': {
      names();
      const work = paths.work(channel, video);
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
      names();
      const out = writeCostReport(channel, video, ledgerFor(channel, video), {
        title: readBrief(channel, video).topic || video,
      });
      console.log(fs.readFileSync(out, 'utf8'));
      break;
    }
    default:
      console.log('Commands: channel <c> | channels | new <c> <video> | status <c> <video> | check <c> <video> | cost <c> <video>');
      process.exitCode = cmd ? 1 : 0;
  }
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
}
