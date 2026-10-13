// Surprises (core/surprises.mjs, docs/plan/96-surprises.md): they only add, every roll is seeded and has a ceiling.
import './tz.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/core/state.mjs';
import { act, tick } from '../src/core/act.mjs';
import { pack, unpack } from '../src/kit/save.mjs';
import { nextHen, luckyFinds, rushActive, rushStatus, houseRent, normalizeSurprises, produceOf } from '../src/core/surprises.mjs';
import { SURPRISES, LUCKY_FINDS, LUCKY_GOODS, HEN_EGGS } from '../src/content/surprises.mjs';
import { GOODS, ANIMALS } from '../src/content/goods.mjs';
import { TRUCK, MIN, HOUR } from '../src/content/economy.mjs';
import { rentWaiting, rentPerHour } from '../src/core/homes.mjs';
import { orderable } from '../src/core/orders.mjs';
import { ICONS } from '../src/content/icons.mjs';

const T0 = 1_800_000_000_000;
function farm(seed = 11) {
  const s = newGame(T0, seed, { restore: true }); tick(s, T0); s.level = 20; s.coins = 1_000_000; s.barn.cap = 50_000; s.orders.cards = []; s.cond = {};
  return s;
}
const must = (s, name, arg = {}, now = T0) => { const r = act(s, name, arg, now); assert.equal(r.ok, true, `${name}: ${r.reason}`); return r; };
const put = (s, id, kind, x, z) => { s.placed[id] = { kind, x, z, rot: 0 }; s.counts[kind] = (s.counts[kind] ?? 0) + 1; return id; };
/** Play for `ms`, a minute a tick, from `from`; returns the events and the clock. */
function play(s, from, ms) { const events = []; let now = from; for (let left = ms; left > 0; left -= MIN) { now += Math.min(MIN, left); events.push(...tick(s, now).events); } return { events, now }; }
const found = (s, id) => luckyFinds(s).find(f => f.id === id).at != null;

test('rare hens: the first four are plain; then seeded, a black one by the twelfth without, a rainbow one by the thirtieth; they lay their own eggs', () => {
  const H = SURPRISES.hens;
  for (const seed of [1, 2, 3, 11, 99]) {
    const s = farm(seed); for (let i = 0; i < 5; i++) put(s, `c${i}`, 'coop', 30 + i * 3, 60);
    const got = []; let dry = 0, worst = 0;
    for (let n = 1; n <= 36; n++) {
      const home = `c${Math.floor((n - 1) / 8)}`, want = nextHen(s), r = must(s, 'buyAnimal', { home });
      assert.equal(r.variant ?? null, want, 'the roll is the one foretold'); got.push(want);
      if (n <= H.after) assert.equal(want, null, `hen ${n} of a new farm is plain`);
      dry = want ? 0 : dry + 1; worst = Math.max(worst, dry);
    }
    assert.ok(worst < H.blackBy, `seed ${seed}: ${worst} hens without a rare one`);
    assert.equal(got.filter(v => v === 'rainbow').length, 1, `seed ${seed}: one rainbow hen, no more`); assert.ok(got.indexOf('rainbow') < H.rainbowBy);
    assert.ok(found(s, 'black_hen') && found(s, 'rainbow_hen'));
  }
  const s = farm(); put(s, 'cp', 'coop', 30, 60); s.animals.cp = [{ kind: 'hen', doneAt: T0 }, { kind: 'hen', doneAt: T0, variant: 'black' }, { kind: 'hen', doneAt: T0, variant: 'rainbow' }];
  must(s, 'collect', { home: 'cp' }); assert.deepEqual([s.barn.items.egg, s.barn.items.black_egg, s.barn.items.rainbow_egg], [1, 1, 1]);
  assert.equal(produceOf({ kind: 'cow' }), 'milk'); assert.ok(GOODS.black_egg.value > GOODS.egg.value && GOODS.rainbow_egg.value > GOODS.black_egg.value);
  assert.ok(!orderable(s).some(g => LUCKY_GOODS[g]), 'no order asks for a lucky good'); for (const g of Object.values(HEN_EGGS)) assert.ok(ICONS[g], `${g} has no icon`);
  assert.equal(unpack(pack(s)).animals.cp[2].variant, 'rainbow');
});

test('play time is counted a minute a tick at most; a jumped clock earns none of it', () => {
  const s = farm(); assert.equal(s.stats.playMs ?? 0, 0);
  tick(s, T0 + 30_000); assert.equal(s.stats.playMs, 30_000); tick(s, T0 + 30_000 + 10 * HOUR); assert.equal(s.stats.playMs, 30_000, 'absence earns no play time');
  tick(s, T0); assert.equal(s.stats.playMs, 30_000, 'a clock set back takes nothing away');
  tick(s, T0 + 1000); assert.equal(s.stats.playMs, 31_000, 'normal play resumes immediately');
});

test('the herd grows: a forest goat after play time with a goat, a calf with two cows; two extra in a full barn at most', () => {
  const s = farm(), H = SURPRISES.herd; put(s, 'gb', 'goat_barn', 30, 60); put(s, 'cb', 'cow_barn', 36, 60);
  let { events, now } = play(s, T0, 20 * MIN); assert.ok(!events.some(e => e.type === 'herdGrew'), 'an empty barn draws nobody');
  s.animals.gb = Array.from({ length: ANIMALS.goat.perHome }, () => ({ kind: 'goat', doneAt: null })); s.animals.cb = [{ kind: 'cow', doneAt: null }];
  ({ events, now } = play(s, now, H.goat[0] + MIN)); assert.equal(events.filter(e => e.type === 'herdGrew' && e.find === 'wild_goat').length, 1);
  assert.equal(s.animals.gb.length, ANIMALS.goat.perHome + 1, 'she stays although the barn is full'); assert.ok(s.animals.gb.at(-1).wild && found(s, 'wild_goat'));
  assert.ok(!events.some(e => e.find === 'calf'), 'one cow has no calf'); s.animals.cb.push({ kind: 'cow', doneAt: null });
  ({ events, now } = play(s, now, H.calf[0] + MIN)); assert.equal(events.filter(e => e.find === 'calf').length, 1); assert.ok(Number.isSafeInteger(s.animals.cb.at(-1).bornAt) && found(s, 'calf'));
  ({ events, now } = play(s, now, 3 * HOUR)); assert.equal(s.animals.gb.length, ANIMALS.goat.perHome + H.extra); assert.equal(s.animals.cb.length, 2 + H.extra, 'two calves and no more');
  const back = unpack(pack(s)); assert.deepEqual(back.surprises.goat, s.surprises.goat); assert.equal(back.animals.gb.at(-1).wild, true);
});

test('the gold rush: it waits for a tenant, comes by the third roll, doubles the rent of its minutes, and the brook can be panned twelve times', () => {
  const s = farm(), R = SURPRISES.rush; let { events, now } = play(s, T0, 60 * MIN);
  assert.ok(!events.some(e => e.type === 'rushBegan'), 'a rush with nobody to let a room to');
  put(s, 'h1', 'cottage', 60, 100); s.homes.h1 = { family: 'tran', level: 0, arrivesAt: T0, rentFrom: now, wishes: [], arrived: true };
  ({ events, now } = play(s, now, (R.by + 1) * R.everyMs + MIN)); const began = events.filter(e => e.type === 'rushBegan');
  assert.ok(began.length >= 1, 'no rush in three rolls'); assert.ok(found(s, 'gold_rush'));
  // a fresh rush, measured exactly
  s.surprises.rush = { from: now, until: now + R.lastsMs, pans: 0, panAt: 0 }; s.homes.h1.rentFrom = now; assert.ok(rushActive(s, now));
  const rate = rentPerHour(s, 'h1'); assert.ok(rate > 0);
  assert.equal(rentWaiting(s, now + R.lastsMs), Math.floor(rate * R.lastsMs / HOUR * R.rent), 'doubled while it runs');
  assert.equal(rentWaiting(s, now + R.lastsMs + HOUR), Math.floor(rate * (R.lastsMs * R.rent + HOUR) / HOUR), 'and plain after it');
  let at = now, coins = s.coins, total = 0;
  for (let i = 0; i < R.pans; i++) { const r = must(s, 'panGold', {}, at); assert.ok(r.coins >= R.coins[0] && r.coins <= R.coins[1]); total += r.coins; assert.equal(act(s, 'panGold', {}, at).ok, false, 'no second pan at once'); at += R.panMs; }
  assert.equal(s.coins, coins + total); assert.equal(act(s, 'panGold', {}, at).ok, false, 'a thirteenth pan'); assert.equal(rushStatus(s, at).pansLeft, 0); assert.ok(found(s, 'gold_pan'));
  assert.equal(act(s, 'panGold', {}, now + R.lastsMs + 1).ok, false); assert.ok(!rushActive(s, now + R.lastsMs + 1));
  const end = tick(s, now + R.lastsMs + 1000).events.filter(e => e.type === 'rushEnded').length; assert.equal(end, 1); assert.equal(tick(s, now + R.lastsMs + 2000).events.filter(e => e.type === 'rushEnded').length, 0, 'told twice');
  must(s, 'collectRent', {}, now + R.lastsMs + 3000); assert.equal(s.surprises.rush, null, 'a finished rush is forgotten once its rent is in');
});

test('two gifts by letter: the uncle’s house after an hour of play pays rent into the mailbox; the hundredth trip brings a truck, or coins for a full fleet', () => {
  const s = farm(), H = SURPRISES.house; let { now } = play(s, T0, H.afterMs - 2 * MIN);
  assert.ok(!s.mail.some(m => m.id === 'uncle-house')); ({ now } = play(s, now, 3 * MIN));
  assert.ok(s.mail.some(m => m.id === 'uncle-house'), 'no letter after an hour'); assert.equal(houseRent(s, now + HOUR), 0, 'the house before the letter is read');
  const r = must(s, 'readLetter', { id: 'uncle-house' }, now); assert.ok(r.events.some(e => e.type === 'houseInherited')); assert.ok(found(s, 'uncle_house'));
  assert.equal(houseRent(s, now + HOUR), H.perHour); assert.equal(houseRent(s, now + 100 * HOUR), H.perHour * H.capHours);
  const coins = s.coins; must(s, 'collectRent', {}, now + 2 * HOUR); assert.ok(s.coins >= coins + 2 * H.perHour); assert.equal(houseRent(s, now + 2 * HOUR), 0);
  assert.equal(act(s, 'readLetter', { id: 'uncle-house' }, now).reward && Object.keys(act(s, 'readLetter', { id: 'uncle-house' }, now).reward).length, 0); assert.equal(s.surprises.house, now, 'inherited once');
  // the truck
  s.stats.trips = SURPRISES.truck.trips - 1; tick(s, now + 3 * HOUR); assert.ok(!s.mail.some(m => m.id === 'bea-truck'));
  s.stats.trips = SURPRISES.truck.trips; tick(s, now + 3 * HOUR + 1000); assert.ok(s.mail.some(m => m.id === 'bea-truck'));
  const fleet = s.truck.fleet.length; must(s, 'readLetter', { id: 'bea-truck' }, now + 4 * HOUR); assert.equal(s.truck.fleet.length, fleet + 1); assert.ok(found(s, 'gift_truck'));
  const full = farm(5); full.truck.fleet = Array.from({ length: TRUCK.fleet.max - 1 }, () => ({ away: false, backAt: 0, load: [], coins: 0 })); full.stats.trips = 100; tick(full, T0 + 1000);
  const c = full.coins; must(full, 'readLetter', { id: 'bea-truck' }, T0 + 2000); assert.equal(full.truck.fleet.length, TRUCK.fleet.max - 1); assert.equal(full.coins, c + SURPRISES.truck.coins);
});

test('the album lists every find once, each with words and an icon; saved surprises are cleaned on load', () => {
  assert.equal(new Set(LUCKY_FINDS.map(f => f.id)).size, LUCKY_FINDS.length);
  for (const f of LUCKY_FINDS) { for (const k of ['name', 'hint', 'text']) assert.ok(f[k].length > 4, `${f.id}.${k}`); assert.ok(ICONS[f.icon], `${f.id}: no icon ${f.icon}`); }
  const clean = normalizeSurprises({ surprises: { found: { calf: 5, bogus: 6, gold_pan: 'x' }, hens: -3, rare: 2.5, goat: { at: 7, n: 99 }, rush: { from: 9, until: 3 }, house: 'yes', truck: 4 } });
  assert.deepEqual(clean.found, { calf: 5 }); assert.equal(clean.hens, 0); assert.equal(clean.rare, 0); assert.deepEqual(clean.goat, { at: 7, n: SURPRISES.herd.extra }); assert.equal(clean.rush, null); assert.equal(clean.house, null); assert.equal(clean.truck, 4);
  assert.equal(luckyFinds(farm()).filter(f => f.at != null).length, 0);
});
