// People on the map (DESIGN 9). Families who moved in walk between home, the farm, the school and the project site on
// paths and roads, and do things when they get there: sweep by the cottages, hammer at the next project, sit on benches,
// stop to wave and chat when they meet, cheer when a project is done, and carry their order home. Ada bakes (kneading at
// the bakery while it works). Your own family is on stage too: June keeps the farmhouse and gives a tip when you seem
// stuck, Pip wanders near the animals (or wherever you are looking) and comments on what happens, and the farm dog
// follows Pip. AI neighbours walk in from their signpost, say something about the farm, and leave. At night everyone
// goes home. Tap a person to hear their line.
// Everyone is a cast subject (skinned.mjs): Starline's rigged villagers, animated near the camera, baked further away.
import { CELL, N, ORDER_BOARD, NEIGHBOUR_SIGNS, FARMHOUSE, RUINS, isBrook, inFarm, nearHome, VILLAGE } from '../content/world.mjs';
import * as PEOPLE_DATA from '../content/people.mjs';
import { STEPS } from '../content/projects.mjs';
import { BUILDINGS } from '../content/buildings.mjs';
import { CROPS, ANIMALS } from '../content/goods.mjs';
import { cellType, doorCell, occupant } from '../core/grid.mjs';
import { t } from '../kit/i18n.mjs';
import { castOf, RIGS } from './skinned.mjs';
import { isNight } from './life-view.mjs';

const { FAMILIES, VILLAGERS, NEIGHBOURS } = PEOPLE_DATA;
const WOMEN = new Set(['lan', 'grace', 'elin', 'marisol', 'ada', 'cora', 'mai', 'june', 'hazel']), GIRLS = new Set(['zara', 'pia']);
const rigFor = (id, kid) => id === 'ada' ? 'hana' : kid || id === 'pip' ? 'kid' : WOMEN.has(id) ? 'woman' : 'man';
const PEOPLE = Object.fromEntries([...VILLAGERS, ...NEIGHBOURS, ...FAMILIES.flatMap(f => f.people)].map(p => [p.id, p]));
// Names for the family, in case the story's people list does not have them yet.
const FAMILY_NAMES = { june: 'June', pip: 'Pip', dog: 'Biscuit' };
const walkable = (s, x, z) => { const ty = cellType(s, x, z); return ty === 'path' || ty === 'road'; };
const hash = id => [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
// Clothes: warm, vivid colours (sRGB). Named people wear their own; everyone else draws from the palette by name.
const TOPS = ['#e8553f', '#f2a93b', '#3d8fd6', '#5bb85c', '#c7559e', '#f07f3c', '#7a5cd0', '#2bb3a6', '#ffcf3f', '#e0496b'];
const BOTTOMS = ['#2f4f8a', '#5a3a2a', '#3a6b4a', '#4a4a5c', '#8a4a2a', '#24324f'];
const HAIR = ['#2a1a12', '#5a3218', '#a8642c', '#1a1a22', '#7a3b1c', '#d9a548'];
const OUTFITS = {
  june: { top: '#ff6f4f', bottom: '#2f5aa8', hair: '#8a3a1c' }, pip: { top: '#ffc83d', bottom: '#3f8f4a', hair: '#5a3218' },
  ada: { top: '#7f5bd6', bottom: '#fff4e2', hair: '#d6d0c6' }, cora: { top: '#2bb3a6', bottom: '#3a3a4a', hair: '#1a1a22' },
  mai: { top: '#ff8fb0', bottom: '#4a6fd0', hair: '#1a1a22' }, gus: { top: '#6b8f3a', bottom: '#5a3a2a', hair: '#9a9a9a' },
};
const outfitOf = id => OUTFITS[id] ?? { top: TOPS[hash(id) % TOPS.length], bottom: BOTTOMS[(hash(id) >> 4) % BOTTOMS.length], hair: HAIR[(hash(id) >> 8) % HAIR.length] };
// What Pip says when things happen (the story package's lines win when it provides them), and June's stuck tips.
const PIP_LINES = {
  firstHarvest: 'We did it! Our very first harvest!',
  harvested: ['I helped! Well, I watched.', 'Crunchy! Can we keep some?', 'The barn is getting full of good things.'],
  animalArrived: ['A hen! Can I name her Pancake?', 'Welcome to the farm, new friend!'],
  collected: ['Still warm! Eggs are amazing.', 'Fresh from the farm!'],
  familyArrived: ['New neighbours! I hope they have a kid my age.'],
  orderFilled: ['Ada says a thank you is the best payment. Coins are nice too.'],
  levelUp: ['Level up! Does that mean I get a bigger room?'],
  projectDone: ['Hooray! Everyone come and look!'],
};
const JUNE_TIPS = {
  harvest: 'Your crops are ready. Tap a bed and drag across the others to harvest them all.',
  plant: 'Empty beds earn nothing. Tap one, choose a crop, and drag across the rest.',
  collect: 'The animals have something for you. Tap their home to collect it.',
  feed: 'The animals are hungry. Make feed at the feed mill, then tap their home.',
  orders: 'Check the order board. Someone may want what is already in the barn.',
  project: 'Open the projects to see what the village needs next.',
};
const one = list => Array.isArray(list) ? list[Math.floor(Math.random() * list.length)] : list ?? null;
const villager = id => VILLAGERS.find(p => p.id === id);
/** Is this the first time this happened on the farm (so Pip uses his "first" line)? */
const FIRSTS = {
  harvested: s => (s.stats.harvested ?? 0) <= 12,
  animalArrived: s => Object.values(s.animals).flat().length <= 2,
  familyArrived: s => Object.values(s.homes).filter(h => h.arrived).length <= 1,
};

export class PeopleView {
  constructor(world, game, root) {
    Object.assign(this, { world, game, walkers: new Map(), clock: 0, time: 0, greetClock: 0, lastAction: performance.now(), tipAt: -Infinity, idleTipMs: 120000, pipAt: -99 });
    this.cast = castOf(world);
    this.bubbles = document.createElement('div'); this.bubbles.className = 'bubbles'; root.appendChild(this.bubbles);
    world.onFrame((dt, now) => this.frame(dt, now));
    game.on((r, action) => {
      if (action && action !== 'tick' && action !== 'test' && action !== 'load') this.lastAction = performance.now();
      for (const e of r.events ?? []) this.react(e);
    });
  }
  get s() { return this.game.s; }
  get meshes() { return this.cast; }   // (kept for older checks: truthy once the view exists)
  /** Who should be around: Ada, the family, residents of arrived families, and Cora once the school is open. */
  residents() {
    const s = this.s, now = this.game.now, home = [FARMHOUSE.x + 5, FARMHOUSE.z];
    const out = [{ id: 'ada', body: 'hana', home }, { id: 'june', body: 'woman', home, family: true }, { id: 'pip', body: 'kid', home, family: true }, { id: 'dog', body: 'dog', home, family: true, pet: true }];
    for (const [hid, h] of Object.entries(s.homes)) {
      if (!h.family || h.arrivesAt > now) continue;
      const p = s.placed[hid], door = p && doorCell(p.kind, p.x, p.z, p.rot), fam = FAMILIES.find(f => f.id === h.family);
      for (const person of fam?.people ?? []) out.push({ id: person.id, body: rigFor(person.id, person.kid), home: door, kid: !!person.kid });
    }
    const school = Object.entries(s.placed).find(([, p]) => p.kind === 'school');
    if (school) { const p = school[1]; out.push({ id: 'cora', body: 'woman', home: doorCell(p.kind, p.x, p.z, p.rot), work: true }); }
    return out;
  }
  sync() {
    const want = new Map(this.residents().map(r => [r.id, r]));
    for (const [id, w] of this.walkers) if (!w.visitor && !want.has(id)) this.drop(w);
    for (const [id, r] of want) if (!this.walkers.has(id) && r.home) {
      const start = r.family ? this.familySpot(r.id) : r.home;
      this.add({ ...r, x: (start[0] + 0.5) * CELL, z: (start[1] + 0.5) * CELL });
    }
  }
  add(w) {
    Object.assign(w, { route: [], wait: Math.random() * 3, rot: Math.random() * 6.28, phase: Math.random() * 6, act: 'idle', clip: 'Idle' });
    w.subject = this.cast.add({ rig: w.body, x: w.x, z: w.z, rot: w.rot, clip: 'Idle', tint: w.pet ? null : outfitOf(w.person ?? w.id), farHide: true, priority: w.family ? 4 : w.id === 'ada' ? 2 : 0 });
    this.walkers.set(w.id, w); return w;
  }
  drop(w) { w.bubble?.remove(); this.cast.remove(w.subject); this.walkers.delete(w.id); }
  /** A neighbour walks in from their signpost to the order board and says something about the farm. */
  visit(id, comment) {
    const sign = NEIGHBOUR_SIGNS.find(n => n.id === id); if (!sign) return;
    const start = this.nearestWalkable(sign.x, sign.z); if (!start) return;
    const old = this.walkers.get(`visit:${id}`); if (old) this.drop(old);
    const w = this.add({ id: `visit:${id}`, person: id, visitor: true, body: id === 'gus' ? 'man' : 'woman', x: (start[0] + 0.5) * CELL, z: (start[1] + 0.5) * CELL, comment, stage: 'coming', home: start });
    w.route = this.route([start[0], start[1]], [ORDER_BOARD.x, ORDER_BOARD.z]); w.wait = 0;
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
  cellOf(w) { return [Math.floor(w.x / CELL), Math.floor(w.z / CELL)]; }
  /** Where the current project is being worked on: the ruin it rebuilds, or a plot in the village. */
  site() {
    const step = STEPS[this.s.projects.step]; if (!step) return null;
    const ruin = RUINS.find(r => step.builds.includes(r.kind));
    if (ruin) return [ruin.x + 2, ruin.z - 2];
    if (step.builds.includes('cottage')) return [VILLAGE.x0 + 10 + (this.s.counts.cottage ?? 0) * 4, VILLAGE.z0 + 3];
    return null;
  }
  /** A villager's next errand: [route, what to do on arrival]. */
  pickErrand(w) {
    const s = this.s, here = this.cellOf(w), r = Math.random();
    if (w.id === 'ada') {
      const bakery = Object.entries(s.placed).find(([, p]) => p.kind === 'bakery');
      const busy = bakery && (s.production[bakery[0]]?.queue ?? []).some(j => j.doneAt > this.game.now);
      if (busy) { const p = bakery[1], d = doorCell(p.kind, p.x, p.z, p.rot); return [this.route(here, d), { act: 'knead', time: 14, face: [p.x + 1, p.z + 1] }]; }
      return [this.route(here, r < 0.5 ? [ORDER_BOARD.x, ORDER_BOARD.z] : w.home), { act: r < 0.3 ? 'sweep' : 'idle', time: 5 + Math.random() * 6 }];
    }
    if (w.work && r < 0.6) return [this.route(here, w.home), { act: 'idle', time: 6 + Math.random() * 6 }];
    const site = this.site();
    if (site && !w.kid && r < 0.22) return [this.route(here, site), { act: 'hammer', time: 10 + Math.random() * 10, face: site }];
    const bench = Object.values(s.placed).filter(p => p.kind === 'bench');
    if (bench.length && r < 0.4) { const b = bench[Math.floor(Math.random() * bench.length)]; return [this.route(here, [b.x, b.z]), { act: 'sit', time: 8 + Math.random() * 8, bench: b }]; }
    if (r < 0.6 && w.home) return [this.route(here, w.home), { act: !w.kid && Math.random() < 0.6 ? 'sweep' : 'idle', time: 6 + Math.random() * 6 }];
    const spots = [[ORDER_BOARD.x, ORDER_BOARD.z], [FARMHOUSE.x + 6, FARMHOUSE.z + 1]];
    const school = Object.values(s.placed).find(p => p.kind === 'school'); if (school) spots.push(doorCell(school.kind, school.x, school.z, school.rot));
    for (const p of Object.values(s.placed)) if (p.kind === 'cottage' && Math.random() < 0.3) spots.push(doorCell(p.kind, p.x, p.z, p.rot));
    return [this.route(here, spots[Math.floor(Math.random() * spots.length)]), { act: w.kid && Math.random() < 0.3 ? 'play' : 'idle', time: 3 + Math.random() * 6 }];
  }
  // ── The family walks freely on the home ground and the farm (not through buildings, pens, fences or water). ──
  canStand(x, z) {
    const s = this.s, cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
    if (cx < 0 || cz < 0 || cx >= N || cz >= N || isBrook(cx, cz) || !(inFarm(cx, cz) || nearHome(cx, cz) || cellType(s, cx, cz) === 'road')) return false;
    const id = occupant(s, cx, cz); if (id && s.placed[id]?.kind !== 'bed' && s.placed[id]?.kind !== 'path') return false;
    if (cx >= FARMHOUSE.x - 3 && cx <= FARMHOUSE.x + 2 && cz >= FARMHOUSE.z - 3 && cz <= FARMHOUSE.z + 3) return false;   // the farmhouse itself
    return !this.penCells().has(`${cx},${cz}`);
  }
  crossesFence(x0, z0, x1, z1) {
    const s = this.s, a = [Math.floor(x0 / CELL), Math.floor(z0 / CELL)], b = [Math.floor(x1 / CELL), Math.floor(z1 / CELL)];
    if (a[0] === b[0] && a[1] === b[1]) return false;
    if (b[1] < a[1] && s.fences[`${a[0]},${a[1]},n`]) return true; if (b[1] > a[1] && s.fences[`${b[0]},${b[1]},n`]) return true;
    if (b[0] < a[0] && s.fences[`${a[0]},${a[1]},w`]) return true; if (b[0] > a[0] && s.fences[`${b[0]},${b[1]},w`]) return true;
    return false;
  }
  penCells() {
    const key = `${Object.keys(this.s.fences).length}|${Object.keys(this.s.animals).length}`;
    if (this.pens?.key === key) return this.pens.set;
    const set = new Set(), life = this.world.life;
    for (const home of Object.keys(this.s.animals)) for (const c of life?.penArea(home) ?? []) set.add(`${c[0]},${c[1]}`);
    this.pens = { key, set }; return set;
  }
  /** A spot for a family member: June by the farmhouse, Pip near the animals or the camera, the dog near Pip. */
  familySpot(id) {
    const homeSpots = [[FARMHOUSE.x + 4, FARMHOUSE.z], [FARMHOUSE.x + 4, FARMHOUSE.z + 3], [FARMHOUSE.x + 3, FARMHOUSE.z - 4], [FARMHOUSE.x + 1, FARMHOUSE.z + 5], [FARMHOUSE.x + 4, FARMHOUSE.z - 3]];
    if (id === 'pip') {
      const cam = this.world.cam, cx = Math.floor(cam.x / CELL), cz = Math.floor(cam.z / CELL), pens = [...this.penCells()];
      if (pens.length && Math.random() < 0.5) {
        const [px, pz] = pens[Math.floor(Math.random() * pens.length)].split(',').map(Number);
        for (const [dx, dz] of [[0, 2], [2, 0], [0, -2], [-2, 0], [1, 2], [2, 1]]) if (this.canStand((px + dx + 0.5) * CELL, (pz + dz + 0.5) * CELL)) return [px + dx, pz + dz];
      }
      for (let k = 0; k < 8; k++) { const x = cx + Math.round((Math.random() - 0.5) * 8), z = cz + Math.round((Math.random() - 0.5) * 8); if (this.canStand((x + 0.5) * CELL, (z + 0.5) * CELL)) return [x, z]; }
    }
    return homeSpots[Math.floor(Math.random() * homeSpots.length)];
  }
  // ── Every frame ──
  frame(dt) {
    this.time += dt;
    this.clock += dt; if (this.clock > 1) { this.clock = 0; this.sync(); this.maybeTip(); this.pipIdle(); }
    const night = isNight(this.s, this.game.now);
    for (const w of this.walkers.values()) {
      if (w.pet) this.liveDog(w, dt, night);
      else if (w.family) this.liveFamily(w, dt, night);
      else this.liveVillager(w, dt, night);
      const sub = w.subject; sub.x = w.x; sub.z = w.z; sub.rot = w.rot; sub.clip = w.clip; sub.speed = w.speed ?? 1; sub.hidden = !!w.indoors;
      sub.bob = w.clip === 'Walk' || w.clip === 'Run' ? Math.abs(Math.sin(this.time * 8 + w.phase)) * 0.06 : 0;
    }
    if ((this.greetClock += dt) > 0.5) { this.greetClock = 0; this.greet(); }
    this.placeBubbles();
  }
  /** Follow the route; returns true while walking. */
  follow(w, dt, speed) {
    if (!w.route.length) return false;
    const [cx, cz] = w.route[0], tx = (cx + 0.5) * CELL, tz = (cz + 0.5) * CELL, dx = tx - w.x, dz = tz - w.z, d = Math.hypot(dx, dz), step = speed * dt;
    if (d <= step) { w.x = tx; w.z = tz; w.route.shift(); } else { w.x += dx / d * step; w.z += dz / d * step; this.turnTo(w, Math.atan2(dx, dz), dt); }
    this.walking(w, speed, w.carry ? 'Carry' : 'Walk');
    if (!w.route.length) w.carry = false;
    return true;
  }
  walking(w, speed, clip = 'Walk') { const r = RIGS[w.body]; w.clip = clip; w.speed = clip === 'Run' ? speed / (r.run ?? r.walk * 2.6) : clip === 'Walk' ? Math.max(0.4, speed / r.walk) : 1; }
  turnTo(w, want, dt, rate = 8) { const turn = ((want - w.rot) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI; w.rot += Math.max(-dt * rate, Math.min(dt * rate, turn)); }
  liveVillager(w, dt, night) {
    if (w.once && this.time < w.onceUntil) { w.clip = 'Idle'; return; }
    const speed = w.kid ? 1.55 : 1.45;
    if (this.follow(w, dt, speed)) { w.indoors = false; return; }
    if (w.visitor) {
      if ((w.wait -= dt) > 0) { this.doing(w, w.stage === 'talking' ? 'Talk' : 'Idle', dt); return; }
      if (w.stage === 'coming') { w.stage = 'talking'; w.wait = 5; this.say(w, t(w.comment)); this.once(w, 'Wave', 1.2); return; }
      if (w.stage === 'talking') { w.stage = 'leaving'; w.route = this.route(this.cellOf(w), w.home); return; }
      this.drop(w); return;
    }
    if (night) {
      // home for the night: walk to the door, then go in
      if (!w.goingHome) { w.goingHome = true; w.route = this.route(this.cellOf(w), w.home); w.act = 'home'; return; }
      w.indoors = true; w.clip = 'Idle'; return;
    }
    if (w.goingHome) { w.goingHome = false; w.indoors = false; w.wait = Math.random() * 4; }
    if (w.todo) this.arrive(w);
    if ((w.wait -= dt) > 0) { this.doing(w, w.clipFor ?? 'Idle', dt); return; }
    const [route, todo] = this.pickErrand(w);
    w.route = route; w.todo = route.length ? todo : null; w.clipFor = null; w.faceTo = null;
    if (!route.length) { w.wait = 2; w.clipFor = 'Idle'; }
  }
  /** Arrived at an errand: start what was planned there. */
  arrive(w) {
    const todo = w.todo; w.todo = null; if (!todo) return;
    if (todo.carryHome && w.home) { w.carry = true; w.route = this.route(this.cellOf(w), w.home); w.todo = { act: 'sweep', time: 4 }; return; }
    w.wait = todo.time;
    const clip = { knead: 'Knead', sweep: 'Sweep', hammer: 'Hammer', sit: 'Sit', play: 'Jump', idle: 'Idle' }[todo.act] ?? 'Idle';
    w.clipFor = clip;
    if (todo.face) w.faceTo = Math.atan2((todo.face[0] + 0.5) * CELL - w.x, (todo.face[1] + 0.5) * CELL - w.z);
    if (todo.bench) { const b = todo.bench; w.x = (b.x + 0.5) * CELL; w.z = (b.z + 0.5) * CELL; w.faceTo = (b.rot ?? 0) * Math.PI / 2; }
  }
  doing(w, clip, dt) {
    w.clip = clip; w.speed = 1;
    if (w.faceTo != null) this.turnTo(w, w.faceTo, dt, 5);
  }
  once(w, clip, secs) { w.subject.once = { clip }; w.once = clip; w.onceUntil = this.time + secs; }
  /** Two people who meet stop, face each other, wave and chat for a moment. */
  greet() {
    const list = [...this.walkers.values()].filter(w => !w.pet && !w.indoors && !w.visitor && w.route.length && this.time > (w.greetedAt ?? -99) + 40);
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j]; if (Math.hypot(a.x - b.x, a.z - b.z) > 2.6 || Math.random() > 0.5) continue;
      for (const [p, q] of [[a, b], [b, a]]) { p.greetedAt = this.time; p.route = []; p.wait = 3.5; p.clipFor = 'Talk'; p.faceTo = Math.atan2(q.x - p.x, q.z - p.z); p.todo = null; }
      this.once(a, 'Wave', 1.1);
      return;
    }
  }
  // ── The family ──
  liveFamily(w, dt, night) {
    if (night) { w.indoors = true; w.route = []; return; }
    if (w.indoors) { w.indoors = false; const [x, z] = this.familySpot(w.id); w.x = (x + 0.5) * CELL; w.z = (z + 0.5) * CELL; }
    if (w.once && this.time < w.onceUntil) { w.clip = 'Idle'; return; }
    if (w.target) {
      const dx = w.target[0] - w.x, dz = w.target[1] - w.z, d = Math.hypot(dx, dz), speed = w.id === 'pip' ? 1.6 : 1.3;
      if (d < 0.2) { w.target = null; w.wait = 3 + Math.random() * 6; w.clipFor = w.id === 'pip' && Math.random() < 0.3 ? 'Wave' : w.id === 'june' && Math.random() < 0.5 ? 'Sweep' : 'Idle'; }
      else {
        this.turnTo(w, Math.atan2(dx, dz), dt);
        const step = Math.min(d, speed * dt), nx = w.x + Math.sin(w.rot) * step, nz = w.z + Math.cos(w.rot) * step;
        if (this.canStand(nx, nz) && !this.crossesFence(w.x, w.z, nx, nz)) { w.x = nx; w.z = nz; this.walking(w, speed); return; }
        if ((w.blocked = (w.blocked ?? 0) + dt) > 0.6) { w.blocked = 0; w.target = null; w.wait = 0.5; }
        w.clip = 'Idle'; return;
      }
    }
    if ((w.wait -= dt) > 0) { w.clip = w.clipFor ?? 'Idle'; w.speed = 1; return; }
    const [x, z] = this.familySpot(w.id); w.target = [(x + 0.2 + Math.random() * 0.6) * CELL, (z + 0.2 + Math.random() * 0.6) * CELL];
  }
  liveDog(w, dt, night) {
    const pip = this.walkers.get('pip');
    if (night || !pip || pip.indoors) {   // asleep on the farmhouse porch
      const px = (FARMHOUSE.x + 3.4) * CELL, pz = (FARMHOUSE.z + 0.9) * CELL;
      if (Math.hypot(w.x - px, w.z - pz) > 4) { w.x = px; w.z = pz; }
      w.clip = 'Sleep'; w.speed = 1; w.rot = -Math.PI / 2; return;
    }
    if (w.once && this.time < w.onceUntil) { w.clip = 'Idle'; return; }
    // keep about two metres behind Pip, trotting to catch up
    const back = pip.rot + Math.PI, gx = pip.x + Math.sin(back + 0.6) * 1.8, gz = pip.z + Math.cos(back + 0.6) * 1.8, dx = gx - w.x, dz = gz - w.z, d = Math.hypot(dx, dz);
    if (d > 0.5) {
      const speed = d > 5 ? 3.6 : d > 2 ? 2.2 : 1.2; this.turnTo(w, Math.atan2(dx, dz), dt, 6);
      const step = Math.min(d, speed * dt), nx = w.x + Math.sin(w.rot) * step, nz = w.z + Math.cos(w.rot) * step;
      if (d > 14 && this.canStand(gx, gz)) { w.x = gx; w.z = gz; }   // left far behind (Pip went indoors, the camera moved): catch up out of sight
      else if (!this.crossesFence(w.x, w.z, nx, nz) && this.canStand(nx, nz)) { w.x = nx; w.z = nz; }
      else { w.clip = 'Idle'; w.speed = 1; return; }
      this.walking(w, speed, speed > 3 ? 'Run' : 'Walk'); w.sat = 0; return;
    }
    this.turnTo(w, Math.atan2(pip.x - w.x, pip.z - w.z), dt, 3);
    w.sat = (w.sat ?? 0) + dt; w.clip = w.sat > 1.2 ? 'Sit' : 'Idle'; w.speed = 1;
    if (w.sat > 1.2 && Math.random() < dt * 0.08) this.once(w, Math.random() < 0.5 ? 'Wag' : 'Bark', 1.4);
  }
  /** Things that happen: Pip comments, people cheer, the one who ordered carries it home, Ada bakes. */
  react(e) {
    if (e.type === 'neighbourVisit') { this.visit(e.id, e.comment); return; }
    if (e.type === 'projectDone') for (const w of this.walkers.values()) if (!w.indoors && !w.pet) this.once(w, 'Cheer', 2.2);
    if (e.type === 'familyArrived') setTimeout(() => { for (const w of this.walkers.values()) if (FAMILIES.find(f => f.id === e.family)?.people.some(p => p.id === w.id)) this.once(w, 'Wave', 1.5); }, 1500);
    if (e.type === 'orderFilled') { const w = this.walkers.get(e.from); if (w && !w.family && !w.indoors) { w.route = this.route(this.cellOf(w), [ORDER_BOARD.x, ORDER_BOARD.z]); w.todo = { act: 'idle', time: 1, carryHome: true }; w.wait = 0; } }
    if (e.type === 'delivered') { const site = this.site(), w = [...this.walkers.values()].find(x => !x.family && !x.kid && !x.visitor && !x.indoors && x.id !== 'ada'); if (site && w) { w.route = this.route(this.cellOf(w), site); w.todo = { act: 'hammer', time: 20, face: site }; } }
    this.pipSays(e);
  }
  pipSays(e) {
    const pip = this.walkers.get('pip'); if (!pip || pip.indoors) return;
    const said = (this.said ??= new Set()), first = !said.has(e.type) && FIRSTS[e.type]?.(this.s); said.add(e.type);
    const says = villager('pip')?.says?.[e.type], mine = first && e.type === 'harvested' ? PIP_LINES.firstHarvest : PIP_LINES[e.type];
    const line = (first && says?.first) || one(says?.lines) || one(mine);
    if (!line || (!first && this.time - this.pipAt < 30)) return;
    this.pipAt = this.time;
    this.say(pip, t(line));
    this.once(pip, first || e.type === 'projectDone' || e.type === 'levelUp' ? 'Cheer' : 'Wave', 1.6);
  }
  /** Now and then Pip wonders aloud (when on screen and nothing else was said lately). */
  pipIdle() {
    const pip = this.walkers.get('pip'), lines = villager('pip')?.idle; if (!pip || pip.indoors || !lines?.length || this.time - this.pipAt < 90) return;
    const p = this.screenOf(pip); if (p.x < 0 || p.y < 0 || p.x > innerWidth || p.y > innerHeight) return;
    this.pipAt = this.time; this.say(pip, t(one(lines)));
  }
  /** June's tip when nothing has happened for two minutes: the most useful next thing to do. */
  maybeTip() {
    if (performance.now() - this.lastAction < this.idleTipMs || performance.now() - this.tipAt < 300000) return;
    this.juneTip();
  }
  juneTip() {
    const june = this.walkers.get('june'); if (!june || june.indoors) return null;
    const s = this.s, now = this.game.now, beds = Object.values(s.placed).filter(p => p.kind === 'bed').length, planted = Object.keys(s.beds).length;
    const animals = Object.values(s.animals).flat(), feed = id => (s.barn.items[id] ?? 0) > 0;
    const key = Object.values(s.beds).some(b => b.doneAt <= now) ? 'harvest' : animals.some(a => a.doneAt != null && a.doneAt <= now) ? 'collect'
      : animals.some(a => a.doneAt == null && feed(ANIMALS[a.kind].eats)) ? 'feed' : animals.some(a => a.doneAt == null) ? 'feed'
      : beds > planted ? 'plant' : (s.orders?.cards ?? []).length ? 'orders' : 'project';
    // the story's own tip first, then its next ones in turn; what needs doing right now (ready crops, animals) comes first
    const june$ = villager('june'), told = (this.tips = (this.tips ?? -1) + 1), urgent = ['harvest', 'collect', 'feed'].includes(key);
    const line = urgent || !june$?.tip ? JUNE_TIPS[key] : told === 0 ? june$.tip : june$.tips?.[(told - 1) % june$.tips.length] ?? JUNE_TIPS[key];
    this.tipAt = performance.now(); this.lastAction = performance.now();
    this.say(june, t(line), 8000); this.once(june, 'Wave', 1.4);
    return key;
  }
  // ── Speech bubbles ──
  screenOf(w, y = 2.3) { const p = this.world.cam.camera.position.clone().set(w.x, y, w.z).project(this.world.cam.camera); return { x: (p.x + 1) / 2 * innerWidth, y: (1 - p.y) / 2 * innerHeight }; }
  /** The person nearest a screen point (within 40 px), or null. */
  pick(x, y) {
    let best = null, bestD = 40;
    for (const w of this.walkers.values()) { if (w.indoors) continue; const p = this.screenOf(w, RIGS[w.body].height * 0.5); const d = Math.hypot(p.x - x, p.y - y); if (d < bestD) { best = w; bestD = d; } }
    return best;
  }
  nameOf(w) { const who = PEOPLE[w.person ?? w.id]; return who ? t(who.name) : FAMILY_NAMES[w.id] ?? ''; }
  say(w, text, ms = 5000) {
    w.bubble?.remove();
    const el = document.createElement('div'); el.className = 'bubble';
    const b = document.createElement('b'); b.textContent = this.nameOf(w); el.append(b, ` ${text}`);
    this.bubbles.appendChild(el); w.bubble = el; w.bubbleUntil = performance.now() + ms;
    this.placeBubbles();
  }
  talk(w) {
    const who = PEOPLE[w.person ?? w.id];
    if (w.pet) { this.once(w, 'Bark', 1.4); return; }
    if (who) this.say(w, t(w.comment ?? who.line));
    else if (w.id === 'june') this.juneTip();
    else if (w.id === 'pip') this.say(w, t('Can we get a pony one day? Or a goat? A goat would be fine.'));
    // face the camera and wave
    w.faceTo = this.world.cam.yaw; w.rot = this.world.cam.yaw; this.once(w, who && w.visitor ? 'Talk' : 'Wave', 1.3);
  }
  placeBubbles() {
    const now = performance.now();
    for (const w of this.walkers.values()) {
      if (!w.bubble) continue;
      if (now > w.bubbleUntil) { w.bubble.remove(); w.bubble = null; continue; }
      const p = this.screenOf(w, RIGS[w.body].height + 0.3), m = 70;
      // a bubble whose speaker is off screen stays at the screen edge, so the line is never lost
      const x = Math.min(innerWidth - m, Math.max(m, p.x)), y = Math.min(innerHeight - 60, Math.max(m + 40, p.y));
      w.bubble.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
    }
  }
}
