// The evening train (chapter 15, docs/plan/ch15-the-evening-train.md). Once the railway halt stands on the quay, a
// train stops at it every now and then with three wagons to fill from the barn before it leaves: the biggest single
// sale in the game. A full wagon pays well, a part-loaded one pays for what is in it, three full ones add a bonus; a
// train that leaves empty costs nothing. Trains that came while the game was shut left empty.
//   s.train = { nextAt, n, here: null | { n, at, until, wagons: [{ good, need, have }] } }
import { TRAIN as T } from '../content/economy.mjs';
import { GOODS } from '../content/goods.mjs';
import { orderable } from './orders.mjs';
import { gainXp } from './levels.mjs';
import { rng, hash } from './rng.mjs';
import * as barn from './barn.mjs';

export const haltBuilt = s => (s.counts?.halt ?? 0) > 0;
/** How many of a good a wagon holds: about T.wagon(level) coins' worth, in round numbers. */
const wagonNeed = (s, good) => { const n = Math.min(T.max, Math.max(T.min, Math.round(T.wagon(s.level) / GOODS[good].value))); return n > 20 ? Math.round(n / 5) * 5 : n; };
/** The wagons of train number n for this farm, from what it can grow and make today (seeded). */
export function makeWagons(s, n) {
  const r = rng(hash(s.createdAt, 'train', n)), pool = orderable(s).filter(g => !['feed', 'fish'].includes(GOODS[g].kind)).sort();
  for (const g of ['wheat', 'carrot', 'corn']) if (pool.length < T.wagons && !pool.includes(g)) pool.push(g);
  const out = [];
  while (out.length < T.wagons && pool.length) { const good = pool.splice(r.int(pool.length), 1)[0]; out.push({ good, need: wagonNeed(s, good), have: 0 }); }
  return out;
}
export const wagonFull = w => w.have >= w.need;
/** What a wagon pays when the train leaves: full, its goods at T.pay; part-loaded, what is in it at barn value. */
export const wagonPays = w => wagonFull(w) ? Math.round(w.need * GOODS[w.good].value * T.pay) : w.have * GOODS[w.good].value;
/** What the train at the halt would pay if it left now: { coins, full, all }. */
export function trainPays(here) {
  const full = here.wagons.filter(wagonFull).length, all = full === here.wagons.length;
  return { coins: here.wagons.reduce((sum, w) => sum + wagonPays(w), 0) + (all ? T.bonus : 0), full, all };
}
/** For the panel and the views: { built, here, wagons, leavesAt, nextAt, pays, sent }. */
export function trainOf(s, now) {
  const tr = s.train, here = tr?.here && tr.here.until > now ? tr.here : null;
  return { built: haltBuilt(s), here: !!here, n: here?.n ?? tr?.n ?? 0, wagons: here?.wagons ?? [], at: here?.at ?? null, leavesAt: here?.until ?? null,
    nextAt: here ? here.at + T.everyMs : tr?.nextAt ?? null, pays: here ? trainPays(here) : null, sent: s.stats?.trains ?? 0 };
}

function arrive(ctx, tr) {
  const { s } = ctx;
  tr.here = { n: tr.n, at: tr.nextAt, until: tr.nextAt + T.stopMs, wagons: makeWagons(s, tr.n) };
  ctx.emit('trainArrived', { n: tr.n, until: tr.here.until, goods: tr.here.wagons.map(w => w.good), first: tr.n === 0 });
}
function depart(ctx, tr) {
  const { s, now } = ctx, h = tr.here, { coins, full, all } = trainPays(h);
  if (coins > 0) { s.coins += coins; s.stats.coinsEarned += coins; gainXp(ctx, Math.max(1, Math.round(coins * T.xp / T.pay))); ctx.emit('coins', { coins, source: 'train' }); }
  if (full >= 1) s.stats.trains = (s.stats.trains ?? 0) + 1;
  if (all && !s.firsts?.fullTrain) (s.firsts ??= {}).fullTrain = now;
  tr.here = null; tr.n = h.n + 1; tr.nextAt = h.at + T.everyMs;
  ctx.emit('trainLeft', { n: h.n, coins, full, all, bonus: all ? T.bonus : 0 });
}
/** Called by tick(): the train arrives, waits and leaves by its timetable. */
export function tickTrain(ctx) {
  const { s, now } = ctx; if (!haltBuilt(s)) return;
  const tr = (s.train ??= { nextAt: now + T.firstMs, n: 0, here: null });   // the first train comes soon after the halt opens
  for (let guard = 0; guard < 8; guard++) {
    if (tr.here) { if (tr.here.until > now) return; depart(ctx, tr); continue; }
    if (tr.nextAt > now) return;
    if (tr.nextAt + T.stopMs <= now) {   // it came and went while the game was shut: it left empty, and so did any after it
      const missed = Math.floor((now - tr.nextAt - T.stopMs) / T.everyMs) + 1;
      tr.nextAt += missed * T.everyMs; tr.n += missed; continue;
    }
    arrive(ctx, tr);
  }
}

export const actions = {
  /** Load goods from the barn into a wagon of the train at the halt: { wagon, n } (n missing: all it still takes). */
  loadWagon(ctx, { wagon, n } = {}) {
    const { s, now } = ctx, here = s.train?.here;
    if (!haltBuilt(s)) return ctx.fail('Build the railway halt first');
    if (!here || here.until <= now) return ctx.fail('No train is at the halt');
    const w = Number.isSafeInteger(wagon) ? here.wagons[wagon] : null;
    if (!w) return ctx.fail('The train has no such wagon');
    if (n != null && !(Number.isSafeInteger(n) && n > 0)) return ctx.fail('Unknown amount');
    const left = w.need - w.have; if (left <= 0) return ctx.fail('That wagon is full');
    const load = Math.min(n ?? left, left, barn.free(s, w.good));
    if (load <= 0) return ctx.fail('Missing goods');
    barn.take(s, { [w.good]: load }); w.have += load;
    ctx.emit('wagonLoaded', { wagon, good: w.good, n: load, full: wagonFull(w) });
    return { loaded: load, full: wagonFull(w) };
  },
};
