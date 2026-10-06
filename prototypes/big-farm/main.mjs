// Big farm prototype: can a 128 × 128 cell map with a fully planted 64 × 64 farm run on a phone?
// One renderer (Three.js), shown like a 2.5D game: a fixed tilted orthographic camera, pan, zoom and 90° turns.
// Optimisations under test (TECH-PLAN section 6):
//   - every model is baked to one geometry with vertex colours, then drawn with InstancedMesh (one draw per model)
//   - the map is split into 16 × 16 cell chunks, so chunks off screen are culled
//   - three levels of detail: full models close up, simplified models (about 40 % of the triangles) in the middle
//     zoom, and tiny stand-ins coloured per instance when zoomed out (one draw per chunk and kind)
// URL options: ?dense (plant all 4,096 farm cells), ?nolod (full models at every zoom), ?nochunk (one batch for the whole
// map), ?chunk=32 (chunk size in cells)
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { SimplifyModifier } from 'three/addons/modifiers/SimplifyModifier.js';

const params = new URLSearchParams(location.search);
const DENSE = params.has('dense'), NOLOD = params.has('nolod'), NOCHUNK = params.has('nochunk');
const N = 128, CELL = 2, CHUNK = NOCHUNK ? N : +(params.get('chunk') ?? 16), MID_SPAN = 55, FAR_SPAN = 110;
const FARM = { x0: 32, z0: 28, size: 64 };
const GRASS = 0, PATH = 3, TILLED = 4, WATER = 5, FIELD_EDGE = 6;
let seed = 11; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = a => a[Math.floor(rnd() * a.length)];

// ── Renderer, camera, lights ──
const renderer = new THREE.WebGLRenderer({ antialias: devicePixelRatio < 2, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);
renderer.info.autoReset = true;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#9fd3f0');
scene.add(new THREE.HemisphereLight('#fff6e0', '#7a9a5a', 1.5));
const sun = new THREE.DirectionalLight('#fff1d6', 2.4); sun.position.set(-40, 80, 30); scene.add(sun);
const ramp = new THREE.DataTexture(new Uint8Array([90, 160, 215, 255]), 4, 1, THREE.RedFormat);
ramp.minFilter = ramp.magFilter = THREE.NearestFilter; ramp.needsUpdate = true;
const toon = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: ramp });

const view = { x: (FARM.x0 + FARM.size / 2) * CELL, z: (FARM.z0 + FARM.size / 2) * CELL, span: 70, yaw: Math.PI / 4 };
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 1000);
function placeCamera() {
  const aspect = innerWidth / innerHeight, w = aspect >= 1 ? view.span : view.span * aspect, h = w / aspect;
  Object.assign(camera, { left: -w / 2, right: w / 2, top: h / 2, bottom: -h / 2 }); camera.updateProjectionMatrix();
  const pitch = 0.95, dist = 300; // about 54° down
  camera.position.set(view.x + Math.sin(view.yaw) * Math.cos(pitch) * dist, Math.sin(pitch) * dist, view.z + Math.cos(view.yaw) * Math.cos(pitch) * dist);
  camera.lookAt(view.x, 0, view.z);
  const lod = lodLevel();
  for (const m of nearMeshes) m.visible = lod === 0;
  for (const m of midMeshes) m.visible = lod === 1;
  for (const m of farMeshes) m.visible = lod === 2;
}
const lodLevel = () => NOLOD ? 0 : view.span > FAR_SPAN ? 2 : view.span > MID_SPAN ? 1 : 0;
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); placeCamera(); });

// ── Models: bake each GLB root into one geometry with vertex colours ──
function bake(root) {
  root.updateWorldMatrix(true, true);
  const inv = root.matrixWorld.clone().invert(), parts = [];
  root.traverse(o => {
    if (!o.isMesh) return;
    const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone());
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    const c = (Array.isArray(o.material) ? o.material[0] : o.material).color ?? new THREE.Color(1, 1, 1);
    const col = new Float32Array(g.attributes.position.count * 3);
    for (let i = 0; i < col.length; i += 3) { col[i] = c.r; col[i + 1] = c.g; col[i + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    parts.push(g);
  });
  const g = mergeGeometries(parts); g.computeBoundingBox();
  const b = g.boundingBox; g.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2); g.computeBoundingBox();
  return g;
}
function fit(g, { width, height }) { // scale to a target footprint width or height in metres
  const s = g.boundingBox.getSize(new THREE.Vector3()), k = width ? width / Math.max(s.x, s.z) : height / s.y;
  g.scale(k, k, k); g.computeBoundingBox(); g.computeBoundingSphere(); return g;
}
function averageColor(g) {
  const c = g.attributes.color.array, out = new THREE.Color(0, 0, 0); let n = 0;
  for (let i = 0; i < c.length; i += 9) { out.r += c[i]; out.g += c[i + 1]; out.b += c[i + 2]; n++; }
  return out.multiplyScalar(1 / n);
}
const STANDIN = { // tiny stand-ins used when zoomed out, white so the instance colour shows
  crop: new THREE.ConeGeometry(0.55, 0.8, 5).translate(0, 0.4, 0),
  tree: new THREE.IcosahedronGeometry(1, 0).scale(1, 1.3, 1).translate(0, 1.3, 0),
  animal: new THREE.BoxGeometry(0.8, 0.7, 1.1).translate(0, 0.35, 0),
};
for (const g of Object.values(STANDIN)) { const n = g.attributes.position.count; g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3)); }
const standinMat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: ramp });

const loader = new GLTFLoader();
const load = f => loader.loadAsync(`./assets/${f}.glb`).then(g => Object.fromEntries(g.scene.children.map(c => [c.name, c])));
const [crops, scenery, farm, town] = await Promise.all(['crops', 'scenery', 'farm', 'town'].map(load));
const M = {}; // model name → { geo, far, color, kind }
const simplifier = new SimplifyModifier();
function simplify(geo, keep = 0.4) { // the middle level of detail; in the game, Blender's Decimate makes these at build time
  const merged = mergeVertices(geo.clone()), n = merged.attributes.position.count;
  const g = simplifier.modify(merged, Math.floor(n * (1 - keep))); g.computeVertexNormals(); g.computeBoundingSphere(); return g;
}
const add = (name, root, size, kind) => {
  const geo = fit(bake(root), size);
  M[name] = { geo, mid: kind === 'static' ? geo : simplify(geo), kind, color: averageColor(geo), size: geo.boundingBox.getSize(new THREE.Vector3()) };
};
for (const c of ['carrot', 'pumpkin', 'goldcorn', 'berry', 'radish', 'coffee']) add(c, crops['crop_' + c], { width: 1.5 }, 'crop');
add('sprout', crops.crop_sprout, { width: 0.9 }, 'crop');
add('tree_round', scenery.tree_round, { height: 5 }, 'tree'); add('tree_pine', scenery.tree_pine, { height: 6 }, 'tree');
add('tree_blossom', scenery.tree_blossom, { height: 4.5 }, 'tree');
add('bush', scenery.bush, { width: 1.6 }, 'crop'); add('flowers', scenery.flowers, { width: 1.2 }, 'crop');
add('rock', scenery.rock, { width: 1.4 }, 'crop'); add('tuft', scenery.tuft, { width: 0.8 }, 'crop');
add('fence', scenery.fence, { width: 2 }, 'static');
add('chicken', farm.chicken, { height: 0.7 }, 'animal'); add('cow', farm.cow, { height: 1.6 }, 'animal');
add('coop', farm.coop, { width: 3.6 }, 'static'); add('hay', farm.hay_bale, { width: 1.4 }, 'static');
for (const h of ['house_gable', 'house_front', 'house_tall', 'house_hip', 'house_round']) add(h, town[h], { width: 6 }, 'static');
add('school', town.school, { width: 10 }, 'static'); add('hospital', town.hospital, { width: 8 }, 'static');
add('police', town.police, { width: 6 }, 'static'); add('company', town.company, { width: 8 }, 'static');

// ── The map ──
const cells = new Uint8Array(N * N); const at = (x, z) => cells[z * N + x];
const set = (x, z, v) => { if (x >= 0 && z >= 0 && x < N && z < N) cells[z * N + x] = v; };
const objects = []; // { model, x, z, rot, scale }
const put = (model, x, z, rot = rnd() * Math.PI * 2, scale = 1) => objects.push({ model, x, z, rot, scale });
// brook across the north, roads, the farm's fields, the orchard, pens and the village
for (let x = 0; x < N; x++) { const zc = 12 + Math.round(Math.sin(x / 9) * 3); for (let d = -1; d <= 1; d++) set(x, zc + d, WATER); }
for (let z = 0; z < N; z++) { set(28, z, PATH); set(29, z, PATH); }
for (let x = 0; x < N; x++) { set(x, 98, PATH); set(x, 99, PATH); }
const kinds = ['carrot', 'pumpkin', 'goldcorn', 'berry', 'radish', 'coffee'];
let cropCount = 0;
for (let fz = 0; fz < FARM.size; fz += DENSE ? FARM.size : 5) for (let fx = 0; fx < FARM.size; fx += DENSE ? FARM.size : 5) {
  const w = DENSE ? FARM.size : 4;
  // dense mode: every cell its own random crop; fields: one crop and stage per 4 × 4 field
  const kind = pick(kinds), stage = Math.floor(rnd() * 4);
  for (let z = 0; z < w; z++) for (let x = 0; x < w; x++) {
    const cx = FARM.x0 + fx + x, cz = FARM.z0 + fz + z; if (cx >= FARM.x0 + FARM.size || cz >= FARM.z0 + FARM.size) continue;
    set(cx, cz, TILLED);
    const k = DENSE ? pick(kinds) : kind, s = DENSE ? Math.floor(rnd() * 4) : stage;
    put(s === 0 ? 'sprout' : k, cx, cz, rnd() * Math.PI * 2, [1, 0.6, 0.8, 1][s]); cropCount++;
  }
}
for (let z = FARM.z0; z < FARM.z0 + FARM.size; z++) for (let x = FARM.x0; x < FARM.x0 + FARM.size; x++) if (at(x, z) === GRASS) set(x, z, PATH);
for (let i = 0; i < FARM.size; i++) { // fence around the farm
  put('fence', FARM.x0 + i, FARM.z0 - 0.5, 0, 1); put('fence', FARM.x0 + i, FARM.z0 + FARM.size - 0.5, 0, 1);
  put('fence', FARM.x0 - 0.5, FARM.z0 + i, Math.PI / 2, 1); put('fence', FARM.x0 + FARM.size - 0.5, FARM.z0 + i, Math.PI / 2, 1);
}
for (let z = 30; z < 92; z += 3) for (let x = 100; x < 116; x += 3) put(pick(['tree_blossom', 'tree_round']), x, z, rnd() * 6, 0.9 + rnd() * 0.2);
const pens = [{ x0: 100, z0: 102, w: 12, h: 10, animal: 'chicken', n: 48, home: 'coop' }, { x0: 114, z0: 102, w: 12, h: 12, animal: 'cow', n: 16, home: 'hay' }];
const animals = [];
for (const p of pens) {
  for (let i = 0; i < p.w; i++) { put('fence', p.x0 + i, p.z0 - 0.5, 0, 1); put('fence', p.x0 + i, p.z0 + p.h - 0.5, 0, 1); }
  for (let i = 0; i < p.h; i++) { put('fence', p.x0 - 0.5, p.z0 + i, Math.PI / 2, 1); put('fence', p.x0 + p.w - 0.5, p.z0 + i, Math.PI / 2, 1); }
  for (let i = 0; i < (p.home === 'coop' ? 4 : 6); i++) put(p.home, p.x0 + 1.5 + i * 2.6, p.z0 + 1, 0, 1);
  for (let i = 0; i < p.n; i++) animals.push({ model: p.animal, pen: p, x: p.x0 + 1 + rnd() * (p.w - 2), z: p.z0 + 3 + rnd() * (p.h - 4), rot: rnd() * 6, phase: rnd() * 6 });
}
const village = ['house_gable', 'house_front', 'house_tall', 'house_hip', 'house_round'];
for (let i = 0; i < 16; i++) put(village[i % 5], 34 + i * 4, i % 2 ? 103 : 94, i % 2 ? 0 : Math.PI, 1);
put('school', 40, 112, 0, 1); put('hospital', 56, 112, 0, 1); put('police', 70, 112, 0, 1); put('company', 84, 112, 0, 1);
const busy = (x, z) => at(x, z) !== GRASS || (x >= 30 && x <= 127 && z >= 88 && z <= 120) || (x >= 98 && x <= 118 && z >= 28 && z <= 94);
let wild = 0;
for (let i = 0; i < 9000 && wild < 3000; i++) {
  const x = Math.floor(rnd() * N), z = Math.floor(rnd() * N); if (busy(x, z)) continue;
  const r = rnd(); put(r < 0.3 ? pick(['tree_pine', 'tree_round']) : r < 0.45 ? 'bush' : r < 0.65 ? 'flowers' : r < 0.75 ? 'rock' : 'tuft', x + rnd() * 0.6 - 0.3, z + rnd() * 0.6 - 0.3, rnd() * 6, 0.8 + rnd() * 0.4); wild++;
}

// ── Ground: one mesh per chunk, one flat-coloured quad per cell ──
const ground = { [GRASS]: '#8cc96b', [PATH]: '#e3c99a', [TILLED]: '#9a6a44', [WATER]: '#4aa6d8' };
const nearMeshes = [], midMeshes = [], farMeshes = [];
const groundCol = Object.fromEntries(Object.entries(ground).map(([k, v]) => [k, new THREE.Color(v)]));
for (let cz = 0; cz < N; cz += CHUNK) for (let cx = 0; cx < N; cx += CHUNK) {
  const pos = [], col = [], c = new THREE.Color();
  for (let z = cz; z < cz + CHUNK; z++) for (let x = cx; x < cx + CHUNK; x++) {
    const t = at(x, z); c.copy(groundCol[t] ?? groundCol[GRASS]).offsetHSL(0, 0, (rnd() - 0.5) * 0.04);
    const x0 = x * CELL, z0 = z * CELL, x1 = x0 + CELL, z1 = z0 + CELL, y = t === WATER ? -0.15 : 0;
    pos.push(x0, y, z0, x0, y, z1, x1, y, z1, x0, y, z0, x1, y, z1, x1, y, z0);
    for (let i = 0; i < 6; i++) col.push(c.r, c.g, c.b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals(); g.computeBoundingSphere();
  scene.add(new THREE.Mesh(g, toon));
}

// ── Instanced batches per chunk and model; stand-ins per chunk and kind ──
const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
const matrix = o => m4.compose(new THREE.Vector3(o.x * CELL + CELL / 2, 0, o.z * CELL + CELL / 2), q.setFromAxisAngle(up, o.rot), new THREE.Vector3(o.scale, o.scale, o.scale));
// Each level of detail has its own chunk size: small chunks close up (tight culling), bigger ones further out (fewer draws).
const SIZES = NOCHUNK ? { static: N, near: N, mid: N, far: N } : params.has('chunk') ? Object.fromEntries(['static', 'near', 'mid', 'far'].map(k => [k, CHUNK])) : { static: 16, near: 8, mid: 16, far: 32 };
function chunked(list, size) {
  const groups = new Map();
  for (const o of list) { const key = `${Math.floor(o.x / size)},${Math.floor(o.z / size)}`; (groups.get(key) ?? groups.set(key, []).get(key)).push(o); }
  return groups.values();
}
const by = (list, f) => { const m = new Map(); for (const o of list) { const k = f(o); (m.get(k) ?? m.set(k, []).get(k)).push(o); } return m; };
let batches = 0;
function batch(geo, mat, os, place, into) {
  const mesh = new THREE.InstancedMesh(geo, mat, os.length);
  os.forEach((o, i) => place(mesh, o, i)); mesh.computeBoundingSphere(); scene.add(mesh); into?.push(mesh); batches++;
}
const statics = objects.filter(o => M[o.model].kind === 'static'), living = objects.filter(o => M[o.model].kind !== 'static');
const full = (mesh, o, i) => mesh.setMatrixAt(i, matrix(o));
for (const list of chunked(statics, SIZES.static)) for (const [model, os] of by(list, o => o.model)) batch(M[model].geo, toon, os, full);
for (const list of chunked(living, SIZES.near)) for (const [model, os] of by(list, o => o.model)) batch(M[model].geo, toon, os, full, nearMeshes);
for (const list of chunked(living, SIZES.mid)) for (const [model, os] of by(list, o => o.model)) batch(M[model].mid, toon, os, full, midMeshes);
const standin = (mesh, o, i) => {
  const kind = M[o.model].kind, s = M[o.model].size, k = (kind === 'tree' ? s.y / 2.6 : Math.max(s.x, s.z) / 1.1) * o.scale;
  mesh.setMatrixAt(i, m4.compose(new THREE.Vector3(o.x * CELL + CELL / 2, 0, o.z * CELL + CELL / 2), q.setFromAxisAngle(up, o.rot), new THREE.Vector3(k, k, k)));
  mesh.setColorAt(i, M[o.model].color);
};
for (const list of chunked(living, SIZES.far)) for (const [kind, os] of by(list, o => M[o.model].kind)) batch(STANDIN[kind], standinMat, os, standin, farMeshes);
// animals move every frame, so they have their own batches (one per animal kind) plus stand-ins
const herds = {};
for (const a of animals) (herds[a.model] ??= []).push(a);
for (const [model, list] of Object.entries(herds)) {
  const near = new THREE.InstancedMesh(M[model].geo, toon, list.length), mid = new THREE.InstancedMesh(M[model].mid, toon, list.length);
  const far = new THREE.InstancedMesh(STANDIN.animal, standinMat, list.length);
  list.forEach((a, i) => far.setColorAt(i, M[model].color));
  near.frustumCulled = mid.frustumCulled = far.frustumCulled = false; scene.add(near, mid, far);
  nearMeshes.push(near); midMeshes.push(mid); farMeshes.push(far);
  herds[model] = { list, near, mid, far };
}
const tmp = new THREE.Vector3(), sc = new THREE.Vector3();
function moveAnimals(t) {
  for (const { list, near, mid, far } of Object.values(herds)) {
    const mesh = near.visible ? near : mid.visible ? mid : far, k = far.visible ? (list[0].model === 'cow' ? 1.6 : 0.8) : 1;
    list.forEach((a, i) => {
      const p = a.pen, speed = a.model === 'cow' ? 0.15 : 0.5;
      a.rot += Math.sin(t * 0.0005 + a.phase) * 0.01;
      a.x = Math.min(p.x0 + p.w - 1.5, Math.max(p.x0 + 0.5, a.x + Math.sin(a.rot) * speed * 0.016));
      a.z = Math.min(p.z0 + p.h - 1.5, Math.max(p.z0 + 2.5, a.z + Math.cos(a.rot) * speed * 0.016));
      const hop = a.model === 'chicken' ? Math.abs(Math.sin(t * 0.008 + a.phase)) * 0.12 : 0;
      mesh.setMatrixAt(i, m4.compose(tmp.set(a.x * CELL + CELL / 2, hop, a.z * CELL + CELL / 2), q.setFromAxisAngle(up, a.rot), sc.set(k, k, k)));
    });
    mesh.instanceMatrix.needsUpdate = true;
  }
}

// ── Input: drag to pan, pinch or wheel to zoom, ⟳ to turn ──
const pointers = new Map(); let pinch = 0;
const panBy = (dx, dy) => {
  const mpp = (camera.right - camera.left) / innerWidth, s = Math.sin(view.yaw), c = Math.cos(view.yaw);
  view.x -= (dx * c + dy * s / Math.sin(0.95)) * mpp; view.z -= (-dx * s + dy * c / Math.sin(0.95)) * mpp; clampView();
};
const clampView = () => { view.span = Math.min(260, Math.max(24, view.span)); view.x = Math.min(N * CELL, Math.max(0, view.x)); view.z = Math.min(N * CELL, Math.max(0, view.z)); placeCamera(); };
renderer.domElement.addEventListener('pointerdown', e => { pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); renderer.domElement.setPointerCapture(e.pointerId); });
renderer.domElement.addEventListener('pointermove', e => {
  const p = pointers.get(e.pointerId); if (!p) return;
  if (pointers.size === 1) panBy(e.clientX - p.x, e.clientY - p.y);
  p.x = e.clientX; p.y = e.clientY;
  if (pointers.size === 2) { const [a, b] = [...pointers.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch) { view.span *= pinch / d; clampView(); } pinch = d; }
});
const lift = e => { pointers.delete(e.pointerId); pinch = 0; };
renderer.domElement.addEventListener('pointerup', lift); renderer.domElement.addEventListener('pointercancel', lift);
addEventListener('wheel', e => { view.span *= e.deltaY > 0 ? 1.12 : 1 / 1.12; clampView(); }, { passive: true });
document.querySelector('#zoom').addEventListener('click', e => {
  const z = e.target.dataset.z; if (z === 'in') view.span /= 1.4; if (z === 'out') view.span *= 1.4; if (z === 'turn') view.yaw += Math.PI / 2; clampView();
});

// ── Loop, HUD and the benchmark hook ──
const hud = document.querySelector('#hud');
let frames = 0, last = performance.now(), cpu = 0;
const sample = { on: false, dts: [], cpu: [] };
function loop(t) {
  const dt = t - last; last = t; frames++;
  const c0 = performance.now(); moveAnimals(t); renderer.render(scene, camera); const c1 = performance.now() - c0;
  cpu = cpu * 0.9 + c1 * 0.1;
  if (sample.on) { sample.dts.push(dt); sample.cpu.push(c1); }
  if (frames % 30 === 0) {
    const r = renderer.info.render;
    hud.textContent = `${cropCount} crops, ${objects.length + animals.length} objects, ${batches} batches\n` +
      `${Math.round(1000 / dt)} fps · ${cpu.toFixed(1)} ms cpu · ${r.calls} draws · ${(r.triangles / 1000).toFixed(0)}k tris\n` +
      `zoom ${view.span.toFixed(0)} m (${['full models', 'simplified models', 'stand-ins'][lodLevel()]})`;
  }
  requestAnimationFrame(loop);
}
placeCamera();
requestAnimationFrame(loop);
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };
window.bench = {
  crops: cropCount, objects: objects.length + animals.length, batches,
  setView(span, x = view.x, z = view.z) { Object.assign(view, { span, x, z }); clampView(); },
  farm: { x: (FARM.x0 + FARM.size / 2) * CELL, z: (FARM.z0 + FARM.size / 2) * CELL },
  async measure(ms = 3000) {
    await new Promise(r => setTimeout(r, 400)); sample.dts = []; sample.cpu = []; sample.on = true;
    await new Promise(r => setTimeout(r, ms)); sample.on = false;
    const avg = sample.dts.reduce((a, b) => a + b, 0) / sample.dts.length, r = renderer.info.render;
    return { fps: Math.round(1000 / avg), p95ms: +pct(sample.dts, 0.95).toFixed(1), cpuMs: +(sample.cpu.reduce((a, b) => a + b, 0) / sample.cpu.length).toFixed(2), draws: r.calls, tris: r.triangles };
  },
};
window.bench.ready = true;
