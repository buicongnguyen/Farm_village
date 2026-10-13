// The big picture (core/insight.mjs): the product map, the score bars, what pays best, growth by level, and praise.
import './tz.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/core/state.mjs';
import { act } from '../src/core/act.mjs';
import { pack, unpack } from '../src/kit/save.mjs';
import { makes, productMap, chainOf, scores, bestMakes, bestCrops, growth, trend, praise } from '../src/core/insight.mjs';
import { RECIPES, CROPS } from '../src/content/goods.mjs';
import { gainXp } from '../src/core/levels.mjs';
import { xpFor } from '../src/core/levels.mjs';

const NOW = 1_800_000_000_000;
const farm = (level = 12) => { const s = newGame(NOW, 7, { restore: true }); s.level = level; return s; };

test('the product map: every good in a column after what it is made from, lines only between goods that are shown', () => {
  const s = farm(12), map = productMap(s), col = {}; map.cols.forEach((c, i) => c.forEach(g => { col[g.id] = i; }));
  assert.ok(map.cols.length >= 3 && map.cols[0].length >= 5);
  for (const [a, b] of map.edges) { assert.ok(a in col && b in col, `${a} -> ${b} leaves the map`); assert.ok(col[a] < col[b], `${a} is not left of ${b}`); }
  for (const g of map.cols.flat()) { assert.ok(makes()[g.id].level <= 14, `${g.id} is too far ahead to show`); assert.equal(g.open, makes()[g.id].level <= 12); }
  assert.equal(col.wheat, 0); assert.ok(col.bread > col.wheat); assert.ok(col.egg > col.chicken_feed);
  const chain = chainOf(map, 'bread'); assert.ok(chain.has('wheat') && chain.has('bread')); assert.ok(!chain.has('carrot'));
  assert.ok(productMap(farm(1)).cols.flat().length < map.cols.flat().length, 'a new farm sees the whole map');
});

test('the score bars are whole numbers from 0 to 100, with words and a tip for each, and they follow the farm', () => {
  const s = farm(12), before = scores(s, NOW);
  for (const x of before) { assert.ok(Number.isInteger(x.score) && x.score >= 0 && x.score <= 100, x.id); assert.ok(x.name && x.text && x.tip); for (const m of x.text.matchAll(/\{(\w+)\}/g)) assert.ok(m[1] in x.params, `${x.id}: no {${m[1]}}`); }
  assert.equal(new Set(before.map(x => x.id)).size, before.length);
  for (const id of Object.keys(s.beds)) delete s.beds[id];
  assert.ok(scores(s, NOW).find(x => x.id === 'fields').score < before.find(x => x.id === 'fields').score, 'empty beds did not lower the fields');
  const saved = pack(s); scores(s, NOW); productMap(s); bestMakes(s); praise(s, NOW); assert.equal(pack(s), saved, 'reading the big picture changed the save');
  assert.doesNotThrow(() => scores({}, NOW)); assert.doesNotThrow(() => productMap({})); assert.doesNotThrow(() => praise({}, NOW));
});

test('what pays best: only recipes and crops open at your level, each worth more than what goes into it, best first', () => {
  const s = farm(12), best = bestMakes(s, 5);
  assert.ok(best.length >= 3);
  for (const m of best) { assert.ok(RECIPES[m.id].level <= 12); assert.ok(m.gain > 0 && m.perMin > 0); assert.equal(typeof m.ready, 'boolean'); }
  for (let i = 1; i < best.length; i++) assert.ok(best[i - 1].perMin >= best[i].perMin);
  for (const c of bestCrops(s)) assert.ok(CROPS[c.id].level <= 12);
  assert.equal(bestMakes(farm(1)).length, 0, 'a recipe was offered before any is open');
});

test('every level-up leaves a mark, growth is the difference between marks, the marks survive a save, and only forty are kept', () => {
  const s = farm(3); s.xp = xpFor(3); const events = [];
  const ctx = { s, now: NOW, emit: (type, e) => events.push({ type, ...e }) };
  assert.deepEqual(growth(s), []); assert.equal(trend(s), null);
  for (let i = 0; i < 6; i++) { s.stats.coinsEarned += 1000 * (i + 1); s.stats.produced += 5; s.stats.ordersFilled += 2; s.stats.playMs = (s.stats.playMs ?? 0) + 20 * 60_000; gainXp(ctx, xpFor(s.level + 1) - s.xp); }
  assert.equal(s.level, 9); assert.equal(s.insight.levels.length, 6); assert.equal(events.filter(e => e.type === 'levelUp').length, 6);
  const g = growth(s); assert.equal(g.length, 5); assert.deepEqual(g.map(x => x.level), [5, 6, 7, 8, 9]); assert.equal(g[0].coins, 2000); assert.equal(g[0].minutes, 20); assert.equal(g[0].made, 5); assert.equal(g[0].orders, 2);
  assert.equal(trend(s).dir, 'up'); assert.ok(trend(s).perHour > 0);
  assert.deepEqual(unpack(pack(s)).insight, s.insight, 'the marks were lost in a save');
  for (let i = 0; i < 60; i++) s.insight.levels.push({ l: 99, c: 0, m: 0, o: 0, ms: 0 });
  gainXp(ctx, xpFor(s.level + 1) - s.xp);
  assert.ok(s.insight.levels.length <= 40);
});

test('praise is always there, never empty, and speaks in your own numbers', () => {
  const fresh = praise(newGame(NOW, 1, {}), NOW); assert.equal(fresh.length, 1); assert.ok(fresh[0][0].length > 10);
  const s = farm(10); s.stats.ordersFilled = 12; s.stats.harvested = 80; s.stats.produced = 9; s.stats.gifts = 2;
  const said = praise(s, NOW); assert.ok(said.length >= 2 && said.length <= 3);
  for (const [text, params] of said) for (const m of text.matchAll(/\{(\w+)\}/g)) assert.ok(params[m[1]] > 0);
});
