// Walking routes for people (view/people-view.mjs). Roads and paths are cheapest, open grass costs a little more, crop
// beds more still (people go round them when they can). Buildings, the farmhouse and barn, the pond, animal pens and
// fences block; the brook blocks except where the road bridge and the stepping stones cross it. Every place someone
// can be sent to (the pond dock, benches, doors, the project site, the order board) is reachable over this ground,
// not only the cells that happen to touch a road (tests/walk.test.mjs).
import { N, FARMHOUSE, BARN, STEPPING_STONES, isBrook, isRoad, isPond } from '../content/world.mjs';
import { cellType, inMap, occupant } from './grid.mjs';

// The houses themselves (cells x-3..x+1; the yard starts at x+2), not the wider building plots, so
// the yard, the mailbox and the porch stay open.
const FIXED = [FARMHOUSE, BARN].map(b => ({ x0: b.x - 3, z0: b.z - 3, x1: b.x + 1, z1: b.z + 3 }));   // a 9 m house: cells x-3..x+1
const inFixed = (x, z) => FIXED.some(f => x >= f.x0 && x <= f.x1 && z >= f.z0 && z <= f.z1);

/** What a step onto (x, z) costs: 1 road/path, 2 stepping stone, 3 grass, 8 crop bed; 0 = cannot stand there. */
export function stepCost(s, x, z, blocked = null) {
  if (!inMap(x, z)) return 0;
  if (isRoad(x, z)) return 1;                                           // the road bridge crosses the brook
  if (isBrook(x, z)) return x === STEPPING_STONES.x ? 2 : 0;
  if (isPond(x, z) || inFixed(x, z) || blocked?.has(`${x},${z}`)) return 0;
  const id = occupant(s, x, z), kind = id ? s.placed[id]?.kind : null;
  if (kind === 'path' || cellType(s, x, z) === 'path') return 1;
  if (kind === 'bed') return 8;
  return kind ? 0 : 3;
}
/** True when a fence stands on the edge between neighbouring cells a and b. */
export function fenceBetween(s, a, b) {
  if (b[1] < a[1]) return !!s.fences[`${a[0]},${a[1]},n`]; if (b[1] > a[1]) return !!s.fences[`${b[0]},${b[1]},n`];
  if (b[0] < a[0]) return !!s.fences[`${a[0]},${a[1]},w`]; if (b[0] > a[0]) return !!s.fences[`${b[0]},${b[1]},w`];
  return false;
}
/** The cells that count as "there" for a target: the target itself when it can be stood on, otherwise the standable
 *  cells next to it (a bench, a building's front, a project site), then a little further out. */
export function goalCells(s, to, blocked = null) {
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
 *  The starting cell is always allowed, so someone standing in a doorway or on a bench can leave. */
export function findRoute(s, from, to, { blocked = null } = {}) {
  const goals = new Set(goalCells(s, to, blocked).map(([x, z]) => z * N + x)); if (!goals.size || !inMap(...from)) return [];
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
