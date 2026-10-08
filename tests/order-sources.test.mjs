import './tz.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/core/state.mjs';
import { orderable, makeCard } from '../src/core/orders.mjs';
import { GOODS, FRUITS, RECIPES } from '../src/content/goods.mjs';
import { pack, unpack } from '../src/kit/save.mjs';
import { T0, setLevel } from './helpers.mjs';

const put = (s, kind) => {
  s.placed[kind] = { kind, x: 34, z: 58, rot: 0 };
  s.counts[kind] = 1;
  return kind;
};
function farm() {
  const s = newGame(T0, 92317);
  setLevel(s, 9); s.projects.step = 999; s.stats.ordersFilled = 1; s.barn.items = {};
  put(s, 'bed');
  for (const fruit of Object.values(FRUITS)) s.trees[put(s, fruit.tree)] = { doneAt: T0 + fruit.firstMs };
  for (const kind of new Set(Object.values(RECIPES).map(recipe => recipe.at))) put(s, kind);
  s.animals[put(s, 'coop')] = [{ kind: 'hen', doneAt: null }];
  s.animals[put(s, 'cow_barn')] = [{ kind: 'cow', doneAt: null }];
  return s;
}
const freshGoods = ['herb', 'ginseng', 'orange', 'coconut', 'apple_juice', 'carrot_juice', 'orange_juice', 'noodles', 'instant_noodles'];
const freeze = value => { if (value && typeof value === 'object') { Object.freeze(value); for (const child of Object.values(value)) freeze(child); } return value; };

test('premium crops, new fruit and every factory product enter orders at their actual levels', () => {
  const s = farm();
  for (const good of freshGoods) {
    setLevel(s, GOODS[good].level - 1);
    assert.ok(!orderable(s).includes(good), `${good} must wait for its level`);
    setLevel(s, GOODS[good].level);
    assert.ok(orderable(s).includes(good), `${good} has its complete source at level ${s.level}`);
  }
  assert.ok(!orderable(s).some(good => good.endsWith('_feed')), 'animal feed is not a customer product');
});

test('factory orders follow the entire ingredient chain rather than just the final maker', () => {
  const s = farm();
  assert.ok(orderable(s).includes('instant_noodles'));
  delete s.animals.coop;
  for (const good of ['egg', 'corn_bread', 'apple_pie', 'carrot_cake', 'noodles', 'instant_noodles'])
    assert.ok(!orderable(s).includes(good), `${good} needs real hens`);
  assert.ok(orderable(s).includes('carrot_juice'), 'an unrelated carrot drink is still obtainable');
  s.animals.coop = [{ kind: 'hen', doneAt: null }]; delete s.placed.feed_mill;
  assert.ok(!orderable(s).includes('noodles'), 'a hen without a renewable feed route is not enough');
  put(s, 'feed_mill'); s.cond.coop = { level: 3 };
  assert.ok(!orderable(s).includes('noodles'), 'broken homes cannot feed further batches');
  delete s.cond.coop; delete s.animals.cow_barn;
  assert.ok(!orderable(s).includes('carrot_cake'), 'a bakery does not supply its own milk');
  assert.ok(orderable(s).includes('noodles'), 'milk is not an ingredient of noodles');
});

test('trees, beds and makers must actually exist; a stale count or orphan queue cannot create demand', () => {
  const s = farm();
  delete s.placed.orange_tree;
  assert.ok(!orderable(s).includes('orange')); assert.ok(!orderable(s).includes('orange_juice'));
  assert.ok(orderable(s).includes('apple_juice'));
  delete s.trees.coconut_palm;
  assert.ok(!orderable(s).includes('coconut'), 'a planted timer is required for fruit to grow');
  s.production.juice_press = { slots: 2, queue: [{ recipe: 'carrot_juice', doneAt: T0 }] };
  delete s.placed.juice_press;
  assert.ok(!orderable(s).includes('carrot_juice'));
  delete s.placed.bed;
  assert.ok(!orderable(s).includes('ginseng')); assert.ok(!orderable(s).includes('noodles'));
  assert.ok(orderable(s).includes('apple'), 'planted fruit keeps growing without crop beds');
});

test('source checks honor learned recipes and working rules while remaining read-only', () => {
  const s = farm(); setLevel(s, 2); s.known.bread = true;
  assert.ok(orderable(s).includes('bread'), 'a recipe learned early is usable at an existing maker');
  s.repairing.bakery = { doneAt: T0 + 1000 };
  assert.ok(!orderable(s).includes('bread'));
  delete s.repairing.bakery; s.cond.bakery = { level: 2 };
  assert.ok(orderable(s).includes('bread'), 'ordinary wear never stops production');
  s.cond.apple_tree = { level: 3 };
  assert.ok(orderable(s).includes('apple'), 'tree rules still permit picking regardless of condition');
  const before = structuredClone(s); freeze(s); orderable(s); assert.deepEqual(s, before);
});

test('seeded customer orders really include all new goods once their complete sources are open', () => {
  const s = farm(), seen = new Set();
  for (let i = 0; i < 600; i++) {
    const card = makeCard(s, T0);
    for (const [good, count] of Object.entries(card.need)) {
      assert.ok(orderable(s).includes(good)); assert.ok(Number.isSafeInteger(count) && count > 0);
      seen.add(good);
    }
  }
  assert.deepEqual(freshGoods.filter(good => !seen.has(good)), []);
});

test('an easy order never promises the same stored unit twice when random picks repeat', () => {
  const s = farm(); s.barn.items = { carrot: 1 };
  for (let seed = 1; seed <= 120; seed++) {
    s.seed = seed;
    assert.deepEqual(makeCard(s, T0, { easy: true }).need, { carrot: 1 });
  }
  s.placed = {}; s.trees = {}; s.animals = {};
  assert.deepEqual(orderable(s), []);
  assert.ok(makeCard(s, T0).need.wheat > 0, 'an empty farm keeps its free-seed starter order');
});

test('older saves keep their existing cards, inventory and progress while future requests use current sources', () => {
  const s = farm(); s.version = 8; delete s.contracts; delete s.landDiscovery;
  delete s.placed.noodle_factory;
  s.orders.cards = [{ id: 'saved-noodles', from: 'ada', need: { instant_noodles: 2 }, coins: 247, xp: 57, readyAt: T0 }];
  s.barn.items = { instant_noodles: 2, ginseng: 1 };
  const cards = structuredClone(s.orders.cards), stock = structuredClone(s.barn.items), coins = s.coins;
  const restored = unpack(pack(s));
  assert.deepEqual(restored.orders.cards, cards); assert.deepEqual(restored.barn.items, stock); assert.equal(restored.coins, coins);
  assert.ok(!orderable(restored).includes('instant_noodles'));
  assert.ok(orderable(restored).includes('ginseng'));
  put(restored, 'noodle_factory'); assert.ok(orderable(restored).includes('instant_noodles'), 'placing the missing maker reopens future requests');
});
