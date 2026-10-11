// The walk upriver (chapter 16, docs/plan/ch16-where-the-brook-begins.md): three stops with Grandpa Oak and Sunny, to
// the spring where the brook begins. Each stop is opened by a small deed that fits the farm by now (a picnic from the
// barn, a fish landed at the boat dock, ten trees planted), in order; each gives a keepsake, a few coins and a scene.
// Nothing is timed. Reaching the spring adds to the valley's beauty for good (core/valley.mjs).
//   s.upriver = { stops: [ids in the order walked], trees0, fish0 }   trees0: trees standing when the walk opened;
//   fish0: fish landed at the dock when the weir was reached
import { UPRIVER } from '../content/exploration.mjs';
import { BUILDINGS } from '../content/buildings.mjs';
import { gainXp } from './levels.mjs';
import * as barn from './barn.mjs';

const TREES = new Set(['round_tree', 'willow', 'pine_tree', 'tree']);
/** Trees standing in the valley: fruit trees and the planted ones. */
export const treesOf = s => Object.values(s.placed ?? {}).filter(p => BUILDINGS[p.kind]?.fruit || TREES.has(p.kind)).length;
/** The walk opens when chapter 15 is behind. */
export const upriverOpen = s => (s.story?.chapter ?? 0) >= 15;
export const stopsDone = s => s.upriver?.stops ?? [];
/** What a stop still asks for: rows of { kind, good?, have, need, ok }. */
function needsOf(s, stop) {
  const u = s.upriver ?? {}, rows = [];
  for (const [good, need] of Object.entries(stop.needs.goods ?? {})) { const have = Math.min(need, barn.free(s, good)); rows.push({ kind: 'good', good, have, need, ok: have >= need }); }
  if (stop.needs.riverFish) { const have = Math.min(stop.needs.riverFish, Math.max(0, (s.stats?.riverFish ?? 0) - (u.fish0 ?? 0))); rows.push({ kind: 'fish', have, need: stop.needs.riverFish, ok: have >= stop.needs.riverFish }); }
  if (stop.needs.trees) { const have = Math.min(stop.needs.trees, Math.max(0, treesOf(s) - (u.trees0 ?? treesOf(s)))); rows.push({ kind: 'trees', have, need: stop.needs.trees, ok: have >= stop.needs.trees }); }
  return rows;
}
/** For the panel: { open, complete, done, stops: [{ ...stop, done, next, needs }] }. */
export function upriverOf(s) {
  const done = stopsDone(s), open = upriverOpen(s);
  return { open, complete: done.length >= UPRIVER.stops.length, done: done.length,
    stops: UPRIVER.stops.map((stop, i) => ({ ...stop, done: done.includes(stop.id), next: open && i === done.length, needs: needsOf(s, stop) })) };
}
/** Can this stop be walked to now? { ok, reason?, stop } */
export function stopPlan(s, id) {
  const i = UPRIVER.stops.findIndex(st => st.id === id), stop = UPRIVER.stops[i];
  if (!stop) return { ok: false, reason: 'Unknown stop' };
  if (!upriverOpen(s)) return { ok: false, reason: 'Nobody is ready for the walk yet', stop };
  const done = stopsDone(s);
  if (done.includes(id)) return { ok: false, reason: 'You have been there', stop };
  if (i !== done.length) return { ok: false, reason: 'The path goes by the stop before it', stop };
  if (needsOf(s, stop).some(r => !r.ok)) return { ok: false, reason: 'Not ready for this stop yet', stop };
  return { ok: true, stop };
}
/** Called by tick(): the walk opens with what stands in the valley that day. */
export function tickUpriver(ctx) {
  const { s } = ctx;
  if (upriverOpen(s) && !s.upriver) s.upriver = { stops: [], trees0: treesOf(s), fish0: s.stats?.riverFish ?? 0 };
}

export const actions = {
  /** Walk to the next stop upriver: { stop }. Takes the picnic if the stop asks for one; gives its keepsake once. */
  visitStop(ctx, { stop: id } = {}) {
    const { s, now } = ctx, plan = stopPlan(s, id);
    if (!plan.ok) return ctx.fail(plan.reason);
    const stop = plan.stop, u = (s.upriver ??= { stops: [], trees0: treesOf(s), fish0: s.stats?.riverFish ?? 0 });
    if (stop.needs.goods) barn.take(s, stop.needs.goods);
    u.stops.push(stop.id); u.fish0 = s.stats?.riverFish ?? 0;   // the next fish is caught after this stop
    (s.firsts ??= {})[`upriver:${stop.id}`] = now;
    s.coins += stop.coins; s.stats.coinsEarned += stop.coins; gainXp(ctx, stop.xp);
    const complete = u.stops.length >= UPRIVER.stops.length;
    ctx.emit('upriverStop', { stop: stop.id, keepsake: stop.keepsake.id, coins: stop.coins, complete });
    return { stop: stop.id, keepsake: stop.keepsake.id, complete };
  },
};
