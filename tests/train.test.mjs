// Chapter 15, the evening train (docs/plan/ch15-the-evening-train.md): the halt on a lot of the quay, the train's
// timetable (also over the time the game was shut), its three wagons, loading, what it pays when it leaves, the chapter.
import './tz.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/core/state.mjs';
import { act, tick } from '../src/core/act.mjs';
import { trainOf, makeWagons, wagonFull, wagonPays, trainPays, haltBuilt } from '../src/core/train.mjs';
import { lotPlan, onLot } from '../src/core/riverside.mjs';
import { TRAIN } from '../src/content/economy.mjs';
import { BUILDINGS } from '../src/content/buildings.mjs';
import { GOODS } from '../src/content/goods.mjs';
import { TRACK, LOTS } from '../src/content/world.mjs';
import { CHAPTERS, BEATS } from '../src/content/story.mjs';
import { resolveNames } from '../src/content/character-names.mjs';
import { stepDone } from '../src/core/projects.mjs';
import { reportOf } from '../src/core/report.mjs';
import { pack, unpack } from '../src/kit/save.mjs';
import { must, T0, MIN } from './helpers.mjs';

const { everyMs, stopMs, firstMs, pay, bonus } = TRAIN, def = BUILDINGS.halt;
/** A farm at the start of chapter 15 (the tester's jump): the quay house and the hotel stand. */
function farm(seed = 4242) {
  const s = newGame(T0, seed, { restore: true }); tick(s, T0); must(s, 'testJumpChapter', { chapter: 15 });
  s.coins = 90000; s.barn.cap = 9000; return s;
}
/** Build the halt and bring the first train in: returns the time it arrived. */
function withTrain(s, lot = 'q7') { must(s, 'buildOnLot', { lot, kind: 'halt' }); tick(s, T0); tick(s, T0 + firstMs); assert.ok(s.train.here, 'the first train is in'); return T0 + firstMs; }
const fill = (s, i, at) => { const w = s.train.here.wagons[i]; s.barn.items[w.good] = (s.barn.items[w.good] ?? 0) + (w.need - w.have); return must(s, 'loadWagon', { wagon: i }, at); };
const ch = CHAPTERS.find(c => c.id === 15);

test('the halt is a riverside building: one, on any free lot; the railway runs behind the lots', () => {
  assert.ok(def.lot && def.max === 1); assert.deepEqual(def.size, [6, 5]); assert.ok(LOTS.every(l => l.z > TRACK.z), 'the track is north of every lot');
  const s = farm(); assert.equal(haltBuilt(s), false); assert.equal(trainOf(s, T0).built, false); assert.equal(act(s, 'loadWagon', { wagon: 0 }, T0).reason, 'Build the railway halt first');
  s.level = def.level - 1; assert.equal(lotPlan(s, 'q7', 'halt').reason, 'Reach level {level} first'); s.level = def.level;
  const id = must(s, 'buildOnLot', { lot: 'q5', kind: 'halt' }).id; assert.equal(onLot(s, 'q5'), id); assert.ok(haltBuilt(s) && stepDone(s, 'halt'));
  assert.equal(lotPlan(s, 'q7', 'halt').reason, 'The quay has all of these it can hold'); assert.ok(BEATS.find(b => b.id === 'rails-cleared').when(s));
  tick(s, T0); assert.deepEqual(s.train, { nextAt: T0 + firstMs, n: 0, here: null }); assert.equal(act(s, 'loadWagon', { wagon: 0 }, T0).reason, 'No train is at the halt');
});
test('the train comes soon after the halt opens, waits, leaves, and comes again; three wagons, seeded', () => {
  const s = farm(), w0 = makeWagons(s, 0);
  assert.equal(w0.length, TRAIN.wagons); assert.equal(new Set(w0.map(w => w.good)).size, TRAIN.wagons); assert.deepEqual(makeWagons(s, 0), w0);
  for (const w of w0) { assert.ok(GOODS[w.good] && !['feed', 'fish'].includes(GOODS[w.good].kind)); assert.ok(w.need >= TRAIN.min && w.need <= TRAIN.max); assert.equal(w.have, 0); }
  must(s, 'buildOnLot', { lot: 'q7', kind: 'halt' }); tick(s, T0);
  assert.ok(!tick(s, T0 + firstMs - 1).events.some(e => e.type === 'trainArrived'));
  const came = tick(s, T0 + firstMs).events.filter(e => e.type === 'trainArrived'); assert.equal(came.length, 1); assert.ok(came[0].first && came[0].n === 0 && came[0].until === T0 + firstMs + stopMs);
  let tr = trainOf(s, T0 + firstMs); assert.ok(tr.here && tr.wagons.length === 3); assert.equal(tr.leavesAt, T0 + firstMs + stopMs); assert.equal(tr.nextAt, T0 + firstMs + everyMs); assert.deepEqual(tr.wagons, w0);
  assert.ok(BEATS.find(b => b.id === 'first-whistle').when(s));
  const back = unpack(pack(s)); assert.deepEqual(back.train, s.train, 'the train at the halt survives a reload');
  assert.ok(!tick(s, T0 + firstMs + stopMs - 1).events.some(e => e.type === 'trainLeft'));
  const left = tick(s, T0 + firstMs + stopMs).events.find(e => e.type === 'trainLeft'); assert.deepEqual([left.n, left.coins, left.full, left.all], [0, 0, 0, false], 'an empty train costs nothing');
  assert.equal(s.stats.trains ?? 0, 0); assert.equal(trainOf(s, T0 + firstMs + stopMs).here, false); assert.equal(s.train.nextAt, T0 + firstMs + everyMs);
  const again = tick(s, T0 + firstMs + everyMs).events.find(e => e.type === 'trainArrived'); assert.ok(again && again.n === 1 && !again.first);
});
test('loading: from the barn, never more than a wagon holds; nothing is taken when it cannot be', () => {
  const s = farm(), at = withTrain(s), [a] = s.train.here.wagons; s.barn.items = {};
  const before = JSON.stringify(s);
  for (const [payload, why] of [[{ wagon: 0 }, 'Missing goods'], [{ wagon: 9 }, 'The train has no such wagon'], [{ wagon: 'x' }, 'The train has no such wagon'], [{}, 'The train has no such wagon'], [{ wagon: 0, n: 0 }, 'Unknown amount'], [{ wagon: 0, n: -3 }, 'Unknown amount']])
    assert.equal(act(s, 'loadWagon', payload, at).reason, why, JSON.stringify(payload));
  assert.equal(JSON.stringify(s), before);
  s.barn.items[a.good] = 4; let r = must(s, 'loadWagon', { wagon: 0, n: 3 }, at); assert.equal(r.loaded, 3); assert.equal(s.barn.items[a.good], 1); assert.equal(a.have, 3); assert.equal(r.full, false);
  r = must(s, 'loadWagon', { wagon: 0 }, at); assert.equal(r.loaded, 1, 'all that is in the barn');
  s.barn.items[a.good] = a.need + 50; r = must(s, 'loadWagon', { wagon: 0, n: a.need + 50 }, at); assert.equal(r.loaded, a.need - 4); assert.ok(r.full && wagonFull(a)); assert.equal(s.barn.items[a.good], 54);
  assert.ok(r.events.some(e => e.type === 'wagonLoaded' && e.full)); assert.equal(act(s, 'loadWagon', { wagon: 0 }, at).reason, 'That wagon is full');
  assert.equal(act(s, 'loadWagon', { wagon: 1 }, at + stopMs).reason, 'No train is at the halt', 'not after its time, even before the tick');
});
test('what the train pays when it leaves: a full wagon best, a part-loaded one what is in it, three full ones a bonus; once', () => {
  const s = farm(), at = withTrain(s), [a, b, c] = s.train.here.wagons;
  fill(s, 0, at); s.barn.items[b.good] = (s.barn.items[b.good] ?? 0) + 2; must(s, 'loadWagon', { wagon: 1, n: 2 }, at);
  assert.equal(wagonPays(a), Math.round(a.need * GOODS[a.good].value * pay)); assert.equal(wagonPays(b), 2 * GOODS[b.good].value); assert.equal(wagonPays(c), 0);
  assert.ok(wagonPays(a) > a.need * GOODS[a.good].value, 'the train pays better than the barn door');
  const due = trainPays(s.train.here); assert.deepEqual([due.full, due.all], [1, false]); assert.equal(due.coins, wagonPays(a) + wagonPays(b)); assert.equal(trainOf(s, at).pays.coins, due.coins);
  const coins = s.coins, earned = s.stats.coinsEarned, out = tick(s, at + stopMs).events, left = out.find(e => e.type === 'trainLeft');
  assert.deepEqual([left.coins, left.full, left.all, left.bonus], [due.coins, 1, false, 0]); assert.equal(s.coins, coins + due.coins); assert.equal(s.stats.coinsEarned, earned + due.coins);
  assert.equal(s.stats.trains, 1); assert.equal(ch.when(s), true); assert.ok(stepDone(s, 'first_train'));
  assert.equal(reportOf(s).rows.find(([k]) => k === 'train')?.[1], due.coins, 'the evening sums know it was the train');
  assert.ok(!tick(s, at + stopMs + 5000).events.some(e => e.type === 'trainLeft')); assert.equal(s.coins, coins + due.coins, 'paid once');
  // the next train: all three wagons full
  const at2 = at + everyMs; tick(s, at2); assert.ok(s.train.here && s.train.here.n === 1); for (let i = 0; i < 3; i++) fill(s, i, at2);
  const full = trainPays(s.train.here); assert.ok(full.all); assert.equal(full.coins, s.train.here.wagons.reduce((sum, w) => sum + wagonPays(w), 0) + bonus);
  const l2 = tick(s, at2 + stopMs).events.find(e => e.type === 'trainLeft'); assert.deepEqual([l2.all, l2.bonus, l2.coins], [true, bonus, full.coins]); assert.equal(s.stats.trains, 2);
  assert.ok(s.firsts.fullTrain); assert.ok(BEATS.find(x => x.id === 'full-train').when(s));
});
test('trains that came while the game was shut left empty; one that is still waiting is found at the halt', () => {
  const s = farm(), at = withTrain(s); fill(s, 0, at);
  // three days later: the loaded train left on time and was paid; the ones after it left empty; none is counted twice
  const coins = s.coins, due = wagonPays(s.train.here.wagons[0]), later = at + 3 * 24 * 60 * MIN + 7 * MIN, out = tick(s, later).events;
  assert.equal(out.filter(e => e.type === 'trainLeft').length, 1); assert.equal(s.coins, coins + due); assert.equal(s.stats.trains, 1);
  assert.ok(s.train.n > 1, 'the missed trains are numbered past'); assert.ok(s.train.nextAt > later - everyMs && (s.train.here ? s.train.here.until > later : s.train.nextAt > later - stopMs));
  // open the game in the middle of a stop: that train is there, with the time it has left
  const t = farm(7); must(t, 'buildOnLot', { lot: 'q7', kind: 'halt' }); tick(t, T0);
  const mid = T0 + firstMs + 5 * everyMs + stopMs / 2, came = tick(t, mid).events.filter(e => e.type === 'trainArrived');
  assert.equal(came.length, 1); assert.equal(t.train.here.at, T0 + firstMs + 5 * everyMs); assert.equal(t.train.here.until, T0 + firstMs + 5 * everyMs + stopMs); assert.equal(t.train.here.n, 5);
  assert.equal(t.stats.trains ?? 0, 0);
});
test('chapter 15 closes when a train has left with a full wagon; a tester need not wait for the timetable', () => {
  assert.ok(ch && ch.panels.length === 3 && ch.ada); const en = resolveNames(ch.text, 'en'); assert.ok(en.length <= 340, `${en.length} letters`); assert.match(en, /Dash/);
  for (const id of ['rails-cleared', 'first-whistle', 'full-train']) assert.equal(BEATS.find(b => b.id === id).chapter, 15);
  const s = farm(9); assert.equal(ch.when(s), false); must(s, 'buildOnLot', { lot: 'q7', kind: 'halt' }); tick(s, T0); assert.equal(ch.when(s), false);
  must(s, 'testFinishTimers', {}, T0 + 1000); tick(s, T0 + 2000); assert.ok(s.train.here, '"Finish every timer" brings the train');
  fill(s, 1, T0 + 2000); must(s, 'testFinishTimers', {}, T0 + 3000); const out = tick(s, T0 + 4000).events;
  assert.ok(out.some(e => e.type === 'trainLeft' && e.full === 1)); assert.equal(ch.when(s), true);
  const t = newGame(T0, 3, { restore: true }); tick(t, T0); const r = must(t, 'testJumpChapter', { chapter: 16 });
  assert.deepEqual(r.missing, []); assert.equal(t.story.chapter, 15); assert.ok(haltBuilt(t) && ch.when(t));
  const u = farm(11); must(u, 'testFinishChapter', {}); assert.ok(ch.when(u) && haltBuilt(u));
});
