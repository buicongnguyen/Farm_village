// Exercise the actual actor state machines, not merely path creation: being told to fish must end at the dock.
import './tz.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/core/state.mjs';
import { act } from '../src/core/act.mjs';
import { touch } from '../src/core/grid.mjs';
import { fenceBetween, stepCost } from '../src/core/walk.mjs';
import { CELL, FARMHOUSE, POND_DOCK, POND_PATH } from '../src/content/world.mjs';
import { pack, unpack } from '../src/kit/save.mjs';
import { T0 } from './helpers.mjs';

const previousDocument = globalThis.document;
globalThis.document = { documentElement: {}, addEventListener() {} };
const { PeopleView } = await import('../src/view/people-view.mjs');
const { WorldView, GROUND_COLORS } = await import('../src/view/world-view.mjs');
const { planWilds } = await import('../src/view/dress.mjs');
if (previousDocument === undefined) delete globalThis.document; else globalThis.document = previousDocument;
const center = ([x, z]) => [(x + .5) * CELL, (z + .5) * CELL];
const dock = [POND_DOCK.x, POND_DOCK.z], home = [FARMHOUSE.x + 5, FARMHOUSE.z];
const at = (w, cell) => Math.hypot(w.x - center(cell)[0], w.z - center(cell)[1]) < .05;

function fixture(id, s = unpack(pack(newGame(T0, 4242, { restore: true })))) {
  const spoken = [], casts = [], [x, z] = center([28, 58]);
  const w = { id, body: id === 'june' ? 'woman' : 'man', family: id !== 'minh', player: id === 'you',
    x, z, home: [...home], rot: 0, route: [], wait: 0, stay: 999, clip: 'Idle', subject: {} };
  const view = Object.assign(Object.create(PeopleView.prototype), {
    game: { s, now: T0, do(action, payload) { if (action === 'castLine') casts.push([w.x, w.z]); return act(s, action, payload, T0); } },
    world: { cam: { x: center(home)[0], z: center(home)[1] }, life: { penArea: () => [] } },
    time: 0, walkers: new Map([[id, w]]), say: (_, line) => spoken.push(line), familySpot: () => [...home],
  });
  return { s, view, w, spoken, casts };
}
function advance(f, done, { night = false, max = 2400, safe = true } = {}) {
  const { view, w, s } = f;
  for (let i = 0; i < max && !done(); i++) {
    const old = [w.x, w.z], from = view.cellOf(w); view.time += .1;
    view[w.player ? 'livePlayer' : w.family ? 'liveFamily' : 'liveVillager'](w, .1, night);
    if (safe) {
      assert.ok(Math.hypot(w.x - old[0], w.z - old[1]) <= .4, 'actor teleported instead of walking');
      assert.ok(stepCost(s, ...view.cellOf(w), view.penCells()), `stood on blocked cell ${view.cellOf(w)}`);
      assert.equal(fenceBetween(s, from, view.cellOf(w)), false, 'actor crossed a fence');
    }
  }
  assert.ok(done(), `${w.id} never completed trip: ${JSON.stringify({ cell: view.cellOf(w), target: w.target, goal: w.goal, route: w.route.length, clip: w.clipFor })}`);
}
const sitting = w => w.clipFor === 'Sit' && !w.goal && !w.target && !w.todo && !w.route.length;
function enclose(s, [x, z]) { for (const k of [`${x},${z},n`, `${x},${z + 1},n`, `${x},${z},w`, `${x + 1},${z},w`]) s.fences[k] = 'fence'; }
function builtPond(f) {
  const { s, w } = f;
  for (const [id, p] of Object.entries(s.placed)) if (p.x >= 32 && p.x < 48 && p.z >= 56 && p.z < 72) delete s.placed[id];
  for (let z = 56; z < 72; z++) for (let x = 32; x < 48; x++) s.cells[z * 128 + x] = 0;
  const pond = { kind: 'pond', x: 38, z: 64, rot: 0 }; s.placed.testPond = pond; touch(s);
  [w.x, w.z] = center([36, 66]); return pond;
}

for (const id of ['you', 'june', 'minh']) test(`${id}: a saved opening farm reaches the public dock and returns home without new land or paths`, () => {
  const f = fixture(id), { s, view, w, casts } = f, before = { coins: s.coins, parcels: s.parcels, cells: [...s.cells], placed: structuredClone(s.placed) };
  assert.equal(view.sendFishing(w), true); assert.equal(casts.length, 0, 'cast before reaching water');
  advance(f, () => sitting(w));
  assert.ok(at(w, w.fishSpot), 'sat on the road instead of the reserved fishing spot');
  assert.equal(casts.length, id === 'you' ? 1 : 0, 'only the player casts a line');
  if (casts.length) assert.deepEqual(casts[0], center(dock), 'cast before arriving at the actual dock');
  assert.deepEqual({ coins: s.coins, parcels: s.parcels, cells: [...s.cells], placed: s.placed }, before, 'trip changed land, costs, or structures');
  if (w.player) assert.ok(act(s, 'reelIn', { steady: true }, s.fishing.line.doneAt).ok, 'finish the catch before returning home');
  w.wait = 0; w.stay = -1;
  advance(f, () => at(w, home) && (id === 'minh' ? w.indoors : !w.goal && !w.target), { night: id === 'minh' });
  assert.equal(casts.length, id === 'you' ? 1 : 0, 'returning home cast a second line');
});

for (const id of ['you', 'june', 'minh']) test(`${id}: an unreachable shore cancels an old fishing trip without a false arrival or cast`, () => {
  const f = fixture(id), { s, view, w, casts, spoken } = f;
  assert.equal(view.sendFishing(w), true);
  enclose(s, view.cellOf(w)); const before = pack(s), position = [w.x, w.z], speeches = spoken.length;
  assert.equal(view.sendFishing(w), false);
  assert.equal(w.route.length, 0); assert.ok(!w.goal && !w.target && !w.todo && !w.onArrive && !w.fishing, 'refused trip left work pending');
  assert.deepEqual([w.x, w.z], position); assert.equal(casts.length, 0); assert.equal(pack(s), before);
  assert.equal(spoken.length, speeches, 'announced a trip which cannot start');
});

test('a later player chore cancels the queued cast; there is no delayed fish on arrival elsewhere', () => {
  const f = fixture('you'); f.view.sendFishing(f.w); f.view.playerGo({ x: 29, z: 59 });
  advance(f, () => !f.w.goal && !f.w.route.length);
  assert.equal(f.casts.length, 0); assert.ok(!f.w.onArrive); assert.equal(f.s.fishing.line, null);
});

for (const id of ['you', 'june', 'minh']) test(`${id}: a new fence on a planned step causes a detour instead of walking through it`, () => {
  const f = fixture(id), { s, view, w } = f; view.sendFishing(w);
  const a = w.route[0], b = w.route[1]; assert.ok(b, 'trip has no second step');
  s.fences[b[0] === a[0] ? `${a[0]},${Math.max(a[1], b[1])},n` : `${Math.max(a[0], b[0])},${a[1]},w`] = 'fence';
  advance(f, () => sitting(w)); assert.ok(at(w, w.fishSpot));
});

for (const id of ['you', 'june', 'minh']) test(`${id}: closing every route during a trip cancels without teleporting or pretending to fish`, () => {
  const f = fixture(id), { view, w, s, casts } = f; view.sendFishing(w); enclose(s, view.cellOf(w));
  const position = [w.x, w.z];
  advance(f, () => !w.route.length && !w.goal && !w.target && !w.todo && !w.onArrive && !w.fishing);
  assert.deepEqual([w.x, w.z], position); assert.notEqual(w.clipFor, 'Sit'); assert.equal(casts.length, 0);
});

test('greeting another villager never cancels an explicitly requested fishing trip', () => {
  const f = fixture('minh'), other = { ...f.w, id: 'lan', route: [[28, 58], [29, 58]], subject: {} };
  f.view.walkers.set(other.id, other); f.view.sendFishing(f.w); const route = structuredClone(f.w.route), random = Math.random;
  try { Math.random = () => 0; f.view.greet(); } finally { Math.random = random; }
  assert.deepEqual(f.w.route, route); assert.equal(f.w.todo?.act, 'fish');
});

test('a family member fishes on a built pond shore and faces that pond, not the village pond', () => {
  const f = fixture('june'), { s, view, w } = f;
  const pond = builtPond(f); assert.equal(view.sendFishing(w, pond), true);
  advance(f, () => sitting(w));
  const cell = view.cellOf(w); assert.ok(cell[0] < 38 || cell[0] > 41 || cell[1] < 64 || cell[1] > 67, 'sat in pond water');
  assert.ok(Math.max(Math.abs(cell[0] - 40), Math.abs(cell[1] - 66)) <= 3, `sat away from built pond at ${cell}`);
  const toward = [Math.sin(w.faceTo), Math.cos(w.faceTo)], toPond = [center([40, 66])[0] - w.x, center([40, 66])[1] - w.z];
  assert.ok(toward[0] * toPond[0] + toward[1] * toPond[1] > 0, 'faced away from the built pond');
  assert.equal(f.casts.length, 0);
});

test('a built pond with its usual shore blocked uses another actual shore', () => {
  const f = fixture('you'), pond = builtPond(f);
  f.s.placed.blockedShore = { kind: 'bench', x: 42, z: 66, rot: 0 }; touch(f.s);
  assert.equal(f.view.sendFishing(f.w, pond), true);
  assert.notDeepEqual(f.w.route.at(-1), [42, 66]);
  advance(f, () => sitting(f.w));
  assert.ok([[40, 68], [37, 66], [40, 63]].some(cell => at(f.w, cell)), 'substituted a cell which is not a pond shore');
  assert.equal(f.casts.length, 1);
});

for (const id of ['you', 'june', 'minh']) for (const change of ['stored', 'moved']) test(`${id}: a ${change} built pond cancels its pending fishing trip`, () => {
  const f = fixture(id), pond = builtPond(f); assert.equal(f.view.sendFishing(f.w, pond), true);
  if (change === 'stored') delete f.s.placed.testPond; else pond.x++;
  touch(f.s); const position = [f.w.x, f.w.z];
  advance(f, () => !f.w.route.length && !f.w.goal && !f.w.target && !f.w.todo && !f.w.onArrive && !f.w.fishing);
  assert.deepEqual([f.w.x, f.w.z], position); assert.equal(f.casts.length, 0); assert.notEqual(f.w.clipFor, 'Sit');
});

test('storing a pond while a family member rests ends the fishing pose', () => {
  const f = fixture('june'), pond = builtPond(f); f.view.sendFishing(f.w, pond); advance(f, () => sitting(f.w));
  delete f.s.placed.testPond; touch(f.s); f.view.liveFamily(f.w, .1, false);
  assert.notEqual(f.w.clipFor, 'Sit'); assert.ok(!f.w.fishPond);
});

test('an incoming visitor can finish a requested fishing trip before walking back to their signpost', () => {
  const f = fixture('minh'); Object.assign(f.w, { id: 'visit:gus', visitor: true, stage: 'coming' });
  let dropped = false; f.view.drop = () => { dropped = true; };
  assert.equal(f.view.sendFishing(f.w), true); advance(f, () => sitting(f.w)); assert.ok(at(f.w, f.w.fishSpot));
  f.w.wait = 0; advance(f, () => dropped); assert.ok(at(f.w, home)); assert.equal(f.casts.length, 0);
});

test('a requested fishing trip cannot strand a villager already returning home at night', () => {
  const f = fixture('minh'); f.w.goingHome = true; assert.equal(f.view.sendFishing(f.w), true);
  advance(f, () => f.w.indoors, { night: true });
  assert.ok(at(f.w, home)); assert.notEqual(f.w.clipFor, 'Sit'); assert.equal(f.casts.length, 0);
});

test('the public dock approach is visibly a path and its walking space is free of scenery', () => {
  const world = Object.create(WorldView.prototype), p = POND_PATH;
  for (let x = p.x0; x <= p.x1; x++) for (let z = p.z0; z <= p.z1; z++) assert.equal(world.fixedLook(x, z).color, GROUND_COLORS.path);
  const wilds = planWilds();
  for (const [kind, things] of Object.entries(wilds)) for (const thing of things) {
    const distance = Math.hypot(Math.max(p.x0 * CELL - thing.x, 0, thing.x - (p.x1 + 1) * CELL), Math.max(p.z0 * CELL - thing.z, 0, thing.z - (p.z1 + 1) * CELL));
    // Canopies need more room than tiny ground details, so the route reads clearly when viewed from above.
    assert.ok(distance >= (kind === 'trees' ? 2 * thing.s : kind === 'bushes' ? thing.s : .5), `${kind} obscures the path at ${thing.x},${thing.z}`);
  }
});
