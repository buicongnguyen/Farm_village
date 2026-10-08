import './tz.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/core/state.mjs';
import { act, tick } from '../src/core/act.mjs';
import { progressOf } from '../src/core/quests.mjs';
import { pick as fishFor } from '../src/core/fishing.mjs';
import { FRUITS, FISH_TABLE, GOODS } from '../src/content/goods.mjs';
import { STEPS } from '../src/content/projects.mjs';
import { STALL, FISH, XP } from '../src/content/economy.mjs';
import { pack, unpack } from '../src/kit/save.mjs';
import { T0, must, setLevel } from './helpers.mjs';

function farm(seed = 3) {
  const s = newGame(T0, seed);
  setLevel(s, 4); s.coins = 10000; s.cells.fill(0); s.projects.step = STEPS.length;
  s.barn.items = {}; return s;
}
function tree(s, kind = 'cherry_tree', x = 34) {
  return must(s, 'place', { kind, x, z: 58 }).id;
}
function refused(s, action, payload = {}, now = T0) {
  const before = structuredClone(s), r = act(s, action, payload, now);
  assert.equal(r.ok, false, action); assert.deepEqual(r.events, []);
  assert.deepEqual(s, before, `${action} changed a refused state`);
}
function seedFor(fish) {
  for (let n = 0; n < 1000; n++) if (fishFor(`catch:${n}`, false) === fish) return `catch:${n}`;
  assert.fail(`No deterministic fixture seed for ${fish}`);
}
function readyLine(s, fish, now = T0) {
  s.fishing.line = { seed: seedFor(fish), bait: false, doneAt: now };
}
function stall(s) {
  must(s, 'place', { kind: 'path', x: 30, z: 64 });
  must(s, 'place', { kind: 'path', x: 31, z: 64 });
  return must(s, 'place', { kind: 'stall', x: 30, z: 65, rot: 2 }).id;
}
const ofType = (r, type) => r.events.filter(e => e.type === type);

test('a cherry-only farm receives a generic fruit goal and real harvests complete it once', () => {
  const s = farm(2), id = tree(s);
  tick(s, T0);
  const q = s.quests.list.find(q => q.t === 'fruit');
  assert.ok(q, 'a planted cherry tree must enable the generic fruit goal');
  assert.equal(s.counts.apple_tree ?? 0, 0);
  const cycles = Math.ceil(q.n / FRUITS.cherry.yield);
  for (let i = 0; i < cycles; i++) {
    const now = s.trees[id].doneAt;
    must(s, 'pick', { id }, now);
    assert.equal(progressOf(s, q), Math.min(q.n, (i + 1) * FRUITS.cherry.yield));
  }
  const before = s.coins, r = must(s, 'claimQuest', { id: q.id }, s.lastSeen);
  assert.equal(s.coins - before, q.coins); assert.equal(ofType(r, 'questDone').length, 1);
  refused(s, 'claimQuest', { id: q.id }, s.lastSeen);
});

test('stored trees and decorative trees do not enable fruit goals; Sam still requests obtainable apples', () => {
  for (let seed = 1; seed <= 32; seed++) {
    const s = farm(seed), id = tree(s);
    must(s, 'store', { id }); tree(s, 'round_tree');
    tick(s, T0);
    assert.ok(!s.quests.list.some(q => q.t === 'fruit'), 'no live fruit tree');
    assert.ok(!s.quests.list.some(q => q.favour && q.person === 'sam'), 'no obtainable apples');
    const cherries = farm(seed); tree(cherries); tick(cherries, T0);
    assert.ok(!cherries.quests.list.some(q => q.favour && q.person === 'sam'), 'cherries do not satisfy an apple favour');
  }
  const s = farm(5); tree(s, 'apple_tree'); tick(s, T0);
  const q = s.quests.list.find(q => q.favour && q.person === 'sam');
  assert.ok(q); assert.equal(q.good, 'apple');
});

test('fruit batch events separate stored fruit from overflow, ignore duplicate ids, and pay once', () => {
  const s = farm(), a = tree(s), b = tree(s, 'apple_tree', 36);
  s.trees[a].doneAt = s.trees[b].doneAt = T0;
  s.barn.cap = 4;
  const coins = s.coins, earned = s.stats.coinsEarned, xp = s.xp;
  const r = must(s, 'pick', { ids: [a, a, b, 'missing', b] });
  const events = ofType(r, 'picked');
  assert.equal(r.picked, 2); assert.equal(events.length, 2);
  assert.deepEqual(events.map(({ good, count, stored, sold, coins }) => ({ good, count, stored, sold, coins })), [
    { good: 'cherry', count: 3, stored: 3, sold: 0, coins: 0 },
    { good: 'apple', count: 3, stored: 1, sold: 2, coins: 2 * GOODS.apple.value },
  ]);
  assert.deepEqual(s.barn.items, { cherry: 3, apple: 1 });
  assert.equal(s.coins - coins, 2 * GOODS.apple.value);
  assert.equal(s.stats.coinsEarned - earned, 2 * GOODS.apple.value);
  assert.equal(s.stats.picked, 6); assert.equal(s.xp - xp, 6 * XP.harvest);
  assert.deepEqual(s.album.fruit, { cherry: 3, apple: 3 });
  assert.deepEqual(ofType(r, 'barnSold'), [{ type: 'barnSold', coins: 2 * GOODS.apple.value }]);
  assert.equal(s.trees[a].picked, 1); assert.equal(s.trees[b].picked, 1);
  refused(s, 'pick', { ids: [a, b] });
  const loaded = unpack(pack(s)); refused(loaded, 'pick', { ids: [a, b] });
});

test('a full barn still harvests all fruit and metadata reports only the real overflow payment', () => {
  const s = farm(), id = tree(s); s.trees[id].doneAt = T0;
  s.barn.items = { wheat: s.barn.cap };
  const coins = s.coins, stock = structuredClone(s.barn.items);
  const r = must(s, 'pick', { id }), [e] = ofType(r, 'picked');
  assert.equal(e.stored, 0); assert.equal(e.sold, FRUITS.cherry.yield);
  assert.equal(e.count, e.stored + e.sold);
  assert.equal(e.coins, e.sold * GOODS.cherry.value);
  assert.equal(s.coins - coins, e.coins); assert.deepEqual(s.barn.items, stock);
  assert.equal(s.trees[id].doneAt, T0 + FRUITS.cherry.regrowMs);
});

test('fish events use saved species history and content rarity, with no extra rare or first-catch payment', () => {
  for (const def of FISH_TABLE) {
    let s = farm(); s.barn.cap = 1; s.barn.items = { wheat: 1 }; readyLine(s, def.id);
    const before = s.coins, earned = s.stats.coinsEarned;
    let r = must(s, 'reelIn'), [e] = ofType(r, 'fishCaught');
    assert.deepEqual(e, { type: 'fishCaught', fish: def.id, first: true, rare: !!def.rare, stored: 0, sold: 1, coins: def.value });
    assert.equal(s.coins - before, def.value); assert.equal(s.stats.coinsEarned - earned, def.value);
    assert.equal(s.album.fish[def.id], 1); assert.equal(s.stats.fished, 1); assert.equal(s.fishing.caught, 1);
    assert.deepEqual(ofType(r, 'barnSold'), [{ type: 'barnSold', coins: def.value }]);
    refused(s, 'reelIn');
    s = unpack(pack(s)); s.barn.items = {}; readyLine(s, def.id, T0 + 1);
    r = must(s, 'reelIn', {}, T0 + 1); [e] = ofType(r, 'fishCaught');
    assert.equal(e.first, false); assert.equal(e.rare, !!def.rare);
    assert.equal(e.stored, 1); assert.equal(e.sold, 0); assert.equal(e.coins, 0);
    assert.equal(s.barn.items[def.id], 1); assert.equal(s.album.fish[def.id], 2);
    assert.equal(s.coins, before + def.value); assert.deepEqual(ofType(r, 'barnSold'), []);
  }
});

test('casting, waiting, and refused fishing actions do not create collection or mutate missing state', () => {
  const s = farm();
  delete s.fishing;
  refused(s, 'reelIn'); refused(s, 'collectFees'); refused(s, 'castLine', { bait: true });
  const r = must(s, 'castLine');
  assert.equal(r.doneAt, T0 + FISH.waitMs); assert.equal(ofType(r, 'fishCaught').length, 0);
  refused(s, 'reelIn', {}, r.doneAt - 1); refused(s, 'castLine');
  const catchResult = must(s, 'reelIn', {}, r.doneAt);
  assert.equal(ofType(catchResult, 'fishCaught').length, 1);
});

test('stall sales stay in the till through a save and only collection pays the wallet', () => {
  let s = farm(); const id = stall(s); s.barn.items = { wheat: 3 };
  must(s, 'stallList', { good: 'wheat', n: 3 }); tick(s, T0);
  const before = s.coins, earned = s.stats.coinsEarned;
  const now = T0 + 3 * STALL.sellEveryMs[1], r = tick(s, now);
  assert.deepEqual(ofType(r, 'stallSold'), [{ type: 'stallSold', sold: 3, coins: 3 * GOODS.wheat.value }]);
  assert.deepEqual(ofType(r, 'coins'), []); assert.equal(s.coins, before);
  assert.equal(s.stats.coinsEarned, earned); assert.equal(s.stall.coins, 3 * GOODS.wheat.value);
  s = unpack(pack(s)); tick(s, now);
  assert.equal(s.coins, before); assert.equal(s.stall.coins, 3 * GOODS.wheat.value);
  const collected = must(s, 'stallCollect', {}, now);
  assert.deepEqual(ofType(collected, 'coins'), [{ type: 'coins', coins: 3 * GOODS.wheat.value, source: 'stall', id }]);
  assert.equal(s.coins - before, collected.coins); assert.equal(s.stats.coinsEarned - earned, collected.coins);
  assert.equal(s.stall.coins, 0); refused(s, 'stallCollect', {}, now);
  s = unpack(pack(s)); refused(s, 'stallCollect', {}, now);
});

test('collection source remains truthful when the stall is stored, and pond fees are collected once', () => {
  const s = farm(), id = stall(s); s.stall.coins = 12;
  must(s, 'store', { id });
  assert.deepEqual(ofType(must(s, 'stallCollect'), 'coins'), [{ type: 'coins', coins: 12, source: 'stall', id: null }]);
  s.fishing.coins = 9; const before = s.coins, earned = s.stats.coinsEarned;
  const loaded = unpack(pack(s)), r = must(loaded, 'collectFees');
  assert.deepEqual(ofType(r, 'coins'), [{ type: 'coins', coins: 9, source: 'pond' }]);
  assert.equal(loaded.coins - before, 9); assert.equal(loaded.stats.coinsEarned - earned, 9);
  assert.equal(loaded.fishing.coins, 0); refused(loaded, 'collectFees');
});

test('invalid saved stall stacks cannot throw, sell forever, or create fictional collection payments', () => {
  const s = farm(); stall(s);
  s.stall.items = [null, {}, { good: 'missing', n: 1 }, { good: '__proto__', n: 1 },
    ...[0, -1, 1.5, Infinity, NaN, 11].map(n => ({ good: 'wheat', n })), { good: 'wheat', n: 2 }];
  s.stall.nextSaleAt = T0;
  const before = s.coins, r = tick(s, T0 + STALL.sellEveryMs[1] * 4);
  assert.deepEqual(s.stall.items, []); assert.equal(s.stall.coins, 2 * GOODS.wheat.value);
  assert.equal(s.coins, before); assert.deepEqual(ofType(r, 'stallSold'), [{ type: 'stallSold', sold: 2, coins: 2 * GOODS.wheat.value }]);
  for (const coins of [-1, 1.5, Infinity, NaN, '12']) {
    s.stall.coins = coins; s.fishing.coins = coins;
    refused(s, 'stallCollect'); refused(s, 'collectFees');
  }
  for (const good of ['__proto__', 'constructor', ['wheat']]) refused(s, 'stallList', { good });
});
