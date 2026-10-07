// The market square and the delivery truck (PLAN-v0.3 P3): load spare goods, send the truck down the village street,
// and it comes back after a trip with the goods' value plus a market bonus. Needs a working market and a mended street.
import { TRUCK } from '../content/economy.mjs';
import { GOODS } from '../content/goods.mjs';
import * as barn from './barn.mjs';
import { workingCount, isWorking } from './working.mjs';

export const truckOf = s => (s.truck ??= { level: 1, away: false, backAt: 0, load: [], coins: 0 });
export const loadUnits = t => t.load.reduce((n, i) => n + i.n, 0);
export const loadValue = t => t.load.reduce((n, i) => n + (GOODS[i.good]?.value ?? 0) * i.n, 0);
export const capacity = t => TRUCK.capacity[Math.min(t.level, TRUCK.capacity.length) - 1];
/** Why the truck cannot run now (null when it can). */
export function blocked(s) {
  if (!(workingCount(s, 'market') > 0)) return 'Repair the market square first';
  if (!isWorking(s, 'road_south')) return 'Repair the village street first';
  return null;
}
export function tickTruck(ctx) {
  const { s, now } = ctx, t = s.truck; if (!t?.away) return;
  if (t.backAt > now) return;
  const coins = Math.round(loadValue(t) * TRUCK.pay);
  t.away = false; t.coins = (t.coins ?? 0) + coins; t.load = []; s.stats.trips = (s.stats.trips ?? 0) + 1;
  ctx.emit('truckBack', { coins });
}
export const actions = {
  /** Put goods on the truck: { good, n }. */
  loadTruck(ctx, { good, n = 1 }) {
    const { s } = ctx, t = truckOf(s), why = blocked(s); if (why) return ctx.fail(why);
    if (t.away) return ctx.fail('The truck is away');
    if (!GOODS[good]) return ctx.fail('Unknown good');
    n = Math.floor(Number(n)); if (!(n >= 1)) return ctx.fail('Missing goods');
    n = Math.min(n, capacity(t) - loadUnits(t)); if (n < 1) return ctx.fail('The truck is full');
    if (!barn.take(s, { [good]: n })) return ctx.fail('Missing goods');
    const row = t.load.find(i => i.good === good); if (row) row.n += n; else t.load.push({ good, n });
    ctx.emit('truckLoaded', { good, n });
    return { loaded: n };
  },
  sendTruck(ctx) {
    const { s, now } = ctx, t = truckOf(s), why = blocked(s); if (why) return ctx.fail(why);
    if (t.away) return ctx.fail('The truck is away');
    if (!t.load.length) return ctx.fail('Load the truck first');
    t.away = true; t.backAt = now + TRUCK.tripMs;
    ctx.emit('truckSent', { units: loadUnits(t) });
    return { backAt: t.backAt };
  },
  collectTruck(ctx) {
    const { s } = ctx, t = truckOf(s), coins = t.coins ?? 0; if (!coins) return ctx.fail('Nothing sold yet');
    s.coins += coins; s.stats.coinsEarned += coins; t.coins = 0;
    ctx.emit('coins', { coins });
    return { coins };
  },
  /** Sell goods from the barn at the base price, any time: { good, n } (n = all when omitted). */
  sellGood(ctx, { good, n }) {
    const { s } = ctx; if (!GOODS[good]) return ctx.fail('Unknown good');
    const have = barn.free(s, good); n = n == null ? have : Math.floor(Number(n)); if (!(n >= 1) || n > have) return ctx.fail('Missing goods');
    barn.take(s, { [good]: n }); const coins = n * GOODS[good].value; s.coins += coins; s.stats.coinsEarned += coins;
    ctx.emit('coins', { coins });
    return { coins };
  },
  upgradeTruck(ctx) {
    const { s } = ctx, t = truckOf(s), next = t.level + 1;
    if (next > TRUCK.capacity.length) return ctx.fail('Already the biggest truck');
    if (s.level < TRUCK.level[next - 1]) return ctx.fail('Not high enough level', { level: TRUCK.level[next - 1] });
    const cost = TRUCK.upgradeCost[next - 1]; if (s.coins < cost) return ctx.fail('Not enough coins');
    s.coins -= cost; t.level = next;
    ctx.emit('truckUpgraded', { level: next });
    return { level: next };
  },
};
