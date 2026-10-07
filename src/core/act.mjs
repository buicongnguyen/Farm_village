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
import { actions as market, tickTruck } from './market.mjs';
import { actions as fishing, tickFishing } from './fishing.mjs';
import { actions as quests, tickQuests } from './quests.mjs';
import { addNewPlaces } from './places.mjs';
import { tickHelpers } from './helpers.mjs';
import { actions as trees } from './trees.mjs';
import { actions as bonds, afterAction, tickBonds } from './bonds.mjs';
import { actions as cart, tickCart } from './cart.mjs';
import { actions as condition, tickCondition } from './condition.mjs';
import { actions as testmode } from './testmode.mjs';
import { clampDone } from './clock.mjs';
import { CROPS, RECIPES, ANIMALS, FRUITS } from '../content/goods.mjs';
import { BUILDINGS } from '../content/buildings.mjs';
import { ORDERS, STALL, TRUCK, FISH, RENT, FAMILY_ARRIVAL_MS, REPAIR } from '../content/economy.mjs';

export const ACTIONS = { ...farm, ...animals, ...production, ...build, ...projects, ...homes, ...orders, ...neighbours, ...today, ...stall, ...market, ...fishing, ...quests,
  ...trees, ...bonds, ...cart, ...condition, ...testmode };

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
  const ctx = context(s, now), step = s.projects.step;
  const out = handler(ctx, payload ?? {}) ?? {};
  if (out.ok === false) return { ...out, events: [] };
  advance(ctx); tickCart(ctx); afterAction(ctx);
  // a finished project step cannot be undone: undoing its building would refund the price and keep the step done
  if (s.projects.step !== step) s.undo = [];
  s.lastSeen = Math.max(s.lastSeen, now);
  remember(s, ctx.events, now);
  return { ok: true, ...out, events: ctx.events };
}
export function tick(s, now = Date.now()) {
  const ctx = context(s, now);
  // a device clock that went backward never makes a timer longer than its full length
  if (now < s.lastSeen) guardClock(s, now);
  tickToday(ctx); tickCondition(ctx); tickHomes(ctx); tickCart(ctx); tickNeighbours(ctx); tickOrders(ctx); tickStall(ctx); tickTruck(ctx); tickFishing(ctx); tickQuests(ctx); tickHelpers(ctx); if (s.needsPlaces) { delete s.needsPlaces; for (const kind of addNewPlaces(s)) ctx.emit('placed', { id: Object.keys(s.placed).find(k => s.placed[k].kind === kind), kind }); } advance(ctx); tickCart(ctx); tickBonds(ctx);
  s.lastSeen = Math.max(s.lastSeen, now);
  remember(s, ctx.events, now);
  return { events: ctx.events };
}
/** Village news for the Today board (DESIGN 14): the latest notable events, newest first. */
const NEWS = new Set(['projectDone', 'familyArrived', 'neighbourVisit', 'traded', 'levelUp', 'heartScene', 'wishGranted', 'cartSent', 'charmMilestone', 'letter', 'repaired', 'neighbourRepair', 'houseUpgraded']);
// "First times" for the album (DESIGN 13): the moment each first happened.
const FIRSTS = { harvested: 'harvest', collected: 'egg', orderFilled: 'order', familyArrived: 'family', traded: 'trade', produced: 'product',
  picked: 'fruit', gifted: 'gift', wishGranted: 'wish', cartSent: 'cart', heartScene: 'heartScene', letter: 'letter' };
function remember(s, events, now) {
  for (const e of events) {
    const k = FIRSTS[e.type]; if (k && !(s.firsts ??= {})[k]) s.firsts[k] = now;
    if (e.type === 'projectDone') (s.firsts ??= {})[`project:${e.id}`] ??= now;
    if (e.type === 'heartScene') (s.firsts ??= {})[`heart:${e.person}:${e.at}`] ??= now;   // the album's heart-scene pages
  }
  for (const e of events) if (NEWS.has(e.type)) (s.news ??= []).unshift({ ...e, at: now });
  if (s.news?.length > 12) s.news.length = 12;
}
function guardClock(s, now) {
  for (const b of Object.values(s.beds)) b.doneAt = clampDone(b.doneAt, now, CROPS[b.crop].growMs);
  for (const list of Object.values(s.animals)) for (const a of list) if (a.doneAt != null) a.doneAt = clampDone(a.doneAt, now, ANIMALS[a.kind].everyMs);
  for (const q of Object.values(s.production)) { let t = now; for (const j of q.queue) { j.doneAt = clampDone(j.doneAt, Math.max(t, now), RECIPES[j.recipe].timeMs); t = j.doneAt; } }
  for (const r of Object.values(s.repairing ?? {})) r.doneAt = Math.min(r.doneAt, now + REPAIR.broken.ms);
  if (s.wearAt) s.wearAt = Math.min(s.wearAt, now);
  // waits that are not stored as a duration: never longer than their full length after a clock moved back
  if (s.orders?.pending) s.orders.pending = s.orders.pending.map(at => Math.min(at, now + ORDERS.discardMs));
  if (s.fishing?.line) s.fishing.line.doneAt = Math.min(s.fishing.line.doneAt, now + FISH.waitMs);
  if (s.helpAt) s.helpAt = Math.min(s.helpAt, now + 2 * 60_000);
  if (s.truck?.away) s.truck.backAt = Math.min(s.truck.backAt, now + TRUCK.tripMs);
  for (const h of Object.values(s.homes)) if (h.tipAt) h.tipAt = Math.min(h.tipAt, now + RENT.tipMs[1]);
  if (s.stall?.nextSaleAt) s.stall.nextSaleAt = Math.min(s.stall.nextSaleAt, now + STALL.sellEveryMs[1]);
  for (const h of Object.values(s.homes)) if (h.family && !h.arrived && h.arrivesAt > now + FAMILY_ARRIVAL_MS) { h.arrivesAt = now + FAMILY_ARRIVAL_MS; h.rentFrom = Math.min(h.rentFrom, h.arrivesAt); }
  for (const [id, tr] of Object.entries(s.trees ?? {})) { const f = FRUITS[BUILDINGS[s.placed[id]?.kind]?.fruit]; if (f) tr.doneAt = clampDone(tr.doneAt, now, tr.first ? f.firstMs : f.regrowMs); }
}
