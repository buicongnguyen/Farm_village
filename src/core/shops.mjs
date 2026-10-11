import { SHOPS, SHOP_WAIT_MS, SHOP_SKIP_MS } from '../content/shops.mjs';
import { GOODS } from '../content/goods.mjs';
import { orderable } from './orders.mjs';
import { hash } from './rng.mjs';
import * as barn from './barn.mjs';
import { shopRow as rowOf } from './shops-state.mjs';
export { normalizeShops } from './shops-state.mjs';

const integer = n => Number.isSafeInteger(n) && n >= 0;
export const shopPrice = good => Math.ceil(GOODS[good].value * 1.35);
export function shopStatus(s, id, now) {
  const def = SHOPS[id]; if (!def) return null;
  const row = rowOf(s, id), raw = row.offer;
  const offer = raw && raw.id === `${id}:${row.serial}` && def.goods.includes(raw.good) && Object.hasOwn(GOODS, raw.good) && raw.n === def.n ? raw : null;
  return { ...def, id, offer, left: Math.max(0, row.nextAt - now), locked: s.level < def.level,
    coins: offer ? shopPrice(offer.good) * offer.n : 0,
    base: offer ? GOODS[offer.good].value * offer.n : 0,
    have: offer ? barn.free(s, offer.good) : 0,
    canSell: s.level >= def.level && !!offer && barn.free(s, offer.good) >= offer.n };
}
export function tickShops({ s, now, emit = () => {} }) {
  if (!Number.isSafeInteger(now) || now < 0 || s.level < 2) return;
  let sources;
  for (const [id, def] of Object.entries(SHOPS)) {
    const row = rowOf(s, id);
    if (s.level < def.level || row.offer || now < row.nextAt) continue;
    sources ??= new Set(orderable(s));
    const pool = def.goods.filter(g => Object.hasOwn(GOODS, g) && (sources.has(g) || barn.free(s, g) >= def.n));
    if (!pool.length) continue;
    const good = pool[hash(s.createdAt, id, row.serial) % pool.length];
    (s.shops ??= {})[id] = { ...row, offer: { id: `${id}:${row.serial}`, good, n: def.n } };
    emit('shopRequest', { shop: id }); // schedule the normal autosave even while the player is idle
  }
}
const validTime = now => Number.isSafeInteger(now) && now >= 0;
export const actions = {
  sellToShop(ctx, { shop, offer } = {}) {
    const { s, now } = ctx, st = shopStatus(s, shop, now);
    if (!st || !validTime(now)) return ctx.fail('Unknown shop');
    if (st.locked) return ctx.fail('Reach level {level} first', { level: st.level });
    if (!st.offer || st.offer.id !== offer) return ctx.fail('That shop request has changed');
    if (!barn.hasAll(s, { [st.offer.good]: st.offer.n })) return ctx.fail('Missing goods');
    const serial = rowOf(s, shop).serial;
    if (!integer(serial) || serial >= Number.MAX_SAFE_INTEGER) return ctx.fail('That shop request has changed');
    barn.take(s, { [st.offer.good]: st.offer.n });
    (s.shops ??= {})[shop] = { serial: serial + 1, nextAt: now + SHOP_WAIT_MS, waitMs: SHOP_WAIT_MS, offer: null };
    s.coins += st.coins; s.stats.coinsEarned += st.coins;
    ctx.emit('shopSold', { shop, good: st.offer.good, n: st.offer.n, coins: st.coins });
    ctx.emit('coins', { source: 'shop', coins: st.coins });
    return { coins: st.coins };
  },
  changeShopRequest(ctx, { shop, offer } = {}) {
    const { s, now } = ctx, st = shopStatus(s, shop, now), serial = rowOf(s, shop).serial;
    if (!st || !validTime(now)) return ctx.fail('Unknown shop');
    if (st.locked) return ctx.fail('Reach level {level} first', { level: st.level });
    if (!st.offer || st.offer.id !== offer || !integer(serial) || serial >= Number.MAX_SAFE_INTEGER) return ctx.fail('That shop request has changed');
    (s.shops ??= {})[shop] = { serial: serial + 1, nextAt: now + SHOP_SKIP_MS, waitMs: SHOP_SKIP_MS, offer: null };
    return {};
  },
};
