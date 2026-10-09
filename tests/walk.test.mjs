// Every place people are sent to is reachable on foot (core/walk.mjs): the user saw villagers sent to the village pond
// stop on the brook road, because routes only ran over road cells and the dock is ten cells off the road.
import './tz.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/core/state.mjs';
import { tick } from '../src/core/act.mjs';
import { doorCell, cellType } from '../src/core/grid.mjs';
import { findRoute, stepCost } from '../src/core/walk.mjs';
import { HOME_YARD, POND_DOCK, ORDER_BOARD, MAILBOX, WELL, RUINS, FARMHOUSE, NEIGHBOUR_SIGNS, BRIDGE, STEPPING_STONES, brookZ } from '../src/content/world.mjs';
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
  assert.ok(near(end, [POND_DOCK.x, POND_DOCK.z], 1), `ends at ${end}`);
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
  s.fences = {}; for (let z = 0; z < 128; z++) s.fences[`40,${z},w`] = 'fence';   // a fence line the whole map tall
  const across = findRoute(s, [36, 50], [44, 50]);
  for (let i = 1; i < across.length; i++) assert.ok(!(across[i - 1][0] === 39 && across[i][0] === 40) && !(across[i - 1][0] === 40 && across[i][0] === 39), 'crosses the fence');
});

test('the farmhouse yard and the family home spots are open ground, not part of the house', () => {
  const s = fresh();
  for (let x = HOME_YARD.x0; x <= HOME_YARD.x1; x++) for (let z = HOME_YARD.z0; z <= HOME_YARD.z1; z++) {
    assert.ok(stepCost(s, x, z) > 0, `yard ${x},${z}`);
    const r = findRoute(s, [POND_DOCK.x, POND_DOCK.z], [x, z]); assert.deepEqual(r.at(-1), [x, z], `walk home to ${x},${z}`);
  }
  for (const [dx, dz] of [[4, 0], [4, 3], [3, -4], [1, 5], [4, -3]]) assert.ok(stepCost(s, FARMHOUSE.x + dx, FARMHOUSE.z + dz) > 0, `home spot ${dx},${dz}`);
});
