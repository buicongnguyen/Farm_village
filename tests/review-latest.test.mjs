import './tz.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/core/state.mjs';
import { act, tick } from '../src/core/act.mjs';
import { PORT, installPort, makeHolds, portOf, shipPays } from '../src/core/port.mjs';
import { pack, unpack } from '../src/kit/save.mjs';
import { HELP, FIELD_WORK } from '../src/content/economy.mjs';
import { GOODS, FRUITS } from '../src/content/goods.mjs';
import { goodHelp } from '../src/core/good-help.mjs';
import { SUPERMARKET, SHOP_SECTIONS } from '../src/content/supermarket.mjs';
import { basketPrice } from '../src/core/supermarket-state.mjs';
import { animalYield } from '../src/core/output.mjs';
import { familyBeds } from '../src/core/machines.mjs';
import { workFieldRound, observeFieldWork } from '../src/core/field-work.mjs';
import { plantTree, treeDuration, treeState } from '../src/core/trees.mjs';
const NOW = 1_800_000_000_000;
installPort();
function farm() {
  const s = newGame(NOW, 73); s.level = 20; s.coins = 10000; s.barn.cap = 10000;
  s.firsts.quay = NOW; s.projects.step = 999; s.story.chapter = 20; s.story.tutorial = 999;
  s.helpAt = s.handsAt = NOW + 100000000; return s;
}
function ctx(s, now = NOW) { return { s, now, events: [], emit() {}, fail: reason => ({ ok: false, reason }) }; }
function put(s, id, kind, x = 35, z = 60) { s.placed[id] = { kind, x, z, rot: 0 }; }

test('ship timetables recover from a backward clock without losing loaded goods or paying twice', () => {
  const s = farm(); tick(s, NOW); tick(s, NOW + PORT.firstMs);
  const h = s.port.here.holds[0]; s.barn.items[h.good] = h.need;
  assert.ok(act(s, 'loadHold', { hold: 0 }, NOW + PORT.firstMs).ok);
  const reload = unpack(pack(s)), back = NOW - 86_400_000;
  tick(reload, back);
  assert.equal(reload.port.here.until, back + PORT.stopMs);
  assert.equal(reload.port.here.at, back);
  assert.equal(reload.port.here.holds[0].have, h.need);
  const paid = tick(reload, back + PORT.stopMs).events.filter(e => e.type === 'shipLeft');
  assert.equal(paid.length, 1); assert.equal(paid[0].coins, h.need * GOODS[h.good].value * PORT.pay);
  assert.equal(tick(reload, back + PORT.stopMs + 1).events.filter(e => e.type === 'shipLeft').length, 0);
  const waiting = farm(); tick(waiting, NOW); tick(waiting, back);
  assert.equal(waiting.port.nextAt, back + PORT.firstMs);
});

test('damaged optional manifests do not crash the panel or invent a full-ship bonus', () => {
  const s = farm(); s.port = { n: 2, nextAt: NOW, here: { n: 2, at: NOW, until: NOW + PORT.stopMs,
    holds: [{ good: 'wheat', need: 4, have: 2 }, { good: 'missing-good', need: 4, have: 4 }] } };
  const before = pack(s); assert.equal(act(s, 'loadHold', { hold: 0 }, NOW).ok, false); assert.equal(pack(s), before);
  assert.equal(portOf(s, NOW).here, false);
  tick(s, NOW); assert.deepEqual(s.port.here.holds, [{ good: 'wheat', need: 4, have: 2 }]);
  const paid = tick(s, NOW + PORT.stopMs).events.find(e => e.type === 'shipLeft');
  assert.equal(paid.coins, 2 * GOODS.wheat.value); assert.equal(paid.bonus, 0);
  assert.equal(shipPays({ holds: [] }).coins, 0);
  for (const raw of [[], 'broken', { here: {} }, { nextAt: null, n: -1 }]) {
    const broken = farm(); broken.port = raw; assert.doesNotThrow(() => tick(broken, NOW));
    assert.equal(broken.port.nextAt, NOW + PORT.firstMs);
  }
});

test('a small ship manifest repeats a real source instead of requiring crops without beds', () => {
  const s = farm(); s.placed = {}; s.beds = {}; s.animals = {}; s.trees = {};
  put(s, 'tree', 'cherry_tree'); plantTree(s, 'tree', NOW);
  const holds = makeHolds(s, 3);
  assert.equal(holds.length, PORT.holds); assert.ok(holds.every(h => h.good === 'cherry'));
});

test('ship loading leaves accepted supermarket reserves in the barn and refuses invalid quantities atomically', () => {
  const s = farm(); tick(s, NOW); tick(s, NOW + PORT.firstMs);
  const [section, def] = Object.entries(SHOP_SECTIONS)[0], good = def.goods[0], need = { [good]: SUPERMARKET.units };
  s.supermarket = { sections: { [section]: { restoredAt: NOW } }, serial: 0,
    request: { id: 'shop:0', section, need, payment: basketPrice(need), accepted: true, offeredAt: NOW } };
  s.port.here.holds[0] = { good, need: 10, have: 0 }; s.barn.items[good] = SUPERMARKET.units + 2;
  assert.ok(act(s, 'loadHold', { hold: 0 }, NOW + PORT.firstMs).ok);
  assert.equal(s.barn.items[good], SUPERMARKET.units); assert.equal(s.port.here.holds[0].have, 2);
  const saved = pack(s);
  for (const n of [undefined, 0.5, -1, Infinity]) assert.equal(act(s, 'loadHold', { hold: 0, n }, NOW + PORT.firstMs).ok, false);
  assert.equal(pack(s), saved);
});

test('family assignments get buffalo capacity and tractor capacity only on expanded fields; unassigned crops stay', () => {
  const s = farm(); s.placed = {}; s.beds = {}; s.parcels.push('1,2');
  put(s, 'tractor', 'tractor_shed', 58, 62);
  const ids = Array.from({ length: 12 }, (_, i) => 'b' + i);
  ids.forEach((id, i) => { put(s, id, 'bed', i < 6 ? 34 + i : 49 + i - 6, 58); s.beds[id] = { crop: 'carrot', doneAt: NOW }; });
  const targets = ids.slice(0, 11);
  assert.deepEqual(familyBeds(s, targets), [...targets.slice(0, HELP.beds), ...targets.slice(6)]);
  assert.ok(act(s, 'startFieldWork', { ids: targets, owner: 'family' }, NOW).ok);
  observeFieldWork(ctx(s, NOW)); assert.equal(workFieldRound(ctx(s, NOW + FIELD_WORK.graceMs - 1), 'family').count, 0);
  assert.equal(workFieldRound(ctx(s, NOW + FIELD_WORK.graceMs), 'family').count, HELP.beds + 5);
  assert.ok(s.beds.b11, 'unassigned ripe bed harvested'); assert.ok(!s.beds.b6, 'tractor did not work its assigned new field');
  assert.ok(s.beds.b5, 'tractor worked an extra old-field bed');
  put(s, 'ox', 'buffalo_pen', 56, 62);
  assert.equal(workFieldRound(ctx(s, NOW + FIELD_WORK.graceMs + 1), 'family').count, 6 - HELP.beds);
  assert.equal(s.fieldWork.job, null); assert.ok(s.beds.b11);
});

test('milk source counts match radio and output upgrades for ready and waiting animals', () => {
  const s = farm(); put(s, 'cow', 'cow_barn'); s.music = { cow: true }; s.outputUp = { cow: 2 };
  s.animals.cow = [{ kind: 'cow', doneAt: NOW }, { kind: 'cow', doneAt: NOW + 1000 }];
  const source = goodHelp(s, 'milk', NOW).source;
  assert.equal(source.ready, 6); assert.equal(source.queued, 6); assert.equal(source.ready, animalYield(s, 'cow'));
  const before = s.barn.items.milk ?? 0; assert.ok(act(s, 'collect', { home: 'cow' }, NOW).ok);
  assert.equal(s.barn.items.milk - before, source.ready);
});

test('empty upgraded buildings cannot lose paid improvements through storage or undo', () => {
  for (const upgrade of ['music', 'outputUp']) {
    const s = farm(); put(s, 'cow', 'cow_barn'); s[upgrade] = { cow: upgrade === 'music' ? true : 1 };
    s.undo = [{ type: 'place', kind: 'cow_barn', id: 'cow', price: 500, xp: 0 }];
    for (const action of ['store', 'undo']) { const before = pack(s); assert.equal(act(s, action, { id: 'cow' }, NOW).ok, false); assert.equal(pack(s), before); }
    assert.equal(unpack(pack(s))[upgrade].cow, s[upgrade].cow);
  }
});

test('sprayed regrowth keeps its quoted duration through pad removal, save and a backward clock; stored trees also benefit', () => {
  const s = farm(); put(s, 'tree', 'cherry_tree'); put(s, 'drone', 'drone_pad', 55, 62);
  plantTree(s, 'tree', NOW, { regrow: true }); const wait = Math.round(FRUITS.cherry.regrowMs * 0.75);
  assert.equal(s.trees.tree.doneAt, NOW + wait); assert.equal(treeDuration(s, 'tree'), wait);
  delete s.placed.drone; assert.equal(treeDuration(s, 'tree'), wait);
  assert.ok(Math.abs(treeState(s, 'tree', NOW + wait / 2).progress - 0.5) < 1e-6);
  const reload = unpack(pack(s)); tick(reload, NOW - 86_400_000);
  assert.equal(reload.trees.tree.doneAt, NOW - 86_400_000 + wait);
  assert.ok(act(reload, 'pick', { id: 'tree' }, reload.trees.tree.doneAt).ok);
  assert.equal(treeDuration(reload, 'tree'), FRUITS.cherry.regrowMs);
});

test('machine routes stay on clear purchased land and park when a building, rock or fence obstructs the loop', async () => {
  const { plan } = await import('../src/view/machines-view.mjs');
  const { touch } = await import('../src/core/grid.mjs');
  const s = farm(); s.placed = {}; s.cells.fill(0); s.fences = {}; s.parcels.push('1,2');
  put(s, 'old', 'bed', 38, 60); put(s, 'new', 'bed', 54, 60); put(s, 'tractor', 'tractor_shed', 58, 65);
  let p = plan(s); assert.ok(p.tractorLoop); assert.ok(p.tractorLoop[0] > 48 * 2, 'tractor loops round opening beds');
  const x = Math.floor(p.tractorLoop[0] / 2), z = Math.floor(p.tractorLoop[1] / 2);
  s.cells[z * 128 + x] = 2; assert.equal(plan(s).tractorLoop, null, 'crosses a rock'); s.cells[z * 128 + x] = 0;
  put(s, 'block', 'cow_barn', x, z); touch(s); assert.equal(plan(s).tractorLoop, null, 'crosses a building');
  delete s.placed.block; touch(s); s.fences[`${x + 1},${z},w`] = 'wood_fence'; assert.equal(plan(s).tractorLoop, null, 'crosses a fence');
  s.fences = {}; s.parcels = ['0,2']; assert.equal(plan(s).tractorLoop, null, 'works unowned land');
});

test('imported body choices cannot select inherited properties or non-string model keys', async () => {
  const { bodyOf } = await import('../src/content/wardrobe.mjs');
  for (const value of ['__proto__', 'constructor', 'toString', ['girl'], null, {}]) {
    const s = farm(); s.settings.playerBody = value; assert.equal(bodyOf(unpack(pack(s))).id, 'man');
    const saved = pack(s); assert.equal(act(s, 'setting', { key: 'playerBody', value }, NOW).ok, false); assert.equal(pack(s), saved);
  }
});
