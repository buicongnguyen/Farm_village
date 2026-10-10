// The evening report (chapter 10, docs/plan/ch10-hands-to-help.md): what the farm earned today and from what, what the
// hired hands did, and one line of advice from Granny Maple. Read-only, except seeReport (once a day).
//   s.today.earnedBase   s.stats.coinsEarned when the day began (the day's total is the difference)
//   s.today.earned       { source: coins } as far as the day's events said where coins came from
//   s.today.hands        { role: tasks } done by hired hands today;  s.today.wages: coins paid to them
//   s.today.reportSeen   true once today's report was opened
import { HANDS, BEDS } from '../content/economy.mjs';
import * as barn from './barn.mjs';
import { isWorking } from './working.mjs';
import { handsOpen } from './helpers.mjs';

/** Where a result's coins came from, for the report: orders, rent, fishing, the festival, or sales (barn, trucks, stands). */
export function tallyEarned(s, events) {
  if (!events?.length) return;
  const add = (source, coins) => { if (coins > 0) { const e = (s.today.earned ??= {}); e[source] = (e[source] ?? 0) + coins; } };
  const festival = events.some(e => e.type === 'harvestFestivalStarted');
  for (const e of events) {
    if (e.type === 'orderFilled') add('orders', e.coins ?? 0);
    else if (e.type === 'cooperativeOrderDone') add('cooperative', e.coins ?? 0);
    else if (e.type === 'rent' || e.type === 'familyTip') add('rent', e.coins ?? 0);
    else if (e.type === 'coins') add(e.source === 'pond' ? 'fishing' : e.source === 'hotel' ? 'hotel' : e.source === 'train' ? 'train' : festival ? 'festival' : 'sales', e.coins ?? 0);
    else if (e.type === 'barnSold') add('sales', e.coins ?? 0);
    else if (e.type === 'handDid') { const h = (s.today.hands ??= {}); h[e.role] = (h[e.role] ?? 0) + e.count; s.today.wages = (s.today.wages ?? 0) + e.count * HANDS.wage; }
  }
}
export const SOURCES = ['orders', 'sales', 'rent', 'fishing', 'festival', 'cooperative', 'hotel', 'train'];
/** Granny Maple's one piece of advice, the first that fits: [id, panel to open]. */
export function adviceOf(s) {
  if (barn.used(s) >= s.barn.cap * 0.9) return ['barn', 'market'];
  const beds = Object.keys(s.placed).filter(id => s.placed[id].kind === 'bed');
  if (beds.filter(id => !s.beds[id]).length >= 3) return ['beds', null];
  if (Object.entries(s.production ?? {}).some(([id, q]) => s.placed[id] && isWorking(s, id) && q.queue.length === 0)) return ['trays', null];
  if (handsOpen(s) && Object.keys(HANDS.roles).some(role => !s.hands?.[role] && s.coins >= HANDS.roles[role].fee * 2)) return ['hire', 'friends'];
  if (beds.length < BEDS.allowance(s.level)) return ['grow', null];
  return ['praise', null];
}
/** Today so far: { total, rows: [[source, coins]], other, tasks, hands: [[role, n]], wages, best, advice, seen }. */
export function reportOf(s) {
  const total = Math.max(0, (s.stats.coinsEarned ?? 0) - (s.today.earnedBase ?? s.stats.coinsEarned ?? 0));
  const rows = SOURCES.map(k => [k, Math.min(total, s.today.earned?.[k] ?? 0)]).filter(([, n]) => n > 0), known = rows.reduce((a, [, n]) => a + n, 0);
  const hands = Object.entries(s.today.hands ?? {}).filter(([role, n]) => HANDS.roles[role] && n > 0), tasks = hands.reduce((a, [, n]) => a + n, 0);
  const best = rows.length ? rows.reduce((a, b) => b[1] > a[1] ? b : a)[0] : null;
  return { total, rows, other: Math.max(0, total - known), tasks, hands, wages: s.today.wages ?? 0, best, advice: adviceOf(s), seen: !!s.today.reportSeen };
}
export const actions = {
  /** Today's report was opened: counted once a day (the chapter 10 scene waits for the first). */
  seeReport(ctx) {
    const { s } = ctx; if (s.today.reportSeen) return { seen: true };
    s.today.reportSeen = true; s.stats.reports = (s.stats.reports ?? 0) + 1;
    return { seen: true };
  },
};
