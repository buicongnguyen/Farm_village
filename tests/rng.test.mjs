import './tz.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rng, draw, hash } from '../src/core/rng.mjs';

test('the same seed gives the same numbers', () => {
  const a = rng(42), b = rng(42);
  for (let i = 0; i < 100; i++) assert.equal(a(), b());
});
test('numbers stay in [0, 1) and int/pick stay in range', () => {
  const r = rng(7);
  for (let i = 0; i < 1000; i++) { const x = r(); assert.ok(x >= 0 && x < 1); assert.ok(r.int(5) < 5); }
  assert.ok(['a', 'b'].includes(r.pick(['a', 'b'])));
});
test('draw advances the seed stored in the state', () => {
  const s = { seed: 1 }; const first = draw(s, r => r()); const second = draw(s, r => r());
  assert.notEqual(first, second); assert.notEqual(s.seed, 1);
});
test('hash is stable', () => { assert.equal(hash('day', 3), hash('day', 3)); assert.notEqual(hash('day', 3), hash('day', 4)); });

// The AAA pass keeps the order generator's draws: one for the poster, one for the line, whatever lines the poster has.
// Carts and wishes are seeded from the save (hash), never from the order seed, so they cannot shift the orders.
import { newGame } from '../src/core/state.mjs';
import { tick, act } from '../src/core/act.mjs';
test('the same save and the same actions give the same orders, wishes and carts', () => {
  const T0 = new Date(2026, 9, 7, 9).getTime(), run = () => {
    const s = newGame(T0, 99); tick(s, T0);
    s.level = 6; s.xp = 1000; act(s, 'testAddFamily', {}, T0); act(s, 'testAddFamily', {}, T0); act(s, 'testUnlockAll', {}, T0);
    for (let h = 1; h <= 30; h++) tick(s, T0 + h * 3_600_000);
    return JSON.stringify({ orders: s.orders.cards, seed: s.seed, wishes: s.wishes, cart: s.cart });
  };
  assert.equal(run(), run());
});
test('the order seed moves the same with or without carts and wishes', () => {
  const T0 = new Date(2026, 9, 7, 9).getTime(), a = newGame(T0, 5), b = newGame(T0, 5);
  tick(a, T0); tick(b, T0); b.wishes = { day: 'x', list: [] }; b.cart = null;
  for (let h = 1; h <= 5; h++) { tick(a, T0 + h * 3_600_000); tick(b, T0 + h * 3_600_000); }
  assert.equal(a.seed, b.seed);
});
