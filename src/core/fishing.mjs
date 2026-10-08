// The fish pond (v0.3b, after Willowmere's fishing): cast a line, wait a little, reel in a fish that sells like any good.
// Villagers who like fishing sit at the pond and leave a small fee in the pond's till.
import { FISH } from '../content/economy.mjs';
import { FISH_TABLE } from '../content/goods.mjs';
import * as barn from './barn.mjs';
import { rng, hash } from './rng.mjs';
import { workingCount } from './working.mjs';

export const fishingOf = s => (s.fishing ??= { line: null, coins: 0, caught: 0, feeAt: 0 });
// The village pond by the farmhouse (content/world.mjs POND) is always there to fish in; built ponds are extra.
export const hasPond = () => true;
/** The fish that bites: better odds for rare ones with bait. Pure, from the line's own seed. */
export function pick(seed, bait) {
  const r = rng(hash(seed))(), table = FISH_TABLE.map(f => ({ ...f, w: f.rare ? f.weight * (bait ? 2 : 1) : f.weight })), total = table.reduce((a, f) => a + f.w, 0);
  let x = r * total; for (const f of table) { if ((x -= f.w) < 0) return f.id; } return table[0].id;
}
export function tickFishing(ctx) {
  const { s, now } = ctx; if (!s.fishing) return;
  const f = s.fishing;
  if (!hasPond(s)) { f.feeAt = 0; return; }
  const fans = Object.values(s.homes).filter(h => h.family && h.arrivesAt <= now).length;
  if (!fans) { f.feeAt = 0; return; }
  if (!f.feeAt) f.feeAt = now + FISH.feeMs;
  while (f.feeAt <= now && f.coins < FISH.feeCap) { f.coins = Math.min(FISH.feeCap, f.coins + FISH.feeCoins * Math.min(fans, 3)); f.feeAt += FISH.feeMs; ctx.emit('fishFee', { coins: f.coins }); }
  if (f.coins >= FISH.feeCap) f.feeAt = now + FISH.feeMs;
}
export const actions = {
  /** Cast a line; with bait (chicken feed) the fish bite sooner and rare ones come more often. */
  castLine(ctx, { bait = false } = {}) {
    const { s, now } = ctx; if (!hasPond(s)) return ctx.fail('Build a fish pond first');
    if (s.fishing?.line) return ctx.fail('The line is already in the water');
    bait = !!bait; if (bait && !barn.take(s, { chicken_feed: 1 })) return ctx.fail('Missing goods');
    const f = fishingOf(s);
    f.line = { doneAt: now + (bait ? FISH.baitMs : FISH.waitMs), bait, seed: `${now}:${f.caught}` };
    ctx.emit('lineCast', { bait });
    return { doneAt: f.line.doneAt };
  },
  /** Reel in: a fish when the wait is over. */
  reelIn(ctx) {
    const { s, now } = ctx, f = s.fishing; if (!f?.line) return ctx.fail('Cast a line first');
    if (f.line.doneAt > now) return ctx.fail('Nothing is biting yet');
    const fish = pick(f.line.seed, f.line.bait), first = !(s.album?.fish?.[fish] > 0);
    const before = barn.stock(s, fish), coins = barn.addOrSell(s, fish, 1), stored = barn.stock(s, fish) - before;
    if (coins) ctx.emit('barnSold', { coins });
    f.line = null; f.caught++; (s.album ??= { fish: {}, fruit: {} }).fish[fish] = (s.album.fish[fish] ?? 0) + 1; s.stats.fished = (s.stats.fished ?? 0) + 1;
    // first means this species' first album entry. Rarity comes from the same content used by bait odds.
    ctx.emit('fishCaught', { fish, first, rare: !!FISH_TABLE.find(f => f.id === fish)?.rare, stored, sold: 1 - stored, coins });
    return { fish };
  },
  collectFees(ctx) {
    const { s } = ctx, f = s.fishing, coins = f?.coins ?? 0; if (!Number.isSafeInteger(coins) || coins <= 0) return ctx.fail('Nothing sold yet');
    s.coins += coins; s.stats.coinsEarned += coins; f.coins = 0;
    ctx.emit('coins', { coins, source: 'pond' });
    return { coins };
  },
};
