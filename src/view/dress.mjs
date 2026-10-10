// World dressing (world package): everything that makes the map look lived-in rather than a grid.
//   - the backdrop (hills, tree band, haze, neighbour farms) and the brook, pond and bridge (backdrop.mjs, brook.mjs);
//   - the wilds, planned from a seeded density map: groves of overlapping trees edged with undergrowth, clearings with
//     flower drifts in vivid colours, swaying tufts, rocks and mushrooms (trees, bushes and rocks go through the shared
//     batches with their levels of detail; the small things are merged into a few vertex-coloured meshes);
//   - locked farm parcels: tall grass, saplings, rocks, a low fence on the edge and a For-sale sign where buyableParcels()
//     offers the land (none once the farm is at its v0.1 size), cleared on purchase;
//   - the homestead's picket fence and hedge, the arch over the farm entrance, the windmill's turning rotor;
//   - the village before it is rebuilt: a cobbled plaza round the old well, benches, lamp posts and shade trees, and
//     the charm milestones as they are reached (s.village.decor): bunting over the square, banners, a welcome sign;
//   - sky life (sky.mjs) and the light at night (daylight.mjs).
// It draws; it never changes the rules state.
import * as THREE from 'three';
import * as W from '../content/world.mjs';
import { occupant, cellsOf } from '../core/grid.mjs';
import { marketDayOf } from '../core/market-day.mjs';
import { buyableParcels } from '../core/build.mjs';
import { Backdrop, WIND, merge, part, decorMaterial, template, Builder } from './backdrop.mjs';
import { Brook, brookCentre, POND_SHAPE } from './brook.mjs';
import { noise } from './ground.mjs';
import { loadKit, bake, fit, averageColor } from './models.mjs';

const { N, CELL } = W;
let seed = 7; const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const pick = a => a[Math.floor(rand() * a.length)];
export const FLOWER_COLORS = ['#ff5a5f', '#ffd23f', '#8f6bff', '#ff8fc7', '#ffffff', '#ff9f1c'];

/** Cells kept clear of wild scatter: roads, water, buildable land, the homestead, the plaza and a few landmarks. */
export function reserved(x, z) {
  if (x < 0 || z < 0 || x >= N || z >= N) return true;
  if (W.isRoad(x, z) || W.inFarm(x, z) || W.inVillage(x, z) || W.nearHome(x, z)) return true;
  if (Math.abs(z + 0.5 - (W.brookCurve(x + 0.5) + 0.5)) < 3.4) return true;
  if (x >= W.POND.x0 - 3 && x <= W.POND.x1 + 3 && z >= W.POND.z0 - 3 && z <= W.POND.z1 + 3) return true;
  if (z >= 88 && z <= 89 && x >= 30) return true;                         // the verge between the farm and the village road
  if (x >= 30 && x <= 31 && z >= 22 && z <= 89) return true;               // the verge between the road and the farm
  if (W.NEIGHBOUR_SIGNS.some(s => Math.abs(s.x - x) <= 2 && Math.abs(s.z - z) <= 2)) return true;
  if (z <= W.TRACK.z + 1) return true;                                     // the railway along the north edge (chapter 15), and room beside it
  if (W.inTowpath(x, z) || W.inTowpath(x, z + 1) || W.inTowpath(x, z + 2)) return true;   // the old towpath on the far bank (chapter 12), and room for the crowns beside it
  return false;
}
/** The footprints of the story's fixed sites (the boat dock) and scenery (the old mill): wild scatter keeps off them. */
const SITE_BOXES = W.SITES.map(st => ({ x0: st.x, x1: st.x + st.size[0] - 1, z0: st.z, z1: st.z + st.size[1] - 1 })).concat(W.OLD_MILL.box, W.MEADOW);   // and off the old mill on the bank, and the brook meadow (chapter 11)
/** Within two cells of a road (trees and bushes keep their crowns off it). */
const nearRoad = (x, z) => W.ROADS.some(r => x >= r.x0 - 2 && x <= r.x1 + 2 && z >= r.z0 - 2 && z <= r.z1 + 2);
/** Grove density, 0..1: high in the woods, low in clearings (seeded; the same in every game). */
export const density = (x, z) => noise(x * 0.075 + 3.1, z * 0.075 - 7.4) * 0.72 + noise(x * 0.21 - 9.3, z * 0.21 + 2.2) * 0.28;
export const GROVE = 0.56, EDGE = 0.49;

/** The wild scatter as data: { trees, bushes, rocks, flowers, tufts, mushrooms }, positions in metres. */
export function planWilds() {
  seed = 20261007;
  const out = { trees: [], bushes: [], rocks: [], flowers: [], tufts: [], mushrooms: [] };
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
    if (reserved(x, z)) continue;
    const d = density(x, z), cx = (x + 0.5) * CELL, cz = (z + 0.5) * CELL;
    if (nearRoad(x, z)) { if (rand() < 0.14) out.tufts.push({ x: cx + (rand() - 0.5) * 1.8, z: cz + (rand() - 0.5) * 1.8, s: 1 }); continue; }
    if (d > GROVE) {
      // the woods: about one tree per two cells, crowns overlapping; bigger trees deeper in
      if (rand() < 0.36 + (d - GROVE) * 1.4) out.trees.push({ x: cx + (rand() - 0.5) * 1.6, z: cz + (rand() - 0.5) * 1.6, s: 0.7 + rand() * 0.45 + (d - GROVE) * 2.2, pine: rand() < 0.4 + (noise(x * 0.05, z * 0.05) - 0.5) });
      if (rand() < 0.05) out.mushrooms.push({ x: cx + (rand() - 0.5) * 1.6, z: cz + (rand() - 0.5) * 1.6 });
      if (rand() < 0.12) out.tufts.push({ x: cx + (rand() - 0.5) * 1.8, z: cz + (rand() - 0.5) * 1.8, s: 1.1 });
    } else if (d > EDGE) {
      // the edge of the woods: undergrowth, a young tree now and then, tufts
      const r = rand();
      if (r < 0.2) out.bushes.push({ x: cx + (rand() - 0.5) * 1.4, z: cz + (rand() - 0.5) * 1.4, s: 0.75 + rand() * 0.5 });
      else if (r < 0.27) out.trees.push({ x: cx + (rand() - 0.5) * 1.4, z: cz + (rand() - 0.5) * 1.4, s: 0.6 + rand() * 0.35, pine: rand() < 0.3 });
      if (rand() < 0.3) out.tufts.push({ x: cx + (rand() - 0.5) * 1.8, z: cz + (rand() - 0.5) * 1.8, s: 1.2 });
    } else {
      // clearings: open grass, the odd lone tree or rock, and flower drifts
      const r = rand();
      if (r < 0.012) out.trees.push({ x: cx, z: cz, s: 0.9 + rand() * 0.6, pine: rand() < 0.25, blossom: rand() < 0.3 });
      else if (r < 0.022) out.rocks.push({ x: cx + (rand() - 0.5), z: cz + (rand() - 0.5), s: 0.7 + rand() * 0.7 });
      if (rand() < 0.14) out.tufts.push({ x: cx + (rand() - 0.5) * 1.8, z: cz + (rand() - 0.5) * 1.8, s: 1.1 });
    }
  }
  // flower drifts: seeded centres in clearings, 5–15 flowers of one or two colours each
  for (let i = 0; i < 2400 && out.flowers.length < 1900; i++) {
    const x = rand() * N, z = rand() * N, cx = Math.floor(x), cz = Math.floor(z);
    if (reserved(cx, cz) || density(cx, cz) > EDGE + 0.04 || rand() < 0.45) continue;
    const n = 5 + Math.floor(rand() * 11), c1 = pick(FLOWER_COLORS), c2 = rand() < 0.4 ? pick(FLOWER_COLORS) : c1, r = 1.2 + rand() * 1.6;
    for (let k = 0; k < n; k++) {
      const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * r, fx = x + Math.cos(a) * d / CELL * 1.3, fz = z + Math.sin(a) * d / CELL;
      if (reserved(Math.floor(fx), Math.floor(fz))) continue;
      out.flowers.push({ x: fx * CELL, z: fz * CELL, c: rand() < 0.75 ? c1 : c2, s: 0.85 + rand() * 0.4 });
    }
  }
  // verges: flowers along the roads and the brook's banks
  for (let z = 0; z < N; z += 1) for (const x of [26, 31]) if (!reserved(x, z) && rand() < 0.22) out.flowers.push({ x: (x + 0.5) * CELL + (rand() - 0.5), z: (z + 0.5) * CELL, c: pick(FLOWER_COLORS), s: 0.9 });
  for (let xm = 0; xm < N * CELL; xm += 2.3) for (const side of [-1, 1]) if (rand() < 0.3) {
    const z = brookCentre(xm) + side * (6.4 + rand() * 1.4), cx = Math.floor(xm / CELL), cz = Math.floor(z / CELL);
    if (!W.isRoad(cx, cz) && !W.inFarm(cx, cz) && !W.nearHome(cx, cz)) out.flowers.push({ x: xm, z, c: pick(FLOWER_COLORS), s: 0.9 + rand() * 0.3 });
  }
  // Clear the public approach and the separate fishing places without reseeding the rest of the scenery.
  for (const [kind, items] of Object.entries(out)) out[kind] = items.filter(t => {
    const margin = kind === 'trees' ? 2.3 * t.s : kind === 'bushes' ? 1.1 * t.s : kind === 'rocks' ? t.s : 0.6;
    return [W.POND_PATH, W.POND_SHORE, ...SITE_BOXES].every(p => t.x + margin < p.x0 * CELL || t.x - margin > (p.x1 + 1) * CELL || t.z + margin < p.z0 * CELL || t.z - margin > (p.z1 + 1) * CELL);
  });
  return out;
}

// ── Small procedural pieces (vertex colours; sway weights on what bends) ──
// A flower is 7 triangles: a five-petal fan whose centre vertex carries the yellow heart, on a two-sided stem blade.
function flowerHead(color) {
  const pos = [], col = [], c = new THREE.Color(color), heart = new THREE.Color(color === '#ffd23f' ? '#ff8a3d' : '#ffe14d'), PET = 5;
  for (let i = 0; i < PET; i++) {
    const a0 = i / PET * Math.PI * 2, a1 = a0 + Math.PI * 2 / PET, r0 = 1, r1 = 1;
    pos.push(0, 0.05, 0, Math.cos(a1) * r1, 0, Math.sin(a1) * r1, Math.cos(a0) * r0, 0, Math.sin(a0) * r0);
    col.push(heart.r, heart.g, heart.b, c.r, c.g, c.b, c.r, c.g, c.b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const n = new Float32Array(pos.length); for (let i = 1; i < n.length; i += 3) n[i] = 1; g.setAttribute('normal', new THREE.BufferAttribute(n, 3));
  return g;
}
const HEADS = new Map();
const BLADE = (() => {
  // one grass blade, both faces (the camera sees both sides as it turns)
  const g = new THREE.BufferGeometry(), p = [-0.06, 0, 0, 0.06, 0, 0, 0.01, 1, 0.02];
  g.setAttribute('position', new THREE.Float32BufferAttribute([...p, p[0], p[1], p[2], p[6], p[7], p[8], p[3], p[4], p[5]], 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0.3, 0, 1, 0.3, 0, 1, 0.3, 0, 1, -0.3, 0, 1, -0.3, 0, 1, -0.3], 3));
  return g;
})();
const WHITE = '#ffffff', BLADES = [-0.35, 0, 0.35].map(a => template(BLADE.clone().applyMatrix4(new THREE.Matrix4().makeRotationZ(a)), WHITE));
const col = (() => { const cache = new Map(); return hex => cache.get(hex) ?? cache.set(hex, new THREE.Color(hex)).get(hex); })();
/** A flower: a two-sided stem blade and a five-petal head (7 triangles), swaying. */
function flower(f, B) {
  const h = (0.3 + rand() * 0.16) * f.s, size = 0.34 * f.s;
  if (!HEADS.has(f.c)) HEADS.set(f.c, template(flowerHead(f.c)));
  const y = f.y ?? 0;
  B.add(BLADES[1], f.x, y, f.z, rand() * 6, 0.5, h, 1, col('#4f9e3c'), 0.8);
  B.add(HEADS.get(f.c), f.x, y + h, f.z, rand() * 6, size, size, size, null, 1, true);
}
const TUFT_COLS = ['#7cc443', '#93d24a', '#5fb33a', '#a6d45a'];
/** A tuft: three blades fanned out. */
function tuft(t, B, tall = 1) {
  const c = col(pick(TUFT_COLS));
  for (let b = 0; b < 3; b++) B.add(BLADES[b], t.x + (rand() - 0.5) * 0.3, 0, t.z + (rand() - 0.5) * 0.3, rand() * 6, 1, (0.36 + rand() * 0.24) * t.s * tall, 1, c, 1);
}
const CAP = template(new THREE.ConeGeometry(0.2, 0.16, 6), WHITE), STALK = template(new THREE.CylinderGeometry(0.06, 0.07, 0.18, 4, 1, true).translate(0, 0.09, 0), WHITE);
function mushroom(m, B) { const s = 0.8 + rand() * 0.6; B.add(STALK, m.x, 0, m.z, 0, s, s, s, col('#f6ecd6')); B.add(CAP, m.x, 0.24 * s, m.z, rand(), s, s, s, col(rand() < 0.6 ? '#e8463c' : '#c98a4a')); }

/** Builders by 32 × 32 cell block, so off-screen blocks are culled (blocks with nothing draw nothing). */
class Blocks {
  constructor() { this.map = new Map(); }
  at(xm, zm) { const key = `${Math.max(0, Math.min(3, Math.floor(xm / (32 * CELL))))},${Math.max(0, Math.min(3, Math.floor(zm / (32 * CELL))))}`; return this.map.get(key) ?? this.map.set(key, new Builder()).get(key); }
  meshes(world, name) { return [...this.map].filter(([, B]) => !B.empty).map(([key, B]) => { const m = new THREE.Mesh(B.build(), decorMaterial()); m.name = `${name}-${key}`; world.scene.add(m); return m; }); }
}

/** Trees, bushes and rocks into the batches, with shade stamped on the ground under them. */
function placeTrees(world, plan) {
  const b = world.batches; let n = 0;
  for (const t of plan.trees) {
    const model = t.blossom ? 'tree_blossom' : t.pine ? 'tree_pine' : 'tree_round';
    b.set(`wild${n++}`, { model, x: t.x, z: t.z, rot: rand() * 6.28, scale: t.s });
    world.ground.stampShade(t.x + 0.6, t.z + 0.4, 2.3 * t.s, 0.16);
  }
  for (const t of plan.bushes) { b.set(`wild${n++}`, { model: 'bush', x: t.x, z: t.z, rot: rand() * 6.28, scale: t.s }); world.ground.stampShade(t.x, t.z, 1.1 * t.s, 0.1); }
  for (const t of plan.rocks) b.set(`wild${n++}`, { model: 'rock', x: t.x, z: t.z, rot: rand() * 6.28, scale: t.s });
}
/** Take the wild scatter off land that has just been built on (the riverside, once its quay is paved): its trees,
 *  bushes and rocks leave the batches, the merged flowers and tufts are rebuilt without the ones inside, and the shade
 *  under the trees is stamped again. inside(cellX, cellZ). Returns how many batch items went. */
export function clearWilds(world, inside) {
  const plan = world.wilds; if (!plan) return 0;
  const out = t => inside(Math.floor(t.x / CELL), Math.floor(t.z / CELL));
  const b = world.batches; let n = 0, removed = 0;
  for (const list of [plan.trees, plan.bushes, plan.rocks]) for (const t of list) { const id = `wild${n++}`; if (!t.gone && out(t)) { t.gone = true; b.remove(id); removed++; } }   // the ids follow placeTrees' order
  for (const key of ['flowers', 'tufts', 'mushrooms']) plan[key] = plan[key].filter(t => !out(t));
  if (world.wildDecor) { for (const m of world.wildDecor) { world.scene.remove(m); m.geometry.dispose(); } world.wildDecor = placeDecor(world, plan); }
  world.ground.clearShade();
  for (const t of plan.trees) if (!t.gone) world.ground.stampShade(t.x + 0.6, t.z + 0.4, 2.3 * t.s, 0.16);
  for (const t of plan.bushes) if (!t.gone) world.ground.stampShade(t.x, t.z, 1.1 * t.s, 0.1);
  world.ground.markAll();
  return removed;
}
/** Flowers, tufts and mushrooms merged into a few meshes. */
function placeDecor(world, plan) {
  seed = 9001;
  const blocks = new Blocks();
  for (const f of plan.flowers) flower(f, blocks.at(f.x, f.z));
  for (const t of plan.tufts) tuft(t, blocks.at(t.x, t.z));
  for (const m of plan.mushrooms) mushroom(m, blocks.at(m.x, m.z));
  return blocks.meshes(world, 'wild-decor');
}

/** The homestead: a picket fence on the north and south lines, a hedge on the west, and the arch over the farm entrance. */
function dressHomestead(world) {
  const b = world.batches, x0 = 14 * CELL, x1 = 27.6 * CELL, z0 = 51.9 * CELL, z1 = 81.1 * CELL;
  let n = 0;
  for (let x = x0 + 1; x < x1; x += 2) { b.set(`home-fence${n++}`, { model: 'picket', x, z: z0, rot: 0 }); b.set(`home-fence${n++}`, { model: 'picket', x, z: z1, rot: 0 }); }
  const hedge = [], box = new THREE.SphereGeometry(1, 7, 4);
  for (let z = z0 + 0.6; z < z1; z += 1.05) hedge.push(part(box, rand() < 0.5 ? '#3f8a36' : '#4a9a3a', x0 - 0.6, 0.55, z, rand() * 3, 0.75, 0.75 + rand() * 0.15, 0.8));
  for (let z = z0 + 2; z < z1 - 1; z += 2.6 + rand() * 2) hedge.push(part(new THREE.SphereGeometry(1, 6, 3), rand() < 0.5 ? '#ff8fc7' : '#fff4f8', x0 - 0.55 + (rand() - 0.5) * 0.5, 1.22, z, 0, 0.17, 0.12, 0.17));
  // the farmhouse forecourt (W.HOME_YARD): warm stone tiles, about 0.9 m on a 1 m pitch over the grout the ground draws,
  // and two flower planters at its south corners; in this mesh so they stay local to the homestead (and hide far out)
  const Y = W.HOME_YARD, tile = new THREE.BoxGeometry(1, 1, 1), stone = ['#d9a477', '#d09a6c', '#e0ae82', '#e6b98e'];
  for (let tz = Y.z0 * CELL + 0.5; tz < (Y.z1 + 1) * CELL; tz += 1) for (let tx = Y.x0 * CELL + 0.5; tx < (Y.x1 + 1) * CELL; tx += 1)
    hedge.push(part(tile, stone[Math.floor(rand() * stone.length)], tx + (rand() - 0.5) * 0.05, 0.025, tz + (rand() - 0.5) * 0.05, (rand() - 0.5) * 0.06, 0.9, 0.05, 0.9));
  const pot = new THREE.CylinderGeometry(0.5, 0.4, 0.42, 8), bloom = new THREE.SphereGeometry(1, 6, 4);
  for (const cx of [Y.x0 + 0.35, Y.x1 + 0.65]) {
    const x = cx * CELL, z = (Y.z1 + 0.6) * CELL;
    hedge.push(part(pot, '#b0664a', x, 0.21, z), part(bloom, '#4a9a3a', x, 0.5, z, 0, 0.42, 0.22, 0.42));
    for (let k = 0; k < 6; k++) hedge.push(part(bloom, pick(FLOWER_COLORS), x + (rand() - 0.5) * 0.55, 0.62, z + (rand() - 0.5) * 0.55, 0, 0.11, 0.09, 0.11));
  }
  const m = new THREE.Mesh(merge(hedge), decorMaterial()); m.name = 'home-hedge'; world.scene.add(m);
  b.set('farm-gate', { model: 'farm_gate', x: W.FARM_GATE.x * CELL, z: W.FARM_GATE.z * CELL, rot: W.FARM_GATE.rot });
}

/** Locked parcels: overgrown land with saplings and rocks, a low fence along owned land, a For-sale sign on each one you can buy. */
class LockedLand {
  constructor(world, game) {
    Object.assign(this, { world, game, ids: [], mesh: null });
    this.sync();
    game.on(r => { if (r.events?.some(e => e.type === 'parcelBought' || e.type === 'loaded')) this.sync(); });
  }
  put(id, item) { this.world.batches.set(id, item); this.ids.push(id); }
  sync() {
    const { world, game } = this, b = world.batches, owned = new Set(game.s.parcels), onOffer = new Set(buyableParcels(game.s).map(p => p.parcel));
    for (const id of this.ids) b.remove(id); this.ids = [];
    if (this.mesh) { world.scene.remove(this.mesh); this.mesh.geometry.dispose(); this.mesh = null; }
    seed = 515;
    const B = new Builder(), sign = [], all = []; this.flowers = [];
    for (let px = 0; px < W.FARM.parcels; px++) for (let pz = 0; pz < W.FARM.parcels; pz++) all.push(`${px},${pz}`);
    const at = (px, pz) => all.includes(`${px},${pz}`) ? `${px},${pz}` : null;
    for (const id of all) {
      if (owned.has(id)) continue;
      const o = W.parcelOrigin(id), [px, pz] = id.split(',').map(Number);
      seed = 515 + px * 977 + pz * 131;   // each parcel keeps its own look whatever else is bought
      for (let z = o.z; z < o.z + W.PARCEL; z++) for (let x = o.x; x < o.x + W.PARCEL; x++) {
        const cx = (x + 0.5) * CELL, cz = (z + 0.5) * CELL, d = density(x, z), r = rand();
        if (r < 0.3) tuft({ x: cx + (rand() - 0.5) * 1.6, z: cz + (rand() - 0.5) * 1.6, s: 1.15 }, B, 1.8);
        const q = rand(), wood = d > EDGE ? 2 : 1;
        if (q < 0.028 * wood) this.put(`lock-tree:${x},${z}`, { model: rand() < 0.5 ? 'tree_round' : 'tree_pine', x: cx, z: cz, rot: rand() * 6, scale: 0.38 + rand() * 0.3 });
        else if (q < 0.028 * wood + 0.07) this.put(`lock-bush:${x},${z}`, { model: 'bush', x: cx + (rand() - 0.5), z: cz + (rand() - 0.5), rot: rand() * 6, scale: 0.75 + rand() * 0.55 });
        else if (q < 0.028 * wood + 0.095) this.put(`lock-rock:${x},${z}`, { model: 'rock', x: cx, z: cz, rot: rand() * 6, scale: 0.6 + rand() * 0.5 });
        else if (q < 0.028 * wood + 0.14) { const f = { x: cx, z: cz, c: pick(FLOWER_COLORS), s: 1 }; flower(f, B); this.flowers.push(f); }
      }
      // a low fence on every edge shared with owned land, and a sign at its middle if it can be bought now
      const sides = [[0, -1, 'n'], [0, 1, 's'], [-1, 0, 'w'], [1, 0, 'e']];
      for (const [dx, dz, side] of sides) {
        const nb = at(px + dx, pz + dz); if (!nb || !owned.has(nb)) continue;
        const horiz = side === 'n' || side === 's', line = side === 'n' ? o.z : side === 's' ? o.z + W.PARCEL : side === 'w' ? o.x : o.x + W.PARCEL;
        for (let k = 0; k < W.PARCEL; k++) {
          if (k === 7 || k === 8) continue;   // a gap in the middle, where the sign stands
          const sid = `lock-fence:${id}:${side}:${k}`, along = (horiz ? o.x : o.z) + k + 0.5;
          b.set(sid, horiz ? { model: 'picket', x: along * CELL, z: line * CELL, rot: 0, scale: 0.8 } : { model: 'picket', x: line * CELL, z: along * CELL, rot: Math.PI / 2, scale: 0.8 });
          this.ids.push(sid);
        }
        if (!onOffer.has(id) || sign.some(sg => sg.parcel === id)) continue;   // one sign per parcel on offer
        const mid = (horiz ? o.x : o.z) + 8, inward = side === 'n' || side === 'w' ? 0.9 : -0.9;
        sign.push(horiz ? { parcel: id, x: mid * CELL, z: line * CELL + inward, rot: 0 } : { parcel: id, x: line * CELL + inward, z: mid * CELL, rot: Math.PI / 2 });
      }
    }
    for (const s of sign) B.addGeometry(merge(forSale(s)));
    if (!B.empty) { this.mesh = new THREE.Mesh(B.build(), decorMaterial()); this.mesh.name = 'locked-land'; world.scene.add(this.mesh); }
    this.signs = sign.length;
  }
}
/** A For-sale sign: two posts, a cream board with a red band and a gold coin. */
function forSale({ x, z, rot }) {
  const box = new THREE.BoxGeometry(1, 1, 1), m = new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot), new THREE.Vector3(1, 1, 1));
  const parts = [
    part(box, '#8a5a32', -0.55, 0.6, 0, 0, 0.12, 1.2, 0.12), part(box, '#8a5a32', 0.55, 0.6, 0, 0, 0.12, 1.2, 0.12),
    part(box, '#fff4dc', 0, 1.05, 0.02, 0, 1.5, 0.75, 0.08), part(box, '#e8463c', 0, 1.3, 0.07, 0, 1.5, 0.2, 0.04),
    part(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 10).rotateX(Math.PI / 2), '#ffc93c', 0, 0.98, 0.08), part(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 10).rotateX(Math.PI / 2), '#ffc93c', 0, 0.98, -0.04),
  ];
  return parts.map(p => p.applyMatrix4(m));
}

/** The village before the rebuild: plaza cobbles round the old well, benches, lamps and shade trees along the road. */
async function dressVillage(world, game) {
  const P = W.PLAZA, B = new Builder(), hex = template(new THREE.CircleGeometry(1, 6).rotateX(-Math.PI / 2), WHITE), cols = ['#d9c3a0', '#c9b08a', '#e3d1b0', '#bfa47e', '#cdbb9b'];
  for (let z = P.z0 * CELL; z < (P.z1 + 1) * CELL; z += 0.62) for (let x = P.x0 * CELL + ((Math.round(z / 0.62) % 2) * 0.31); x < (P.x1 + 1) * CELL; x += 0.62) {
    const dx = x - W.WELL.x * CELL, dz = z - W.WELL.z * CELL; if (Math.hypot(dx, dz) < 1.6) continue;
    B.add(hex, x + (rand() - 0.5) * 0.06, 0.025, z + (rand() - 0.5) * 0.06, rand(), 0.29, 1, 0.29, col(pick(cols)));
  }
  // planters with flowers at the plaza's corners
  for (const [cx, cz] of [[P.x0, P.z0], [P.x1 + 1, P.z0], [P.x0, P.z1 + 1], [P.x1 + 1, P.z1 + 1]]) {
    const x = cx * CELL + (cx === P.x0 ? 0.8 : -0.8), z = cz * CELL + (cz === P.z0 ? 0.8 : -0.8);
    B.addGeometry(merge([part(new THREE.CylinderGeometry(0.55, 0.45, 0.45, 8), '#b0664a', x, 0.22, z)]));
    for (let k = 0; k < 6; k++) flower({ x: x + (rand() - 0.5) * 0.6, y: 0.42, z: z + (rand() - 0.5) * 0.6, c: pick(FLOWER_COLORS), s: 0.9 }, B);
  }
  const cobbles = new THREE.Mesh(B.build(), decorMaterial()); cobbles.name = 'plaza'; world.scene.add(cobbles);
  // the well, benches and lamps arrive once the farm's own models are in (they must not slow the first scene)
  await new Promise(r => setTimeout(r, 1200));
  const [well, kit] = await Promise.all([loadKit('well'), loadKit('farm-kit')]);
  const reg = (name, root, size) => { if (world.batches.has(name)) return; const geo = fit(bake(root), size); world.batches.register(name, { geo, kind: 'static', color: averageColor(geo) }); };
  reg('well', well.well, { height: 3.2 }); reg('deco_bench', kit.bench, { width: 1.6 }); reg('deco_lamp', kit.lamp, { height: 2.6 });
  const items = [
    ['plaza-well', { model: 'well', x: W.WELL.x * CELL, z: W.WELL.z * CELL, rot: 0.3 }],
    ['plaza-bench1', { model: 'deco_bench', x: (P.x0 + 0.6) * CELL, z: (W.WELL.z) * CELL, rot: Math.PI / 2 }],
    ['plaza-bench2', { model: 'deco_bench', x: (P.x1 + 0.4) * CELL, z: (W.WELL.z) * CELL, rot: -Math.PI / 2 }],
    ['plaza-bench3', { model: 'deco_bench', x: W.WELL.x * CELL, z: (P.z1 + 0.4) * CELL, rot: Math.PI }],
    ['plaza-lamp1', { model: 'deco_lamp', x: (P.x0 + 0.35) * CELL, z: (W.WELL.z - 1.6) * CELL, rot: 0 }],
    ['plaza-lamp2', { model: 'deco_lamp', x: (P.x1 + 0.65) * CELL, z: (W.WELL.z + 1.6) * CELL, rot: 0 }],
    // market stalls in the plaza's corners (vivid pass): striped awnings, goods, a busy village square
    ...(world.batches.has('stall') ? [['plaza-stall1', { model: 'stall', x: (P.x0 + 1) * CELL, z: (P.z0 + 1) * CELL, rot: Math.PI / 4 }],
      ['plaza-stall2', { model: 'stall', x: (P.x1) * CELL, z: (P.z0 + 1) * CELL, rot: -Math.PI / 4 }],
      ['plaza-stall3', { model: 'stall', x: (P.x1) * CELL, z: (P.z1) * CELL, rot: -3 * Math.PI / 4 }]] : []),
    // a bench at the south edge of the farmhouse forecourt, between its planters
    ['home-bench', { model: 'deco_bench', x: ((W.HOME_YARD.x0 + W.HOME_YARD.x1 + 1) / 2) * CELL, z: (W.HOME_YARD.z1 + 0.6) * CELL, rot: Math.PI }],
  ];
  // little shops along the village pond's north and south shores, facing the water, each with a deck to stand on
  // (decor models load late: placed when they are in)
  const shops = [['lake_kiosk_fish', W.POND.x0 + 0.5, W.POND.z0 - 1.6, 0], ['lake_kiosk_snacks', W.POND.x1 - 0.5, W.POND.z0 - 1.6, 0],
    ['lake_kiosk_flowers', W.POND.x0 + 0.5, W.POND.z1 + 2.6, Math.PI], ['lake_kiosk_fish', W.POND.x1 - 0.5, W.POND.z1 + 2.6, Math.PI]];
  const placeShops = (tries = 0) => {
    if (!shops.every(([m]) => world.batches.has(m))) { if (tries < 60) setTimeout(() => placeShops(tries + 1), 500); return; }
    shops.forEach(([model, x, z, rot], i) => world.batches.set(`lake-shop${i}`, { model, x: x * CELL, z: z * CELL, rot }));
  };
  placeShops();
  // the verge between the farm and the village road: shade trees and lamp posts, alternating
  for (let x = 34, k = 0; x < 96; x += 6, k++) {
    if (k % 2) items.push([`verge-lamp${k}`, { model: 'deco_lamp', x: (x + 0.5) * CELL, z: 89.4 * CELL, rot: 0 }]);
    else items.push([`verge-tree${k}`, { model: k % 4 ? 'tree_round' : 'tree_blossom', x: (x + 0.5) * CELL, z: 88.7 * CELL, rot: x, scale: 0.85 }]);
  }
  // stakes and string marking the first cottage plots along the village road (they go when something is built there)
  if (!world.batches.has('plot_stakes')) {
    const box = new THREE.BoxGeometry(1, 1, 1), w = 3 * CELL - 0.3, parts = [];
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { parts.push(part(box, '#b07a45', sx * w / 2, 0.35, sz * w / 2, 0, 0.1, 0.7, 0.1), part(box, '#fff4dc', sx * w / 2, 0.73, sz * w / 2, 0, 0.12, 0.08, 0.12)); }
    for (const [x, z, horiz] of [[0, -w / 2, 1], [0, w / 2, 1], [-w / 2, 0, 0], [w / 2, 0, 0]]) parts.push(part(box, '#f2e6cc', x, 0.55, z, 0, horiz ? w : 0.025, 0.025, horiz ? 0.025 : w));
    parts.push(part(box, '#e8463c', -w / 2, 0.66, -w / 2 + 0.25, 0, 0.03, 0.18, 0.4));   // a little red flag
    const geo = merge(parts); world.batches.register('plot_stakes', { geo, kind: 'static', color: averageColor(geo) });
  }
  for (let i = 0; i < 6; i++) items.push([`plot-stakes${i}`, { model: 'plot_stakes', x: (33 + 4 * i + 1.5) * CELL, z: (93 + 1.5) * CELL, rot: 0, cells: [[33 + 4 * i, 93], [35 + 4 * i, 95], [34 + 4 * i, 94]] }]);
  // lamps along the north–south road by the homestead
  for (const z of [56, 70, 84]) items.push([`road-lamp${z}`, { model: 'deco_lamp', x: 30.6 * CELL, z: z * CELL, rot: 0 }]);
  const cellsOf = it => [Math.floor(it.x / CELL), Math.floor(it.z / CELL)];
  const show = () => { for (const [id, it] of items) { const cells = it.cells ?? [cellsOf(it)]; if (cells.some(([x, z]) => W.inVillage(x, z) && occupant(game.s, x, z))) world.batches.remove(id); else world.batches.set(id, it); } };
  show();
  game.on(r => { if (r.events?.some(e => e.type === 'placed' || e.type === 'moved' || e.type === 'stored' || e.type === 'loaded')) show(); });
  world.lamps = items.filter(([, it]) => it.model === 'deco_lamp').map(([id, it]) => ({ id, x: it.x, z: it.z, y: 2.35 }));
  world.onLampsChanged?.();
  await dressMilestones(world, game);
}

/** Village charm milestones (play package: s.village.decor, the 'charmMilestone' event): bunting strung over the square
 *  at 8 charm, banners at its road corners at 20, a welcome sign where the road reaches the village at 40. */
const MILESTONE_ITEMS = (() => {
  const P = W.PLAZA, out = { bunting: [], banner: [], welcome_sign: [] };
  for (let k = 0; k < 3; k++) for (const [z, n] of [[P.z0 + 0.15, 'n'], [P.z1 + 0.85, 's']]) out.bunting.push([`charm-bunting-${n}${k}`, { model: 'village_bunting', x: (P.x0 + 1 + 2 * k) * CELL, z: z * CELL, rot: 0 }]);
  out.banner.push(['charm-banner-w', { model: 'village_banner', x: (P.x0 - 0.35) * CELL, z: (P.z0 + 0.3) * CELL, rot: 0 }]);
  out.banner.push(['charm-banner-e', { model: 'village_banner', x: (P.x1 + 1.35) * CELL, z: (P.z0 + 0.3) * CELL, rot: Math.PI }]);
  out.welcome_sign.push(['charm-welcome', { model: 'welcome_sign', x: (W.VILLAGE.x0 + 0.5) * CELL, z: (W.VILLAGE.z0 + 0.4) * CELL, rot: -Math.PI / 4 }]);
  return out;
})();
async function dressMilestones(world, game) {
  const b = world.batches;
  const [decor, props] = await Promise.all([loadKit('decor'), loadKit('props')]);
  const reg = (name, root, size) => { if (b.has(name) || !root) return; const geo = fit(bake(root), size); b.register(name, { geo, kind: 'static', color: averageColor(geo) }); };
  reg('village_bunting', decor.bunting, { scale: 1 }); reg('village_banner', decor.banner, { scale: 1 }); reg('welcome_sign', props.signpost, { height: 2.6 });
  const cellOf = it => [Math.floor(it.x / CELL), Math.floor(it.z / CELL)];
  const show = (fresh = []) => {
    const have = new Set(game.s.village?.decor ?? []);
    for (const [decorId, list] of Object.entries(MILESTONE_ITEMS)) for (const [id, it] of list) {
      const [x, z] = cellOf(it), want = have.has(decorId) && b.has(it.model) && !occupant(game.s, x, z);
      if (!want) { b.remove(id); continue; }
      const isNew = !b.items.has(id); b.set(id, it);
      if (isNew && fresh.includes(decorId)) b.pulse(id, { from: 0.2, to: 1.15, ms: 520 });   // a milestone just reached pops in
    }
  };
  // Market day (chapter 6): flags along both long sides of the market square while the day runs.
  const marketFlags = pop => {
    const s = game.s, day = marketDayOf(s, game.now), p = day.active ? Object.values(s.placed).find(q => q.kind === 'market') : null, want = new Map();
    if (p && b.has('village_bunting')) {
      const cells = cellsOf('market', p.x, p.z, p.rot ?? 0), xs = cells.map(c => c[0]), zs = cells.map(c => c[1]);
      const x0 = Math.min(...xs), x1 = Math.max(...xs) + 1, z0 = Math.min(...zs), z1 = Math.max(...zs) + 1, wide = x1 - x0 >= z1 - z0, n = Math.max(1, Math.round((wide ? x1 - x0 : z1 - z0) / 2));
      for (let i = 0; i < n; i++) for (const side of [0, 1]) {
        const along = ((wide ? x0 : z0) + (i + 0.5) * (wide ? x1 - x0 : z1 - z0) / n) * CELL, across = (side ? (wide ? z1 : x1) + 0.2 : (wide ? z0 : x0) - 0.2) * CELL;
        want.set(`market-flags-${side}${i}`, { model: 'village_bunting', x: wide ? along : across, z: wide ? across : along, rot: wide ? 0 : Math.PI / 2 });
      }
    }
    for (const id of [...b.items.keys()]) if (String(id).startsWith('market-flags-') && !want.has(id)) b.remove(id);
    for (const [id, it] of want) { const isNew = !b.items.has(id); b.set(id, it); if (isNew && pop) b.pulse(id, { from: 0.2, to: 1.15, ms: 520 }); }
  };
  show(); marketFlags(false);
  game.on(r => {
    const ev = r.events ?? [], fresh = ev.filter(e => e.type === 'charmMilestone').map(e => e.decor);
    if (fresh.length || ev.some(e => ['placed', 'moved', 'stored', 'loaded'].includes(e.type))) show(fresh);
    if (ev.some(e => ['marketDayStarted', 'marketDayEnded', 'placed', 'moved', 'stored', 'loaded', 'repaired'].includes(e.type))) marketFlags(ev.some(e => e.type === 'marketDayStarted'));
  });
}

/** The windmill's rotor, turning on its own (one draw). */
async function spinRotor(world) {
  const kit = await loadKit('rural-lite'), k = 9 / 6.78;   // the windmill is fitted to 9 m from its 6.78 m model
  const geo = bake(kit.windmill_rotor); geo.computeBoundingBox(); const bb = geo.boundingBox;
  geo.translate(0, -(bb.min.y + bb.max.y) / 2, 0); geo.scale(k, k, k);
  const rotor = new THREE.Mesh(geo, decorMaterial()); rotor.name = 'windmill-rotor';
  // the hub in the baked windmill's frame (centred on x/z, standing on y = 0), then the windmill's own placement
  const hub = new THREE.Vector3((-0.37 + 0.12) * k, (6.31 + 0.01) * k, (0.74 + 0.53) * k).applyAxisAngle(new THREE.Vector3(0, 1, 0), W.WINDMILL.rot);
  const pivot = new THREE.Group(); pivot.position.set((W.WINDMILL.x + 0.5) * CELL + hub.x, hub.y, (W.WINDMILL.z + 0.5) * CELL + hub.z); pivot.rotation.y = W.WINDMILL.rot;
  pivot.add(rotor); world.scene.add(pivot); world.rotor = rotor;
  world.onFrame(dt => { rotor.rotation.z -= dt * 1.6 * WIND.amp.value; });
}

export async function dressWorld(world, game) {
  const t0 = performance.now();
  world.owned = parcel => game.s.parcels.includes(parcel);
  world.wilds = planWilds();
  placeTrees(world, world.wilds);
  dressHomestead(world);
  world.onFrame((dt, now) => { WIND.time.value = (now / 1000) % 10000; WIND.amp.value = document.body.classList.contains('reduced-motion') ? 0 : 1; });
  world.ground.markAll();
  // far zoom: the small merged things are sub-pixel there, so they are hidden (saves their triangles)
  const small = () => [...(world.wildDecor ?? []), world.scene.getObjectByName('locked-land'), world.scene.getObjectByName('plaza'), world.scene.getObjectByName('home-hedge')].filter(Boolean);
  const fit = c => { for (const m of small()) m.visible = c.lod < 2; };
  world.cam.onChange(fit);
  world.dressMs = Math.round(performance.now() - t0);
  // The rest is built in short steps while the farm's models download, so it never holds up the first scene.
  const step = f => new Promise(r => setTimeout(() => { f(); r(); }, 0));
  world.dressed = (async () => {
    await step(() => { world.backdrop = new Backdrop(world); });
    await step(() => { world.brook = new Brook(world); });
    await step(() => { world.wildDecor = placeDecor(world, world.wilds); });
    await step(() => { world.locked = new LockedLand(world, game); });
    // sky life (cloud shadows, birds, butterflies) is its own chunk: not needed for the first scene
    const { Sky } = await import('./sky.mjs'); world.sky = new Sky(world, game);
    world.daylight?.apply(); fit(world.cam);
  })();
  // after that: the village's heavier models and the windmill's rotor
  world.later = Promise.all([world.dressed.then(() => dressVillage(world, game)).then(() => fit(world.cam))
    .then(() => import('./old-mill.mjs')).then(({ OldMill }) => { world.oldMill = new OldMill(world, game); })
    .then(() => import('./train-view.mjs')).then(({ TrainView }) => { world.train = new TrainView(world, game); }), spinRotor(world)]).catch(e => console.warn('world dressing', e));
}
