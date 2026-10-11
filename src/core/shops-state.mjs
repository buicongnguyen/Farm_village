import { SHOPS } from '../content/shops.mjs';
import { GOODS } from '../content/goods.mjs';
const integer = n => Number.isSafeInteger(n) && n >= 0;
export const shopRow = (s, id) => s.shops?.[id] ?? { serial: 0, nextAt: 0, waitMs: 0, offer: null };
export function normalizeShops(s) {
  return Object.fromEntries(Object.entries(SHOPS).map(([id, def]) => {
    const row = shopRow(s, id), serial = integer(row.serial) ? row.serial : 0, o = row.offer;
    const valid = o && o.id === `${id}:${serial}` && def.goods.includes(o.good) && Object.hasOwn(GOODS, o.good) && o.n === def.n;
    return [id, { serial, nextAt: integer(row.nextAt) ? row.nextAt : 0, waitMs: [0, 300_000, 900_000].includes(row.waitMs) ? row.waitMs : 900_000,
      offer: valid ? { id: o.id, good: o.good, n: def.n } : null }];
  }));
}
