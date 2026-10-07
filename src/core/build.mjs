// Build-mode actions: place, move, store, clear cells, fences, land parcels and the barn upgrade (DESIGN 4).
import { BUILDINGS } from '../content/buildings.mjs';
import { CLEAR, XP, PARCELS, BARN } from '../content/economy.mjs';
import { N, FARM, PARCEL } from '../content/world.mjs';
import { CELL_TYPES, overgrow } from './state.mjs';
import * as grid from './grid.mjs';
import { mayBuild, projectCost, advance } from './projects.mjs';
import { gainXp } from './levels.mjs';
import { arriveNext } from './homes.mjs';
import { plantTree } from './trees.mjs';

export const priceOf = (s, kind) => {
  const def = BUILDINGS[kind], n = s.counts[kind] ?? 0;
  return (typeof def.cost === 'function' ? def.cost(n) : def.cost) + projectCost(s, kind);
};
const setCell = (s, x, z, type) => { s.cells[z * N + x] = CELL_TYPES[type]; grid.touch(s); };
const count = (s, kind, d) => { s.counts[kind] = Math.max(0, (s.counts[kind] ?? 0) + d); };
/** The undo stack (DESIGN 4.4): the last 10 build actions, refunded on undo, cleared when build mode ends. */
const UNDO_MAX = 10;
const remember = (s, entry) => { (s.undo ??= []).push(entry); if (s.undo.length > UNDO_MAX) s.undo.shift(); };
/** Everything in the state that belongs to a placed item (crops, animals, queue, family) moves or goes with it. */
const CONTENTS = ['beds', 'animals', 'production', 'homes', 'trees'];

/**
 * Land the player could buy next (for the For-sale signs and the parcel menu): parcels next to the farm that are not owned,
 * while this version still sells land. [{ parcel, x, z, price, level, ok, reason, params }], x/z = the parcel's first cell.
 */
export function buyableParcels(s) {
  if (s.parcels.length >= PARCELS.maxV01) return [];
  const owned = new Set(s.parcels), out = [], price = PARCELS.cost(s.parcels.length + 1);
  for (let pz = 0; pz < FARM.parcels; pz++) for (let px = 0; px < FARM.parcels; px++) {
    const id = `${px},${pz}`; if (owned.has(id)) continue;
    if (!s.parcels.some(p => { const [qx, qz] = p.split(',').map(Number); return Math.abs(qx - px) + Math.abs(qz - pz) === 1; })) continue;
    const why = s.level < PARCELS.level ? ['Reach level {level} first', { level: PARCELS.level }] : s.coins < price ? ['Not enough coins'] : null;
    out.push({ parcel: id, x: FARM.x0 + px * PARCEL, z: FARM.z0 + pz * PARCEL, price, level: PARCELS.level, ok: !why, reason: why?.[0] ?? null, params: why?.[1] ?? null });
  }
  return out;
}

export const actions = {
  /** Place a thing: { kind, x, z, rot }. Paths change the cell; everything else becomes a placed item. */
  place(ctx, { kind, x, z, rot = 0 }) {
    const { s, now } = ctx, def = BUILDINGS[kind];
    if (!def || def.edge) return ctx.fail('Unknown item');
    const may = mayBuild(s, kind); if (!may.ok) return ctx.fail(may.reason, may.params);
    const can = grid.canPlace(s, kind, x, z, rot); if (!can.ok) return ctx.fail(can.reason, can.params);
    const fromStore = (s.stored?.[kind] ?? 0) > 0, price = fromStore ? 0 : priceOf(s, kind);
    if (s.coins < price) return ctx.fail('Not enough coins');
    s.coins -= price; if (fromStore) s.stored[kind]--;
    if (def.cell) { setCell(s, x, z, def.cell); if (kind === 'path') s.stats.paths++; count(s, kind, 1); remember(s, { type: 'cell', kind, x, z, price }); ctx.emit('cellChanged', { x, z }); advance(ctx); return { price }; }
    const id = `p${s.nextId++}`;
    remember(s, { type: 'place', kind, id, price, fromStore });
    s.placed[id] = { kind, x, z, rot };
    if (def.tills) setCell(s, x, z, 'tilled');
    count(s, kind, 1); grid.touch(s);
    if (def.home) arriveNext(ctx, id);
    if (def.fruit) plantTree(s, id, now);
    if (def.cost || def.project) gainXp(ctx, XP.build);
    ctx.emit('placed', { id, kind, x, z, rot });
    advance(ctx);
    return { id, price };
  },
  /** Move a placed item: { id, x, z, rot }. Free; contents move with it. */
  move(ctx, { id, x, z, rot }) {
    const { s } = ctx, p = s.placed[id]; if (!p) return ctx.fail('Nothing to move');
    rot ??= p.rot;
    const can = grid.canPlace(s, p.kind, x, z, rot, { ignore: id }); if (!can.ok) return ctx.fail(can.reason, can.params);
    if (BUILDINGS[p.kind].tills) { setCell(s, p.x, p.z, 'grass'); setCell(s, x, z, 'tilled'); }
    Object.assign(p, { x, z, rot }); grid.touch(s);
    ctx.emit('moved', { id, x, z, rot });
    return { id };
  },
  /** Undo the last build action and give its price back. */
  undo(ctx) {
    const { s } = ctx, e = s.undo?.[s.undo.length - 1];
    if (!e) return ctx.fail('Nothing to undo');
    if (e.type === 'cell') {
      if (grid.cellType(s, e.x, e.z) !== e.kind) { s.undo.pop(); return ctx.fail('Nothing to undo'); }
      if (grid.occupant(s, e.x, e.z)) return ctx.fail('Something stands on it now');
      setCell(s, e.x, e.z, 'grass'); count(s, e.kind, -1); if (e.kind === 'path') s.stats.paths = Math.max(0, s.stats.paths - 1);
      ctx.emit('cellChanged', { x: e.x, z: e.z });
    } else if (e.type === 'edge') {
      const key = grid.edgeKey(e.x, e.z, e.side); if (s.fences[key] !== e.kind) { s.undo.pop(); return ctx.fail('Nothing to undo'); }
      delete s.fences[key]; count(s, e.kind, -1); ctx.emit('fenceChanged', { x: e.x, z: e.z, side: e.side, kind: null });
    } else {
      const p = s.placed[e.id]; if (!p) { s.undo.pop(); return ctx.fail('Nothing to undo'); }
      if (s.beds[e.id] || s.animals[e.id]?.length || s.production[e.id]?.queue.length || s.homes[e.id]?.arrived) return ctx.fail('It is in use now: move it instead');
      if (BUILDINGS[p.kind].tills) setCell(s, p.x, p.z, 'grass');
      for (const k of CONTENTS) delete s[k]?.[e.id];
      delete s.placed[e.id]; count(s, p.kind, -1); grid.touch(s);
      if (e.fromStore) s.stored[p.kind] = (s.stored[p.kind] ?? 0) + 1;
      ctx.emit('stored', { id: e.id, kind: p.kind });
    }
    s.undo.pop(); s.coins += e.price;
    return { undone: e.kind, refund: e.price };
  },
  /** Leaving build mode: the undo stack is cleared. */
  endBuild(ctx) { ctx.s.undo = []; return {}; },
  /** Put a placed item away. Its price is kept as a stored credit so placing it again is free. */
  store(ctx, { id }) {
    const { s } = ctx, p = s.placed[id]; if (!p) return ctx.fail('Nothing to store');
    if (BUILDINGS[p.kind].garden) return ctx.fail('The streak garden keeps its flowers');
    if (s.homes[id]?.family) return ctx.fail('A family lives here: move the cottage instead');
    if (s.beds[id]) return ctx.fail('Harvest the crop first');
    if (s.animals[id]?.length) return ctx.fail('The animals live here: move it instead');
    if (s.production[id]?.queue.length) return ctx.fail('Collect what is being made first');
    if (BUILDINGS[p.kind].project === 'school' || BUILDINGS[p.kind].cat === 'projects') return ctx.fail('Village buildings can be moved, not stored');
    if (BUILDINGS[p.kind].tills) setCell(s, p.x, p.z, 'grass');
    for (const k of CONTENTS) delete s[k]?.[id];
    delete s.placed[id]; count(s, p.kind, -1); grid.touch(s);
    s.stored = s.stored ?? {}; s.stored[p.kind] = (s.stored[p.kind] ?? 0) + 1;
    ctx.emit('stored', { id, kind: p.kind });
    return { kind: p.kind };
  },
  /** Clear weeds or a rock: { x, z } or { cells: [[x, z], ...] }. Also lifts a path back to grass. */
  clear(ctx, { x, z, cells = [[x, z]] }) {
    const { s } = ctx; let cleared = 0, spent = 0, lifted = 0;
    for (const [cx, cz] of cells) {
      const type = grid.cellType(s, cx, cz), land = grid.landOf(s, cx, cz);
      if (!land) continue;
      if (type === 'path') { if (grid.occupant(s, cx, cz)) continue; setCell(s, cx, cz, 'grass'); count(s, 'path', -1); lifted++; ctx.emit('cellChanged', { x: cx, z: cz }); continue; }
      if (type !== 'weeds' && type !== 'rock') continue;
      const price = CLEAR[type]; if (s.coins < price) break;
      s.coins -= price; spent += price; setCell(s, cx, cz, 'grass'); cleared++; ctx.emit('cellChanged', { x: cx, z: cz });
    }
    if (!cleared && lifted) return { cleared: 0, lifted };
    if (!cleared) return ctx.fail(s.coins < CLEAR.weeds ? 'Not enough coins' : 'Nothing to clear here');
    s.stats.cleared += cleared; gainXp(ctx, cleared);
    advance(ctx);
    return { cleared, spent };
  },
  /** A fence or gate on a cell edge: { kind, x, z, side: 'n' | 'w' }. */
  placeEdge(ctx, { kind, x, z, side }) {
    const { s } = ctx;
    if (!BUILDINGS[kind]?.edge) return ctx.fail('Unknown item');
    const may = mayBuild(s, kind); if (!may.ok) return ctx.fail(may.reason, may.params);
    const can = grid.canPlaceEdge(s, kind, x, z, side); if (!can.ok) return ctx.fail(can.reason, can.params);
    const price = priceOf(s, kind); if (s.coins < price) return ctx.fail('Not enough coins');
    s.coins -= price; s.fences[grid.edgeKey(x, z, side)] = kind; count(s, kind, 1); remember(s, { type: 'edge', kind, x, z, side, price });
    ctx.emit('fenceChanged', { x, z, side, kind });
    return { price };
  },
  removeEdge(ctx, { x, z, side }) {
    const { s } = ctx, k = grid.edgeKey(x, z, side), kind = s.fences[k];
    if (!kind) return ctx.fail('Nothing to remove');
    delete s.fences[k]; count(s, kind, -1);
    ctx.emit('fenceChanged', { x, z, side, kind: null });
    return {};
  },
  /** Buy a parcel next to land you own: { parcel: "px,pz" }. */
  buyParcel(ctx, { parcel }) {
    const { s } = ctx, [px, pz] = parcel.split(',').map(Number);
    if (!(px >= 0 && pz >= 0 && px < FARM.parcels && pz < FARM.parcels)) return ctx.fail('Unknown land');
    if (s.parcels.includes(parcel)) return ctx.fail('You own this land already');
    if (s.parcels.length >= PARCELS.maxV01) return ctx.fail('More land opens in a later version');
    if (!s.parcels.some(p => { const [qx, qz] = p.split(',').map(Number); return Math.abs(qx - px) + Math.abs(qz - pz) === 1; })) return ctx.fail('Buy land next to your farm');
    if (s.level < PARCELS.level) return ctx.fail('Reach level {level} first', { level: PARCELS.level, lock: 'level' });
    const price = PARCELS.cost(s.parcels.length + 1); if (s.coins < price) return ctx.fail('Not enough coins');
    s.coins -= price; s.parcels.push(parcel); overgrow(s, parcel); grid.touch(s);
    ctx.emit('parcelBought', { parcel, x: FARM.x0 + px * PARCEL, z: FARM.z0 + pz * PARCEL });
    return { price, parcel };
  },
  upgradeBarn(ctx) {
    const { s } = ctx, price = BARN.upgradeCost(s.barn.upgrades);
    if (s.coins < price) return ctx.fail('Not enough coins');
    s.coins -= price; s.barn.upgrades++; s.barn.cap += BARN.step;
    ctx.emit('barnUpgraded', { cap: s.barn.cap });
    return { cap: s.barn.cap };
  },
};
