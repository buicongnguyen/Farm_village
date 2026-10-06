// The build-mode ghost (DESIGN 4.2): the real model, tinted green where it fits and red where it does not, over its
// footprint cells; fences show on the chosen cell edge.
import * as THREE from 'three';
import { CELL } from '../content/world.mjs';
import { BUILDINGS, footprint } from '../content/buildings.mjs';
import { modelFor } from './kinds.mjs';

const GREEN = new THREE.Color('#5fe07a'), RED = new THREE.Color('#ff5a5a');
export class Ghost {
  constructor(world) {
    this.world = world;
    this.group = new THREE.Group(); this.group.visible = false; this.group.renderOrder = 10;
    this.modelMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.6, depthWrite: false });
    this.tileMat = new THREE.MeshBasicMaterial({ color: GREEN, transparent: true, opacity: 0.35, depthWrite: false });
    this.tileGeo = new THREE.PlaneGeometry(CELL * 0.94, CELL * 0.94).rotateX(-Math.PI / 2);
    this.model = new THREE.Mesh(new THREE.BufferGeometry(), this.modelMat);
    this.tiles = new THREE.InstancedMesh(this.tileGeo, this.tileMat, 40); this.tiles.frustumCulled = false;
    this.group.add(this.model, this.tiles);
    world.scene.add(this.group);
  }
  hide() { this.group.visible = false; }
  /** Show `kind` at cell (x, z) with rotation rot; ok colours it. For edges pass { side }. */
  show(kind, x, z, rot, ok, { side, id } = {}) {
    const def = BUILDINGS[kind], tint = ok ? GREEN : RED, m4 = new THREE.Matrix4();
    this.tileMat.color.copy(tint); this.modelMat.color.copy(tint).lerp(new THREE.Color(1, 1, 1), 0.45);
    this.group.visible = true;
    if (def.edge) {
      this.setModel(kind);
      const pos = side === 'n' ? [x * CELL + CELL / 2, z * CELL] : [x * CELL, z * CELL + CELL / 2];
      this.model.position.set(pos[0], 0.02, pos[1]); this.model.rotation.y = side === 'n' ? 0 : Math.PI / 2;
      this.tiles.count = 0; return;
    }
    const [w, d] = footprint(kind, rot);
    this.tiles.count = Math.min(40, w * d); let i = 0;
    for (let dz = 0; dz < d; dz++) for (let dx = 0; dx < w && i < 40; dx++) this.tiles.setMatrixAt(i++, m4.makeTranslation((x + dx + 0.5) * CELL, 0.06, (z + dz + 0.5) * CELL));
    this.tiles.instanceMatrix.needsUpdate = true;
    const hasModel = this.setModel(modelFor(kind, id ?? `p${this.world.batches.items.size}`));
    this.model.visible = hasModel;
    this.model.position.set((x + w / 2) * CELL, 0.03, (z + d / 2) * CELL); this.model.rotation.y = rot * Math.PI / 2;
  }
  setModel(name) {
    const m = this.world.batches.models.get(name);
    if (!m) return false;
    if (this.model.geometry !== m.geo) this.model.geometry = m.geo;
    return true;
  }
}
