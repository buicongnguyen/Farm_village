// The pace targets (ECONOMY.md section 1) on the real rules. Fails the build when a balance change breaks them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from '../scripts/sim.mjs';

const runs = Object.fromEntries(['casual', 'steady', 'keen'].map(p => [p, simulate(p, 14)]));

test('steady player: the school opens on day 3–4', () => {
  const day = runs.steady.steps.school;
  assert.ok(day >= 3 && day <= 4, `school on day ${day}`);
});
test('casual and keen players stay in step: casual by day 10, keen not before day 2', () => {
  assert.ok(runs.casual.steps.school <= 10, `casual school on day ${runs.casual.steps.school}`);
  assert.ok(runs.keen.steps.school >= 2, `keen school on day ${runs.keen.steps.school}`);
});
test('the first session builds the first cottage (DESIGN 15)', () => {
  for (const p of ['steady', 'keen']) assert.equal(runs[p].steps.cottage1, 1, `${p}: cottage1 on day ${runs[p].steps.cottage1}`);
});
test('no profile gets stuck: everyone finishes the v0.1 build order within two weeks', () => {
  for (const [p, r] of Object.entries(runs)) assert.ok(r.steps.cottages34, `${p} never finished cottages 3 and 4`);
});
test('levels at the school stay in the v0.1 range (5–10)', () => {
  const r = runs.steady, d = r.daily[r.steps.school - 1];
  assert.ok(d.level >= 5 && d.level <= 10, `level ${d.level} on the school's day`);
});
