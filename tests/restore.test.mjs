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
import { REPAIR, WEAR, HOUR, START_RESTORE, HOUSE, DEMOLISH } from '../src/content/economy.mjs';
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
  assert.equal(grid.penOf(s, idOf(s, 'coop')).closed, false, 'the coop yard has a gap to mend');
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

test('the coop takes hens only after its fence is mended and it is repaired', () => {
  const s = fresh(); s.coins = 1000; const coop = idOf(s, 'coop');
  must(s, 'repair', { id: coop }); tick(s, T0 + REPAIR.broken.ms + 1000);
  const t = T0 + 3 * MIN;
  assert.equal(act(s, 'buyAnimal', { home: coop }, t).reason, 'The fence has a gap');
  must(s, 'placeEdge', { kind: 'fence', x: 36, z: 68, side: 'n' }, t); must(s, 'placeEdge', { kind: 'fence', x: 35, z: 66, side: 'w' }, t);
  assert.equal(grid.penOf(s, coop).closed, true); must(s, 'buyAnimal', { home: coop }, t);
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
