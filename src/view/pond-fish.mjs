// Fish swimming in the ponds (v0.3e): Willowmere's fish models (its fish.glb, from Zoo Garden) swimming upright just under
// the surface, nose first along their path, the tail swinging on its hinge. Two instanced draws per kind (body and tail).
import * as THREE from 'three';
import { CELL } from '../content/world.mjs';
import { POND_SHAPE } from './brook.mjs';
import { loadKitLater, bake } from './models.mjs';
import { toon } from '../kit/toon.mjs';

const KINDS = [['perch', 3, 1.0], ['carp', 2, 1.15], ['catfish', 1, 1.2], ['golden', 1, 0.85]];   // [model, how many per pond, length m]
const MAX = 6;
const m4 = new THREE.Matrix4(), t4 = new THREE.Matrix4(), q = new THREE.Quaternion(), qt = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);

export class PondFish {
  constructor(world, game) {
    Object.assign(this, { world, game, time: 0, acc: 9, kinds: [], list: [] });
    loadKitLater('fish', 1500).then(kit => this.build(kit)).catch(() => {});
    world.onFrame?.(dt => this.frame(dt));
  }
  build(kit) {
    // seen through the water: drawn after it, a little see-through and tinted by it (the water itself is opaque)
    const mat = toon({ vertexColors: true, color: '#cfeeff', transparent: true, opacity: 0.85 }); mat.depthTest = false; mat.depthWrite = false;
    for (const [id, n, len] of KINDS) {
      const root = kit[`fish_${id}`]; if (!root) continue;
      const body = root.getObjectByName(`fish_${id}_body`), tail = root.getObjectByName(`fish_${id}_tail`); if (!body) continue;
      const bg = bake(body, { center: false, ao: 0 }); bg.applyMatrix4(body.matrix);
      const tg = tail ? bake(tail, { center: false, ao: 0 }) : null, hinge = tail ? tail.position.clone() : new THREE.Vector3();
      bg.computeBoundingBox(); const b = bg.boundingBox, z0 = Math.min(b.min.z, tg ? hinge.z + (tg.computeBoundingBox(), tg.boundingBox.min.z) : b.min.z);
      const scale = len / Math.max(0.01, b.max.z - z0), top = b.max.y * scale;
      const make = g => { const m = new THREE.InstancedMesh(g, mat, n * MAX); m.count = 0; m.renderOrder = 4; m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.world.scene.add(m); return m; };
      this.kinds.push({ id, n, scale, top, hinge, body: make(bg), tail: tg ? make(tg) : null });
    }
    if (this.kinds[0]) this.kinds[0].body.name = 'pond-fish';
  }
  /** The ponds: the village pond, then every built pond (water level y). */
  ponds() {
    const out = [{ x: POND_SHAPE.x, z: POND_SHAPE.z, rx: POND_SHAPE.rx - 1.4, rz: POND_SHAPE.rz - 1.4, y: 0.06 }];
    for (const p of Object.values(this.game.s.placed)) if (p.kind === 'pond' && out.length < MAX) out.push({ x: (p.x + 2) * CELL - 0.3, z: (p.z + 2) * CELL, rx: 2.0, rz: 2.0, y: 0.24 });
    return out;
  }
  get count() { return this.kinds.reduce((a, k) => a + k.body.count, 0); }
  frame(dt) {
    if (!this.kinds.length) return;
    this.time += document.body.classList.contains('reduced-motion') ? dt * 0.2 : dt;
    if ((this.acc += dt) > 2) { this.acc = 0; this.list = this.ponds(); }
    const t = this.time;
    this.kinds.forEach((k, ki) => {
      let i = 0;
      for (const [pi, p] of this.list.entries()) for (let j = 0; j < k.n; j++, i++) {
        // each fish loops its own lazy figure round the pond, nose first, with a little dip and turn now and then
        const seed = pi * 7.1 + ki * 2.3 + j * 1.7, dir = j % 2 ? 1 : -1, speed = (0.16 + (j % 3) * 0.04 + ki * 0.015) * dir, a = t * speed + seed;
        const r = 0.45 + 0.45 * ((j * 37 + ki * 11) % 10) / 10, x = p.x + Math.cos(a) * p.rx * r, z = p.z + Math.sin(a * 1.3) * p.rz * r;
        const dx = -Math.sin(a) * p.rx * r * speed, dz = Math.cos(a * 1.3) * 1.3 * p.rz * r * speed;
        const swish = Math.sin(t * 7 + seed * 3);
        q.setFromAxisAngle(up, Math.atan2(dx, dz) + swish * 0.06);   // the models face +z
        const y = p.y - k.top - 0.05 + 0.03 * Math.sin(t * 1.3 + seed);   // just under the surface
        m4.compose(v.set(x, y, z), q, sc.setScalar(k.scale)); k.body.setMatrixAt(i, m4);
        if (k.tail) { qt.setFromAxisAngle(up, swish * 0.5); t4.compose(k.hinge, qt, sc.setScalar(1)); k.tail.setMatrixAt(i, m4.clone().multiply(t4)); }
      }
      k.body.count = i; k.body.instanceMatrix.needsUpdate = true;
      if (k.tail) { k.tail.count = i; k.tail.instanceMatrix.needsUpdate = true; }
    });
  }
}
