#!/usr/bin/env node
// Sets VITE_APP_VERSION, VITE_GIT_SHA and VITE_BUILD_DATE (IST) then runs the given command (Q-HARM-7 footer stamp).
import { execSync, spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

function shortSha() {
  const fromEnv = process.env.GITHUB_SHA ?? process.env.VITE_GIT_SHA;
  if (fromEnv) return fromEnv.slice(0, 7);
  try { return execSync('git rev-parse --short=7 HEAD', { cwd: root, encoding: 'utf8' }).trim(); } catch { return 'unknown'; }
}

function buildDateIst() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date());
  const g = (t) => parts.find((p) => p.type === t)?.value ?? '';
  return `${g('day')} ${g('month')} ${g('year')}, ${g('hour')}:${g('minute')} IST`;
}

process.env.VITE_APP_VERSION = pkg.version;
process.env.VITE_GIT_SHA = shortSha();
process.env.VITE_BUILD_DATE ??= buildDateIst();

const args = process.argv.slice(2);
if (args.length === 0) {
  process.stdout.write(`${process.env.VITE_APP_VERSION} ${process.env.VITE_GIT_SHA} ${process.env.VITE_BUILD_DATE}\n`);
  process.exit(0);
}
const child = spawn(args[0], args.slice(1), { stdio: 'inherit', env: process.env, cwd: root });
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
