// Old buildings: a ruin can be cleared away, old village buildings can be demolished, and a police post or company
// office is rebuilt on its old site even when paths or loose things were left on it.
import './tz.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { act } from '../src/core/act.mjs';
import * as grid from '../src/core/grid.mjs';
import { stepCost } from '../src/core/walk.mjs';
import { civicRebuildPlan, placementPrice } from '../src/core/build.mjs';
import { ruinStands, cleared } from '../src/core/ruins.mjs';
import { RUINS, N } from '../src/content/world.mjs';
import { BUILDINGS } from '../src/content/buildings.mjs';
import { FAMILIES } from '../src/content/people.mjs';
import { DEMOLISH } from '../src/content/economy.mjs';
import { CELL_TYPES } from '../src/core/state.mjs';
import { pack, unpack } from '../src/kit/save.mjs';
import { game, T0 } from './helpers.mjs';

const site = kind => RUINS.find(r => r.kind === kind);
function village() {
  const s = game(); s.level = 20; s.coins = 50000; s.story.chapter = 5; s.projects.step = 99;
  for (let z = 92; z <= 116; z++) for (let x = 32; x <= 95; x++) if ([CELL_TYPES.weeds, CELL_TYPES.rock].includes(s.cells[z * N + x])) s.cells[z * N + x] = CELL_TYPES.grass;
  grid.touch(s); return s;
}
/** Things left on a lot by an older version, which let anything be placed there. */
function clutter(s, kind) {
  const r = site(kind);
  s.placed.oldBench = { kind: 'bench', x: r.x + 2, z: r.z + 1, rot: 0 }; s.counts.bench = (s.counts.bench ?? 0) + 1;
  s.cells[(r.z + 1) * N + r.x + 1] = CELL_TYPES.path; s.counts.path = (s.counts.path ?? 0) + 1; grid.touch(s);
}

test('nothing new goes where an old building stands; a cleared school lot is free land, a police lot stays kept', () => {
  const s = village();
  for (const r of RUINS) for (const kind of ['bench', 'path', 'cottage']) assert.equal(grid.canPlace(s, kind, r.x + 1, r.z + 1, 0).ok, false, `${kind} on the ${r.kind} lot`);
  assert.equal(grid.canPlace(s, 'bench', site('police').x + 1, site('police').z + 1, 0).reason, 'Kept for the old building that stands here');
  assert.ok(ruinStands(s, 'school')); assert.equal(stepCost(s, site('school').x + 1, site('school').z + 1), 0, 'you can walk through the old school');
  assert.equal(act(s, 'clearRuin', { kind: 'school' }, T0).ok, true);
  assert.ok(cleared(s, 'school') && !ruinStands(s, 'school'));
  assert.equal(grid.canPlace(s, 'bench', site('school').x + 1, site('school').z + 1, 0).ok, true, 'the cleared school lot is not free');
  assert.ok(stepCost(s, site('school').x + 1, site('school').z + 1) > 0);
  assert.equal(act(s, 'clearRuin', { kind: 'school' }, T0).ok, false, 'cleared twice');
  assert.equal(act(s, 'clearRuin', { kind: 'police' }, T0).ok, true);
  assert.equal(grid.canPlace(s, 'bench', site('police').x + 1, site('police').z + 1, 0).ok, false, 'the police lot was given away');
  assert.equal(civicRebuildPlan(s, 'police').ok, true, 'the police post cannot return to its cleared lot');
  assert.ok(cleared(unpack(pack(s)), 'police'), 'the cleared lot is forgotten on reload');
  assert.equal(act(s, 'clearRuin', { kind: 'barn' }, T0).ok, false);
});

test('a rebuild clears its own site: paths are lifted, loose things go into storage, the door path is laid', () => {
  const s = village(); clutter(s, 'police');
  const r = site('police');
  assert.equal(grid.canPlace(s, 'police', r.x, r.z, r.rot).ok, false, 'the clutter does not block an ordinary placement');
  const plan = civicRebuildPlan(s, 'police'); assert.equal(plan.ok, true, plan.reason); assert.equal(plan.moved, 2);
  assert.equal(plan.price, placementPrice(s, 'police') + placementPrice(s, 'path'));
  const coins = s.coins, done = act(s, 'rebuildCivic', { kind: 'police' }, T0); assert.equal(done.ok, true, done.reason);
  assert.equal(s.counts.police, 1); assert.equal(s.coins, coins - plan.price);
  assert.equal(s.stored.bench, 1, 'the bench was not kept'); assert.equal(s.placed.oldBench, undefined);
  const placed = Object.values(s.placed).find(p => p.kind === 'police'); assert.deepEqual([placed.x, placed.z, placed.rot], [r.x, r.z, r.rot]);
  const door = grid.doorCell('police', r.x, r.z, r.rot); assert.equal(grid.cellType(s, ...door), 'path');
  assert.equal(act(s, 'rebuildCivic', { kind: 'police' }, T0).ok, false, 'built twice');
});

test('a rebuild that cannot go ahead changes nothing and says why', () => {
  const s = village(), r = site('company');
  // a family's cottage on the lot cannot be put away
  s.placed.home9 = { kind: 'cottage', x: r.x, z: r.z, rot: 0 }; s.counts.cottage = (s.counts.cottage ?? 0) + 1; s.homes.home9 = { level: 0, family: FAMILIES[0].id, arrivesAt: T0, arrived: true, rentFrom: T0 }; grid.touch(s);
  s.placed.jp = { kind: 'juice_press', x: 40, z: 60, rot: 0 }; s.placed.nf = { kind: 'noodle_factory', x: 43, z: 60, rot: 0 }; s.counts.juice_press = s.counts.noodle_factory = 1; grid.touch(s);
  const before = JSON.stringify(s), plan = civicRebuildPlan(s, 'company');
  assert.equal(plan.ok, false); assert.equal(plan.reason, 'Move {name} off the old site first'); assert.equal(plan.params.name, BUILDINGS.cottage.name);
  assert.equal(act(s, 'rebuildCivic', { kind: 'company' }, T0).ok, false); assert.equal(JSON.stringify(s), before);
  // too few coins: nothing is lifted or stored first
  const poor = village(); clutter(poor, 'police'); poor.coins = 100; const was = JSON.stringify(poor);
  assert.equal(act(poor, 'rebuildCivic', { kind: 'police' }, T0).reason, 'Not enough coins'); assert.equal(JSON.stringify(poor), was);
  assert.equal(act(poor, 'rebuildCivic', { kind: 'school' }, T0).ok, false); assert.equal(act(poor, 'rebuildCivic', { kind: 'constructor' }, T0).ok, false);
});

test('old village buildings can be demolished and built again; the market square and a company in use cannot', () => {
  const s = village();
  assert.equal(act(s, 'rebuildCivic', { kind: 'police' }, T0).ok, true);
  const id = Object.keys(s.placed).find(k => s.placed[k].kind === 'police'), coins = s.coins;
  const r = act(s, 'demolish', { id }, T0); assert.equal(r.ok, true, r.reason);
  assert.equal(r.refund, Math.floor(BUILDINGS.police.cost * DEMOLISH.refund)); assert.equal(s.coins, coins + r.refund);
  assert.equal(s.counts.police, 0); assert.ok(!ruinStands(s, 'police'), 'the old ruin came back');
  const again = civicRebuildPlan(s, 'police'); assert.equal(again.ok, true, again.reason); assert.ok(again.price < BUILDINGS.police.cost, 'no rebuild credit');
  assert.equal(act(s, 'rebuildCivic', { kind: 'police' }, T0).ok, true);
  // the school and the clinic too
  for (const kind of ['school', 'clinic']) {
    s.placed[kind] = { kind, x: site(kind).x, z: site(kind).z, rot: site(kind).rot }; s.counts[kind] = 1; grid.touch(s);
    assert.equal(act(s, 'demolish', { id: kind }, T0).ok, true, kind); assert.equal(s.counts[kind], 0);
  }
  // the market square stays; a company with staff says what to do first
  s.placed.mk = { kind: 'market', x: 60, z: 96, rot: 0 }; s.counts.market = 1; grid.touch(s);
  assert.equal(act(s, 'demolish', { id: 'mk' }, T0).reason, 'Village buildings can be moved, not demolished');
  s.placed.jp = { kind: 'juice_press', x: 40, z: 60, rot: 0 }; s.placed.nf = { kind: 'noodle_factory', x: 43, z: 60, rot: 0 }; s.counts.juice_press = s.counts.noodle_factory = 1; grid.touch(s);
  assert.equal(act(s, 'rebuildCivic', { kind: 'company' }, T0).ok, true);
  const office = Object.keys(s.placed).find(k => s.placed[k].kind === 'company'), adult = FAMILIES[0].people.find(p => !p.kid).id;
  s.growth = { ...(s.growth ?? {}), staff: { worker: null, manager: { person: adult } } };
  const busy = JSON.stringify(s); assert.equal(act(s, 'demolish', { id: office }, T0).reason, 'Release the company staff first'); assert.equal(JSON.stringify(s), busy);
  s.growth.staff.manager = null; assert.equal(act(s, 'demolish', { id: office }, T0).ok, true);
});
