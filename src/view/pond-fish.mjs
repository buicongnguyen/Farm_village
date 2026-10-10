// Fish swimming in the ponds (v0.3e): Willowmere's fish models (its fish.glb, from Zoo Garden) swimming upright just under
// the surface, nose first along their path, the tail swinging on its hinge. Two instanced draws per kind (body and tail).
// The fish that takes your bait is one of these (after Zoo Garden's fishing view): the very fish the line will land leaves
// its round, swims up to the float, darts at it on each nibble, grabs it on the bite and is dragged about in the fight.
// Landed, it is gone from the water for a while; then a new one swims in.
import * as THREE from 'three';
import { CELL } from '../content/world.mjs';
import { POND_SHAPE } from './brook.mjs';
import { loadKitLater, bake } from './models.mjs';
import { toon } from '../kit/toon.mjs';
import { pick } from '../core/fishing.mjs';
import { FISH_TABLE } from '../content/goods.mjs';

// How many of each swim in the village pond and in a pond you built (the big ones need the big water); models and sizes come from FISH_TABLE.
// The third entry is its colour from far off: zoomed out, every fish is one plain shape in one shared draw.
const STOCK = { perch: [4, 2, '#7fb23a'], carp: [3, 1, '#c8702a'], clownfish: [3, 2, '#f47a1c'], rainbowfish: [3, 1, '#e84f7d'], catfish: [2, 0, '#8c6a48'], koi: [3, 1, '#f4ede4'], eel: [1, 0, '#2e8b57'],
  pike: [1, 0, '#4a90d9'], goldfish: [1, 1, '#f7c21c'], sunfish: [1, 0, '#b9c4d6'], pond_giant: [1, 0, '#7fe3f0'] };
const KINDS = FISH_TABLE.map(f => [f.model, ...(STOCK[f.id] ?? [1, 0, '#cccccc']), f.len]);   // [model, in the village pond, in a built pond, far colour, length m]
const MAX = 6, BACK_S = 12;
const m4 = new THREE.Matrix4(), t4 = new THREE.Matrix4(), q = new THREE.Quaternion(), qt = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), eu = new THREE.Euler();
const turn = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k, ease = k => k * k * (3 - 2 * k);

export class PondFish {
  constructor(world, game) {
    Object.assign(this, { world, game, time: 0, acc: 9, kinds: [], list: [], visitor: null, gone: [] });
    world.pondFish = this;
    loadKitLater('fish', 1500).then(kit => this.build(kit)).catch(() => {});
    world.onFrame?.(dt => this.frame(dt));
  }
  build(kit) {
    // seen through the water: drawn after it, a little see-through and tinted by it (the water itself is opaque)
    const mat = toon({ vertexColors: true, color: '#cfeeff', transparent: true, opacity: 0.85 }); mat.depthTest = false; mat.depthWrite = false;
    let total = 0;
    for (const [id, big, small, tint, len] of KINDS) {
      const root = kit[`fish_${id}`]; if (!root) continue;
      const body = root.getObjectByName(`fish_${id}_body`), tail = root.getObjectByName(`fish_${id}_tail`); if (!body) continue;
      const bg = bake(body, { center: false, ao: 0 }); bg.applyMatrix4(body.matrix);
      const tg = tail ? bake(tail, { center: false, ao: 0 }) : null, hinge = tail ? tail.position.clone() : new THREE.Vector3();
      bg.computeBoundingBox(); const b = bg.boundingBox, z0 = Math.min(b.min.z, tg ? hinge.z + (tg.computeBoundingBox(), tg.boundingBox.min.z) : b.min.z);
      const scale = len / Math.max(0.01, b.max.z - z0), top = b.max.y * scale;
      const make = g => { const m = new THREE.InstancedMesh(g, mat, Math.max(1, big + small * (MAX - 1))); m.count = 0; m.renderOrder = 4; m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.world.scene.add(m); return m; };
      this.kinds.push({ id, big, small, tint: new THREE.Color(tint), nose: b.max.z * scale, scale, top, hinge, body: make(bg), tail: tg ? make(tg) : null });
      total += Math.max(1, big + small * (MAX - 1));
      if (!this.far) this.far = bg.clone();   // the first fish's body is everyone's far shape
    }
    if (this.kinds[0]) this.kinds[0].body.name = 'pond-fish';
    if (this.far) {
      this.far.deleteAttribute('color'); const plain = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.8, depthTest: false, depthWrite: false });
      this.far = new THREE.InstancedMesh(this.far, plain, total); this.far.count = 0; this.far.renderOrder = 4; this.far.frustumCulled = false; this.far.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.world.scene.add(this.far);
    }
  }
  /** The ponds: the village pond, then every built pond (water level y). */
  ponds() {
    const out = [{ id: null, x: POND_SHAPE.x, z: POND_SHAPE.z, rx: POND_SHAPE.rx - 1.4, rz: POND_SHAPE.rz - 1.4, y: 0.06 }];
    for (const [id, p] of Object.entries(this.game.s.placed)) if (p.kind === 'pond' && out.length < MAX) out.push({ id, x: (p.x + 2) * CELL - 0.3, z: (p.z + 2) * CELL, rx: 2.0, rz: 2.0, y: 0.24 });
    return out;
  }
  get count() { return this.far?.visible ? this.far.count : this.kinds.reduce((a, k) => a + k.body.count, 0); }
  /** The fish on your line was landed: it leaves the water (fishing-view.mjs leaps the catch from the float). */
  caught() {
    const b = this.visitor; if (!b) return;
    this.gone.push({ kind: b.kind, pond: b.pond, j: b.j, until: this.time + BACK_S }); this.visitor = null;
  }
  /** Which swimming fish answers the line: one of the kind the line will land, in the pond the float is in. */
  answer() {
    const view = this.world.fishingView, st = view?.play?.state, f = view?.playerFloat, line = this.game.s.fishing?.line;
    if (!f || !line || !st || !['approach', 'nibble', 'bite', 'fight'].includes(st.phase)) return null;
    const fish = pick(line.seed, line.bait), kind = FISH_TABLE.find(f => f.id === fish)?.model ?? fish, pond = Math.max(0, this.list.findIndex(p => p.id === (line.pond ?? null)));
    const b = this.visitor;
    if (!b || b.kind !== kind || b.pond !== pond) {
      const k = this.kinds.find(k => k.id === kind); if (!k) return null;
      const n = pond ? k.small : k.big, taken = j => this.gone.some(g => g.kind === kind && g.pond === pond && g.j === j);
      let j = 0; while (j < n && taken(j)) j++;
      if (j >= n) { j = 0; this.gone = this.gone.filter(g => !(g.kind === kind && g.pond === pond && g.j === 0)); }   // the only one of its kind: it is back already
      this.visitor = { kind, pond, j, w: 0, x: 0, z: 0, heading: 0, live: false };
    }
    return { st, f };
  }
  frame(dt) {
    if (!this.kinds.length) return;
    const quiet = document.body.classList.contains('reduced-motion');
    this.time += quiet ? dt * 0.2 : dt;
    if ((this.acc += dt) > 2) { this.acc = 0; this.list = this.ponds(); }
    const t = this.time, on = this.answer(), b = this.visitor, far = this.far && this.world.cam.lod > 0;   // zoomed out: one draw for every fish
    let all = 0;
    if (b) { b.w = on ? 1 : Math.max(0, b.w - dt / 1.6); if (!on && b.w <= 0) this.visitor = null; }
    this.gone = this.gone.filter(g => g.until + 1.2 > t);
    this.kinds.forEach((k, ki) => {
      let i = 0;
      for (const [pi, p] of this.list.entries()) for (let j = 0, n = pi ? k.small : k.big; j < n; j++, i++) {
        // each fish loops its own lazy figure round the pond, nose first, with a little dip and turn now and then
        const seed = pi * 7.1 + ki * 2.3 + j * 1.7, dir = j % 2 ? 1 : -1, speed = (0.16 + (j % 3) * 0.04 + ki * 0.015) * dir, a = t * speed + seed;
        const r = 0.3 + 0.62 * ((j * 37 + ki * 11) % 10) / 10;
        let x = p.x + Math.cos(a) * p.rx * r, z = p.z + Math.sin(a * 1.3) * p.rz * r;
        const dx = -Math.sin(a) * p.rx * r * speed, dz = Math.cos(a * 1.3) * 1.3 * p.rz * r * speed;
        let heading = Math.atan2(dx, dz), wag = 7, swing = 0.5, size = 1, roll = 0, lift = 0;
        const mine = b && b.kind === k.id && b.pond === pi && b.j === j ? b : null;
        if (mine) {
          if (on) {   // as in Zoo Garden's drawSuitor and updateFight
            const { st, f } = on, bx = f.x, bz = f.z;
            if (!mine.live) Object.assign(mine, { live: true, x, z, heading, from: Math.max(1.2, Math.hypot(x - bx, z - bz)), phase: '' });
            if (st.phase === 'bite' && mine.phase !== 'bite') this.world.fishingView.splash?.(bx, f.y, bz, 12);
            mine.phase = st.phase;
            if (st.phase === 'fight') {   // hooked: the float rides on the fish as it is hauled in, thrashing; it breaks the surface when it surges
              const e = Math.min(1, dt * 6); mine.x += (bx - mine.x) * e; mine.z += (bz - mine.z) * e;
              mine.heading = Math.atan2(f.ux, f.uz) + Math.sin(t * 12) * 0.5;   // pulling away from you
              roll = Math.sin(t * 18) * 0.4; lift = st.surge ? Math.abs(Math.sin(t * 9)) * 0.3 : 0; wag = 26; swing = 0.6;
            } else if (st.phase === 'bite') {   // onto the float, a little deeper, shaking
              const e = Math.min(1, dt * 10); mine.x += (bx - mine.x) * e; mine.z += (bz - mine.z) * e;
              mine.heading += Math.sin(t * 20) * dt * 3; lift = -0.1; wag = 22;
            } else {   // swims in from where it was, nose to the float; nibbling, it holds half a metre off and darts in and back
              let dx = mine.x - bx, dz = mine.z - bz; const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
              const dart = st.dart ?? 0, away = st.phase === 'nibble' ? 0.5 - dart * 0.32 : Math.max(0.5, mine.from * (1 - (st.approach ?? 0)));
              const e = Math.min(1, dt * (dart > 0.05 ? 30 : 8)); mine.x += (bx + dx * (away + k.nose) - mine.x) * e; mine.z += (bz + dz * (away + k.nose) - mine.z) * e;
              mine.heading = turn(mine.heading, Math.atan2(-dx, -dz), Math.min(1, dt * (st.phase === 'nibble' ? 6 : 4))); wag = 10;
            }
          } else mine.live = false;   // let go: it drifts back to its round
          const w = on ? 1 : ease(mine.w); x += (mine.x - x) * w; z += (mine.z - z) * w; heading = turn(heading, mine.heading, w);
        }
        const lost = this.gone.find(g => g.kind === k.id && g.pond === pi && g.j === j);
        if (lost) size = Math.max(0, Math.min(1, (t - lost.until) / 1.2));   // landed: away, then a new one grows in
        const swish = quiet ? 0 : Math.sin(t * wag + seed * 3);
        q.setFromEuler(eu.set(0, heading + swish * 0.06, roll, 'YXZ'));   // the models face +z
        const y = p.y - k.top - 0.05 + lift + 0.03 * Math.sin(t * 1.3 + seed);   // just under the surface
        m4.compose(v.set(x, y, z), q, sc.setScalar(k.scale * size));
        if (far) { this.far.setMatrixAt(all, m4); this.far.setColorAt(all++, k.tint); continue; }
        k.body.setMatrixAt(i, m4);
        if (k.tail) { qt.setFromAxisAngle(up, swish * swing); t4.compose(k.hinge, qt, sc.setScalar(1)); k.tail.setMatrixAt(i, m4.clone().multiply(t4)); }
      }
      k.body.count = far ? 0 : i; k.body.visible = !far && i > 0; k.body.instanceMatrix.needsUpdate = true;
      if (k.tail) { k.tail.count = far ? 0 : i; k.tail.visible = !far && i > 0; k.tail.instanceMatrix.needsUpdate = true; }
    });
    if (this.far) { this.far.count = all; this.far.visible = far && all > 0; this.far.instanceMatrix.needsUpdate = true; if (this.far.instanceColor) this.far.instanceColor.needsUpdate = true; }
  }
}
