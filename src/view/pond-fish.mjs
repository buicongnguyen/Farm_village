// Fish swimming in the ponds (v0.3e): the fish pictures (Willowmere's fish icons, the same ones the barn shows) drawn as
// flat cut-outs just under the water, gliding round each pond. One instanced draw per kind of fish.
import * as THREE from 'three';
import { CELL } from '../content/world.mjs';
import { POND_SHAPE } from './brook.mjs';

const KINDS = [['perch', 3], ['carp', 2], ['catfish', 1], ['goldfish', 1]];   // how many of each swim in a pond
const SIZE = 1.15, MAX = 6;   // metres across; ponds drawn at most
const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);

export class PondFish {
  constructor(world, game) {
    Object.assign(this, { world, game, time: 0, acc: 9 });
    const geo = new THREE.PlaneGeometry(SIZE, SIZE).rotateX(-Math.PI / 2), loader = new THREE.TextureLoader();
    this.meshes = KINDS.map(([id, n]) => {
      const map = loader.load(`./assets/icons/${id}.webp`); map.colorSpace = THREE.SRGBColorSpace;
      const mat = new THREE.MeshBasicMaterial({ map, transparent: true, opacity: 0.92, depthWrite: false, alphaTest: 0.05 });
      const mesh = new THREE.InstancedMesh(geo, mat, n * MAX); mesh.count = 0; mesh.frustumCulled = false; mesh.renderOrder = 3; mesh.name = `pond-fish-${id}`;
      world.scene.add(mesh); return { mesh, n };
    });
    world.onFrame?.(dt => this.frame(dt));
  }
  /** The ponds: the village pond, then every built pond. */
  ponds() {
    const out = [{ x: POND_SHAPE.x, z: POND_SHAPE.z, rx: POND_SHAPE.rx - 1.3, rz: POND_SHAPE.rz - 1.3, y: 0.08 }];
    for (const p of Object.values(this.game.s.placed)) if (p.kind === 'pond' && out.length < MAX) out.push({ x: (p.x + 2) * CELL - 0.3, z: (p.z + 2) * CELL, rx: 2.1, rz: 2.1, y: 0.27 });
    return out;
  }
  frame(dt) {
    this.time += document.body.classList.contains('reduced-motion') ? dt * 0.2 : dt;
    if ((this.acc += dt) > 2) { this.acc = 0; this.list = this.ponds(); }
    const t = this.time;
    this.meshes.forEach(({ mesh, n }, k) => {
      let i = 0;
      for (const [pi, p] of this.list.entries()) for (let j = 0; j < n; j++, i++) {
        const seed = pi * 7.1 + k * 2.3 + j * 1.7, speed = 0.18 + (j % 3) * 0.05 + k * 0.02, a = t * speed + seed;
        const r = 0.45 + 0.4 * ((j * 37 + k * 11) % 10) / 10, x = p.x + Math.cos(a) * p.rx * r, z = p.z + Math.sin(a * 1.2) * p.rz * r;
        const dx = -Math.sin(a) * p.rx * r, dz = Math.cos(a * 1.2) * 1.2 * p.rz * r;
        q.setFromAxisAngle(up, Math.atan2(dx, dz) - Math.PI / 2);   // the pictures face left: turn them to swim forward
        const wiggle = 1 + 0.06 * Math.sin(t * 6 + seed * 3);
        m4.compose(v.set(x, p.y, z), q, sc.set(wiggle, 1, 1)); mesh.setMatrixAt(i, m4);
      }
      mesh.count = i; mesh.instanceMatrix.needsUpdate = true;
    });
  }
}
