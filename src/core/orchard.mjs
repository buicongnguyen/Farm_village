// The fruit stand and Biscuit's home. All stock and takings change through act()/tick().
import { FRUIT_STAND } from '../content/economy.mjs';
import { FRUITS } from '../content/goods.mjs';
import { workingCount, isWorking } from './working.mjs';
import * as barn from './barn.mjs';
export const kennelOf = s => Object.entries(s.placed).find(([id, p]) => p.kind === 'kennel' && isWorking(s, id))?.[1] ?? null;
export const biscuitOnDuty = s => !!kennelOf(s);
export const standOpen = s => workingCount(s, 'fruit_stand') > 0;
export const fruitPrice = good => Math.round((FRUITS[good]?.value ?? 0) * FRUIT_STAND.bonus);
/** A saved stand may be partial or corrupt. Only real, bounded fruit stacks may reach the sales loop. */
export function normalizeFruitStand(value) {
  const st = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const items = Array.isArray(st.items) ? st.items.filter(item => item && typeof item === 'object'
    && Object.hasOwn(FRUITS, item.good) && Number.isSafeInteger(item.n) && item.n >= 1 && item.n <= FRUIT_STAND.stack)
    .slice(0, FRUIT_STAND.slots).map(({ good, n }) => ({ good, n })) : [];
  return { items, coins: Number.isSafeInteger(st.coins) && st.coins >= 0 ? st.coins : 0,
    nextSaleAt: Number.isSafeInteger(st.nextSaleAt) && st.nextSaleAt >= 0 ? st.nextSaleAt : 0 };
}
/** Settle sales while the stand still exists, then stop its clock before storage, undo or demolition. */
export function suspendFruitSales(ctx) { tickOrchard(ctx); ctx.s.fruitStand.nextSaleAt = 0; }
/** Opening a placed or repaired stand starts a fresh wait; absent time never becomes back pay. */
export function resumeFruitSales({ s, now }) {
  const st = s.fruitStand = normalizeFruitStand(s.fruitStand);
  st.nextSaleAt = standOpen(s) && st.items.length ? now + FRUIT_STAND.everyMs : 0;
}
export function tickOrchard(ctx) {
  const { s, now } = ctx, st = s.fruitStand = normalizeFruitStand(s.fruitStand);
  if (!standOpen(s) || !st.items.length) { st.nextSaleAt = 0; return; }
  if (!st.nextSaleAt) st.nextSaleAt = now + FRUIT_STAND.everyMs;
  let sold = 0, coins = 0;
  while (st.items.length && st.nextSaleAt <= now) {
    const item = st.items[0]; item.n--; sold++; coins += fruitPrice(item.good);
    if (!item.n) st.items.shift();
    st.nextSaleAt += FRUIT_STAND.everyMs;
  }
  if (sold) { st.coins += coins; s.stats.fruitSold += sold; ctx.emit('fruitSold', { sold, coins }); }
  if (!st.items.length) st.nextSaleAt = 0;
}
export const actions = {
  fruitList(ctx, { good, n = 1 }) {
    const { s, now } = ctx, st = normalizeFruitStand(s.fruitStand);
    if (!standOpen(s)) return ctx.fail('Build a fruit stand first');
    if (!Object.hasOwn(FRUITS, good)) return ctx.fail('Only fruit goes on this stand');
    if (!Number.isSafeInteger(n) || n < 1 || n > FRUIT_STAND.stack) return ctx.fail('Choose a whole stack of up to ten fruit');
    if (st.items.length >= FRUIT_STAND.slots) return ctx.fail('The fruit stand is full');
    if (!barn.take(s, { [good]: n })) return ctx.fail('Missing goods');
    s.fruitStand = st; st.items.push({ good, n });
    if (!st.nextSaleAt) st.nextSaleAt = now + FRUIT_STAND.everyMs;
    ctx.emit('fruitListed', { good, n }); return { listed: n };
  },
  fruitCollect(ctx) {
    const { s } = ctx, st = normalizeFruitStand(s.fruitStand), coins = st.coins;
    if (!coins) return ctx.fail('Nothing sold yet');
    s.coins += coins; s.stats.coinsEarned += coins; s.fruitStand = { ...st, coins: 0 };
    ctx.emit('coins', { coins }); return { coins };
  },
};
