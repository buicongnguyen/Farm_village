// Act IV groundwork and chapter 13 (docs/plan/act4-far-bank.md, ch13-the-far-bank.md): the quay and its lots on the far
// bank, paving, building on a lot, the quay house's rent and the families who come back, the keeper, the chapter.
import './tz.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/core/state.mjs';
import { act, tick } from '../src/core/act.mjs';
import { quayOf, quayPlan, lotPlan, onLot, freeLots, riversideKinds, quayRent, returnedFamilies } from '../src/core/riverside.mjs';
import { RIVERSIDE } from '../src/content/economy.mjs';
import { BUILDINGS } from '../src/content/buildings.mjs';
import { QUAY, LOTS, OLD_MILL, inQuay, inRiverside, inTowpath, lotAt, isBrook, isRoad, inOldMill, brookZ, N } from '../src/content/world.mjs';
import { rentWaiting } from '../src/core/homes.mjs';
import { stepCost, findRoute } from '../src/core/walk.mjs';
import { CHAPTERS, BEATS } from '../src/content/story.mjs';
import { LETTERS } from '../src/content/letters.mjs';
import { VILLAGERS, hasArrived } from '../src/content/people.mjs';
import { giftable } from '../src/core/bonds.mjs';
import { resolveNames } from '../src/content/character-names.mjs';
import { stepDone } from '../src/core/projects.mjs';
import { journeyOf } from '../src/core/journey.mjs';
import * as grid from '../src/core/grid.mjs';
import { pack, unpack } from '../src/kit/save.mjs';
import { must, T0, MIN } from './helpers.mjs';

const { rent, rentMs, cap } = RIVERSIDE.house, house = BUILDINGS.apartment;
/** A farm at the start of chapter 13 (the tester's jump): chapter 12 seen, the towpath open. */
function farm(seed = 4242) {
  const s = newGame(T0, seed, { restore: true }); tick(s, T0); must(s, 'testJumpChapter', { chapter: 13 });
  s.coins = 60000; s.barn.cap = 5000; return s;
}
const ch = CHAPTERS.find(c => c.id === 13);

test('the riverside: a quay two cells wide east of the old mill, seven lots north of it, dry and apart', () => {
  assert.equal(LOTS.length, 7); assert.deepEqual(LOTS.map(l => l.id), ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7']);
  const seen = new Set();
  for (const l of LOTS) {
    assert.deepEqual([l.w, l.d], house.size); assert.equal(l.z + l.d, QUAY.z0, `${l.id}: its front is on the quay`);
    for (let z = l.z; z < l.z + l.d; z++) for (let x = l.x; x < l.x + l.w; x++) {
      const k = `${x},${z}`; assert.ok(!seen.has(k), `${l.id} overlaps another lot at ${k}`); seen.add(k);
      assert.ok(x >= 0 && x < N && z >= 1, `${k} is off the map or on the railway's row`); assert.ok(!isBrook(x, z) && !isRoad(x, z) && !inOldMill(x, z) && !inQuay(x, z), `${k}`);
      assert.equal(lotAt(x, z), l); assert.ok(inRiverside(x, z));
    }
  }
  for (let i = 1; i < LOTS.length; i++) assert.equal(LOTS[i].x - (LOTS[i - 1].x + LOTS[i - 1].w), 2, 'a lane two cells wide between lots');
  for (let x = QUAY.x0; x <= QUAY.x1; x++) for (let z = QUAY.z0; z <= QUAY.z1; z++) { assert.ok(!isBrook(x, z) && !inOldMill(x, z), `quay ${x},${z}`); assert.ok(inRiverside(x, z)); }
  assert.ok(QUAY.x0 > OLD_MILL.box.x1, 'the quay begins east of the mill'); assert.ok(inTowpath(QUAY.x0, QUAY.z0) && inTowpath(QUAY.x0, QUAY.z1), 'and meets the towpath there');
  for (let x = QUAY.x0; x <= QUAY.x1; x++) assert.ok(!inRiverside(x, brookZ(x) - 1) && inRiverside(x, brookZ(x) - 2), `the strand ends at the water at ${x}`);
  assert.ok(!inRiverside(QUAY.x0 - 1, 3) && !inRiverside(50, 0));
});
test('paving the quay: after the towpath is open, at its level, for its price, once', () => {
  const early = newGame(T0, 3, { restore: true }); tick(early, T0); must(early, 'testJumpChapter', { chapter: 12 }); early.coins = 60000;
  assert.equal(quayPlan(early).reason, 'The towpath gate is still shut'); assert.equal(act(early, 'paveQuay', {}, T0).ok, false);
  assert.equal(lotPlan(early, 'q1', 'apartment').reason, 'Pave the quay first');
  const s = farm(); assert.deepEqual(quayOf(s), { open: true, paved: false });
  assert.equal(stepCost(s, 60, 6), 0, 'nobody walks the quay before it is paved'); assert.equal(stepCost(s, 60, 3), 0);
  s.level = RIVERSIDE.quay.level - 1; assert.equal(quayPlan(s).reason, 'Reach level {level} first');
  s.level = RIVERSIDE.quay.level; s.coins = RIVERSIDE.quay.cost - 1; assert.equal(quayPlan(s).reason, 'Not enough coins');
  const before = JSON.stringify(s); assert.equal(act(s, 'paveQuay', {}, T0).ok, false); assert.equal(JSON.stringify(s), before);
  s.coins = RIVERSIDE.quay.cost + 7; const r = must(s, 'paveQuay', {}); assert.equal(s.coins, 7); assert.equal(s.firsts.quay, T0);
  assert.ok(r.events.some(e => e.type === 'quayPaved' && e.lots === 7)); assert.ok(stepDone(s, 'quay')); assert.ok(BEATS.find(b => b.id === 'quay-paved').when(s));
  assert.equal(act(s, 'paveQuay', {}, T0).reason, 'The quay is paved already');
  // the quay and the whole zone can be walked now, and the way there is over the towpath
  assert.equal(stepCost(s, 60, 6), 1); assert.ok(stepCost(s, 60, 3) > 0 && stepCost(s, 53, 2) > 0 && stepCost(s, 70, 9) > 0);
  assert.ok(findRoute(s, [40, 63], [80, 6], { exact: true }).length > 20);
  assert.equal(freeLots(s).length, 7); assert.equal(unpack(pack(s)).firsts.quay, T0);
});
test('a riverside building stands on a free lot and nowhere else; it is never moved, stored or taken down', () => {
  assert.equal(riversideKinds()[0], 'apartment'); assert.ok(riversideKinds().every(k => BUILDINGS[k].lot && BUILDINGS[k].cat === 'projects')); assert.ok(house.lot && house.flats === 4 && house.max === 3);
  const s = farm(); must(s, 'paveQuay', {});
  assert.equal(grid.canPlace(s, 'apartment', 40, 60, 0).reason, 'It belongs on a lot on the quay'); assert.equal(act(s, 'place', { kind: 'apartment', x: 40, z: 60 }, T0).ok, false);
  assert.equal(grid.canPlace(s, 'bench', LOTS[0].x, LOTS[0].z, 0).ok, false, 'nothing else goes on a lot'); assert.equal(grid.canPlace(s, 'path', 60, 6, 0).ok, false, 'or on the quay');
  assert.equal(lotPlan(s, 'q9', 'apartment').reason, 'Unknown item'); assert.equal(lotPlan(s, 'q1', 'bench').reason, 'Unknown item'); assert.equal(lotPlan(s, 'q1', 'toString').reason, 'Unknown item');
  s.level = house.level - 1; assert.equal(lotPlan(s, 'q1', 'apartment').reason, 'Reach level {level} first');
  s.level = house.level; s.coins = house.cost - 1; assert.equal(lotPlan(s, 'q1', 'apartment').reason, 'Not enough coins');
  const before = JSON.stringify(s); assert.equal(act(s, 'buildOnLot', { lot: 'q1', kind: 'apartment' }, T0).ok, false); assert.equal(JSON.stringify(s), before);
  s.coins = house.cost * 4;
  const r = must(s, 'buildOnLot', { lot: 'q3', kind: 'apartment' }), id = r.id, p = s.placed[id];
  assert.deepEqual([p.kind, p.x, p.z, p.rot, p.lot], ['apartment', LOTS[2].x, LOTS[2].z, 0, 'q3']); assert.equal(s.coins, house.cost * 3); assert.equal(onLot(s, 'q3'), id);
  assert.ok(r.events.some(e => e.type === 'placed' && e.lot === 'q3')); assert.equal(grid.occupant(s, LOTS[2].x + 5, LOTS[2].z + 4), id); assert.equal(stepCost(s, LOTS[2].x + 2, LOTS[2].z + 2), 0);
  assert.deepEqual(grid.doorCell('apartment', p.x, p.z, p.rot), [LOTS[2].x + 3, QUAY.z0], 'its door opens on the quay');
  assert.equal(lotPlan(s, 'q3', 'apartment').reason, 'This lot is taken'); assert.equal(freeLots(s).length, 6);
  assert.equal(act(s, 'move', { id, x: LOTS[0].x, z: LOTS[0].z, rot: 0 }, T0).ok, false); assert.equal(act(s, 'store', { id }, T0).ok, false);
  assert.equal(act(s, 'demolish', { id }, T0).reason, 'Buildings on the quay stay where they are'); assert.ok(s.placed[id]);
  must(s, 'buildOnLot', { lot: 'q1', kind: 'apartment' }); must(s, 'buildOnLot', { lot: 'q2', kind: 'apartment' });
  assert.equal(lotPlan(s, 'q4', 'apartment').reason, 'The quay has all of these it can hold'); assert.equal(s.counts.apartment, 3);
  const back = unpack(pack(s)); assert.equal(onLot(back, 'q3'), id); assert.equal(back.placed[id].lot, 'q3');
});
test('a quay house brings four families back and pays rent into the mailbox, a payment at a time, up to its cap', () => {
  const s = farm(); must(s, 'paveQuay', {}); for (const h of Object.values(s.homes)) h.rentFrom = T0;   // the cottages' own rent starts now
  assert.equal(returnedFamilies(s), 0); const base = () => rentWaiting(s, T0) - quayRent(s, T0);
  const r = must(s, 'buildOnLot', { lot: 'q1', kind: 'apartment' }), id = r.id;
  assert.equal(returnedFamilies(s), 4); assert.ok(r.events.some(e => e.type === 'familiesReturned' && e.count === 4 && e.total === 4));
  assert.deepEqual(s.flats[id], { rentFrom: T0 }); assert.equal(quayRent(s, T0 + rentMs - 1), 0); assert.equal(quayRent(s, T0 + rentMs), rent); assert.equal(quayRent(s, T0 + 3.5 * rentMs), 3 * rent);
  assert.equal(quayRent(s, T0 + 99 * rentMs), cap * rent, 'the box holds so much and no more');
  const at = T0 + 3.5 * rentMs, cottages = rentWaiting(s, at) - quayRent(s, at), coins = s.coins;
  const got = must(s, 'collectRent', {}, at); assert.equal(got.coins, cottages + 3 * rent); assert.equal(s.coins, coins + cottages + 3 * rent);
  assert.equal(quayRent(s, at), 0); assert.equal(quayRent(s, at + 0.5 * rentMs), rent, 'the half payment already waited for is kept');
  must(s, 'collectRent', {}, T0 + 200 * rentMs); assert.equal(s.flats[id].rentFrom, T0 + 200 * rentMs, 'a full box starts again from now');
  must(s, 'buildOnLot', { lot: 'q2', kind: 'apartment' }, T0 + 200 * rentMs); assert.equal(returnedFamilies(s), 8); assert.equal(quayRent(s, T0 + 201 * rentMs), 2 * rent);
  const back = unpack(pack(s)); assert.equal(quayRent(back, T0 + 201 * rentMs), 2 * rent); assert.equal(returnedFamilies(back), 8);
});
test('the keeper of the quay comes with the first quay house; she takes no orders and no gifts, and passes on two letters', () => {
  const keeper = VILLAGERS.find(v => v.id === 'tuyet'); assert.ok(keeper && keeper.noOrders && keeper.noGifts && keeper.idle.length >= 4);
  const s = farm(); must(s, 'paveQuay', {}); assert.equal(hasArrived(s, keeper), false);
  must(s, 'buildOnLot', { lot: 'q1', kind: 'apartment' }); assert.equal(hasArrived(s, keeper), true); assert.ok(!giftable(s, T0).includes('tuyet'));
  const hers = LETTERS.filter(l => l.from === 'tuyet'); assert.deepEqual(hers.map(l => l.id), ['tuyet-1', 'tuyet-2']);
  for (const l of hers) { assert.deepEqual(l.when, { type: 'count', key: 'apartment', value: 1 }); assert.match(resolveNames(l.text, 'en'), /Nana Snow$/); }
  tick(s, T0 + 1000); assert.ok((s.mail ?? []).some(m => m.id === 'tuyet-1'), 'her first letter is in the mailbox');
});
test('chapter 13 closes when the first quay house stands; the roadmap has the far bank, and the tester can jump past it', () => {
  assert.ok(ch && ch.panels.length === 3 && ch.ada); const en = resolveNames(ch.text, 'en'); assert.ok(en.length <= 340, `${en.length} letters`); assert.match(en, /Nana Snow/);
  for (const id of ['quay-paved', 'tuyet-list']) assert.equal(BEATS.find(b => b.id === id).chapter, 13);
  const s = farm(); assert.equal(ch.when(s), false); let j = journeyOf(s);
  must(s, 'paveQuay', {}); assert.equal(ch.when(s), false); must(s, 'buildOnLot', { lot: 'q5', kind: 'apartment' }); assert.equal(ch.when(s), true); assert.ok(stepDone(s, 'quay_house'));
  assert.equal(BEATS.find(b => b.id === 'tuyet-list').when(s), false); must(s, 'chapterSeen', { id: 13 }); assert.ok(BEATS.find(b => b.id === 'tuyet-list').when(s));
  // the roadmap: a played farm that has done Act III is on the far bank's stage
  const t = newGame(T0, 3, { restore: true }); tick(t, T0); const r = must(t, 'testJumpChapter', { chapter: 14 });
  assert.deepEqual(r.missing, []); assert.equal(t.story.chapter, 13); assert.ok(t.firsts.quay && onLot(t, 'q1') && ch.when(t)); assert.equal(returnedFamilies(t), 4);
  t.house = { level: 5 }; t.stats.cheeseMade = 1; t.album.fruit.cherry = 9; for (const kind of ['goat_barn', 'dairy', 'fruit_stand', 'kennel']) { t.placed[`x_${kind}`] = { kind, x: 2, z: 2, rot: 0 }; t.counts[kind] = 1; }
  j = journeyOf(t); assert.equal(j.stage.id, 'farbank'); assert.ok(j.milestones.filter(m => ['quay', 'quayHouse'].includes(m.test)).every(m => m.done), 'this chapter\'s two deeds are done');
  const u = farm(5); must(u, 'testFinishChapter', {}); assert.ok(ch.when(u) && u.firsts.quay);
  const v = farm(6); v.house = t.house; v.stats.cheeseMade = 1; v.album.fruit.cherry = 9; for (const kind of ['goat_barn', 'dairy', 'fruit_stand', 'kennel']) { v.placed[`x_${kind}`] = { kind, x: 2, z: 2, rot: 0 }; v.counts[kind] = 1; }
  j = journeyOf(v); assert.equal(j.stage.id, 'farbank'); assert.deepEqual(j.milestones.map(m => m.test).slice(0, 2), ['quay', 'quayHouse']); assert.equal(j.done, 0);
});
