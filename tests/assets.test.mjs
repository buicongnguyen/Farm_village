// The art kit's contracts (AAA pass): every model and anchor the game names exists in its GLB, every good, building
// and tool has an icon file, pieces stay within their triangle budgets, kits are meshopt-compressed, and the first
// load stays small. Pure node: reads the GLBs' JSON chunks only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { KIND_MODELS, EARLY, ANCHORS, KITS, CROP_MODELS, cropLook, anchorPoints } from '../src/view/kinds.mjs';
import { ICONS, ICON_IDS } from '../src/content/icons.mjs';
import { GOODS } from '../src/content/goods.mjs';
import { BUILDINGS } from '../src/content/buildings.mjs';

const MODELS = new URL('../public/assets/models/', import.meta.url), PUBLIC = new URL('../public/', import.meta.url);
const gltf = file => { const b = readFileSync(new URL(`${file}.glb`, MODELS)); return JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString()); };
const cache = {}, kit = file => (cache[file] ??= gltf(file));
/** Root nodes of a kit: name → { triangles, names (the node and all its descendants) }. */
function roots(file) {
  const j = kit(file), out = {};
  const walk = (i, acc) => {
    const n = j.nodes[i]; acc.names.add(n.name);
    if (n.mesh != null) for (const p of j.meshes[n.mesh].primitives) acc.triangles += (p.indices != null ? j.accessors[p.indices].count : j.accessors[p.attributes.POSITION].count) / 3;
    for (const c of n.children ?? []) walk(c, acc);
  };
  for (const i of j.scenes[j.scene ?? 0].nodes) { const acc = { triangles: 0, names: new Set() }; walk(i, acc); out[j.nodes[i].name] = acc; }
  return out;
}
const TOOLS = ['clear', 'harvest', 'move', 'store', 'build'];

test('every KIND_MODELS and EARLY model exists in its GLB, with its authored _mid level where it has one', () => {
  for (const [name, spec] of [...Object.entries(KIND_MODELS), ...Object.entries(EARLY)]) {
    const r = roots(spec.kit);
    assert.ok(r[spec.node], `${name}: ${spec.node} missing from ${spec.kit}.glb`);
  }
  for (const c of CROP_MODELS) for (const st of ['sprout', 'mid', 'ripe']) assert.ok(roots('farm-kit')[`crop_${c}_${st}_mid`], `crop_${c}_${st}_mid missing`);
});

test('every ANCHORS model is drawn by the game and its farm-kit anchors exist as empties in the GLB', () => {
  for (const [model, labels] of Object.entries(ANCHORS)) {
    const spec = KIND_MODELS[model] ?? (model === 'farmhouse' ? { kit: 'rural-lite', node: 'home_t1' } : null);
    assert.ok(spec, `ANCHORS.${model} names no model`);
    const r = roots(spec.kit)[spec.node];
    assert.ok(r, `ANCHORS.${model}: ${spec.node} missing from ${spec.kit}.glb`);
    for (const [label, pts] of Object.entries(labels)) {
      assert.ok(pts.length > 0, `ANCHORS.${model}.${label} is empty`);
      for (const p of pts) assert.ok(p.length >= 3 && p.every(Number.isFinite), `ANCHORS.${model}.${label}: ${p}`);
      if (spec.kit === 'farm-kit' || spec.kit === 'decor') {
        const empties = [...r.names].filter(n => n === `${spec.node}.${label}` || n.startsWith(`${spec.node}.${label}.`));
        assert.equal(empties.length, pts.length, `${spec.node}.${label}: ${empties.length} empties for ${pts.length} points`);
      }
    }
  }
  for (const m of ['feed_mill', 'bakery']) assert.ok(ANCHORS[m]?.chimney?.length && ANCHORS[m]?.window?.length >= 2, `${m} needs chimney and window anchors`);
  assert.ok(ANCHORS.feed_mill.sails?.length === 1, 'the feed mill has one sails anchor');
  for (const m of Object.keys(KIND_MODELS).filter(k => k.startsWith('cottage_'))) assert.ok(ANCHORS[m]?.window?.length >= 3, `${m} has window anchors`);
  assert.ok(ANCHORS.farmhouse?.window?.length >= 3, 'the farmhouse has window anchors');
});

test('anchorPoints turns model-space anchors with the item', () => {
  const [a] = anchorPoints('feed_mill', 'sails', { x: 10, z: 20, rot: 0 }), [b] = anchorPoints('feed_mill', 'sails', { x: 10, z: 20, rot: Math.PI });
  const [x, y, z] = ANCHORS.feed_mill.sails[0];
  assert.deepEqual([a.x, a.y, a.z].map(v => +v.toFixed(3)), [10 + x, y, 20 + z]);
  assert.deepEqual([b.x, b.z].map(v => +v.toFixed(3)), [+(10 - x).toFixed(3), +(20 - z).toFixed(3)]);
});

test('the kits named in KITS hold those roots', () => {
  for (const [file, names] of Object.entries(KITS)) { const r = roots(file); for (const n of names) assert.ok(r[n], `${n} missing from ${file}.glb`); }
});

test('every good, building and tool has an icon whose file exists', () => {
  const want = [...Object.keys(GOODS), ...Object.keys(BUILDINGS), ...TOOLS.map(t => `tool:${t}`)];
  for (const id of want) {
    assert.ok(ICONS[id], `no icon for ${id}`);
    assert.ok(existsSync(new URL(ICONS[id].replace('./', ''), PUBLIC)), `${id}: ${ICONS[id]} is missing`);
  }
  for (const list of Object.values(ICON_IDS)) for (const id of list) assert.ok(existsSync(new URL(ICONS[id].replace('./', ''), PUBLIC)), `${ICONS[id]} is missing`);
  const files = readdirSync(new URL('assets/icons/', PUBLIC)).filter(f => f.endsWith('.webp'));
  assert.equal(files.length, Object.keys(ICONS).length, 'every icon file is listed in ICONS');
});

test('pieces stay within their triangle budgets: ripe crop 1,500, prop 1,200, building 8,000 (animal 2,000, tree 3,500)', () => {
  const over = [];
  for (const [name, spec] of Object.entries(KIND_MODELS)) {
    const t = roots(spec.kit)[spec.node].triangles;
    const cap = name.startsWith('crop:') ? 1500 : spec.lod === 'static' && spec.kit !== 'town' && !/^(fence|gate|lamp|bench|produce|scarecrow|hay|flowerpot|street|window|door|doormat|path|sale|bunting|banner)/.test(name) ? 8000 : spec.kit === 'town' ? 11000 : spec.lod === 'tree' ? 3500 : spec.lod === 'animal' ? 2000 : 1200;
    if (t > cap) over.push(`${name} (${spec.node}): ${t} > ${cap}`);
  }
  for (const n of KITS.props) { const t = roots('props')[n].triangles; if (t > 1200) over.push(`props ${n}: ${t}`); }
  for (const c of CROP_MODELS) {
    const near = roots('farm-kit')[`crop_${c}_ripe`].triangles, mid = roots('farm-kit')[`crop_${c}_ripe_mid`].triangles;
    if (mid > near * 0.5) over.push(`crop_${c}_ripe_mid (${mid}) should be at most half of the near model (${near})`);
  }
  for (const n of ['feed_mill', 'bakery', 'coop']) { const t = roots('farm-kit')[n].triangles; if (t < 2500) over.push(`${n} is only ${t} triangles (rebuilt buildings are 3–5k)`); }
  assert.deepEqual(over, []);
});

test('cropLook: sprout below a third, the leafy stage up to 90 %, then ripe', () => {
  assert.equal(cropLook('wheat', 0.1)[0], 'crop:wheat:sprout');
  assert.equal(cropLook('wheat', 0.32)[0], 'crop:wheat:sprout');
  assert.equal(cropLook('wheat', 0.5)[0], 'crop:wheat:mid');
  assert.equal(cropLook('wheat', 0.89)[0], 'crop:wheat:mid');
  assert.equal(cropLook('wheat', 0.9)[0], 'crop:wheat:ripe');
  assert.equal(cropLook('pumpkin', 1)[0], 'crop:pumpkin:ripe');
  for (const c of [...CROP_MODELS, 'mystery_crop']) for (const p of [0, 0.2, 0.5, 0.95, 1]) assert.ok(KIND_MODELS[cropLook(c, p)[0]], `${c} at ${p}`);
});

test('every top-level kit is meshopt-compressed (loaded through models.mjs, which sets the decoder)', () => {
  for (const f of readdirSync(MODELS).filter(f => f.endsWith('.glb'))) {
    const j = gltf(f.slice(0, -4));
    assert.ok((j.extensionsUsed ?? []).includes('EXT_meshopt_compression'), `${f} is not packed: run node art/blender/pack.mjs`);
  }
});

test('first-wave model bytes (gzip) stay within v0.1 + 300 KB', () => {
  // v0.1 loaded farm, farm-kit, crops, scenery, rural-lite, market-stall and animal-produce before the first frame:
  // 472,564 bytes gzipped (measured from commit 01d3be5).
  const first = new Set(['scenery', 'rural-lite', ...Object.values(KIND_MODELS).filter(s => !s.late).map(s => s.kit)]);
  const bytes = [...first].reduce((n, f) => n + gzipSync(readFileSync(new URL(`${f}.glb`, MODELS)), { level: 9 }).length, 0);
  assert.ok(bytes <= 472_564 + 300_000, `${bytes} bytes`);
});
