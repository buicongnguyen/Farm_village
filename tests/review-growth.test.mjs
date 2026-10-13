// Regressions from the October review of know-how, surprises and home life.
import './tz.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { newGame } from '../src/core/state.mjs';
import { act, tick } from '../src/core/act.mjs';
import { xpFor } from '../src/core/levels.mjs';
import { canPlace } from '../src/core/grid.mjs';
import { pack, unpack } from '../src/kit/save.mjs';
import { KNOWHOW } from '../src/content/knowhow.mjs';
import { normalizeSurprises } from '../src/core/surprises.mjs';
import { SURPRISES } from '../src/content/surprises.mjs';
import { FRUITS } from '../src/content/goods.mjs';
import { MIN, HOUR } from '../src/content/economy.mjs';
import { rentWaiting, rentPerHour } from '../src/core/homes.mjs';
import { orderable } from '../src/core/orders.mjs';
import { hatOf, costumeOf } from '../src/content/wardrobe.mjs';
import { goodHelp } from '../src/core/good-help.mjs';
import { installExplore, startExplore, exploreSession, homeCooldown } from '../src/core/explore.mjs';
import { HOME_ACTIVITIES, HOME_MADE } from '../src/content/explore.mjs';
const T = 1_800_000_000_000;
function farm() {
  const s = newGame(T, 11, { restore: true }); tick(s, T);
  s.level = 20; s.xp = xpFor(20) + 100; s.coins = 100000; s.barn.cap = 50000; s.cond = {};
  s.surprises = normalizeSurprises(s); s.knowhow ??= { known: {}, saplings: {} };
  s.projects = { step: 999, delivered: {} }; s.stats.built = { orange_tree: 100, apple_tree: 100 }; act(s, 'endBuild', {}, T); return s;
}
function must(s, action, arg = {}, now = T) { const r = act(s, action, arg, now); assert.ok(r.ok, `${action}: ${r.reason}`); return r; }
function place(s, kind, now = T) {
  for (let z = 0; z < 128; z++) for (let x = 0; x < 128; x++) if (canPlace(s, kind, x, z, 0).ok) return must(s, 'place', { kind, x, z }, now).id;
  throw new Error('No free tree position');
}
test('undo returns a grafted sapling with its faster growth intact, including after reload', () => {
  let s = farm(); s.stored.orange_tree = 1; s.knowhow = { known: {}, saplings: { orange_tree: 1 } };
  const first = place(s, 'orange_tree'); assert.equal(s.trees[first].graft, true);
  must(s, 'undo'); s = unpack(pack(s));
  assert.equal(s.knowhow.saplings.orange_tree, 1);
  const again = place(s, 'orange_tree'); assert.equal(s.trees[again].graft, true);
  assert.equal(s.trees[again].doneAt - T, Math.round(FRUITS.orange.firstMs * KNOWHOW.graft.first * KNOWHOW.graft.regrow));
});
test('storing an improved tree preserves its fruit, growth bonus and graft progress across reload', () => {
  let s = farm(); const id = place(s, 'apple_tree');
  Object.assign(s.trees[id], { graft: true, cross: true, picked: 8, graftAt: 6, first: false });
  must(s, 'store', { id }); s = unpack(pack(s));
  const restored = place(s, 'apple_tree'); const tree = s.trees[restored];
  assert.equal(tree.cross, true); assert.equal(tree.graft, true); assert.equal(tree.picked, 8); assert.equal(tree.graftAt, 6);
  assert.equal(tree.doneAt - T, Math.round(FRUITS.mango_apple.regrowMs * KNOWHOW.graft.regrow));
  must(s, 'undo'); const again = place(s, 'apple_tree'); assert.equal(s.trees[again].cross, true);
  must(s, 'pick', { id: again }, s.trees[again].doneAt); assert.equal(s.barn.items.mango_apple, FRUITS.mango_apple.yield);
});
test('a new gold rush keeps the previous rush bonus until rent is collected, also after reload', () => {
  let s = farm(); const R = SURPRISES.rush, end = T + R.lastsMs + MIN;
  const id = Object.keys(s.homes)[0]; s.homes = { [id]: { level: 0, family: 'tran', arrived: true, arrivesAt: T, rentFrom: T } };
  s.surprises.rush = { from: T, until: T + R.lastsMs, pans: 0, panAt: 0 };
  s.surprises.rushAt = 1; s.surprises.misses = R.by - 1; s.stats.playMs = R.everyMs + 1;
  tick(s, end); assert.equal(s.surprises.rush.from, end);
  s = unpack(pack(s)); const expected = Math.floor(rentPerHour(s, id) * ((end - T) + R.lastsMs * (R.rent - 1)) / HOUR);
  assert.equal(rentWaiting(s, end), expected, 'first rush bonus must not disappear');
  must(s, 'collectRent', {}, end); assert.equal(rentWaiting(s, end), 0, 'no second payout');
});
test('active play time includes time between actions, excludes absence and resumes after a backward clock', () => {
  const s = farm(); const base = s.stats.playMs;
  must(s, 'endBuild', {}, T + 900); tick(s, T + 1000);
  assert.equal(s.stats.playMs - base, 1000);
  tick(s, T + HOUR); assert.equal(s.stats.playMs - base, 1000, 'time away is not active play');
  tick(s, T); tick(s, T + 1000); assert.equal(s.stats.playMs - base, 2000, 'play resumes on the corrected clock');
});
test('apple guidance skips crossed trees and counts the thinning bonus for actual apples', () => {
  const s = farm(); s.trees = {}; for (const [id, p] of Object.entries(s.placed)) if (p.kind === 'apple_tree') delete s.placed[id];
  const crossed = place(s, 'apple_tree'); Object.assign(s.trees[crossed], { cross: true, doneAt: T });
  assert.equal(goodHelp(s, 'apple', T).source.ready, 0);
  const plain = place(s, 'apple_tree'); s.trees[plain].doneAt = T; s.knowhow.known.thin = T;
  const source = goodHelp(s, 'apple', T).source; assert.equal(source.target.id, plain); assert.equal(source.ready, FRUITS.apple.yield + KNOWHOW.thin.extra);
});
installExplore();
const room = JSON.parse(readFileSync(new URL('../public/assets/models/interior-cottage.json', import.meta.url)));
function indoors(object) { const s = farm(); startExplore(s, [51, 125], room); must(s, 'enterFarmhouse');
  const e = exploreSession(s), stand = room.interactions.find(o => o.id === object).stand; e.p = stand.length === 3 ? [stand[0], stand[2]] : [...stand]; return s; }
test('a capped knitting counter does not finish and give the same scarf again', () => {
  const s = indoors('farmhouse_yarn'); s.explore = { made: { rows: HOME_MADE.rows - 1 } };
  assert.equal(must(s, 'useAtHome', { id: 'yarn' }).finished, true);
  const r = must(s, 'useAtHome', { id: 'yarn' }, T + HOME_ACTIVITIES.yarn.cooldownMs);
  assert.equal(r.finished, undefined); assert.equal(r.xp, HOME_ACTIVITIES.yarn.xp);
});
test('home activities recover after one cooldown when the device clock moves backward', () => {
  const s = indoors('farmhouse_yarn'); const future = T + HOUR; must(s, 'useAtHome', { id: 'yarn' }, future);
  tick(s, T); const delay = HOME_ACTIVITIES.yarn.cooldownMs; tick(s, T + delay);
  assert.equal(homeCooldown(s, 'yarn', T + delay), 0); assert.ok(must(s, 'useAtHome', { id: 'yarn' }, T + delay).xp);
});

test('rare egg guidance follows the matching hen, while plain eggs exclude rare hens', () => {
  const s = farm(), home = Object.keys(s.placed).find(id => s.placed[id].kind === 'coop');
  s.animals = { [home]: [{ kind: 'hen', variant: 'black', doneAt: T }] };
  assert.equal(goodHelp(s, 'black_egg', T).source.target.id, home);
  assert.equal(goodHelp(s, 'black_egg', T).source.ready, 1);
  assert.equal(goodHelp(s, 'egg', T).source.ready, 0);
  assert.equal(goodHelp(s, 'rainbow_egg', T).source.target.kind, 'knowhow');
});
test('Mango apple guidance teaches grafting before offering a real apple tree to graft', () => {
  const s = farm(); assert.equal(goodHelp(s, 'mango_apple', T).source.target.kind, 'knowhow');
  const id = place(s, 'apple_tree'); s.knowhow.known.cross = T;
  const help = goodHelp(s, 'mango_apple', T).source; assert.equal(help.status, 'notebook');
  assert.equal(s.placed[help.target.id].kind, 'apple_tree'); assert.match(help.reason, /Pick this tree/);
});

test('cutting a branch from a restored tree cannot be repeated through undo', () => {
  const s = farm(); s.knowhow.known.graft = T; const old = place(s, 'orange_tree'); s.trees[old].picked = 3;
  must(s, 'store', { id: old }); const id = place(s, 'orange_tree'); must(s, 'graftBranch', { id });
  const before = pack(s); assert.equal(act(s, 'undo', {}, T).ok, false); assert.equal(pack(s), before);
  assert.equal(s.knowhow.saplings.orange_tree, 1);
});
test('fresh grafted saplings are used first without overwriting an improved stored tree', () => {
  let s = farm(); const old = place(s, 'apple_tree'); Object.assign(s.trees[old], { cross: true, picked: 3 });
  must(s, 'store', { id: old }); s.stored.apple_tree++; s.knowhow.saplings.apple_tree = 1;
  s = unpack(pack(s)); const graft = place(s, 'apple_tree'); assert.equal(s.trees[graft].graft, true); assert.ok(!s.trees[graft].cross);
  const improved = place(s, 'apple_tree'); assert.equal(s.trees[improved].cross, true);
});
test('a backward clock caps an improved tree to its actual fruit and growth duration', () => {
  const s = farm(), id = place(s, 'apple_tree');
  Object.assign(s.trees[id], { graft: true, cross: true, first: false, doneAt: T + 20 * MIN });
  s.lastSeen = T + HOUR; tick(s, T);
  assert.equal(s.trees[id].doneAt - T, Math.round(FRUITS.mango_apple.regrowMs * KNOWHOW.graft.regrow));
});
test('source amounts include purchased output upgrades and rare hens lead to their own repairs', () => {
  const s = farm(), coop = Object.keys(s.placed).find(id => s.placed[id].kind === 'coop');
  s.animals = { [coop]: [{ kind: 'hen', variant: 'black', doneAt: T }] }; s.outputUp = { [coop]: 2 };
  assert.equal(goodHelp(s, 'black_egg', T).source.ready, 4);
  s.animals[coop][0].doneAt = null; s.cond[coop] = { level: 3 };
  const spare = 'spare-coop'; s.placed[spare] = { kind: 'coop', x: 50, z: 70, rot: 0 }; s.animals[spare] = [];
  assert.equal(goodHelp(s, 'black_egg', T).source.target.id, coop); assert.equal(goodHelp(s, 'black_egg', T).source.status, 'repair');
  const oven = Object.keys(s.placed).find(id => s.placed[id].kind === 'bakery'); s.outputUp[oven] = 2;
  s.production[oven] = { slots: 2, queue: [{ recipe: 'bread', doneAt: T + 1000 }] };
  assert.equal(goodHelp(s, 'bread', T).source.queued, 4);
});

test('new orders and their recipes require the actual fruit and egg a farm produces', () => {
  const s = farm();
  for (const [id, p] of Object.entries(s.placed)) if (p.kind === 'apple_tree') s.trees[id].cross = true;
  for (const list of Object.values(s.animals)) for (const a of list) if (a.kind === 'hen') a.variant = 'black';
  const goods = orderable(s); assert.ok(!goods.includes('apple')); assert.ok(!goods.includes('apple_juice'));
  assert.ok(!goods.includes('egg')); assert.ok(!goods.includes('noodles')); assert.ok(!goods.includes('black_egg'), 'lucky goods remain optional');
});
test('wardrobe rejects non-item keys without changing settings and ignores them in imported saves', () => {
  const s = farm();
  for (const key of ['playerHat', 'playerLook']) for (const value of ['__proto__', 'constructor', 'toString', ['hat_straw'], 0]) {
    const before = pack(s); assert.equal(act(s, 'setting', { key, value }, T).ok, false); assert.equal(pack(s), before);
  }
  s.settings.playerLook = '__proto__'; s.settings.playerHat = 'constructor';
  assert.equal(costumeOf(s), null); assert.equal(hatOf(s), '');
});


test('long-running farms retain the gold-rush play clock across normalization and reload', () => {
  let s = farm(); const play = 1_100_000_000;
  s.stats.playMs = play; s.surprises.rushAt = play; s.surprises.misses = 0;
  const id = Object.keys(s.homes)[0]; s.homes[id] = { level: 0, family: 'tran', arrived: true, arrivesAt: T, rentFrom: T };
  s = unpack(pack(s)); tick(s, T + 1000);
  assert.equal(s.surprises.rushAt, play, 'the saved millisecond counter must not be truncated');
  assert.equal(s.surprises.misses, 0, 'one second must not count as another rush interval');
  assert.equal(s.surprises.rush, null);
});
