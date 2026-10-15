import { ACTIONS } from './act.mjs';
import { levelOf, isRepairing } from './condition.mjs';
import { actions as learning } from './learning.mjs';
import { stepCost, fenceBetween, findRoute } from './walk.mjs';
import { HOME_APPROACH, HOME_MEMORY, HOME_ACTIVITIES, HOME_THINGS, HOME_MADE } from '../content/explore.mjs';
import { residents, heartsOf, addHearts } from './bonds.mjs';
import { gainXp } from './levels.mjs';
import { roomClear, roomRoute, movePoint, xz } from './explore-navigation.mjs';
import { depthAt, waterPace, tickSwim, waterCell, SWIM } from './swim.mjs';

// Pose, routes, and held controls are never serialized. Old saves need no eager Explore module.
const sessions = new WeakMap();
const stamp = n => Number.isSafeInteger(n) && n >= 0;
export function exploreState(s) {
  const e = s.explore, m = e?.memories?.[HOME_MEMORY.id];
  const used = {}; for (const id of Object.keys(HOME_ACTIVITIES)) if (stamp(e?.used?.[id])) used[id] = e.used[id];
  const made = {}; for (const [id, max] of Object.entries(HOME_MADE)) made[id] = Number.isSafeInteger(e?.made?.[id]) ? Math.max(0, Math.min(max, e.made[id])) : 0;
  return { version: 1, made, controls: e?.controls === 'joystick' ? 'joystick' : 'tap', introduced: e?.introduced === true,
    used, drawings: Number.isSafeInteger(e?.drawings) ? Math.max(0, Math.min(HOME_ACTIVITIES.draw.max, e.drawings)) : 0,
    memories: stamp(m?.discoveredAt) ? { [HOME_MEMORY.id]: { discoveredAt: m.discoveredAt, readAt: stamp(m.readAt) ? Math.max(m.discoveredAt, m.readAt) : null } } : {} };
}
export const exploreSession = s => sessions.get(s);
/** Milliseconds until a home activity can be done again. A clock set back can never lock it for longer than its cooldown. */
export function homeCooldown(s, id, now) {
  const a = HOME_ACTIVITIES[id], at = exploreState(s).used[id]; if (!a || at === undefined || !stamp(now)) return 0;
  return Math.max(0, Math.min(a.cooldownMs, at + a.cooldownMs - now));
}
export const endExplore = s => sessions.delete(s);
export const homeOpen = s => levelOf(s, 'house') < 3 && !isRepairing(s, 'house');
const cell = p => p.map(v => Math.floor(v / 2));
export function outdoorClear(s, p, blocked) {
  return p?.every(Number.isFinite) && [[0, 0], [-.3, 0], [.3, 0], [0, -.3], [0, .3]].every(d => stepCost(s, ...cell(p.map((v, i) => v + d[i])), blocked));
}
export const outdoorCrosses = (s, a, b) => fenceBetween(s, cell(a), cell(b));
export function safeHome(s, blocked) {
  for (let r = 0; r < 12; r++) for (let z = -r; z <= r; z++) for (let x = -r; x <= r; x++) {
    const p = [HOME_APPROACH[0] + x * 2, HOME_APPROACH[1] + z * 2];
    if (outdoorClear(s, p, blocked)) return p;
  }
  return null;
}
export function startExplore(s, position, room, blocked) {
  const p = outdoorClear(s, position, blocked) ? position : safeHome(s, blocked);
  if (!p) return false;
  sessions.set(s, { room, location: 'outdoors', p: [...p], yaw: 0, seated: false, route: [], blocked }); return true;
}
export function routeExplore(s, to) {
  const e = sessions.get(s); if (!e || !to?.every(Number.isFinite)) return false;
  e.seated = false; e.route = []; // A new destination replaces the old walk, even when it is blocked.
  if (e.location !== 'outdoors') e.route = roomRoute(e.room, e.p, to);
  else {
    if (!outdoorClear(s, to, e.blocked)) return false;
    e.route = findRoute(s, cell(e.p), cell(to), { exact: true, blocked: e.blocked }).map(([x, z]) => [x * 2 + 1, z * 2 + 1]);
    if (e.route.length) e.route.push([...to]);
  }
  return e.route.length > 0;
}
export function moveExplore(s, dx, dz, dt) {
  const e = sessions.get(s); if (!e || ![dx, dz, dt].every(Number.isFinite)) return;
  dt = Math.max(0, Math.min(.1, dt)); const outdoors = e.location === 'outdoors';
  if (outdoors) tickSwim(e, dt, e.pushing, (p, any) => landNear(s, p, e.blocked, any) ?? (any ? safeHome(s, e.blocked) : null)); e.pushing = false;   // the water (core/swim.mjs)
  if (e.boost > 0) e.boost -= dt;   // a skill's dash or glide wears off with time, moving or not
  const before = e.p;   // (after the water: a tired swimmer may just have been set on the bank)
  const held = Math.hypot(dx, dz) > 0 && !e.tired;   // tired in the water: you are carried to the bank, whatever the stick says
  if (held) { e.route = []; e.seated = false; }
  const goal = e.route[0]; let remaining = Infinity;
  if (!held && goal) { dx = goal[0] - before[0]; dz = goal[1] - before[1]; remaining = Math.hypot(dx, dz); }
  const length = Math.hypot(dx, dz); if (!length) { if (goal) e.route.shift(); return false; }
  const boost = e.boost > 0 ? e.boostBy ?? 1 : 1;   // a skill's dash or glide (core/moves.mjs, ui/explore-mode.mjs)
  const step = Math.min(remaining, (outdoors ? OUTDOOR_SPEED * waterPace(depthAt(...before)) * boost : 2.4) * dt);
  // in the water: the water and the cells it fills; on land: the bank holds where the water gets SWIM.edge deep (and
  // never deeper than where you stand, so a start on the water's edge can always walk out)
  const edge = Math.max(SWIM.edge, depthAt(...before));
  const clear = !outdoors ? p => roomClear(e.room, p) : e.inWater ? p => depthAt(...p) > 0 || swimClear(s, p, e.blocked) : p => outdoorClear(s, p, e.blocked) && depthAt(...p) <= edge;
  e.p = movePoint(before, [dx / length * step, dz / length * step], clear, e.location === 'outdoors' ? (a, b) => outdoorCrosses(s, a, b) : undefined);
  const moved = Math.hypot(e.p[0] - before[0], e.p[1] - before[1]);
  // pressing at the water's edge: you stand where the bank stops you (SWIM.edge deep) and the water ahead is deeper
  // (sliding along the bank counts as pressing: the bank only lets you go along it)
  if (outdoors && held && !e.inWater) { const now = depthAt(...e.p); e.pushing = now >= edge - 0.08 && depthAt(e.p[0] + dx / length * 0.8, e.p[1] + dz / length * 0.8) > now + 0.05; }
  if (moved > .001) e.yaw = Math.atan2(e.p[0] - before[0], e.p[1] - before[1]);
  if (goal && Math.hypot(e.p[0] - goal[0], e.p[1] - goal[1]) < .025) e.route.shift();
  else if (goal && moved < .001) { e.route = []; if (e.tired) e.stuck = true; }   // (a tired swimmer is then set on the bank)
  return moved > .001;
}
export const OUTDOOR_SPEED = 3.6;
/** Can a swimmer be here: every corner over a walkable cell or a cell the water fills. */
const swimClear = (s, p, blocked) => p.every(Number.isFinite) && [[0, 0], [-.3, 0], [.3, 0], [0, -.3], [0, .3]].every(d => { const c = cell(p.map((v, i) => v + d[i])); return stepCost(s, ...c, blocked) || waterCell(...c); });
/** The nearest dry place you can stand, by rings of cells round a point (metres), that a swimmer can reach in a straight
 *  line; with `any`, the nearest dry place at all. Null if there is none within 16 m. */
function landNear(s, p, blocked, any = false) {
  const cx = Math.floor(p[0] / 2), cz = Math.floor(p[1] / 2);
  const straight = q => { const n = Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) / 0.4); for (let i = 1; i < n; i++) { const t = i / n, a = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]; if (!(depthAt(...a) > 0 || swimClear(s, a, blocked))) return false; } return true; };
  for (let r = 1; r <= 8; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
    const q = [(cx + dx) * 2 + 1, (cz + dz) * 2 + 1]; if (depthAt(...q) <= 0 && outdoorClear(s, q, blocked) && (any || straight(q))) return q;
  }
  return null;
}
/** Where your character can stand after Explore: where you are, or the nearest bank if you are in the water. */
export function dryPlace(s) {
  const e = sessions.get(s); if (!e) return null;
  return e.location === 'outdoors' && (e.inWater || depthAt(...e.p) > SWIM.edge) ? landNear(s, e.p, e.blocked, true) ?? safeHome(s, e.blocked) ?? e.p : e.p;
}
const near = (e, p) => e && Math.hypot(e.p[0] - p[0], e.p[1] - p[1]) <= .35;
export const atObject = (s, id) => {
  const e = sessions.get(s), object = e?.room.interactions.find(o => o.id === id);
  return e?.location === e?.room.roomId && object && near(e, xz(object.stand));
};
export const actions = {
  introduceExplore(ctx) {
    if (!sessions.has(ctx.s)) return ctx.fail('Start exploring first');
    const e = exploreState(ctx.s); e.introduced = true; ctx.s.explore = e; return {};
  },
  exploreControls(ctx, { controls }) {
    if (!sessions.has(ctx.s) || !['tap', 'joystick'].includes(controls)) return ctx.fail('Start exploring first');
    ctx.s.explore = { ...exploreState(ctx.s), controls }; return {};
  },
  enterFarmhouse(ctx) {
    const e = sessions.get(ctx.s);
    if (!e || e.room.roomId !== 'farmhouse_main' || e.location !== 'outdoors' || !near(e, HOME_APPROACH)) return ctx.fail('Walk to the farmhouse door first');
    if (!homeOpen(ctx.s)) return ctx.fail('Repair the farmhouse before going inside');
    if (!outdoorClear(ctx.s, HOME_APPROACH, e.blocked)) return ctx.fail('The way is blocked. Try another spot.');
    e.location = 'farmhouse_main'; e.p = xz(e.room.entry.position); e.yaw = Math.PI; e.route = []; e.seated = false; return {};
  },
  leaveFarmhouse(ctx, { recover = false }) {
    const e = sessions.get(ctx.s);
    if (!e || e.location !== 'farmhouse_main' || (!recover && !atObject(ctx.s, 'farmhouse_exit'))) return ctx.fail('Walk to the door first');
    const p = safeHome(ctx.s, e.blocked); if (!p) return ctx.fail('The way is blocked. Try another spot.');
    e.location = 'outdoors'; e.p = p; e.route = []; e.seated = false; return {};
  },
  sitAtHome(ctx) {
    if (!atObject(ctx.s, 'farmhouse_sofa')) return ctx.fail('Walk to the sofa first');
    const e = sessions.get(ctx.s); e.seated = true; e.route = []; return {};
  },
  restOnSofa(ctx) {
    if (!atObject(ctx.s, 'farmhouse_sofa') || !sessions.get(ctx.s).seated) return ctx.fail('Sit on the sofa first');
    return learning.restForProject(ctx);
  },
  /** Brew a pot in the kitchen: shared with the resident you know least (+1 heart), or a quiet cup (+XP). */
  brewTea(ctx) {
    if (!atObject(ctx.s, 'farmhouse_kitchen')) return ctx.fail('Walk to the kitchen first');
    if (!stamp(ctx.now)) return ctx.fail('The project clock is unavailable');
    if (homeCooldown(ctx.s, 'tea', ctx.now) > 0) return ctx.fail('The kettle is still warm. Try again a little later.');
    const e = exploreState(ctx.s), a = HOME_ACTIVITIES.tea; e.used.tea = ctx.now; ctx.s.explore = e;
    const guest = residents(ctx.s, ctx.now).map(r => r.id).filter(id => heartsOf(ctx.s, id) < 10).sort((x, y) => heartsOf(ctx.s, x) - heartsOf(ctx.s, y) || (x < y ? -1 : 1))[0];
    if (guest) { addHearts(ctx, guest, a.hearts, 'tea'); return { guest }; }
    gainXp(ctx, a.xp); return { xp: a.xp };
  },
  /** Draw in the journal at the desk: a little XP, and one more drawing for the memory shelf's count. */
  drawInJournal(ctx) {
    if (!atObject(ctx.s, 'farmhouse_desk')) return ctx.fail('Walk to the desk first');
    if (!stamp(ctx.now)) return ctx.fail('The project clock is unavailable');
    if (homeCooldown(ctx.s, 'draw', ctx.now) > 0) return ctx.fail('Your hand needs a rest. Try again a little later.');
    const e = exploreState(ctx.s), a = HOME_ACTIVITIES.draw; e.used.draw = ctx.now; e.drawings = Math.min(a.max, e.drawings + 1); ctx.s.explore = e;
    gainXp(ctx, a.xp); return { xp: a.xp, drawings: e.drawings };
  },
  /** A little thing at home (HOME_THINGS): a line every time; its XP and its count once it has rested. */
  useAtHome(ctx, { id, extra = false }) {
    const th = HOME_THINGS[id], ses = sessions.get(ctx.s), list = extra ? th?.extra?.lines : th?.lines;
    if (!list?.length || !atObject(ctx.s, `farmhouse_${id}`)) return ctx.fail('Walk closer first');
    ses.turns = (ses.turns ?? 0) + 1;
    if (extra || !th.cooldownMs) return { line: list[ses.turns % list.length] };
    if (!stamp(ctx.now)) return ctx.fail('The project clock is unavailable');
    if (homeCooldown(ctx.s, id, ctx.now) > 0) return ctx.fail('Not just yet. Try again a little later.');
    const e = exploreState(ctx.s), out = { line: list[(th.count ? e.made[th.count] : ses.turns) % list.length], xp: th.xp };
    e.used[id] = ctx.now;
    if (th.count) out.made = e.made[th.count] = Math.min(HOME_MADE[th.count], e.made[th.count] + 1);
    ctx.s.explore = e; gainXp(ctx, th.xp);
    if (th.every && out.made % th.every === 0) {   // a finished scarf goes to the neighbour you know least
      const guest = residents(ctx.s, ctx.now).map(r => r.id).filter(p => heartsOf(ctx.s, p) < 10).sort((a, b) => heartsOf(ctx.s, a) - heartsOf(ctx.s, b) || (a < b ? -1 : 1))[0];
      out.finished = true; if (guest) { addHearts(ctx, guest, th.hearts, 'gift'); out.guest = guest; } else { gainXp(ctx, th.gift); out.xp += th.gift; }
    }
    return out;
  },
  readHomeMemory(ctx) {
    if (!atObject(ctx.s, 'farmhouse_memory_shelf')) return ctx.fail('Walk to the memory shelf first');
    if (!stamp(ctx.now)) return ctx.fail('The project clock is unavailable');
    const e = exploreState(ctx.s), old = e.memories[HOME_MEMORY.id];
    if (!old) e.memories[HOME_MEMORY.id] = { discoveredAt: ctx.now, readAt: ctx.now };
    else if (old.readAt === null) old.readAt = Math.max(old.discoveredAt, ctx.now);
    ctx.s.explore = e; return { first: !old };
  },
};
// Installed only when the user chooses Go inside; save loading never imports this file.
export const installExplore = () => Object.assign(ACTIONS, actions);
