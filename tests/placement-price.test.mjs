import './tz.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/core/state.mjs';
import { act } from '../src/core/act.mjs';
import { priceOf, placementPrice } from '../src/core/build.mjs';
import { stepIndex } from '../src/core/projects.mjs';
import { T0 } from './helpers.mjs';

test('placement quotes keep dynamic and project costs, round rebuild discounts, and never mutate credits', () => {
  const s = newGame(T0, 37);
  s.counts.bed = 9;
  assert.equal(placementPrice(s, 'bed'), priceOf(s, 'bed'));
  s.projects.step = stepIndex('school');
  assert.ok(priceOf(s, 'school') > 0, 'fixture must include the school project cost');
  assert.equal(placementPrice(s, 'school'), priceOf(s, 'school'));
  s.rebuild.school = 1;
  assert.equal(placementPrice(s, 'school'), Math.round(priceOf(s, 'school') / 2));
  s.rebuild.flowers = 1;
  assert.equal(placementPrice(s, 'flowers'), 3, 'five-coin rebuilds round to three');
  s.stored.flowers = 1;
  const before = structuredClone(s);
  assert.equal(placementPrice(s, 'flowers'), 0, 'stored stock takes precedence over rebuild credit');
  assert.deepEqual(s, before, 'previewing must not spend credits or mutate the farm');
});

test('real placement charges the displayed stored, rebuild and normal price in order', () => {
  const s = newGame(T0, 37); s.stored.flowerpot = 1; s.rebuild.flowerpot = 1;
  for (const [i, expected] of [0, 4, 8].entries()) {
    const before = s.coins, quoted = placementPrice(s, 'flowerpot');
    assert.equal(quoted, expected);
    const result = act(s, 'place', { kind: 'flowerpot', x: 32 + i, z: 56 }, T0);
    assert.equal(result.ok, true, result.reason);
    assert.equal(result.price, quoted);
    assert.equal(s.coins, before - quoted);
    assert.equal(s.stored.flowerpot, 0);
    assert.equal(s.rebuild.flowerpot, i === 0 ? 1 : 0, 'using storage must preserve the later rebuild credit');
  }
});

test('edge previews and actual placements retain the normal charge and ignore stored or rebuild credits', () => {
  const s = newGame(T0, 37); s.level = 2;
  s.stored.fence = 1; s.rebuild.fence = 1;
  const before = s.coins, quoted = placementPrice(s, 'fence');
  assert.equal(quoted, 3);
  const result = act(s, 'placeEdge', { kind: 'fence', x: 32, z: 56, side: 'n' }, T0);
  assert.equal(result.ok, true, result.reason);
  assert.equal(result.price, quoted); assert.equal(s.coins, before - quoted);
  assert.equal(s.stored.fence, 1); assert.equal(s.rebuild.fence, 1);
});
