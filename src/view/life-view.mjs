// Things that change over time: crops growing in four stages, animals wandering inside their fence, produce waiting on
// the ground, and a sparkle over buildings with something ready (DESIGN 5–7). Updated twice a second for timers and
// every frame for animal movement; only what changed is sent to the batches.
import * as THREE from 'three';
import { CELL } from '../content/world.mjs';
import { CROPS, ANIMALS } from '../content/goods.mjs';
import { BUILDINGS, footprint } from '../content/buildings.mjs';
import { penOf, cellsOf } from '../core/grid.mjs';
import { toon } from '../kit/toon.mjs';
import { STANDINS } from './batches.mjs';

/** A crop's look for its progress: [model, scale]. */
export function cropStage(crop, progress) {
  if (progress < 0.25) return ['crop:sprout', 0.7];
  if (progress < 0.6) return [`crop:${crop}`, 0.55];
  if (progress < 1) return [`crop:${crop}`, 0.8];
  return [`crop:${crop}`, 1];
}
export class LifeView {
  constructor(world, game) {
    Object.assign(this, { world, game, shown: new Map(), herds: new Map(), clock: 0, pens: new Map() });
    // the sparkle: a small golden star shape above ready buildings
    const g = new THREE.OctahedronGeometry(0.35, 0).scale(1, 1.4, 1).translate(0, 0, 0);
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3).map((_, i) => [1, 0.85, 0.25][i % 3]), 3));
    g.computeBoundingBox();
    world.batches.register('sparkle', { geo: g, kind: 'static' });
    world.onFrame((dt, now) => this.frame(dt, now));
  }
  get s() { return this.game.s; }
  frame(dt, now) {
    this.clock += dt;
    if (this.clock > 0.5) { this.clock = 0; this.update(); }
    this.moveAnimals(dt, now);
  }
  /** Timers: crop stages, produce on the ground, sparkles. */
  update() {
    const s = this.s, t = this.game.now, b = this.world.batches, seen = new Set();
    for (const [id, p] of Object.entries(s.placed)) {
      if (p.kind === 'bed') {
        const bed = s.beds[id], key = `crop:${id}`; seen.add(key);
        if (!bed) { if (this.shown.has(key)) { b.remove(key); this.shown.delete(key); } continue; }
        const progress = Math.min(1, 1 - (bed.doneAt - t) / CROPS[bed.crop].growMs), [model, scale] = cropStage(bed.crop, progress), look = `${model}|${scale}`;
        if (this.shown.get(key) !== look) {
          b.set(key, { model, x: (p.x + 0.5) * CELL, z: (p.z + 0.5) * CELL, rot: ((p.x * 7 + p.z * 13) % 12) * 0.52, scale });
          this.shown.set(key, look);
        }
        continue;
      }
      const def = BUILDINGS[p.kind];
      if (def.produces || def.animals) {
        const ready = def.produces ? (s.production[id]?.queue ?? []).some(j => j.doneAt <= t) : (s.animals[id] ?? []).some(a => a.doneAt != null && a.doneAt <= t);
        const key = `spark:${id}`; seen.add(key);
        if (ready && !this.shown.has(key)) { const [w, d] = footprint(p.kind, p.rot); b.set(key, { model: 'sparkle', x: (p.x + w / 2) * CELL, z: (p.z + d / 2) * CELL, y: def.animals ? 3.2 : 4.6 }); this.shown.set(key, 1); }
        if (!ready && this.shown.has(key)) { b.remove(key); this.shown.delete(key); }
      }
    }
    for (const key of [...this.shown.keys()]) if (!seen.has(key)) { b.remove(key); this.shown.delete(key); }
    this.syncHerds();
  }
  /** Each animal home's herd: one moving instance per animal, inside the fenced area. */
  syncHerds() {
    const s = this.s, t = this.game.now, want = new Map();
    for (const [home, list] of Object.entries(s.animals)) for (const [i, a] of list.entries()) want.set(`${home}:${i}`, { home, kind: a.kind, ready: a.doneAt != null && a.doneAt <= t });
    for (const key of [...this.herds.keys()]) if (!want.has(key)) this.herds.delete(key);
    for (const [key, w] of want) {
      let a = this.herds.get(key);
      if (!a) {
        const area = this.penArea(w.home); const c = area[Math.floor(Math.random() * area.length)] ?? [0, 0];
        a = { ...w, x: (c[0] + 0.5) * CELL, z: (c[1] + 0.5) * CELL, rot: Math.random() * 6.28, phase: Math.random() * 6.28, turnAt: 0 };
        this.herds.set(key, a);
      }
      a.ready = w.ready;
    }
    this.ensureHerdMeshes();
  }
  /** Cells the animals of a home may walk on: the fenced area, or the home's own footprint if the fence is open. */
  penArea(home) {
    const s = this.s, p = s.placed[home]; if (!p) return [];
    const key = `${home}|${Object.keys(s.fences).length}|${p.x},${p.z},${p.rot}`;
    if (this.pens.get(home)?.key === key) return this.pens.get(home).cells;
    const pen = penOf(s, home), cells = pen.closed ? this.flood(home) : cellsOf(p.kind, p.x, p.z, p.rot);
    const free = cells.filter(([x, z]) => !cellsOf(p.kind, p.x, p.z, p.rot).some(c => c[0] === x && c[1] === z));
    const out = free.length ? free : cells; this.pens.set(home, { key, cells: out }); return out;
  }
  flood(home) {
    // the same walk as penOf, collecting cells (a closed pen is small)
    const s = this.s, p = s.placed[home], start = cellsOf(p.kind, p.x, p.z, p.rot), seen = new Set(start.map(c => c.join(','))), stack = [...start];
    const fenced = (x, z, nx, nz) => nz === z - 1 ? s.fences[`${x},${z},n`] : nz === z + 1 ? s.fences[`${x},${nz},n`] : nx === x - 1 ? s.fences[`${x},${z},w`] : s.fences[`${nx},${z},w`];
    while (stack.length && seen.size < 900) {
      const [x, z] = stack.pop();
      for (const [nx, nz] of [[x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1]]) { const k = `${nx},${nz}`; if (seen.has(k) || fenced(x, z, nx, nz)) continue; seen.add(k); stack.push([nx, nz]); }
    }
    return [...seen].map(k => k.split(',').map(Number));
  }
  ensureHerdMeshes() {
    const counts = {}; for (const a of this.herds.values()) counts[a.kind] = (counts[a.kind] ?? 0) + 1;
    this.meshes ??= {};
    for (const kind of Object.keys(ANIMALS)) {
      const need = counts[kind] ?? 0, m = this.meshes[kind];
      if (m && m.near.instanceMatrix.count >= need) continue;
      if (m) for (const mesh of Object.values(m)) { this.world.scene.remove(mesh); mesh.dispose(); }
      const model = this.world.batches.models.get(kind); if (!model) continue;
      const cap = Math.max(8, need + 4), mat = toon();
      const near = new THREE.InstancedMesh(model.geo, mat, cap), mid = new THREE.InstancedMesh(model.mid, mat, cap), far = new THREE.InstancedMesh(STANDINS.animal, mat, cap);
      for (let i = 0; i < cap; i++) far.setColorAt(i, model.color);
      for (const mesh of [near, mid, far]) { mesh.count = 0; mesh.frustumCulled = false; this.world.scene.add(mesh); }
      const produce = this.world.batches.models.get(`produce:${ANIMALS[kind].gives}`);
      const ground = produce ? new THREE.InstancedMesh(produce.geo, mat, cap) : null;
      if (ground) { ground.count = 0; ground.frustumCulled = false; this.world.scene.add(ground); }
      this.meshes[kind] = { near, mid, far, ...(ground ? { ground } : {}) };
    }
  }
  moveAnimals(dt, now) {
    if (!this.meshes) return;
    const lod = this.world.cam.lod, m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), v = new THREE.Vector3(), sc = new THREE.Vector3();
    const idx = {}, readyIdx = {};
    for (const a of this.herds.values()) {
      const set = this.meshes[a.kind]; if (!set) continue;
      const area = this.penArea(a.home);
      if (now > a.turnAt) { a.rot += (Math.random() - 0.5) * 2.4; a.turnAt = now + 1500 + Math.random() * 3000; }
      const speed = a.kind === 'cow' ? 0.35 : 0.9, nx = a.x + Math.sin(a.rot) * speed * dt, nz = a.z + Math.cos(a.rot) * speed * dt;
      const cx = Math.floor(nx / CELL), cz = Math.floor(nz / CELL);
      if (area.some(c => c[0] === cx && c[1] === cz)) { a.x = nx; a.z = nz; } else a.rot += Math.PI * (0.6 + Math.random() * 0.4);
      const hop = a.kind === 'hen' ? Math.abs(Math.sin(now * 0.008 + a.phase)) * 0.1 : 0, k = lod === 2 ? (a.kind === 'cow' ? 1.6 : 0.8) : 1;
      const mesh = lod === 0 ? set.near : lod === 1 ? set.mid : set.far, i = (idx[a.kind] = (idx[a.kind] ?? -1) + 1);
      mesh.setMatrixAt(i, m4.compose(v.set(a.x, hop, a.z), q.setFromAxisAngle(up, a.rot), sc.set(k, k, k)));
      if (a.ready && set.ground && lod < 2) { const j = (readyIdx[a.kind] = (readyIdx[a.kind] ?? -1) + 1); set.ground.setMatrixAt(j, m4.compose(v.set(a.x + 0.5, 0, a.z + 0.3), q.identity(), sc.set(1, 1, 1))); }
    }
    for (const [kind, set] of Object.entries(this.meshes)) {
      const n = (idx[kind] ?? -1) + 1;
      for (const [level, mesh] of [[0, set.near], [1, set.mid], [2, set.far]]) { mesh.count = lod === level ? n : 0; mesh.instanceMatrix.needsUpdate = true; }
      if (set.ground) { set.ground.count = lod < 2 ? (readyIdx[kind] ?? -1) + 1 : 0; set.ground.instanceMatrix.needsUpdate = true; }
    }
  }
}
