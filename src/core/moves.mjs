// Moves in Explore (docs/plan/98-zoo-garden-moves.md, after Zoo Garden's normal attack), made peaceful: a swing shoos
// the crows near you (a view thing), splashes water, and knocks loose a weed or a stone right in front of you: a free
// clear, MOVES.knocks a day, on land you may clear. Installed with Explore (installMoves), never in the first download.
//   s.moves = { day, at, knocked, cd, helped, leap }   (day: the farm's day, core/clock.mjs dayKey; at: the last knock)
import { ACTIONS, LATE_TICKS } from './act.mjs';
import * as grid from './grid.mjs';
import { N } from '../content/world.mjs';
import { CELL_TYPES } from './state.mjs';
import { costumeOf } from '../content/wardrobe.mjs';
import { skillsOf } from '../content/skills.mjs';
import { BUILDINGS } from '../content/buildings.mjs';
import { depthAt } from './swim.mjs';
import { pick as pickFish } from './fishing.mjs';
import { POND_WATER } from '../content/world.mjs';
import { rng, hash } from './rng.mjs';
import * as barn from './barn.mjs';
import { dayKey } from './clock.mjs';

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
// The knocks come back with the farm's own day (04:00 local, like everything daily); a clock set back keeps today's count.
const knockedToday = (m, now) => m?.day === dayKey(now) || now < (m?.at ?? 0) ? m.knocked ?? 0 : 0;
export const knocksLeft = (s, now) => MOVES.knocks - knockedToday(s.moves, now);
export const actions = {
  /** A swing at (x, z) metres facing yaw: knocks loose a weed or a stone ahead (free, MOVES.knocks a day). */
  swing(ctx, { x, z, yaw } = {}) {
    const { s, now } = ctx; if (![x, z, yaw].every(Number.isFinite)) return ctx.fail('Unknown place');
    const hit = swingTarget(s, x, z, yaw), [cx, cz] = hit.cell;
    if (hit.type !== 'weeds' && hit.type !== 'rock') return { hit: hit.type, cell: hit.cell };
    if (knocksLeft(s, now) <= 0) return { hit: hit.type, cell: hit.cell, tired: true };
    const m = (s.moves ??= {}); m.knocked = knockedToday(m, now) + 1; m.day = dayKey(now); m.at = Math.max(m.at ?? 0, now);   // (the skills' and fish's times stay)
    s.cells[cz * N + cx] = CELL_TYPES.grass; grid.touch(s);
    ctx.emit('cellChanged', { x: cx, z: cz, cleared: hit.type, owned: grid.landOf(s, cx, cz) === 'farm', knocked: true });
    return { hit: hit.type, cell: hit.cell, knocked: true, left: knocksLeft(s, now) };
  },
};
// Skills (step 4): a disguise costume's four (content/skills.mjs). Cooldowns are kept in the save (s.moves.cd, by the
// costume's kit and the slot) so leaving Explore or reloading never resets them. Two effects touch the farm, gently:
// `splash` waters the beds where it lands, `bloom` the beds and fruit trees round you: each takes a quarter off what is
// left of its wait, once per growth (s.moves.helped remembers the wait it gave), at most SKILL.beds at a time.
export const SKILL = { splashAhead: 4, splashCells: 1, bloomCells: 3, sooner: 0.25, beds: 8 };
/** The skills you can use now: [{ name, effect, cd, index, readyAt }] (empty unless a disguise costume is on). A wait
 *  is never longer than the skill's cooldown from `now` (a clock that was set back). */
export function skillsNow(s, now = Infinity) {
  const kit = costumeOf(s)?.kit, cd = s.moves?.cd ?? {};
  return skillsOf(kit).map((sk, index) => ({ ...sk, index, readyAt: Math.min(cd[`${kit}:${index}`] ?? 0, now + sk.cd * 1000) }));
}
function help(s, now, cells, cx, cz) {
  const helped = ((s.moves ??= {}).helped ??= {}); let n = 0;
  for (const [id, p] of Object.entries(s.placed ?? {})) {
    if (n >= SKILL.beds || Math.max(Math.abs(p.x - cx), Math.abs(p.z - cz)) > cells) continue;
    const it = p.kind === 'bed' ? s.beds?.[id] : BUILDINGS[p.kind]?.fruit ? s.trees?.[id] : null;
    if (!it || !(it.doneAt > now) || helped[id] === it.doneAt) continue;
    it.doneAt = now + Math.round((it.doneAt - now) * (1 - SKILL.sooner)); helped[id] = it.doneAt; n++;
  }
  for (const id of Object.keys(helped)) if (!s.placed?.[id]) delete helped[id];
  return n;
}
Object.assign(actions, {
  /** Use a skill of the costume you wear: { index, x, z, yaw } (where you stand, metres). */
  useSkill(ctx, { index, x, z, yaw } = {}) {
    const { s, now } = ctx, kit = costumeOf(s)?.kit, sk = skillsOf(kit)[index];
    if (!sk || !Number.isSafeInteger(index)) return ctx.fail('Put on a disguise to use its skills');
    if (![x, z, yaw].every(Number.isFinite)) return ctx.fail('Unknown place');
    const key = `${kit}:${index}`, cd = ((s.moves ??= {}).cd ??= {});
    if (Math.min(cd[key] ?? 0, now + sk.cd * 1000) > now) return ctx.fail('Not ready yet');
    cd[key] = now + sk.cd * 1000;
    const at = sk.effect === 'splash' ? [x + Math.sin(yaw) * SKILL.splashAhead, z + Math.cos(yaw) * SKILL.splashAhead] : [x, z];
    const [cx, cz] = at.map(v => Math.floor(v / 2));
    const helped = sk.effect === 'splash' ? help(s, now, SKILL.splashCells, cx, cz) : sk.effect === 'bloom' ? help(s, now, SKILL.bloomCells, cx, cz) : 0;
    ctx.emit('skillUsed', { kit, index, effect: sk.effect, helped });
    return { effect: sk.effect, name: sk.name, at, helped, readyAt: cd[key] };
  },
});
// Fish (step 5, after Zoo Garden's pond splash): a swing or a skill that splashes the water makes fish leap; now and
// then one lands at your feet, a catch for the barn: the first splash after a wait of LEAP.everyMs to twice that, in
// each water (a roll per splash meant nothing: splashing is free). s.moves.leap = { pond | brook: when the next may land }
export const LEAP = { everyMs: 5 * 60_000 };
const waterKey = (x, z) => Math.hypot((x - POND_WATER.x) / POND_WATER.rx, (z - POND_WATER.z) / POND_WATER.rz) < 1 ? 'pond' : 'brook';
Object.assign(actions, {
  /** Water splashed at (x, z) metres: { leap: true } and, now and then, { caught: fish } landed in the barn. */
  splashWater(ctx, { x, z } = {}) {
    const { s, now } = ctx; if (![x, z].every(Number.isFinite) || !(depthAt(x, z) > 0)) return ctx.fail('That is not water');
    const key = waterKey(x, z), leap = ((s.moves ??= {}).leap ??= {});
    if (Math.min(leap[key] ?? 0, now + 2 * LEAP.everyMs) > now) return { leap: true };   // (capped: a clock set back)
    const fish = pickFish(hash(s.seed, 'leapfish', now), false, key === 'brook');
    leap[key] = now + Math.round(LEAP.everyMs * (1 + rng(hash(s.seed, 'leap', now))()));
    const coins = barn.addOrSell(s, fish, 1); if (coins) ctx.emit('barnSold', { coins });
    (s.album ??= { fish: {}, fruit: {} }).fish[fish] = (s.album.fish[fish] ?? 0) + 1; s.stats.fished = (s.stats.fished ?? 0) + 1;
    ctx.emit('fishLeapt', { fish }); return { leap: true, caught: fish };
  },
});
/** After a clock set back (core/act.mjs guardClock does the rest of the farm): no saved wait is longer than its own length. */
function tickMoves({ s, now }) {
  const m = s.moves; if (!m) return;
  for (const [key, at] of Object.entries(m.cd ?? {})) { const [kit, i] = key.split(':'), most = now + (skillsOf(kit)[i]?.cd ?? 20) * 1000; if (at > most) m.cd[key] = most; }
  for (const [key, at] of Object.entries(m.leap ?? {})) if (at > now + 2 * LEAP.everyMs) m.leap[key] = now + 2 * LEAP.everyMs;
}
export const installMoves = () => { Object.assign(ACTIONS, actions); if (!LATE_TICKS.includes(tickMoves)) LATE_TICKS.push(tickMoves); };
