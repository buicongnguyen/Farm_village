// The co-operative (chapter 12, docs/plan/ch12-one-river-many-farms.md): the neighbours pool their goods. Founded once
// both new growers have called, with a gift from the barn; then one shared order at a time, bigger than any one farm:
// three goods, a third of each brought by a neighbour, the rest sent from the barn a little at a time.
//   s.cooperative = { founded, n, filled, nextAt, order: { n, lines: [{ good, need, pledged, by, sent }], coins, xp } }
// (Named in full everywhere: `coop` is the hen coop.)
import { COOPERATIVE as C, XP } from '../content/economy.mjs';
import { GOODS } from '../content/goods.mjs';
import { NEIGHBOURS, hasArrived } from '../content/people.mjs';
import { orderable } from './orders.mjs';
import { gainXp } from './levels.mjs';
import { rng, hash } from './rng.mjs';
import * as barn from './barn.mjs';

/** The neighbours who are part of the valley now (the two newcomers arrive with chapter 11). */
export const members = s => NEIGHBOURS.filter(n => hasArrived(s, n)).map(n => n.id);
/** Has this neighbour called at the farm at least once? */
export const hasCalled = (s, id) => (s.neighbours?.[id]?.total ?? 0) >= 1;
export const isFounded = s => !!s.cooperative?.founded;
/** What founding takes. Pure: { ok, reason?, open, callers: [{ id, called }], gift: [{ good, need, have }] }. */
export function foundingPlan(s) {
  const open = (s.story?.chapter ?? 0) >= 11;
  const callers = NEIGHBOURS.filter(n => n.arrives).map(n => ({ id: n.id, called: open && hasCalled(s, n.id) }));
  const gift = Object.entries(C.gift).map(([good, need]) => ({ good, need, have: Math.min(need, barn.free(s, good)) }));
  const out = { open, callers, gift };
  if (!open) return { ...out, ok: false, reason: 'Nobody has thought of it yet' };
  if (isFounded(s)) return { ...out, ok: false, reason: 'The co-operative is founded already' };
  if (callers.some(c => !c.called)) return { ...out, ok: false, reason: 'Your new neighbours have not both called yet' };
  if (!barn.hasAll(s, C.gift)) return { ...out, ok: false, reason: 'The founding gift is not in the barn yet' };
  return { ...out, ok: true };
}
/** How many of a good a line asks for: about C.line(level) coins' worth, in round numbers. */
const lineNeed = (s, good) => { const n = Math.min(C.max, Math.max(C.min, Math.round(C.line(s.level) / GOODS[good].value))); return n > 20 ? Math.round(n / 5) * 5 : n; };
/** Order number n for this farm, from what it can grow and make today. Seeded: the same farm is asked the same thing. */
export function makeOrder(s, n) {
  const r = rng(hash(s.createdAt, 'cooperative', n)), who = members(s);
  const pool = orderable(s).filter(g => !['feed', 'fish'].includes(GOODS[g].kind)).sort();
  for (const g of ['wheat', 'carrot', 'corn']) if (pool.length < C.lines && !pool.includes(g)) pool.push(g);   // a bare farm is asked for what any farm can sow
  const lines = [];
  while (lines.length < C.lines && pool.length) {
    const good = pool.splice(r.int(pool.length), 1)[0], need = lineNeed(s, good);
    lines.push({ good, need, pledged: Math.round(need * C.pledge), by: who.length ? r.pick(who) : null, sent: 0 });
  }
  const worth = lines.reduce((sum, l) => sum + (l.need - l.pledged) * GOODS[l.good].value, 0);
  return { n, lines, coins: Math.round(worth * C.pay) + C.coins, xp: Math.max(1, Math.round(worth * C.xp)) };
}
/** What is still to send on a line. */
export const lineLeft = l => Math.max(0, l.need - l.pledged - l.sent);
/** For the panel: { founded, order, nextAt, filled }. */
export const cooperativeOf = s => ({ founded: isFounded(s), order: s.cooperative?.order ?? null, nextAt: s.cooperative?.nextAt ?? null, filled: s.cooperative?.filled ?? 0 });

function post(ctx) {
  const { s } = ctx, c = s.cooperative;
  c.order = makeOrder(s, c.n); ctx.emit('cooperativeOrderPosted', { n: c.n, goods: c.order.lines.map(l => l.good) });
}
function settle(ctx) {
  const { s, now } = ctx, c = s.cooperative, o = c.order;
  s.coins += o.coins; s.stats.coinsEarned += o.coins; gainXp(ctx, o.xp);
  // the neighbours who brought their share think the better of you
  const friends = [...new Set(o.lines.map(l => l.by).filter(Boolean))].slice(0, C.friends);
  for (const id of friends) if (s.neighbours?.[id]) s.neighbours[id].friendship = Math.min(10, (s.neighbours[id].friendship ?? 0) + 1);
  c.filled = (c.filled ?? 0) + 1; c.n++; c.order = null; c.nextAt = now + C.everyMs;
  s.stats.cooperativeOrders = c.filled;
  ctx.emit('cooperativeOrderDone', { n: o.n, coins: o.coins, xp: o.xp, friends });
}
/** A new order is posted when the last one is settled and the neighbours have had time to load their carts. */
export function tickCooperative(ctx) {
  const c = ctx.s.cooperative;
  if (c?.founded && !c.order && ctx.now >= (c.nextAt ?? 0)) post(ctx);
}

export const actions = {
  /** Found the co-operative: takes the founding gift from the barn, and the first order is posted at once. */
  foundCooperative(ctx) {
    const { s, now } = ctx, plan = foundingPlan(s);
    if (!plan.ok) return ctx.fail(plan.reason);
    barn.take(s, C.gift);
    s.cooperative = { founded: now, n: 0, filled: 0, nextAt: now, order: null };
    ctx.emit('cooperativeFounded', { members: members(s) });
    post(ctx);
    return { founded: now };
  },
  /** Send goods to the co-operative's order: { good, n } (n missing: all that is wanted and in the barn). */
  fillCooperative(ctx, { good, n } = {}) {
    const { s } = ctx, o = s.cooperative?.order;
    if (!isFounded(s)) return ctx.fail('The co-operative is not founded yet');
    if (!o) return ctx.fail('No order is posted just now');
    const line = o.lines.find(l => l.good === good);
    if (!line) return ctx.fail('The order does not ask for that');
    if (n != null && !(Number.isSafeInteger(n) && n > 0)) return ctx.fail('Unknown amount');
    const left = lineLeft(line); if (!left) return ctx.fail('That line is full');
    const send = Math.min(n ?? left, left, barn.free(s, good));
    if (send <= 0) return ctx.fail('Missing goods');
    barn.take(s, { [good]: send }); line.sent += send;
    ctx.emit('cooperativeSent', { good, n: send, left: lineLeft(line) });
    const done = o.lines.every(l => !lineLeft(l));
    if (done) settle(ctx);
    return { sent: send, done };
  },
};
