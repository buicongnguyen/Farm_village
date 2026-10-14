// The cargo ship (2026-10-14): once the quay is paved and the farm has reached PORT.level, a ship calls at the quay now
// and then with four holds to fill from the barn before it sails: made goods only, in bulk, for twice their price, and
// a bonus when every hold is full. It is the evening train's bigger cousin (core/train.mjs), with the same kind rules:
// a part-loaded hold pays for what is in it, a ship that sails empty costs nothing, and ships that called while the
// game was shut sailed empty.
//   s.port = { nextAt, n, here: null | { n, at, until, holds: [{ good, need, have }] } }
// Loaded with import() once the quay is paved (main.mjs): installPort() adds its action and its tick.
import { GOODS } from '../content/goods.mjs';
import { paced } from '../content/economy.mjs';
import { ACTIONS, LATE_TICKS } from './act.mjs';
import { orderable } from './orders.mjs';
import { gainXp } from './levels.mjs';
import { rng, hash } from './rng.mjs';
import * as barn from './barn.mjs';

const MIN = 60_000;
export const PORT = { level: 14, everyMs: paced(40 * MIN), stopMs: paced(10 * MIN), firstMs: paced(2 * MIN), holds: 4, hold: level => 500 + 60 * level, min: 4, max: 120, pay: 2, bonus: 1500, xp: 0.3 };
export const portOpen = s => !!s.firsts?.quay && (s.level ?? 1) >= PORT.level;
const holdNeed = (s, good) => { const n = Math.min(PORT.max, Math.max(PORT.min, Math.round(PORT.hold(s.level) / GOODS[good].value))); return n > 20 ? Math.round(n / 5) * 5 : n; };
/** The holds of ship number n for this farm: made goods it can make today (seeded), and fruit or crops if there are too few. */
export function makeHolds(s, n) {
  const r = rng(hash(s.createdAt, 'ship', n)), all = orderable(s).filter(g => !['feed', 'fish'].includes(GOODS[g].kind)).sort();
  const made = all.filter(g => GOODS[g].kind === 'product'), pool = made.length >= PORT.holds ? made : [...made, ...all.filter(g => !made.includes(g))];
  // A small farm can get repeated holds; never invent a locked crop to fill the manifest.
  if (!pool.length) pool.push('wheat'); // free starter beds and seed always let an empty farm restart
  const repeat = [...pool];
  while (pool.length < PORT.holds) pool.push(repeat[pool.length % repeat.length]);
  const out = [];
  while (out.length < PORT.holds && pool.length) { const good = pool.splice(r.int(pool.length), 1)[0]; out.push({ good, need: holdNeed(s, good), have: 0 }); }
  return out;
}
export const holdFull = h => h.have >= h.need;
/** What a hold pays when the ship sails: full, its goods at PORT.pay; part-loaded, what is in it at barn value. */
export const holdPays = h => holdFull(h) ? Math.round(h.need * GOODS[h.good].value * PORT.pay) : h.have * GOODS[h.good].value;
export function shipPays(here) {
  const full = here.holds.filter(holdFull).length, all = here.holds.length === PORT.holds && full === PORT.holds;
  return { coins: here.holds.reduce((sum, h) => sum + holdPays(h), 0) + (all ? PORT.bonus : 0), full, all };
}
const natural = n => Number.isSafeInteger(n) && n >= 0;
const validHold = h => h && Object.hasOwn(GOODS, h.good) && natural(h.need) && h.need >= PORT.min && h.need <= PORT.max && natural(h.have) && h.have <= h.need;
const validHere = h => h && natural(h.n) && natural(h.at) && natural(h.until) && h.until > h.at && h.until - h.at <= PORT.stopMs && Array.isArray(h.holds) && h.holds.length <= PORT.holds && h.holds.every(validHold);
/** Repair only the optional timetable. Valid loaded cargo survives a damaged neighbouring hold. No reward on load. */
export function normalizePort(raw, now) {
  if (raw && natural(raw.n) && natural(raw.nextAt) && (raw.here === null || validHere(raw.here))) return raw;
  const h = raw?.here, here = h && natural(h.n) && natural(h.at) && Array.isArray(h.holds)
    ? { n: h.n, at: h.at, until: natural(h.until) && h.until > h.at ? Math.min(h.until, h.at + PORT.stopMs) : h.at + PORT.stopMs,
      holds: h.holds.filter(validHold).slice(0, PORT.holds).map(row => ({ ...row })) } : null;
  return { n: natural(raw?.n) ? raw.n : 0, nextAt: natural(raw?.nextAt) ? raw.nextAt : now + PORT.firstMs, here };
}
/** For the panel and the views: { open, here, holds, leavesAt, nextAt, pays, sent }. */
export function portOf(s, now) {
  const p = s.port, here = validHere(p?.here) && p.here.until > now ? p.here : null;
  return { open: portOpen(s), here: !!here, holds: here?.holds ?? [], leavesAt: here?.until ?? null, nextAt: here ? here.at + PORT.everyMs : p?.nextAt ?? null, pays: here ? shipPays(here) : null, sent: s.stats?.ships ?? 0 };
}
function arrive(ctx, p) {
  p.here = { n: p.n, at: p.nextAt, until: p.nextAt + PORT.stopMs, holds: makeHolds(ctx.s, p.n) };
  ctx.emit('shipArrived', { n: p.n, until: p.here.until, goods: p.here.holds.map(h => h.good), first: p.n === 0 });
}
function depart(ctx, p) {
  const { s } = ctx, h = p.here, { coins, full, all } = shipPays(h);
  if (coins > 0) { s.coins += coins; s.stats.coinsEarned += coins; gainXp(ctx, Math.max(1, Math.round(coins * PORT.xp / PORT.pay))); ctx.emit('coins', { coins, source: 'ship' }); }
  if (full >= 1) s.stats.ships = (s.stats.ships ?? 0) + 1;
  p.here = null; p.n = h.n + 1; p.nextAt = h.at + PORT.everyMs;
  ctx.emit('shipLeft', { n: h.n, coins, full, all, bonus: all ? PORT.bonus : 0 });
}
/** Called by tick(): the ship calls, waits and sails by its timetable. */
export function tickPort(ctx) {
  const { s, now } = ctx; if (!portOpen(s)) return;
  const p = (s.port = normalizePort(s.port, now));
  if (now < s.lastSeen) {
    p.nextAt = Math.min(p.nextAt, now + (p.n === 0 && !p.here ? PORT.firstMs : PORT.everyMs));
    if (p.here) { p.here.at = Math.min(p.here.at, now); p.here.until = Math.min(p.here.until, now + PORT.stopMs); }
  }
  for (let guard = 0; guard < 8; guard++) {
    if (p.here) { if (p.here.until > now) return; depart(ctx, p); continue; }
    if (p.nextAt > now) return;
    if (p.nextAt + PORT.stopMs <= now) { const missed = Math.floor((now - p.nextAt - PORT.stopMs) / PORT.everyMs) + 1; p.nextAt += missed * PORT.everyMs; p.n += missed; continue; }   // it called while the game was shut
    arrive(ctx, p);
  }
}
export const actions = {
  /** Load goods from the barn into a hold of the ship at the quay: { hold, n } (n missing: all it still takes). */
  loadHold(ctx, { hold, n } = {}) {
    const { s, now } = ctx, here = s.port?.here;
    if (!portOpen(s)) return ctx.fail('No ship calls here yet');
    if (!validHere(here) || here.at > now || here.until <= now) return ctx.fail('No ship is at the quay');
    const h = Number.isSafeInteger(hold) ? here.holds[hold] : null; if (!h) return ctx.fail('The ship has no such hold');
    if (n != null && !(Number.isSafeInteger(n) && n > 0)) return ctx.fail('Unknown amount');
    const left = h.need - h.have; if (left <= 0) return ctx.fail('That hold is full');
    const load = Math.min(n ?? left, left, barn.free(s, h.good)); if (load <= 0) return ctx.fail('Missing goods');
    if (!barn.take(s, { [h.good]: load })) return ctx.fail('Missing goods');
    h.have += load;
    ctx.emit('holdLoaded', { hold, good: h.good, n: load, full: holdFull(h) });
    return { loaded: load, full: holdFull(h) };
  },
};
/** Add the port to the rules (once): its action and its tick. */
export function installPort() { Object.assign(ACTIONS, actions); if (!LATE_TICKS.includes(tickPort)) LATE_TICKS.push(tickPort); }
