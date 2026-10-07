// Runs every tests/*.browser.mjs after tests/browser.mjs (each package adds its own suite). Exits non-zero if any fails.
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
let failed = 0;
for (const f of readdirSync('tests').filter(f => f.endsWith('.browser.mjs')).sort()) {
  console.log(`\n== ${f}`);
  if (spawnSync(process.execPath, [`tests/${f}`], { stdio: 'inherit' }).status !== 0) failed++;
}
process.exit(failed ? 1 : 0);
