// Fishing tackle follows reserved shore seats. Three shared draws, regardless of how many people fish.
// This view never awards fish or advances the catch clock; those rules belong to core/fishing.
import * as THREE from 'three';
import { CELL } from '../content/world.mjs';
import { POND_SHAPE } from './brook.mjs';

const MAX = 24, SEGMENTS = 8;
const up = new THREE.Vector3(0, 1, 0), a = new THREE.Vector3(), b = new THREE.Vector3();
const direction = new THREE.Vector3(), scale = new THREE.Vector3(), rotation = new THREE.Quaternion(), matrix = new THREE.Matrix4();

export class FishingView {
  constructor(world, game, people) {
    Object.assign(this, { world, game, people, time: 0, entries: [], casts: new Map() });
    const instance = (name, geometry, material) => {
      const mesh = new THREE.InstancedMesh(geometry, material, MAX);
      mesh.name = name; mesh.count = 0; mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); world.scene.add(mesh); return mesh;
    };
    this.rods = instance('fishing-rods', new THREE.CylinderGeometry(.026, .045, 1, 5), new THREE.MeshLambertMaterial({ color: '#8a5230' }));
    const float = new THREE.SphereGeometry(.17, 8, 6), colors = [], red = new THREE.Color('#e63946'), white = new THREE.Color('#fff4e2');
    for (let i = 0; i < float.attributes.position.count; i++) {
      const c = float.attributes.position.getY(i) > 0 ? red : white; colors.push(c.r, c.g, c.b);
    }
    float.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    this.floats = instance('fishing-floats', float, new THREE.MeshBasicMaterial({ vertexColors: true }));
    this.positions = new Float32Array(MAX * SEGMENTS * 6);
    const line = new THREE.BufferGeometry();
    line.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    line.setDrawRange(0, 0);
    this.lines = new THREE.LineSegments(line, new THREE.LineBasicMaterial({ color: '#fff4e2' }));
    this.lines.name = 'fishing-lines'; this.lines.frustumCulled = false; world.scene.add(this.lines);
    game.on((result, action) => {
      if (action === 'load') this.casts.clear();
      if (result.events?.some(e => e.type === 'lineCast')) this.casts.delete('you');
    });
    world.onFrame(dt => this.frame(dt));
  }
  get count() { return this.entries.length; }
  frame(dt) {
    this.time += dt;
    const quiet = document.body.classList.contains('reduced-motion'), line = this.game.s.fishing?.line;
    const next = [], active = new Set();
    for (const w of this.people.walkers.values()) {
      if (next.length === MAX) break;
      if (!w.fishSpot || w.indoors || w.goal || w.target || w.route.length || w.todo || w.clipFor !== 'Sit' || w.player && !line) continue;
      const pondId = w.fishPond?.[0] ?? null, pond = pondId && this.game.s.placed[pondId];
      if (pondId && pond?.kind !== 'pond') continue;
      const cx = pond ? (pond.x + 2) * CELL - .3 : POND_SHAPE.x, cz = pond ? (pond.z + 2) * CELL : POND_SHAPE.z;
      const dx = w.fishFace ? (w.fishFace[0] + .5) * CELL - w.x : cx - w.x;
      const dz = w.fishFace ? (w.fishFace[1] + .5) * CELL - w.z : cz - w.z;
      const distance = Math.hypot(dx, dz), ux = dx / distance, uz = dz / distance;
      if (!distance) continue;
      active.add(w.id);
      const key = `${pondId}:${w.fishSpot}`;
      let cast = this.casts.get(w.id);
      if (!cast || cast.key !== key) { cast = { key, at: this.time }; this.casts.set(w.id, cast); }
      const progress = quiet ? 1 : Math.min(1, (this.time - cast.at) / .8);
      const reach = Math.min(distance * .7, 4), water = pond ? .24 : .06;
      const ready = w.player && line.doneAt <= this.game.now;
      const bob = quiet ? 0 : Math.sin(this.time * (ready ? 5 : 2) + next.length) * (ready ? .07 : .025);
      const tip = { x: w.x + ux * 2.1, y: 2.1 + (1 - progress) * .65, z: w.z + uz * 2.1 };
      const point = {
        x: tip.x + (w.x + ux * reach - tip.x) * progress,
        y: tip.y + (water + .14 + bob - tip.y) * progress + Math.sin(progress * Math.PI) * .7,
        z: tip.z + (w.z + uz * reach - tip.z) * progress,
      };
      const index = next.length;
      a.set(w.x + ux * .35, .9, w.z + uz * .35); b.set(tip.x, tip.y, tip.z);
      direction.subVectors(b, a); const length = direction.length(); rotation.setFromUnitVectors(up, direction.normalize());
      matrix.compose(a.add(b).multiplyScalar(.5), rotation, scale.set(1, length, 1)); this.rods.setMatrixAt(index, matrix);
      matrix.makeScale(1, ready ? 1.3 : 1, 1).setPosition(point.x, point.y, point.z); this.floats.setMatrixAt(index, matrix);
      for (let s = 0; s < SEGMENTS; s++) for (let end = 0; end < 2; end++) {
        const f = (s + end) / SEGMENTS, offset = (index * SEGMENTS * 2 + s * 2 + end) * 3;
        this.positions[offset] = tip.x + (point.x - tip.x) * f;
        this.positions[offset + 1] = tip.y + (point.y - tip.y) * f - Math.sin(f * Math.PI) * .12;
        this.positions[offset + 2] = tip.z + (point.z - tip.z) * f;
      }
      next.push({ id: w.id, pond: pondId, ...point });
    }
    for (const id of this.casts.keys()) if (!active.has(id)) this.casts.delete(id);
    const rods = next.length;
    // The line remains safe while the player is away or walking back after a reload. Its float stays tappable.
    if (line && !active.has('you') && next.length < MAX) {
      const placed = line.pond && this.game.s.placed[line.pond], pond = placed?.kind === 'pond' ? placed : null;
      const point = { id: 'you', pond: pond ? line.pond : null, x: pond ? (pond.x + 2) * CELL + 1.2 : POND_SHAPE.x + 3, y: (pond ? .24 : .06) + .14, z: pond ? (pond.z + 2) * CELL : POND_SHAPE.z };
      matrix.makeTranslation(point.x, point.y, point.z); this.floats.setMatrixAt(next.length, matrix); next.push(point);
    }
    this.entries = next; this.rods.count = rods; this.floats.count = next.length;
    this.rods.instanceMatrix.needsUpdate = this.floats.instanceMatrix.needsUpdate = true;
    this.lines.geometry.setDrawRange(0, rods * SEGMENTS * 2);
    this.lines.geometry.attributes.position.needsUpdate = true;
    this.lines.visible = this.rods.visible = rods > 0; this.floats.visible = next.length > 0;
  }
  /** A generous phone tap target around each visible float. Selecting one only opens the controls. */
  pick(x, y) {
    let best = null, closest = 24;
    for (const point of this.entries) {
      a.set(point.x, point.y, point.z).project(this.world.cam.camera);
      if (a.z < -1 || a.z > 1) continue;
      const distance = Math.hypot((a.x + 1) * innerWidth / 2 - x, (1 - a.y) * innerHeight / 2 - y);
      if (distance < closest) { closest = distance; best = { pond: point.pond }; }
    }
    return best;
  }
}
