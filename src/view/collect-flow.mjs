// What really reached the barn in one result (art lane, visual only). A fruit pick can overflow into an automatic sale
// (`barnSold { coins }` in the same result), and `picked.count` says how much was picked, not how much was stored. When
// one kind of fruit was picked, the sold part is coins / price; with several kinds the split is unknown, so nothing is
// claimed (`exact: false`). Logic can make this exact by adding `stored` and `sold` to `picked` (docs/ASSET-REQUESTS.md).
import { GOODS } from '../content/goods.mjs';

/** { stored: Map good → count that went into the barn, picked: Map good → count picked, exact } for a result's events. */
export function pickedFlow(events) {
  const picked = new Map(); let soldCoins = 0, explicit = true;
  for (const e of events) {
    if (e.type === 'picked') {
      if (e.stored == null) explicit = false;
      picked.set(e.good, (picked.get(e.good) ?? 0) + (e.count ?? 0));
    } else if (e.type === 'barnSold') soldCoins += e.coins ?? 0;
  }
  if (!picked.size) return { stored: new Map(), picked, exact: true };
  if (explicit) {   // logic told us (picked.stored)
    const stored = new Map(); for (const e of events) if (e.type === 'picked') stored.set(e.good, (stored.get(e.good) ?? 0) + e.stored);
    return { stored, picked, exact: true };
  }
  if (!soldCoins) return { stored: new Map(picked), picked, exact: true };
  if (picked.size === 1) {
    const [[good, n]] = [...picked], sold = Math.min(n, Math.round(soldCoins / Math.max(1, GOODS[good]?.value ?? 1)));
    return { stored: new Map([[good, n - sold]]), picked, exact: true };
  }
  return { stored: new Map(), picked, exact: false };
}
