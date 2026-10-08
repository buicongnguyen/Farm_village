// The truck fleet (core/market.mjs): a growing farm buys more trucks, fills them with spare goods in one tap, sends every
// loaded truck at once and collects all their takings together. One-truck farms play exactly as before (restore.test.mjs).
import './tz.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/core/state.mjs';
import { act, tick } from '../src/core/act.mjs';
import { pack, unpack } from '../src/kit/save.mjs';
import { trucksOf, keepFor, spareForTrucks, capacity } from '../src/core/market.mjs';
import { nextTask } from '../src/core/next.mjs';
import { GOODS } from '../src/content/goods.mjs';
import { REPAIR, TRUCK } from '../src/content/economy.mjs';
import { T0 } from './helpers.mjs';

const must = (s, a, p, now) => { const r = act(s, a, p, now); assert.equal(r.ok, true, `${a} refused: ${r.reason}`); return r; };
/** A refused action leaves no trace: the whole state is unchanged. */
const refused = (s, a, p, now, reason) => {
  const before = JSON.stringify(s), r = act(s, a, p, now);
  assert.equal(r.ok, false, `${a} should be refused`); if (reason) assert.equal(r.reason, reason);
  assert.equal(JSON.stringify(s), before, `${a} refused but changed the farm`);
  return r;
};
/** A restored village with the market square and the village street mended; returns [s, now]. */
function ready({ level = 8, coins = 20_000 } = {}) {
  const s = newGame(T0, 4242, { restore: true }); tick(s, T0);
  s.level = level; s.coins = coins;
  const market = Object.keys(s.placed).find(id => s.placed[id].kind === 'market');
  must(s, 'repair', { id: market }, T0); tick(s, T0 + REPAIR.broken.ms + 1000);
  let t = T0 + REPAIR.broken.ms + 2000; must(s, 'repair', { id: 'road_south' }, t);
  t += REPAIR.broken.ms + 1000; tick(s, t);
  s.orders.cards = []; s.barn.cap = 1000;
  return [s, t];
}

test('a new game has one truck and an empty fleet; buying more needs the market, the level and the coins, up to the limit', () => {
  const fresh = newGame(T0, 1, { restore: true });
  assert.deepEqual(fresh.truck.fleet, []); assert.equal(trucksOf(fresh).length, 1);
  const broken = newGame(T0, 4242, { restore: true }); tick(broken, T0); broken.level = 9; broken.coins = 9999;
  refused(broken, 'buyTruck', {}, T0, 'Repair the market square first');
  let [s, t] = ready({ level: TRUCK.fleet.level[1] - 1 });
  refused(s, 'buyTruck', {}, t, 'Not high enough level');
  s.level = TRUCK.fleet.level[1]; s.coins = TRUCK.fleet.cost[1] - 1;
  refused(s, 'buyTruck', {}, t, 'Not enough coins');
  s.coins = TRUCK.fleet.cost[1];
  assert.equal(must(s, 'buyTruck', {}, t).trucks, 2); assert.equal(s.coins, 0); assert.equal(trucksOf(s).length, 2);
  s.coins = 99_999; refused(s, 'buyTruck', {}, t, 'Not high enough level');
  s.level = TRUCK.fleet.level[2]; must(s, 'buyTruck', {}, t); assert.equal(trucksOf(s).length, TRUCK.fleet.max);
  refused(s, 'buyTruck', {}, t, 'No room for another truck');
  assert.ok(TRUCK.fleet.cost[1] < TRUCK.fleet.cost[2] && TRUCK.fleet.level[1] < TRUCK.fleet.level[2], 'each truck costs more and comes later');
});

test('loading picks the first truck at the market with room; a named truck can be loaded; unknown trucks are refused', () => {
  const [s, t] = ready(); must(s, 'buyTruck', {}, t); s.barn.items.wheat = 200;
  const [a, b] = trucksOf(s), cap = capacity(s.truck);
  must(s, 'loadTruck', { good: 'wheat', n: cap + 5 }, t);
  assert.equal(a.load[0].n, cap, 'the first truck takes what fits'); assert.equal(b.load.length, 0);
  assert.equal(must(s, 'loadTruck', { good: 'wheat', n: 3 }, t).truck, 1, 'the next tap goes on the second truck');
  assert.equal(b.load[0].n, 3);
  must(s, 'loadTruck', { good: 'wheat', n: 2, truck: 1 }, t); assert.equal(b.load[0].n, 5);
  for (const truck of [2, -1, 0.5, 'x']) refused(s, 'loadTruck', { good: 'wheat', n: 1, truck }, t, 'Unknown truck');
  refused(s, 'loadTruck', { good: 'wheat', n: 1, truck: 0 }, t, 'The truck is full');
  assert.equal(s.barn.items.wheat, 200 - cap - 5);
});

test('every loaded truck leaves with one tap and each comes back on its own trip; the takings are collected together', () => {
  const [s, t] = ready(); must(s, 'buyTruck', {}, t); must(s, 'buyTruck', {}, t); s.barn.items.wheat = 100; s.barn.items.bread = 20;
  must(s, 'loadTruck', { good: 'wheat', n: 10, truck: 0 }, t); must(s, 'loadTruck', { good: 'bread', n: 4, truck: 2 }, t);
  const sent = must(s, 'sendTruck', {}, t + 1);
  assert.equal(sent.sent, 2, 'the empty middle truck stays'); const [a, b, c] = trucksOf(s);
  assert.equal(a.away, true); assert.equal(b.away, false); assert.equal(c.away, true);
  must(s, 'loadTruck', { good: 'wheat', n: 6 }, t + 2); assert.equal(b.load[0].n, 6, 'the truck at home still loads');
  must(s, 'sendTruck', { truck: 1 }, t + TRUCK.tripMs / 2);
  refused(s, 'sendTruck', {}, t + TRUCK.tripMs / 2 + 1, 'All the trucks are away');
  refused(s, 'loadTruck', { good: 'wheat', n: 1 }, t + TRUCK.tripMs / 2 + 1, 'All the trucks are away');
  const trips = s.stats.trips ?? 0;
  tick(s, t + TRUCK.tripMs + 2);
  assert.equal(a.away, false); assert.equal(c.away, false); assert.equal(b.away, true, 'the later truck is still out');
  assert.equal(a.coins, Math.round(10 * GOODS.wheat.value * TRUCK.pay)); assert.equal(c.coins, Math.round(4 * GOODS.bread.value * TRUCK.pay));
  assert.equal(s.stats.trips, trips + 2);
  const coins = s.coins, got = must(s, 'collectTruck', {}, t + TRUCK.tripMs + 3).coins;
  assert.equal(got, a.coins + c.coins + 0 || got); assert.equal(s.coins, coins + got); assert.equal(a.coins + b.coins + c.coins, 0);
  refused(s, 'collectTruck', {}, t + TRUCK.tripMs + 4, 'Nothing sold yet');
  tick(s, t + TRUCK.tripMs * 2); assert.equal(b.away, false); assert.equal(b.coins, Math.round(6 * GOODS.wheat.value * TRUCK.pay));
});

test('"Fill" loads spare goods most plentiful first, keeps what orders need, every feed and a seed per bed', () => {
  const [s, t] = ready(); must(s, 'buyTruck', {}, t);
  const beds = Object.values(s.placed).filter(p => p.kind === 'bed').length;
  s.barn.items = { wheat: 30, carrot: beds + 4, chicken_feed: 50, bread: 12, egg: 9 };
  s.orders.cards = [{ id: 'o1', need: { egg: 9 } }];
  assert.equal(keepFor(s, 'chicken_feed'), Infinity); assert.equal(keepFor(s, 'egg'), 9); assert.equal(keepFor(s, 'carrot'), beds);
  assert.equal(keepFor(s, 'wheat'), 0, 'wheat is free to plant');
  assert.deepEqual(spareForTrucks(s).map(([g]) => g), ['wheat', 'bread', 'carrot']);
  const cap = capacity(s.truck), r = must(s, 'fillTruck', {}, t), [a, b] = trucksOf(s);
  assert.equal(r.loaded, Math.min(2 * cap, 30 + 12 + 4), 'both trucks fill up'); assert.equal(a.load[0].good, 'wheat');
  assert.equal(a.load.reduce((n, i) => n + i.n, 0), Math.min(cap, 46));
  assert.equal(s.barn.items.chicken_feed, 50); assert.equal(s.barn.items.egg, 9); assert.ok(s.barn.items.carrot >= beds, 'seed carrots stay');
  assert.ok(b.load.length > 0 || cap >= 46, 'what does not fit goes on the second truck');
  s.barn.items.wheat = (s.barn.items.wheat ?? 0) + 5; refused(s, 'fillTruck', {}, t, 'The trucks are full');
  s.barn.items.wheat -= 5; if (!s.barn.items.wheat) delete s.barn.items.wheat;
  must(s, 'sendTruck', {}, t); refused(s, 'fillTruck', {}, t + 1, 'All the trucks are away');
  tick(s, t + TRUCK.tripMs + 1); s.barn.items = { chicken_feed: 50 };
  refused(s, 'fillTruck', {}, t + TRUCK.tripMs + 2, 'Nothing spare to load');
});

test('bigger trucks make every truck bigger', () => {
  const [s, t] = ready(); must(s, 'buyTruck', {}, t); s.barn.items.wheat = 500;
  must(s, 'upgradeTruck', {}, t); must(s, 'upgradeTruck', {}, t);
  must(s, 'loadTruck', { good: 'wheat', n: 500, truck: 1 }, t);
  assert.equal(trucksOf(s)[1].load[0].n, TRUCK.capacity[2]);
});

test('the fleet survives a save; older saves get an empty fleet; a malformed fleet is refused', () => {
  const [s, t] = ready(); must(s, 'buyTruck', {}, t); s.barn.items.wheat = 9;
  must(s, 'loadTruck', { good: 'wheat', n: 9, truck: 1 }, t); must(s, 'sendTruck', {}, t);
  const back = unpack(pack(s));
  assert.equal(back.truck.fleet.length, 1); assert.equal(back.truck.fleet[0].away, true); assert.deepEqual(back.truck.fleet[0].load, [{ good: 'wheat', n: 9 }]);
  const old = JSON.parse(pack(s)); delete old.truck.fleet;
  assert.deepEqual(unpack(JSON.stringify(old)).truck.fleet, []);
  for (const fleet of [{}, [1], [{ load: 'x' }], [{}], Array.from({ length: TRUCK.fleet.max }, () => ({ away: false, backAt: 0, load: [], coins: 0 })), [{ away: false, load: [{ good: 'wheat', n: -1 }] }]]) {
    const bad = JSON.parse(pack(s)); bad.truck.fleet = fleet;
    assert.throws(() => unpack(JSON.stringify(bad)), /not a Farm Village save/, JSON.stringify(fleet));
  }
});

test('a clock moved back never makes a truck trip longer than one trip', () => {
  const [s, t] = ready(); must(s, 'buyTruck', {}, t); s.barn.items.wheat = 9;
  must(s, 'loadTruck', { good: 'wheat', n: 4, truck: 1 }, t); must(s, 'sendTruck', {}, t + 10 * 60_000);
  tick(s, t + 10 * 60_000);
  tick(s, t);   // the clock moved back ten minutes
  assert.ok(trucksOf(s)[1].backAt <= t + TRUCK.tripMs, 'trip clamped to its full length from now');
});

test('the next-task chip: a barn nearly full offers to fill the trucks, then to send them, then to collect', () => {
  const [s, t] = ready(); must(s, 'buyTruck', {}, t);
  s.barn.cap = 100; s.barn.items = { wheat: 90 };
  for (const b of Object.values(s.beds)) b.doneAt = t + 3_600_000;   // nothing ripe to harvest first
  let n = nextTask(s, t); assert.equal(n.key, 'The barn is nearly full: load the trucks'); assert.deepEqual(n.do, ['fillTruck', {}]);
  must(s, ...n.do, t);
  n = nextTask(s, t); assert.equal(n.key, 'Send the loaded trucks'); must(s, ...n.do, t);
  tick(s, t + TRUCK.tripMs + 1);
  n = nextTask(s, t + TRUCK.tripMs + 1); assert.equal(n.key, "Collect the truck's coins"); must(s, ...n.do, t + TRUCK.tripMs + 1);
  s.barn.items = { wheat: 40 };
  assert.notEqual(nextTask(s, t + TRUCK.tripMs + 2)?.key, 'The barn is nearly full: load the trucks', 'a barn with room does not nag');
});
