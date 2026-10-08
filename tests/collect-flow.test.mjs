// The visual helper that says what really reached the barn after a fruit pick (src/view/collect-flow.mjs).
import './tz.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickedFlow } from '../src/view/collect-flow.mjs';
import { GOODS } from '../src/content/goods.mjs';

test('a pick with room in the barn stores everything', () => {
  const f = pickedFlow([{ type: 'picked', id: 'p1', good: 'cherry', count: 3 }, { type: 'picked', id: 'p2', good: 'cherry', count: 3 }]);
  assert.equal(f.stored.get('cherry'), 6); assert.equal(f.picked.get('cherry'), 6); assert.equal(f.exact, true);
});
test('overflow sold on the spot is taken off one kind of fruit', () => {
  const v = GOODS.apple.value, f = pickedFlow([{ type: 'picked', id: 'p1', good: 'apple', count: 3 }, { type: 'barnSold', coins: 2 * v }]);
  assert.equal(f.stored.get('apple'), 1); assert.equal(f.exact, true);
});
test('with several kinds and an overflow the split is unknown, so nothing is claimed', () => {
  const f = pickedFlow([{ type: 'picked', id: 'p1', good: 'apple', count: 3 }, { type: 'picked', id: 'p2', good: 'peach', count: 3 }, { type: 'barnSold', coins: 20 }]);
  assert.equal(f.exact, false); assert.equal(f.stored.size, 0);
});
test('explicit stored counts from the rules win', () => {
  const f = pickedFlow([{ type: 'picked', id: 'p1', good: 'apple', count: 3, stored: 2, sold: 1 }, { type: 'barnSold', coins: 999 }]);
  assert.equal(f.stored.get('apple'), 2); assert.equal(f.exact, true);
});
