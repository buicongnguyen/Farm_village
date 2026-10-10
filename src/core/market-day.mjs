// Market day (chapter 6, docs/plan/ch06-market-day.md). Every MARKET_DAY.everyMs the market square holds a market day
// for lastsMs: one good, the good of the day, pays double, sold from the barn or sent on a truck that leaves while the
// day runs. The timetable is a pure function of the clock (the farm's start time plus `s.marketDay.shift`), so a reload
// shows the same day and nothing is lost while the game is closed. The good is fixed when its day begins.
//   s.marketDay = { shift, n, good, next, sold, over }   n: the day last seen; next: the good promised for day n + 1 (so the
//   player can get ready for it); sold: the day that already counted; over: the day whose end was told
import { MARKET_DAY } from '../content/economy.mjs';
import { GOODS } from '../content/goods.mjs';
import { workingCount } from './working.mjs';
import { orderable } from './orders.mjs';
import { rng, hash } from './rng.mjs';

/** The square holds market days once the farm is big enough and the square works. */
export const marketOpen = s => s.level >= MARKET_DAY.level && workingCount(s, 'market') > 0;
/** What the square could ask for: goods this farm can make now (as the order board judges it), the better ones when there are any. */
export function marketGoods(s) {
  const all = orderable(s).filter(g => GOODS[g].kind !== 'fish').sort(), fine = all.filter(g => GOODS[g].value >= MARKET_DAY.minValue);
  return fine.length ? fine : all;
}
/** The seeded pick for day n; `not`: yesterday's good, passed over when the farm makes anything else. */
const pickGood = (s, n, not = null) => { let list = marketGoods(s); if (list.length > 1) list = list.filter(g => g !== not); return list.length ? rng(hash(s.seed, 'market', n)).pick(list) : null; };
/** Where the timetable stands: { open, active, n, good, bonus, endsAt, nextAt, nextGood }. `good` is null on a farm that
 *  makes nothing yet; `nextGood` is what the next market day will ask for, once this one has been seen. */
export function marketDayOf(s, now) {
  if (!marketOpen(s)) return { open: false, active: false, n: -1, good: null, bonus: 1, endsAt: 0, nextAt: 0, nextGood: null };
  const { everyMs, lastsMs } = MARKET_DAY, t = Math.max(0, now - s.createdAt + (s.marketDay?.shift ?? 0));
  const n = Math.floor(t / everyMs), start = now - (t - n * everyMs);
  // today's good: the one stamped when the day began; else the one promised yesterday, if the farm can still make it
  const m = s.marketDay, promised = m?.n === n - 1 && m.next && marketGoods(s).includes(m.next) ? m.next : null;
  const good = m?.n === n ? m.good : promised ?? pickGood(s, n, m?.n === n - 1 ? m.good : null);
  const active = !!good && t - n * everyMs < lastsMs;
  return { open: true, active, n, good, bonus: active ? MARKET_DAY.bonus : 1, endsAt: start + lastsMs, nextAt: start + everyMs, nextGood: m?.n === n ? m.next ?? null : null };
}
/** How many times its price a good pays now: MARKET_DAY.bonus for the good of the day while the day runs, else 1. */
export const marketBonus = (s, good, now) => { const d = marketDayOf(s, now); return d.active && d.good === good ? d.bonus : 1; };
/** The player sold the good of the day: the day counts once (chapter 6 asks for one). Returns true the first time in a day. */
export function countMarketDay(ctx) {
  const { s, now } = ctx, d = marketDayOf(s, now); if (!d.active) return false;
  const m = (s.marketDay ??= { shift: 0 }); if (m.sold === d.n) return false;
  m.sold = d.n; s.stats.marketDays = (s.stats.marketDays ?? 0) + 1;
  return true;
}
/** Called by tick(): a new market day is announced once, with its good; its end is told once too. */
export function tickMarketDay(ctx) {
  const { s, now } = ctx; if (!marketOpen(s)) return;
  // the first market day begins the moment the square can hold one, so nobody waits for it
  if (!s.marketDay) { const t = Math.max(0, now - s.createdAt); s.marketDay = { shift: Math.ceil(t / MARKET_DAY.everyMs) * MARKET_DAY.everyMs - t }; }
  const m = s.marketDay, d = marketDayOf(s, now);
  if (m.n != null && m.over !== m.n && (!d.active || d.n !== m.n)) { m.over = m.n; ctx.emit('marketDayEnded', { good: m.good }); }
  if (d.active && m.n !== d.n) {
    m.n = d.n; m.good = d.good; m.next = pickGood(s, d.n + 1, d.good) ?? undefined; (s.firsts ??= {}).marketDay ??= now;
    ctx.emit('marketDayStarted', { good: d.good, endsAt: d.endsAt, n: d.n });
  }
}
/** What a truck's load is worth with the good of the day counted at its bonus (`market`: what was stamped when it left). */
export const marketExtra = (load, market) => !market ? 0 : load.reduce((sum, row) => sum + (row.good === market.good ? (GOODS[row.good]?.value ?? 0) * row.n * (market.bonus - 1) : 0), 0);
