// Fruit trees (goods.mjs FRUITS): planted once with build mode, they fruit after a while and then again every few hours.
// s.trees[id] = { doneAt }: the fruit is ripe from doneAt. Picking puts the fruit in the barn and starts the next crop.
import { FRUITS } from '../content/goods.mjs';
import { BUILDINGS } from '../content/buildings.mjs';
import { XP } from '../content/economy.mjs';
import * as barn from './barn.mjs';
import { gainXp } from './levels.mjs';

export const fruitOf = (s, id) => FRUITS[BUILDINGS[s.placed[id]?.kind]?.fruit] ?? null;
export const fruitId = (s, id) => BUILDINGS[s.placed[id]?.kind]?.fruit ?? null;
/** { state: 'ripe' | 'growing', fruit, leftMs, progress } or null for a thing that is not a fruit tree. */
export function treeState(s, id, now) {
  const t = s.trees?.[id], f = fruitOf(s, id); if (!t || !f) return null;
  if (t.doneAt <= now) return { state: 'ripe', fruit: fruitId(s, id) };
  const full = t.first ? f.firstMs : f.regrowMs;
  return { state: 'growing', fruit: fruitId(s, id), leftMs: t.doneAt - now, progress: Math.max(0, 1 - (t.doneAt - now) / full) };
}
/** A new tree gets its first wait; a stored or rebuilt tree waits a full regrowth cycle. */
export function plantTree(s, id, now, { regrow = false } = {}) { const f = fruitOf(s, id); if (f) (s.trees ??= {})[id] = { doneAt: now + (regrow ? f.regrowMs : f.firstMs), first: !regrow, picked: 0 }; }
export const ripeTrees = (s, now) => Object.keys(s.trees ?? {}).filter(id => s.placed[id] && s.trees[id].doneAt <= now);

export const actions = {
  /** Pick ripe fruit: { id } or { ids: [...] } (every ripe tree when neither is given). Overflow sells at base value. */
  pick(ctx, { id, ids = id ? [id] : null } = {}) {
    const { s, now } = ctx; let picked = 0, sold = 0, xp = 0;
    for (const tid of ids == null ? ripeTrees(s, now) : Array.isArray(ids) ? ids : []) {
      const t = s.trees?.[tid], f = fruitOf(s, tid); if (!t || !f || t.doneAt > now) continue;
      const good = fruitId(s, tid);
      const before = barn.stock(s, good), coins = barn.addOrSell(s, good, f.yield), stored = barn.stock(s, good) - before;
      sold += coins; t.doneAt = now + f.regrowMs; t.picked = (t.picked ?? 0) + 1; delete t.first; picked++; xp += XP.harvest * f.yield;
      s.stats.picked = (s.stats.picked ?? 0) + f.yield; (s.album ??= { fish: {}, fruit: {} }).fruit[good] = (s.album.fruit[good] ?? 0) + f.yield;
      // count is the full harvest; only stored units entered the barn. Coins were already paid by addOrSell.
      ctx.emit('picked', { id: tid, good, count: f.yield, stored, sold: f.yield - stored, coins });
    }
    if (!picked) return ctx.fail('Nothing is ready yet');
    gainXp(ctx, xp);
    if (sold) ctx.emit('barnSold', { coins: sold });
    return { picked };
  },
};
