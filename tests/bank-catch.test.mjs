// A fish landed on the bank waits on the grass: it reaches the barn only when packed (core/fishing.mjs, after Willowmere).
import './tz.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/core/state.mjs';
import { act, tick } from '../src/core/act.mjs';
import { pack, unpack } from '../src/kit/save.mjs';
import { pick, bankCatch, bankCount, BANK_KEEP_MS } from '../src/core/fishing.mjs';
import { FISH } from '../src/content/economy.mjs';

const T0 = 1_800_000_000_000;
const fresh = () => { const s = newGame(T0, 99, { restore: true }); tick(s, T0); return s; };
const must = (s, a, p, now) => { const r = act(s, a, p, now); assert.equal(r.ok, true, `${a} refused: ${r.reason}`); return r; };
function land(s, now, hold = true) { must(s, 'castLine', {}, now); const at = s.fishing.line.doneAt, fish = pick(s.fishing.line.seed, false); must(s, 'reelIn', { steady: true, hold }, at); return { fish, at }; }

test('a held catch lies on the bank: counted and in the album at once, in the barn only when packed', () => {
  const s = fresh(), stock = { ...s.barn.items }, a = land(s, T0), b = land(s, a.at + 1000);
  assert.equal(s.fishing.caught, 2); assert.equal(bankCount(s), 2);
  assert.ok(s.album.fish[a.fish] >= 1 && s.album.fish[b.fish] >= 1, 'the album waits for packing');
  for (const f of new Set([a.fish, b.fish])) assert.equal(s.barn.items[f] ?? 0, stock[f] ?? 0, `${f} is already in the barn`);
  const r = must(s, 'packCatch', {}, b.at + 2000);
  assert.equal(r.count, 2); assert.equal(bankCount(s), 0); assert.equal(s.fishing.bank, undefined);
  const gained = [...new Set([a.fish, b.fish])].reduce((n, f) => n + (s.barn.items[f] ?? 0) - (stock[f] ?? 0), 0);
  assert.equal(gained, 2, 'packing did not bring both fish in');
  assert.equal(act(s, 'packCatch', {}, b.at + 3000).ok, false, 'the same catch packed twice');
});

test('Reel gently from the pond sheet still goes straight to the barn, with the same event as before', () => {
  const s = fresh(); must(s, 'castLine', {}, T0);
  const fish = pick(s.fishing.line.seed, false), before = s.barn.items[fish] ?? 0, r = must(s, 'reelIn', { steady: true }, s.fishing.line.doneAt);
  assert.equal(s.barn.items[fish], before + 1); assert.equal(bankCount(s), 0);
  assert.deepEqual(Object.keys(r.events.find(e => e.type === 'fishCaught')).sort(), ['coins', 'first', 'fish', 'rare', 'sold', 'stored', 'type'].sort());
});

test('fish left on the grass are never lost: they survive a save, and pack themselves if nobody does', () => {
  const s = fresh(), a = land(s, T0), back = unpack(pack(s));
  assert.deepEqual(bankCatch(back), { [a.fish]: 1 });
  const stock = back.barn.items[a.fish] ?? 0;
  tick(back, a.at + BANK_KEEP_MS - 1000); assert.equal(bankCount(back), 1, 'packed too soon');
  tick(back, a.at + BANK_KEEP_MS + 1000); assert.equal(bankCount(back), 0); assert.equal(back.barn.items[a.fish], stock + 1);
  // a clock set back or a broken record cannot strand or multiply fish
  const odd = fresh(); odd.fishing.bank = { fish: { perch: 2, nonsense: 5, carp: -3, catfish: 1.5 }, at: 'later' };
  assert.deepEqual(bankCatch(odd), { perch: 2 });
  const perch = odd.barn.items.perch ?? 0; tick(odd, T0 + 1); assert.equal(odd.barn.items.perch, perch + 2); assert.equal(odd.fishing.bank, undefined);
});

test('a full barn sells what does not fit when the catch is packed, as any overflow does', () => {
  const s = fresh(); s.barn.cap = Object.values(s.barn.items).reduce((a, n) => a + n, 0);
  const a = land(s, T0), coins = s.coins, r = must(s, 'packCatch', {}, a.at + 1);
  assert.equal(r.stored, 0); assert.ok(r.coins > 0 && s.coins === coins + r.coins);
  void FISH;
});

test('walking on winds the line in: no fish, no charge, and the next cast is a fresh one', () => {
  const s = fresh(); assert.equal(act(s, 'pullLine', {}, T0).ok, false, 'pulled a line that was never cast');
  must(s, 'castLine', {}, T0); const stock = { ...s.barn.items }, coins = s.coins;
  must(s, 'pullLine', {}, T0 + 5000);
  assert.equal(s.fishing.line, null); assert.equal(s.fishing.caught, 0); assert.deepEqual(s.barn.items, stock); assert.equal(s.coins, coins);
  must(s, 'castLine', {}, T0 + 6000); assert.ok(s.fishing.line.doneAt > T0 + 6000);
});
