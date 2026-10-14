// The cargo ship (core/port.mjs): it calls once the quay is paved, takes made goods in bulk and pays twice their price.
import './tz.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/core/state.mjs';
import { act, tick } from '../src/core/act.mjs';
import { pack, unpack } from '../src/kit/save.mjs';
import { PORT, installPort, portOpen, portOf, makeHolds, holdFull, holdPays } from '../src/core/port.mjs';
import { TRAIN } from '../src/content/economy.mjs';
import { GOODS } from '../src/content/goods.mjs';

const NOW = 1_800_000_000_000;
installPort(); installPort();
function farm(level = 16) { const s = newGame(NOW, 51, { restore: true }); s.level = level; (s.firsts ??= {}).quay = NOW; s.barn.cap = 100000; return s; }

test('no ship before the quay is paved or before its level; then the first one calls soon and stays a while', () => {
  const early = newGame(NOW, 52, { restore: true }); early.level = 20; tick(early, NOW + 3_600_000); assert.equal(early.port, undefined, 'a ship called at an unpaved quay');
  const low = farm(PORT.level - 1); tick(low, NOW + 3_600_000); assert.equal(low.port, undefined); assert.equal(portOpen(low), false);
  const s = farm(); tick(s, NOW); assert.equal(portOf(s, NOW).here, false); assert.equal(s.port.nextAt, NOW + PORT.firstMs);
  const r = tick(s, NOW + PORT.firstMs); assert.ok(r.events.some(e => e.type === 'shipArrived'));
  const p = portOf(s, NOW + PORT.firstMs); assert.ok(p.here); assert.equal(p.holds.length, PORT.holds); assert.equal(p.leavesAt, NOW + PORT.firstMs + PORT.stopMs);
});

test('the holds ask for made goods, each about the same worth, and the same ship asks the same on every device', () => {
  const bare = makeHolds(farm(18), 3); assert.equal(bare.length, PORT.holds, 'a farm with few workshops got a short ship');   // (it takes fruit and crops then)
  const s = farm(18); let i = 0; for (const kind of ['bakery', 'juice_press', 'noodle_factory', 'dairy', 'fermentary', 'fresh_kitchen', 'cow_barn', 'goat_barn', 'coop']) { s.placed['w' + kind] = { kind, x: 60 + 4 * i++, z: 40, rot: 0 }; s.counts[kind] = 1; }
  const a = makeHolds(s, 3), b = makeHolds(s, 3);
  assert.deepEqual(a, b); assert.equal(new Set(a.map(h => h.good)).size, PORT.holds);
  for (const h of a) { assert.equal(GOODS[h.good].kind, 'product', `${h.good} is not a made good`); assert.ok(h.need >= PORT.min && h.need <= PORT.max); assert.ok(Math.abs(h.need * GOODS[h.good].value - PORT.hold(18)) < Math.max(GOODS[h.good].value * 3, PORT.hold(18) * 0.25)); }
  assert.ok(PORT.pay > TRAIN.pay, 'the ship pays no better than the train'); assert.ok(PORT.everyMs > TRAIN.everyMs);
});

test('loading takes from the barn, a full hold pays double, a part one its plain worth, four full ones a bonus; a refusal changes nothing', () => {
  const s = farm(); tick(s, NOW); tick(s, NOW + PORT.firstMs); const at = NOW + PORT.firstMs + 1000, holds = s.port.here.holds;
  const saved = pack(s);
  assert.equal(act(s, 'loadHold', { hold: 0 }, at).ok, false, 'loaded with nothing in the barn'); assert.equal(act(s, 'loadHold', { hold: 9 }, at).ok, false); assert.equal(act(s, 'loadHold', { hold: 0, n: -2 }, at).ok, false);
  assert.equal(pack(s), saved, 'a refused load changed the save');
  for (const h of holds) s.barn.items[h.good] = h.need;
  const r = act(s, 'loadHold', { hold: 0 }, at); assert.ok(r.ok && r.full); assert.equal(s.barn.items[holds[0].good] ?? 0, 0);
  assert.ok(act(s, 'loadHold', { hold: 1, n: 1 }, at).ok); assert.equal(holds[1].have, 1); assert.equal(holdFull(holds[1]), false);
  assert.equal(holdPays(holds[0]), Math.round(holds[0].need * GOODS[holds[0].good].value * PORT.pay)); assert.equal(holdPays(holds[1]), GOODS[holds[1].good].value);
  const kept = unpack(pack(s)); assert.deepEqual(kept.port, s.port, 'the ship was lost in a save');
  for (let i = 1; i < holds.length; i++) assert.ok(act(s, 'loadHold', { hold: i }, at).ok);
  const due = portOf(s, at).pays; assert.ok(due.all); assert.equal(due.coins, holds.reduce((n, h) => n + holdPays(h), 0) + PORT.bonus);
  const coins = s.coins, out = tick(s, NOW + PORT.firstMs + PORT.stopMs); assert.equal(s.coins, coins + due.coins); assert.ok(out.events.some(e => e.type === 'shipLeft' && e.all));
  assert.equal(s.stats.ships, 1); assert.equal(s.port.here, null); assert.equal(s.port.nextAt, NOW + PORT.firstMs + PORT.everyMs);
  assert.equal(act(s, 'loadHold', { hold: 0 }, NOW + PORT.firstMs + PORT.stopMs + 5).ok, false, 'loaded a ship that had sailed');
});

test('a ship that sails empty costs nothing, and ships that called while the game was shut sailed empty', () => {
  const s = farm(); tick(s, NOW); tick(s, NOW + PORT.firstMs); const coins = s.coins;
  tick(s, NOW + PORT.firstMs + PORT.stopMs); assert.equal(s.coins, coins); assert.equal(s.stats.ships ?? 0, 0);
  const away = NOW + PORT.firstMs + PORT.everyMs * 5 + PORT.stopMs + 1; tick(s, away);
  assert.equal(s.coins, coins); assert.ok(s.port.nextAt > away - PORT.stopMs, 'the timetable fell behind'); assert.ok(s.port.n >= 5);
});
