// Shore reservations cover both trips in progress and people already sitting, without saving actor positions.
import './tz.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/core/state.mjs';
import { act } from '../src/core/act.mjs';
import { touch } from '../src/core/grid.mjs';
import { CELL, POND_FISHING_SPOTS } from '../src/content/world.mjs';
import { pack, unpack } from '../src/kit/save.mjs';
import { T0 } from './helpers.mjs';

const oldDocument = globalThis.document;
globalThis.document = { documentElement: {}, addEventListener() {} };
const { PeopleView } = await import('../src/view/people-view.mjs');
if (oldDocument === undefined) delete globalThis.document; else globalThis.document = oldDocument;
const center = ([x, z]) => [(x + .5) * CELL, (z + .5) * CELL];
const sitting = w => w.clipFor === 'Sit' && !w.goal && !w.target && !w.todo && !w.route.length;

function fixture(ids = ['you', 'june', 'minh', 'bo']) {
  const s = newGame(T0, 4242, { restore: true }), calls = [];
  const view = Object.assign(Object.create(PeopleView.prototype), {
    world: { life: { penArea: () => [] } }, time: 0, walkers: new Map(), say() {}, cast: { remove() {} },
    familySpot: () => [27, 62], pipSays() {},
  });
  view.game = { s, now: T0, do(action, payload) { calls.push({ action, payload }); return act(s, action, payload, this.now); } };
  for (const id of ids) {
    const [x, z] = center([28, 58]);
    view.walkers.set(id, { id, x, z, body: 'man', player: id === 'you', family: ['you', 'june'].includes(id),
      home: [27, 62], rot: 0, route: [], wait: 0, stay: 60, clip: 'Idle', subject: {} });
  }
  return { view, s, calls, get: id => view.walkers.get(id) };
}
function step(f, actors = [...f.view.walkers.values()], night = false) {
  f.view.time += .1; f.view.game.now = T0 + f.view.time * 1000;
  for (const w of actors) f.view[w.player ? 'livePlayer' : w.family ? 'liveFamily' : 'liveVillager'](w, .1, night);
}
function until(f, actors, done) {
  for (let i = 0; i < 3000 && !done(); i++) step(f, actors);
  assert.ok(done(), `trip did not finish: ${actors.map(w => `${w.id}:${w.route.length}:${w.clipFor}`).join(' ')}`);
}

test('three accepted public trips reserve different seats before departure, keeping the centre for the player', () => {
  const f = fixture(), { view, get } = f;
  assert.equal(view.sendFishing(get('june')), true);
  assert.equal(view.sendFishing(get('minh')), true);
  assert.equal(view.sendFishing(get('bo')), false, 'a third NPC took the player place');
  assert.equal(view.sendFishing(get('you')), true);
  const people = ['you', 'june', 'minh'].map(get), seats = people.map(w => [...w.fishSpot]);
  assert.deepEqual(seats[0], POND_FISHING_SPOTS[0]);
  assert.equal(new Set(seats.map(String)).size, 3);
  until(f, people, () => people.every(sitting));
  people.forEach((w, i) => { assert.deepEqual([w.x, w.z], center(seats[i])); assert.deepEqual(w.fishSpot, seats[i]); });
  for (let i = 0; i < people.length; i++) for (let j = i + 1; j < people.length; j++)
    assert.ok(Math.hypot(people[i].x - people[j].x, people[i].z - people[j].z) >= 4, 'seated actors overlap');
  assert.equal(f.calls.filter(c => c.action === 'castLine').length, 1);
});

test('automatic errands reserve the two side seats and choose another activity when both are taken', () => {
  const f = fixture(['minh', 'bo', 'sam']), random = Math.random;
  try {
    Math.random = () => .1;
    for (const id of ['minh', 'bo']) {
      const w = f.get(id), [route, todo] = f.view.pickErrand(w);
      assert.equal(todo.act, 'fish'); assert.ok(route.length); assert.notDeepEqual(w.fishSpot, POND_FISHING_SPOTS[0]);
      w.route = route; w.todo = todo;
    }
    const [, todo] = f.view.pickErrand(f.get('sam'));
    assert.notEqual(todo?.act, 'fish'); assert.ok(!f.get('sam').fishSpot);
  } finally { Math.random = random; }
  assert.notDeepEqual(f.get('minh').fishSpot, f.get('bo').fishSpot);
});

test('an existing seated actor without a reservation still occupies their shore place', () => {
  const f = fixture(['june', 'minh', 'bo']), sitter = f.get('bo');
  [sitter.x, sitter.z] = center(POND_FISHING_SPOTS[1]); sitter.clipFor = 'Sit';
  assert.equal(f.view.sendFishing(f.get('june')), true);
  assert.deepEqual(f.get('june').fishSpot, POND_FISHING_SPOTS[2]);
  assert.equal(f.view.sendFishing(f.get('minh')), false);
  sitter.indoors = true;
  assert.equal(f.view.sendFishing(f.get('minh')), true);
  assert.deepEqual(f.get('minh').fishSpot, POND_FISHING_SPOTS[1]);
});

test('cancelling, leaving at night and dropping actors release their reservations', () => {
  const f = fixture(), { view, get } = f;
  view.sendFishing(get('june')); view.sendFishing(get('minh'));
  view.cancelTrip(get('june')); assert.ok(!get('june').fishSpot);
  assert.equal(view.sendFishing(get('bo')), true);
  view.liveVillager(get('minh'), .1, true); assert.ok(!get('minh').fishSpot);
  view.drop(get('bo')); assert.equal(view.walkers.has('bo'), false);
  assert.equal(view.sendFishing(get('june')), true);
});

test('a completed family rest releases the reservation, while the body still prevents immediate reuse', () => {
  const f = fixture(['june', 'minh']), w = f.get('june'); f.view.sendFishing(w);
  const seat = [...w.fishSpot]; until(f, [w], () => sitting(w)); w.wait = 0; step(f, [w]);
  assert.equal(w.fishSpot, null); assert.ok(w.route.length);
  f.view.sendFishing(f.get('minh')); assert.notDeepEqual(f.get('minh').fishSpot, seat);
});

test('the player keeps their seat while a line is waiting or ready, until an explicit new chore', () => {
  const f = fixture(['you']), w = f.get('you'); f.view.sendFishing(w);
  until(f, [w], () => sitting(w)); const seat = [...w.fishSpot], line = f.s.fishing.line;
  for (let i = 0; i < 800; i++) step(f, [w]);
  assert.ok(line.doneAt < f.view.game.now); assert.equal(f.s.fishing.line, line);
  assert.deepEqual(w.fishSpot, seat); assert.ok(sitting(w));
  f.view.playerGo({ x: 28, z: 58 }); assert.ok(!w.fishSpot); assert.equal(f.s.fishing.line, line, 'walking away lost the fish');
});

test('casting again from the same seat succeeds without blocking its owner or duplicating a live line', () => {
  const f = fixture(['you']), w = f.get('you'); f.view.sendFishing(w); until(f, [w], () => sitting(w));
  const line = f.s.fishing.line;
  assert.equal(f.view.sendFishing(w), true); assert.deepEqual(w.route, [POND_FISHING_SPOTS[0]]);
  until(f, [w], () => sitting(w)); assert.equal(f.s.fishing.line, line); assert.equal(f.calls.length, 1);
  f.s.fishing.line = null;
  assert.equal(f.view.sendFishing(w), true); until(f, [w], () => sitting(w)); assert.equal(f.calls.length, 2);
});

test('the player does not take a side seat when somebody is standing in the reserved centre place', () => {
  const f = fixture(['you', 'june']), other = f.get('june'); [other.x, other.z] = center(POND_FISHING_SPOTS[0]);
  assert.equal(f.view.sendFishing(f.get('you')), false); assert.ok(!f.get('you').fishSpot);
  assert.equal(f.calls.length, 0); assert.deepEqual([other.x, other.z], center(POND_FISHING_SPOTS[0]));
});

test('bait is used only on arrival, and restoring a saved line never casts another one', () => {
  const f = fixture(['you']), w = f.get('you'); f.s.barn.items.chicken_feed = 1;
  assert.equal(f.view.sendFishing(w, null, { bait: true }), true);
  assert.equal(f.s.barn.items.chicken_feed, 1); assert.equal(f.s.fishing.line, null);
  until(f, [w], () => sitting(w)); assert.equal(f.s.fishing.line.bait, true); assert.equal(f.s.barn.items.chicken_feed ?? 0, 0);
  const line = f.s.fishing.line, casts = f.calls.length; f.view.cancelTrip(w);
  [w.x, w.z] = center([28, 58]); f.view.restoreFishingPending = true;
  f.view.residents = () => [{ id: 'you', home: [27, 62] }]; f.view.sync();
  assert.ok(w.onArrive); until(f, [w], () => sitting(w));
  assert.equal(f.calls.length, casts); assert.equal(f.s.fishing.line, line);
  f.view.sync(); assert.ok(!w.goal && !w.onArrive, 'repeated sync restarted the restored trip');
});

test('a saved line waits for the player to emerge after dawn before restoring the fishing pose', () => {
  const f = fixture(['you']), w = f.get('you'); f.s.settings.daylight = 'always';
  f.s.fishing.line = { doneAt: T0 + 1000, bait: false, seed: 'saved' };
  f.view.residents = () => [{ id: 'you', home: [27, 62] }]; w.indoors = true;
  f.view.sync(); assert.ok(!w.goal && !w.fishSpot);
  f.view.livePlayer(w, .1, false); assert.equal(w.indoors, false);
  f.view.sync(); assert.ok(w.goal && w.fishSpot);
  until(f, [w], () => sitting(w)); assert.equal(f.calls.length, 0);
});

test('built ponds reserve separate actual shores and release them when their pond moves', () => {
  const f = fixture(['you', 'june', 'minh', 'bo', 'sam']);
  for (const [id, p] of Object.entries(f.s.placed)) if (p.x >= 32 && p.x < 48 && p.z >= 56 && p.z < 72) delete f.s.placed[id];
  for (let z = 56; z < 72; z++) for (let x = 32; x < 48; x++) f.s.cells[z * 128 + x] = 0;
  f.s.fences = {};
  const pond = f.s.placed.testPond = { kind: 'pond', x: 38, z: 64, rot: 0 }; touch(f.s);
  const actors = ['you', 'june', 'minh', 'bo'].map(f.get);
  for (const w of f.view.walkers.values()) [w.x, w.z] = center([34, 66]);
  for (const w of actors) assert.equal(f.view.sendFishing(w, pond), true, `${w.id} could not reserve a shore`);
  assert.equal(new Set(actors.map(w => String(w.fishSpot))).size, 4);
  assert.equal(f.view.sendFishing(f.get('sam'), pond), false);
  actors.forEach(w => assert.deepEqual(w.fishPond, ['testPond', 38, 64]));
  pond.x++; touch(f.s); step(f, actors);
  actors.forEach(w => assert.ok(!w.fishSpot && !w.fishFace && !w.fishPond));
  assert.equal(f.calls.length, 0);
});

test('saved built-pond lines restore at their own pond, with a public fallback if the pond was removed', () => {
  const f = fixture(['you']), w = f.get('you');
  for (const [id, p] of Object.entries(f.s.placed)) if (p.x >= 32 && p.x < 48 && p.z >= 56 && p.z < 72) delete f.s.placed[id];
  for (let z = 56; z < 72; z++) for (let x = 32; x < 48; x++) f.s.cells[z * 128 + x] = 0;
  f.s.fences = {}; f.s.placed.testPond = { kind: 'pond', x: 38, z: 64, rot: 0 };
  f.s.fishing.line = { doneAt: T0 + 1000, bait: false, seed: 'saved-pond', pond: 'testPond' };
  f.s = f.view.game.s = unpack(pack(f.s)); f.view.residents = () => [{ id: 'you', home: [27, 62] }];
  f.view.sync(); assert.deepEqual(w.fishPond, ['testPond', 38, 64]);
  until(f, [w], () => sitting(w)); assert.equal(f.calls.length, 0);
  const builtLine = f.s.fishing.line;
  assert.equal(f.view.sendFishing(w, null), true); assert.deepEqual(w.fishPond, ['testPond', 38, 64]);
  until(f, [w], () => sitting(w)); assert.equal(f.s.fishing.line, builtLine); assert.equal(f.calls.length, 0);
  f.view.cancelTrip(w); [w.x, w.z] = center([28, 58]); delete f.s.placed.testPond; touch(f.s);
  const savedLine = f.s.fishing.line; f.view.restoreFishingPending = true; f.view.sync();
  assert.deepEqual(w.fishSpot, POND_FISHING_SPOTS[0]); assert.equal(w.fishPond, null);
  until(f, [w], () => sitting(w)); assert.equal(f.calls.length, 0); assert.equal(f.s.fishing.line, savedLine);
});

test('an existing public line keeps its place when the player taps another pond', () => {
  const f = fixture(['you']), w = f.get('you');
  f.s.placed.otherPond = { kind: 'pond', x: 38, z: 64, rot: 0 };
  f.s.fishing.line = { doneAt: T0 + 1000, bait: false, seed: 'public' };
  assert.equal(f.view.sendFishing(w, f.s.placed.otherPond), true);
  assert.deepEqual(w.fishSpot, POND_FISHING_SPOTS[0]); assert.equal(w.fishPond, null);
  until(f, [w], () => sitting(w)); assert.equal(f.calls.length, 0); assert.equal(f.s.fishing.line.pond, undefined);
});
