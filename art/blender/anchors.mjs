// Writes ANCHORS (chimney, sails, door, window and light points of models, in the game's model space) into
// src/view/kinds.mjs between the `<anchors>` markers.
//   - farm-kit and decor pieces: from art/blender/anchors-farm-kit.json (written by build_farm_kit.py; these pieces keep
//     their authored origin in the game, so the points need no correction);
//   - the town houses (cottages) and the farmhouse: window points found from their 'Glass' faces, baked and fitted
//     exactly as the game does (src/view/models.mjs bake + fit), with the facing of each window.
//
//   node art/blender/anchors.mjs
// Windows: [x, y, z, nx, nz] — the centre of the glass, a few centimetres out, and the outward facing on the ground plan.
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { bake, fitFactor } from '../../src/view/models.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const KINDS = resolve(ROOT, 'src/view/kinds.mjs');
const { KIND_MODELS, COTTAGE_STYLES } = await import('../../src/view/kinds.mjs');
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const kitCache = {};
async function kit(file) {
  if (!kitCache[file]) {
    const buf = await readFile(resolve(ROOT, 'public/assets/models', `${file}.glb`));
    const gltf = await new Promise((ok, fail) => loader.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '', ok, fail));
    kitCache[file] = Object.fromEntries(gltf.scene.children.map(c => [c.name, c]));
  }
  return kitCache[file];
}
const r3 = v => Math.round(v * 1000) / 1000;

/** Window points of a kit root: connected groups of faces with a glass material, facing sideways. */
function windows(root, size) {
  const full = bake(root, { ao: 0 }), k = fitFactor(full, size);
  // bake() centres on the x/z bounds and lifts to y = 0: repeat that transform for the glass faces
  root.updateWorldMatrix(true, true);
  const inv = root.matrixWorld.clone().invert(), all = new THREE.Box3();
  root.traverse(o => { if (o.isMesh) { const g = o.geometry.clone(); g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld)); g.computeBoundingBox(); all.union(g.boundingBox); } });
  const off = new THREE.Vector3(-(all.min.x + all.max.x) / 2, -all.min.y, -(all.min.z + all.max.z) / 2);
  const tris = [];
  root.traverse(o => {
    if (!o.isMesh || !/glass|window/i.test(o.material?.name ?? '')) return;
    const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone());
    const pos = new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3), 3);
    for (let i = 0; i < pos.count; i++) pos.setXYZ(i, g.attributes.position.getX(i), g.attributes.position.getY(i), g.attributes.position.getZ(i));
    const m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
    for (let i = 0; i < pos.count; i += 3) {
      const t = [0, 1, 2].map(j => new THREE.Vector3(pos.getX(i + j), pos.getY(i + j), pos.getZ(i + j)).applyMatrix4(m).add(off).multiplyScalar(k));
      tris.push(t);
    }
  });
  // group triangles whose corners touch (within 2 cm)
  const key = v => `${Math.round(v.x * 50)},${Math.round(v.y * 50)},${Math.round(v.z * 50)}`;
  const parent = tris.map((_, i) => i), find = i => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const owner = new Map();
  tris.forEach((t, i) => t.forEach(v => { const kk = key(v); if (owner.has(kk)) parent[find(i)] = find(owner.get(kk)); else owner.set(kk, i); }));
  const groups = new Map();
  tris.forEach((t, i) => { const r = find(i); (groups.get(r) ?? groups.set(r, []).get(r)).push(t); });
  const out = [];
  for (const g of groups.values()) {
    const c = new THREE.Vector3(), n = new THREE.Vector3(); let area = 0;
    for (const [a, b, d] of g) {
      const nn = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(d, a)), ar = nn.length() / 2;
      area += ar; c.addScaledVector(a.clone().add(b).add(d).divideScalar(3), ar);
      // the outward side: away from the building's middle
      const mid = a.clone().add(b).add(d).divideScalar(3); if (nn.x * mid.x + nn.z * mid.z < 0) nn.negate(); n.add(nn);
    }
    if (area < 0.02) continue;
    c.divideScalar(area); n.y = 0; if (n.lengthSq() < 1e-6) continue; n.normalize();
    if (Math.abs(n.x) < 0.5 && Math.abs(n.z) < 0.5) continue;
    c.addScaledVector(n, 0.04);
    out.push([r3(c.x), r3(c.y), r3(c.z), r3(n.x), r3(n.z)]);
  }
  // merge points closer than 0.3 m (both faces of one pane)
  const merged = [];
  for (const p of out) if (!merged.some(q => Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]) < 0.3)) merged.push(p);
  return merged.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
}

const anchors = JSON.parse(await readFile(resolve(ROOT, 'art/blender/anchors-farm-kit.json'), 'utf8'));
for (const style of COTTAGE_STYLES) {
  const spec = KIND_MODELS[`cottage_${style}`], k = await kit(spec.kit);
  anchors[`cottage_${style}`] = { window: windows(k[spec.node], { width: spec.width }) };
}
const rural = await kit('rural-lite');
anchors.farmhouse = { window: windows(rural.home_t1, { width: 9 }) };   // world-view: FARMHOUSE width 9
for (const [m, a] of Object.entries(anchors)) console.log(m, Object.entries(a).map(([l, v]) => `${l} ${v.length}`).join(', '));

const src = await readFile(KINDS, 'utf8');
const json = JSON.stringify(anchors).replace(/\],\[/g, '], [').replace(/":\{/g, '": {').replace(/\},"/g, '},\n  "');
const block = `// <anchors> generated by art/blender/anchors.mjs — do not edit by hand\nexport const ANCHORS = ${json.replace(/^\{/, '{\n  ').replace(/\}$/, '\n}')};\n// </anchors>`;
const next = src.replace(/\/\/ <anchors>[\s\S]*?\/\/ <\/anchors>/, block);
if (next === src && !src.includes('// <anchors>')) throw new Error('kinds.mjs has no <anchors> block');
await writeFile(KINDS, next);
console.log('wrote ANCHORS into src/view/kinds.mjs');
