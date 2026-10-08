// The market square and the delivery trucks (PLAN-v0.3 P3): load spare goods, send a truck down the village street,
// and it comes back after a trip with the goods' value plus a market bonus. Needs a working market and a mended street.
// A growing farm can buy more trucks (TRUCK.fleet): the first truck is `s.truck` itself (so older saves keep it), the
// others live in `s.truck.fleet`. Every truck shares the truck size (`s.truck.level`, upgradeTruck) and the takings are
// collected together. Without a `truck` index, loading picks the first truck at the market with room, filling loads
// every idle truck, and sending sends every loaded one, so a one-truck farm plays exactly as before.
import { TRUCK } from '../content/economy.mjs';
import { GOODS, CROPS } from '../content/goods.mjs';
import * as barn from './barn.mjs';
import { workingCount, isWorking } from './working.mjs';

export const truckOf = s => { const t = (s.truck ??= { level: 1, away: false, backAt: 0, load: [], coins: 0, fleet: [] }); t.fleet ??= []; return t; };
/** Every truck, the first one (`s.truck`) included. */
export const trucksOf = s => { const t = truckOf(s); return [t, ...t.fleet]; };
export const loadUnits = t => t.load.reduce((n, i) => n + i.n, 0);
export const loadValue = t => t.load.reduce((n, i) => n + (GOODS[i.good]?.value ?? 0) * i.n, 0);
/** Goods per trip; every truck has the size of the first one (`t` may be any truck record holding `level`). */
export const capacity = t => TRUCK.capacity[Math.min(t.level ?? 1, TRUCK.capacity.length) - 1];
export const roomIn = (s, u) => Math.max(0, capacity(truckOf(s)) - loadUnits(u));
/** All takings waiting in the trucks. */
export const truckCoins = s => trucksOf(s).reduce((n, u) => n + (u.coins ?? 0), 0);
/** The next truck to buy: { n (the count it makes), cost, level }, or null at the fleet's limit. */
export function nextTruck(s) {
  const n = trucksOf(s).length + 1; if (n > TRUCK.fleet.max) return null;
  return { n, cost: TRUCK.fleet.cost[n - 1], level: TRUCK.fleet.level[n - 1] };
}
/** Why the trucks cannot run now (null when they can). */
export function blocked(s) {
  if (!(workingCount(s, 'market') > 0)) return 'Repair the market square first';
  if (!isWorking(s, 'road_south')) return 'Repair the village street first';
  return null;
}
/** How much of a good "Fill" leaves in the barn: what the open orders ask for, never any feed (the animals eat it),
 *  and one seed per bed for crops that cost money to plant. */
export function keepFor(s, good) {
  if (GOODS[good]?.kind === 'feed') return Infinity;
  let keep = 0;
  for (const c of s.orders?.cards ?? []) keep += c.need?.[good] ?? 0;
  if (CROPS[good] && !CROPS[good].free) keep += Object.values(s.placed).filter(p => p.kind === 'bed').length;
  return keep;
}
/** Goods "Fill" may load, most plentiful first: [[good, n], ...]. */
export function spareForTrucks(s) {
  return Object.keys(s.barn.items).filter(g => GOODS[g])
    .map(g => [g, Math.max(0, barn.free(s, g) - keepFor(s, g))]).filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1] || (GOODS[b[0]].value - GOODS[a[0]].value) || (a[0] < b[0] ? -1 : 1));
}
// `truck` arguments: a whole number naming one truck (0 = the first), or undefined for "any truck that fits".
const pick = (s, truck) => truck == null ? null : Number.isInteger(truck) && truck >= 0 ? trucksOf(s)[truck] ?? false : false;
const put = (u, good, n) => { const row = u.load.find(i => i.good === good); if (row) row.n += n; else u.load.push({ good, n }); };

export function tickTruck(ctx) {
  const { s, now } = ctx; if (!s.truck) return;
  trucksOf(s).forEach((u, i) => {
    if (!u.away || u.backAt > now) return;
    const coins = Math.round(loadValue(u) * TRUCK.pay);
    u.away = false; u.coins = (u.coins ?? 0) + coins; u.load = []; s.stats.trips = (s.stats.trips ?? 0) + 1;
    ctx.emit('truckBack', { coins, truck: i });
  });
}
export const actions = {
  /** Put goods on a truck: { good, n, truck? }. Without `truck`, the first truck at the market with room. */
  loadTruck(ctx, { good, n = 1, truck } = {}) {
    const { s } = ctx, why = blocked(s); if (why) return ctx.fail(why);
    const all = trucksOf(s), chosen = pick(s, truck); if (chosen === false) return ctx.fail('Unknown truck');
    if (!GOODS[good]) return ctx.fail('Unknown good');
    n = Math.floor(Number(n)); if (!(n >= 1)) return ctx.fail('Missing goods');
    const home = (chosen ? [chosen] : all).filter(u => !u.away);
    if (!home.length) return ctx.fail(all.length > 1 && !chosen ? 'All the trucks are away' : 'The truck is away');
    const u = home.find(x => roomIn(s, x) > 0); if (!u) return ctx.fail(home.length > 1 ? 'The trucks are full' : 'The truck is full');
    n = Math.min(n, roomIn(s, u));
    if (!barn.take(s, { [good]: n })) return ctx.fail('Missing goods');
    put(u, good, n);
    const i = all.indexOf(u);
    ctx.emit('truckLoaded', { good, n, truck: i });
    return { loaded: n, truck: i };
  },
  /** Fill trucks at the market with spare goods (spareForTrucks), most plentiful first: { truck? } (all idle trucks). */
  fillTruck(ctx, { truck } = {}) {
    const { s } = ctx, why = blocked(s); if (why) return ctx.fail(why);
    const all = trucksOf(s), chosen = pick(s, truck); if (chosen === false) return ctx.fail('Unknown truck');
    const home = (chosen ? [chosen] : all).filter(u => !u.away);
    if (!home.length) return ctx.fail(all.length > 1 && !chosen ? 'All the trucks are away' : 'The truck is away');
    if (home.every(u => roomIn(s, u) < 1)) return ctx.fail(home.length > 1 ? 'The trucks are full' : 'The truck is full');
    const spare = spareForTrucks(s); if (!spare.length) return ctx.fail('Nothing spare to load');
    let loaded = 0;
    for (const u of home) {
      for (const row of spare) {
        const n = Math.min(row[1], roomIn(s, u)); if (n < 1) continue;
        barn.take(s, { [row[0]]: n }); put(u, row[0], n); row[1] -= n; loaded += n;
        ctx.emit('truckLoaded', { good: row[0], n, truck: all.indexOf(u) });
      }
    }
    return { loaded };
  },
  /** Send a truck on its trip: { truck? } (every loaded truck at the market). */
  sendTruck(ctx, { truck } = {}) {
    const { s, now } = ctx, why = blocked(s); if (why) return ctx.fail(why);
    const all = trucksOf(s), chosen = pick(s, truck); if (chosen === false) return ctx.fail('Unknown truck');
    if (chosen?.away) return ctx.fail('The truck is away');
    const go = (chosen ? [chosen] : all).filter(u => !u.away && u.load.length);
    if (!go.length) return ctx.fail(all.every(u => u.away) ? (all.length > 1 ? 'All the trucks are away' : 'The truck is away') : 'Load the truck first');
    for (const u of go) {
      u.away = true; u.backAt = now + TRUCK.tripMs;
      ctx.emit('truckSent', { units: loadUnits(u), truck: all.indexOf(u) });
    }
    return { backAt: now + TRUCK.tripMs, sent: go.length };
  },
  /** Collect every truck's takings at once. */
  collectTruck(ctx) {
    const { s } = ctx, coins = truckCoins(s); if (!coins) return ctx.fail('Nothing sold yet');
    for (const u of trucksOf(s)) u.coins = 0;
    s.coins += coins; s.stats.coinsEarned += coins;
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
  /** Make every truck bigger (TRUCK.capacity). */
  upgradeTruck(ctx) {
    const { s } = ctx, t = truckOf(s), next = t.level + 1;
    if (next > TRUCK.capacity.length) return ctx.fail('Already the biggest truck');
    if (s.level < TRUCK.level[next - 1]) return ctx.fail('Not high enough level', { level: TRUCK.level[next - 1] });
    const cost = TRUCK.upgradeCost[next - 1]; if (s.coins < cost) return ctx.fail('Not enough coins');
    s.coins -= cost; t.level = next;
    ctx.emit('truckUpgraded', { level: next });
    return { level: next };
  },
  /** Buy one more truck (TRUCK.fleet): it parks at the market, the size of the others. */
  buyTruck(ctx) {
    const { s } = ctx, why = blocked(s); if (why) return ctx.fail(why);
    const next = nextTruck(s); if (!next) return ctx.fail('No room for another truck');
    if (s.level < next.level) return ctx.fail('Not high enough level', { level: next.level });
    if (s.coins < next.cost) return ctx.fail('Not enough coins');
    s.coins -= next.cost; truckOf(s).fleet.push({ away: false, backAt: 0, load: [], coins: 0 });
    ctx.emit('truckBought', { trucks: next.n });
    return { trucks: next.n };
  },
};
