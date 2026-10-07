// The build-mode ghost (DESIGN 4.2): the real model, tinted green where it fits and red where it does not, over its
// footprint cells; fences show on the chosen cell edge.
// Feel (juice package): the ghost follows the finger on a spring (it glides to each new cell with a little overshoot and
// leans into the move), breathes in a slow green pulse where it fits, and shakes once with a red flash where it does not.
import * as THREE from 'three';
import { CELL } from '../content/world.mjs';
import { BUILDINGS, footprint } from '../content/buildings.mjs';
import { modelFor } from './kinds.mjs';

const GREEN = new THREE.Color('#5fe07a'), RED = new THREE.Color('#ff5a5a'), WHITE = new THREE.Color(1, 1, 1);
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
    // spring state: where the model is drawn, where it wants to be, and its velocity
    this.at = new THREE.Vector3(); this.goal = new THREE.Vector3(); this.vel = new THREE.Vector3();
    this.tileAt = new THREE.Vector3(); this.tileGoal = new THREE.Vector3();
    this.ok = true; this.shake = 0; this.t = 0;
    world.onFrame?.(dt => this.frame(dt));
  }
  hide() { this.group.visible = false; }
  /** Show `kind` at cell (x, z) with rotation rot; ok colours it. For edges pass { side }. */
  show(kind, x, z, rot, ok, { side, id } = {}) {
    const def = BUILDINGS[kind], tint = ok ? GREEN : RED, m4 = new THREE.Matrix4(), wasHidden = !this.group.visible;
    if (this.ok && !ok) this.shake = 1;             // it just stopped fitting: shake once
    this.ok = ok;
    this.tileMat.color.copy(tint); this.modelMat.color.copy(tint).lerp(WHITE, 0.45);
    this.group.visible = true;
    if (def.edge) {
      this.setModel(kind);
      const pos = side === 'n' ? [x * CELL + CELL / 2, z * CELL] : [x * CELL, z * CELL + CELL / 2];
      this.place(pos[0], 0.02, pos[1], wasHidden); this.model.rotation.y = side === 'n' ? 0 : Math.PI / 2;
      this.tileGoal.set(0, 0, 0); this.tileAt.set(0, 0, 0); this.tiles.position.set(0, 0, 0);
      this.tiles.count = 0; return;
    }
    const [w, d] = footprint(kind, rot);
    this.tiles.count = Math.min(40, w * d); let i = 0;
    // tiles are laid out round the footprint's centre, so the group of tiles can glide with the model
    const cx = (x + w / 2) * CELL, cz = (z + d / 2) * CELL;
    for (let dz = 0; dz < d; dz++) for (let dx = 0; dx < w && i < 40; dx++) this.tiles.setMatrixAt(i++, m4.makeTranslation((x + dx + 0.5) * CELL - cx, 0.06, (z + dz + 0.5) * CELL - cz));
    this.tiles.instanceMatrix.needsUpdate = true;
    const hasModel = this.setModel(modelFor(kind, id ?? `p${this.world.batches.items.size}`));
    this.model.visible = hasModel;
    this.place(cx, 0.03, cz, wasHidden); this.model.rotation.y = rot * Math.PI / 2;
  }
  /** Set the spring's goal; the first show after hiding snaps there. */
  place(x, y, z, snap) {
    this.goal.set(x, y, z); this.tileGoal.set(x, 0, z);
    const reduced = document.body.classList.contains('reduced-motion');
    if (snap || reduced || !this.world.onFrame) { this.at.copy(this.goal); this.tileAt.copy(this.tileGoal); this.vel.set(0, 0, 0); this.shake = reduced ? 0 : this.shake; }
    this.apply();
  }
  frame(dt) {
    if (!this.group.visible) return;
    dt = Math.min(dt, 0.05); this.t += dt;
    // a stiff, slightly bouncy spring (ζ ≈ 0.55): quick to follow, with a small overshoot
    const k = 260, c = 2 * Math.sqrt(k) * 0.55;
    const ax = (this.goal.x - this.at.x) * k - this.vel.x * c, az = (this.goal.z - this.at.z) * k - this.vel.z * c;
    this.vel.x += ax * dt; this.vel.z += az * dt; this.at.x += this.vel.x * dt; this.at.z += this.vel.z * dt; this.at.y = this.goal.y;
    this.tileAt.x += (this.tileGoal.x - this.tileAt.x) * Math.min(1, dt * 22); this.tileAt.z += (this.tileGoal.z - this.tileAt.z) * Math.min(1, dt * 22);
    this.shake = Math.max(0, this.shake - dt * 3.2);
    this.apply();
  }
  apply() {
    const sh = this.shake > 0 ? Math.sin(this.t * 55) * 0.18 * this.shake : 0;
    this.model.position.set(this.at.x + sh, this.at.y + (this.ok ? 0.08 + Math.sin(this.t * 4) * 0.06 : 0.02), this.at.z);
    // lean into the move
    this.model.rotation.z = Math.max(-0.12, Math.min(0.12, -this.vel.x * 0.012)); this.model.rotation.x = Math.max(-0.12, Math.min(0.12, this.vel.z * 0.012));
    this.tiles.position.set(this.tileAt.x, 0, this.tileAt.z);
    // the fitting ghost breathes; a misfit flashes
    const pulse = this.ok ? 0.5 + 0.5 * Math.sin(this.t * 4) : this.shake;
    this.tileMat.opacity = this.ok ? 0.3 + 0.18 * pulse : 0.38 + 0.3 * pulse;
    this.modelMat.opacity = this.ok ? 0.58 + 0.12 * pulse : 0.5 + 0.2 * pulse;
  }
  setModel(name) {
    const m = this.world.batches.models.get(name);
    if (!m) return false;
    if (this.model.geometry !== m.geo) this.model.geometry = m.geo;
    return true;
  }
}
