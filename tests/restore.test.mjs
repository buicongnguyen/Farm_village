// Version 0.3 "Restore Hollowbrook": the village that is already there, repairs, gentle wear, demolishing, the farmhouse.
import './tz.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, migrate, SAVE_VERSION } from '../src/core/state.mjs';
import { act, tick } from '../src/core/act.mjs';
import * as grid from '../src/core/grid.mjs';
import { currentStep } from '../src/core/projects.mjs';
import { repairCost, levelOf, isWorking, worstWorn } from '../src/core/condition.mjs';
import { rentPerHour } from '../src/core/homes.mjs';
import { GOODS } from '../src/content/goods.mjs';
import { REPAIR, WEAR, HOUR, START_RESTORE, HOUSE, DEMOLISH, TRUCK, FISH } from '../src/content/economy.mjs';
import { T0, MIN } from './helpers.mjs';

const fresh = () => { const s = newGame(T0, 4242, { restore: true }); tick(s, T0); return s; };
const must = (s, a, p, now = T0) => { const r = act(s, a, p, now); assert.equal(r.ok, true, `${a} refused: ${r.reason}`); return r; };
const idOf = (s, kind, n = 0) => Object.keys(s.placed).filter(id => s.placed[id].kind === kind)[n];
/** Play time: many one-second ticks (a long single tick counts as at most WEAR.tickCapMs). */
function play(s, from, ms, step = 60_000) { let t = from; for (; t < from + ms; t += step) tick(s, t); return t; }

test('a new game opens on the village as it stands: things are there, many run down, some money to start', () => {
  const s = fresh();
  assert.equal(s.mode, 'restore'); assert.equal(s.coins, START_RESTORE.coins); assert.equal(s.house.level, 1);
  assert.equal(s.counts.bed, 6); assert.equal(Object.keys(s.beds).length, 6, 'six beds are sown');
  for (const k of ['feed_mill', 'coop', 'bakery']) assert.equal(levelOf(s, idOf(s, k)), 3, `${k} starts broken`);
  assert.equal(s.counts.cottage, 3); for (const id of Object.keys(s.homes)) { assert.equal(levelOf(s, id), 3); assert.equal(s.homes[id].family, null); }
  assert.equal(levelOf(s, 'road_south'), 3); assert.equal(levelOf(s, 'house'), 1, 'the farmhouse is a little worn');
  assert.equal(currentStep(s).id, 'mill_coop'); assert.equal(s.story.tutorial, 0);
  // every door reaches the road, so nothing is cut off before the player has done anything
  for (const id of Object.keys(s.placed)) { const p = s.placed[id], door = grid.doorCell(p.kind, p.x, p.z, p.rot); if (door) assert.ok(grid.reachesRoad(s, ...door), `${p.kind} door cut off`); }
  assert.equal(grid.penOf(s, idOf(s, 'coop')).closed, true, 'the coop yard is whole');
});

test('broken things do not work: no recipes, no animals, no families, no orders for what cannot be made', () => {
  const s = fresh(); s.level = 5; s.coins = 5000;
  assert.equal(act(s, 'produce', { building: idOf(s, 'feed_mill'), recipe: 'chicken_feed' }, T0).reason, 'It needs repairs first');
  assert.equal(act(s, 'buyAnimal', { home: idOf(s, 'coop') }, T0).reason, 'It needs repairs first');
  assert.ok(!Object.values(s.homes).some(h => h.family));
});

test('repair: coins and a short wait, then it works; the project steps follow the repairs', () => {
  const s = fresh(); s.coins = 1000;
  const mill = idOf(s, 'feed_mill'), coop = idOf(s, 'coop');
  const cost = repairCost(s, mill), before = s.coins;
  const r = must(s, 'repair', { id: mill }); assert.equal(r.cost, cost); assert.equal(s.coins, before - cost);
  assert.equal(act(s, 'repair', { id: mill }, T0).reason, 'It is being repaired');
  assert.equal(isWorking(s, mill), false, 'not working while the repair runs');
  tick(s, T0 + REPAIR.broken.ms - 1000); assert.equal(isWorking(s, mill), false);
  tick(s, T0 + REPAIR.broken.ms + 1000); assert.equal(isWorking(s, mill), true);
  assert.equal(currentStep(s).id, 'mill_coop', 'the coop is still to do');
  must(s, 'repair', { id: coop }, T0 + 2 * MIN); const t = T0 + 2 * MIN + REPAIR.broken.ms + 1000; tick(s, t);
  assert.equal(currentStep(s).id, 'cottage1', 'both repaired: the next project');
  assert.equal(act(s, 'repair', { id: mill }, t).reason, 'Nothing to repair');
});

test('the coop takes hens once it is repaired (no fence work in the restored village)', () => {
  const s = fresh(); s.coins = 1000; const coop = idOf(s, 'coop');
  assert.equal(act(s, 'buyAnimal', { home: coop }, T0 + 1000).ok, false, 'broken');
  must(s, 'repair', { id: coop }); tick(s, T0 + REPAIR.broken.ms + 1000);
  must(s, 'buyAnimal', { home: coop }, T0 + 3 * MIN);
});

test('a repaired cottage welcomes the next family; the second cottage waits for its bread', () => {
  const s = fresh(); s.coins = 5000; s.level = 6;
  for (const k of ['feed_mill', 'coop']) must(s, 'repair', { id: idOf(s, k) });
  let t = T0 + REPAIR.broken.ms + 1000; tick(s, t);
  const [c1, c2] = Object.keys(s.homes);
  must(s, 'repair', { id: c1 }, t);
  assert.equal(act(s, 'repair', { id: c2 }, t).ok, false, 'one cottage at a time: the second waits for its project');
  t += REPAIR.broken.ms + 1000; tick(s, t);
  assert.equal(s.homes[c1].family, 'tran'); tick(s, t + 3 * MIN); assert.equal(s.homes[c1].arrived, true);
  assert.equal(currentStep(s).id, 'cottage2');
  assert.equal(act(s, 'repair', { id: c2 }, t + 4 * MIN).ok, false, 'the bread for the Okafors first');
  s.barn.items.bread = 5; must(s, 'projectDeliver', {}, t + 4 * MIN);
  must(s, 'repair', { id: c2 }, t + 4 * MIN);
});

test('wear is very gentle: only play time counts, it never stops anything, a few percent of rent, one tap to repair', () => {
  const s = fresh(); s.coins = 9000; s.level = 6;
  for (const k of ['feed_mill', 'coop']) must(s, 'repair', { id: idOf(s, k) });
  let t = T0 + REPAIR.broken.ms + 1000; tick(s, t);
  const c1 = Object.keys(s.homes)[0]; must(s, 'repair', { id: c1 }, t); t += REPAIR.broken.ms + 1000; tick(s, t); tick(s, t + 3 * MIN); t += 3 * MIN;
  const fine = rentPerHour(s, c1);
  // a day away (one big tick) adds at most one capped step of wear
  const ms0 = s.cond[c1]?.ms ?? 0; tick(s, t + 24 * HOUR); assert.ok((s.cond[c1]?.ms ?? 0) - ms0 <= WEAR.tickCapMs, 'time away is not play time');
  // three hours of play: worn
  t = play(s, t + 24 * HOUR, WEAR.ms[0] + HOUR, 60_000);
  assert.equal(levelOf(s, c1), 1, 'worn after hours of play');
  assert.ok(Math.abs(rentPerHour(s, c1) - fine * (1 - WEAR.rent)) < fine * 0.02, 'a few percent less rent');
  assert.equal(isWorking(s, c1), true, 'a worn cottage still works'); assert.equal(isWorking(s, idOf(s, 'feed_mill')), true);
  // many more hours: shabby at most, never broken
  t = play(s, t, 30 * HOUR, 120_000);
  assert.ok([1, 2].includes(levelOf(s, c1)) && levelOf(s, c1) < 3, 'shabby at worst, never broken');
  const cost = repairCost(s, c1), coins = s.coins; assert.ok(cost > 0 && cost <= 30, `a small repair bill (${cost})`);
  must(s, 'repair', { id: c1 }, t); assert.equal(levelOf(s, c1), 0); assert.equal(s.coins, coins - cost);
});

test('old games and empty starts do not wear: wear belongs to the restored village', () => {
  const s = newGame(T0, 7); tick(s, T0); s.counts.cottage = 1; play(s, T0, 12 * HOUR); assert.deepEqual(s.cond, {});
});

test('demolish gives part of the price back and a rebuild credit; building it again costs half; it cannot hurt what is in use', () => {
  const s = fresh(); s.coins = 2000; s.level = 6;
  const bakery = idOf(s, 'bakery'), price = 150;
  const r = must(s, 'demolish', { id: bakery }); assert.equal(r.refund, Math.floor(price * DEMOLISH.refund));
  assert.equal(s.placed[bakery], undefined); assert.equal(s.counts.bakery, 0); assert.equal(levelOf(s, bakery), 0); assert.equal(s.rebuild.bakery, 1);
  assert.equal(act(s, 'demolish', { id: bakery }, T0).reason, 'Nothing to demolish');
  // the farm's mill must be repaired before the bakery opens up: do it, then rebuild the bakery cheaply
  for (const k of ['feed_mill', 'coop']) must(s, 'repair', { id: idOf(s, k) });
  const t = T0 + REPAIR.broken.ms + 1000; tick(s, t);
  const coins = s.coins; must(s, 'place', { kind: 'bakery', x: 40, z: 64, rot: 2 }, t);
  assert.equal(coins - s.coins, Math.round(price * DEMOLISH.rebuild), 'half price from the credit'); assert.equal(s.rebuild.bakery, 0);
  // a bed with a crop, and a cottage with a family, are refused
  assert.equal(act(s, 'demolish', { id: Object.keys(s.beds)[0] }, t).reason, 'Harvest the crop first');
  assert.equal(act(s, 'demolish', { id: 'zz' }, t).reason, 'Nothing to demolish');
});

test('the farmhouse can be repaired and upgraded; each level adds barn room', () => {
  const s = fresh(); s.coins = 5000; s.level = 8;
  const cap = s.barn.cap;
  must(s, 'repair', { id: 'house' }); assert.equal(levelOf(s, 'house'), 0, 'a worn house is mended at once');
  must(s, 'upgradeHouse', {}); assert.equal(s.house.level, 2); assert.equal(s.barn.cap, cap + HOUSE.barn);
  must(s, 'upgradeHouse', {}); assert.equal(s.house.level, 3);
  assert.equal(act(s, 'upgradeHouse', {}, T0).reason, 'Already the best it can be');
  const t = fresh(); t.level = 1; t.coins = 5000;
  assert.equal(act(t, 'upgradeHouse', {}, T0).reason, 'Reach level {level} first');
});

test('a neighbour sometimes mends something on a visit: a repair under way, else the worn thing, never a duty', async () => {
  const { neighbourFix } = await import('../src/core/condition.mjs');
  const ctxOf = s => { const events = []; return { s, now: T0 + 1000, events, emit: (type, d) => events.push({ type, ...d }) }; };
  let mended = 0, none = 0;
  for (let visit = 1; visit <= 60; visit++) {
    const s = fresh(); s.coins = 5000; act(s, 'repair', { id: idOf(s, 'feed_mill') }, T0);
    const ctx = ctxOf(s), id = neighbourFix(ctx, 'mai', visit);
    if (id) { mended++; assert.equal(id, idOf(s, 'feed_mill'), 'the repair under way finishes first'); assert.ok(isWorking(s, id)); assert.ok(ctx.events.some(e => e.type === 'neighbourRepair')); } else none++;
  }
  assert.ok(mended > 10 && none > 10, `sometimes, not always: ${mended} of 60`);
  // nothing to mend, nothing happens
  const s = fresh(); s.cond = {}; s.repairing = {}; assert.equal(neighbourFix(ctxOf(s), 'mai', 1), null);
  // a worn thing is mended when no repair is going on
  const w = fresh(); w.cond = { house: { level: 2, ms: 9 * HOUR } }; assert.equal(worstWorn(w), 'house');
  let got = null; for (let v = 1; v < 60 && !got; v++) { const c = ctxOf(w); got = neighbourFix(c, 'gus', v); } assert.equal(got, 'house'); assert.equal(levelOf(w, 'house'), 0);
  // deterministic: the same visit, the same answer
  const a = fresh(), b = fresh(); assert.equal(neighbourFix(ctxOf(a), 'mai', 7), neighbourFix(ctxOf(b), 'mai', 7));
});

test('v2 saves migrate to the current version without gaining a restored village', () => {
  const old = newGame(T0, 5); old.version = 2; delete old.cond; delete old.repairing; delete old.rebuild; delete old.house; delete old.mode;
  const m = migrate(JSON.parse(JSON.stringify(old)));
  assert.equal(m.version, SAVE_VERSION); assert.deepEqual(m.cond, {}); assert.deepEqual(m.repairing, {}); assert.deepEqual(m.rebuild, {});
  assert.equal(m.mode ?? null, null); assert.equal(Object.keys(m.placed).length, 0);
});

test('the market truck: needs a repaired market and street; load, send, come back with a bonus; bigger trucks carry more', () => {
  const s = fresh(); s.coins = 5000; s.level = 6; s.barn.items.wheat = 100;
  const market = idOf(s, 'market'); assert.equal(levelOf(s, market), 3, 'the market starts broken');
  assert.equal(act(s, 'loadTruck', { good: 'wheat', n: 5 }, T0).ok, false);
  must(s, 'repair', { id: market }); tick(s, T0 + REPAIR.broken.ms + 1000);
  assert.equal(act(s, 'loadTruck', { good: 'wheat', n: 5 }, T0 + 100_000).ok, false, 'the street is still broken');
  must(s, 'repair', { id: 'road_south' }, T0 + 100_000); let t = T0 + 100_000 + REPAIR.broken.ms + 1000; tick(s, t);
  const before = s.barn.items.wheat; must(s, 'loadTruck', { good: 'wheat', n: 5 }, t);
  assert.equal(s.barn.items.wheat, before - 5); assert.equal(act(s, 'sendTruck', {}, t + 1).ok, true);
  assert.equal(act(s, 'loadTruck', { good: 'wheat', n: 1 }, t + 2).ok, false, 'away');
  tick(s, t + 10_000); assert.equal(s.truck.away, true);
  tick(s, t + TRUCK.tripMs + 1); assert.equal(s.truck.away, false); assert.ok(s.truck.coins >= 5 * GOODS.wheat.value);
  const coins = s.coins; must(s, 'collectTruck', {}, t + TRUCK.tripMs + 2); assert.ok(s.coins > coins); assert.equal(s.truck.coins, 0);
  must(s, 'loadTruck', { good: 'wheat', n: 99 }, t + TRUCK.tripMs + 3); assert.equal(s.truck.load[0].n, TRUCK.capacity[0]);
  assert.equal(act(s, 'sendTruck', {}, t + TRUCK.tripMs + 4).ok, true);
  assert.equal(act(s, 'upgradeTruck', {}, t + TRUCK.tripMs + 5).ok, true); assert.equal(s.truck.level, 2);
});

test('the next-task chip names the most useful thing: ripe things first, then orders, repairs, empty beds', async () => {
  const { nextTask } = await import('../src/core/next.mjs');
  const s = fresh(); s.coins = 500;
  assert.ok(['Harvest the ripe crops', 'Deliver an order', 'Repair a broken building'].includes(nextTask(s, T0).key), nextTask(s, T0).key);
  for (const b of Object.values(s.beds)) b.doneAt = T0 + 1e6;
  const bedId = idOf(s, 'bed'); s.beds[bedId].doneAt = T0 - 1;
  assert.equal(nextTask(s, T0).key, 'Harvest the ripe crops'); assert.deepEqual(nextTask(s, T0).at, { x: s.placed[bedId].x, z: s.placed[bedId].z });
});

test('the fish pond: there at the start; cast, wait, reel in a fish that sells; bait is quicker; fishing villagers leave fees', () => {
  const s = fresh(); assert.equal(s.counts.pond, 1); assert.equal(isWorking(s, idOf(s, 'pond')), true);
  const t0 = T0 + 1000;
  must(s, 'castLine', {}, t0); assert.equal(act(s, 'castLine', {}, t0 + 1).reason, 'The line is already in the water');
  assert.equal(act(s, 'reelIn', {}, t0 + 1000).reason, 'Nothing is biting yet');
  const r = must(s, 'reelIn', {}, t0 + FISH.waitMs + 1); assert.ok(GOODS[r.fish] && GOODS[r.fish].kind === 'fish'); assert.equal(s.barn.items[r.fish], 1);
  s.barn.items.chicken_feed = 2; must(s, 'castLine', { bait: true }, t0 + FISH.waitMs + 2); assert.equal(s.barn.items.chicken_feed, 1);
  assert.ok(s.fishing.line.doneAt - (t0 + FISH.waitMs + 2) === FISH.baitMs);
  // a family that has moved in leaves a fee
  const home = Object.keys(s.homes)[0]; s.homes[home].family = 'tran'; s.homes[home].arrivesAt = T0; s.homes[home].arrived = true;
  tick(s, t0 + 2000); tick(s, t0 + 2000 + FISH.feeMs + 1000); assert.ok(s.fishing.coins > 0);
  const c = s.coins; must(s, 'collectFees', {}, t0 + 3000 + FISH.feeMs); assert.ok(s.coins > c);
});

test('goals: three live quests, claimable when done; favours take goods; the weekly goal and the hurry token work', async () => {
  const s = fresh(); s.coins = 500; tick(s, T0 + 1000);
  assert.equal(s.quests.list.length, 3);
  const q = s.quests.list.find(x => !x.favour); assert.ok(q, 'a counter goal');
  assert.equal(act(s, 'claimQuest', { id: q.id }, T0 + 2000).reason, 'Not finished yet');
  s.stats[(await import('../src/content/quests.mjs')).QUESTS[q.t].stat] = (s.stats[(await import('../src/content/quests.mjs')).QUESTS[q.t].stat] ?? 0) + q.n;
  const coins = s.coins; must(s, 'claimQuest', { id: q.id }, T0 + 2000); assert.ok(s.coins > coins); assert.equal(s.stats.questsDone, 1);
  tick(s, T0 + 3000); assert.equal(s.quests.list.length, 3, 'a new goal takes its place');
  // hurry: one free token a day finishes a growing bed
  const bed = idOf(s, 'bed'); s.beds[bed].doneAt = T0 + 1e6;
  must(s, 'hurry', { id: bed }, T0 + 4000); assert.ok(s.beds[bed].doneAt <= T0 + 4000);
  const bed2 = idOf(s, 'bed', 1); s.beds[bed2].doneAt = T0 + 1e6; assert.equal(act(s, 'hurry', { id: bed2 }, T0 + 5000).reason, 'No hurry left today');
  assert.equal(act(s, 'hurry', { id: idOf(s, 'coop') }, T0 + 5000).ok, false);
  // the weekly goal pays a coin prize and one more hurry
  const w = s.weekly; assert.ok(w); const { WEEKLY } = await import('../src/content/quests.mjs'); s.stats[WEEKLY[w.i].stat] = (s.stats[WEEKLY[w.i].stat] ?? 0) + WEEKLY[w.i].n;
  must(s, 'claimWeekly', {}, T0 + 6000); assert.equal(act(s, 'claimWeekly', {}, T0 + 6000).reason, 'Already claimed');
  must(s, 'hurry', { id: bed2 }, T0 + 7000);
});

test('an older save gets the pond and the market square; the player can be named and dressed', () => {
  const s = newGame(T0, 7); s.version = 3; delete s.fishing; s.counts = {}; s.placed = { p1: { kind: 'bed', x: 33, z: 58, rot: 0 } }; s.counts.bed = 1;
  const up = migrate(JSON.parse(JSON.stringify(s))); tick(up, T0 + 1000); assert.equal(up.version, SAVE_VERSION); assert.ok(up.fishing && up.quests);
  assert.ok((up.counts.pond ?? 0) + (up.counts.market ?? 0) >= 1, 'a pond or a market found room');
  const g = fresh(); must(g, 'setting', { key: 'playerName', value: '<b>Mina</b>' }); assert.equal(g.settings.playerName, 'bMina/b');
  must(g, 'setting', { key: 'playerColor', value: '#3a86ff' }); assert.equal(act(g, 'setting', { key: 'playerColor', value: '#000' }).ok, false);
  must(g, 'setting', { key: 'playerBody', value: 'woman' });
});
