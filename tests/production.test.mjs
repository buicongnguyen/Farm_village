import './tz.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/core/state.mjs';
import { act, tick } from '../src/core/act.mjs';
import { productionOf, readyCount, slotCost, collectableJobs, queueBatches, productionDuration } from '../src/core/production.mjs';
import { normalizeProduction, normalizeProductionQueue, clampProductionClock } from '../src/core/production-state.mjs';
import { hurryable } from '../src/core/quests.mjs';
import { goodHelp } from '../src/core/good-help.mjs';
import { juneTopics } from '../src/core/conversation.mjs';
import { planFor } from '../src/core/plan.mjs';
import { RECIPES, GOODS } from '../src/content/goods.mjs';
import { SLOTS } from '../src/content/economy.mjs';
import { STEPS } from '../src/content/projects.mjs';
import { pack, unpack } from '../src/kit/save.mjs';
import { T0, setLevel, must } from './helpers.mjs';

function farm(kind = 'bakery') {
  const s = newGame(T0, 314);
  setLevel(s, 20); s.coins = 10000; s.projects.step = STEPS.length; s.story.tutorial = 999;
  s.placed.maker = { kind, x: 40, z: 60, rot: 0 }; s.counts[kind] = 1;
  s.barn.cap = 10000; s.barn.items = Object.fromEntries(Object.keys(GOODS).map(good => [good, 100]));
  return s;
}
const produce = (s, recipe, now = T0) => must(s, 'produce', { building: 'maker', recipe }, now);
function refused(s, action, payload, now = T0) {
  const before = structuredClone(s), result = act(s, action, payload, now);
  assert.equal(result.ok, false); assert.deepEqual(result.events, []); assert.deepEqual(s, before); return result;
}
function group(s, recipe, count, now = T0) {
  const events = [], result = queueBatches({ s, now, emit: (type, data) => events.push({ type, ...data }), fail: reason => ({ ok: false, reason }) }, { building: 'maker', recipe, count });
  return { ok: true, ...result, events };
}

test('every production building runs both starting trays concurrently, and buying a tray immediately adds independent capacity', () => {
  const recipes = Object.values(RECIPES).reduce((kinds, recipe) => kinds.add(recipe.at), new Set());
  for (const kind of recipes) {
    const s = farm(kind), recipe = Object.keys(RECIPES).find(id => RECIPES[id].at === kind);
    const a = produce(s, recipe), b = produce(s, recipe);
    assert.equal(a.doneAt, T0 + RECIPES[recipe].timeMs); assert.equal(b.doneAt, a.doneAt);
    assert.deepEqual(s.production.maker.queue.map(job => job.slot), [0, 1]);
    refused(s, 'produce', { building: 'maker', recipe });
    const jobs = structuredClone(s.production.maker.queue), coins = s.coins;
    must(s, 'buySlot', { building: 'maker' }, T0 + 1000);
    assert.equal(s.coins, coins - SLOTS.cost[2]); assert.deepEqual(s.production.maker.queue, jobs);
    const c = produce(s, recipe, T0 + 1000);
    assert.equal(c.slot, 2); assert.equal(c.doneAt, T0 + 1000 + RECIPES[recipe].timeMs);
  }
});

test('a short second recipe can be collected before the first, then its empty tray can be reused without shifting other work', () => {
  const s = farm(); const slow = produce(s, 'carrot_cake'), quick = produce(s, 'bread');
  assert.ok(quick.doneAt < slow.doneAt);
  const beforeSlow = structuredClone(s.production.maker.queue[0]), bread = s.barn.items.bread;
  assert.equal(must(s, 'collectProducts', { building: 'maker' }, quick.doneAt).collected, 1);
  assert.equal(s.barn.items.bread, bread + 1); assert.deepEqual(s.production.maker.queue, [beforeSlow]);
  const fresh = produce(s, 'bread', quick.doneAt);
  assert.equal(fresh.slot, 1); assert.equal(fresh.startedAt, quick.doneAt); assert.deepEqual(s.production.maker.queue[0], beforeSlow);
  assert.equal(must(s, 'collectProducts', { building: 'maker' }, slow.doneAt).collected, 2);
  assert.deepEqual(s.production.maker.queue, []);
});

test('completed output keeps its tray occupied until collected, and collection cannot pay or add goods twice', () => {
  const s = farm(); const work = produce(s, 'bread'); produce(s, 'bread');
  refused(s, 'produce', { building: 'maker', recipe: 'bread' }, work.doneAt);
  const count = s.barn.items.bread, coins = s.coins, produced = s.stats.produced;
  assert.equal(readyCount(s, 'maker', work.doneAt), 2);
  assert.equal(must(s, 'collectProducts', { building: 'maker' }, work.doneAt).collected, 2);
  assert.equal(s.barn.items.bread, count + 2); assert.equal(s.coins, coins); assert.equal(s.stats.produced, produced + 2);
  refused(s, 'collectProducts', { building: 'maker' }, work.doneAt);
});

test('collection skips a ready batch too large for the barn so a smaller ready tray can fit; guidance predicts the actual result', () => {
  const s = farm('noodle_factory'); s.barn.items = {}; s.barn.cap = 1;
  s.production.maker = { slots: 2, queue: [{ recipe: 'noodles', doneAt: T0 }, { recipe: 'instant_noodles', doneAt: T0 }] };
  const before = structuredClone(s);
  assert.deepEqual(collectableJobs(s, 'maker', T0).map(job => job.recipe), ['instant_noodles']);
  assert.equal(goodHelp(s, 'instant_noodles', T0).source.status, 'ready');
  assert.equal(goodHelp(s, 'noodles', T0).source.status, 'barn-full');
  assert.ok(juneTopics(s, T0).some(topic => topic.key === 'products')); assert.deepEqual(s, before);
  must(s, 'collectProducts', { building: 'maker' }); assert.deepEqual(s.barn.items, { instant_noodles: 1 });
  assert.deepEqual(s.production.maker.queue.map(job => job.recipe), ['noodles']);
  refused(s, 'collectProducts', { building: 'maker' });
  s.barn.cap = 3; must(s, 'collectProducts', { building: 'maker' });
  assert.deepEqual(s.barn.items, { instant_noodles: 1, noodles: 2 });
});

test('ingredient guidance and June see a ready later tray while another independent tray is still working', () => {
  const s = farm(); s.barn.items = {}; s.barn.cap = 20;
  s.production.maker = { slots: 2, queue: [{ recipe: 'carrot_cake', doneAt: T0 + 5000 }, { recipe: 'bread', doneAt: T0 }] };
  assert.equal(goodHelp(s, 'bread', T0).source.status, 'ready');
  assert.ok(juneTopics(s, T0).some(topic => topic.key === 'products'));
  s.cond.maker = { level: 3 };
  assert.equal(goodHelp(s, 'bread', T0).source.status, 'ready');
  must(s, 'collectProducts', { building: 'maker' }); assert.equal(s.barn.items.bread, 1);
});

test('legacy serialized saves retain exact completion and start times, without consuming inputs or paying on migration', () => {
  const s = farm(); s.version = 9;
  s.production.maker = { slots: 3, queue: [{ recipe: 'bread', doneAt: T0 + 10000 }, { recipe: 'carrot_cake', doneAt: T0 + 310000 }] };
  const before = structuredClone(s), normalized = normalizeProduction(s);
  assert.deepEqual(s, before);
  assert.deepEqual(normalized.maker.queue.map(job => [job.slot, job.startedAt, job.doneAt]), [[0, T0 - 20000, T0 + 10000], [1, T0 + 10000, T0 + 310000]]);
  const loaded = unpack(pack(s));
  assert.equal(loaded.coins, before.coins); assert.deepEqual(loaded.barn, before.barn);
  assert.deepEqual(loaded.production, normalized);
  const fresh = produce(loaded, 'bread', T0);
  assert.equal(fresh.slot, 2); assert.equal(fresh.doneAt, T0 + RECIPES.bread.timeMs);
  assert.equal(loaded.production.maker.queue[1].startedAt, T0 + 10000);
  assert.deepEqual(normalizeProduction(loaded), loaded.production);
});

test('normalization retains paid jobs and bought tray counts, repairs duplicate tray indices, and rejects unreadable jobs instead of silently losing them', () => {
  const saved = { slots: 4, queue: [{ recipe: 'bread', slot: 2, startedAt: T0, doneAt: T0 + 30000, durationMs: 30000 }, { recipe: 'bread', slot: 2, doneAt: T0 + 60000 }] };
  const copy = structuredClone(saved), normalized = normalizeProductionQueue(saved);
  assert.deepEqual(saved, copy); assert.equal(normalized.slots, 4); assert.equal(normalized.queue.length, 2);
  assert.equal(new Set(normalized.queue.map(job => job.slot)).size, 2); assert.equal(normalized.queue[0].slot, 2);
  assert.deepEqual(normalizeProductionQueue(normalized), normalized);
  assert.throws(() => normalizeProductionQueue({ slots: 2, queue: [{ recipe: 'missing', doneAt: T0 }] }));
  assert.throws(() => normalizeProductionQueue({ slots: 2, queue: [{ recipe: 'bread', doneAt: NaN }] }));
});

test('hurry finishes exactly one independent job, leaves every other timer intact, and never initializes an empty queue on refusal', () => {
  const s = farm(); delete s.production.maker;
  const before = structuredClone(s); assert.equal(hurryable(s, 'maker', T0), false); assert.deepEqual(s, before);
  refused(s, 'hurry', { id: 'maker' });
  s.hurry.left = 1;
  produce(s, 'carrot_cake'); produce(s, 'bread');
  const second = structuredClone(s.production.maker.queue[1]); must(s, 'hurry', { id: 'maker' }, T0 + 1000);
  assert.equal(s.production.maker.queue[0].doneAt, T0 + 1000); assert.deepEqual(s.production.maker.queue[1], second);
  assert.equal(readyCount(s, 'maker', T0 + 1000), 1); refused(s, 'hurry', { id: 'maker' }, T0 + 1000);
});

test('a backward clock caps every tray independently and uses its saved worker duration', () => {
  const s = farm(); s.production.maker = { slots: 3, queue: [
    { recipe: 'carrot_cake', slot: 0, startedAt: T0 + 100000, doneAt: T0 + 400000, durationMs: 300000 },
    { recipe: 'bread', slot: 1, startedAt: T0 + 400000, doneAt: T0 + 427000, durationMs: 27000 },
  ] };
  clampProductionClock(s, T0 - 5000);
  assert.equal(s.production.maker.queue[0].doneAt, T0 - 5000 + 300000);
  assert.equal(s.production.maker.queue[1].doneAt, T0 - 5000 + 27000);
  assert.ok(s.production.maker.queue.every(job => job.startedAt <= T0 - 5000));
  const t = farm(); produce(t, 'carrot_cake', T0 + 100000); produce(t, 'bread', T0 + 100000);
  tick(t, T0 - 5000);
  assert.equal(t.production.maker.queue[1].doneAt, T0 - 5000 + RECIPES.bread.timeMs);
});

test('explicit multi-batch commands pay aggregate inputs once and refuse atomically when any tray or input is missing', () => {
  const s = farm(); s.production.maker = { slots: 3, queue: [] }; s.barn.items = { wheat: 8 };
  for (const count of [0, -1, 4, 1.5, NaN, '2']) {
    const before = structuredClone(s), result = group(s, 'bread', count);
    assert.equal(result.ok, false); assert.deepEqual(result.events, []); assert.deepEqual(s, before);
  }
  let before = structuredClone(s), result = group(s, 'bread', 3);
  assert.equal(result.ok, false); assert.deepEqual(result.events, []); assert.deepEqual(s, before);
  s.barn.items.wheat = 9; result = group(s, 'bread', 3);
  assert.equal(result.ok, true); assert.equal(result.queued, 3); assert.deepEqual(result.slots, [0, 1, 2]);
  assert.deepEqual(s.barn.items, {}); assert.equal(result.events.filter(e => e.type === 'queued').length, 3);
  assert.ok(s.production.maker.queue.every(job => job.doneAt === T0 + RECIPES.bread.timeMs));
  before = structuredClone(s); assert.equal(group(s, 'bread', 1).ok, false); assert.deepEqual(s, before);
});

test('ordinary produce ignores a forged multi-batch count and all invalid actions leave optional production state untouched', () => {
  const s = farm(); delete s.production.maker;
  const before = structuredClone(s); readyCount(s, 'maker', T0); slotCost(s, 'maker'); productionOf(s, 'maker'); collectableJobs(s, 'maker', T0); assert.deepEqual(s, before);
  for (const building of [undefined, null, {}, '__proto__', 'constructor', 'missing']) {
    refused(s, 'produce', { building, recipe: 'bread' }); refused(s, 'buySlot', { building });
  }
  refused(s, 'produce', { building: 'maker', recipe: 'bread' }, NaN);
  const count = s.barn.items.wheat; must(s, 'produce', { building: 'maker', recipe: 'bread', count: 3 });
  assert.equal(s.production.maker.queue.length, 1); assert.equal(s.barn.items.wheat, count - 3);
});

test('order plans collect paid tray output instead of asking for its ingredients again, including a nested recipe', () => {
  const s = farm('noodle_factory'); s.barn.items = { carrot: 1 };
  s.production.maker = { slots: 2, queue: [{ recipe: 'noodles', doneAt: T0 + 60000 }] };
  const before = structuredClone(s);
  assert.deepEqual(planFor(s, { instant_noodles: 1 }), [
    { how: 'collect', good: 'noodles', n: 2, at: 'noodle_factory' },
    { how: 'make', good: 'instant_noodles', n: 1, at: 'noodle_factory' },
  ]);
  assert.deepEqual(s, before);
  delete s.placed.maker;
  assert.ok(planFor(s, { instant_noodles: 1 }).some(step => step.how === 'make' && step.good === 'noodles'), 'an orphan saved queue is not a real source');
});

test('order plans spend incoming stock only once and protect the current village project before describing spare trays', () => {
  const s = farm('noodle_factory'); s.barn.items = { carrot: 1 };
  s.production.maker = { slots: 2, queue: [{ recipe: 'noodles', doneAt: T0 + 60000 }] };
  const steps = planFor(s, { noodles: 1, instant_noodles: 1 });
  assert.equal(steps.find(step => step.how === 'collect' && step.good === 'noodles').n, 2);
  assert.equal(steps.find(step => step.how === 'make' && step.good === 'noodles').n, 2, 'the paid batch cannot cover both demands twice');
  const p = farm(); p.projects.step = STEPS.findIndex(step => step.id === 'cottage2'); p.barn.items = {};
  p.production.maker = { slots: 2, queue: [{ recipe: 'bread', doneAt: T0 + 30000 }, { recipe: 'bread', doneAt: T0 + 30000 }] };
  assert.ok(!planFor(p, { bread: 1 }).some(step => step.how === 'collect'), 'both pending loaves belong to the five-loaf village project');
  p.barn.items.bread = 5;
  assert.deepEqual(planFor(p, { bread: 1 }), [{ how: 'collect', good: 'bread', n: 1, at: 'bakery' }]);
});

test('worker duration quotes match ordinary production and guidance, while previously paid batches keep their saved timing', () => {
  const s = farm('juice_press'); s.barn.items = { carrot: 12 };
  for (const [id, kind] of [['factory', 'noodle_factory'], ['office', 'company'], ['home', 'cottage']]) s.placed[id] = { kind, x: 10, z: 10, rot: 0 };
  s.homes.home = { family: 'tran', arrived: true, arrivesAt: T0 - 1 };
  const old = produce(s, 'carrot_juice'), oldJob = structuredClone(s.production.maker.queue[0]);
  s.growth.staff.worker = { person: 'lan', building: 'maker' };
  assert.equal(productionDuration(s, 'maker', 'carrot_juice', T0), RECIPES.carrot_juice.timeMs * 0.9);
  assert.equal(goodHelp(s, 'carrot_juice', T0, { needed: 2 }).source.duration, RECIPES.carrot_juice.timeMs * 0.9);
  const next = produce(s, 'carrot_juice'); assert.equal(next.doneAt, T0 + RECIPES.carrot_juice.timeMs * 0.9);
  assert.equal(old.doneAt, T0 + RECIPES.carrot_juice.timeMs); assert.deepEqual(s.production.maker.queue[0], oldJob);
  s.growth.staff.worker = null;
  assert.equal(productionDuration(s, 'maker', 'carrot_juice', T0), RECIPES.carrot_juice.timeMs);
  assert.equal(s.production.maker.queue[1].durationMs, RECIPES.carrot_juice.timeMs * 0.9);
  assert.equal(goodHelp(s, 'carrot_juice', next.doneAt).source.duration, RECIPES.carrot_juice.timeMs * 0.9, 'the ready tray describes its saved actual duration');
});
