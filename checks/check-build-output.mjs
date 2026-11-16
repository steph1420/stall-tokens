#!/usr/bin/env node
// Copied from steph1420/agent-common checks/ at commit 88c9672. Do not edit here; change agent-common and copy again.
// agent-common/checks: build output is never tracked (06 rule 11). Fails if git tracks dist/, build/, out/ or coverage/.
import { execFileSync } from 'node:child_process';
const DIRS = ['dist', 'build', 'out', 'coverage', '.vite'];
const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean)
  .filter((f) => f.split('/').some((part) => DIRS.includes(part)) && !f.startsWith('node_modules/'));
if (tracked.length) {
  console.log(`build-output: ${tracked.length} tracked build file(s). Untrack with "git rm -r --cached <dir>" and add the dir to .gitignore:`);
  for (const f of tracked.slice(0, 20)) console.log(`  ${f}`);
  process.exit(1);
}
console.log('build-output: no build output tracked.');
