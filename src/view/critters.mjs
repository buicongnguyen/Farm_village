// Small animals around the farm (cast package): crows that land on fields with no scarecrow nearby and fly off when
// tapped (or when a scarecrow goes up), a cat dozing by the farmhouse, rabbits at the meadow edge, and ducks swimming
// along the brook and the pond. They are cast subjects drawn only as animated actors near the camera centre (the cast
// lets at most a few critters animate at once), so they cost nothing when the view is elsewhere.
import { CELL, N, FARMHOUSE, brookZ, isBrook, isRoad } from '../content/world.mjs';
import { biscuitOnDuty } from '../core/orchard.mjs';
import { occupant } from '../core/grid.mjs';
import { sfx } from '../kit/sound.mjs';
import { castOf, RIGS } from './skinned.mjs';
import { isNight } from './life-view.mjs';
import * as THREE from 'three';

const rand = (a, b) => a + Math.random() * (b - a);
const SCARE_CELLS = 7;   // a scarecrow keeps crows off fields this many cells away

export class Critters {
  constructor(world, game) {
    Object.assign(this, { world, game, cast: castOf(world), crows: [], time: 0, nextCrow: rand(12, 25), others: [] });
    world.critters = this;   // for the browser checks (window.farm.world.critters)
    this.spawnResidents();
    world.onFrame(dt => this.frame(dt));
    game.on(r => { for (const e of r.events ?? []) if (e.type === 'placed' && e.kind === 'scarecrow') this.scare(e.x, e.z, SCARE_CELLS); });
    this.listenForTaps();
  }
  get s() { return this.game.s; }
  add(rig, x, z, extra = {}) { return this.cast.add({ rig, x, z, rot: rand(0, 6.28), clip: 'Idle', critter: true, skinnedOnly: true, priority: 1, ...extra }); }
  /** The cat, the rabbits and the ducks live in fixed places; crows come and go. */
  spawnResidents() {
    const cat = this.add('cat', (FARMHOUSE.x + 3.2) * CELL, (FARMHOUSE.z - 3.4) * CELL, { clip: 'Sleep' });
    this.others.push({ sub: cat, kind: 'cat', home: [cat.x, cat.z], radius: 3, state: 'sleep', until: rand(10, 30) });
    // hens pecking and strolling about the farmyard, so the farm has life before the coop's own hens arrive
    for (const [dx, dz] of [[2.2, 1.5], [4.5, 3.2], [3.2, -2.2], [6, 0.6], [1.5, 4.6]]) {
      const sub = this.add('hen', (FARMHOUSE.x + dx) * CELL, (FARMHOUSE.z + dz) * CELL);
      this.others.push({ sub, kind: 'hen', home: [sub.x, sub.z], radius: 5, state: 'idle', until: rand(0.5, 5) });
    }
    // rabbits where the meadow meets the farm: between the road and the farm fence, and along its north edge
    for (const [x, z] of [[31, 38], [31, 50], [40, 23]]) {
      const sub = this.add('rabbit', (x + 0.5) * CELL, (z + 0.5) * CELL);
      this.others.push({ sub, kind: 'rabbit', home: [sub.x, sub.z], radius: 3.5, state: 'idle', until: rand(1, 4) });
    }
    // ducks on the brook (and on the pond, when the world has one)
    for (const x of [36, 44, 52]) this.others.push({ sub: this.add('duck', (x + 0.5) * CELL, (brookZ(x) + 0.5) * CELL, { clip: 'Swim', y: -0.12 }), kind: 'duck', water: 'brook', dir: Math.random() < 0.5 ? 1 : -1, x0: (x - 6) * CELL, x1: (x + 6) * CELL });
    // the pond's own ducks are brook.mjs's 'pond-ducks' (world package): no second set here
  }
  frame(dt) {
    this.time += dt;
    const night = isNight(this.s, this.game.now), calm = document.body.classList.contains('reduced-motion');
    if ((this.nextCrow -= dt) <= 0) { this.nextCrow = rand(18, 40); if (!night && !calm) this.crowArrives(); }
    for (const c of [...this.crows]) this.liveCrow(c, dt);
    for (const o of this.others) this.liveOther(o, dt, night, calm);
  }
  /** Crop beds no scarecrow watches over: [x, z] cells. */
  openFields() {
    const s = this.s, crows = Object.values(s.placed).filter(p => p.kind === 'scarecrow');
    return Object.entries(s.placed).filter(([id, p]) => p.kind === 'bed' && s.beds[id] && !crows.some(c => Math.max(Math.abs(c.x - p.x), Math.abs(c.z - p.z)) <= SCARE_CELLS)).map(([, p]) => [p.x, p.z]);
  }
  crowArrives() {
    if (this.crows.length >= 3) return;
    const fields = this.openFields(); if (!fields.length) return;
    const [x, z] = fields[Math.floor(Math.random() * fields.length)], tx = (x + rand(0.2, 0.8)) * CELL, tz = (z + rand(0.2, 0.8)) * CELL, a = rand(0, 6.28);
    const sub = this.add('crow', tx + Math.sin(a) * 26, tz + Math.cos(a) * 26, { y: 9, clip: 'Fly', priority: 2 });
    this.crows.push({ sub, state: 'in', from: [sub.x, sub.z], to: [tx, tz], t: 0, stay: rand(14, 30) });
  }
  liveCrow(c, dt) {
    const sub = c.sub;
    if (c.state === 'in' || c.state === 'out') {
      c.t = Math.min(1, c.t + dt / 4.5); const k = c.state === 'in' ? 1 - (1 - c.t) ** 2 : c.t * c.t;
      sub.x = c.from[0] + (c.to[0] - c.from[0]) * k; sub.z = c.from[1] + (c.to[1] - c.from[1]) * k;
      sub.y = c.state === 'in' ? 9 * (1 - k) : 10 * k; sub.rot = Math.atan2(c.to[0] - c.from[0], c.to[1] - c.from[1]); sub.clip = 'Fly';
      if (c.t >= 1) {
        if (c.state === 'out') { this.cast.remove(sub); this.crows.splice(this.crows.indexOf(c), 1); return; }
        c.state = 'ground'; c.until = this.time + c.stay; sub.y = 0; c.next = this.time + rand(1, 3);
      }
      return;
    }
    sub.clip = 'Idle';
    if (this.time > c.next) { c.next = this.time + rand(1.5, 4); sub.once = { clip: 'Hop' }; sub.rot += rand(-1.2, 1.2); }
    if (this.time > c.until || this.watched(sub) || (biscuitOnDuty(this.s) && document.body.classList.contains('reduced-motion'))) this.flyOff(c);
  }
  /** A scarecrow placed since the crow landed scares it off. */
  watched(sub) { const x = sub.x / CELL, z = sub.z / CELL; return Object.values(this.s.placed).some(p => p.kind === 'scarecrow' && Math.max(Math.abs(p.x - x), Math.abs(p.z - z)) <= SCARE_CELLS + 0.5); }
  flyOff(c) {
    if (c.state !== 'ground') return;
    const a = rand(0, 6.28); c.state = 'out'; c.t = 0; c.from = [c.sub.x, c.sub.z]; c.to = [c.sub.x + Math.sin(a) * 30, c.sub.z + Math.cos(a) * 30];
  }
  scare(x, z, r) { for (const c of this.crows) if (Math.max(Math.abs(c.sub.x / CELL - x), Math.abs(c.sub.z / CELL - z)) <= r + 0.5) this.flyOff(c); }
  free(x, z) {
    const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
    return cx >= 0 && cz >= 0 && cx < N && cz < N && !isBrook(cx, cz) && !isRoad(cx, cz) && !occupant(this.s, cx, cz);
  }
  liveOther(o, dt, night, calm = false) {
    const sub = o.sub;
    if (o.kind === 'duck') {
      sub.clip = 'Swim'; sub.speed = 0.8;
      if (o.water === 'pond') { o.angle += dt * 0.12; sub.x = o.cx + Math.cos(o.angle) * o.rx; sub.z = o.cz + Math.sin(o.angle) * o.rz; sub.rot = Math.atan2(-Math.sin(o.angle) * o.rx, Math.cos(o.angle) * o.rz); return; }
      const x = sub.x + o.dir * dt * 0.5; if (x < o.x0 || x > o.x1) o.dir *= -1;
      const nx = sub.x + o.dir * dt * 0.5, zc = (brookZ(nx / CELL) + 0.5) * CELL, zn = (brookZ((nx + o.dir) / CELL) + 0.5) * CELL;
      sub.rot = Math.atan2(o.dir, zn - zc); sub.x = nx; sub.z += (zc + Math.sin(this.time * 0.4 + o.x0) * 0.6 - sub.z) * Math.min(1, dt * 2);
      return;
    }
    if (this.time > o.until) {
      // the cat dozes by day and prowls a little at night; rabbits nibble and hop about
      const r = Math.random();
      if (o.kind === 'cat') o.state = calm ? 'sleep' : night ? (r < 0.6 ? 'walk' : 'sit') : r < 0.65 ? 'sleep' : r < 0.85 ? 'sit' : 'walk';
      else if (o.kind === 'hen') o.state = r < 0.6 && !calm ? 'walk' : 'idle';
      else o.state = r < 0.45 && !calm ? 'hop' : 'idle';   // reduced motion: rabbits sit and nibble
      o.until = this.time + (o.state === 'sleep' ? rand(20, 50) : o.state === 'hop' ? rand(0.6, 1.4) : rand(3, 8));
      if (o.state === 'walk' || o.state === 'hop') {
        const a = rand(0, 6.28), d = rand(0.8, o.radius), tx = o.home[0] + Math.sin(a) * d, tz = o.home[1] + Math.cos(a) * d;
        o.target = this.free(tx, tz) ? [tx, tz] : [...o.home];
      }
    }
    if ((o.state === 'walk' || o.state === 'hop') && o.target) {
      const dx = o.target[0] - sub.x, dz = o.target[1] - sub.z, d = Math.hypot(dx, dz), speed = o.kind === 'cat' ? 0.7 : o.kind === 'hen' ? 0.8 : 1.6;
      if (d > 0.1) { sub.rot = Math.atan2(dx, dz); const step = Math.min(d, speed * dt); sub.x += dx / d * step; sub.z += dz / d * step; sub.clip = o.kind === 'cat' || o.kind === 'hen' ? 'Walk' : 'Hop'; sub.speed = o.kind === 'cat' ? speed / RIGS.cat.walk : o.kind === 'hen' ? speed / RIGS.hen.walk : 1.4; return; }
      o.state = 'idle';
    }
    sub.speed = 1; sub.clip = o.state === 'sleep' ? 'Sleep' : o.state === 'sit' ? 'Sit' : 'Idle';
  }
  /** Tap a critter: crows fly off, the cat wakes up, a rabbit hops away. */
  pick(x, y) {
    const cam = this.world.cam.camera, p = new THREE.Vector3(); let best = null, bestD = 34;
    for (const o of [...this.crows, ...this.others]) {
      if (!o.sub.actor) continue;
      p.set(o.sub.x, (o.sub.y ?? 0) + RIGS[o.sub.rig].height * 0.4, o.sub.z).project(cam);
      const d = Math.hypot((p.x + 1) / 2 * innerWidth - x, (1 - p.y) / 2 * innerHeight - y); if (d < bestD) { best = o; bestD = d; }
    }
    return best;
  }
  poke(o) {
    if (!o) return false;
    if (this.crows.includes(o)) this.flyOff(o);
    else if (o.kind === 'cat') { o.state = 'sit'; o.until = this.time + 6; o.sub.once = { clip: 'Idle' }; }
    else if (o.kind === 'rabbit') { const a = rand(0, 6.28); o.state = 'hop'; o.until = this.time + 1.2; o.target = [o.home[0] + Math.sin(a) * o.radius, o.home[1] + Math.cos(a) * o.radius]; }
    sfx('pop');
    return true;
  }
  listenForTaps() {
    const el = this.world.renderer.domElement; let down = null;
    el.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
    el.addEventListener('pointerup', e => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8 || performance.now() - down.t > 500 || document.querySelector('[data-mode="build"]')) return;
      this.poke(this.pick(e.clientX, e.clientY));
    });
  }
  stats() { return { crows: this.crows.map(c => c.state), others: this.others.map(o => `${o.kind}:${o.state ?? o.water}`) }; }
}
