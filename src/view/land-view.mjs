// Draws the rules state on the map: cell colours, weeds and rocks, everything placed, fences on edges, and the
// dressing that follows from it (AAA pass): raised bed rims with furrows under the crops (one instanced mesh per
// 16 × 16 cells), fence posts joined at corners and T joints, edge stones along paths, window boxes, flowerpots and a
// lantern on cottages as they are furnished, scaffolding on the ruin of the project being worked on, and the feed
// mill's sails. sync() rebuilds from scratch (after loading); apply(events) updates only what an action changed.
import * as THREE from 'three';
import { N, CELL, ORDER_BOARD, RUINS } from '../content/world.mjs';
import { footprint, BUILDINGS } from '../content/buildings.mjs';
import { STEPS } from '../content/projects.mjs';
import { cellType, occupant, penOf, cellsOf } from '../core/grid.mjs';
import { KIND_MODELS, EARLY, modelFor, sizeOf, anchorPoints, ANCHORS } from './kinds.mjs';
import { loadKit, loadKitLater, bake, fit, tiers } from './models.mjs';
import { toon } from '../kit/toon.mjs';
import { GROUND_COLORS } from './world-view.mjs';

const RIM_CHUNK = 16;
const OWN = /^(p\d|c\d|e\d|j-?\d|s\d|sails:|dress:|scaffold:|pen:)/;   // batch ids land-view owns (removed by sync)
const FENCES = new Set(['fence', 'gate']);
const PEN_EARTH = '#c9a46a';

export class LandView {
  constructor(world, game) {
    Object.assign(this, { world, game, ready: false, pos: new Map(), beds: new Map(), rims: new Map(), rimDirty: new Set(), dressed: new Map(), clock: 0, pens: new Map() });
    world.cellLook = (x, z) => this.look(x, z);
    world.onFrame?.(dt => this.frame(dt));
  }
  /** Models arrive in two waves: the farm first (the first frame), then town buildings, nature, props and decor. */
  async load() {
    const entries = Object.entries(KIND_MODELS);
    await this.register(entries.filter(([, spec]) => !spec.late));
    await this.register(Object.entries(EARLY).map(([k, spec]) => [`${k}~`, spec]));
    this.makeRims();
    this.world.batches.set('order_board', { model: 'order_board', x: (ORDER_BOARD.x + 0.5) * CELL, z: (ORDER_BOARD.z + 0.5) * CELL, rot: Math.PI / 2 });
    this.ready = true; this.sync();
    this.later = this.loadLater(entries.filter(([, spec]) => spec.late));
  }
  async loadLater(entries) {
    // the town first (ruins and cottages are part of the story), then everything else, one kit at a time
    const byKit = new Map();
    for (const [name, spec] of entries) (byKit.get(spec.kit) ?? byKit.set(spec.kit, []).get(spec.kit)).push([name, spec]);
    const order = ['town', ...[...byKit.keys()].filter(k => k !== 'town')];
    for (const kit of order) {
      if (!byKit.has(kit)) continue;
      try {
        await loadKitLater(kit);
        await this.register(byKit.get(kit));
        if (kit === 'town') await this.makeRuins();
      } catch (e) { console.warn(`kit ${kit}: ${e.message}`); }
      this.sync();
    }
  }
  /** Ruins: the town buildings in faded, dusty colours (DESIGN 11). */
  async makeRuins() {
    const town = await loadKit('town');
    for (const r of RUINS) {
      const geo = fit(bake(town[r.model]), { width: r.width }), c = geo.attributes.color;
      for (let i = 0; i < c.count; i++) { const g = (c.getX(i) + c.getY(i) + c.getZ(i)) / 3; c.setXYZ(i, g * 0.55 + c.getX(i) * 0.2 + 0.08, g * 0.55 + c.getY(i) * 0.2 + 0.07, g * 0.55 + c.getZ(i) * 0.2 + 0.05); }
      this.world.batches.register(`ruin:${r.kind}`, { geo, kind: 'static' });
    }
  }
  async register(specs) {
    const kits = {};
    for (const [, spec] of specs) kits[spec.kit] ??= loadKit(spec.kit);
    for (const [name, spec] of specs) {
      if (this.world.batches.has(name)) continue;
      const kit = await kits[spec.kit];
      if (!kit[spec.node]) { console.warn(`model ${spec.node} is missing from ${spec.kit}.glb`); continue; }
      const t = tiers(kit, spec.node, sizeOf(spec), spec.lod, { ao: spec.ao ?? 1, center: !spec.authored });
      this.world.batches.register(name, { geo: t.geo, mid: t.mid, far: t.far, kind: spec.lod, color: t.color });
    }
  }
  get s() { return this.game.s; }
  look(x, z) {
    const fixed = this.world.fixedLook(x, z), s = this.s;
    if (!s) return fixed;
    const t = cellType(s, x, z);
    if (t === 'path') return { color: GROUND_COLORS.path };
    if (t === 'tilled') return { color: GROUND_COLORS.tilled, jitter: 0.02 };
    if (t === 'weeds' || t === 'rock') return { color: GROUND_COLORS.weeds ?? '#86c062' };
    // inside an animal pen the grass is trodden to warm earth in patches (review: 'flat empty grass')
    if (t === 'grass' && this.pens.get(z * N + x)?.worn) return { color: PEN_EARTH, jitter: 0.05 };
    return fixed;
  }
  /** Animal pens: which grass cells lie inside a closed pen (for the trodden earth), and a hay pile in each pen. */
  refreshPens() {
    const s = this.s, b = this.world.batches, next = new Map(), hay = new Map();
    for (const [id, p] of Object.entries(s.placed)) {
      if (!BUILDINGS[p.kind]?.animals) continue;
      const pen = penOf(s, id); if (!pen.closed) continue;
      const own = new Set(cellsOf(p.kind, p.x, p.z, p.rot).map(([x, z]) => z * N + x)), [w, d] = footprint(p.kind, p.rot);
      let best = null, far = -Infinity;
      for (const k of pen.keys) {
        if (own.has(k)) continue;
        const x = k % N, z = (k - x) / N, dist = Math.hypot(x + 0.5 - (p.x + w / 2), z + 0.5 - (p.z + d / 2));
        // the ground is trodden bare round the home
        const edge = dist - Math.max(w, d) / 2, worn = edge < 1.6;
        next.set(k, { id, worn });
        const fit = -Math.abs(edge - 1.8);                  // the hay pile sits a couple of cells from the home, in view
        if (fit > far && cellType(s, x, z) === 'grass' && !occupant(s, x, z)) { far = fit; best = [x, z]; }
      }
      if (best) hay.set(id, best);
    }
    for (const k of new Set([...this.pens.keys(), ...next.keys()])) if (this.pens.get(k)?.worn !== next.get(k)?.worn) this.world.ground.markDirty(k % N, Math.floor(k / N));
    this.pens = next;
    for (const id of [...b.items.keys()]) if (id.startsWith('pen:') && !hay.has(id.slice(4))) b.remove(id);
    if (b.has('hay_bale')) for (const [id, [x, z]] of hay) b.set(`pen:${id}`, { model: 'hay_bale', x: (x + 0.5) * CELL, z: (z + 0.5) * CELL, rot: (x * 7 + z) % 4 * 0.6, scale: 0.75 });
  }
  /** The registered model that draws a kind now: its own, its first-frame stand-in, or null while it loads. */
  model(kind, id) {
    let name = modelFor(kind, id);
    if (KIND_MODELS[`${name}:bare`] && !this.fruitReady(id)) name = `${name}:bare`;
    const b = this.world.batches;
    return b.has(name) ? name : b.has(`${name}~`) ? `${name}~` : null;
  }
  /** Fruit trees show fruit when their harvest is ready (whatever shape the play package's state takes). */
  fruitReady(id) {
    const s = this.s, now = this.game.now, st = s.trees?.[id] ?? s.fruitTrees?.[id] ?? s.orchard?.[id] ?? s.fruit?.[id] ?? s.production?.[id];
    if (!st) return true;
    if (typeof st.ready === 'boolean') return st.ready;
    const at = st.doneAt ?? st.readyAt ?? st.queue?.[0]?.doneAt;
    return at == null ? true : at <= now;
  }
  /** World position of a placed item's centre. */
  centre(kind, x, z, rot) { const [w, d] = footprint(kind, rot); return { x: (x + w / 2) * CELL, z: (z + d / 2) * CELL }; }
  drawPlaced(id) {
    const p = this.s.placed[id], b = this.world.batches, old = this.pos.get(id);
    if (old) { this.world.ground.markDirty(old.x, old.z); this.pos.delete(id); }
    b.remove(`sails:${id}`); this.undress(id);
    if (this.beds.has(id)) { this.rimDirty.add(this.beds.get(id).chunk); this.beds.delete(id); }
    if (!p) { b.remove(id); return; }
    this.pos.set(id, { x: p.x, z: p.z }); this.world.ground.markDirty(p.x, p.z);
    if (p.kind === 'bed') {                                             // beds are tilled ground with a rim; life-view draws the crops
      b.remove(id);
      const chunk = `${Math.floor(p.x / RIM_CHUNK)},${Math.floor(p.z / RIM_CHUNK)}`;
      this.beds.set(id, { x: p.x, z: p.z, chunk }); this.rimDirty.add(chunk);
      return;
    }
    const model = this.model(p.kind, id);
    if (!model) return;                                                 // its model is still loading; sync() draws it later
    const c = this.centre(p.kind, p.x, p.z, p.rot), item = { model, x: c.x, z: c.z, rot: p.rot * Math.PI / 2 };
    b.set(id, item);
    if (p.kind === 'feed_mill' && b.has('feed_mill_sails')) {
      const [at] = anchorPoints('feed_mill', 'sails', item), hub = ANCHORS.feed_mill_sails?.hub?.[0] ?? [0, 0, 0];
      if (at) b.set(`sails:${id}`, { model: 'feed_mill_sails', x: at.x, z: at.z, y: at.y - hub[1], rot: item.rot });
    }
    if (p.kind === 'cottage') this.dressCottage(id, item);
  }
  drawCell(x, z) {
    const t = cellType(this.s, x, z), b = this.world.batches, id = `c${x},${z}`;
    if (t === 'weeds') b.set(id, { model: (x * 7 + z * 3) % 3 ? 'weeds' : 'weeds2', x: (x + 0.5) * CELL, z: (z + 0.5) * CELL, rot: (x * 13 + z * 7) % 6, scale: 0.85 + ((x + z) % 3) * 0.1 });
    else if (t === 'rock') b.set(id, { model: 'rock', x: (x + 0.5) * CELL, z: (z + 0.5) * CELL, rot: (x * 5 + z) % 6 });
    else b.remove(id);
    this.world.ground.markDirty(x, z);
    this.drawStones(x, z);
  }
  drawEdge(key) {
    const [x, z, side] = key.split(','), kind = this.s.fences[key], b = this.world.batches, id = `e${key}`;
    if (!kind) b.remove(id);
    else {
      const X = +x * CELL, Z = +z * CELL, model = b.has(kind) ? kind : null;
      if (model) b.set(id, side === 'n' ? { model, x: X + CELL / 2, z: Z, rot: 0 } : { model, x: X, z: Z + CELL / 2, rot: Math.PI / 2 });
    }
    // the posts at both ends of this edge
    if (side === 'n') { this.drawJoint(+x, +z); this.drawJoint(+x + 1, +z); } else { this.drawJoint(+x, +z); this.drawJoint(+x, +z + 1); }
  }
  /** A post where fence edges meet at grid point (vx, vz): an end or straight post, a corner, or a T / cross joint. */
  drawJoint(vx, vz) {
    const f = this.s.fences, b = this.world.batches, id = `j${vx},${vz}`;
    const e = [f[`${vx},${vz},n`], f[`${vx - 1},${vz},n`], f[`${vx},${vz},w`], f[`${vx},${vz - 1},w`]];   // east, west, south, north
    const fences = e.map(k => k === 'fence'), n = fences.filter(Boolean).length;
    if (!n) { b.remove(id); return; }
    const straight = n === 2 && ((fences[0] && fences[1]) || (fences[2] && fences[3]));
    const model = n >= 3 ? 'fence:t' : n === 2 && !straight ? 'fence:corner' : 'fence:post';
    if (b.has(model)) b.set(id, { model, x: vx * CELL, z: vz * CELL, rot: 0 });
  }
  /** Edge stones on the sides of a path cell that touch grass (and the neighbours' sides that touch this cell). */
  drawStones(x, z) {
    const b = this.world.batches;
    if (!b.has('path_stones')) return;
    for (const [cx, cz] of [[x, z], [x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1]]) {
      if (cx < 0 || cz < 0 || cx >= N || cz >= N) continue;
      const path = cellType(this.s, cx, cz) === 'path';
      for (const [dx, dz, side] of [[0, -1, 'n'], [0, 1, 's'], [-1, 0, 'w'], [1, 0, 'e']]) {
        const id = `s${cx},${cz},${side}`, ox = cx + dx, oz = cz + dz;
        const t = cellType(this.s, ox, oz);
        const grass = path && (t === 'grass' || t === 'weeds') && !occupant(this.s, ox, oz);
        if (!grass) { b.remove(id); continue; }
        const X = (cx + 0.5 + dx * 0.47) * CELL, Z = (cz + 0.5 + dz * 0.47) * CELL;
        b.set(id, { model: 'path_stones', x: X, z: Z, rot: dx ? Math.PI / 2 : 0, scale: 0.9 + ((cx * 3 + cz * 5) % 3) * 0.06 });
      }
    }
  }
  /** A ruin stays until its building stands somewhere in the village; scaffolding marks the project being worked on. */
  drawRuins() {
    const s = this.s, b = this.world.batches, step = STEPS[s.projects?.step];
    for (const r of RUINS) {
      const id = `ruin:${r.kind}`, built = (s.counts[r.kind] ?? 0) > 0, [w, d] = r.kind === 'school' ? [5, 4] : [4, 3];
      const at = { x: (r.x + w / 2) * CELL, z: (r.z + d / 2) * CELL, rot: r.rot * Math.PI / 2 };
      if (b.has(id)) { if (built) b.remove(id); else b.set(id, { model: id, ...at }); }
      const working = !built && step?.builds?.includes(r.kind) && b.has('scaffold');
      // against the ruin's front wall, a little off centre
      const ox = -1.6, oz = d * CELL / 2 - 0.6, c = Math.cos(at.rot), sn = Math.sin(at.rot);
      if (working) b.set(`scaffold:${r.kind}`, { model: 'scaffold', x: at.x + ox * c + oz * sn, z: at.z - ox * sn + oz * c, rot: at.rot, scale: 1.1 });
      else b.remove(`scaffold:${r.kind}`);
    }
  }
  /** Cottage dressing by furnish level: a doormat, then window boxes and flowerpots, then a door lantern. */
  dressCottage(id, item) {
    const b = this.world.batches, level = this.s.homes?.[id]?.level ?? 0, model = item.model, ids = [];
    if (!b.has('window_box')) return;
    const geo = b.models.get(model)?.geo, front = geo ? geo.boundingBox.max.z : 2.8;
    const put = (key, m, x, y, z, extra = {}) => {
      const c = Math.cos(item.rot), s = Math.sin(item.rot), did = `dress:${id}:${key}`;
      b.set(did, { model: m, x: item.x + x * c + z * s, z: item.z - x * s + z * c, y, rot: item.rot, ...extra }); ids.push(did);
    };
    put('mat', 'doormat', 0, 0.02, front + 0.35);
    // The default camera looks at a village cottage's back and one side (they face the lane to the north), so those walls
    // get life from the start (review: 'a blank cream wall with one window'): a flower box under every ground-floor
    // window on the back and sides, and a bush and a patch of flowers at the back corners.
    const box = geo?.boundingBox, back = box ? box.min.z : -2.6, sideX = box ? box.max.x : 2.6;
    (ANCHORS[model]?.window ?? []).filter(w => (w[4] ?? 0) < 0.7 && w[1] < 2.6).slice(0, 4).forEach((w, i) => {
      const nx = w[3] ?? 0, nz = w[4] ?? 0;
      put(`back${i}`, 'window_box', w[0] + nx * 0.12, Math.max(0.3, w[1] - 0.55), w[2] + nz * 0.12, { rot: item.rot + Math.atan2(nx, nz) });
    });
    if (b.has('bush')) { put('bushL', 'bush', -sideX + 0.5, 0, back - 0.45, { scale: 0.5 }); put('bushR', 'bush', sideX - 0.3, 0, back - 0.4, { scale: 0.42 }); }
    if (b.has('flowers')) put('flowersB', 'flowers', sideX - 1.3, 0, back - 0.45, { scale: 0.7 });
    if (level >= 1) {
      const wins = (ANCHORS[model]?.window ?? []).filter(w => (w[4] ?? 0) > 0.7 && w[1] < 2.6).slice(0, 3);
      wins.forEach((w, i) => put(`box${i}`, 'window_box', w[0], Math.max(0.3, w[1] - 0.55), w[2] + 0.12));
      put('pots', 'flowerpots', 1.6, 0, front + 0.45);
    }
    if (level >= 2) put('lantern', 'door_lantern', 0.75, 1.75, front - 0.1);
    this.dressed.set(id, ids);
  }
  undress(id) { for (const did of this.dressed.get(id) ?? []) this.world.batches.remove(did); this.dressed.delete(id); }

  // ── Bed rims: one InstancedMesh per 32 × 32 cells and level of detail (near: rims and furrows; middle: a flat frame) ──
  makeRims() {
    // near: a raised frame (top, outer and inner walls) and five furrow ridges, 44 triangles; middle: the flat frame.
    // Read as tilled soil, not a crate (review): a thin dark rim and crumbly dark-earth ridges with lit crests.
    const near = [], mid = [], col = [], colMid = [], rim = new THREE.Color('#7a4526'), rimTop = new THREE.Color('#9a6034'), inner = new THREE.Color('#4a2a16'), ridge = new THREE.Color('#5a331c'), ridgeLit = new THREE.Color('#8b5634');
    const quad = (arr, c, cs, a, b2, c2, d) => { arr.push(...a, ...b2, ...c2, ...a, ...c2, ...d); for (let k = 0; k < 6; k++) cs.push(c.r, c.g, c.b); };
    const o = 0.93, i = 0.85, h = 0.1, ring = [[-o, -o], [o, -o], [o, o], [-o, o]], inn = [[-i, -i], [i, -i], [i, i], [-i, i]];
    for (let k = 0; k < 4; k++) {
      const a = ring[k], b2 = ring[(k + 1) % 4], c = inn[(k + 1) % 4], d = inn[k];
      quad(near, rimTop, col, [a[0], h, a[1]], [d[0], h, d[1]], [c[0], h, c[1]], [b2[0], h, b2[1]]);
      quad(mid, rimTop, colMid, [a[0], 0.06, a[1]], [d[0], 0.06, d[1]], [c[0], 0.06, c[1]], [b2[0], 0.06, b2[1]]);
      quad(near, rim, col, [a[0], 0, a[1]], [a[0], h, a[1]], [b2[0], h, b2[1]], [b2[0], 0, b2[1]]);
      quad(near, inner, col, [d[0], h, d[1]], [d[0], 0, d[1]], [c[0], 0, c[1]], [c[0], h, c[1]]);
    }
    for (let k = 0; k < 5; k++) {
      const z = -0.64 + 0.32 * k, w = 0.15, y = 0.1;
      quad(near, ridgeLit, col, [-i, 0, z + w], [i, 0, z + w], [i, y, z], [-i, y, z]);
      quad(near, ridge, col, [-i, y, z], [i, y, z], [i, 0, z - w], [-i, 0, z - w]);
    }
    const geo = (pos, cs) => {
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(cs, 3)); g.computeVertexNormals(); g.computeBoundingBox(); g.computeBoundingSphere(); return g;
    };
    this.rimGeo = geo(near, col); this.rimMid = geo(mid, colMid);   // counter-clockwise: tops face up, walls face out (in, for the inner walls)
    this.world.cam?.onChange?.(() => this.rimLevels());
  }
  rimLevels() {
    const lod = this.world.cam.lod;
    for (const r of this.rims.values()) r.visible = lod === 0;
    if (this.rimAll) this.rimAll.visible = lod === 1;
  }
  /** Near rims per 16 × 16 cells (tight culling); the flat middle-level frames of every bed in one draw. */
  flushRims() {
    if (!this.rimGeo || !this.rimDirty.size) return;
    const scene = this.world.scene, m4 = new THREE.Matrix4(), mat = toon();
    const fill = (mesh, list) => { list.forEach((bd, i) => mesh.setMatrixAt(i, m4.makeTranslation((bd.x + 0.5) * CELL, 0.005, (bd.z + 0.5) * CELL))); mesh.count = list.length; mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere(); };
    const make = (geo, cap, tag) => { const m = new THREE.InstancedMesh(geo, mat, cap); m.userData.batch = tag; scene.add(m); return m; };
    for (const chunk of this.rimDirty) {
      const list = [...this.beds.values()].filter(bd => bd.chunk === chunk);
      let r = this.rims.get(chunk);
      if (r && r.instanceMatrix.count < list.length) { scene.remove(r); r.dispose(); this.rims.delete(chunk); r = null; }
      if (!r && list.length) { r = make(this.rimGeo, Math.min(RIM_CHUNK * RIM_CHUNK, Math.ceil(list.length * 1.3) + 16), `rims|${chunk}|near`); this.rims.set(chunk, r); }
      if (r) fill(r, list);
    }
    const all = [...this.beds.values()];
    if (this.rimAll && this.rimAll.instanceMatrix.count < all.length) { scene.remove(this.rimAll); this.rimAll.dispose(); this.rimAll = null; }
    if (!this.rimAll && all.length) this.rimAll = make(this.rimMid, Math.ceil(all.length * 1.3) + 64, 'rims|all|mid');
    if (this.rimAll) fill(this.rimAll, all);
    this.rimDirty.clear();
    this.rimLevels();
  }
  frame(dt) {
    if (!this.ready) return;
    this.flushRims();
    // fruit trees change their look when their harvest comes ready
    this.clock += dt;
    if (this.clock > 1) {
      this.clock = 0;
      for (const [id, p] of Object.entries(this.s.placed)) if (KIND_MODELS[`${p.kind}:bare`]) { const want = this.model(p.kind, id), item = this.world.batches.items.get(id); if (want && item?.model !== want) this.drawPlaced(id); }
    }
  }
  sync() {
    if (!this.ready || !this.s) return;
    const b = this.world.batches;
    for (const id of [...b.items.keys()]) if (OWN.test(id)) b.remove(id);
    for (const bd of this.beds.values()) this.rimDirty.add(bd.chunk);
    this.beds.clear(); this.dressed.clear(); this.pos.clear();
    for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) { const t = this.s.cells[z * N + x]; if (t === 1 || t === 2) this.drawCell(x, z); }
    for (const id of Object.keys(this.s.placed)) this.drawPlaced(id);
    for (const key of Object.keys(this.s.fences)) this.drawEdge(key);
    if (b.has('path_stones')) for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) if (cellType(this.s, x, z) === 'path') this.drawStones(x, z);
    this.drawRuins();
    this.pens = new Map(); this.refreshPens();
    this.world.ground.markAll();
  }
  apply(events) {
    if (!this.ready) return;
    for (const e of events) {
      if (e.type === 'cellChanged') this.drawCell(e.x, e.z);
      else if (e.type === 'placed' || e.type === 'moved' || e.type === 'stored') this.drawPlaced(e.id);
      else if (e.type === 'gardenFlower' || e.type === 'picked') this.drawPlaced(e.id);   // the streak garden plants from tick(); a picked tree goes bare
      else if (e.type === 'projectDone' || e.type === 'projectDelivered' || e.type === 'delivered') this.drawRuins();
      else if (e.type === 'fenceChanged') this.drawEdge(`${e.x},${e.z},${e.side}`);
      else if (e.type === 'homeUpgraded') this.drawPlaced(e.id);
      else if (e.type === 'parcelBought' || e.type === 'loaded') this.sync();
    }
    if (events.some(e => e.type === 'fenceChanged' || e.type === 'placed' || e.type === 'moved' || e.type === 'stored' || e.type === 'cellChanged')) this.refreshPens();
  }
}
