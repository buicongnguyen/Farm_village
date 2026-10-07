// The only way to change the state (TECH-PLAN 2, rule 1):
//   act(state, action, payload, now) → { ok, reason?, params?, events, ...result }
//   tick(state, now)                 → { events }   (families arriving, new orders, neighbours, the new day)
// The view plays the events; a refused action changes nothing and gives a reason for t().
import { actions as farm } from './farm.mjs';
import { actions as animals } from './animals.mjs';
import { actions as production } from './production.mjs';
import { actions as build } from './build.mjs';
import { actions as projects, advance } from './projects.mjs';
import { actions as homes, tickHomes } from './homes.mjs';
import { actions as orders, tickOrders } from './orders.mjs';
import { actions as neighbours, tickNeighbours } from './neighbours.mjs';
import { actions as today, tickToday } from './today.mjs';
import { actions as stall, tickStall } from './stall.mjs';
import { clampDone } from './clock.mjs';
import { CROPS, RECIPES, ANIMALS } from '../content/goods.mjs';

export const ACTIONS = { ...farm, ...animals, ...production, ...build, ...projects, ...homes, ...orders, ...neighbours, ...today, ...stall };

function context(s, now) {
  const events = [];
  return {
    s, now, events,
    emit: (type, data = {}) => events.push({ type, ...data }),
    fail: (reason, params) => ({ ok: false, reason, params }),
  };
}
export function act(s, action, payload = {}, now = Date.now()) {
  const handler = ACTIONS[action];
  if (!handler) return { ok: false, reason: 'Unknown action', events: [] };
  // Every handler checks everything before it changes anything, so a refused action leaves no trace
  // (tests/act.test.mjs checks this for every action).
  const ctx = context(s, now);
  const out = handler(ctx, payload ?? {}) ?? {};
  if (out.ok === false) return { ...out, events: [] };
  advance(ctx);
  s.lastSeen = Math.max(s.lastSeen, now);
  remember(s, ctx.events, now);
  return { ok: true, ...out, events: ctx.events };
}
export function tick(s, now = Date.now()) {
  const ctx = context(s, now);
  // a device clock that went backward never makes a timer longer than its full length
  if (now < s.lastSeen) guardClock(s, now);
  tickToday(ctx); tickHomes(ctx); tickNeighbours(ctx); tickOrders(ctx); tickStall(ctx); advance(ctx);
  s.lastSeen = Math.max(s.lastSeen, now);
  remember(s, ctx.events, now);
  return { events: ctx.events };
}
/** Village news for the Today board (DESIGN 14): the latest notable events, newest first. */
const NEWS = new Set(['projectDone', 'familyArrived', 'neighbourVisit', 'traded', 'levelUp']);
function remember(s, events, now) {
  for (const e of events) if (NEWS.has(e.type)) (s.news ??= []).unshift({ ...e, at: now });
  if (s.news?.length > 12) s.news.length = 12;
}
function guardClock(s, now) {
  for (const b of Object.values(s.beds)) b.doneAt = clampDone(b.doneAt, now, CROPS[b.crop].growMs);
  for (const list of Object.values(s.animals)) for (const a of list) if (a.doneAt != null) a.doneAt = clampDone(a.doneAt, now, ANIMALS[a.kind].everyMs);
  for (const q of Object.values(s.production)) { let t = now; for (const j of q.queue) { j.doneAt = clampDone(j.doneAt, Math.max(t, now), RECIPES[j.recipe].timeMs); t = j.doneAt; } }
}
