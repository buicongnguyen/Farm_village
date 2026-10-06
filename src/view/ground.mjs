// The ground: one mesh per 32 × 32 cell chunk, one flat-coloured quad per cell (TECH-PLAN 6, rule 5).
// cellLook(x, z) → { color, y } is asked per cell; markDirty(x, z) rebuilds only that chunk on the next flush().
import * as THREE from 'three';
import { toon } from '../kit/toon.mjs';
import { N, CELL } from '../content/world.mjs';

export const GROUND_CHUNK = 32;
export class Ground {
  constructor(scene, cellLook) {
    Object.assign(this, { scene, cellLook, meshes: new Map(), dirty: new Set() });
    for (let cz = 0; cz < N; cz += GROUND_CHUNK) for (let cx = 0; cx < N; cx += GROUND_CHUNK) this.dirty.add(`${cx},${cz}`);
  }
  markDirty(x, z) { this.dirty.add(`${Math.floor(x / GROUND_CHUNK) * GROUND_CHUNK},${Math.floor(z / GROUND_CHUNK) * GROUND_CHUNK}`); }
  markAll() { for (const k of this.meshes.keys()) this.dirty.add(k); }
  flush() { for (const k of this.dirty) this.build(k); const n = this.dirty.size; this.dirty.clear(); return n; }
  build(key) {
    const [cx, cz] = key.split(',').map(Number), pos = new Float32Array(GROUND_CHUNK * GROUND_CHUNK * 18), col = new Float32Array(pos.length);
    const c = new THREE.Color(); let i = 0;
    for (let z = cz; z < cz + GROUND_CHUNK; z++) for (let x = cx; x < cx + GROUND_CHUNK; x++) {
      const look = this.cellLook(x, z); c.set(look.color);
      // a gentle per-cell variation so large areas don't look flat (seeded by position, so it never flickers)
      const jitter = (((x * 73856093) ^ (z * 19349663)) & 255) / 255 - 0.5; c.offsetHSL(0, 0, jitter * (look.jitter ?? 0.035));
      const x0 = x * CELL, z0 = z * CELL, x1 = x0 + CELL, z1 = z0 + CELL, y = look.y ?? 0;
      pos.set([x0, y, z0, x0, y, z1, x1, y, z1, x0, y, z0, x1, y, z1, x1, y, z0], i);
      for (let k = 0; k < 6; k++) col.set([c.r, c.g, c.b], i + k * 3);
      i += 18;
    }
    let mesh = this.meshes.get(key);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals(); g.computeBoundingSphere();
    if (mesh) { mesh.geometry.dispose(); mesh.geometry = g; }
    else { mesh = new THREE.Mesh(g, toon()); mesh.userData.ground = key; this.scene.add(mesh); this.meshes.set(key, mesh); }
  }
  /** The cell under a ray from the camera, or null. */
  pick(raycaster) {
    const hit = new THREE.Vector3();
    if (!raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit)) return null;
    const x = Math.floor(hit.x / CELL), z = Math.floor(hit.z / CELL);
    return x >= 0 && z >= 0 && x < N && z < N ? { x, z, point: hit } : null;
  }
}
