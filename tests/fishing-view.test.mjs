// Real Three.js geometry and FishingView methods, without a renderer/GPU or simulated game actions.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CELL, POND_FISHING_SPOTS } from '../src/content/world.mjs';

const oldDocument = globalThis.document;
globalThis.document = { documentElement: {}, addEventListener() {} };
const { FishingView } = await import('../src/view/fishing-view.mjs');
const { POND_SHAPE } = await import('../src/view/brook.mjs');
if (oldDocument === undefined) delete globalThis.document; else globalThis.document = oldDocument;

const center = ([x, z]) => [(x + .5) * CELL, (z + .5) * CELL];
function actor(id, spot, { player = id === 'you', pond = null, face = [15, spot[1]] } = {}) {
  const [x, z] = center(spot);
  return { id, x, z, player, fishSpot: [...spot], fishFace: face, fishPond: pond,
    route: [], goal: null, target: null, todo: null, clipFor: 'Sit', indoors: false };
}
function fixture(t, actors = [], { quiet = true, line = null, placed = {} } = {}) {
  const previous = new Map(['document', 'innerWidth', 'innerHeight'].map(k => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
  globalThis.document = { body: { classList: { contains: name => name === 'reduced-motion' && quiet } } };
  globalThis.innerWidth = 800; globalThis.innerHeight = 600;
  t.after(() => { for (const [k, descriptor] of previous) if (descriptor) Object.defineProperty(globalThis, k, descriptor); else delete globalThis[k]; });
  const camera = new THREE.OrthographicCamera(-80, 80, 60, -60, .1, 300);
  camera.position.set(60, 200, 110); camera.up.set(0, 0, -1); camera.lookAt(60, 0, 110); camera.updateMatrixWorld();
  const events = [], frames = [], calls = [];
  const world = { scene: new THREE.Scene(), cam: { camera }, onFrame: fn => frames.push(fn) };
  const game = { now: 10_000, s: { fishing: { line }, placed }, on: fn => events.push(fn), do: (...args) => calls.push(args) };
  const people = { walkers: new Map(actors.map(w => [w.id, w])) }, view = new FishingView(world, game, people);
  return { view, world, game, people, calls, frame: (dt = .1) => frames.forEach(fn => fn(dt)), emit: (result, action) => events.forEach(fn => fn(result, action)) };
}
function inPublicWater(point) {
  return ((point.x - POND_SHAPE.x) / POND_SHAPE.rx) ** 2 + ((point.z - POND_SHAPE.z) / POND_SHAPE.rz) ** 2 < 1;
}
function screen(world, point) {
  const p = new THREE.Vector3(point.x, point.y, point.z).project(world.cam.camera);
  return [(p.x + 1) * innerWidth / 2, (1 - p.y) * innerHeight / 2];
}

test('tackle appears only for seated fishers; a live player line retains a float while walking', t => {
  const player = actor('you', POND_FISHING_SPOTS[0]), npc = actor('june', POND_FISHING_SPOTS[1]);
  player.goal = center(player.fishSpot); npc.target = center(npc.fishSpot);
  const f = fixture(t, [player, npc], { line: { doneAt: 20_000 } }); f.frame();
  assert.equal(f.view.rods.count, 0); assert.equal(f.view.floats.count, 1); assert.equal(f.view.lines.visible, false);
  assert.equal(f.view.entries[0].id, 'you');
  player.goal = null; npc.target = null; f.frame();
  assert.equal(f.view.rods.count, 2); assert.equal(f.view.floats.count, 2); assert.equal(f.view.lines.visible, true);
  npc.indoors = true; player.clipFor = 'Sweep'; f.frame();
  assert.equal(f.view.rods.count, 0); assert.equal(f.view.floats.count, 1);
  f.game.s.fishing.line = null; f.frame();
  assert.equal(f.view.count, 0); assert.equal(f.view.rods.visible, false); assert.equal(f.view.floats.visible, false);
});

test('the three spaced public seats cast into water without overlapping floats', t => {
  const actors = POND_FISHING_SPOTS.map((spot, i) => actor(i ? `npc${i}` : 'you', spot));
  const f = fixture(t, actors, { line: { doneAt: 20_000 } }); f.frame();
  assert.equal(f.view.count, 3); assert.equal(f.view.rods.count, 3);
  for (const entry of f.view.entries) assert.ok(inPublicWater(entry), `float ${entry.id} is on the bank`);
  for (let i = 0; i < f.view.count; i++) for (let j = i + 1; j < f.view.count; j++)
    assert.ok(Math.hypot(f.view.entries[i].x - f.view.entries[j].x, f.view.entries[i].z - f.view.entries[j].z) >= 4);
});

test('a built-pond rod and line follow the seated character facing direction', t => {
  const pond = { kind: 'pond', x: 38, z: 64 }, w = actor('you', [42, 66], { pond: ['pond1', 38, 64], face: [39.5, 65.5] });
  const f = fixture(t, [w], { line: { doneAt: 20_000, pond: 'pond1' }, placed: { pond1: pond } }); f.frame();
  const point = f.view.entries[0], target = center(w.fishFace), dx = target[0] - w.x, dz = target[1] - w.z;
  assert.equal(point.pond, 'pond1');
  assert.ok(Math.abs((point.x - w.x) * dz - (point.z - w.z) * dx) < 1e-8, 'float is not in the facing direction');
  assert.ok(point.x > pond.x * CELL && point.x < (pond.x + 4) * CELL && point.z > pond.z * CELL && point.z < (pond.z + 4) * CELL);
  const transform = new THREE.Matrix4(); f.view.rods.getMatrixAt(0, transform);
  const bottom = new THREE.Vector3(0, -.5, 0).applyMatrix4(transform), top = new THREE.Vector3(0, .5, 0).applyMatrix4(transform);
  assert.ok((top.x - bottom.x) * dx + (top.z - bottom.z) * dz > 0, 'rod points behind the actor');
  assert.ok(Math.abs((top.x - bottom.x) * dz - (top.z - bottom.z) * dx) < 1e-4, 'rod and float disagree on direction');
  const end = f.view.positions.slice(f.view.lines.geometry.drawRange.count * 3 - 3, f.view.lines.geometry.drawRange.count * 3);
  [point.x, point.y, point.z].forEach((value, i) => assert.ok(Math.abs(end[i] - value) < 1e-5, 'line does not reach float'));
});

test('saved and unattended lines retain a tappable float through reload and pond removal without changing state', t => {
  const pond = { kind: 'pond', x: 38, z: 64 }, line = { doneAt: 5_000, pond: 'pond1', seed: 'saved' };
  const f = fixture(t, [], { line, placed: { pond1: pond } }), before = structuredClone(f.game.s);
  f.frame(); assert.equal(f.view.count, 1); assert.equal(f.view.rods.count, 0); assert.equal(f.view.entries[0].pond, 'pond1');
  const point = { ...f.view.entries[0] }; f.emit({ events: [] }, 'load'); f.frame(); assert.deepEqual(f.view.entries[0], point);
  assert.deepEqual(f.game.s, before); assert.equal(f.calls.length, 0);
  delete f.game.s.placed.pond1; f.frame();
  assert.equal(f.view.entries[0].pond, null); assert.ok(inPublicWater(f.view.entries[0]));
  assert.equal(f.game.s.fishing.line, line, 'missing pond discarded the saved fish');
  f.game.s.fishing.line = null; f.frame(); assert.equal(f.view.count, 0);
});

test('float picking identifies the pond and never catches fish or starts another line', t => {
  const pond = { kind: 'pond', x: 38, z: 64 }, f = fixture(t, [], { line: { doneAt: 5_000, pond: 'pond1' }, placed: { pond1: pond } });
  f.frame(); const point = f.view.entries[0], pixel = screen(f.world, point), before = structuredClone(f.game.s);
  assert.deepEqual(f.view.pick(...pixel), { pond: 'pond1' });
  assert.equal(f.view.pick(pixel[0] + 30, pixel[1] + 30), null);
  assert.deepEqual(f.game.s, before); assert.equal(f.calls.length, 0);
});

test('casting settles into water, while reduced motion uses a still float immediately', t => {
  const w = actor('june', POND_FISHING_SPOTS[1]), f = fixture(t, [w], { quiet: false });
  f.frame(); assert.ok(f.view.entries[0].y > 2, 'cast did not start near the rod tip');
  f.frame(.9); assert.ok(f.view.entries[0].y < .3); assert.ok(inPublicWater(f.view.entries[0]));
  const landed = f.view.entries[0].y; f.frame(.2); assert.notEqual(f.view.entries[0].y, landed, 'normal float does not bob');
  document.body.classList.contains = name => name === 'reduced-motion'; f.frame();
  const still = { ...f.view.entries[0] }; f.frame(5); assert.deepEqual(f.view.entries[0], still);
});

test('tackle uses three shared draw objects and caps instances and line vertices', t => {
  const actors = Array.from({ length: 40 }, (_, i) => actor(`npc${i}`, POND_FISHING_SPOTS[1]));
  const f = fixture(t, actors); f.frame();
  assert.equal(f.world.scene.children.length, 3); assert.equal(f.view.rods.count, 24); assert.equal(f.view.floats.count, 24);
  assert.ok(f.view.lines.geometry.drawRange.count <= f.view.positions.length / 3);
  const triangles = f.view.rods.geometry.index.count / 3 * f.view.rods.count + f.view.floats.geometry.index.count / 3 * f.view.floats.count;
  assert.ok(triangles < 5000, `fishing tackle alone adds ${triangles} triangles`);
  const rods = f.view.rods.geometry, floats = f.view.floats.geometry, positions = f.view.positions;
  f.frame(1); assert.equal(f.world.scene.children.length, 3);
  assert.equal(f.view.rods.geometry, rods); assert.equal(f.view.floats.geometry, floats); assert.equal(f.view.positions, positions);
});

test('villagers at the pond catch fish too: now and then a float goes under, a fish leaps to them and they cast again', t => {
  const f = fixture(t, [actor('npc0', POND_FISHING_SPOTS[1])]); document.body.classList.contains = () => false; f.frame();
  let dips = 0, recasts = 0, last = f.view.casts.get('npc0').at;
  for (let i = 0; i < 1500; i++) {   // 75 seconds
    f.frame(.05); const cast = f.view.casts.get('npc0');
    if (f.view.entries[0]?.y < .06) dips++;
    if (cast.at !== last) { recasts++; last = cast.at; }
  }
  assert.ok(recasts >= 1 && recasts <= 6, `the villager landed ${recasts} fish in 75 s`);
  assert.ok(dips >= 5, 'the float never went under before a catch');
});
