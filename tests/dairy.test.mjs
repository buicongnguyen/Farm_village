// v0.5, the meadow and the dairy (docs/MEADOW-DAIRY-SCOPE.md): goats, goat feed and goat milk, butter and cheese.
import './tz.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { act, tick } from '../src/core/act.mjs';
import { mayBuild, stepIndex } from '../src/core/projects.mjs';
import { ANIMALS, RECIPES, GOODS } from '../src/content/goods.mjs';
import { BUILDINGS } from '../src/content/buildings.mjs';
import { pack, unpack } from '../src/kit/save.mjs';
import { game, T0 } from './helpers.mjs';

const MIN = 60_000;
function dairyFarm() {
  const s = game(); s.level = 9; s.coins = 20000; s.barn.cap = 5000; s.projects.step = stepIndex('school') + 1;
  s.placed.gb = { kind: 'goat_barn', x: 36, z: 58, rot: 0 }; s.counts.goat_barn = 1; s.animals.gb = [];
  s.placed.da = { kind: 'dairy', x: 41, z: 58, rot: 0 }; s.counts.dairy = 1;
  s.placed.fm = { kind: 'feed_mill', x: 36, z: 62, rot: 0 }; s.counts.feed_mill = 1;
  return s;
}
const must = (s, a, p, now) => { const r = act(s, a, p, now); assert.equal(r.ok, true, `${a} refused: ${r.reason}`); return r; };

test('the goat barn and the dairy open after the school at level 8; every new good has its icons and a price', () => {
  const s = game(); s.level = 9; s.coins = 9999; s.projects.step = stepIndex('school');
  assert.equal(mayBuild(s, 'goat_barn').ok, false, 'goats before the school'); assert.equal(mayBuild(s, 'dairy').ok, false);
  s.projects.step++; assert.equal(mayBuild(s, 'goat_barn').ok, true); assert.equal(mayBuild(s, 'dairy').ok, true);
  assert.equal(BUILDINGS.goat_barn.level, 8); assert.equal(BUILDINGS.dairy.level, 8);
  for (const id of ['goat_feed', 'goat_milk', 'butter', 'cheese']) { assert.ok(GOODS[id]?.value > 0, `${id} is not a good`); assert.ok(existsSync(`public/assets/icons/${id}.webp`) && existsSync(`public/assets/icons/sm/${id}.webp`), `${id} has no icon`); }
  for (const id of ['goat', 'goat_barn', 'dairy']) assert.ok(existsSync(`public/assets/icons/${id}.webp`), `${id} has no icon`);
  // butter and cheese are worth more than the milk that goes into them, and feed costs less than the milk it brings
  assert.ok(RECIPES.butter.value > 2 * GOODS.milk.value && RECIPES.cheese.value > 2 * GOODS.goat_milk.value);
  assert.ok(GOODS.goat_milk.value > RECIPES.goat_feed.value);
});

test('a full dairy loop: goat feed from the mill, goats give goat milk, the dairy turns it into cheese and cow milk into butter', () => {
  const s = dairyFarm(); s.barn.items = { corn: 10, wheat: 6, milk: 4 };
  const coins = s.coins; must(s, 'buyAnimal', { home: 'gb' }, T0); must(s, 'buyAnimal', { home: 'gb' }, T0);
  assert.equal(s.coins, coins - 2 * ANIMALS.goat.price); assert.equal(s.animals.gb.length, 2); assert.ok(s.animals.gb.every(a => a.kind === 'goat'));
  must(s, 'produce', { building: 'fm', recipe: 'goat_feed' }, T0); tick(s, T0 + 41_000); must(s, 'collectProducts', { building: 'fm' }, T0 + 41_000);
  assert.equal(s.barn.items.goat_feed, 3);
  must(s, 'feed', { home: 'gb' }, T0 + 42_000); assert.equal(s.barn.items.goat_feed, 1);
  assert.equal(act(s, 'collect', { home: 'gb' }, T0 + 2 * MIN).ok, false, 'goat milk came early');
  const ready = T0 + 42_000 + ANIMALS.goat.everyMs + 1000; tick(s, ready); must(s, 'collect', { home: 'gb' }, ready);
  assert.equal(s.barn.items.goat_milk, 2); assert.equal(s.barn.items.milk, 4, 'goat milk was counted as cow milk');
  must(s, 'produce', { building: 'da', recipe: 'cheese' }, ready); must(s, 'produce', { building: 'da', recipe: 'butter' }, ready);
  assert.equal(s.barn.items.goat_milk ?? 0, 0); assert.equal(s.barn.items.milk, 2);
  assert.equal(act(s, 'produce', { building: 'da', recipe: 'cheese' }, ready).ok, false, 'cheese without goat milk');
  const done = ready + 3 * MIN + 1000, back = unpack(pack(s)); tick(back, done); must(back, 'collectProducts', { building: 'da' }, done);
  assert.equal(back.barn.items.cheese, 1); assert.equal(back.barn.items.butter, 1);
  const c = back.coins; must(back, 'sellGood', { good: 'cheese', n: 1 }, done); assert.equal(back.coins, c + RECIPES.cheese.value);
});

test('a goat barn holds four goats and takes only goats; cows and hens are untouched', () => {
  const s = dairyFarm();
  for (let i = 0; i < 4; i++) must(s, 'buyAnimal', { home: 'gb' }, T0);
  assert.equal(act(s, 'buyAnimal', { home: 'gb' }, T0).ok, false, 'a fifth goat fitted');
  assert.equal(ANIMALS.hen.gives, 'egg'); assert.equal(ANIMALS.cow.gives, 'milk'); assert.equal(ANIMALS.cow.eats, 'cow_feed');
});
