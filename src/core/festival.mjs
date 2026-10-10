// The Harvest Festival (chapter 9, docs/plan/ch09-the-village-sings-again.md). Once the festival stage stands on the
// square the player can hold a festival: a feast is laid from the barn (FESTIVAL_DAY.kinds different goods, `each` of
// each), the evening lasts lastsMs (the village gathers at the stage: view/festival-view.mjs), everyone grows a little
// fonder, and the hat that goes round pays more than the feast was worth. Then the village rests for everyMs.
// Not the school festival (content/quests.mjs FESTIVAL: a reward after twelve goals), which stays as it is.
//   s.festival = { at, until, n, over }   at/until: the evening running or last held; n: how many were held; over: n when its end was told
import { FESTIVAL_DAY } from '../content/economy.mjs';
import { GOODS } from '../content/goods.mjs';
import * as barn from './barn.mjs';
import { giftable, addHearts } from './bonds.mjs';
import { gainXp } from './levels.mjs';

export const stageBuilt = s => (s.counts.stage ?? 0) > 0;
const RANK = { product: 0, fruit: 1, produce: 2, crop: 3 };   // what a feast is laid from first: made food, then fruit, eggs and milk, then crops
/** The feast the barn can lay now: up to FESTIVAL_DAY.kinds goods with `each` to spare, the best first: [{ good, n }]. Fish and feed are not feast food. */
export function feastOf(s) {
  return Object.keys(s.barn.items).filter(g => GOODS[g] && RANK[GOODS[g].kind] != null && barn.free(s, g) >= FESTIVAL_DAY.each)
    .sort((a, b) => RANK[GOODS[a].kind] - RANK[GOODS[b].kind] || GOODS[b].value - GOODS[a].value || (a < b ? -1 : 1))
    .slice(0, FESTIVAL_DAY.kinds).map(good => ({ good, n: FESTIVAL_DAY.each }));
}
export const feastValue = feast => feast.reduce((sum, row) => sum + GOODS[row.good].value * row.n, 0);
/** What the hat brings in for a feast. */
export const festivalCoins = feast => Math.round(feastValue(feast) * FESTIVAL_DAY.pay) + FESTIVAL_DAY.coins;
/** Where the festival stands: { built, active, until, readyAt, feast, ok, reason, params, coins }. Pure. */
export function festivalOf(s, now) {
  const f = s.festival, built = stageBuilt(s), active = !!f && Number.isFinite(f.until) && now < f.until && now >= f.at;
  const readyAt = f && Number.isFinite(f.at) ? f.at + FESTIVAL_DAY.everyMs : 0, feast = feastOf(s);
  const why = !built ? ['Build the festival stage first'] : active ? ['The festival is on'] : now < readyAt ? ['The village is resting after the last festival']
    : feast.length < FESTIVAL_DAY.kinds ? ['The feast needs {kinds} different foods, {each} of each', { kinds: FESTIVAL_DAY.kinds, each: FESTIVAL_DAY.each }] : null;
  return { built, active, until: active ? f.until : 0, readyAt, feast, ok: !why, reason: why?.[0] ?? null, params: why?.[1] ?? null, coins: festivalCoins(feast), held: f?.n ?? 0 };
}
/** Called by tick(): the evening's end is told once, and counted (chapter 9 closes after the first festival is over). */
export function tickFestival(ctx) {
  const { s, now } = ctx, f = s.festival; if (!f || f.over === f.n || !(now >= f.until)) return;
  f.over = f.n; s.stats.harvestFestivals = (s.stats.harvestFestivals ?? 0) + 1;
  ctx.emit('harvestFestivalEnded', { n: f.n });
}
export const actions = {
  /** Lay the feast and start the evening. */
  holdFestival(ctx) {
    const { s, now } = ctx, st = festivalOf(s, now); if (!st.ok) return ctx.fail(st.reason, st.params);
    const coins = st.coins, guests = giftable(s, now);
    barn.take(s, Object.fromEntries(st.feast.map(row => [row.good, row.n])));
    s.festival = { at: now, until: now + FESTIVAL_DAY.lastsMs, n: (s.festival?.n ?? 0) + 1 };
    s.coins += coins; s.stats.coinsEarned += coins; gainXp(ctx, FESTIVAL_DAY.xp);
    for (const id of guests) addHearts(ctx, id, FESTIVAL_DAY.hearts, 'festival');
    ctx.emit('harvestFestivalStarted', { until: s.festival.until, coins, feast: st.feast, guests: guests.length, n: s.festival.n });
    ctx.emit('coins', { coins });
    return { coins, until: s.festival.until };
  },
};
