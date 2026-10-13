// Fruit trees (goods.mjs FRUITS): planted once with build mode, they fruit after a while and then again every few hours.
// s.trees[id] = { doneAt }: the fruit is ripe from doneAt. Picking puts the fruit in the barn and starts the next crop.
import { sprayFactor } from './machines.mjs';
import { treeFactor, firstFactor, pickExtra } from './knowhow.mjs';
import { FRUITS } from '../content/goods.mjs';
import { BUILDINGS } from '../content/buildings.mjs';
import { XP } from '../content/economy.mjs';
import * as barn from './barn.mjs';
import { gainXp } from './levels.mjs';

/** What a tree bears: its kind's fruit, or the Mango apple once an apple tree has taken a mango branch (core/knowhow.mjs). */
export const fruitId = (s, id) => s.trees?.[id]?.cross && s.placed[id]?.kind === 'apple_tree' ? 'mango_apple' : BUILDINGS[s.placed[id]?.kind]?.fruit ?? null;
export const fruitOf = (s, id) => FRUITS[fruitId(s, id)] ?? null;
/** { state: 'ripe' | 'growing', fruit, leftMs, progress } or null for a thing that is not a fruit tree. */
export function treeState(s, id, now) {
  const t = s.trees?.[id], f = fruitOf(s, id); if (!t || !f) return null;
  if (t.doneAt <= now) return { state: 'ripe', fruit: fruitId(s, id) };
  const full = (t.first ? f.firstMs * firstFactor(t.graft) : f.regrowMs * sprayFactor(s)) * treeFactor(t);
  return { state: 'growing', fruit: fruitId(s, id), leftMs: t.doneAt - now, progress: Math.max(0, 1 - (t.doneAt - now) / full) };
}
/** A new tree gets its first wait; a stored or rebuilt tree waits a full regrowth cycle. */
/** `graft`: a grafted sapling (core/knowhow.mjs): its first fruit comes much sooner, and every crop after it faster. */
export function plantTree(s, id, now, { regrow = false, graft = false } = {}) {
  const f = fruitOf(s, id); if (!f) return;
  const first = graft || !regrow, wait = first ? f.firstMs * firstFactor(graft) : f.regrowMs;
  (s.trees ??= {})[id] = { doneAt: now + Math.round(wait * (graft ? treeFactor({ graft }) : 1)), first, picked: 0, ...(graft ? { graft: true } : {}) };
}
export const ripeTrees = (s, now) => Object.keys(s.trees ?? {}).filter(id => s.placed[id] && s.trees[id].doneAt <= now);

export const actions = {
  /** Pick ripe fruit: { id } or { ids: [...] } (every ripe tree when neither is given). Overflow sells at base value. */
  pick(ctx, { id, ids = id ? [id] : null } = {}) {
    const { s, now } = ctx; let picked = 0, sold = 0, xp = 0;
    for (const tid of ids == null ? ripeTrees(s, now) : Array.isArray(ids) ? ids : []) {
      const t = s.trees?.[tid], f = fruitOf(s, tid); if (!t || !f || t.doneAt > now) continue;
      const good = fruitId(s, tid), n = f.yield + pickExtra(s);   // thinned trees give one more (core/knowhow.mjs)
      const before = barn.stock(s, good), coins = barn.addOrSell(s, good, n), stored = barn.stock(s, good) - before;
      // (a sprayed orchard bears sooner: core/machines.mjs)
      sold += coins; t.doneAt = now + Math.round(f.regrowMs * treeFactor(t) * sprayFactor(s)); t.picked = (t.picked ?? 0) + 1; delete t.first; picked++; xp += XP.harvest * n;
      s.stats.picked = (s.stats.picked ?? 0) + n; (s.album ??= { fish: {}, fruit: {} }).fruit[good] = (s.album.fruit[good] ?? 0) + n;
      // count is the full harvest; only stored units entered the barn. Coins were already paid by addOrSell.
      ctx.emit('picked', { id: tid, good, count: n, stored, sold: n - stored, coins });
    }
    if (!picked) return ctx.fail('Nothing is ready yet');
    gainXp(ctx, xp);
    if (sold) ctx.emit('barnSold', { coins: sold });
    return { picked };
  },
};
