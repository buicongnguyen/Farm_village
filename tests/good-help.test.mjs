import './tz.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/core/state.mjs';
import { goodHelp, goodHelpTarget } from '../src/core/good-help.mjs';
import { GOODS, RECIPES } from '../src/content/goods.mjs';
import { stepIndex } from '../src/core/projects.mjs';
import { VI_GOOD_HELP } from '../src/i18n/vi-good-help.mjs';
import { planFor } from '../src/core/plan.mjs';
import { T0 } from './helpers.mjs';

const fresh = () => newGame(T0, 31);
const put = (s, id, kind) => { s.placed[id] = { kind, x: 34, z: 58, rot: 0 }; s.counts[kind] = (s.counts[kind] ?? 0) + 1; };
function freeze(value) { if (value && typeof value === 'object') { Object.freeze(value); for (const child of Object.values(value)) freeze(child); } return value; }

test('every good has read-only current guidance and a pure navigation target, even without optional queues', () => {
  const s = fresh(); put(s, 'oven', 'bakery'); delete s.production.oven;
  const before = structuredClone(s); freeze(s);
  for (const good of Object.keys(GOODS)) {
    const help = goodHelp(s, good, T0, { needed: 3 });
    assert.equal(help.good, good); assert.ok(help.source.status); assert.ok(help.source.target);
    assert.deepEqual(goodHelpTarget(s, good, T0, { needed: 3 }), help.source.target);
  }
  assert.deepEqual(s, before);
  for (const id of ['unknown', '__proto__', 'constructor', null, 3]) assert.equal(goodHelp(s, id, T0), null);
});

test('crop guidance distinguishes free seeds, existing seed stock, paid seeds, empty beds and growing supply', () => {
  const s = fresh(); s.level = 2; put(s, 'bed', 'bed');
  assert.equal(goodHelp(s, 'wheat', T0).source.seed, 'free');
  assert.equal(goodHelp(s, 'carrot', T0).source.cost, 4);
  assert.equal(goodHelp(s, 'carrot', T0).source.status, 'plant');
  s.coins = 0; assert.equal(goodHelp(s, 'carrot', T0).source.status, 'seed-coins');
  s.barn.items.carrot = 1;
  assert.equal(goodHelp(s, 'carrot', T0).source.seed, 'stock');
  assert.equal(goodHelp(s, 'carrot', T0).source.cost, 0);
  s.beds.bed = { crop: 'carrot', doneAt: T0 + 30_000 }; put(s, 'empty', 'bed');
  const growing = goodHelp(s, 'carrot', T0, { needed: 3 });
  assert.equal(growing.source.status, 'waiting'); assert.equal(growing.source.queued, 2);
  assert.equal(growing.source.target.id, 'bed', 'follow growing supply rather than planting a duplicate');
  assert.equal(goodHelp(s, 'carrot', T0 + 30_000).source.ready, 2);
  assert.equal(goodHelp(s, 'ginseng', T0).source.status, 'level');
});

test('recipe guidance honors learned recipes and real project/building gates', () => {
  const s = fresh();
  assert.equal(goodHelp(s, 'bread', T0).source.status, 'level');
  s.known.bread = true;
  const learned = goodHelp(s, 'bread', T0).source;
  assert.equal(learned.status, 'build'); assert.equal(learned.reason, 'Reach level {level} first');
  s.level = 3;
  assert.equal(goodHelp(s, 'bread', T0).source.reason, 'Opens after the project "{name}"');
  s.projects.step = stepIndex('mill_coop') + 1;
  assert.equal(goodHelp(s, 'bread', T0).source.reason, undefined);
  assert.deepEqual(goodHelpTarget(s, 'bread', T0), { kind: 'catalogue', buildingKind: 'bakery' });
});

test('strawberry guidance points to the optional bench until learned, then exposes ordinary planting and seed use', () => {
  const s = fresh(); s.level = 4; put(s, 'bed', 'bed'); s.barn.items = {};
  const before = structuredClone(s), help = goodHelp(s, 'strawberry', T0);
  assert.equal(help.source.status, 'skill'); assert.deepEqual(help.source.target, { kind: 'learning' });
  assert.ok(!help.uses.some(use => use.kind === 'seed'));
  assert.deepEqual(planFor(s, { strawberry: 2 }), [{ how: 'learn', good: 'strawberry', n: 2, at: 'learning' }]);
  assert.deepEqual(s, before);
  s.firsts['learning:step:trays'] = T0;
  assert.equal(goodHelp(s, 'strawberry', T0).source.status, 'plant');
  assert.equal(goodHelp(s, 'strawberry', T0).source.cost, 12);
  assert.ok(goodHelp(s, 'strawberry', T0).uses.some(use => use.kind === 'seed'));
  assert.deepEqual(planFor(s, { strawberry: 2 }), [{ how: 'plant', good: 'strawberry', n: 2, at: 'farm' }]);
  s.barn.items.strawberry = 2; assert.deepEqual(planFor(s, { strawberry: 2 }), []);
});

test('already planted strawberries can be collected or waited for when a partial save lost its optional skill marker', () => {
  const s = fresh(); s.level = 4; put(s, 'bed', 'bed'); s.barn.items = {};
  s.beds.bed = { crop: 'strawberry', doneAt: T0 + 1000 };
  assert.equal(goodHelp(s, 'strawberry', T0, { needed: 2 }).source.status, 'waiting');
  assert.equal(goodHelp(s, 'strawberry', T0 + 1000, { needed: 2 }).source.status, 'ready');
});

test('finished and paid-for queued batches are shown before repair or ingredient advice', () => {
  const s = fresh(); s.level = 5; put(s, 'oven', 'bakery'); s.barn.items = {};
  s.cond.oven = { level: 3, ms: 0 };
  assert.equal(goodHelp(s, 'bread', T0).source.status, 'repair');
  assert.equal(goodHelpTarget(s, 'bread', T0).repair, true);
  s.production.oven = { slots: 2, queue: [{ recipe: 'bread', doneAt: T0 + 1000 }] };
  const waiting = goodHelp(s, 'bread', T0);
  assert.equal(waiting.source.status, 'waiting'); assert.equal(waiting.source.queued, 1);
  assert.equal(waiting.source.target.panel, 'production'); assert.equal(waiting.source.target.repair, undefined);
  assert.equal(goodHelp(s, 'bread', T0 + 1000).source.status, 'ready');
  s.barn.cap = 0; assert.equal(goodHelp(s, 'bread', T0 + 1000).source.status, 'barn-full');
});

test('repair guidance states the existing project gate, without inventing one for repairs already under way', () => {
  const s = fresh(); s.level = 3; put(s, 'mill', 'feed_mill'); s.cond.mill = { level: 3 };
  const locked = goodHelp(s, 'chicken_feed', T0).source;
  assert.equal(locked.status, 'repair'); assert.equal(locked.reason, 'Opens with the project "{name}"');
  assert.equal(locked.params.project, 'mill_coop');
  s.projects.step = stepIndex('mill_coop');
  assert.equal(goodHelp(s, 'chicken_feed', T0).source.reason, undefined);
  s.repairing.mill = { doneAt: T0 + 1000 };
  assert.equal(goodHelp(s, 'chicken_feed', T0).source.status, 'repairing');
  assert.equal(goodHelp(s, 'chicken_feed', T0).source.reason, undefined);
});

test('ready recipe guidance matches independent trays and barn capacity instead of blocking behind an oversized batch', () => {
  const s = fresh(); s.level = 9; put(s, 'factory', 'noodle_factory'); s.barn.items = {}; s.barn.cap = 1;
  s.production.factory = { slots: 2, queue: [{ recipe: 'noodles', doneAt: T0 - 1000 }, { recipe: 'instant_noodles', doneAt: T0 }] };
  assert.equal(goodHelp(s, 'instant_noodles', T0).source.status, 'ready', 'one free space fits the noodle cup independently');
  s.barn.cap = 2;
  assert.equal(goodHelp(s, 'instant_noodles', T0).source.status, 'barn-full', 'collecting the two noodles first uses both free spaces');
  s.barn.cap = 3;
  assert.equal(goodHelp(s, 'instant_noodles', T0).source.status, 'ready');
});

test('recipe inputs use free stock, queues consume no new inputs, and partial incoming supply does not satisfy reserved goods', () => {
  const s = fresh(); s.level = 6; put(s, 'oven', 'bakery');
  s.projects.step = stepIndex('school');
  s.homes.a = { family: 'tran', arrivesAt: T0 }; s.homes.b = { family: 'okafor', arrivesAt: T0 };
  s.barn.items = { wheat: 3, bread: 0 };
  s.production.oven = { slots: 2, queue: [{ recipe: 'bread', doneAt: T0 + 1000 }] };
  const help = goodHelp(s, 'bread', T0);
  assert.equal(help.source.queued, 1);
  assert.equal(help.source.status, 'make', 'one queued loaf is reserved for school, not enough for another request');
  assert.ok(help.uses.some(use => use.kind === 'project' && use.needed === 24));
  s.barn.items.bread = 25;
  const reserved = goodHelp(s, 'bread', T0, { needed: 2 });
  assert.equal(reserved.stock, 25); assert.equal(reserved.free, 1); assert.equal(reserved.held, 24); assert.equal(reserved.missing, 1);
});

test('multi-step recipes link to their actual ingredient and source; removed makers revalidate to build preview', () => {
  const s = fresh(); s.level = 9; put(s, 'factory', 'noodle_factory'); s.barn.items = {};
  let help = goodHelp(s, 'instant_noodles', T0);
  assert.equal(help.source.status, 'ingredients');
  assert.deepEqual(help.source.ingredients.map(i => [i.good, i.needed]), Object.entries(RECIPES.instant_noodles.needs));
  assert.equal(goodHelp(s, 'noodles', T0).source.at, 'noodle_factory');
  delete s.placed.factory; s.counts.noodle_factory = 0;
  assert.deepEqual(goodHelpTarget(s, 'instant_noodles', T0), { kind: 'catalogue', buildingKind: 'noodle_factory' });
});

test('use cards avoid locked recipes, absent recipients and false ready-to-make claims', () => {
  const s = fresh(); put(s, 'oven', 'bakery');
  assert.ok(!goodHelp(s, 'wheat', T0).uses.some(u => u.kind === 'recipe' && u.good === 'bread'));
  s.level = 3; s.production.oven = { slots: 1, queue: [{ recipe: 'bread', doneAt: T0 + 1000 }] };
  assert.equal(goodHelp(s, 'wheat', T0).uses.find(u => u.good === 'bread').available, false);
  s.production.oven.queue = [];
  assert.equal(goodHelp(s, 'wheat', T0).uses.find(u => u.good === 'bread').available, true);
  s.orders.cards = [{ id: 'one', need: { wheat: 3 } }, { id: 'two', need: { wheat: 5 } }];
  assert.deepEqual(goodHelp(s, 'wheat', T0).uses.find(u => u.kind === 'orders'), { kind: 'orders', count: 2, needed: 8 });
});

test('fruit, animal produce and fishing guidance reflects actual collection rules', () => {
  const s = fresh(); put(s, 'tree', 'cherry_tree'); s.trees.tree = { doneAt: T0 }; s.cond.tree = { level: 3 };
  assert.equal(goodHelp(s, 'cherry', T0).source.status, 'ready', 'tree collection does not have a repair gate');
  put(s, 'coop', 'coop'); s.animals.coop = [{ kind: 'hen', doneAt: null }];
  assert.equal(goodHelp(s, 'egg', T0).source.status, 'feed');
  assert.equal(goodHelp(s, 'egg', T0).source.ingredients[0].good, 'chicken_feed');
  s.animals.coop[0].doneAt = T0;
  assert.equal(goodHelp(s, 'egg', T0).source.ready, 1);
  assert.deepEqual(goodHelpTarget(s, 'perch', T0), { kind: 'pond' });
  assert.equal(goodHelp(s, 'goldfish', T0).source.status, 'fish', 'village fishing is available without building a pond or level 2');
  s.fishing.line = { doneAt: T0 };
  assert.equal(goodHelp(s, 'goldfish', T0).source.ready, 0, 'a ready line does not promise a particular fish');
  assert.equal(goodHelp(s, 'goldfish', T0).source.status, 'fish-ready');
});

test('ingredient-guide translations preserve placeholders', () => {
  const tokens = line => [...line.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();
  for (const [en, vi] of Object.entries(VI_GOOD_HELP)) { assert.ok(vi.trim()); assert.deepEqual(tokens(vi), tokens(en), en); }
});
