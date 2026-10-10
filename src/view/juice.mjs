// Game feel (juice package): pops, bounces, particles, smoke and contact shadows for moving things, driven by game
// events. It draws only; it never changes the rules state (TECH-PLAN 2, rule 1).
//   harvested   → the crop pops (a copy swells and vanishes), leaves and soil burst, "+2 🌾 ⭐ +2" floats up
//   placed      → the new thing bounces 0.6 → 1.1 → 1 in a ring of dust
//   producing   → smoke puffs from the chimney (ANCHORS[model].chimney from the art kit, else found in the model) and
//                 the feed mill's sails turn (ANCHORS.feed_mill.sails); a working building breathes
//   collected, produced, fed, cleared, queued … → small bursts and squishes
//   a tap on the map → a ring on the cell and a squish of what is there
// Reachable as world.juice: pop(cell) for the radial sweep, burst(), ring().
import * as THREE from 'three';
import { CELL, BARN, FARMHOUSE, ORDER_BOARD, MAILBOX, POND } from '../content/world.mjs';
import { BUILDINGS, footprint } from '../content/buildings.mjs';
import { GOODS, CROPS } from '../content/goods.mjs';
import { XP } from '../content/economy.mjs';
import { occupant } from '../core/grid.mjs';
import { iconHtml } from '../ui/icon.mjs';
import { tickSway } from '../kit/toon.mjs';
import { sfx } from '../kit/sound.mjs';
import * as KINDS from './kinds.mjs';
import { loadKit, bake } from './models.mjs';
import { pickedFlow } from './collect-flow.mjs';
import { Particles, SHAPE } from './particles.mjs';
import { STANDINS, ShadowLayer } from './batches.mjs';

const CROP_COLORS = {
  wheat: ['#f4c542', '#e9a93a', '#8fd14f'], carrot: ['#ff8a2a', '#5fbf3a', '#8fd14f'], corn: ['#ffd23f', '#6cc04a', '#a4dc5a'],
  pumpkin: ['#ff8c1a', '#4fae3a', '#8fd14f'],
};
const SOIL = ['#7a4a2a', '#9a6a44', '#5e3a20'];
const GOLD = '#ffd84a';
// the gold ramp (shadow, body, light, glint) and the fruit colours the pick bursts use
const GOLD_RAMP = ['#956020', '#e8aa24', '#ffe18a', '#fff6d8'];
const FRUIT_COLORS = { cherry: ['#ce3f59', '#e85d75', '#9b2a44'], apple: ['#e8453c', '#ff7a5a', '#b02a2a'], peach: ['#ffa07a', '#ffc2a0', '#e8845e'] };
const LEAF_COLORS = ['#3a8444', '#4fab45', '#8fd04c'];
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const quietNow = () => document.body.classList.contains('reduced-motion');
/** Anchors published by the art package (kinds.mjs ANCHORS[model] = { chimney: [x, y, z], sails: [x, y, z], ... }), if any. */
const anchorsOf = name => (Reflect.get(KINDS, 'ANCHORS') ?? {})[name] ?? null;
// an anchor is [x, y, z], {x, y, z}, or (as art/blender/anchors.mjs writes them) a list of points: the first one counts
const vec = a => a == null ? null : Array.isArray(a) ? (Array.isArray(a[0]) || (a[0] && typeof a[0] === 'object') ? vec(a[0]) : a) : [a.x, a.y, a.z];
const FIXED = [['farmhouse', FARMHOUSE, 5], ['barn', BARN, 4.5], ['order_board', ORDER_BOARD, 1.2], ['mailbox', MAILBOX, 1]];

export class Juice {
  constructor(world, game, app) {
    Object.assign(this, { world, game, app, popped: new Map(), chimneys: new Map(), sails: new Map(), floaters: [], lastSmoke: new Map(), clock: 0 });
    world.juice = this;
    // two pools, 300 particles in all: on top (leaves, stars, coins) and in the scene (dust, rings, smoke)
    this.particles = new Particles(world.scene, 200, { onTop: true });
    this.ground = new Particles(world.scene, 100, { onTop: false });
    this.particles.budget = this.ground.budget = matchMedia?.('(pointer: coarse)').matches ? 0.75 : 1;
    this.moving = new MovingShadows(world);
    this.css();
    game.on((r, action) => { if (r.ok !== false) this.events(r.events ?? [], action); });
    world.onFrame((dt, now) => this.frame(dt, now));
    this.attachTap(world.renderer.domElement);
  }
  get s() { return this.game.s; }
  /** Particles alive in both pools. */
  get alive() { return this.particles.alive + this.ground.alive; }
  get b() { return this.world.batches; }

  // ── frame ──
  frame(dt, now) {
    const quiet = quietNow();
    tickSway(dt, quiet); this.b.quiet = quiet;
    this.particles.update(dt); this.ground.update(dt);
    this.moving.update();
    this.clock += dt;
    if (this.clock > 0.2) { this.work(this.clock, now); this.clock = 0; }
    this.spinSails(dt);
  }
  /** Producing buildings: smoke, sails and a gentle working bob (checked five times a second). */
  work(dt, now) {
    const s = this.s, t = this.game.now, quiet = quietNow();
    const active = new Set();
    for (const [id, p] of Object.entries(s.placed)) {
      const def = BUILDINGS[p.kind]; if (!def?.produces) continue;
      const job = s.production[id]?.queue?.[0], busy = !!job && job.doneAt > t;
      if (busy) active.add(id);
      if (this.sailsWanted(id, p)) this.sails.get(id).speed = busy ? 3.2 : 0.5;
      if (!busy || quiet) continue;
      const smokeAt = p.kind === 'cannery' && s.valley?.green ? null : this.anchorWorld(id, p, 'chimney');   // a green cannery has a filter on its chimney (core/valley.mjs)
      if (smokeAt && now - (this.lastSmoke.get(id) ?? 0) > 300) { this.lastSmoke.set(id, now); this.smoke(smokeAt, 1); }
      if (now - (this.lastSmoke.get(`bob:${id}`) ?? 0) > 1300) { this.lastSmoke.set(`bob:${id}`, now); this.b.pulse(id, { from: 0.97, to: 1.035, ms: 700, squash: true }); }
    }
    // the farmhouse chimney smokes gently all day
    if (!quiet) {
      const fh = this.b.items.get('farmhouse'), at = fh && this.fixedAnchor('farmhouse', fh, 'chimney');
      if (at && now - (this.lastSmoke.get('farmhouse') ?? 0) > 900) { this.lastSmoke.set('farmhouse', now); this.smoke(at, 0.8); }
    }
    for (const id of this.sails.keys()) if (!s.placed[id]) { this.b.remove(`sails:${id}`); this.sails.delete(id); }
  }
  /** World position of a named anchor on a placed building, or null. */
  anchorWorld(id, p, name) {
    const it = this.b.items.get(id); if (!it) return null;
    return this.fixedAnchor(it.model, it, name, p.kind);
  }
  fixedAnchor(model, it, name, kind) {
    let a = vec(anchorsOf(model)?.[name] ?? (kind ? anchorsOf(kind)?.[name] : null));
    if (!a && name === 'chimney') a = this.findChimney(model);
    if (!a) return null;
    const r = it.rot ?? 0, c = Math.cos(r), sn = Math.sin(r), k = it.scale ?? 1;
    return new THREE.Vector3(it.x + (a[0] * c + a[2] * sn) * k, (it.y ?? 0) + a[1] * k, it.z + (-a[0] * sn + a[2] * c) * k);
  }
  /** Until the art kit publishes anchors: a chimney is the model's highest point when that point is a dark, sooty cap
   *  (the farm kits paint chimney tops near black). Roofs, sails and flags at the top are not dark, so they get none. */
  findChimney(model) {
    if (this.chimneys.has(model)) return this.chimneys.get(model);
    const m = this.b.models.get(model); let out = null;
    if (m) {
      const p = m.geo.attributes.position, c = m.geo.attributes.color, top = m.geo.boundingBox.max.y;
      let x = 0, z = 0, n = 0, dark = true;
      for (let i = 0; i < p.count; i++) {
        if (p.getY(i) < top - 0.03) continue;
        if (Math.max(c.getX(i), c.getY(i), c.getZ(i)) > 0.14) { dark = false; break; }
        x += p.getX(i); z += p.getZ(i); n++;
      }
      if (dark && n) out = [x / n, top + 0.05, z / n];
    }
    this.chimneys.set(model, out);
    return out;
  }
  /** The feed mill's sails: drawn as their own instance at ANCHORS.feed_mill.sails when the kit has a sails model. */
  sailsWanted(id, p) {
    if (this.sails.has(id)) return true;
    if (p.kind !== 'feed_mill' || !this.b.items.has(id)) return false;
    const at = this.anchorWorld(id, p, 'sails'); if (!at) return false;
    if (!this.b.has('feed_mill_sails')) { this.loadSails(); return false; }
    const it = this.b.items.get(id), axis = this.sailsAxis ?? 'z';
    this.sails.set(id, { angle: 0, speed: 0.5, axis });
    this.b.set(`sails:${id}`, { model: 'feed_mill_sails', x: at.x, z: at.z, y: at.y, rot: it.rot ?? 0, roll: 0, rollAxis: axis });
    return true;
  }
  /** Bake the sails node (feed_mill_sails) at the mill's own scale, centred on its hub. */
  loadSails() {
    if (this.sailsLoading) return; this.sailsLoading = true;
    const spec = KINDS.KIND_MODELS?.feed_mill; if (!spec) return;
    loadKit(spec.kit).then(kit => {
      const mill = kit[spec.node], sails = kit[`${spec.node}_sails`] ?? kit.feed_mill_sails;
      if (!mill || !sails || this.b.has('feed_mill_sails')) return;
      const raw = bake(mill.clone()).boundingBox.getSize(new THREE.Vector3()), k = spec.width ? spec.width / Math.max(raw.x, raw.z) : spec.height / raw.y;
      const g = bake(sails.clone()); g.computeBoundingBox(); const size = g.boundingBox.getSize(new THREE.Vector3());
      g.translate(0, -size.y / 2, 0).scale(k, k, k); g.computeBoundingBox(); g.computeBoundingSphere();
      this.sailsAxis = size.x < size.z ? 'x' : 'z';     // the sails turn about their thinnest side
      this.b.register('feed_mill_sails', { geo: g, kind: 'static' });
    }).catch(() => {});
  }
  spinSails(dt) {
    for (const [id, sl] of this.sails) { sl.angle = (sl.angle + sl.speed * dt) % (Math.PI * 2); this.b.patch(`sails:${id}`, { roll: sl.angle }); }
  }

  // ── events ──
  events(list, action) {
    if (!list.length) return;
    const harvest = list.filter(e => e.type === 'harvested');
    if (harvest.length) this.harvested(harvest);
    const picks = list.filter(e => e.type === 'picked');
    if (picks.length) this.picked(picks, list);
    let cleared = 0;
    for (const e of list) {
      if (e.type === 'placed') this.placed(e);
      else if (e.type === 'moved') { this.b.pulse(e.id, { from: 0.8, to: 1.08, ms: 320 }); this.dustAt(e.id); }
      else if (e.type === 'cellChanged' && action === 'clear' && cleared++ < 6) this.cleared(e.x, e.z);
      else if (e.type === 'cellChanged' && action === 'place' && cleared++ < 6) this.dust((e.x + 0.5) * CELL, (e.z + 0.5) * CELL, 1);
      else if (e.type === 'collected' || e.type === 'fed' || e.type === 'animalArrived') this.voice(e.home ?? this.lastHome);
      if (e.type === 'collected') { this.sparkleAt(e.home, 6); this.b.pulse(e.home, { from: 0.86, to: 1.08, ms: 300, squash: true }); }
      else if (e.type === 'produced') { this.sparkleAt(e.building, 8); this.b.pulse(e.building, { from: 0.88, to: 1.08, ms: 320, squash: true }); }
      else if (e.type === 'queued') { this.b.pulse(e.building, { from: 0.9, to: 1.06, ms: 300, squash: true }); const at = this.centreOf(e.building); if (at) this.smoke(at.setY(1.5), 0.6); }
      else if (e.type === 'fed') this.grainAt(action === 'feed' ? this.lastHome : null);
      else if (e.type === 'animalArrived') { this.b.pulse(e.home, { from: 0.9, to: 1.06, ms: 300, squash: true }); this.dustAt(e.home); }
      else if (e.type === 'fishCaught' && (e.rare || e.fish === 'goldfish')) this.goldenCatch(e);
      else if (e.type === 'stallSold' || e.type === 'fruitSold') this.waiting(e.type);
      else if (e.type === 'levelUp') this.celebrate();
      else if (e.type === 'projectDone' || e.type === 'harvestFestivalStarted') this.celebrate(true);
    }
  }
  harvested(list) {
    const totals = new Map(); let xp = 0, first = null;
    list.forEach((e, n) => {
      const p = this.s.placed[e.id]; if (!p) return;
      totals.set(e.crop, (totals.get(e.crop) ?? 0) + e.count); xp += XP.harvest * e.count;
      first ??= p;
      if (n < 12) this.popCell(p.x, p.z, e.crop, list.length > 4 ? 0.55 : 1);
      else { const id = `crop:${e.id}`; this.b.remove(id); }
    });
    if (!first) return;
    sfx('harvest');
    const parts = [...totals].map(([crop, n]) => `<span class="jf-item">${iconHtml(crop, GOODS[crop]?.icon ?? CROPS[crop]?.icon ?? '')}<b>+${n}</b></span>`);
    this.floater((first.x + 0.5) * CELL, 1.2, (first.z + 0.5) * CELL, parts.join('') + `<span class="jf-xp">⭐<b>+${Math.round(xp)}</b></span>`);
  }
  /** Fruit picked: the tree shakes and squashes, fruit and leaves fall, one small gold star and a few glints, a soft pick
   *  sound, and a "+n" for what really went into the barn. Restrained: it never grants or changes anything. */
  picked(list, all) {
    const flow = pickedFlow(all), seen = new Set();   // (the sound is routed by main.mjs)
    list.forEach((e, n) => {
      const p = this.s.placed[e.id]; if (!p) return;
      this.b.pulse(e.id, { from: 0.9, to: 1.05, ms: 300, squash: true });
      if (n >= 6 || seen.has(e.id) || quietNow()) return;
      seen.add(e.id);
      const cx = (p.x + 0.5) * CELL, cz = (p.z + 0.5) * CELL, fruit = FRUIT_COLORS[e.good] ?? FRUIT_COLORS.apple, busy = this.particles.alive > 130 ? 0.5 : 1;
      for (let i = 0; i < Math.round(8 * busy); i++) {   // fruit falling from the canopy
        const a = rand(0, Math.PI * 2), sp = rand(0.6, 1.8);
        this.particles.spawn({ x: cx + rand(-0.9, 0.9), y: rand(2.2, 3.4), z: cz + rand(-0.9, 0.9), vx: Math.cos(a) * sp, vy: rand(0.5, 2), vz: Math.sin(a) * sp, gravity: 12, drag: 0.6,
          life: rand(0.55, 0.8), size: rand(0.24, 0.34), size1: 0.22, shape: SHAPE.dot, color: pick(fruit) });
      }
      for (let i = 0; i < Math.round(7 * busy); i++) {   // leaves shaken loose
        const a = rand(0, Math.PI * 2), sp = rand(0.5, 1.5);
        this.particles.spawn({ x: cx + rand(-1.1, 1.1), y: rand(2.4, 3.6), z: cz + rand(-1.1, 1.1), vx: Math.cos(a) * sp, vy: rand(0.2, 1.4), vz: Math.sin(a) * sp, gravity: 3.5, drag: 1.4,
          life: rand(0.9, 1.3), size: rand(0.45, 0.65), size1: 0.3, shape: SHAPE.leaf, color: pick(LEAF_COLORS), rot: rand(0, 6.3), spin: rand(-6, 6) });
      }
      this.particles.spawn({ x: cx, y: 3.4, z: cz, vy: 1.4, drag: 2, life: 0.5, size: 0.55, size1: 1.2, shape: SHAPE.star, color: GOLD_RAMP[2], spin: 3 });
      for (let i = 0; i < Math.round(3 * busy); i++) {   // a few warm glints on the fruit
        const a = rand(0, Math.PI * 2);
        this.particles.spawn({ x: cx + Math.cos(a) * 0.9, y: rand(2.4, 3.2), z: cz + Math.sin(a) * 0.9, vx: Math.cos(a) * 0.8, vy: rand(0.6, 1.4), vz: Math.sin(a) * 0.8, drag: 3, life: rand(0.35, 0.5), size: rand(0.3, 0.42), size1: 0.05, shape: SHAPE.star, color: GOLD_RAMP[3], spin: rand(-4, 4) });
      }
    });
    const first = this.s.placed[list[0].id]; if (!first) return;
    const parts = [...flow.picked].map(([good, n]) => `<span class="jf-item">${iconHtml(good, GOODS[good]?.icon ?? '')}${flow.exact ? `<b>+${flow.stored.get(good) ?? 0}</b>` : ''}</span>`);
    this.floater((first.x + 0.5) * CELL, 3.6, (first.z + 0.5) * CELL, parts.join(''));
  }
  /** A golden carp is a notable catch: a gold ring on the water, a fountain of gold stars, a chime and a gold-ringed floater.
   *  Only the look: whether it is rare or a first is logic's to say (the event names the fish, nothing more). */
  goldenCatch(e) {
    const x = (POND.x0 + POND.x1 + 1) / 2 * CELL, z = (POND.z0 + POND.z1 + 1) / 2 * CELL;
    if (!quietNow()) {   // (the sound is routed by main.mjs: a cheer for a first rare catch)
      this.ground.spawn({ x, y: 0.1, z, life: 0.9, size: 1.2, size1: 5.5, shape: SHAPE.ring, flat: true, color: GOLD_RAMP[2], alpha: 0.9 });
      this.ground.spawn({ x, y: 0.1, z, life: 1.2, size: 0.6, size1: 4, shape: SHAPE.ring, flat: true, color: GOLD_RAMP[1], alpha: 0.7, fadeIn: 0.1 });
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2, sp = rand(1.2, 2.4);
        this.particles.spawn({ x: x + Math.cos(a) * 0.5, y: 0.5, z: z + Math.sin(a) * 0.5, vx: Math.cos(a) * sp, vy: rand(4, 6.5), vz: Math.sin(a) * sp, gravity: 11, drag: 0.8,
          life: rand(0.9, 1.3), size: rand(0.45, 0.7), size1: 0.2, shape: i % 4 ? SHAPE.star : SHAPE.coin, color: i % 4 ? pick(GOLD_RAMP.slice(1)) : '#ffd23a', spin: rand(-5, 5) });
      }
    }
    this.floater(x, 1.6, z, `<span class="jf-item jf-gold">${iconHtml(e.fish, GOODS[e.fish]?.icon ?? '')}<b>★</b></span>`);
  }
  /** Takings waiting at a stall or the fruit stand: a small glint and a nod from the stand. The money stays there until
   *  it is collected, so nothing flies to the wallet (the gold coin marker over the stand says "collect me"). */
  waiting(type) {
    const kind = type === 'fruitSold' ? 'fruitStand' : 'stall';
    const id = Object.keys(this.s.placed).find(k => BUILDINGS[this.s.placed[k].kind]?.[kind]); if (!id) return;
    this.b.pulse(id, { from: 0.96, to: 1.03, ms: 260, squash: true });
    this.sparkleAt(id, 3);
  }
  /** The radial sweep's pop: whatever stands on the cell pops (once per 0.4 s per cell). */
  pop(cell) {
    if (!cell) return;
    const id = occupant(this.s, cell.x, cell.z), crop = id && this.s.beds[id]?.crop;
    this.popCell(cell.x, cell.z, crop ?? this.b.items.get(`crop:${id}`)?.model?.slice(5), 1);
  }
  popCell(x, z, crop, amount = 1) {
    const key = `${x},${z}`, now = performance.now();
    if (now - (this.popped.get(key) ?? -1e9) < 400) return;
    this.popped.set(key, now);
    if (this.popped.size > 300) for (const [k, t] of this.popped) if (now - t > 2000) this.popped.delete(k);
    const id = occupant(this.s, x, z), cropId = id && `crop:${id}`;
    if (cropId && this.b.items.has(cropId)) { this.b.popCopy(cropId); this.b.remove(cropId); }
    else if (id && this.b.items.has(id)) this.b.pulse(id, { from: 0.8, to: 1.12, ms: 300, squash: true });
    if (quietNow()) return;
    const cx = (x + 0.5) * CELL, cz = (z + 0.5) * CELL, colors = CROP_COLORS[crop] ?? CROP_COLORS.wheat;
    const busy = this.particles.alive > 130 ? 0.4 : 1, n = Math.round(12 * amount * busy);
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), sp = rand(1.2, 3);
      this.particles.spawn({ x: cx + rand(-0.3, 0.3), y: 0.5, z: cz + rand(-0.3, 0.3), vx: Math.cos(a) * sp, vy: rand(3, 5.5), vz: Math.sin(a) * sp, gravity: 11, drag: 1.2,
        life: rand(0.6, 0.95), size: rand(0.5, 0.75), size1: 0.3, shape: i % 3 === 2 ? SHAPE.dot : SHAPE.leaf, color: i % 3 === 2 ? pick(SOIL) : pick(colors), rot: rand(0, 6.3), spin: rand(-9, 9) });
    }
    for (let i = 0; i < Math.round(3 * amount * busy); i++) this.ground.spawn({ x: cx + rand(-0.4, 0.4), y: 0.1, z: cz + rand(-0.4, 0.4), vx: rand(-0.6, 0.6), vy: rand(0.4, 0.9), vz: rand(-0.6, 0.6), drag: 2, life: 0.6, size: 0.7, size1: 1.4, shape: SHAPE.dot, color: '#e2c79a', alpha: 0.6 });
    if (amount >= 1) this.particles.spawn({ x: cx, y: 1.1, z: cz, vy: 1.6, drag: 2, life: 0.55, size: 0.6, size1: 1.3, shape: SHAPE.star, color: GOLD, spin: 4 });
    for (let i = 0; i < Math.round(3 * amount * busy); i++) {        // a few white glints
      const a = rand(0, Math.PI * 2);
      this.particles.spawn({ x: cx + Math.cos(a) * 0.5, y: rand(0.8, 1.4), z: cz + Math.sin(a) * 0.5, vx: Math.cos(a) * 1.2, vy: rand(1, 2), vz: Math.sin(a) * 1.2, drag: 3, life: rand(0.35, 0.55), size: rand(0.35, 0.5), size1: 0.05, shape: SHAPE.star, color: '#ffffff', spin: rand(-6, 6) });
    }
  }
  placed(e) {
    const def = BUILDINGS[e.kind]; if (!def || def.cell) return;
    this.b.pulse(e.id, { from: 0.6, to: 1.1, ms: 420 });
    const [w, d] = footprint(e.kind, e.rot ?? 0);
    this.dust((e.x + w / 2) * CELL, (e.z + d / 2) * CELL, Math.max(w, d) * CELL * 0.55);
  }
  /** Dust round a placed thing's footprint. */
  dustAt(id) {
    const c = this.centreOf(id), p = this.s.placed[id]; if (!c) return;
    const [w, d] = p ? footprint(p.kind, p.rot ?? 0) : [1, 1]; this.dust(c.x, c.z, Math.max(w, d) * CELL * 0.55);
  }
  /** A ring of dust puffs round a footprint of radius r (metres), and a flat ring that spreads from its edge. */
  dust(x, z, r = 1) {
    if (quietNow()) return;
    const n = Math.round(6 + r * 2.5);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rand(-0.2, 0.2);
      this.ground.spawn({ x: x + Math.cos(a) * r, y: 0.15, z: z + Math.sin(a) * r, vx: Math.cos(a) * rand(1.2, 2.4), vy: rand(0.4, 1.2), vz: Math.sin(a) * rand(1.2, 2.4), drag: 3,
        life: rand(0.5, 0.8), size: rand(0.5, 0.8), size1: rand(1.1, 1.6), shape: SHAPE.dot, color: pick(['#e8d4b0', '#f3e6c8', '#d9bf8e']), alpha: 0.75 });
    }
    this.ground.spawn({ x, y: 0.08, z, life: 0.5, size: r * 2.1, size1: r * 3.2, shape: SHAPE.ring, flat: true, color: '#fff4dc', alpha: 0.7 });
  }
  cleared(x, z) {
    if (quietNow()) return;
    const cx = (x + 0.5) * CELL, cz = (z + 0.5) * CELL;
    for (let i = 0; i < 8; i++) {
      const a = rand(0, Math.PI * 2), sp = rand(1, 2.6);
      this.particles.spawn({ x: cx, y: 0.4, z: cz, vx: Math.cos(a) * sp, vy: rand(2.5, 4.5), vz: Math.sin(a) * sp, gravity: 10, drag: 1, life: rand(0.5, 0.8), size: rand(0.25, 0.4), size1: 0.15,
        shape: i % 2 ? SHAPE.leaf : SHAPE.dot, color: i % 2 ? pick(['#5fbf3a', '#79cf48', '#4a9e2e']) : pick(['#9a8f80', '#b8ad9c', '#7a4a2a']), rot: rand(0, 6), spin: rand(-8, 8) });
    }
    this.dust(cx, cz, 0.9);
  }
  /** A soft puff of smoke rising and drifting with the wind. */
  smoke(at, k = 1) {
    this.ground.spawn({ x: at.x + rand(-0.08, 0.08), y: at.y, z: at.z + rand(-0.08, 0.08), vx: 0.25 + rand(-0.1, 0.1), vy: rand(0.7, 1.0) * k, vz: 0.12, drag: 0.4,
      life: rand(2.0, 2.6), size: 0.55 * k, size1: 1.9 * k, shape: SHAPE.dot, color: pick(['#ffffff', '#f6f2ec', '#ece6de']), alpha: 0.9, fadeIn: 0.1 });
  }
  sparkleAt(id, n = 6) {
    const c = this.centreOf(id); if (!c || quietNow()) return;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      this.particles.spawn({ x: c.x + Math.cos(a) * 0.6, y: 2 + rand(0, 1), z: c.z + Math.sin(a) * 0.6, vx: Math.cos(a) * 1.5, vy: rand(1.5, 3), vz: Math.sin(a) * 1.5, drag: 2.5, gravity: 1.5,
        life: rand(0.6, 0.9), size: rand(0.35, 0.55), size1: 0.1, shape: SHAPE.star, color: pick([GOLD, '#fff3a0', '#ffffff']), spin: rand(-5, 5) });
    }
  }
  grainAt(id) {
    const c = id && this.centreOf(id); if (!c || quietNow()) return;
    for (let i = 0; i < 10; i++) this.particles.spawn({ x: c.x + rand(-1.5, 1.5), y: 1.6, z: c.z + rand(-1.5, 1.5), vy: rand(-0.5, 0.5), gravity: 9, life: 0.7, size: 0.16, shape: SHAPE.dot, color: pick(['#f1c24a', '#d9a23a', '#ffe08a']) });
  }
  /** Level up and finished projects: a fountain of stars and coins at the middle of the view. */
  celebrate(big = false) {
    if (quietNow()) return;
    const cam = this.world.cam, n = big ? 40 : 28;
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), sp = rand(2, 5);
      this.particles.spawn({ x: cam.x + rand(-0.5, 0.5), y: 1, z: cam.z + rand(-0.5, 0.5), vx: Math.cos(a) * sp, vy: rand(6, 10), vz: Math.sin(a) * sp, gravity: 12, drag: 0.6,
        life: rand(1.1, 1.6), size: rand(0.5, 0.8), size1: 0.4, shape: i % 3 ? SHAPE.star : SHAPE.coin, color: i % 3 ? pick([GOLD, '#ff7ab0', '#7fd8ff', '#9dff7a']) : '#ffc928', spin: rand(-6, 6) });
    }
  }
  /** The animals of a home answer: a cluck, a moo or an oink. */
  voice(home) {
    const kind = BUILDINGS[this.s.placed[home]?.kind]?.animals;
    const clip = { hen: 'cluck', cow: 'moo', pig: 'oink' }[kind]; if (clip) sfx(clip);
  }
  centreOf(id) {
    const it = this.b.items.get(id); if (it) return new THREE.Vector3(it.x, 0, it.z);
    const p = this.s.placed[id]; if (!p) return null;
    const [w, d] = footprint(p.kind, p.rot ?? 0); return new THREE.Vector3((p.x + w / 2) * CELL, 0, (p.z + d / 2) * CELL);
  }

  // ── taps ──
  attachTap(el) {
    let down = null;
    el.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, t: performance.now(), n: (down?.n ?? 0) + 1 }; });
    el.addEventListener('pointerup', e => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8 || performance.now() - down.t > 500) return;
      const cell = this.world.cellAt(e.clientX, e.clientY); if (cell) this.tap(cell);
    });
  }
  /** A tap: a ring on the cell and a squish of the thing on it. */
  tap(cell) {
    const id = occupant(this.s, cell.x, cell.z);
    if (id && BUILDINGS[this.s.placed[id]?.kind]?.animals) this.lastHome = id;
    const target = id ? (this.b.items.has(`crop:${id}`) ? `crop:${id}` : id) : this.b.items.has(`c${cell.x},${cell.z}`) ? `c${cell.x},${cell.z}` : FIXED.find(([, at, r]) => Math.hypot(cell.x - at.x, cell.z - at.z) <= r)?.[0];
    if (target) this.b.pulse(target, { from: 0.84, to: 1.07, ms: 260, squash: true });
    if (quietNow()) return;
    this.ground.spawn({ x: (cell.x + 0.5) * CELL, y: 0.07, z: (cell.z + 0.5) * CELL, life: 0.3, size: 1.3, size1: 2.6, shape: SHAPE.ring, flat: true, color: '#ffffff', alpha: 0.9 });
  }

  // ── floating numbers ──
  floater(x, y, z, html) {
    const v = new THREE.Vector3(x, y, z).project(this.world.cam.camera);
    const el = document.createElement('div'); el.className = 'jfloat'; el.innerHTML = html;
    el.style.left = `${(v.x + 1) / 2 * innerWidth}px`; el.style.top = `${(1 - v.y) / 2 * innerHeight}px`;
    this.app.appendChild(el); this.floaters.push(el);
    while (this.floaters.length > 5) this.floaters.shift().remove();
    setTimeout(() => { el.remove(); const i = this.floaters.indexOf(el); if (i >= 0) this.floaters.splice(i, 1); }, 1300);
  }
  css() {
    if (document.getElementById('juice-css')) return;
    const st = document.createElement('style'); st.id = 'juice-css';
    st.textContent = `.jfloat { position: fixed; z-index: 9; pointer-events: none; transform: translate(-50%, -100%); display: flex; gap: 6px; align-items: center;
  font: 900 26px/1 Nunito, system-ui, sans-serif; color: #fff; -webkit-text-stroke: 2px #5a3410; paint-order: stroke fill; text-shadow: 0 3px 0 rgba(90,52,16,.55);
  animation: jfloat 1.25s cubic-bezier(.2,.9,.3,1) forwards; white-space: nowrap; }
.jfloat .jf-item, .jfloat .jf-xp { display: inline-flex; align-items: center; gap: 2px; }
.jfloat img { width: 34px; height: 34px; -webkit-text-stroke: 0; }
.jfloat .jf-xp b { color: #fff1a8; }
@keyframes jfloat { 0% { opacity: 0; transform: translate(-50%, -60%) scale(.5); } 14% { opacity: 1; transform: translate(-50%, -110%) scale(1.15); }
  28% { transform: translate(-50%, -120%) scale(1); } 75% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%, -260%) scale(.95); } }
.jfloat .jf-gold { filter: drop-shadow(0 0 6px #ffe18a); } .jfloat .jf-gold b { color: #ffe18a; -webkit-text-stroke: 2px #956020; }
body.reduced-motion .jfloat { animation: jfloat-q 1.2s linear forwards; }
@keyframes jfloat-q { 0%, 70% { opacity: 1; } 100% { opacity: 0; } }`;
    document.head.appendChild(st);
  }
}

/** Blobs under things that move outside the batches: the herds (instanced, found by their model) and anything that
 *  sets object.userData.blob = radius (the cast package's animated actors). One draw, rewritten each frame. */
class MovingShadows {
  constructor(world) {
    this.world = world; this.cap = 128; this.found = []; this.scanAt = 0;
    this.layer = new ShadowLayer(world.scene, world.batches.shadowMaterial, this.cap);
    this.v = new THREE.Vector3(); this.m = new THREE.Matrix4();
  }
  scan() {
    const b = this.world.batches, radius = new Map();
    for (const m of b.models.values()) if (m.kind === 'animal') {
      const s = m.geo.boundingBox.getSize(new THREE.Vector3()), r = Math.max(s.x, s.z) * 0.95 + 0.2;
      radius.set(m.geo, r); radius.set(m.mid, r);
    }
    radius.set(STANDINS.animal, 1.3);
    this.found = [];
    this.world.scene.traverse(o => {
      if (o.userData.blob) this.found.push({ o, r: o.userData.blob });
      else if (o.isInstancedMesh && o.userData.blobInst) this.found.push({ o, r: o.userData.blobInst, inst: true });   // the cast's crowds
      else if (o.isInstancedMesh && !o.userData.batch && radius.has(o.geometry)) this.found.push({ o, r: radius.get(o.geometry), inst: true });
    });
  }
  update() {
    const now = performance.now();
    if (now > this.scanAt) { this.scanAt = now + 1000; this.scan(); }
    const L = this.layer, e = this.m.elements; let n = 0;
    L.slots.clear(); L.free.length = 0; L.high = 0;
    for (const f of this.found) {
      if (!f.o.visible || !f.o.parent) continue;
      if (f.inst) {
        for (let i = 0; i < f.o.count && n < this.cap; i++) {
          f.o.getMatrixAt(i, this.m); const k = Math.hypot(e[0], e[1], e[2]);
          if (k < 1e-3) continue;
          L.put(n++, e[12], e[14], f.r * k, f.r * k * 1.15, 0, 0, 0.42);
        }
      } else if (n < this.cap) { f.o.getWorldPosition(this.v); L.put(n++, this.v.x, this.v.z, f.r, f.r, 0, 0, 0.42); }
    }
    L.full = true; L.flush(); L.mesh.count = n;
  }
}
