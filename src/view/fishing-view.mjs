// Fishing tackle follows reserved shore seats. Three shared draws, regardless of how many people fish.
// This view never awards fish or advances the catch clock; those rules belong to core/fishing.
import * as THREE from 'three';
import { CELL } from '../content/world.mjs';
import { POND_SHAPE } from './brook.mjs';
import { loadKitLater } from './models.mjs';
import { BANK, nearestPond, bankSlot } from '../core/pond-bank.mjs';
import { stepCost } from '../core/walk.mjs';
import { bankCount } from '../core/fishing.mjs';
import { FISH_TABLE } from '../content/goods.mjs';

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
    // per-vertex colour: your own line warms from cream to red as its tension rises (view/fishing-play.mjs)
    this.lineColors = new Float32Array(MAX * SEGMENTS * 6).fill(1);
    line.setAttribute('color', new THREE.BufferAttribute(this.lineColors, 3).setUsage(THREE.DynamicDrawUsage));
    this.lines = new THREE.LineSegments(line, new THREE.LineBasicMaterial({ vertexColors: true }));
    this.lines.name = 'fishing-lines'; this.lines.frustumCulled = false; world.scene.add(this.lines);
    game.on((result, action) => {
      if (action === 'load') { this.casts.clear(); this.clearPile(); this.unpacked = true; }
      const packed = result.events?.find(e => e.type === 'catchPacked'); if (packed) this.clearPile(packed.count);
      if (result.events?.some(e => e.type === 'lineCast')) this.casts.delete('you');
    });
    this.leaps = [];
    world.onFrame(dt => this.frame(dt));
  }
  /** Water bursts from the shared effect pools (Juice), so a splash costs no new draws. */
  splash(x, y, z, n = 8, big = false) {
    const p = this.world.juice?.particles, g = this.world.juice?.ground; if (!p) return;
    g?.spawn({ x, y: y + .02, z, shape: 2, flat: true, size: .25, size1: big ? 1.6 : 1.0, life: .7, color: '#e8fbff', alpha: .8 });
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2;
      p.spawn({ x, y: y + .05, z, vx: Math.cos(a) * (big ? 1.4 : .9), vy: (big ? 3.2 : 2.2) + Math.random(), vz: Math.sin(a) * (big ? 1.4 : .9), gravity: 9, size: .14, size1: .05, life: .55, color: '#bfefff' });
    }
  }
  /** The caught fish leaps from the float onto the grass beside you (0.65 s, tumbling) and lies there with the rest
   *  of your catch (Willowmere's bank pile). It is already in the barn; the pile is packed away when you walk off. */
  leap(fish) {
    const from = this.playerFloat, me = this.people.walkers.get('you'); if (!from || !me) return;
    this.splash(from.x, from.y, from.z, 20, true);
    this.world.pondFish?.caught();   // the fish that bit (view/pond-fish.mjs) leaves the water as the catch
    const here = [this.angler?.x ?? me.x, this.angler?.z ?? me.z], pond = nearestPond(this.game.s, ...here).pond;
    const free = (x, z) => stepCost(this.game.s, Math.floor(x / CELL), Math.floor(z / CELL)) > 0;   // open ground only: not a kiosk, a building or the water
    const pile = (this.pile ??= { pond, anchor: here, fish: [], count: 0 }), slot = bankSlot(pile.pond, pile.anchor, pile.count++, free);
    const def = FISH_TABLE.find(f => f.id === fish), id = def?.model ?? fish, size = (def?.len ?? 1) * 1.15;   // a little larger than life, to read beside a 2.3 m villager
    loadKitLater('fish').then(kit => {
      const src = kit[`fish_${id}`]; if (!src || this.pile !== pile) return;
      const o = src.clone(true), box = new THREE.Box3().setFromObject(o), len = Math.max(.01, box.max.z - box.min.z);
      o.scale.setScalar(size / len); o.rotation.order = 'YXZ'; this.world.scene.add(o);
      o.rotation.set(0, slot.rot, Math.PI / 2); o.position.set(0, 0, 0); o.updateMatrixWorld(true);
      const lie = Math.max(.03, -box.setFromObject(o).min.y * .8);   // measured as it will lie on its side; fins sink a little into the grass
      if (pile.fish.length >= BANK.pile) this.world.scene.remove(pile.fish.shift().o);   // the oldest makes room on the grass
      const f = { o, t: 0, from: { ...from }, to: { x: slot.x, y: lie + slot.level * lie * 1.6, z: slot.z }, rot: slot.rot, phase: pile.count * .83, landed: false };
      pile.fish.push(f); this.leaps.push(f);
    }).catch(() => {});
  }
  /** Before a new fish is landed: a catch lying at another spot is packed first, so the new one starts its own. */
  beforeCatch() {
    const me = this.people.walkers.get('you'), pile = this.pile; if (!pile || !me) return;
    if (Math.hypot(pile.anchor[0] - (this.angler?.x ?? me.x), pile.anchor[1] - (this.angler?.z ?? me.z)) > BANK.pack) this.pack();
  }
  /** Pack the catch away (you walked off, went indoors, or started fishing somewhere else): the rules move the fish
   *  into the barn, and their 'catchPacked' event clears the grass (so a catch the rules packed by themselves clears too). */
  pack() {
    if (!this.pile) return;
    if (!this.game.do('packCatch').ok) this.clearPile();   // nothing held any more: just tidy the grass
  }
  clearPile(count = 0) {
    const pile = this.pile; if (!pile) return;
    for (const f of pile.fish) this.world.scene.remove(f.o);
    this.leaps = this.leaps.filter(f => !pile.fish.includes(f));
    this.pile = null; if (count) this.onPacked?.(count);
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
      const play = w.player ? this.play?.state ?? {} : {};
      const ready = w.player && line.doneAt <= this.game.now && !this.play;
      let bob = quiet ? 0 : Math.sin(this.time * (ready ? 5 : 2) + next.length) * (ready ? .07 : .025);
      if (!quiet && play.phase === 'nibble') bob = -.07 * (play.dart ?? 0);
      if (!quiet && play.phase === 'bite') bob = -.22 + Math.sin(this.time * 40) * .04;
      const tip = { x: w.x + ux * 2.1, y: 2.1 + (1 - progress) * .65, z: w.z + uz * 2.1 };
      const point = {
        x: tip.x + (w.x + ux * reach - tip.x) * progress,
        y: tip.y + (water + .14 + bob - tip.y) * progress + Math.sin(progress * Math.PI) * 1.2,
        z: tip.z + (w.z + uz * reach - tip.z) * progress,
      };
      if (w.player && progress >= 1 && !cast.landed) { cast.landed = true; this.splash(point.x, water, point.z, 8); }
      if (w.player && play.phase === 'fight') {   // the fish drags the float about as you reel it toward the bank
        const pull = play.progress * .75, side = Math.sin(this.time * (play.surge ? 14 : 6)) * (play.surge ? .55 : .2) * (1 - play.progress * .6);
        point.x += (w.x + ux * .9 - point.x) * pull - uz * side; point.z += (w.z + uz * .9 - point.z) * pull + ux * side;
        point.y = water + .02 + (play.surge ? Math.abs(Math.sin(this.time * 9)) * .15 : 0);
        if (play.surge && Math.random() < dt * 6) this.splash(point.x, water, point.z, 3);
      }
      if (w.player) this.playerFloat = { x: point.x, y: water, z: point.z, ux, uz };
      const index = next.length;
      a.set(w.x + ux * .35, .9, w.z + uz * .35); b.set(tip.x, tip.y, tip.z);
      direction.subVectors(b, a); const length = direction.length(); rotation.setFromUnitVectors(up, direction.normalize());
      matrix.compose(a.add(b).multiplyScalar(.5), rotation, scale.set(1, length, 1)); this.rods.setMatrixAt(index, matrix);
      matrix.makeScale(1, ready ? 1.3 : 1, 1).setPosition(point.x, point.y, point.z); this.floats.setMatrixAt(index, matrix);
      // slack while waiting, taut and trembling in a fight (cute_game's line), warming to red with the tension
      const tension = play.phase === 'fight' ? play.tension : 0, sag = play.phase === 'fight' ? .04 : progress >= 1 ? .35 : .12;
      const tremble = quiet ? 0 : Math.sin(this.time * 60) * tension * .06;
      for (let s = 0; s < SEGMENTS; s++) for (let end = 0; end < 2; end++) {
        const f = (s + end) / SEGMENTS, offset = (index * SEGMENTS * 2 + s * 2 + end) * 3, mid = Math.sin(f * Math.PI);
        this.positions[offset] = tip.x + (point.x - tip.x) * f;
        this.positions[offset + 1] = tip.y + (point.y - tip.y) * f - mid * sag + mid * tremble;
        this.positions[offset + 2] = tip.z + (point.z - tip.z) * f;
        this.lineColors[offset] = 1; this.lineColors[offset + 1] = .96 - .7 * tension; this.lineColors[offset + 2] = .89 - .7 * tension;
      }
      next.push({ id: w.id, pond: pondId, ...point });
    }
    for (const id of this.casts.keys()) if (!active.has(id)) this.casts.delete(id);
    // You on foot at the bank (ui/explore-mode.mjs sets this.angler): the rod is out over the water; with a line out, the
    // float flies to where you cast and the same bite and fight play out as from a seat.
    const g = this.angler;
    if (g && next.length < MAX && !active.has('you')) {
      const water = g.pond.surface, has = !!line && !!g.cast, aim = g.cast ?? [g.pond.x, g.pond.z], play = has ? this.play?.state ?? {} : {};
      const dx = aim[0] - g.x, dz = aim[1] - g.z, dist = Math.hypot(dx, dz) || 1, carried = !has && Number.isFinite(g.yaw);
      const ux = carried ? Math.sin(g.yaw) : dx / dist, uz = carried ? Math.cos(g.yaw) : dz / dist;   // carried over the shoulder until you cast
      const progress = has ? quiet ? 1 : Math.min(1, (this.time - g.castAt) / .5) : 0;
      const tip = has ? { x: g.x + ux * 1.9, y: 2.25 + (1 - progress) * .5, z: g.z + uz * 1.9 } : { x: g.x + uz * .5 - ux * .7, y: 2.9, z: g.z - ux * .5 - uz * .7 };   // over the shoulder
      let bob = quiet ? 0 : Math.sin(this.time * 2) * .025;
      if (!quiet && play.phase === 'nibble') bob = -.07 * (play.dart ?? 0);
      if (!quiet && play.phase === 'bite') bob = -.22 + Math.sin(this.time * 40) * .04;
      const point = { x: tip.x + (aim[0] - tip.x) * progress, y: tip.y + (water + .14 + bob - tip.y) * progress + Math.sin(progress * Math.PI) * 1.6, z: tip.z + (aim[1] - tip.z) * progress };
      if (has && progress >= 1 && !g.landed) { g.landed = true; this.splash(point.x, water, point.z, 8); }
      if (play.phase === 'fight') {
        const pull = play.progress * .8, side = Math.sin(this.time * (play.surge ? 14 : 6)) * (play.surge ? .55 : .2) * (1 - play.progress * .6);
        point.x += (g.x + ux * 1.2 - point.x) * pull - uz * side; point.z += (g.z + uz * 1.2 - point.z) * pull + ux * side;
        point.y = water + .02 + (play.surge ? Math.abs(Math.sin(this.time * 9)) * .15 : 0);
        if (play.surge && Math.random() < dt * 6) this.splash(point.x, water, point.z, 3);
      }
      const index = next.length, end = has ? point : tip;
      if (has) a.set(g.x + ux * .35, 1.0, g.z + uz * .35); else a.set(g.x + uz * .34 + ux * .25, 1.05, g.z - ux * .34 + uz * .25);
      b.set(tip.x, tip.y, tip.z);
      direction.subVectors(b, a); const length = direction.length(); rotation.setFromUnitVectors(up, direction.normalize());
      matrix.compose(a.add(b).multiplyScalar(.5), rotation, scale.set(1, length, 1)); this.rods.setMatrixAt(index, matrix);
      matrix.makeScale(has ? 1 : 0, has ? 1 : 0, has ? 1 : 0).setPosition(end.x, end.y, end.z); this.floats.setMatrixAt(index, matrix);
      const tension = play.phase === 'fight' ? play.tension : 0, sag = play.phase === 'fight' ? .04 : progress >= 1 ? .35 : .12, tremble = quiet ? 0 : Math.sin(this.time * 60) * tension * .06;
      for (let k = 0; k < SEGMENTS; k++) for (let e = 0; e < 2; e++) {
        const f = (k + e) / SEGMENTS, offset = (index * SEGMENTS * 2 + k * 2 + e) * 3, mid = Math.sin(f * Math.PI);
        this.positions[offset] = tip.x + (end.x - tip.x) * f; this.positions[offset + 1] = tip.y + (end.y - tip.y) * f - mid * (has ? sag - tremble : 0); this.positions[offset + 2] = tip.z + (end.z - tip.z) * f;
        this.lineColors[offset] = 1; this.lineColors[offset + 1] = .96 - .7 * tension; this.lineColors[offset + 2] = .89 - .7 * tension;
      }
      if (has) { this.playerFloat = { x: point.x, y: water, z: point.z, ux, uz }; active.add('you'); this.lastCast = { x: aim[0], z: aim[1], pond: g.pond.id, y: water }; }
      next.push({ id: 'you', pond: g.pond.id, ...end, rodOnly: !has });
    }
    if (!line) this.lastCast = null;
    const rods = next.length;
    // The line remains safe while the player is away or walking back after a reload. Its float stays tappable.
    if (line && !active.has('you') && next.length < MAX) {
      const placed = line.pond && this.game.s.placed[line.pond], pond = placed?.kind === 'pond' ? placed : null;
      const c = this.lastCast, point = c ? { id: 'you', pond: c.pond, x: c.x, y: c.y + .14, z: c.z }
        : { id: 'you', pond: pond ? line.pond : null, x: pond ? (pond.x + 2) * CELL + 1.2 : POND_SHAPE.x + 3, y: (pond ? .24 : .06) + .14, z: pond ? (pond.z + 2) * CELL : POND_SHAPE.z };
      matrix.makeTranslation(point.x, point.y, point.z); this.floats.setMatrixAt(next.length, matrix); next.push(point);
    }
    this.entries = next; this.rods.count = rods; this.floats.count = next.length;
    this.rods.instanceMatrix.needsUpdate = this.floats.instanceMatrix.needsUpdate = true;
    this.lines.geometry.setDrawRange(0, rods * SEGMENTS * 2);
    this.lines.geometry.attributes.position.needsUpdate = true; this.lines.geometry.attributes.color.needsUpdate = true;
    if (!active.has('you')) this.playerFloat = null;
    this.play?.frame(dt);
    this.drawLeaps(dt);
    this.lines.visible = this.rods.visible = rods > 0; this.floats.visible = next.length > 0;
  }
  drawLeaps(dt) {
    for (const l of this.leaps) {
      l.t += dt / .65; const k = Math.min(1, l.t);
      l.o.position.set(l.from.x + (l.to.x - l.from.x) * k, l.from.y + (l.to.y - l.from.y) * k + Math.sin(k * Math.PI) * 2.2, l.from.z + (l.to.z - l.from.z) * k);
      l.o.rotation.set(Math.sin(k * Math.PI) * Math.PI, l.rot, k * Math.PI / 2);   // tumbles over and comes down on its side
      if (k >= 1) l.landed = true;
    }
    this.leaps = this.leaps.filter(l => !l.landed);
    // fish left on the grass when the game was closed (or loaded from another device) are packed quietly: nothing is lost
    if ((this.unpacked ?? true) && !this.pile) { this.unpacked = false; if (bankCount(this.game.s)) this.game.do('packCatch'); }
    const pile = this.pile; if (!pile) return;
    const quiet = document.body.classList.contains('reduced-motion');
    for (const f of pile.fish) if (f.landed) {   // lying on the grass: a little flop now and then
      const cycle = (this.time + f.phase) % 4.7, flop = !quiet && cycle < .32 ? Math.sin(cycle / .32 * Math.PI) : 0;
      f.o.position.set(f.to.x, f.to.y + flop * .07, f.to.z); f.o.rotation.set(0, f.rot, Math.PI / 2 + flop * .12);
    }
    const me = this.people.walkers.get('you'), x = this.angler?.x ?? me?.x, z = this.angler?.z ?? me?.z;
    if (me && !pile.fish.some(f => !f.landed) && (me.indoors || Math.hypot(x - pile.anchor[0], z - pile.anchor[1]) > BANK.pack)) this.pack();   // you walked off, or went in for the night
  }
  /** A generous phone tap target around each visible float. Selecting one only opens the controls. */
  pick(x, y) {
    let best = null, closest = 24;
    for (const point of this.entries) {
      if (point.rodOnly) continue;   // a rod held over the water has no float to tap
      a.set(point.x, point.y, point.z).project(this.world.cam.camera);
      if (a.z < -1 || a.z > 1) continue;
      const distance = Math.hypot((a.x + 1) * innerWidth / 2 - x, (1 - a.y) * innerHeight / 2 - y);
      if (distance < closest) { closest = distance; best = { pond: point.pond }; }
    }
    return best;
  }
}
