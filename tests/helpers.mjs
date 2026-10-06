// Shared test helpers: a fresh game at a fixed time, and shortcuts that drive the real act()/tick().
import { newGame } from '../src/core/state.mjs';
import { act, tick } from '../src/core/act.mjs';
import { xpFor } from '../src/core/levels.mjs';

export const T0 = new Date(2026, 9, 7, 9, 0, 0).getTime();   // 7 Oct 2026, 09:00 local
export const MIN = 60_000, HOUR = 3_600_000;
export function game(seed = 12345) { const s = newGame(T0, seed); tick(s, T0); return s; }
/** act() that throws with the reason when refused (keeps tests short). */
export function must(s, action, payload, now = T0) {
  const r = act(s, action, payload, now);
  if (!r.ok) throw new Error(`${action} refused: ${r.reason} ${JSON.stringify(r.params ?? {})}`);
  return r;
}
export const setLevel = (s, level) => { s.level = level; s.xp = xpFor(level); };
/** Start parcel cells: x 32–47, z 56–71. The spine path runs along z = 63 from the road (x 29). */
export const SPINE_Z = 63;
export function layPath(s, cells, now = T0) { for (const [x, z] of cells) must(s, 'place', { kind: 'path', x, z }, now); }
export const spine = (x1 = 47) => Array.from({ length: x1 - 29 }, (_, i) => [30 + i, SPINE_Z]);
/** Clear any weeds or rocks in a rectangle (coins permitting). */
export function clearRect(s, x0, z0, x1, z1, now = T0) {
  const cells = []; for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) cells.push([x, z]);
  act(s, 'clear', { cells }, now);
}
/** A fence around cells x0..x1 × z0..z1 with a gate on the north edge at gateX. */
export function fenceRect(s, x0, z0, x1, z1, gateX, now = T0) {
  for (let x = x0; x <= x1; x++) { must(s, 'placeEdge', { kind: x === gateX ? 'gate' : 'fence', x, z: z0, side: 'n' }, now); must(s, 'placeEdge', { kind: 'fence', x, z: z1 + 1, side: 'n' }, now); }
  for (let z = z0; z <= z1; z++) { must(s, 'placeEdge', { kind: 'fence', x: x0, z, side: 'w' }, now); must(s, 'placeEdge', { kind: 'fence', x: x1 + 1, z, side: 'w' }, now); }
}
/** Play the tutorial's first steps: clear the three weeds, lay the spine path, place six beds. */
export function tutorial(s, now = T0) {
  must(s, 'clear', { cells: [[34, 59], [35, 60], [34, 61]] }, now);
  s.coins += 1000;                                    // the tests are about rules, not about saving up
  clearRect(s, 32, 56, 47, 71, now);                  // the whole start parcel
  layPath(s, spine(39), now);
  for (let i = 0; i < 6; i++) must(s, 'place', { kind: 'bed', x: 32 + i, z: 57 }, now);
}
