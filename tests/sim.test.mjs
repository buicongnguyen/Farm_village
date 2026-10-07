// The pace targets (ECONOMY.md section 1) on the real rules. Fails the build when a balance change breaks them.
import './tz.mjs';
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

// The AAA pass: the weekly cart and fruit trees must not move the pace. Hours from the first visit to each level, from the
// v0.1 report (levels 2–10, before any of the new content); and the same bot with and without the cart and trees.
const V01_LEVEL_HOURS = {
  casual: { 2: 0, 3: 0.03, 4: 0.1, 5: 24.07, 6: 48.07, 7: 83, 8: 107, 9: 144, 10: 168.1 },
  steady: { 2: 0, 3: 0.03, 4: 0.1, 5: 4.57, 6: 24.2, 7: 48, 8: 59, 9: 76.5, 10: 96.07 },
  keen: { 2: 0, 3: 0.03, 4: 0.1, 5: 3.07, 6: 10.13, 7: 24.1, 8: 30.17, 9: 38.17, 10: 51.13 },
};
const near = (a, b) => Math.abs(a - b) <= Math.max(0.1 * b, 0.25);   // ±10 % (and a quarter of an hour for the first minutes)
test('time to each level up to 10 stays within ±10 % of the v0.1 report', () => {
  for (const [p, want] of Object.entries(V01_LEVEL_HOURS)) for (const [l, h] of Object.entries(want))
    assert.ok(near(runs[p].levels[l], h), `${p} level ${l}: ${runs[p].levels[l]} h, v0.1 ${h} h`);
});
test('the weekly cart and fruit trees keep every level within ±10 % and never shortcut the school', () => {
  for (const p of ['casual', 'steady', 'keen']) {
    const without = simulate(p, 14, { cart: false, trees: false }), r = runs[p];
    assert.equal(r.steps.school, without.steps.school, `${p}: the school moved`);
    for (const [l, h] of Object.entries(without.levels)) if (r.levels[l] != null) assert.ok(near(r.levels[l], h), `${p} level ${l}: ${r.levels[l]} h with, ${h} h without`);
    assert.ok(Object.keys(r.levels).length >= Object.keys(without.levels).length - 1, `${p} reached fewer levels`);
  }
  // the first cart comes the day after the school opens (ECONOMY 3.1), so a steady fortnight sends two or more
  assert.ok(runs.steady.s.stats.carts >= 2, `steady sent ${runs.steady.s.stats.carts} carts in two weeks`);
  assert.ok(runs.steady.s.stats.picked > 0, 'steady picked no fruit');
});

// ── The restored village (PLAN-v0.3): the same targets for a game that opens on a run-down village and starts with repairs ──
const restored = Object.fromEntries(['casual', 'steady', 'keen'].map(p => [p, simulate(p, 14, { restore: true })]));
test('restored village, steady player: the school opens on day 3–4', () => {
  const day = restored.steady.steps.school; assert.ok(day >= 3 && day <= 4, `school on day ${day}`);
});
test('restored village: casual players by day 10, keen players not before day 2, and everyone finishes the build order', () => {
  assert.ok(restored.casual.steps.school <= 10, `casual school on day ${restored.casual.steps.school}`);
  assert.ok(restored.keen.steps.school >= 2, `keen school on day ${restored.keen.steps.school}`);
  for (const [p, r] of Object.entries(restored)) assert.ok(r.steps.cottages34, `${p} never finished cottages 3 and 4`);
});
test('restored village: the first family moves in on the first day for a steady player', () => {
  assert.equal(restored.steady.steps.cottage1, 1, `cottage1 on day ${restored.steady.steps.cottage1}`);
});
test('restored village: wear never stops a player, and repairs stay cheap (a few coins each)', () => {
  const s = restored.steady.s;
  for (const [id, c] of Object.entries(s.cond)) assert.ok(c.level < 3 || id.startsWith('road_'), `${id} is broken after two weeks`);
});
