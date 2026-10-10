// Chapter 6, market day (docs/plan/ch06-market-day.md): the timetable, the good of the day, double pay from the barn
// and on a truck, the deed, the baker, the scenes, the steps and the roadmap.
import './tz.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, migrate } from '../src/core/state.mjs';
import { act, tick } from '../src/core/act.mjs';
import { marketDayOf, marketGoods, marketOpen, marketBonus } from '../src/core/market-day.mjs';
import { truckOf, truckPays } from '../src/core/market.mjs';
import { MARKET_DAY, TRUCK, HANDS } from '../src/content/economy.mjs';
import { GOODS, RECIPES } from '../src/content/goods.mjs';
import { CHAPTERS, BEATS } from '../src/content/story.mjs';
import { VILLAGERS, hasArrived } from '../src/content/people.mjs';
import { posters, orderable } from '../src/core/orders.mjs';
import { journeyOf } from '../src/core/journey.mjs';
import { currentStep, stepDone } from '../src/core/projects.mjs';
import { parcelNote } from '../src/content/world.mjs';
import { personName } from '../src/content/character-names.mjs';
import { pack, unpack } from '../src/kit/save.mjs';
import { must, T0, MIN } from './helpers.mjs';

const { everyMs, lastsMs, bonus } = MARKET_DAY;
/** A farm at the start of chapter 6 (the tester's jump): level 6, a working market square, four families. */
function farm(seed = 4242) { const s = newGame(T0, seed, { restore: true }); tick(s, T0); must(s, 'testJumpChapter', { chapter: 6 }); return s; }
const types = r => r.events.map(e => e.type);
const stock = (s, items) => { s.barn.cap = 5000; Object.assign(s.barn.items, items); };

test('the first market day begins the moment the square can hold one, and the timetable is a function of the clock', () => {
  const s = farm(); assert.ok(marketOpen(s)); assert.equal(s.marketDay, undefined, 'nothing is written until the first tick');
  const r = tick(s, T0 + 1000), started = r.events.find(e => e.type === 'marketDayStarted');
  assert.ok(started, 'the day is announced'); const d = marketDayOf(s, T0 + 1000);
  assert.ok(d.open && d.active); assert.equal(d.good, started.good); assert.equal(d.bonus, bonus); assert.equal(d.endsAt, T0 + 1000 + lastsMs); assert.equal(d.nextAt, T0 + 1000 + everyMs);
  assert.equal(s.firsts.marketDay, T0 + 1000);
  // the same day after a reload, and no second announcement
  const back = unpack(pack(s)); assert.deepEqual(marketDayOf(back, T0 + 2000), marketDayOf(s, T0 + 2000));
  assert.ok(!types(tick(back, T0 + 3000)).includes('marketDayStarted'));
  // it ends after lastsMs (told once), and the next one comes round after everyMs with its own number
  assert.ok(marketDayOf(s, T0 + 1000 + lastsMs - 1).active); assert.ok(!marketDayOf(s, T0 + 1000 + lastsMs).active);
  const end = tick(s, T0 + 1000 + lastsMs + 5); assert.deepEqual(end.events.filter(e => e.type === 'marketDayEnded').map(e => e.good), [d.good]);
  assert.ok(!types(tick(s, T0 + 1000 + lastsMs + 9000)).includes('marketDayEnded'));
  const next = tick(s, T0 + 1000 + everyMs + 5); assert.ok(types(next).includes('marketDayStarted')); assert.equal(marketDayOf(s, T0 + 1000 + everyMs + 5).n, d.n + 1);
  // a long time away: the day that passed meanwhile is simply over, the one running now is announced
  const away = tick(s, T0 + 1000 + 50 * everyMs + 7); assert.equal(away.events.filter(e => e.type === 'marketDayStarted').length, 1);
});
test('the good of the day is something this farm can make, worth selling, and stays the same all day', () => {
  for (const seed of [1, 22, 333, 4242, 55555]) {
    const s = farm(seed), can = new Set(orderable(s));
    assert.ok(marketGoods(s).every(g => can.has(g) && GOODS[g].kind !== 'fish' && GOODS[g].value >= MARKET_DAY.minValue));
    for (let k = 0; k < 12; k++) {
      const at = T0 + 1000 + k * everyMs; tick(s, at); const d = marketDayOf(s, at);
      assert.ok(d.active, `day ${k}`); assert.ok(marketGoods(s).includes(d.good), `${d.good} cannot be made (seed ${seed}, day ${k})`);
    }
  }
  const s = farm(); tick(s, T0 + 1000); const good = marketDayOf(s, T0 + 1000).good;
  s.level = 20; s.placed.bk = { kind: 'bakery', x: 40, z: 60, rot: 0 }; s.counts.bakery = 1;   // the farm changes during the day
  assert.equal(marketDayOf(s, T0 + 1000 + lastsMs - 1).good, good);
  // a farm that makes nothing worth the minimum still gets a market day with what it has
  const poor = farm(7); poor.level = 6; for (const id of Object.keys(poor.placed)) if (poor.placed[id].kind === 'coop') delete poor.animals[id];
  assert.ok(marketGoods(poor).length > 0);
});
test('the next market day\'s good is promised a day ahead, differs from today\'s, and is kept if the farm can still make it', () => {
  const s = farm(); tick(s, T0 + 1000); const d = marketDayOf(s, T0 + 1000);
  assert.ok(d.nextGood && marketGoods(s).includes(d.nextGood)); assert.notEqual(d.nextGood, d.good);
  assert.equal(marketDayOf(s, T0 + 1000 + lastsMs + 5).nextGood, d.nextGood, 'still promised between the two days');
  assert.equal(unpack(pack(s)).marketDay.next, d.nextGood);
  const at = T0 + 1000 + everyMs + 5; assert.equal(marketDayOf(s, at).good, d.nextGood, 'before the tick sees the new day');
  tick(s, at); const d2 = marketDayOf(s, at); assert.equal(d2.good, d.nextGood); assert.notEqual(d2.nextGood, d2.good);
  // a promise the farm can no longer keep is replaced by something it can make
  const s2 = farm(31); tick(s2, T0 + 1000); const p = marketDayOf(s2, T0 + 1000); s2.marketDay.next = 'instant_noodles';
  const got = marketDayOf(s2, at).good; assert.ok(marketGoods(s2).includes(got)); assert.notEqual(got, 'instant_noodles'); assert.ok(p.good);
});
test('the good of the day pays double from the barn, only that good and only while the day runs', () => {
  const s = farm(); tick(s, T0 + 1000); const good = marketDayOf(s, T0 + 1000).good, other = Object.keys(GOODS).find(g => g !== good && GOODS[g].kind === 'crop');
  stock(s, { [good]: 30, [other]: 30 });
  assert.equal(marketBonus(s, good, T0 + 1000), bonus); assert.equal(marketBonus(s, other, T0 + 1000), 1);
  let coins = s.coins; const r = must(s, 'sellGood', { good, n: 4 }, T0 + 2000);
  assert.equal(r.coins, 4 * GOODS[good].value * bonus); assert.equal(s.coins, coins + r.coins); assert.equal(r.bonus, bonus);
  assert.deepEqual(r.events.filter(e => e.type === 'marketDaySale').map(e => [e.good, e.n, e.first]), [[good, 4, true]]);
  assert.equal(s.stats.marketDays, 1);
  // a second sale the same day pays double again but the day counts once
  const again = must(s, 'sellGood', { good, n: 1 }, T0 + 3000); assert.equal(again.coins, GOODS[good].value * bonus);
  assert.equal(again.events.find(e => e.type === 'marketDaySale').first, false); assert.equal(s.stats.marketDays, 1);
  coins = s.coins; const plain = must(s, 'sellGood', { good: other, n: 2 }, T0 + 3000);
  assert.equal(plain.coins, 2 * GOODS[other].value); assert.ok(!types(plain).includes('marketDaySale'));
  // after the day: the ordinary price
  const late = must(s, 'sellGood', { good, n: 2 }, T0 + 1000 + lastsMs + 1); assert.equal(late.coins, 2 * GOODS[good].value); assert.equal(late.bonus, 1);
  // the next market day counts again
  const at = T0 + 1000 + everyMs + 10; tick(s, at); const g2 = marketDayOf(s, at).good; stock(s, { [g2]: 5 });
  must(s, 'sellGood', { good: g2, n: 1 }, at); assert.equal(s.stats.marketDays, 2);
  // a refused sale on a market day leaves no trace
  const before = JSON.stringify(s), no = act(s, 'sellGood', { good: g2, n: 9999 }, at); assert.equal(no.ok, false); assert.equal(JSON.stringify(s), before);
});
test('a truck that leaves on a market day with the good of the day is paid the bonus when it is back', () => {
  const s = farm(); delete s.cond.road_south; tick(s, T0 + 1000); const at = T0 + 2000, good = marketDayOf(s, at).good, other = Object.keys(GOODS).find(g => g !== good && GOODS[g].kind === 'crop');
  stock(s, { [good]: 30, [other]: 30 });
  must(s, 'loadTruck', { good, n: 5 }, at); must(s, 'loadTruck', { good: other, n: 5 }, at);
  const u = truckOf(s), plain = 5 * GOODS[good].value + 5 * GOODS[other].value, extra = 5 * GOODS[good].value * (bonus - 1);
  assert.equal(truckPays(s, u, at), Math.round((plain + extra) * TRUCK.pay), 'the panel shows it before the truck leaves');
  const sent = must(s, 'sendTruck', {}, at);
  assert.deepEqual(sent.events.filter(e => e.type === 'marketDaySale').map(e => [e.good, e.first]), [[good, true]]); assert.equal(s.stats.marketDays, 1);
  assert.deepEqual(u.market, { good, bonus });
  // it comes home after the day is over and is still paid for the day it left on
  const home = at + Math.max(TRUCK.tripMs, lastsMs) + 1000; assert.ok(!marketDayOf(s, home).active);
  assert.equal(truckPays(s, u, home - 1), Math.round((plain + extra) * TRUCK.pay));
  const r = tick(s, home); assert.equal(r.events.find(e => e.type === 'truckBack').coins, Math.round((plain + extra) * TRUCK.pay)); assert.equal(u.market, undefined);
  // a truck sent when no market day runs gets the ordinary pay
  must(s, 'collectTruck', {}, home); must(s, 'loadTruck', { good, n: 5 }, home); const quiet = must(s, 'sendTruck', {}, home);
  assert.ok(!types(quiet).includes('marketDaySale')); assert.equal(u.market, undefined);
  const r2 = tick(s, home + TRUCK.tripMs + 1); assert.equal(r2.events.find(e => e.type === 'truckBack').coins, Math.round(5 * GOODS[good].value * TRUCK.pay));
  // a truck without the good of the day does not count the day
  const s2 = farm(9); delete s2.cond.road_south; tick(s2, T0 + 1000); const g = marketDayOf(s2, at).good, o = Object.keys(GOODS).find(k => k !== g && GOODS[k].kind === 'crop');
  stock(s2, { [o]: 10 }); must(s2, 'loadTruck', { good: o, n: 5 }, at); must(s2, 'sendTruck', {}, at); assert.equal(s2.stats.marketDays ?? 0, 0);
});
test('the hired driver earns the bonus on a market day, but only your own sale counts as the deed', () => {
  const s = farm(); delete s.cond.road_south; s.level = 12; s.coins = 5000; tick(s, T0 + 1000);
  s.placed.sch = { kind: 'school', x: 50, z: 106, rot: 2 }; s.counts.school = 1;   // hands are hired once the school stands
  assert.equal(act(s, 'hireHand', { role: 'driver' }, T0 + 1000).ok, true);
  const good = marketDayOf(s, T0 + 1000).good; s.orders.cards = []; stock(s, { [good]: 400 });
  tick(s, T0 + 2000); const at = T0 + 2000 + HANDS.everyMs + 1; assert.ok(marketDayOf(s, at).active, 'the day still runs when the hand works');
  const r = tick(s, at), u = truckOf(s);
  assert.ok(u.away, 'the driver sent the truck'); assert.deepEqual(u.market, { good, bonus });
  assert.ok(!types(r).includes('marketDaySale')); assert.equal(s.stats.marketDays ?? 0, 0, 'the deed is yours to do');
});
test('no market day below its level or while the square is broken; a save from before the chapter loads clean', () => {
  const young = newGame(T0, 4242, { restore: true }); tick(young, T0); must(young, 'testJumpChapter', { chapter: 5 }); young.level = MARKET_DAY.level - 1;
  for (const id of Object.keys(young.placed)) if (young.placed[id].kind === 'market') delete young.cond[id];
  tick(young, T0 + 1000); assert.ok(!marketOpen(young)); assert.equal(young.marketDay, undefined); assert.equal(marketDayOf(young, T0 + 1000).active, false);
  young.barn.items.pumpkin = 3; assert.equal(must(young, 'sellGood', { good: 'pumpkin', n: 1 }, T0 + 1000).coins, GOODS.pumpkin.value);
  const before = JSON.stringify(young); assert.equal(act(young, 'testMarketDay', {}, T0 + 1000).ok, false); assert.equal(JSON.stringify(young), before);
  const s = farm(); const market = Object.keys(s.placed).find(id => s.placed[id].kind === 'market'); s.cond[market] = { level: 3, ms: 0 };
  tick(s, T0 + 1000); assert.equal(s.marketDay, undefined, 'a broken square holds no market day');
  // old saves: no record is fine; a damaged one is dropped rather than trusted
  for (const bad of ['yes', [], { shift: 'x' }, { shift: -5 }, { shift: 10, n: 1.5 }, { shift: 10, good: 7 }]) {
    const old = JSON.parse(pack(farm())); old.marketDay = bad; const m = migrate(old); assert.equal(m.marketDay, undefined, JSON.stringify(bad));
  }
  const kept = JSON.parse(pack(farm())); kept.marketDay = { shift: 1000, n: 2, good: 'pumpkin', sold: 2 }; assert.deepEqual(migrate(kept).marketDay, { shift: 1000, n: 2, good: 'pumpkin', sold: 2 });
});
test('the tester can start the next market day at once', () => {
  const s = farm(); tick(s, T0 + 1000); const d = marketDayOf(s, T0 + 1000), at = T0 + 1000 + lastsMs + 60_000;
  tick(s, at); assert.ok(!marketDayOf(s, at).active);
  const r = must(s, 'testMarketDay', {}, at), now = marketDayOf(s, at);
  assert.ok(now.active); assert.equal(now.n, d.n + 1); assert.equal(r.good, now.good); assert.ok(types(r).includes('marketDayStarted')); assert.equal(now.endsAt, at + lastsMs);
  // while one runs, it moves on to the next: the old one is told as over
  const r2 = must(s, 'testMarketDay', {}, at + 5000); assert.deepEqual(types(r2).filter(t => t.startsWith('marketDay')), ['marketDayEnded', 'marketDayStarted']);
});
test('chapter 6 closes when a market day was sold on and the farm has three fields; its scenes follow their deeds', () => {
  const ch = CHAPTERS.find(c => c.id === 6), s = farm(); assert.ok(ch && ch.panels.length === 3 && ch.ada);
  assert.equal(ch.when(s), false); assert.equal(act(s, 'chapterSeen', { id: 6 }, T0).ok, false, 'not before the deed');
  tick(s, T0 + 1000); const good = marketDayOf(s, T0 + 1000).good; stock(s, { [good]: 3 }); must(s, 'sellGood', { good, n: 1 }, T0 + 1000);
  assert.equal(ch.when(s), false, 'a market day alone is half of it');
  s.coins = 99999; for (const parcel of ['1,2', '0,1']) must(s, 'buyParcel', { parcel }, T0 + 1000);
  assert.equal(ch.when(s), true); must(s, 'chapterSeen', { id: 6 }, T0 + 1000); assert.equal(s.story.chapter, 6);
  assert.ok(stepDone(s, 'market_day') && stepDone(s, 'third_field'));
  // the scenes
  const beat = id => BEATS.find(b => b.id === id), fresh = farm(11);
  for (const id of ['gus-field', 'animal-corner', 'first-butter', 'cheese-picnic', 'flour-company']) { assert.ok(beat(id), id); assert.equal(beat(id).chapter, 6); assert.equal(beat(id).when(fresh), false, `${id} before its deed`); }
  assert.ok(beat('gus-field').when(s)); assert.ok(beat('flour-company').when(s));
  fresh.placed.gb = { kind: 'goat_barn', x: 40, z: 60, rot: 0 }; assert.ok(beat('animal-corner').when(fresh));
  fresh.stats.butterMade = 1; assert.ok(beat('first-butter').when(fresh)); assert.ok(!beat('cheese-picnic').when(fresh));
  fresh.stats.cheeseMade = 1; assert.ok(beat('cheese-picnic').when(fresh));
  // an old farm that already owns three fields needs only the market day
  const old = farm(5); old.parcels.push('1,2', '0,1'); assert.equal(ch.when(old), false); old.stats.marketDays = 1; assert.equal(ch.when(old), true);
  // butter is counted where it is collected
  assert.ok(RECIPES.butter);
});
test('the baker comes with the first market day: named in four languages, at the square, no orders and no gifts', () => {
  const hugo = VILLAGERS.find(v => v.id === 'hugo'), s = farm(); assert.ok(hugo && hugo.noOrders && hugo.noGifts && hugo.idle.length >= 3);
  assert.equal(hasArrived(s, hugo), false); tick(s, T0 + 1000); assert.equal(hasArrived(s, hugo), true);
  assert.ok(!posters(s, T0 + 1000).includes('hugo'));
  assert.deepEqual(['en', 'vi', 'ko', 'ja'].map(l => personName('hugo', l, 'display')), ['Barley', 'Chú Lúa', '고소', 'こんがり']);
  // the others still arrive with their buildings
  const cora = VILLAGERS.find(v => v.id === 'cora'); assert.equal(hasArrived(s, cora), true); assert.equal(hasArrived(newGame(T0, 1), cora), false);
  assert.equal(hasArrived(s, VILLAGERS.find(v => v.id === 'ada')), true);
});
test('the checklist and the roadmap name the chapter', () => {
  const s = farm(); assert.equal(currentStep(s).id, 'market_day');
  s.house = { level: 5 }; s.hands = { field: { since: T0 } }; s.stats.cheeseMade = 1; s.album.fruit.cherry = 9;
  for (const kind of ['goat_barn', 'dairy', 'fruit_stand', 'kennel']) { s.placed[`x_${kind}`] = { kind, x: 40, z: 60, rot: 0 }; s.counts[kind] = 1; }
  let j = journeyOf(s); assert.equal(j.stage.id, 'wakes'); assert.equal(j.total, 2); assert.equal(j.done, 0);
  s.stats.marketDays = 1; j = journeyOf(s); assert.equal(j.done, 1);
  s.parcels.push('1,2', '0,1'); j = journeyOf(s); assert.equal(j.stage.id, 'streets', 'the stage after it');
  assert.equal(parcelNote('3,1'), 'East meadow: room for goats and a dairy'); assert.equal(parcelNote('1,0'), 'North field: nearest the brook');
  assert.equal(parcelNote('1,3'), 'South field: close to the village street'); assert.equal(parcelNote('1,1'), 'Open field: room for anything');
});
