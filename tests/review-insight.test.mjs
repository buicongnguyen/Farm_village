import './tz.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/core/state.mjs';
import { pack, unpack } from '../src/kit/save.mjs';
import { gainXp, xpFor } from '../src/core/levels.mjs';
import { bestMakes, bestCrops, productMap, trend, growth } from '../src/core/insight.mjs';
import { CROPS, RECIPES, GOODS } from '../src/content/goods.mjs';
import { SLUICE } from '../src/content/economy.mjs';
import { GARDEN_STEPS } from '../src/content/learning.mjs';
import { talkNumbers, roomConversation, ROOM_PEOPLE } from '../src/content/room-people.mjs';
const T = 1_800_000_000_000, MIN = 60_000;
const farm = () => { const s = newGame(T, 41, { restore: true }); s.level = 12; s.xp = xpFor(12); s.cond = {}; return s; };

test('malformed optional insight history cannot break the next level-up or chart', () => {
  for (const raw of ['broken', { levels: {} }, { levels: [null, {}, { l: 3, c: 'bad', m: 0, o: 0, ms: 0 }] }]) {
    let s = farm(); s.insight = raw; s = unpack(pack(s)); assert.ok(s);
    assert.doesNotThrow(() => gainXp({ s, emit() {} }, xpFor(13) - s.xp));
    assert.ok(Array.isArray(s.insight.levels));
    for (const row of growth(s)) for (const value of Object.values(row)) assert.ok(Number.isFinite(value));
  }
});
test('growth trend weights earnings by elapsed time instead of averaging unequal level rates', () => {
  const s = farm(); s.insight = { levels: [0, 1, 100, 150, 200].map((m, i) => ({ l: i + 2, c: i * 100, m: 0, o: 0, ms: m * MIN })) };
  assert.deepEqual(trend(s), { dir: 'steady', perHour: 120 });
});
test('recipe margin uses actual output upgrades and the sluice production time', () => {
  const s = farm(), id = Object.keys(s.placed).find(id => s.placed[id].kind === 'bakery'), r = RECIPES.bread;
  s.outputUp = { [id]: 2 }; s.firsts.sluice = T;
  const bread = bestMakes(s, 100).find(g => g.id === 'bread');
  const gain = r.value * r.makes * 4 - Object.entries(r.needs).reduce((n, [g, k]) => n + GOODS[g].value * k, 0);
  assert.equal(bread.gain, gain);
  assert.equal(bread.perMin, Math.round(gain / (Math.round(r.timeMs * SLUICE.work) / MIN) * 10) / 10);
});
test('product readiness follows functioning sources and learned crops and recipes', () => {
  const s = farm(), mill = Object.keys(s.placed).find(id => s.placed[id].kind === 'feed_mill');
  s.cond[mill] = { level: 3 }; s.animals = {};
  let nodes = Object.fromEntries(productMap(s).cols.flat().map(g => [g.id, g]));
  assert.equal(nodes.chicken_feed.ready, false); assert.equal(nodes.egg.ready, false);
  s.learning.steps = GARDEN_STEPS.map(g => g.id);
  nodes = Object.fromEntries(productMap(s).cols.flat().map(g => [g.id, g]));
  assert.equal(nodes.strawberry?.open, true);
  s.level = 2; const recipe = Object.keys(RECIPES).find(id => RECIPES[id].level > 5); s.known[recipe] = true;
  assert.equal(productMap(s).cols.flat().find(g => g.id === recipe)?.open, true);
});
test('crop earnings include both free wheat grains and learned strawberries', () => {
  const s = farm(); s.learning.steps = GARDEN_STEPS.map(g => g.id);
  const best = bestCrops(s, 100); assert.ok(best.some(c => c.id === 'strawberry'));
  assert.equal(best.find(c => c.id === 'wheat').perMin, Math.round(2 * CROPS.wheat.value / (CROPS.wheat.growMs / MIN) * 10) / 10);
});
test('indoor conversation does not invent hours of play for a new farmer', () => {
  const s = farm(); s.stats.playMs = 10 * MIN; assert.equal(talkNumbers(s, 0).hours, 0);
});

test('indoor questions only cite progress the player actually has', () => {
  const s = farm(); s.stats = { playMs: 10 * MIN };
  assert.equal(roomConversation(ROOM_PEOPLE.hospital[0], s, 0, 0).ask, null);
  s.stats.harvested = 20;
  const talk = roomConversation(ROOM_PEOPLE.hospital[0], s, 0, 0);
  assert.match(talk.ask.q, /\{harvested\}/);
  s.stats.harvested = 21; s.stats.playMs = 3 * 3_600_000;
  assert.equal(talk.nums.harvested, 20, 'an open question changed with later progress');
  assert.match(roomConversation(ROOM_PEOPLE.hospital[0], s, 0, 0).ask.q, /\{hours\}/);
});
