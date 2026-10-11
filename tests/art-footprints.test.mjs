// Decode the shipped meshopt GLB and use the runtime bake/fit path. Accessor metadata alone misses node transforms.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { bake, fit } from '../src/view/models.mjs';
import { KIND_MODELS, sizeOf } from '../src/view/kinds.mjs';
import { newGame } from '../src/core/state.mjs';
import { newLearning } from '../src/core/learning-state.mjs';
import { canPlace, cellsOf, doorCell, touch } from '../src/core/grid.mjs';
import { footprint } from '../src/content/buildings.mjs';
import { CELL, N, FARMHOUSE } from '../src/content/world.mjs';
import { LEARNING_SITE } from '../src/content/learning-site.mjs';
import { LearningView } from '../src/view/learning-view.mjs';

const raw = readFileSync(new URL('../public/assets/models/decor.glb', import.meta.url));
const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
  .parseAsync(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength), '');
const roots = Object.fromEntries(gltf.scene.children.map(root => [root.name, root]));
function geometry(model) {
  const spec = KIND_MODELS[model]; assert.ok(roots[spec.node], `${spec.node} missing from packed decor.glb`);
  return fit(bake(roots[spec.node], { center: !spec.authored, ao: 0 }), sizeOf(spec));
}
const corners = box => [box.min.x, box.max.x].flatMap(x => [box.min.y, box.max.y].flatMap(y => [box.min.z, box.max.z].map(z => new THREE.Vector3(x, y, z))));
const transformed = (box, x, z, rot) => new THREE.Box3().setFromPoints(corners(box).map(v => v.applyAxisAngle(new THREE.Vector3(0, 1, 0), rot).add(new THREE.Vector3(x, 0, z))));

test('decoded hospital art keeps a 0.1 metre inset inside its actual 4×3 clinic footprint', () => {
  assert.deepEqual(footprint('clinic', 0), [4, 3]);
  const geo = geometry('clinic:hospital'), box = geo.boundingBox;
  assert.ok(box.min.x >= -3.905 && box.max.x <= 3.905, `hospital x bounds ${box.min.x}..${box.max.x}`);
  assert.ok(box.min.z >= -2.905 && box.max.z <= 2.905, `hospital z bounds ${box.min.z}..${box.max.z}`);
  assert.ok(box.max.x - box.min.x > 7.7 && box.max.z - box.min.z > 5.7, 'hospital was shrunk beyond its authored footprint');
  assert.ok(Math.abs(box.min.y) < 0.005 && box.max.y > 5 && box.max.y < 6, 'hospital no longer stands on the ground at its authored height');
  geo.dispose();
});

test('hospital rotations leave crowded legal neighbours and the real doorway outside the art', () => {
  const geo = geometry('clinic:hospital');
  for (let rot = 0; rot < 4; rot++) {
    const s = newGame(1_800_000_000_000, 37), x = 70, z = 94, [w, d] = footprint('clinic', rot);
    s.level = 20; s.cells.fill(0);
    const door = doorCell('clinic', x, z, rot), corridor = rot === 1 ? x + w + 1 : x - 2;
    const left = Math.min(corridor, door[0]), right = Math.max(corridor, door[0]);
    for (let px = left; px <= right; px++) s.cells[door[1] * N + px] = 3;
    for (let pz = 91; pz <= door[1]; pz++) s.cells[pz * N + corridor] = 3;
    const neighbours = [[x - 1, z], [x + w, z], [x, z - 1], [x, z + d]].filter(([nx, nz]) => nx !== door[0] || nz !== door[1]);
    for (const [i, [nx, nz]] of neighbours.entries()) {
      // A side touched by the approach path stays as a path; all other adjacent cells can hold a flower bed.
      if (s.cells[nz * N + nx] === 3) continue;
      assert.equal(canPlace(s, 'flowers', nx, nz).ok, true);
      s.placed[`neighbour${i}`] = { kind: 'flowers', x: nx, z: nz, rot: 0 }; touch(s);
    }
    assert.equal(canPlace(s, 'clinic', x, z, rot).ok, true, `rotation ${rot} no longer permits a connected clinic`);
    const box = transformed(geo.boundingBox, (x + w / 2) * CELL, (z + d / 2) * CELL, rot * Math.PI / 2);
    assert.ok(box.min.x >= x * CELL + .095 && box.max.x <= (x + w) * CELL - .095, `rotation ${rot} x overhang`);
    assert.ok(box.min.z >= z * CELL + .095 && box.max.z <= (z + d) * CELL - .095, `rotation ${rot} z overhang`);
    const doorBox = new THREE.Box3(new THREE.Vector3(door[0] * CELL, 0, door[1] * CELL), new THREE.Vector3((door[0] + 1) * CELL, 6, (door[1] + 1) * CELL));
    assert.equal(box.intersectsBox(doorBox), false, `rotation ${rot} blocks the doorway path`);
    for (const p of Object.values(s.placed)) {
      const neighbour = new THREE.Box3(new THREE.Vector3(p.x * CELL, 0, p.z * CELL), new THREE.Vector3((p.x + 1) * CELL, 6, (p.z + 1) * CELL));
      assert.equal(box.intersectsBox(neighbour), false, `rotation ${rot} covers its legal neighbour`);
    }
    s.placed.hospital = { kind: 'clinic', x, z, rot }; touch(s);
    assert.equal(cellsOf('clinic', x, z, rot).length, 12);
    assert.equal(canPlace(s, 'flowers', x, z).ok, false, 'art upgrade changed occupied cells');
  }
  geo.dispose();
});

test('all three decoded potting-bench stages fit the same small site without reaching buildable land', () => {
  const lot = { x0: (FARMHOUSE.x - 4) * CELL, x1: (FARMHOUSE.x + 5) * CELL, z0: (FARMHOUSE.z - 4) * CELL, z1: (FARMHOUSE.z + 5) * CELL };
  for (const model of ['potting_bench_overgrown', 'potting_bench_repaired', 'potting_bench_done']) {
    const geo = geometry(model), b = geo.boundingBox, size = b.getSize(new THREE.Vector3());
    // The old stage's ground-cover clumps sink slightly into the lawn; the bench must never float above it.
    assert.ok(size.x <= 2.405 && size.z <= 1.405 && size.y <= 1.8 && b.min.y >= -.1 && b.min.y <= .02, `${model} escaped its prop envelope: ${size.toArray()}`);
    const box = transformed(b, LEARNING_SITE.worldX, LEARNING_SITE.worldZ, LEARNING_SITE.rotation);
    assert.ok(box.min.x > lot.x0 && box.max.x < lot.x1 && box.min.z > lot.z0 && box.max.z < lot.z1, `${model} reaches player buildable land`);
    geo.dispose();
  }
});

test('late potting-bench models replace fallback pieces exactly once and never mutate saved progress', async () => {
  const s = newGame(1_800_000_000_000, 17, { restore: true }); s.learning = { ...newLearning(), introducedAt: 0, learnedAt: 0 };
  const items = new Map(), available = new Set(['bench', 'weeds2', 'flowerpot']), listeners = new Set();
  const batches = { items, has: id => available.has(id), set: (id, value) => items.set(id, value), remove: id => items.delete(id) };
  let release; const ready = new Promise(resolve => { release = resolve; });
  const view = new LearningView({ batches }, { s, now: s.lastSeen, on: fn => (listeners.add(fn), () => listeners.delete(fn)) }, ready);
  const before = JSON.stringify(s);
  assert.equal(items.get('learning:frame').model, 'bench'); assert.ok(items.has('learning:cover'));
  for (const name of ['potting_bench_overgrown', 'potting_bench_repaired', 'potting_bench_done']) available.add(name);
  release(); await ready; await Promise.resolve();
  assert.deepEqual([...items.keys()], ['learning:frame']); assert.equal(items.get('learning:frame').model, 'potting_bench_overgrown');
  assert.equal(JSON.stringify(s), before);
  for (const [steps, model] of [[['uncover'], 'potting_bench_repaired'], [['uncover', 'brace'], 'potting_bench_repaired'], [['uncover', 'brace', 'trays'], 'potting_bench_done']]) {
    s.learning.steps = steps; const snapshot = JSON.stringify(s); view.sync(); view.sync();
    assert.equal(items.get('learning:frame').model, model); assert.equal(items.size, 1); assert.equal(JSON.stringify(s), snapshot);
    assert.equal(view.pick({ x: LEARNING_SITE.x, z: LEARNING_SITE.z }), true);
  }
  view.dispose(); assert.equal(items.size, 0); view.sync(); assert.equal(items.size, 0);
});
