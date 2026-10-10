// Things that change over time (DESIGN 5–7): crops growing in stages, animals living inside their fence, and a bobbing
// good over whatever is ready to collect. Timers update twice a second; animals think and move every frame.
// Animals are cast subjects (skinned.mjs): the ones near the camera centre are animated skinned actors, the rest are
// instances of the same model. Each animal walks, grazes or pecks, looks around, sits, and sleeps at night by its home.
// Tapping one makes it call out (Moo, Flap) with a hop; life.animalAt(cell) tells the tap menu which animal is there.
import * as THREE from 'three';
import { CELL } from '../content/world.mjs';
import { CROPS, ANIMALS } from '../content/goods.mjs';
import { BUILDINGS, footprint } from '../content/buildings.mjs';
import { penOf, cellsOf, landOf, cellType, occupant } from '../core/grid.mjs';
import { toon } from '../kit/toon.mjs';
import { sfx } from '../kit/sound.mjs';
import { cropLook } from './kinds.mjs';   // the art kit's growth stages (sprout, leafy middle, ripe)
import { castOf, RIGS } from './skinned.mjs';

/** The v0.1 crop look ([model, scale]): only a fallback while a stage model is not registered yet. */
export function cropStage(crop, progress) {
  if (progress < 0.25) return ['crop:sprout', 0.7];
  if (progress < 0.6) return [`crop:${crop}`, 0.55];
  if (progress < 1) return [`crop:${crop}`, 0.8];
  return [`crop:${crop}`, 1];
}
/** Is it night on the player's clock (and not "always daytime" in Settings)? */
export function isNight(s, now) {
  if (s.settings?.daylight === 'always') return false;
  const d = new Date(now), h = d.getHours() + d.getMinutes() / 60;
  return h < 5.5 || h > 20;
}
// How each animal kind behaves: walking speed (m/s), what it does when it stops, its call, its sound and its room.
const WAYS = {
  hen: { speed: 0.85, graze: 'Peck', call: 'Flap', sound: 'cluck', moves: [['walk', 0.4], ['graze', 0.42], ['look', 0.18]], radius: 0.45 },
  cow: { speed: 0.6, graze: 'Graze', call: 'Moo', sound: 'moo', moves: [['walk', 0.3], ['graze', 0.48], ['look', 0.15], ['sit', 0.07]], radius: 1.1 },
  goat: { speed: 0.8, graze: 'Graze', call: 'Call', sound: 'moo', moves: [['walk', 0.42], ['graze', 0.4], ['look', 0.18]], radius: 0.6 },
  pig: { speed: 0.7, graze: 'Graze', call: 'Call', sound: 'oink', moves: [['walk', 0.35], ['graze', 0.45], ['look', 0.2]], radius: 0.7 },
};
const wayOf = kind => WAYS[kind] ?? WAYS.hen;
const rigOf = kind => (RIGS[kind] ? kind : ANIMALS[kind]?.home === 'cow_barn' ? 'cow' : 'hen');
const pick = moves => { let r = Math.random(); for (const [m, p] of moves) if ((r -= p) <= 0) return m; return moves[0][0]; };
const HOP = 0.42;
const PEN_CHANGES = new Set(['placed', 'stored', 'moved', 'demolished', 'fenceChanged', 'animalArrived', 'parcelBought']);

export class LifeView {
  constructor(world, game) {
    Object.assign(this, { world, game, shown: new Map(), herds: new Map(), clock: 0, pens: new Map(), marks: new Map(), time: 0, ready: [] });
    this.cast = castOf(world); world.life = this;   // people-view keeps the family out of the pens
    this.cast.arm();   // made after the land is drawn: the rigged models download from here on, not before the first scene
    // the fallback marker: a small golden star, for goods that have no model of their own
    const g = new THREE.OctahedronGeometry(0.35, 0).scale(1, 1.4, 1);
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3).map((_, i) => [1, 0.85, 0.25][i % 3]), 3));
    g.computeBoundingBox();
    if (!world.batches.has('sparkle')) world.batches.register('sparkle', { geo: g, kind: 'static' });
    // the highlight ring under a ready good: a flat golden ring that pulses
    const ring = new THREE.RingGeometry(0.62, 0.86, 28).rotateX(-Math.PI / 2);
    ring.setAttribute('color', new THREE.BufferAttribute(new Float32Array(ring.attributes.position.count * 3).map((_, i) => [1, 0.86, 0.3][i % 3]), 3));
    this.ring = new THREE.InstancedMesh(ring, toon({ transparent: true, opacity: 0.85 }), 32);
    this.ring.count = 0; this.ring.visible = false; this.ring.frustumCulled = false; this.ring.renderOrder = 2; world.scene.add(this.ring);
    world.onFrame((dt, now) => this.frame(dt, now));
    this.listenForTaps();
    // Counts can stay equal while a fence is replaced or an animal home moves.
    game.on((r, action) => { if (action === 'load' || r.events?.some(e => PEN_CHANGES.has(e.type))) this.pens.clear(); });
  }
  get s() { return this.game.s; }
  frame(dt) {
    this.time += dt;
    this.clock += dt;
    if (this.clock > 0.5) { this.clock = 0; this.update(); }
    this.liveAnimals(dt);
    this.drawMarks();
  }
  /** Timers: crop stages and the ready goods over buildings. */
  update() {
    const s = this.s, t = this.game.now, b = this.world.batches, seen = new Set(), ready = [];
    for (const [id, p] of Object.entries(s.placed)) {
      if (p.kind === 'bed') {
        const bed = s.beds[id], key = `crop:${id}`; seen.add(key);
        if (!bed) { if (this.shown.has(key)) { b.remove(key); this.shown.delete(key); } continue; }
        const progress = Math.min(1, 1 - (bed.doneAt - t) / CROPS[bed.crop].growMs);
        let [model, scale] = cropLook(bed.crop, progress); if (!b.has(model)) [model, scale] = cropStage(bed.crop, progress);
        const look = `${model}|${scale}`;
        if (this.shown.get(key) !== look) {
          b.set(key, { model, x: (p.x + 0.5) * CELL, z: (p.z + 0.5) * CELL, rot: ((p.x * 7 + p.z * 13) % 4) * Math.PI / 2, scale });   // quarter turns: plant rows stay on the bed furrows
          this.shown.set(key, look);
        }
        continue;
      }
      if (BUILDINGS[p.kind]?.produces) {
        const job = (s.production[id]?.queue ?? []).find(j => j.doneAt <= t);
        if (job) { const [w, d] = footprint(p.kind, p.rot); ready.push({ id, good: job.recipe, x: (p.x + w / 2) * CELL, z: (p.z + d / 2) * CELL, y: 4.4 }); }
      }
    }
    for (const key of [...this.shown.keys()]) if (!seen.has(key)) { b.remove(key); this.shown.delete(key); }
    this.ready = ready;
    this.syncHerds();
  }
  // ── Animals ──
  /** Each animal home's herd: one cast subject per animal, inside its fenced area. */
  syncHerds() {
    const s = this.s, t = this.game.now, want = new Map();
    for (const [home, list] of Object.entries(s.animals)) for (const [i, a] of list.entries()) want.set(`${home}:${i}`, { home, kind: a.kind, ready: a.doneAt != null && a.doneAt <= t, hungry: a.doneAt == null });
    for (const [key, a] of this.herds) if (!want.has(key) || !s.placed[a.home]) { this.cast.remove(a.subject); this.herds.delete(key); }
    for (const [key, w] of want) {
      let a = this.herds.get(key);
      if (!a) {
        if (!s.placed[w.home]) continue;
        const area = this.penArea(w.home), c = area[Math.floor(Math.random() * area.length)] ?? [0, 0];
        a = { ...w, key, state: 'look', until: 0, target: null, phase: Math.random() * 6.28, hop: 0 };
        a.subject = this.cast.add({ rig: rigOf(w.kind), x: (c[0] + 0.2 + Math.random() * 0.6) * CELL, z: (c[1] + 0.2 + Math.random() * 0.6) * CELL, rot: Math.random() * 6.28, clip: 'Idle', animal: true });
        this.herds.set(key, a);
      }
      a.ready = w.ready; a.hungry = w.hungry;
    }
  }
  /** Cells the animals of a home may walk on: the fenced area, or the home's own footprint if the fence is open. */
  penArea(home) {
    const s = this.s, p = s.placed[home]; if (!p) return [];
    const key = `${home}|${Object.keys(s.fences).length}|${p.x},${p.z},${p.rot}`;
    if (this.pens.get(home)?.key === key) return this.pens.get(home).cells;
    const pen = penOf(s, home), own = cellsOf(p.kind, p.x, p.z, p.rot), yard = pen.closed ? this.flood(home) : own, cells = pen.closed ? this.range(home, yard) : own;
    const free = cells.filter(([x, z]) => !own.some(c => c[0] === x && c[1] === z));
    const out = free.length ? free : cells, set = new Set(out.map(c => `${c[0]},${c[1]}`));
    // the cells beside the home, where the animals gather to sleep
    const beside = out.filter(([x, z]) => own.some(c => Math.abs(c[0] - x) + Math.abs(c[1] - z) === 1));
    this.pens.set(home, { key, cells: out, set, yard, beside: beside.length ? beside : out });
    // the home was moved (or its fence changed): animals left outside come along at once
    for (const an of this.herds.values()) if (an.home === home && out.length && !set.has(`${Math.floor(an.subject.x / CELL)},${Math.floor(an.subject.z / CELL)}`)) {
      const c = out[Math.floor(Math.random() * out.length)]; an.subject.x = (c[0] + 0.5) * CELL; an.subject.z = (c[1] + 0.5) * CELL; an.target = null; an.until = 0;
    }
    return out;
  }
  /** The fenced yard only (people keep out of it); the animals' wider free range is penArea(). */
  penYard(home) { this.penArea(home); return this.pens.get(home)?.yard ?? []; }
  inPen(home, x, z, r = 0) {
    this.penArea(home); const set = this.pens.get(home)?.set; if (!set) return false;
    const has = (px, pz) => set.has(`${Math.floor(px / CELL)},${Math.floor(pz / CELL)}`);
    return has(x, z) && (!r || (has(x + r, z) && has(x - r, z) && has(x, z + r) && has(x, z - r)));   // the whole body clear of the fence
  }
  /** Free range: from the pen the animals wander out through its GATE (never through a fence) over open farm ground
   *  near home; hens peck among the crop beds too, cows keep off them. So hens stroll the beds, and a cow can walk
   *  round to the coop's yard and back. Buildings, weeds and rocks, other people's land and the far farm stay out. */
  range(home, pen) {
    const s = this.s, p = s.placed[home], hens = ANIMALS[BUILDINGS[p.kind]?.animals]?.home === 'coop', R = hens ? 9 : 11;
    const seen = new Set(pen.map(c => c.join(','))), stack = [...pen], cx = p.x + 1, cz = p.z + 1;
    const edge = (x, z, nx, nz) => nz === z - 1 ? `${x},${z},n` : nz === z + 1 ? `${x},${nz},n` : nx === x - 1 ? `${x},${z},w` : `${nx},${z},w`;
    while (stack.length && seen.size < 500) {
      const [x, z] = stack.pop();
      for (const [nx, nz] of [[x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1]]) {
        const k = `${nx},${nz}`; if (seen.has(k) || Math.abs(nx - cx) > R || Math.abs(nz - cz) > R) continue;
        const fence = s.fences[edge(x, z, nx, nz)]; if (fence && fence !== 'gate') continue;
        if (landOf(s, nx, nz) !== 'farm') continue;
        const type = cellType(s, nx, nz); if (type === 'weeds' || type === 'rock') continue;
        const who = occupant(s, nx, nz); if (who && !(hens && s.placed[who]?.kind === 'bed')) continue;
        seen.add(k); stack.push([nx, nz]);
      }
    }
    return [...seen].map(k => k.split(',').map(Number));
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
  /** Choose what an animal does next. */
  decide(a, night) {
    const sub = a.subject, way = wayOf(a.kind), pen = this.pens.get(a.home);
    if (!pen) return;
    if (night) {
      // walk to the home and sleep beside it
      if (!a.bedded) { const c = pen.beside[Math.floor(Math.random() * pen.beside.length)]; a.target = [(c[0] + 0.2 + Math.random() * 0.6) * CELL, (c[1] + 0.2 + Math.random() * 0.6) * CELL]; a.state = 'walk'; a.bedded = true; a.until = this.time + 30; return; }
      a.state = 'sleep'; a.until = this.time + 20 + Math.random() * 20; return;
    }
    a.bedded = false;
    a.state = pick(way.moves);
    if (a.state === 'walk') {
      a.target = null;   // a nearby spot, so they amble rather than march across the pen
      for (let k = 0; k < 6 && !a.target; k++) {
        const ang = Math.random() * 6.28, r = 1.5 + Math.random() * 4, x = sub.x + Math.sin(ang) * r, z = sub.z + Math.cos(ang) * r;
        if (this.inPen(a.home, x, z, way.radius * 1.2)) a.target = [x, z];
      }
      if (!a.target) {   // no free spot close by: a cell of the range within a few steps (so nobody marches across the farm), else anywhere in it
        const near = pen.cells.filter(c => Math.abs((c[0] + 0.5) * CELL - sub.x) < 7 && Math.abs((c[1] + 0.5) * CELL - sub.z) < 7), from = near.length ? near : pen.cells, c = from[Math.floor(Math.random() * from.length)];
        a.target = [(c[0] + 0.5) * CELL, (c[1] + 0.5) * CELL];
      }
      a.until = this.time + 12;
    } else a.until = this.time + (a.state === 'sit' ? 8 + Math.random() * 8 : a.state === 'graze' ? 3 + Math.random() * 5 : 1.5 + Math.random() * 2.5);
    if (a.state === 'look') a.lookTo = sub.rot + (Math.random() - 0.5) * 2.2;
  }
  liveAnimals(dt) {
    if (!this.herds.size) return;
    const night = isNight(this.s, this.game.now), byHome = new Map();
    for (const a of this.herds.values()) {
      const sub = a.subject, way = wayOf(a.kind), rig = RIGS[sub.rig];
      if (!this.penArea(a.home).length) continue;
      if (this.time > a.until || (night && a.state !== 'sleep' && !a.bedded) || (!night && (a.state === 'sleep' || a.bedded))) this.decide(a, night);
      sub.pitch = 0; sub.bob = 0; sub.speed = 1;
      if (a.state === 'walk' && a.target) {
        const dx = a.target[0] - sub.x, dz = a.target[1] - sub.z, d = Math.hypot(dx, dz);
        const turn = ((Math.atan2(dx, dz) - sub.rot) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
        sub.rot += Math.max(-dt * 4, Math.min(dt * 4, turn));
        const speed = way.speed * (night ? 0.8 : 1) * (Math.abs(turn) > 1.2 ? 0.3 : 1), step = Math.min(d, speed * dt);
        const nx = sub.x + Math.sin(sub.rot) * step, nz = sub.z + Math.cos(sub.rot) * step;
        if (this.inPen(a.home, nx, nz, way.radius) || (this.inPen(a.home, nx, nz) && !this.inPen(a.home, sub.x, sub.z, way.radius))) { sub.x = nx; sub.z = nz; } else a.until = 0;
        if (d < 0.15) { a.until = 0; a.target = null; }
        sub.clip = 'Walk'; sub.speed = Math.max(0.3, speed / rig.walk);
        sub.bob = a.kind === 'hen' ? Math.abs(Math.sin(this.time * 9 + a.phase)) * 0.07 : Math.abs(Math.sin(this.time * 5 + a.phase)) * 0.04;
      } else if (a.state === 'graze') {
        sub.clip = way.graze;
        sub.pitch = a.kind === 'hen' ? 0.35 + Math.sin(this.time * 7 + a.phase) * 0.3 : 0.18;   // the instanced copies tip forward to peck and graze
      } else if (a.state === 'look') {
        sub.clip = 'Idle'; sub.rot += Math.max(-dt * 1.5, Math.min(dt * 1.5, (a.lookTo ?? sub.rot) - sub.rot));
      } else if (a.state === 'sit' || a.state === 'sleep') {
        sub.clip = a.kind === 'hen' ? 'Idle' : 'Sleep';
        if (a.kind === 'hen') { sub.speed = 0.1; sub.bob = -0.12; }
      } else sub.clip = 'Idle';
      if (a.hop > 0) { a.hop = Math.max(0, a.hop - dt); sub.lift = Math.sin(Math.PI * (1 - a.hop / HOP)) * (a.kind === 'cow' ? 0.35 : 0.45); } else sub.lift = 0;
      (byHome.get(a.home) ?? byHome.set(a.home, []).get(a.home)).push(a);
    }
    // keep a little room between animals of the same home
    for (const list of byHome.values()) for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const A = list[i].subject, B = list[j].subject, r = wayOf(list[i].kind).radius + wayOf(list[j].kind).radius;
      const dx = B.x - A.x, dz = B.z - A.z, d = Math.hypot(dx, dz);
      if (d > 0.001 && d < r) {
        const push = (r - d) * 0.5 * Math.min(1, dt * 6), ux = dx / d * push, uz = dz / d * push;
        if (this.inPen(list[i].home, A.x - ux, A.z - uz, wayOf(list[i].kind).radius * 0.8)) { A.x -= ux; A.z -= uz; }
        if (this.inPen(list[j].home, B.x + ux, B.z + uz, wayOf(list[j].kind).radius * 0.8)) { B.x += ux; B.z += uz; }
      }
    }
  }
  /** The animal standing on (or nearest within a cell of) a map cell, or null. For the tap menu. */
  animalAt(cell) {
    if (!cell) return null;
    const cx = (cell.x + 0.5) * CELL, cz = (cell.z + 0.5) * CELL; let best = null, bestD = CELL * 0.9;
    for (const a of this.herds.values()) { const d = Math.hypot(a.subject.x - cx, a.subject.z - cz); if (d < bestD) { best = a; bestD = d; } }
    return best && { key: best.key, home: best.home, kind: best.kind, ready: best.ready, hungry: best.hungry, x: best.subject.x, z: best.subject.z };
  }
  /** The animal under a screen point (within 36 px of its body), or null. */
  pick(x, y) {
    const cam = this.world.cam.camera, p = new THREE.Vector3(); let best = null, bestD = 36;
    for (const a of this.herds.values()) {
      p.set(a.subject.x, RIGS[a.subject.rig].height * 0.45, a.subject.z).project(cam);
      const d = Math.hypot((p.x + 1) / 2 * innerWidth - x, (1 - p.y) / 2 * innerHeight - y); if (d < bestD) { best = a; bestD = d; }
    }
    return best;
  }
  /** Tap an animal: it calls out with a hop (and a sound). Takes an animal or what animalAt returned. */
  poke(which) {
    const a = which?.subject ? which : this.herds.get(which?.key); if (!a || a.hop > 0) return false;
    a.hop = HOP; a.subject.once = { clip: wayOf(a.kind).call }; a.state = 'look'; a.until = this.time + 1.6; a.lookTo = a.subject.rot;
    sfx(wayOf(a.kind).sound);
    return true;
  }
  /** Taps on the map outside build mode: an animal under the finger calls out. The tap menu still opens as before. */
  listenForTaps() {
    const el = this.world.renderer.domElement; let down = null;
    el.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
    el.addEventListener('pointerup', e => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8 || performance.now() - down.t > 500) return;
      if (document.querySelector('[data-mode="build"]')) return;
      const a = this.pick(e.clientX, e.clientY); if (a) this.poke(a);
    });
  }
  // ── Ready goods ──
  /** A model for a good: its own (art package), its produce or crop model, or the golden star. */
  markModel(good) {
    const b = this.world.batches;
    for (const name of [`good:${good}`, `produce:${good}`, `crop:${good}`]) if (b.has(name)) return name;
    return 'sparkle';
  }
  drawMarks() {
    const items = [...this.ready];
    for (const a of this.herds.values()) if (a.ready) items.push({ good: ANIMALS[a.kind]?.gives, x: a.subject.x, z: a.subject.z, y: RIGS[a.subject.rig].height + 0.5 + (a.subject.lift ?? 0), small: true, phase: a.phase });
    const lod = this.world.cam.lod, count = new Map(), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    let rings = 0;
    for (const it of lod < 2 ? items : items.filter(i => !i.small)) {
      const name = this.markModel(it.good), mark = this.mark(name, (count.get(name) ?? 0) + 1); if (!mark) continue;
      const i = count.get(name) ?? 0; count.set(name, i + 1);
      const t = this.time + (it.phase ?? it.x * 0.37), bob = Math.sin(t * 3) * 0.16, k = mark.fit * (it.small ? 0.8 : 1.3) * (lod === 2 ? 2.2 : 1);
      mark.mesh.setMatrixAt(i, m4.compose(v.set(it.x, it.y + bob, it.z), q.setFromAxisAngle(up, t * 1.6), sc.set(k, k, k)));
      if (!it.small && rings < 32) { const r = 1.6 + Math.sin(t * 4) * 0.12; this.ring.setMatrixAt(rings++, m4.compose(v.set(it.x, 0.06, it.z), q.identity(), sc.set(r, 1, r))); }
    }
    for (const [name, mark] of this.marks) { const n = count.get(name) ?? 0; mark.mesh.count = n; mark.mesh.visible = n > 0; if (n) mark.mesh.instanceMatrix.needsUpdate = true; }
    this.ring.count = rings; this.ring.visible = rings > 0; if (rings) this.ring.instanceMatrix.needsUpdate = true;
  }
  mark(name, need) {
    const old = this.marks.get(name); if (old && old.cap >= need) return old;
    const model = this.world.batches.models.get(name); if (!model) return null;
    if (old) { this.world.scene.remove(old.mesh); old.mesh.dispose(); }
    const cap = Math.max(8, need * 2), mesh = new THREE.InstancedMesh(model.geo, toon(), cap), size = model.geo.boundingBox.getSize(new THREE.Vector3());
    mesh.count = 0; mesh.frustumCulled = false; mesh.renderOrder = 3; this.world.scene.add(mesh);
    const m = { mesh, cap, fit: 0.7 / Math.max(0.05, size.x, size.y, size.z) }; this.marks.set(name, m); return m;
  }
}
