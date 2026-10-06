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
