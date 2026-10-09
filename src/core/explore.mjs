import { ACTIONS } from './act.mjs';
import { levelOf, isRepairing } from './condition.mjs';
import { actions as learning } from './learning.mjs';
import { stepCost, fenceBetween, findRoute } from './walk.mjs';
import { HOME_APPROACH, HOME_MEMORY } from '../content/explore.mjs';
import { roomClear, roomRoute, movePoint, xz } from './explore-navigation.mjs';

// Pose, routes, and held controls are never serialized. Old saves need no eager Explore module.
const sessions = new WeakMap();
const stamp = n => Number.isSafeInteger(n) && n >= 0;
export function exploreState(s) {
  const e = s.explore, m = e?.memories?.[HOME_MEMORY.id];
  return { version: 1, controls: e?.controls === 'joystick' ? 'joystick' : 'tap', introduced: e?.introduced === true,
    memories: stamp(m?.discoveredAt) ? { [HOME_MEMORY.id]: { discoveredAt: m.discoveredAt, readAt: stamp(m.readAt) ? Math.max(m.discoveredAt, m.readAt) : null } } : {} };
}
export const exploreSession = s => sessions.get(s);
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
  e.seated = false;
  if (e.location === 'farmhouse_main') e.route = roomRoute(e.room, e.p, to);
  else {
    if (!outdoorClear(s, to, e.blocked)) return false;
    e.route = findRoute(s, cell(e.p), cell(to), { exact: true, blocked: e.blocked }).map(([x, z]) => [x * 2 + 1, z * 2 + 1]);
    if (e.route.length) e.route.push([...to]);
  }
  return e.route.length > 0;
}
export function moveExplore(s, dx, dz, dt) {
  const e = sessions.get(s); if (!e || ![dx, dz, dt].every(Number.isFinite)) return;
  dt = Math.max(0, Math.min(.1, dt)); const before = e.p;
  const held = Math.hypot(dx, dz) > 0;
  if (held) { e.route = []; e.seated = false; }
  const goal = e.route[0]; let remaining = Infinity;
  if (!held && goal) { dx = goal[0] - before[0]; dz = goal[1] - before[1]; remaining = Math.hypot(dx, dz); }
  const length = Math.hypot(dx, dz); if (!length) { if (goal) e.route.shift(); return false; }
  const step = Math.min(remaining, 2.4 * dt), clear = e.location === 'outdoors' ? p => outdoorClear(s, p, e.blocked) : p => roomClear(e.room, p);
  e.p = movePoint(before, [dx / length * step, dz / length * step], clear, e.location === 'outdoors' ? (a, b) => outdoorCrosses(s, a, b) : undefined);
  const moved = Math.hypot(e.p[0] - before[0], e.p[1] - before[1]);
  if (moved > .001) e.yaw = Math.atan2(e.p[0] - before[0], e.p[1] - before[1]);
  if (goal && Math.hypot(e.p[0] - goal[0], e.p[1] - goal[1]) < .025) e.route.shift();
  else if (goal && moved < .001) e.route = [];
  return moved > .001;
}
const near = (e, p) => e && Math.hypot(e.p[0] - p[0], e.p[1] - p[1]) <= .35;
export const atObject = (s, id) => {
  const e = sessions.get(s), object = e?.room.interactions.find(o => o.id === id);
  return e?.location === 'farmhouse_main' && object && near(e, xz(object.stand));
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
    if (!e || e.location !== 'outdoors' || !near(e, HOME_APPROACH)) return ctx.fail('Walk to the farmhouse door first');
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
