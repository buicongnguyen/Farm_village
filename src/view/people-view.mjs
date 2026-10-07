// People on the map (DESIGN 9): families who moved in walk between home, the farm and the school on paths and roads;
// Cora works at the school; AI neighbours walk in from their signpost, say something about what they see, and leave.
// Tap a person to hear their line. Rigid hero bodies from Willowmere, instanced per body, with a gentle walking bob.
import * as THREE from 'three';
import { CELL, N, ORDER_BOARD, NEIGHBOUR_SIGNS, FARMHOUSE } from '../content/world.mjs';
import { FAMILIES, VILLAGERS, NEIGHBOURS } from '../content/people.mjs';
import { cellType, doorCell } from '../core/grid.mjs';
import { loadKit, bake, fit, simplify } from './models.mjs';
import { toon } from '../kit/toon.mjs';
import { t } from '../kit/i18n.mjs';

const BODIES = { man: ['hero-tall', 1.75], woman: ['hero-girl-tall', 1.7], boy: ['hero-tiny', 1.1], girl: ['hero-girl-tiny', 1.1] };
const WOMEN = new Set(['lan', 'grace', 'elin', 'marisol', 'ada', 'cora', 'mai']), GIRLS = new Set(['zara', 'pia']);
const bodyOf = (id, kid) => kid ? (GIRLS.has(id) ? 'girl' : 'boy') : WOMEN.has(id) ? 'woman' : 'man';
const PEOPLE = Object.fromEntries([...VILLAGERS, ...NEIGHBOURS, ...FAMILIES.flatMap(f => f.people)].map(p => [p.id, p]));
const walkable = (s, x, z) => { const ty = cellType(s, x, z); return ty === 'path' || ty === 'road'; };

export class PeopleView {
  constructor(world, game, root) {
    Object.assign(this, { world, game, walkers: new Map(), meshes: null, clock: 0 });
    this.bubbles = document.createElement('div'); this.bubbles.className = 'bubbles'; root.appendChild(this.bubbles);
    this.load();
    world.onFrame((dt, now) => this.frame(dt, now));
    game.on(r => { for (const e of r.events ?? []) if (e.type === 'neighbourVisit') this.visit(e.id, e.comment); });
  }
  get s() { return this.game.s; }
  async load() {
    const mat = toon(); this.meshes = {};
    for (const [body, [file, h]] of Object.entries(BODIES)) {
      const kit = await loadKit(file), geo = fit(bake(Object.values(kit)[0]), { height: h }), mid = simplify(geo, 0.3);
      const near = new THREE.InstancedMesh(geo, mat, 24), far = new THREE.InstancedMesh(mid, mat, 24);
      near.count = far.count = 0; near.frustumCulled = far.frustumCulled = false;
      this.world.scene.add(near, far); this.meshes[body] = { near, far };
    }
  }
  /** Who should be walking around: residents of arrived families, Ada, and Cora once the school is open. */
  residents() {
    const s = this.s, now = this.game.now, out = [{ id: 'ada', body: 'woman', home: [FARMHOUSE.x + 5, FARMHOUSE.z] }];
    for (const [hid, h] of Object.entries(s.homes)) {
      if (!h.family || h.arrivesAt > now) continue;
      const p = s.placed[hid], door = p && doorCell(p.kind, p.x, p.z, p.rot), fam = FAMILIES.find(f => f.id === h.family);
      for (const person of fam?.people ?? []) out.push({ id: person.id, body: bodyOf(person.id, person.kid), home: door });
    }
    const school = Object.entries(s.placed).find(([, p]) => p.kind === 'school');
    if (school) { const p = school[1]; out.push({ id: 'cora', body: 'woman', home: doorCell(p.kind, p.x, p.z, p.rot), work: true }); }
    return out;
  }
  sync() {
    const want = new Map(this.residents().map(r => [r.id, r]));
    for (const [id, w] of this.walkers) if (!w.visitor && !want.has(id)) this.walkers.delete(id);
    for (const [id, r] of want) if (!this.walkers.has(id) && r.home) {
      this.walkers.set(id, { ...r, x: (r.home[0] + 0.5) * CELL, z: (r.home[1] + 0.5) * CELL, route: [], wait: Math.random() * 4, rot: 0, phase: Math.random() * 6 });
    }
  }
  /** A neighbour walks in from their signpost to the order board and says something about the farm. */
  visit(id, comment) {
    const sign = NEIGHBOUR_SIGNS.find(n => n.id === id); if (!sign) return;
    const start = this.nearestWalkable(sign.x, sign.z); if (!start) return;
    const w = { id: `visit:${id}`, person: id, visitor: true, body: 'woman', x: (start[0] + 0.5) * CELL, z: (start[1] + 0.5) * CELL, route: [], wait: 0, rot: 0, phase: 0, comment, stage: 'coming', home: start };
    if (id === 'gus') w.body = 'man';
    w.route = this.route([start[0], start[1]], [ORDER_BOARD.x, ORDER_BOARD.z]);
    this.walkers.set(w.id, w);
  }
  nearestWalkable(x, z) {
    for (let r = 0; r < 12; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) if (walkable(this.s, x + dx, z + dz)) return [x + dx, z + dz];
    return null;
  }
  /** Shortest walk over path and road cells (breadth-first), as a list of cells; [] if unreachable. */
  route(from, to) {
    const s = this.s, a = this.nearestWalkable(...from), b = this.nearestWalkable(...to); if (!a || !b) return [];
    const key = (x, z) => z * N + x, prev = new Map([[key(...a), -1]]), queue = [a];
    for (let i = 0; i < queue.length; i++) {
      const [x, z] = queue[i]; if (x === b[0] && z === b[1]) break;
      for (const [nx, nz] of [[x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1]]) { const k = key(nx, nz); if (prev.has(k) || !walkable(s, nx, nz)) continue; prev.set(k, key(x, z)); queue.push([nx, nz]); }
    }
    if (!prev.has(key(...b))) return [];
    const out = []; for (let k = key(...b); k !== -1; k = prev.get(k)) out.push([k % N, Math.floor(k / N)]);
    return out.reverse();
  }
  pickDestination(w) {
    const s = this.s, spots = [[ORDER_BOARD.x, ORDER_BOARD.z], w.home, [FARMHOUSE.x + 6, FARMHOUSE.z + 1]];
    const school = Object.values(s.placed).find(p => p.kind === 'school'); if (school) spots.push(doorCell(school.kind, school.x, school.z, school.rot));
    for (const p of Object.values(s.placed)) if (p.kind === 'cottage' && Math.random() < 0.3) spots.push(doorCell(p.kind, p.x, p.z, p.rot));
    const goal = w.work && Math.random() < 0.6 ? w.home : spots[Math.floor(Math.random() * spots.length)];
    return this.route([Math.floor(w.x / CELL), Math.floor(w.z / CELL)], goal);
  }
  frame(dt) {
    this.clock += dt; if (this.clock > 1) { this.clock = 0; this.sync(); }
    if (!this.meshes) return;
    for (const w of this.walkers.values()) {
      if (!w.route.length) {
        if ((w.wait -= dt) > 0) continue;
        if (w.visitor) {
          if (w.stage === 'coming') { w.stage = 'talking'; w.wait = 5; this.say(w, t(w.comment)); continue; }
          if (w.stage === 'talking') { w.stage = 'leaving'; w.route = this.route([Math.floor(w.x / CELL), Math.floor(w.z / CELL)], w.home); continue; }
          w.bubble?.remove(); this.walkers.delete(w.id); continue;
        }
        w.route = this.pickDestination(w); w.wait = 3 + Math.random() * 8; continue;
      }
      const [cx, cz] = w.route[0], tx = (cx + 0.5) * CELL, tz = (cz + 0.5) * CELL, dx = tx - w.x, dz = tz - w.z, d = Math.hypot(dx, dz), step = 1.3 * dt;
      if (d <= step) { w.x = tx; w.z = tz; w.route.shift(); } else { w.x += dx / d * step; w.z += dz / d * step; w.rot = Math.atan2(dx, dz); }
    }
    this.draw();
  }
  draw() {
    const lod = this.world.cam.lod, m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), n = {};
    const time = performance.now() / 1000;
    for (const w of this.walkers.values()) {
      const set = this.meshes[w.body]; if (!set) continue;
      const i = (n[w.body] = (n[w.body] ?? -1) + 1); if (i >= 24) continue;
      const bob = w.route.length ? Math.abs(Math.sin(time * 9 + w.phase)) * 0.06 : 0;
      (lod === 0 ? set.near : set.far).setMatrixAt(i, m4.compose(v.set(w.x, bob, w.z), q.setFromAxisAngle(up, w.rot), one));
    }
    for (const [body, set] of Object.entries(this.meshes)) {
      const c = Math.min(24, (n[body] ?? -1) + 1);
      set.near.count = lod === 0 ? c : 0; set.far.count = lod === 1 ? c : 0;
      set.near.instanceMatrix.needsUpdate = set.far.instanceMatrix.needsUpdate = true;
    }
    this.placeBubbles();
  }
  screenOf(w, y = 2.3) { const p = new THREE.Vector3(w.x, y, w.z).project(this.world.cam.camera); return { x: (p.x + 1) / 2 * innerWidth, y: (1 - p.y) / 2 * innerHeight }; }
  /** The person nearest a screen point (within 40 px), or null. */
  pick(x, y) {
    let best = null, bestD = 40;
    for (const w of this.walkers.values()) { const p = this.screenOf(w, 1); const d = Math.hypot(p.x - x, p.y - y); if (d < bestD) { best = w; bestD = d; } }
    return best;
  }
  say(w, text) {
    w.bubble?.remove();
    const el = document.createElement('div'); el.className = 'bubble';
    const who = PEOPLE[w.person ?? w.id];
    el.innerHTML = `<b>${who ? t(who.name) : ''}</b> ${text}`;
    this.bubbles.appendChild(el); w.bubble = el; w.bubbleUntil = performance.now() + 5000;
    this.placeBubbles();
  }
  talk(w) { const who = PEOPLE[w.person ?? w.id]; if (who) this.say(w, t(w.comment ?? who.line)); }
  placeBubbles() {
    const now = performance.now();
    for (const w of this.walkers.values()) {
      if (!w.bubble) continue;
      if (now > w.bubbleUntil) { w.bubble.remove(); w.bubble = null; continue; }
      const p = this.screenOf(w); w.bubble.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -100%)`;
    }
  }
}
