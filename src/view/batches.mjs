// Chunked instancing with three levels of detail (TECH-PLAN 6, measured in prototypes/big-farm):
//   close  → full models,        8 × 8 cell chunks  (tight culling where triangles matter)
//   middle → simplified models, 16 × 16 cell chunks
//   far    → coloured stand-ins, 32 × 32 cell chunks (few draws when everything is on screen)
// Static models (buildings, fences) keep full detail at every zoom, in 16 × 16 chunks.
// Items are set and removed by id; only the batches they touch are rebuilt, once per frame in flush().
import * as THREE from 'three';
import { toon } from '../kit/toon.mjs';
import { CELL } from '../content/world.mjs';

export const CHUNKS = { near: 8, mid: 16, far: 32, static: 16 };
const LEVELS = ['near', 'mid', 'far'];
const white = g => { g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(1), 3)); return g; };
export const STANDINS = {
  crop: white(new THREE.ConeGeometry(0.55, 0.8, 5).translate(0, 0.4, 0)),
  tree: white(new THREE.IcosahedronGeometry(1, 0).scale(1, 1.3, 1).translate(0, 1.3, 0)),
  animal: white(new THREE.BoxGeometry(0.8, 0.7, 1.1).translate(0, 0.35, 0)),
};
const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), v = new THREE.Vector3(), s3 = new THREE.Vector3();

export class Batches {
  constructor(scene) {
    Object.assign(this, { scene, models: new Map(), items: new Map(), members: new Map(), meshes: new Map(), dirty: new Set(), level: 0 });
    this.material = toon();
  }
  /** kind: 'crop' | 'tree' | 'animal' (three levels) or 'static' (always full). */
  register(name, { geo, mid = geo, kind = 'static', color = new THREE.Color(1, 1, 1) }) {
    const size = geo.boundingBox.getSize(new THREE.Vector3());
    this.models.set(name, { geo, mid, kind, color, standinScale: kind === 'tree' ? size.y / 2.6 : Math.max(size.x, size.z) / 1.1 });
  }
  has(name) { return this.models.has(name); }
  keysFor(item) {
    const m = this.models.get(item.model), cx = item.x / CELL, cz = item.z / CELL;
    const key = (level, size, what) => `${level}|${Math.floor(cx / size)},${Math.floor(cz / size)}|${what}`;
    if (m.kind === 'static') return [key('static', CHUNKS.static, item.model)];
    return [key('near', CHUNKS.near, item.model), key('mid', CHUNKS.mid, item.model), key('far', CHUNKS.far, m.kind)];
  }
  /** Place or move an item: { model, x, z (metres), rot, scale, y }. */
  set(id, item) {
    if (!this.models.has(item.model)) throw new Error(`unknown model ${item.model}`);
    this.remove(id);
    const keys = this.keysFor(item); this.items.set(id, { ...item, keys });
    for (const k of keys) { (this.members.get(k) ?? this.members.set(k, new Set()).get(k)).add(id); this.dirty.add(k); }
  }
  remove(id) {
    const old = this.items.get(id); if (!old) return;
    for (const k of old.keys) { this.members.get(k)?.delete(id); this.dirty.add(k); }
    this.items.delete(id);
  }
  clear() { for (const id of [...this.items.keys()]) this.remove(id); }
  setLevel(level) {
    if (level === this.level) return; this.level = level;
    for (const [k, mesh] of this.meshes) mesh.visible = this.visibleFor(k);
  }
  visibleFor(key) { const lvl = key.slice(0, key.indexOf('|')); return lvl === 'static' || lvl === LEVELS[this.level]; }
  /** Rebuild the batches that changed since the last call. Returns how many were rebuilt. */
  flush() {
    let n = 0;
    for (const key of this.dirty) { this.rebuild(key); n++; }
    this.dirty.clear();
    return n;
  }
  rebuild(key) {
    const ids = [...(this.members.get(key) ?? [])], [level, , what] = key.split('|'), old = this.meshes.get(key);
    if (!ids.length) { if (old) { this.scene.remove(old); old.dispose(); this.meshes.delete(key); } return; }
    const far = level === 'far', geo = far ? STANDINS[what] : level === 'mid' ? this.models.get(what).mid : this.models.get(what).geo;
    let mesh = old;
    if (!mesh || mesh.instanceMatrix.count < ids.length) {
      if (old) { this.scene.remove(old); old.dispose(); }
      mesh = new THREE.InstancedMesh(geo, this.material, Math.ceil(ids.length * 1.25) + 4);
      mesh.userData.batch = key; this.scene.add(mesh); this.meshes.set(key, mesh);
    }
    ids.forEach((id, i) => {
      const it = this.items.get(id), m = this.models.get(it.model), k = (it.scale ?? 1) * (far ? m.standinScale : 1);
      mesh.setMatrixAt(i, m4.compose(v.set(it.x, it.y ?? 0, it.z), q.setFromAxisAngle(up, it.rot ?? 0), s3.set(k, k, k)));
      if (far) mesh.setColorAt(i, m.color);
    });
    mesh.count = ids.length; mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere(); mesh.visible = this.visibleFor(key);
  }
  /** Draw statistics for tests. */
  stats() { let batches = 0, instances = 0; for (const m of this.meshes.values()) { batches++; instances += m.count; } return { batches, instances, items: this.items.size }; }
}
