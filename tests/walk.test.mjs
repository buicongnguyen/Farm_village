// Every place people are sent to is reachable on foot (core/walk.mjs): the user saw villagers sent to the village pond
// stop on the brook road, because routes only ran over road cells and the dock is ten cells off the road.
import './tz.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/core/state.mjs';
import { act, tick } from '../src/core/act.mjs';
import { doorCell, cellType, landOf, touch } from '../src/core/grid.mjs';
import { findRoute, stepCost, fenceBetween } from '../src/core/walk.mjs';
import { HOME_YARD, POND_DOCK, POND_PATH, ORDER_BOARD, MAILBOX, WELL, RUINS, FARMHOUSE, NEIGHBOUR_SIGNS, BRIDGE, STEPPING_STONES, brookZ } from '../src/content/world.mjs';
import { pack, unpack } from '../src/kit/save.mjs';
import { EXPLORATION_SITES } from '../src/content/exploration-sites.mjs';
import { LEARNING_SITE } from '../src/content/learning-site.mjs';
import { T0 } from './helpers.mjs';

const fresh = () => { const s = newGame(T0, 4242, { restore: true }); tick(s, T0); return s; };
const near = (c, t, r = 3) => Math.max(Math.abs(c[0] - t[0]), Math.abs(c[1] - t[1])) <= r;

function places(s) {
  const out = { 'pond dock': [POND_DOCK.x, POND_DOCK.z], 'order board': [ORDER_BOARD.x, ORDER_BOARD.z], mailbox: [MAILBOX.x, MAILBOX.z],
    well: [WELL.x, WELL.z], 'farmhouse yard': [FARMHOUSE.x + 6, FARMHOUSE.z + 1], 'potting bench': [LEARNING_SITE.x, LEARNING_SITE.z] };
  for (const [k, p] of Object.entries(EXPLORATION_SITES)) out[`exploration ${k}`] = [Math.floor(p.x), Math.floor(p.z)];
  for (const r of RUINS) { out[`${r.kind} site`] = [r.x + 2, r.z - 2]; out[`${r.kind} stroll`] = [r.x + 2, r.z - 1]; }
  for (const sign of NEIGHBOUR_SIGNS) out[`${sign.id} signpost`] = [sign.x, sign.z];
  for (const [id, p] of Object.entries(s.placed)) {
    const d = doorCell(p.kind, p.x, p.z, p.rot); if (d) out[`${p.kind} ${id} door`] = d;
    if (p.kind === 'bench') out[`bench ${id}`] = [p.x, p.z];
  }
  return out;
}

test('every errand destination is reachable from every home door, the farmhouse and the order board', () => {
  const s = fresh(), all = places(s);
  const starts = { 'order board': [ORDER_BOARD.x, ORDER_BOARD.z], farmhouse: [FARMHOUSE.x + 6, FARMHOUSE.z + 1] };
  for (const [id, p] of Object.entries(s.placed)) if (p.kind === 'cottage') starts[`cottage ${id}`] = doorCell(p.kind, p.x, p.z, p.rot);
  for (const [from, a] of Object.entries(starts)) for (const [to, b] of Object.entries(all)) {
    const r = findRoute(s, a, b);
    assert.ok(r.length, `${from} → ${to}: no route`);
    assert.ok(near(r.at(-1), b), `${from} → ${to}: stops at ${r.at(-1)}, not by ${b}`);
  }
});

test('sent to the village pond, people end on the bank by the dock, not on the road', () => {
  const s = fresh(), r = findRoute(s, [ORDER_BOARD.x, ORDER_BOARD.z], [POND_DOCK.x, POND_DOCK.z]);
  const end = r.at(-1);
  assert.deepEqual(end, [POND_DOCK.x, POND_DOCK.z], 'arrives at the actual dock');
  assert.notEqual(cellType(s, ...end), 'road');
  for (const c of r) assert.equal(cellType(s, ...c) === 'water' && c[0] !== STEPPING_STONES.x && !(c[0] >= BRIDGE.x0 && c[0] <= BRIDGE.x1), false, `wades through ${c}`);
});

test('the road bridge and the stepping stones cross the brook; the rest of it and the pond do not', () => {
  const s = fresh();
  assert.ok(stepCost(s, BRIDGE.x0, brookZ(BRIDGE.x0)) > 0, 'the road bridge');
  assert.ok(stepCost(s, STEPPING_STONES.x, brookZ(STEPPING_STONES.x)) > 0, 'the stepping stones');
  assert.equal(stepCost(s, 60, brookZ(60)), 0, 'open brook');
  assert.equal(stepCost(s, POND_DOCK.x - 3, POND_DOCK.z), 0, 'the pond');
  const twins = NEIGHBOUR_SIGNS.find(n => n.id === 'twins');
  assert.ok(findRoute(s, [twins.x, twins.z], [ORDER_BOARD.x, ORDER_BOARD.z]).length, 'the twins walk in across the brook');
});

test('routes keep to the road where it is as short, and never cross a fence or a building', () => {
  const s = fresh(), a = [28, 30], b = [28, 80], r = findRoute(s, a, b);
  assert.deepEqual(r.filter(c => cellType(s, ...c) !== 'road' && Math.abs(c[1] - brookZ(c[0])) > 1), [], 'leaves the road');
  const id = Object.keys(s.placed).find(k => s.placed[k].kind === 'cottage'), p = s.placed[id];
  const blocked = findRoute(s, [ORDER_BOARD.x, ORDER_BOARD.z], doorCell(p.kind, p.x, p.z, p.rot));
  for (const c of blocked) assert.ok(stepCost(s, ...c) > 0 || (c[0] === ORDER_BOARD.x && c[1] === ORDER_BOARD.z), `steps into ${c}`);
  assert.ok(findRoute(s, [18, 42], [29, 42], { exact: true }).length, 'route exists before the fence closes');
  s.fences = {}; for (let z = 0; z < 128; z++) s.fences[`28,${z},w`] = 'fence';   // a fence line the whole map tall
  const across = findRoute(s, [18, 42], [29, 42], { exact: true });
  assert.deepEqual(across, [], 'an impassable fence must refuse the route');
});

for (const mode of ['restored opening', 'legacy farm', 'saved farm']) test(`${mode}: the public pond is reachable without buying land or building a path`, () => {
  const s = mode === 'legacy farm' ? newGame(T0, 4242) : mode === 'saved farm' ? unpack(pack(fresh())) : fresh();
  const dock = [POND_DOCK.x, POND_DOCK.z], home = [FARMHOUSE.x + 5, FARMHOUSE.z];
  const before = pack(s);
  assert.equal(landOf(s, ...dock), null, 'the pond is public land');
  const refused = act(s, 'place', { kind: 'path', x: dock[0], z: dock[1] }, T0);
  assert.equal(refused.ok, false, 'players still cannot build outside their land');
  assert.equal(pack(s), before, 'refused building changed the saved farm');
  for (const [from, to] of [[home, dock], [dock, home]]) {
    const route = findRoute(s, from, to, { exact: true });
    assert.deepEqual(route[0], from); assert.deepEqual(route.at(-1), to);
    for (let i = 1; i < route.length; i++) {
      const a = route[i - 1], b = route[i];
      assert.equal(Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]), 1, 'route jumped a cell');
      assert.ok(stepCost(s, ...b), `blocked step ${b}`); assert.equal(fenceBetween(s, a, b), false);
    }
  }
  for (let x = POND_PATH.x0; x <= POND_PATH.x1; x++) for (let z = POND_PATH.z0; z <= POND_PATH.z1; z++) assert.ok(stepCost(s, x, z), `public path ${x},${z}`);
  assert.equal(pack(s), before, 'routing charged coins, changed land, or wrote paths into the save');
});

test('exact destinations refuse blocked docks instead of substituting a nearby roadside cell', () => {
  const s = fresh(), dock = [POND_DOCK.x, POND_DOCK.z], blocked = new Set([dock.join(',')]);
  assert.deepEqual(findRoute(s, [28, 42], dock, { exact: true, blocked }), []);
  assert.ok(findRoute(s, [28, 42], dock, { blocked }).length, 'ordinary chores may still approach a blocked object');
  for (const target of [[-1, 42], [128, 42], [18.5, 42], [NaN, 42]]) assert.deepEqual(findRoute(s, [28, 42], target), [], `invalid target ${target}`);
});

test('routes do not cross covered land, uncleared rocks or weeds, buildings, ruins, or animal pens', () => {
  const s = fresh();
  assert.equal(stepCost(s, 52, 63), 0, 'unbought farm parcel');
  for (const value of [1, 2]) { s.cells[68 * 128 + 44] = value; touch(s); assert.equal(stepCost(s, 44, 68), 0, `uncleared terrain ${value}`); }
  for (const ruin of RUINS) assert.equal(stepCost(s, ruin.x, ruin.z), 0, `unrestored ${ruin.kind}`);
  const pen = new Set(['28,42', `${POND_PATH.x1},42`]);
  assert.equal(stepCost(s, 28, 42, pen), 0, 'pens block even a road cell');
  assert.equal(stepCost(s, POND_PATH.x1, 42, pen), 0, 'pens block even a public path cell');
  const dock = [POND_DOCK.x, POND_DOCK.z], route = findRoute(s, [29, 42], dock, { exact: true, blocked: pen });
  assert.deepEqual(route.at(-1), dock); assert.ok(route.every(c => !pen.has(c.join(','))), 'walked through a blocked pen');
});

test('diagonal dog steps still detect an east or west fence when the north or south edge is open', () => {
  const s = fresh(); s.fences = { '31,61,w': 'fence' };
  assert.equal(fenceBetween(s, [30, 60], [31, 61]), true);
  assert.equal(fenceBetween(s, [31, 61], [30, 60]), true);
  assert.equal(fenceBetween(s, [30, 60], [30, 61]), false);
});

test('the farmhouse yard and the family home spots are open ground, not part of the house', () => {
  const s = fresh();
  for (let x = HOME_YARD.x0; x <= HOME_YARD.x1; x++) for (let z = HOME_YARD.z0; z <= HOME_YARD.z1; z++) {
    assert.ok(stepCost(s, x, z) > 0, `yard ${x},${z}`);
    const r = findRoute(s, [POND_DOCK.x, POND_DOCK.z], [x, z]); assert.deepEqual(r.at(-1), [x, z], `walk home to ${x},${z}`);
  }
  for (const [dx, dz] of [[4, 0], [4, 3], [3, -4], [1, 5], [4, -3]]) assert.ok(stepCost(s, FARMHOUSE.x + dx, FARMHOUSE.z + dz) > 0, `home spot ${dx},${dz}`);
});
