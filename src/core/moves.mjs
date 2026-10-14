// Moves in Explore (docs/plan/98-zoo-garden-moves.md, after Zoo Garden's normal attack), made peaceful: a swing shoos
// the crows near you (a view thing), splashes water, and knocks loose a weed or a stone right in front of you: a free
// clear, MOVES.knocks a day, on land you may clear. Installed with Explore (installMoves), never in the first download.
//   s.moves = { day, knocked }   (the day: whole days since 1970 in the farm's clock)
import { ACTIONS } from './act.mjs';
import * as grid from './grid.mjs';
import { N } from '../content/world.mjs';
import { CELL_TYPES } from './state.mjs';

const DAY = 86_400_000;
export const MOVES = { reach: 1.6, knocks: 6, swingMs: 450 };
/** The cell a swing lands on: the one MOVES.reach metres ahead of a player at (x, z) metres facing `yaw`. */
export const swingCell = (x, z, yaw) => [Math.floor((x + Math.sin(yaw) * MOVES.reach) / 2), Math.floor((z + Math.cos(yaw) * MOVES.reach) / 2)];
/** What lies where a swing lands: the weed or stone it can knock loose (on land you may clear), and whether it is water. */
export function swingTarget(s, x, z, yaw) {
  const [cx, cz] = swingCell(x, z, yaw);
  for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const ax = cx + dx, az = cz + dz, type = grid.cellType(s, ax, az);
    if ((type === 'weeds' || type === 'rock') && (grid.landOf(s, ax, az) || grid.isVerge(s, ax, az))) return { cell: [ax, az], type };
  }
  return { cell: [cx, cz], type: grid.cellType(s, cx, cz) };
}
export const knocksLeft = (s, now) => { const m = s.moves, day = Math.floor(now / DAY); return MOVES.knocks - (m?.day === day ? m.knocked ?? 0 : 0); };
export const actions = {
  /** A swing at (x, z) metres facing yaw: knocks loose a weed or a stone ahead (free, MOVES.knocks a day). */
  swing(ctx, { x, z, yaw } = {}) {
    const { s, now } = ctx; if (![x, z, yaw].every(Number.isFinite)) return ctx.fail('Unknown place');
    const hit = swingTarget(s, x, z, yaw), [cx, cz] = hit.cell;
    if (hit.type !== 'weeds' && hit.type !== 'rock') return { hit: hit.type, cell: hit.cell };
    if (knocksLeft(s, now) <= 0) return { hit: hit.type, cell: hit.cell, tired: true };
    const day = Math.floor(now / DAY); s.moves = { day, knocked: (s.moves?.day === day ? s.moves.knocked ?? 0 : 0) + 1 };
    s.cells[cz * N + cx] = CELL_TYPES.grass; grid.touch(s);
    ctx.emit('cellChanged', { x: cx, z: cz, cleared: hit.type, owned: grid.landOf(s, cx, cz) === 'farm', knocked: true });
    return { hit: hit.type, cell: hit.cell, knocked: true, left: knocksLeft(s, now) };
  },
};
export const installMoves = () => Object.assign(ACTIONS, actions);
