// The land grid and placement rules (DESIGN 4). Pure: reads the state, never changes it.
import { WATERED } from '../content/economy.mjs';
import { N, parcelOf, isRoad, isBrook, inVillage, nearHome, FARMHOUSE, BARN, PLAZA, RUINS, ruinAt } from '../content/world.mjs';
import { BUILDINGS, footprint } from '../content/buildings.mjs';
import { CELL_TYPES } from './state.mjs';
import { reservedReason } from './reserved.mjs';

const TYPE_NAMES = Object.fromEntries(Object.entries(CELL_TYPES).map(([k, v]) => [v, k]));
export const inMap = (x, z) => x >= 0 && z >= 0 && x < N && z < N;
/** 'grass' | 'weeds' | 'rock' | 'path' | 'tilled' | 'road' | 'water' | 'outside' */
export function cellType(s, x, z) {
  if (!inMap(x, z)) return 'outside';
  if (isBrook(x, z)) return 'water';
  if (isRoad(x, z)) return 'road';
  return TYPE_NAMES[s.cells[z * N + x]] ?? 'grass';
}
/** Which land a cell belongs to for building: 'farm' (an owned parcel), 'village', 'home' (the farmhouse lot) or null. */
export function landOf(s, x, z) {
  const p = parcelOf(x, z);
  if (p) return s.parcels.includes(p) ? 'farm' : null;
  if (inVillage(x, z)) return 'village';
  if (nearHome(x, z)) return 'home';
  return null;
}
/** The roadside verge: nobody's land, in no parcel, within two cells of a road. A path may cross it, so every piece of
 *  land can be joined to the road (weeds there can be cleared too). */
export function isVerge(s, x, z) {
  if (landOf(s, x, z) || parcelOf(x, z)) return false;
  const t = cellType(s, x, z); if (t === 'outside' || t === 'water' || t === 'road') return false;
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]]) if (cellType(s, x + dx, z + dz) === 'road') return true;
  return false;
}
// Fixed buildings that are not in s.placed (the farmhouse and the storage barn).
const FIXED = [FARMHOUSE, BARN].map(b => ({ x0: b.x - 4, z0: b.z - 4, x1: b.x + 4, z1: b.z + 4 }));
const inFixed = (x, z) => FIXED.some(f => x >= f.x0 && x <= f.x1 && z >= f.z0 && z <= f.z1);

/** All cells covered by a kind at (x, z) with rotation rot. (x, z) is the footprint's top-left cell. */
export function cellsOf(kind, x, z, rot = 0) {
  const def = BUILDINGS[kind]; if (def.edge) return [];
  const [w, d] = footprint(kind, rot), out = [];
  for (let dz = 0; dz < d; dz++) for (let dx = 0; dx < w; dx++) out.push([x + dx, z + dz]);
  return out;
}
/** The cell in front of the door (outside the footprint), or null. rot 0: front is +z; 1: +x; 2: −z; 3: −x. */
export function doorCell(kind, x, z, rot = 0) {
  if (!BUILDINGS[kind].door) return null;
  const [w, d] = footprint(kind, rot);
  return [[x + Math.floor(w / 2), z + d], [x + w, z + Math.floor(d / 2)], [x + Math.floor(w / 2), z - 1], [x - 1, z + Math.floor(d / 2)]][rot % 4];
}

// ── Caches (derived data, rebuilt when the placed things or cells change) ──
const caches = new WeakMap();
export const touch = s => caches.delete(s);
function cache(s) {
  let c = caches.get(s);
  if (!c) {
    const occ = new Map();
    for (const [id, p] of Object.entries(s.placed)) for (const [x, z] of cellsOf(p.kind, p.x, p.z, p.rot)) occ.set(z * N + x, id);
    c = { occ, roadSet: null };
    caches.set(s, c);
  }
  return c;
}
export const occupant = (s, x, z) => cache(s).occ.get(z * N + x) ?? null;
/** Cells joined to the road by path (roads count as path). */
export function roadReach(s) {
  const c = cache(s); if (c.roadSet) return c.roadSet;
  const seen = new Set(), stack = [];
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) if (isRoad(x, z)) { seen.add(z * N + x); stack.push([x, z]); }
  while (stack.length) {
    const [x, z] = stack.pop();
    for (const [nx, nz] of [[x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1]]) {
      if (!inMap(nx, nz)) continue; const k = nz * N + nx;
      if (seen.has(k) || cellType(s, nx, nz) !== 'path') continue;
      seen.add(k); stack.push([nx, nz]);
    }
  }
  return (c.roadSet = seen);
}
export const reachesRoad = (s, x, z) => roadReach(s).has(z * N + x);

/**
 * Can `kind` be placed at (x, z, rot)? Returns { ok, reason, params }. The reason is an English sentence for t().
 * `ignore` is an id to leave out of overlap checks (moving an item).
 */
export function canPlace(s, kind, x, z, rot = 0, { ignore = null, unlocked = null, clearing = null } = {}) {   // clearing: a Set of things a civic rebuild moves off its site first (core/build.mjs)
  const def = BUILDINGS[kind];
  if (!def) return { ok: false, reason: 'Unknown item' };
  if (def.edge) return { ok: false, reason: 'Fences go on cell edges' };
  if (def.garden) return { ok: false, reason: 'It grows by itself in your streak garden' };
  if (def.site) return { ok: false, reason: 'It belongs on its own site' };
  if (def.lot) return { ok: false, reason: 'It belongs on a lot on the quay' };   // core/riverside.mjs builds it; it never moves   // core/sites.mjs builds it; it never moves
  if (def.civicSite) {
    const site = RUINS.find(r => r.kind === kind);
    if (!site || x !== site.x || z !== site.z || rot !== site.rot) return { ok: false, reason: 'Restore this building on its old civic site' };
  }
  if (s.level < def.level) return { ok: false, reason: 'Reach level {level} first', params: { level: def.level, kind, lock: 'level' } };
  if (unlocked && !unlocked.has(kind)) return { ok: false, reason: 'Not unlocked yet' };
  for (const [cx, cz] of cellsOf(kind, x, z, rot)) {
    const land = landOf(s, cx, cz), type = cellType(s, cx, cz);
    if (type === 'outside' || type === 'water' || type === 'road') return { ok: false, reason: 'Not on the road or the water' };
    if (!land && kind === 'path' && isVerge(s, cx, cz)) { if (type === 'weeds' || type === 'rock') return { ok: false, reason: 'Clear the weeds and rocks first' }; continue; }   // a path may cross the roadside verge
    if (!land) return { ok: false, reason: 'Outside your land' };
    if (def.area === 'farm' && land !== 'farm') return { ok: false, reason: 'Only on your farm' };
    if (def.area === 'village' && land !== 'village') return { ok: false, reason: 'Only in the village' };
    if (inFixed(cx, cz)) return { ok: false, reason: 'Overlaps something' };
    const kept = reservedReason(cx, cz); if (kept) return { ok: false, reason: kept };
    // the village square stays open round the old well (paths may cross it)
    if (kind !== 'path' && cx >= PLAZA.x0 && cx <= PLAZA.x1 && cz >= PLAZA.z0 && cz <= PLAZA.z1) return { ok: false, reason: 'Keep the village square clear' };
    // Nothing new goes where an old building stands, or on the lot a police post or company office must return to.
    const old = ruinAt(cx, cz);
    if (old && old.kind !== kind && !(s.counts[old.kind] > 0) && (BUILDINGS[old.kind].civicSite || !s.village?.cleared?.[old.kind])) return { ok: false, reason: 'Kept for the old building that stands here' };
    const who = occupant(s, cx, cz); if (who && who !== ignore && !clearing?.has(who)) return { ok: false, reason: 'Overlaps something' };
    if (clearing) continue;   // the rebuild lifts paths and clears weeds on its own site
    if (type === 'weeds' || type === 'rock') return { ok: false, reason: 'Clear the weeds and rocks first' };
    if (type === 'path' && kind !== 'path') return { ok: false, reason: 'Overlaps a path' };
    if (type === 'tilled' && kind !== 'bed') return { ok: false, reason: 'Overlaps a crop bed' };
    if (kind === 'path' && type === 'path') return { ok: false, reason: 'There is a path here already' };
  }
  const door = doorCell(kind, x, z, rot);
  if (door && !clearing && !reachesRoad(s, door[0], door[1])) return { ok: false, reason: 'Needs a path from the door to the road' };
  return { ok: true };
}

/** Fences sit on an edge: "x,z,n" is the north edge of cell (x, z), "x,z,w" its west edge. */
export const edgeKey = (x, z, side) => `${x},${z},${side}`;
export function edgeCells(x, z, side) { return side === 'n' ? [[x, z - 1], [x, z]] : [[x - 1, z], [x, z]]; }
export function canPlaceEdge(s, kind, x, z, side) {
  const def = BUILDINGS[kind];
  if (s.level < def.level) return { ok: false, reason: 'Reach level {level} first', params: { level: def.level, kind, lock: 'level' } };
  if (s.fences[edgeKey(x, z, side)]) return { ok: false, reason: 'There is a fence here already' };
  const [a, b] = edgeCells(x, z, side);
  if (![a, b].some(([cx, cz]) => landOf(s, cx, cz))) return { ok: false, reason: 'Outside your land' };
  const oa = inMap(...a) ? occupant(s, ...a) : null, ob = inMap(...b) ? occupant(s, ...b) : null;
  if (oa && oa === ob) return { ok: false, reason: 'Overlaps something' };
  return { ok: true };
}
const blocked = (s, x, z, nx, nz) => {
  // is the edge between two neighbouring cells fenced (a gate counts as closed for animals)?
  if (nz === z - 1) return !!s.fences[edgeKey(x, z, 'n')]; if (nz === z + 1) return !!s.fences[edgeKey(x, nz, 'n')];
  if (nx === x - 1) return !!s.fences[edgeKey(x, z, 'w')]; return !!s.fences[edgeKey(nx, z, 'w')];
};
/** Is an animal home inside a closed fence with at least one gate? (DESIGN 4.3 rule 5) */
export function penOf(s, homeId, limit = 900) {
  const p = s.placed[homeId]; if (!p) return { closed: false };
  const start = cellsOf(p.kind, p.x, p.z, p.rot), seen = new Set(start.map(([x, z]) => z * N + x)), stack = [...start];
  let gate = false;
  while (stack.length) {
    const [x, z] = stack.pop();
    for (const [nx, nz] of [[x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1]]) {
      const fenced = blocked(s, x, z, nx, nz);
      if (fenced) { if (s.fences[gateKeyBetween(x, z, nx, nz)] === 'gate') gate = true; continue; }
      if (!inMap(nx, nz) || !landOf(s, nx, nz)) return { closed: false, reason: 'The fence has a gap' };
      const k = nz * N + nx; if (seen.has(k)) continue;
      seen.add(k); stack.push([nx, nz]);
      if (seen.size > limit) return { closed: false, reason: 'The fence has a gap' };
    }
  }
  return gate ? { closed: true, cells: seen.size, keys: seen } : { closed: false, reason: 'The fence needs a gate' };
}
function gateKeyBetween(x, z, nx, nz) {
  if (nz === z - 1) return edgeKey(x, z, 'n'); if (nz === z + 1) return edgeKey(x, nz, 'n');
  if (nx === x - 1) return edgeKey(x, z, 'w'); return edgeKey(nx, z, 'w');
}
/** Is this cell within WATERED.reach cells of a fish pond the player built (its 4 x 4 footprint)? Such a bed grows faster. */
export function wateredBed(s, x, z) {
  for (const p of Object.values(s.placed)) {
    if (p.kind !== 'pond') continue;
    const [w, d] = footprint('pond', p.rot ?? 0), dx = Math.max(p.x - x, 0, x - (p.x + w - 1)), dz = Math.max(p.z - z, 0, z - (p.z + d - 1));
    if (Math.max(dx, dz) <= WATERED.reach) return true;
  }
  return false;
}
/** First spot where `kind` fits, scanning outward from (x0, z0). For tests, the simulation and "suggest a spot". */
export function findSpot(s, kind, x0, z0, { rot = 0, radius = 40, filter } = {}) {
  for (let r = 0; r <= radius; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
    const x = x0 + dx, z = z0 + dz;
    if (canPlace(s, kind, x, z, rot).ok && (!filter || filter(x, z))) return { x, z, rot };
  }
  return null;
}
