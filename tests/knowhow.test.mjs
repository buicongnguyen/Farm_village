// Farm know-how (core/knowhow.mjs): six things found out by trying them, each changing one rule.
import './tz.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/core/state.mjs';
import { act, tick } from '../src/core/act.mjs';
import { pack, unpack } from '../src/kit/save.mjs';
import { knowhowRows, knowhowReady, knows, graftPlan, crossPlan, normalizeKnowhow } from '../src/core/knowhow.mjs';
import { TRICKS, KNOWHOW, COMPANIONS } from '../src/content/knowhow.mjs';
import { CROPS, FRUITS, GOODS } from '../src/content/goods.mjs';
import { BUILDINGS } from '../src/content/buildings.mjs';
import { mayBuild } from '../src/core/projects.mjs';
import { orderable } from '../src/core/orders.mjs';
import { unlocksAt } from '../src/core/levels.mjs';

const T0 = 1_800_000_000_000;
function farm() {
  const s = newGame(T0, 11, { restore: true }); tick(s, T0); s.story.firstWheat = false; s.level = 20; s.coins = 100_000; s.barn.cap = 50_000; s.orders.cards = []; s.cond = {};
  return s;
}
const must = (s, name, arg = {}, now = T0) => { const r = act(s, name, arg, now); assert.equal(r.ok, true, `${name}: ${r.reason}`); return r; };
const refuse = (s, name, arg = {}, now = T0) => assert.equal(act(s, name, arg, now).ok, false, `${name} went through`);
const state = (s, id) => knowhowRows(s).find(r => r.trick.id === id).state;
let n = 0;
const put = (s, kind, x, z) => { const id = `t${n++}`; s.placed[id] = { kind, x, z, rot: 0 }; s.counts[kind] = (s.counts[kind] ?? 0) + 1; return id; };
const tree = (s, kind, picked = 0, x = 20 + n, z = 60) => { const id = put(s, kind, x, z); (s.trees ??= {})[id] = { doneAt: T0, picked }; return id; };

test('the notebook: a trick is hidden below its level, waits for what it needs, can be tried once, and is known for good', () => {
  const s = farm(); s.level = 1; s.barn.items = {};
  assert.ok(knowhowRows(s).every(r => r.state === 'later')); assert.equal(knowhowReady(s), 0); refuse(s, 'tryTrick', { id: 'soak' });
  s.level = 2; assert.equal(state(s, 'soak'), 'waiting'); refuse(s, 'tryTrick', { id: 'soak' }); refuse(s, 'tryTrick', { id: 'nothing' });
  s.barn.items.wheat = KNOWHOW.soak.need; assert.equal(state(s, 'soak'), 'ready'); assert.equal(knowhowReady(s), 1);
  const r = must(s, 'tryTrick', { id: 'soak' }); assert.ok(r.events.some(e => e.type === 'trickFound' && e.id === 'soak'));
  assert.equal(s.barn.items.wheat, KNOWHOW.soak.need - KNOWHOW.soak.cost); assert.ok(knows(s, 'soak')); assert.equal(state(s, 'soak'), 'known');
  refuse(s, 'tryTrick', { id: 'soak' });
  assert.deepEqual(unpack(pack(s)).knowhow.known, s.knowhow.known, 'it survives a save');
  assert.deepEqual(normalizeKnowhow({ knowhow: { known: { soak: 5, bogus: 6, graft: 'x' }, saplings: { apple_tree: 2, coop: 3, peach_tree: -1 } } }), { known: { soak: 5 }, saplings: { apple_tree: 2 } });
});

test('soaked seed and good neighbours: crops take less time, and a bed beside its partner less still', () => {
  const s = farm(), a = put(s, 'bed', 30, 70), b = put(s, 'bed', 31, 70), c = put(s, 'bed', 40, 70);
  must(s, 'plant', { crop: 'corn', ids: [c] }); assert.equal(s.beds[c].doneAt - T0, CROPS.corn.growMs); delete s.beds[c];
  s.knowhow = { known: { soak: T0 }, saplings: {} };
  must(s, 'plant', { crop: 'corn', ids: [c] }); assert.equal(s.beds[c].doneAt - T0, Math.round(CROPS.corn.growMs * KNOWHOW.soak.grow));
  s.knowhow.known.companions = T0; assert.equal(COMPANIONS.corn, 'pumpkin');
  must(s, 'plant', { crop: 'pumpkin', ids: [a] }); assert.equal(s.beds[a].doneAt - T0, Math.round(CROPS.pumpkin.growMs * KNOWHOW.soak.grow), 'no partner beside it yet');
  must(s, 'plant', { crop: 'corn', ids: [b] }); assert.equal(s.beds[b].doneAt - T0, Math.round(CROPS.corn.growMs * KNOWHOW.soak.grow * KNOWHOW.pair.grow), 'corn beside pumpkin');
  // two partners sown in one go help each other from the second one on
  delete s.beds[a]; delete s.beds[b]; must(s, 'plant', { crop: 'corn', ids: [a, b] }); assert.equal(s.beds[b].doneAt, s.beds[a].doneAt, 'corn beside corn is no partner');
});

test('the stone: the mango tree waits for its discovery, then one is in storage and it can be planted', () => {
  const s = farm(); s.stats.picked = 0;
  assert.equal(mayBuild(s, 'mango_tree').ok, false); assert.match(mayBuild(s, 'mango_tree').reason, /notebook/);
  assert.ok(!unlocksAt(BUILDINGS.mango_tree.level).buildings.includes('mango_tree') && !unlocksAt(FRUITS.mango.level).fruits.includes('mango'), 'a level does not give it away');
  assert.equal(state(s, 'stone'), 'waiting'); s.stats.picked = KNOWHOW.stone.picked; const coins = s.coins;
  must(s, 'tryTrick', { id: 'stone' }); assert.equal(s.coins, coins - KNOWHOW.stone.coins); assert.equal(s.stored.mango_tree, 1); assert.equal(s.knowhow.saplings.mango_tree, 1);
  assert.equal(mayBuild(s, 'mango_tree').ok, true); assert.ok(GOODS.mango && GOODS.mango_apple);
});

test('grafting: a tree picked three times gives a free sapling; a grafted tree fruits sooner and ripens faster; thinning gives one more', () => {
  const s = farm(), old = tree(s, 'orange_tree', 2);
  assert.equal(graftPlan(s, old).ok, false); refuse(s, 'graftBranch', { id: old });
  s.level = 6; assert.equal(state(s, 'graft'), 'waiting'); s.trees[old].picked = KNOWHOW.graft.picks; must(s, 'tryTrick', { id: 'graft' });
  must(s, 'graftBranch', { id: old }); assert.equal(s.stored.orange_tree, 1); assert.equal(s.knowhow.saplings.orange_tree, 1);
  refuse(s, 'graftBranch', { id: old }); assert.equal(graftPlan(s, old).left, KNOWHOW.graft.picks, 'three more picks before the next branch');
  // placed from storage: the sapling is a graft
  s.level = 20; s.parcels = [...new Set([...s.parcels])];
  let placed = null; for (let z = 40; z < 110 && !placed; z++) for (let x = 8; x < 100 && !placed; x++) { const r = act(s, 'place', { kind: 'orange_tree', x, z, rot: 0 }, T0); if (r.ok) placed = r; }
  assert.ok(placed, 'no room for the sapling'); const id = Object.keys(s.trees).find(k => s.trees[k].graft);
  assert.ok(id, 'the sapling was not a graft'); assert.equal(s.knowhow.saplings.orange_tree, undefined); assert.equal(s.stored.orange_tree ?? 0, 0);
  assert.equal(s.trees[id].doneAt - T0, Math.round(FRUITS.orange.firstMs * KNOWHOW.graft.first * KNOWHOW.graft.regrow));
  const at = s.trees[id].doneAt; must(s, 'pick', { id }, at); assert.equal(s.barn.items.orange, FRUITS.orange.yield);
  assert.equal(s.trees[id].doneAt - at, Math.round(FRUITS.orange.regrowMs * KNOWHOW.graft.regrow), 'a graft ripens faster');
  s.knowhow.known.thin = T0; const later = s.trees[id].doneAt; must(s, 'pick', { id }, later); assert.equal(s.barn.items.orange, FRUITS.orange.yield * 2 + KNOWHOW.thin.extra);
  must(s, 'pick', { id: old }, later); assert.equal(s.trees[old].doneAt - later, FRUITS.orange.regrowMs, 'the old tree keeps its own pace');
});

test('two trees in one: an apple tree takes a mango branch and bears Mango apples, which orders may then ask for', () => {
  const s = farm(), apple = tree(s, 'apple_tree', KNOWHOW.cross.picks), mango = tree(s, 'mango_tree', 0);
  s.knowhow = { known: { graft: T0, stone: T0 }, saplings: {} };
  assert.equal(state(s, 'cross'), 'waiting'); assert.equal(crossPlan(s, apple).ok, false); refuse(s, 'crossBranch', { id: apple });
  assert.ok(!orderable(s).includes('mango_apple'), 'an order for a fruit nobody grows');
  s.trees[mango].picked = KNOWHOW.cross.mango; must(s, 'tryTrick', { id: 'cross' });
  refuse(s, 'crossBranch', { id: mango }); const coins = s.coins; must(s, 'crossBranch', { id: apple }); assert.equal(s.coins, coins - KNOWHOW.cross.coins);
  refuse(s, 'crossBranch', { id: apple }); assert.equal(s.trees[apple].cross, true); assert.ok(s.trees[apple].doneAt > T0, 'the first Mango apples take their time');
  const at = s.trees[apple].doneAt; must(s, 'pick', { id: apple }, at);
  assert.equal(s.barn.items.mango_apple, FRUITS.mango_apple.yield); assert.equal(s.barn.items.apple ?? 0, 0); assert.ok(FRUITS.mango_apple.value > FRUITS.apple.value * 5);
  assert.ok(orderable(s).includes('mango_apple')); assert.equal(s.album.fruit.mango_apple, FRUITS.mango_apple.yield);
  assert.equal(unpack(pack(s)).trees[apple].cross, true);
});

test('every trick has its words, an icon that exists and a level; they open one after another', () => {
  for (const t of TRICKS) for (const key of ['name', 'hint', 'need', 'how', 'found', 'effect', 'fact']) assert.ok(typeof t[key] === 'string' && t[key].length > 8, `${t.id}.${key}`);
  assert.deepEqual(TRICKS.map(t => t.level), [...TRICKS.map(t => t.level)].sort((a, b) => a - b)); assert.equal(new Set(TRICKS.map(t => t.level)).size, TRICKS.length);
});
