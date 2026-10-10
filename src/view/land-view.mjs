// Draws the rules state on the map: cell colours, weeds and rocks, everything placed, fences on edges, and the
// dressing that follows from it (AAA pass): raised bed rims with furrows under the crops (one instanced mesh per
// 16 × 16 cells), fence posts joined at corners and T joints, edge stones along paths, window boxes, flowerpots and a
// lantern on cottages as they are furnished, scaffolding on the ruin of the project being worked on, and the feed
// mill's sails. sync() rebuilds from scratch (after loading); apply(events) updates only what an action changed.
import * as THREE from 'three';
import { N, CELL, ORDER_BOARD, RUINS, SITES, HOME_GARDEN, MEADOW, ALBRIGHT, brookCurve, COOPERATIVE_BOARD, TOWPATH_GATE, inTowpath, QUAY, LOTS, inQuay, inRiverside, lotAt } from '../content/world.mjs';
import { clearWilds } from './dress.mjs';
import { albrightOffer } from '../core/valley.mjs';
import { footprint, BUILDINGS } from '../content/buildings.mjs';
import { STEPS } from '../content/projects.mjs';
import { cellType, occupant, penOf, cellsOf } from '../core/grid.mjs';
import { KIND_MODELS, EARLY, modelFor, sizeOf, anchorPoints, ANCHORS } from './kinds.mjs';
import { loadKit, loadKitLater, bake, fit, tiers } from './models.mjs';
import { toon } from '../kit/toon.mjs';
import { GROUND_COLORS } from './world-view.mjs';
import { levelOf, isRepairing } from '../core/working.mjs';
import { TRUCK } from '../content/economy.mjs';
import { roadSegmentAt, ROAD_SEGMENTS } from '../content/world.mjs';

const RIM_CHUNK = 16;
const OWN = /^(truck|p\d|c\d|e\d|j-?\d|s\d|sails:|dress:|scaffold:|pen:|meadow:|story:|quay:)/;   // batch ids land-view owns (removed by sync)
// the trucks' colours (core/market.mjs fleet: the first is the red pickup) and how far apart they park, in cells
const TRUCK_MODELS = ['truck', 'truck_teal', 'truck_sun'], TRUCK_GAP = 2.7;
const FENCES = new Set(['fence', 'gate']);
// the kept meadow (chapter 11): how many flower clumps, and the young trees round a green cannery (cells from its corner)
const MEADOW_FLOWERS = 76, GREEN_TREES = [[-0.9, 0.4], [-0.9, 2.6], [5.9, 2.9], [5.9, 0.9], [1.2, 4.4], [3.9, 4.4]];
const frac = v => v - Math.floor(v);
const PEN_EARTH = '#c9a46a';

export class LandView {
  constructor(world, game) {
    Object.assign(this, { world, game, ready: false, pos: new Map(), beds: new Map(), rims: new Map(), rimDirty: new Set(), dressed: new Map(), clock: 0, pens: new Map() });
    world.cellLook = (x, z) => this.look(x, z);
    world.onFrame?.(dt => this.frame(dt));
  }
  /** Models arrive in two waves: the farm first (the first frame), then town buildings, nature, props and decor. */
  async load() {
    const entries = Object.entries(KIND_MODELS);
    await this.register(entries.filter(([, spec]) => !spec.late));
    await this.register(Object.entries(EARLY).map(([k, spec]) => [`${k}~`, spec]));
    this.makeRims();
    this.world.batches.set('order_board', { model: 'order_board', x: (ORDER_BOARD.x + 0.5) * CELL, z: (ORDER_BOARD.z + 0.5) * CELL, rot: Math.PI / 2 });
    this.ready = true; this.sync();
    this.later = this.loadLater(entries.filter(([, spec]) => spec.late));
  }
  async loadLater(entries) {
    // the town first (ruins and cottages are part of the story), then everything else, one kit at a time
    const byKit = new Map();
    for (const [name, spec] of entries) (byKit.get(spec.kit) ?? byKit.set(spec.kit, []).get(spec.kit)).push([name, spec]);
    const order = ['town', ...[...byKit.keys()].filter(k => k !== 'town')];
    for (const kit of order) {
      if (!byKit.has(kit)) continue;
      try {
        await loadKitLater(kit);
        await this.register(byKit.get(kit));
        if (kit === 'town') await this.makeRuins();
      } catch (e) { console.warn(`kit ${kit}: ${e.message}`); }
      this.sync();
    }
  }
  /** Ruins: the town buildings in faded, dusty colours (DESIGN 11). */
  async makeRuins() {
    const town = await loadKit('town');
    for (const r of RUINS) {
      const geo = fit(bake(town[r.model]), { width: r.width }), c = geo.attributes.color;
      for (let i = 0; i < c.count; i++) { const g = (c.getX(i) + c.getY(i) + c.getZ(i)) / 3; c.setXYZ(i, g * 0.55 + c.getX(i) * 0.2 + 0.08, g * 0.55 + c.getY(i) * 0.2 + 0.07, g * 0.55 + c.getZ(i) * 0.2 + 0.05); }
      this.world.batches.register(`ruin:${r.kind}`, { geo, kind: 'static' });
    }
  }
  async register(specs) {
    const kits = {};
    for (const [, spec] of specs) kits[spec.kit] ??= loadKit(spec.kit);
    for (const [name, spec] of specs) {
      if (this.world.batches.has(name)) continue;
      const kit = await kits[spec.kit];
      if (!kit[spec.node]) { console.warn(`model ${spec.node} is missing from ${spec.kit}.glb`); continue; }
      const t = tiers(kit, spec.node, sizeOf(spec), spec.lod, { ao: spec.ao ?? 1, center: !spec.authored });
      this.world.batches.register(name, { geo: t.geo, mid: t.mid, far: t.far, kind: spec.lod, color: t.color });
    }
  }
  get s() { return this.game.s; }
  look(x, z) {
    const fixed = this.world.fixedLook(x, z), s = this.s;
    if (!s) return fixed;
    const t = cellType(s, x, z);
    if (t === 'path') return { color: GROUND_COLORS.path };
    // the paved quay on the far bank (Act IV): cobbles; its lots are swept earth until something is built
    if (s.firsts?.quay && t === 'grass') { if (inQuay(x, z)) return { color: GROUND_COLORS.plaza, cobble: true }; if (lotAt(x, z)) return { color: GROUND_COLORS.yard, jitter: 0.04 }; }
    // the old towpath on the far bank: faint and overgrown while its gate is shut, trodden earth once it is open (chapter 12)
    if (t === 'grass' && inTowpath(x, z)) return s.firsts?.bridge ? { color: GROUND_COLORS.path, jitter: 0.03 } : { color: '#8fb65a', jitter: 0.05 };
    if (t === 'tilled') return { color: GROUND_COLORS.tilled, jitter: 0.02 };
    if (t === 'weeds' || t === 'rock') return { color: GROUND_COLORS.weeds ?? '#86c062' };
    if (t === 'road') { const seg = roadSegmentAt(x, z); if (seg && levelOf(s, seg.id) >= 3) return { color: '#a98d68', jitter: 0.09 }; }   // a damaged stretch: cracked, patchy earth
    // inside an animal pen the grass is trodden to warm earth in patches (review: 'flat empty grass')
    if (t === 'grass' && this.pens.get(z * N + x)?.worn) return { color: PEN_EARTH, jitter: 0.05 };
    return fixed;
  }
  /** Animal pens: which grass cells lie inside a closed pen (for the trodden earth), and a hay pile in each pen. */
  refreshPens() {
    const s = this.s, b = this.world.batches, next = new Map(), hay = new Map();
    for (const [id, p] of Object.entries(s.placed)) {
      if (!BUILDINGS[p.kind]?.animals) continue;
      const pen = penOf(s, id); if (!pen.closed) continue;
      const own = new Set(cellsOf(p.kind, p.x, p.z, p.rot).map(([x, z]) => z * N + x)), [w, d] = footprint(p.kind, p.rot);
      let best = null, far = -Infinity;
      for (const k of pen.keys) {
        if (own.has(k)) continue;
        const x = k % N, z = (k - x) / N, dist = Math.hypot(x + 0.5 - (p.x + w / 2), z + 0.5 - (p.z + d / 2));
        // the ground is trodden bare round the home
        const edge = dist - Math.max(w, d) / 2, worn = edge < 1.6;
        next.set(k, { id, worn });
        const fit = -Math.abs(edge - 1.8);                  // the hay pile sits a couple of cells from the home, in view
        if (fit > far && cellType(s, x, z) === 'grass' && !occupant(s, x, z)) { far = fit; best = [x, z]; }
      }
      if (best) hay.set(id, best);
    }
    for (const k of new Set([...this.pens.keys(), ...next.keys()])) if (this.pens.get(k)?.worn !== next.get(k)?.worn) this.world.ground.markDirty(k % N, Math.floor(k / N));
    this.pens = next;
    for (const id of [...b.items.keys()]) if (id.startsWith('pen:') && !hay.has(id.slice(4))) b.remove(id);
    if (b.has('hay_bale')) for (const [id, [x, z]] of hay) b.set(`pen:${id}`, { model: 'hay_bale', x: (x + 0.5) * CELL, z: (z + 0.5) * CELL, rot: (x * 7 + z) % 4 * 0.6, scale: 0.75 });
  }
  /** The registered model that draws a kind now: its own, its first-frame stand-in, or null while it loads. */
  model(kind, id) {
    let name = modelFor(kind, id);
    if (KIND_MODELS[`${name}:bare`] && !this.fruitReady(id)) name = `${name}:bare`;
    const b = this.world.batches;
    if (kind === 'hotel') { const tier = `hotel_t${Math.min(2, this.s.hotel?.level ?? 0)}`; if (tier !== 'hotel_t0' && b.has(tier)) name = tier; }   // a floor more with each upgrade
    if (kind === 'cottage') { const tier = `cottage_t${Math.min(2, this.s.homes?.[id]?.level ?? 0)}`; if (b.has(tier)) name = tier; }   // each furnish level is its own building
    // AR-011: keep the clinic while its optional hospital model loads; the next late-kit sync selects the saved tier.
    if (kind === 'clinic' && Number.isSafeInteger(this.s.growth?.hospitalAt) && this.s.growth.hospitalAt >= 0 && b.has('clinic:hospital')) name = 'clinic:hospital';
    return b.has(name) ? name : b.has(`${name}~`) ? `${name}~` : null;
  }
  /** Fruit trees show fruit when their harvest is ready (whatever shape the play package's state takes). */
  fruitReady(id) {
    const s = this.s, now = this.game.now, st = s.trees?.[id] ?? s.fruitTrees?.[id] ?? s.orchard?.[id] ?? s.fruit?.[id] ?? s.production?.[id];
    if (!st) return true;
    if (typeof st.ready === 'boolean') return st.ready;
    const at = st.doneAt ?? st.readyAt ?? st.queue?.[0]?.doneAt;
    return at == null ? true : at <= now;
  }
  /**
   * The worn look of a model (PLAN-v0.3): its colours fade a little with the condition (1 worn, 2 shabby, 3 broken) and
   * small green grass grows round its foot (overgrow). Made once per model and level, from the registered geometry, and shared by every thing that looks that way.
   */
  dusty(name, level) {
    const key = `${name}@${level}`, b = this.world.batches;
    if (b.has(key)) return key;
    const m = b.models.get(name); if (!m) return name;
    const k = [0, 0.1, 0.2, 0.34][level], dark = [1, 0.99, 0.97, 0.93][level], tone = [0.6, 0.58, 0.46];   // only a little faded: the grass growing round it tells the rest
    const tint = g => {
      if (!g) return g; const c = g.clone(), col = c.attributes.color; if (!col) return c;
      for (let i = 0; i < col.count; i++) { const grey = (col.getX(i) + col.getY(i) + col.getZ(i)) / 3; col.setXYZ(i, (col.getX(i) * (1 - k) + (grey * 0.6 + tone[0] * 0.4) * k) * dark, (col.getY(i) * (1 - k) + (grey * 0.6 + tone[1] * 0.4) * k) * dark, (col.getZ(i) * (1 - k) + (grey * 0.6 + tone[2] * 0.4) * k) * dark); }
      col.needsUpdate = true; return c;
    };
    b.register(key, { geo: tint(m.geo), mid: m.mid === m.geo ? undefined : tint(m.mid), kind: m.kind, color: m.color });
    return key;
  }
  /** The farmhouse is not a placed thing: it is drawn by the world view and re-drawn here when its condition changes. */
  drawHouse() {
    const b = this.world.batches, it = b.items.get('farmhouse'); if (!it) return;
    this.houseBase ??= { ...it, model: 'farmhouse' };
    const comfort = this.s.house?.level ?? 1, tier = comfort >= 7 && b.has('farmhouse:3') ? 'farmhouse:3' : comfort >= 4 && b.has('farmhouse:2') ? 'farmhouse:2' : 'farmhouse';
    const lv = levelOf(this.s, 'house'), want = lv > 0 ? this.dusty(tier, lv) : tier;
    if (it.model !== want) b.set('farmhouse', { ...this.houseBase, model: want });
    // the garden: what each level of the house has brought (content/world.mjs HOME_GARDEN)
    HOME_GARDEN.forEach((g, i) => {
      const id = `homegarden:${i}`;
      if (g.model && comfort >= g.level && b.has(g.model)) b.set(id, { model: g.model, x: g.at[0] * CELL, z: g.at[1] * CELL, rot: g.rot ?? 0, ...(g.scale ? { scale: g.scale } : {}) }); else b.remove(id);
    });
  }
  /** World position of a placed item's centre. */
  centre(kind, x, z, rot) { const [w, d] = footprint(kind, rot); return { x: (x + w / 2) * CELL, z: (z + d / 2) * CELL }; }
  drawPlaced(id) {
    const p = this.s.placed[id], b = this.world.batches, old = this.pos.get(id);
    if (old) { this.world.ground.markDirty(old.x, old.z); this.pos.delete(id); }
    b.remove(`sails:${id}`); b.remove(`scaffold:${id}`); this.undress(id);
    for (let i = 0; i < 8; i++) b.remove(`overgrow:${id}:${i}`);
    if (this.beds.has(id)) { this.rimDirty.add(this.beds.get(id).chunk); this.beds.delete(id); }
    if (!p) { b.remove(id); return; }
    this.pos.set(id, { x: p.x, z: p.z }); this.world.ground.markDirty(p.x, p.z);
    if (p.kind === 'bed') {                                             // beds are tilled ground with a rim; life-view draws the crops
      b.remove(id);
      const chunk = `${Math.floor(p.x / RIM_CHUNK)},${Math.floor(p.z / RIM_CHUNK)}`;
      this.beds.set(id, { x: p.x, z: p.z, chunk }); this.rimDirty.add(chunk);
      return;
    }
    const model = this.model(p.kind, id);
    if (!model) return;                                                 // its model is still loading; sync() draws it later
    const lv = levelOf(this.s, id), c = this.centre(p.kind, p.x, p.z, p.rot), item = { model: lv > 0 ? this.dusty(model, lv) : model, x: c.x, z: c.z, rot: p.rot * Math.PI / 2 };
    b.set(id, item);
    // a worn thing is overgrown: little tufts of green grass along the foot of its walls, more as it gets worse
    if (lv > 0 && b.has('weeds')) {
      const [w, d] = footprint(p.kind, p.rot), hw = w * CELL / 2 - 0.12, hd = d * CELL / 2 - 0.12, n = [0, 3, 5, 8][lv];
      for (let i = 0; i < n; i++) {
        const r = ((p.x * 31 + p.z * 17 + i * 53) % 97) / 97, side = (i + p.x) % 4, along = r * 2 - 1;
        const ox = side === 0 ? -hw : side === 1 ? hw : along * hw, oz = side === 2 ? -hd : side === 3 ? hd : along * hd;
        b.set(`overgrow:${id}:${i}`, { model: i % 3 ? 'weeds' : 'weeds2', x: c.x + ox, z: c.z + oz, rot: r * 6, scale: 0.34 + r * 0.22 });
      }
    }
    // scaffolding against the front of a building while its repair runs
    if (isRepairing(this.s, id) && b.has('scaffold')) { const [w, d] = footprint(p.kind, p.rot), cs = Math.cos(item.rot), sn = Math.sin(item.rot), ox = -1.2, oz = d * CELL / 2 + 0.3; b.set(`scaffold:${id}`, { model: 'scaffold', x: c.x + ox * cs + oz * sn, z: c.z - ox * sn + oz * cs, rot: item.rot, scale: 0.9 }); }
    if (p.kind === 'feed_mill' && b.has('feed_mill_sails')) {
      const [at] = anchorPoints('feed_mill', 'sails', item), hub = ANCHORS.feed_mill_sails?.hub?.[0] ?? [0, 0, 0];
      if (at) b.set(`sails:${id}`, { model: 'feed_mill_sails', x: at.x, z: at.z, y: at.y - hub[1], rot: item.rot });
    }
    if (p.kind === 'cottage') this.dressCottage(id, item);
  }
  drawCell(x, z) {
    const t = cellType(this.s, x, z), b = this.world.batches, id = `c${x},${z}`;
    if (t === 'weeds') b.set(id, { model: (x * 7 + z * 3) % 3 ? 'weeds' : 'weeds2', x: (x + 0.5) * CELL, z: (z + 0.5) * CELL, rot: (x * 13 + z * 7) % 6, scale: 0.85 + ((x + z) % 3) * 0.1 });
    else if (t === 'rock') b.set(id, { model: 'rock', x: (x + 0.5) * CELL, z: (z + 0.5) * CELL, rot: (x * 5 + z) % 6 });
    else b.remove(id);
    this.world.ground.markDirty(x, z);
    this.drawStones(x, z);
  }
  drawEdge(key) {
    const [x, z, side] = key.split(','), kind = this.s.fences[key], b = this.world.batches, id = `e${key}`;
    if (!kind) b.remove(id);
    else {
      const X = +x * CELL, Z = +z * CELL, model = b.has(kind) ? kind : null;
      if (model) b.set(id, side === 'n' ? { model, x: X + CELL / 2, z: Z, rot: 0 } : { model, x: X, z: Z + CELL / 2, rot: Math.PI / 2 });
    }
    // the posts at both ends of this edge
    if (side === 'n') { this.drawJoint(+x, +z); this.drawJoint(+x + 1, +z); } else { this.drawJoint(+x, +z); this.drawJoint(+x, +z + 1); }
  }
  /** A post where fence edges meet at grid point (vx, vz): an end or straight post, a corner, or a T / cross joint. */
  drawJoint(vx, vz) {
    const f = this.s.fences, b = this.world.batches, id = `j${vx},${vz}`;
    const e = [f[`${vx},${vz},n`], f[`${vx - 1},${vz},n`], f[`${vx},${vz},w`], f[`${vx},${vz - 1},w`]];   // east, west, south, north
    const fences = e.map(k => k === 'fence'), n = fences.filter(Boolean).length;
    if (!n) { b.remove(id); return; }
    const straight = n === 2 && ((fences[0] && fences[1]) || (fences[2] && fences[3]));
    const model = n >= 3 ? 'fence:t' : n === 2 && !straight ? 'fence:corner' : 'fence:post';
    if (b.has(model)) b.set(id, { model, x: vx * CELL, z: vz * CELL, rot: 0 });
  }
  /** Edge stones on the sides of a path cell that touch grass (and the neighbours' sides that touch this cell). */
  drawStones(x, z) {
    const b = this.world.batches;
    if (!b.has('path_stones')) return;
    for (const [cx, cz] of [[x, z], [x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1]]) {
      if (cx < 0 || cz < 0 || cx >= N || cz >= N) continue;
      const path = cellType(this.s, cx, cz) === 'path';
      for (const [dx, dz, side] of [[0, -1, 'n'], [0, 1, 's'], [-1, 0, 'w'], [1, 0, 'e']]) {
        const id = `s${cx},${cz},${side}`, ox = cx + dx, oz = cz + dz;
        const t = cellType(this.s, ox, oz);
        const grass = path && (t === 'grass' || t === 'weeds') && !occupant(this.s, ox, oz);
        if (!grass) { b.remove(id); continue; }
        const X = (cx + 0.5 + dx * 0.47) * CELL, Z = (cz + 0.5 + dz * 0.47) * CELL;
        b.set(id, { model: 'path_stones', x: X, z: Z, rot: dx ? Math.PI / 2 : 0, scale: 0.9 + ((cx * 3 + cz * 5) % 3) * 0.06 });
      }
    }
  }
  /** A ruin stays until its building stands somewhere in the village; scaffolding marks the project being worked on. */
  drawRuins() {
    const s = this.s, b = this.world.batches, step = STEPS[s.projects?.step];
    // a fixed site (the boat dock on the brook) shows a sign from a little before its level until it is built
    for (const st of SITES) {
      const def = BUILDINGS[st.kind], [w, d] = def.size, sign = `sitesign:${st.kind}`, at = { x: (st.x + w / 2) * CELL, z: (st.z + d / 2) * CELL }, built = (s.counts[st.kind] ?? 0) > 0;
      if (st.hidden) { b.remove(sign); continue; }   // no sign: the story builds it (the cannery)
      if (st.ruin) {   // what is left of the old one stands there from the start (the burned festival stage)
        if (!built && b.has(st.ruin)) b.set(sign, { model: st.ruin, ...at, rot: st.rot * Math.PI / 2 }); else b.remove(sign);
      } else if (!built && s.level >= def.level - 2 && b.has('sale_sign')) b.set(sign, { model: 'sale_sign', ...at, rot: 0 });
      else b.remove(sign);
    }
    for (const r of RUINS) {
      const id = `ruin:${r.kind}`, built = (s.counts[r.kind] ?? 0) > 0 || !!s.village?.cleared?.[r.kind], [w, d] = r.kind === 'school' ? [5, 4] : [4, 3];   // rebuilt, or taken down
      const at = { x: (r.x + w / 2) * CELL, z: (r.z + d / 2) * CELL, rot: r.rot * Math.PI / 2 };
      if (b.has(id)) { if (built) b.remove(id); else b.set(id, { model: id, ...at }); }
      // a cleared lot that a police post or company office must return to keeps a sign, so it reads as a place with a purpose
      const empty = !(s.counts[r.kind] > 0) && !!s.village?.cleared?.[r.kind] && BUILDINGS[r.kind].civicSite && b.has('sale_sign');
      if (empty) b.set(`ruinsign:${r.kind}`, { model: 'sale_sign', x: at.x, z: at.z, rot: at.rot }); else b.remove(`ruinsign:${r.kind}`);
      const working = !built && step?.builds?.includes(r.kind) && b.has('scaffold');
      // against the ruin's front wall, a little off centre
      const ox = -1.6, oz = d * CELL / 2 - 0.6, c = Math.cos(at.rot), sn = Math.sin(at.rot);
      if (working) b.set(`scaffold:${r.kind}`, { model: 'scaffold', x: at.x + ox * c + oz * sn, z: at.z - ox * sn + oz * c, rot: at.rot, scale: 1.1 });
      else b.remove(`scaffold:${r.kind}`);
    }
  }
  /** The brook meadow (chapter 11, core/valley.mjs): Mr Albright's survey stakes on it and his car by the gate while his
   *  offer is open; wildflowers and three white hives if the meadow was kept; young trees round the cannery once it is a
   *  green one. Redrawn only when one of those changes (frame() asks once a second). */
  drawMeadow() {
    const s = this.s, b = this.world.batches, open = albrightOffer(s).open, kept = s.story?.albright === 'meadow', green = !!s.valley?.green && (s.counts.cannery ?? 0) > 0;
    const flowers = ['flowers', 'garden_flower'].filter(m => b.has(m));
    const key = [open, kept, green, b.has('survey_stakes'), b.has('car'), b.has('beehive'), flowers.length].join('|');
    if (key === this.meadowKey) return; this.meadowKey = key;
    const site = SITES.find(st => st.kind === 'cannery');
    if (open && b.has('survey_stakes')) b.set('meadow:stakes', { model: 'survey_stakes', x: (site.x + site.size[0] / 2) * CELL, z: (site.z + site.size[1] / 2) * CELL, rot: 0 }); else b.remove('meadow:stakes');
    if (open && b.has('car')) b.set('meadow:car', { model: 'car', x: ALBRIGHT.car.x * CELL, z: ALBRIGHT.car.z * CELL, rot: ALBRIGHT.car.rot }); else b.remove('meadow:car');
    for (let i = 0; i < MEADOW_FLOWERS; i++) {
      const id = `meadow:f${i}`;
      if (!kept || !flowers.length) { b.remove(id); continue; }
      const x = MEADOW.x0 + 0.2 + frac(i * 0.618034 + 0.13) * (MEADOW.x1 + 0.6 - MEADOW.x0), bank = Math.max(MEADOW.z0 + 0.2, brookCurve(x) + 0.5 + 2.1);   // not in the water
      const z = bank + frac(i * 0.754877 + 0.41) * (MEADOW.z1 + 0.8 - bank), r = frac(i * 0.3719 + 0.7);
      b.set(id, { model: flowers[i % 3 === 2 ? flowers.length - 1 : 0], x: x * CELL, z: z * CELL, rot: r * 6.28, scale: 0.85 + r * 0.5 });
    }
    ALBRIGHT.hives.forEach(([x, z], i) => { if (kept && b.has('beehive')) b.set(`meadow:hive${i}`, { model: 'beehive', x: x * CELL, z: z * CELL, rot: 0.35 * (i - 1) }); else b.remove(`meadow:hive${i}`); });
    GREEN_TREES.forEach(([dx, dz], i) => { if (green && b.has('round_tree')) b.set(`meadow:tree${i}`, { model: 'round_tree', x: (site.x + dx) * CELL, z: (site.z + dz) * CELL, rot: i * 1.7, scale: 0.62 + (i % 3) * 0.07 }); else b.remove(`meadow:tree${i}`); });
  }
  /** The riverside once its quay is paved (Act IV, core/riverside.mjs): the wild scatter leaves the zone (once), a sign
   *  stands on every free lot, lamps in the lanes between the lots and bollards along the water side of the quay. */
  drawRiverside() {
    const s = this.s, b = this.world.batches, paved = !!s.firsts?.quay;
    const taken = new Set(Object.values(s.placed).map(p => p.lot).filter(Boolean));
    const key = [paved, [...taken].sort().join(), b.has('sale_sign'), b.has('deco_lamp'), b.has('quay_bollard'), !!this.world.wildDecor].join('|');
    if (key === this.riversideKey) return; this.riversideKey = key;
    if (paved && this.world.wilds && this.world.wildDecor && !this.riversideCleared) { this.riversideCleared = true; clearWilds(this.world, inRiverside); }
    if (paved !== this.riversidePaved) { this.riversidePaved = paved; this.world.ground.markAll(); }
    LOTS.forEach((l, i) => {
      const sign = `quay:sign${i}`, lamp = `quay:lamp${i}`;
      if (paved && !taken.has(l.id) && b.has('sale_sign')) b.set(sign, { model: 'sale_sign', x: (l.x + l.w / 2) * CELL, z: (l.z + l.d - 0.6) * CELL, rot: 0 }); else b.remove(sign);
      if (paved && b.has('deco_lamp')) b.set(lamp, { model: 'deco_lamp', x: (l.x - 1) * CELL, z: (QUAY.z0 - 0.3) * CELL, rot: 0 }); else b.remove(lamp);   // lit at night by view/daylight.mjs
    });
    for (let x = QUAY.x0 + 1, i = 0; x <= QUAY.x1; x += 4, i++) { const id = `quay:b${i}`; if (paved && b.has('quay_bollard')) b.set(id, { model: 'quay_bollard', x: (x + 0.5) * CELL, z: (QUAY.z1 + 0.95) * CELL, rot: 0 }); else b.remove(id); }
    this.world.onLampsChanged?.();
  }
  /** Chapter 12's fixtures: the co-operative's notice board on the square from the day the idea comes, and the towpath's
   *  gate on the far bank, shut until the chapter is seen and open after. Redrawn only when one of those changes. */
  drawCooperative() {
    const s = this.s, b = this.world.batches, board = (s.story?.chapter ?? 0) >= 11, open = !!s.firsts?.bridge;
    const key = [board, open, b.has('cooperative_board'), b.has('towpath_gate'), b.has('towpath_gate_open')].join('|');
    if (key === this.cooperativeKey) return;
    if (this.cooperativeKey != null && open !== this.towpathOpen) this.world.ground.markAll();   // the path's ground changes with the gate
    this.cooperativeKey = key; this.towpathOpen = open;
    if (board && b.has('cooperative_board')) b.set('story:board', { model: 'cooperative_board', x: (COOPERATIVE_BOARD.x + 0.5) * CELL, z: (COOPERATIVE_BOARD.z + 0.5) * CELL, rot: COOPERATIVE_BOARD.rot * Math.PI / 2 }); else b.remove('story:board');
    const gate = open ? 'towpath_gate_open' : 'towpath_gate';
    if (b.has(gate)) b.set('story:gate', { model: gate, x: TOWPATH_GATE.x * CELL, z: TOWPATH_GATE.z * CELL, rot: TOWPATH_GATE.rot * Math.PI / 2 }); else b.remove('story:gate');
  }
  /** Cottage dressing by furnish level: a doormat, then window boxes and flowerpots, then a door lantern. */
  dressCottage(id, item) {
    const b = this.world.batches, level = this.s.homes?.[id]?.level ?? 0, model = item.model, ids = [];
    if (!b.has('window_box')) return;
    if (model.startsWith('cottage_t')) return;   // the rental cottages carry their own boxes, sign and garden
    const geo = b.models.get(model)?.geo, front = geo ? geo.boundingBox.max.z : 2.8;
    const put = (key, m, x, y, z, extra = {}) => {
      const c = Math.cos(item.rot), s = Math.sin(item.rot), did = `dress:${id}:${key}`;
      b.set(did, { model: m, x: item.x + x * c + z * s, z: item.z - x * s + z * c, y, rot: item.rot, ...extra }); ids.push(did);
    };
    put('mat', 'doormat', 0, 0.02, front + 0.35);
    // The default camera looks at a village cottage's back and one side (they face the lane to the north), so those walls
    // get life from the start (review: 'a blank cream wall with one window'): a flower box under every ground-floor
    // window on the back and sides, and a bush and a patch of flowers at the back corners.
    const box = geo?.boundingBox, back = box ? box.min.z : -2.6, sideX = box ? box.max.x : 2.6;
    (ANCHORS[model]?.window ?? []).filter(w => (w[4] ?? 0) < 0.7 && w[1] < 2.6).slice(0, 4).forEach((w, i) => {
      const nx = w[3] ?? 0, nz = w[4] ?? 0;
      put(`back${i}`, 'window_box', w[0] + nx * 0.12, Math.max(0.3, w[1] - 0.55), w[2] + nz * 0.12, { rot: item.rot + Math.atan2(nx, nz) });
    });
    if (b.has('bush')) { put('bushL', 'bush', -sideX + 0.5, 0, back - 0.45, { scale: 0.5 }); put('bushR', 'bush', sideX - 0.3, 0, back - 0.4, { scale: 0.42 }); }
    if (b.has('flowers')) put('flowersB', 'flowers', sideX - 1.3, 0, back - 0.45, { scale: 0.7 });
    if (level >= 1) {
      const wins = (ANCHORS[model]?.window ?? []).filter(w => (w[4] ?? 0) > 0.7 && w[1] < 2.6).slice(0, 3);
      wins.forEach((w, i) => put(`box${i}`, 'window_box', w[0], Math.max(0.3, w[1] - 0.55), w[2] + 0.12));
      put('pots', 'flowerpots', 1.6, 0, front + 0.45);
    }
    if (level >= 2) put('lantern', 'door_lantern', 0.75, 1.75, front - 0.1);
    this.dressed.set(id, ids);
  }
  undress(id) { for (const did of this.dressed.get(id) ?? []) this.world.batches.remove(did); this.dressed.delete(id); }

  // ── Bed rims: one InstancedMesh per 32 × 32 cells and level of detail (near: rims and furrows; middle: a flat frame) ──
  makeRims() {
    // near: a raised frame (top, outer and inner walls) and five furrow ridges, 44 triangles; middle: the flat frame.
    // Read as tilled soil, not a crate (review): a thin dark rim and crumbly dark-earth ridges with lit crests.
    const near = [], mid = [], col = [], colMid = [], rim = new THREE.Color('#7a4526'), rimTop = new THREE.Color('#9a6034'), inner = new THREE.Color('#4a2a16'), ridge = new THREE.Color('#5a331c'), ridgeLit = new THREE.Color('#8b5634');
    const quad = (arr, c, cs, a, b2, c2, d) => { arr.push(...a, ...b2, ...c2, ...a, ...c2, ...d); for (let k = 0; k < 6; k++) cs.push(c.r, c.g, c.b); };
    const o = 0.93, i = 0.85, h = 0.1, ring = [[-o, -o], [o, -o], [o, o], [-o, o]], inn = [[-i, -i], [i, -i], [i, i], [-i, i]];
    for (let k = 0; k < 4; k++) {
      const a = ring[k], b2 = ring[(k + 1) % 4], c = inn[(k + 1) % 4], d = inn[k];
      quad(near, rimTop, col, [a[0], h, a[1]], [d[0], h, d[1]], [c[0], h, c[1]], [b2[0], h, b2[1]]);
      quad(mid, rimTop, colMid, [a[0], 0.06, a[1]], [d[0], 0.06, d[1]], [c[0], 0.06, c[1]], [b2[0], 0.06, b2[1]]);
      quad(near, rim, col, [a[0], 0, a[1]], [a[0], h, a[1]], [b2[0], h, b2[1]], [b2[0], 0, b2[1]]);
      quad(near, inner, col, [d[0], h, d[1]], [d[0], 0, d[1]], [c[0], 0, c[1]], [c[0], h, c[1]]);
    }
    for (let k = 0; k < 5; k++) {
      const z = -0.64 + 0.32 * k, w = 0.15, y = 0.1;
      quad(near, ridgeLit, col, [-i, 0, z + w], [i, 0, z + w], [i, y, z], [-i, y, z]);
      quad(near, ridge, col, [-i, y, z], [i, y, z], [i, 0, z - w], [-i, 0, z - w]);
    }
    const geo = (pos, cs) => {
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(cs, 3)); g.computeVertexNormals(); g.computeBoundingBox(); g.computeBoundingSphere(); return g;
    };
    this.rimGeo = geo(near, col); this.rimMid = geo(mid, colMid);   // counter-clockwise: tops face up, walls face out (in, for the inner walls)
    this.world.cam?.onChange?.(() => this.rimLevels());
  }
  rimLevels() {
    const lod = this.world.cam.lod;
    for (const r of this.rims.values()) r.visible = lod === 0;
    if (this.rimAll) this.rimAll.visible = lod === 1;
  }
  /** Near rims per 16 × 16 cells (tight culling); the flat middle-level frames of every bed in one draw. */
  flushRims() {
    if (!this.rimGeo || !this.rimDirty.size) return;
    const scene = this.world.scene, m4 = new THREE.Matrix4(), mat = toon();
    const fill = (mesh, list) => { list.forEach((bd, i) => mesh.setMatrixAt(i, m4.makeTranslation((bd.x + 0.5) * CELL, 0.005, (bd.z + 0.5) * CELL))); mesh.count = list.length; mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere(); };
    const make = (geo, cap, tag) => { const m = new THREE.InstancedMesh(geo, mat, cap); m.userData.batch = tag; scene.add(m); return m; };
    for (const chunk of this.rimDirty) {
      const list = [...this.beds.values()].filter(bd => bd.chunk === chunk);
      let r = this.rims.get(chunk);
      if (r && r.instanceMatrix.count < list.length) { scene.remove(r); r.dispose(); this.rims.delete(chunk); r = null; }
      if (!r && list.length) { r = make(this.rimGeo, Math.min(RIM_CHUNK * RIM_CHUNK, Math.ceil(list.length * 1.3) + 16), `rims|${chunk}|near`); this.rims.set(chunk, r); }
      if (r) fill(r, list);
    }
    const all = [...this.beds.values()];
    if (this.rimAll && this.rimAll.instanceMatrix.count < all.length) { scene.remove(this.rimAll); this.rimAll.dispose(); this.rimAll = null; }
    if (!this.rimAll && all.length) this.rimAll = make(this.rimMid, Math.ceil(all.length * 1.3) + 64, 'rims|all|mid');
    if (this.rimAll) fill(this.rimAll, all);
    this.rimDirty.clear();
    this.rimLevels();
  }
  frame(dt) {
    if (!this.ready) return;
    this.flushRims(); this.driveTruck();
    // fruit trees change their look when their harvest comes ready
    this.clock += dt;
    if (this.clock > 1) {
      this.clock = 0; this.drawMeadow(); this.drawCooperative(); this.drawRiverside();
      for (const [id, p] of Object.entries(this.s.placed)) if (KIND_MODELS[`${p.kind}:bare`]) { const want = this.model(p.kind, id), item = this.world.batches.items.get(id); if (want && item?.model !== want) this.drawPlaced(id); }
    }
  }
  /** The delivery trucks: parked in a row by the market (the first nearest, later ones further east, each in its own
   *  colour once the late decor kit is in), or driving west along the village street and back while a trip runs. */
  driveTruck() {
    const b = this.world.batches, s = this.s, id = Object.keys(s.placed).find(k => s.placed[k].kind === 'market');
    const units = s.truck ? [s.truck, ...(s.truck.fleet ?? [])] : [];
    const clear = from => { for (let i = from; i < TRUCK.fleet.max; i++) b.remove(i ? `truck${i}` : 'truck'); };
    if (!id || !units.length || !b.has('truck') || levelOf(s, id) >= 3) { clear(0); return; }
    const p = s.placed[id], c = this.centre('market', p.x, p.z, p.rot), z = 91 * CELL;
    units.forEach((tr, i) => {
      const key = i ? `truck${i}` : 'truck', want = TRUCK_MODELS[i] ?? 'truck', model = b.has(want) ? want : 'truck';
      const homeX = c.x + (4.4 + i * TRUCK_GAP) * CELL;
      let x = homeX, rot = -Math.PI / 2, show = true;
      if (tr.away) {
        // Every truck drives the same distance at the same speed (the first truck's way to the west edge), so a convoy
        // keeps its parking gap instead of the far trucks catching up and driving through the near ones.
        const k = Math.max(0, Math.min(1, 1 - (tr.backAt - this.game.now) / TRUCK.tripMs)), reach = c.x + 4.4 * CELL - 2 * CELL;
        if (k < 0.2) x = homeX - reach * (k / 0.2);                // drives off west
        else if (k > 0.8) { x = homeX - reach * (1 - (k - 0.8) / 0.2); rot = Math.PI / 2; }   // comes home from the west
        else show = false;                                          // out in town
      }
      if (!show) { b.remove(key); return; }
      const cur = b.items.get(key), zz = tr.away ? z : z - 0.4 * CELL;
      if (!cur || cur.x !== x || cur.z !== zz || cur.rot !== rot || cur.model !== model) b.set(key, { model, x, z: zz, rot });
    });
    clear(units.length);
  }
  sync() {
    if (!this.ready || !this.s) return;
    const b = this.world.batches;
    for (const id of [...b.items.keys()]) if (OWN.test(id)) b.remove(id);
    for (const bd of this.beds.values()) this.rimDirty.add(bd.chunk);
    this.beds.clear(); this.dressed.clear(); this.pos.clear();
    for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) { const t = this.s.cells[z * N + x]; if (t === 1 || t === 2) this.drawCell(x, z); }
    for (const id of Object.keys(this.s.placed)) this.drawPlaced(id);
    for (const key of Object.keys(this.s.fences)) this.drawEdge(key);
    if (b.has('path_stones')) for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) if (cellType(this.s, x, z) === 'path') this.drawStones(x, z);
    this.drawRuins(); this.drawHouse(); this.meadowKey = null; this.drawMeadow(); this.cooperativeKey = null; this.drawCooperative(); this.riversideKey = null; this.drawRiverside();
    this.pens = new Map(); this.refreshPens();
    this.world.ground.markAll();
  }
  apply(events) {
    if (!this.ready) return;
    for (const e of events) {
      if (e.type === 'cellChanged') this.drawCell(e.x, e.z);
      else if (e.type === 'placed' || e.type === 'moved' || e.type === 'stored') { this.drawPlaced(e.id); this.drawRuins(); }   // a rebuilt building takes its old ruin's place at once, whatever the current project is
      else if (e.type === 'gardenFlower' || e.type === 'picked') this.drawPlaced(e.id);   // the streak garden plants from tick(); a picked tree goes bare
      else if (e.type === 'levelUp') this.drawRuins();   // a site's sign appears near its level
      else if (e.type === 'albrightAnswered' || e.type === 'canneryGreened') this.drawMeadow();
      else if (e.type === 'bridgeOpened') this.drawCooperative();
      else if (e.type === 'quayPaved') this.drawRiverside();
      else if (e.type === 'projectDone' || e.type === 'projectDelivered' || e.type === 'delivered' || e.type === 'ruinCleared') this.drawRuins();
      else if (e.type === 'fenceChanged') this.drawEdge(`${e.x},${e.z},${e.side}`);
      else if (e.type === 'homeUpgraded' || e.type === 'hotelUpgraded') this.drawPlaced(e.id);
      else if (e.type === 'hospitalUpgraded') {
        for (const [id, p] of Object.entries(this.s.placed)) if (p.kind === 'clinic') this.drawPlaced(id);
      }
      else if (e.type === 'houseUpgraded') this.drawHouse();
      else if (e.type === 'repairStarted' || e.type === 'repaired' || e.type === 'worn') {
        if (this.s.placed[e.id]) this.drawPlaced(e.id);
        else if (e.id === 'house') this.drawHouse();
        else if (ROAD_SEGMENTS.some(r => r.id === e.id)) this.world.ground.markAll();
      } else if (e.type === 'demolished') { this.drawPlaced(e.id); this.refreshPens(); this.drawRuins(); }
      else if (e.type === 'parcelBought' || e.type === 'loaded') this.sync();
    }
    if (events.some(e => e.type === 'fenceChanged' || e.type === 'placed' || e.type === 'moved' || e.type === 'stored' || e.type === 'cellChanged')) this.refreshPens();
  }
}
