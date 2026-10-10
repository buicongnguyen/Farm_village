// Walking routes for people (view/people-view.mjs). Roads and paths are cheapest, open grass costs a little more, crop
// beds more still (people go round them when they can). Buildings, the farmhouse and barn, the pond's water (its bank is
// public ground all the way round), animal pens and
// fences block; the brook blocks except where the road bridge and the stepping stones cross it. Every place someone
// can be sent to (the pond dock, benches, doors, the project site, the order board) is reachable over this ground,
// not only the cells that happen to touch a road (tests/walk.test.mjs).
import { N, FARMHOUSE, BARN, STEPPING_STONES, ROAD_SEGMENTS, isBrook, isRoad, isPondWater, isPondPath, isPondBank, parcelOf, nearHome, inVillage, ruinAt, homeGardenAt, isDockBank, inTowpath, COOPERATIVE_BOARD, inQuay, inRiverside } from '../content/world.mjs';
import { cellType, inMap, occupant } from './grid.mjs';
import { SHOP_SITES } from '../content/shops.mjs';

// The houses themselves (cells x-3..x+1; the yard starts at x+2), not the wider building plots, so
// the yard, the mailbox and the porch stay open.
const FIXED = [FARMHOUSE, BARN].map(b => ({ x0: b.x - 3, z0: b.z - 3, x1: b.x + 1, z1: b.z + 3 }));   // a 9 m house: cells x-3..x+1
const inFixed = (x, z) => FIXED.some(f => x >= f.x0 && x <= f.x1 && z >= f.z0 && z <= f.z1);
// The four kiosks round the lake stand on the public bank: one cell each.
const KIOSKS = new Set(SHOP_SITES.filter(k => k.id.startsWith('lake-')).map(k => `${Math.floor(k.x)},${Math.floor(k.z)}`));
const validCell = (x, z) => Number.isInteger(x) && Number.isInteger(z) && inMap(x, z);
const validPoint = p => Array.isArray(p) && p.length === 2 && validCell(p[0], p[1]);
// Dressing keeps these roadside verges clear. They join farm entrances and neighbour signposts to the road.
const roadside = (x, z) => ROAD_SEGMENTS.some(r => x >= r.x0 - 2 && x <= r.x1 + 2 && z >= r.z0 - 2 && z <= r.z1 + 2);

/** What a step onto (x, z) costs: 1 road/path, 2 stepping stone, 3 grass, 8 crop bed; 0 = cannot stand there. */
export function stepCost(s, x, z, blocked = null) {
  if (!validCell(x, z) || blocked?.has(`${x},${z}`)) return 0;
  if (isRoad(x, z)) return 1;                                           // the road bridge crosses the brook
  if (s.firsts?.quay && inQuay(x, z)) return 1;                         // the paved quay on the far bank (Act IV)
  if (isBrook(x, z)) return x === STEPPING_STONES.x ? 2 : 0;
  if (isPondWater(x, z) || inFixed(x, z) || KIOSKS.has(`${x},${z}`)) return 0;
  const parcel = parcelOf(x, z);
  if (parcel ? !s.parcels.includes(parcel) : !(nearHome(x, z) || inVillage(x, z) || isPondPath(x, z) || isPondBank(x, z) || roadside(x, z) || isDockBank(x, z) || (s.firsts?.bridge && inTowpath(x, z)) || (s.firsts?.quay && inRiverside(x, z)))) return 0;   // the far bank's towpath, once its gate is off (chapter 12)
  if (x === COOPERATIVE_BOARD.x && z === COOPERATIVE_BOARD.z && (s.story?.chapter ?? 0) >= 11) return 0;   // the co-operative's notice board stands there
  const ruin = ruinAt(x, z); if (ruin && !(s.counts[ruin.kind] > 0) && !s.village?.cleared?.[ruin.kind]) return 0;   // an old ruin stands there
  if (homeGardenAt(s.house?.level ?? 1, x, z)) return 0;   // the pool, the gazebo and the rest of the farmhouse garden
  const type = cellType(s, x, z); if (type === 'rock' || type === 'weeds') return 0;
  const id = occupant(s, x, z), kind = id ? s.placed[id]?.kind : null;
  if (kind === 'path' || kind === 'dock' || (!kind && (type === 'path' || isPondPath(x, z)))) return 1;   // the boat dock is a deck to stand on
  if (kind === 'bed') return 8;
  return kind ? 0 : 3;
}
/** True when a fence stands on an edge crossed between neighbouring cells a and b (including a diagonal dog step). */
export function fenceBetween(s, a, b) {
  return !!((b[1] < a[1] && s.fences[`${a[0]},${a[1]},n`]) || (b[1] > a[1] && s.fences[`${b[0]},${b[1]},n`])
    || (b[0] < a[0] && s.fences[`${a[0]},${a[1]},w`]) || (b[0] > a[0] && s.fences[`${b[0]},${b[1]},w`]));
}
/** The cells that count as "there" for a target: the target itself when it can be stood on, otherwise the standable
 *  cells next to it (a bench, a building's front, a project site), then a little further out. */
export function goalCells(s, to, blocked = null) {
  if (!validPoint(to)) return [];
  if (stepCost(s, to[0], to[1], blocked)) return [to];
  for (let r = 1; r <= 3; r++) {
    const out = [];
    for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
      if (stepCost(s, to[0] + dx, to[1] + dz, blocked)) out.push([to[0] + dx, to[1] + dz]);
    }
    if (out.length) return out;
  }
  return [];
}
/** The cheapest walk from cell `from` to cell `to` as a list of cells (from first); [] when there is no way there.
 *  The starting cell is always allowed, so someone standing in a doorway or on a bench can leave.
 *  `exact` requires the target itself; fishing must never treat a nearby road as arrival. */
export function findRoute(s, from, to, { blocked = null, exact = false } = {}) {
  if (!validPoint(from) || !validPoint(to)) return [];
  const ends = exact ? (stepCost(s, ...to, blocked) ? [to] : []) : goalCells(s, to, blocked);
  const goals = new Set(ends.map(([x, z]) => z * N + x)); if (!goals.size) return [];
  const start = from[1] * N + from[0], dist = new Map([[start, 0]]), prev = new Map([[start, -1]]), buckets = [[start]];
  let found = -1;
  for (let d = 0; d < buckets.length && found < 0; d++) {
    for (const k of buckets[d] ?? []) {
      if (dist.get(k) !== d) continue;
      if (goals.has(k)) { found = k; break; }
      const x = k % N, z = (k - x) / N;
      for (const [nx, nz] of [[x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1]]) {
        const c = stepCost(s, nx, nz, blocked); if (!c || fenceBetween(s, [x, z], [nx, nz])) continue;
        const nk = nz * N + nx, nd = d + c; if (nd >= (dist.get(nk) ?? Infinity)) continue;
        dist.set(nk, nd); prev.set(nk, k); (buckets[nd] ??= []).push(nk);
      }
    }
  }
  if (found < 0) return [];
  const out = []; for (let k = found; k !== -1; k = prev.get(k)) out.push([k % N, Math.floor(k / N)]);
  return out.reverse();
}
