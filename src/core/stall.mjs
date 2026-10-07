// The roadside stall (DESIGN 8): list spare goods at base price; passing villagers buy one every few minutes.
import { STALL } from '../content/economy.mjs';
import { GOODS } from '../content/goods.mjs';
import * as barn from './barn.mjs';
import { rng, hash } from './rng.mjs';

export const STACK = 10;
export function tickStall(ctx) {
  const { s, now } = ctx, st = s.stall;
  st.items = st.items.filter(item => item.n >= 1);   // a broken stack (an old save) never sells forever
  if (!(s.counts.stall > 0) || !st.items.length) { st.nextSaleAt = 0; return; }
  if (!st.nextSaleAt) st.nextSaleAt = now + STALL.sellEveryMs[0];
  let sold = 0, coins = 0;
  while (st.items.length && st.nextSaleAt <= now) {
    const item = st.items[0]; item.n--; coins += GOODS[item.good].value; sold++;
    if (item.n <= 0) st.items.shift();
    const [a, b] = STALL.sellEveryMs, r = rng(hash(st.nextSaleAt));
    st.nextSaleAt += a + Math.floor(r() * (b - a));
  }
  if (sold) { st.coins = (st.coins ?? 0) + coins; ctx.emit('stallSold', { sold, coins }); }
  if (!st.items.length) st.nextSaleAt = 0;
}
export const actions = {
  /** Put goods on the stall: { good, n }. */
  stallList(ctx, { good, n = 1 }) {
    const { s } = ctx; if (!(s.counts.stall > 0)) return ctx.fail('Build a roadside stall first');
    if (!GOODS[good]) return ctx.fail('Unknown good');
    if (s.stall.items.length >= STALL.slots) return ctx.fail('The stall is full');
    n = Math.floor(Number(n)); if (!(n >= 1)) return ctx.fail('Missing goods');
    n = Math.min(n, STACK); if (!barn.take(s, { [good]: n })) return ctx.fail('Missing goods');
    s.stall.items.push({ good, n });
    ctx.emit('stallListed', { good, n });
    return { listed: n };
  },
  stallCollect(ctx) {
    const { s } = ctx, coins = s.stall.coins ?? 0; if (!coins) return ctx.fail('Nothing sold yet');
    s.coins += coins; s.stats.coinsEarned += coins; s.stall.coins = 0;
    ctx.emit('coins', { coins });
    return { coins };
  },
};
