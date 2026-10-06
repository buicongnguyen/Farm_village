// Production buildings: a queue of recipes; inputs leave the barn when queued, products wait in the building until
// collected (DESIGN 7).
import { RECIPES } from '../content/goods.mjs';
import { SLOTS, XP } from '../content/economy.mjs';
import { BUILDINGS } from '../content/buildings.mjs';
import * as barn from './barn.mjs';
import { gainXp } from './levels.mjs';

export const queueOf = (s, id) => (s.production[id] ??= { slots: SLOTS.start, queue: [] });
export const recipesAt = (s, kind) => Object.entries(RECIPES).filter(([, r]) => r.at === kind && r.level <= s.level).map(([k]) => k);
export const readyCount = (s, id, now) => queueOf(s, id).queue.filter(j => j.doneAt <= now).length;
export const slotCost = (s, id) => SLOTS.cost[queueOf(s, id).slots] ?? null;

export const actions = {
  /** Queue a recipe: { building, recipe }. */
  produce(ctx, { building, recipe }) {
    const { s, now } = ctx, p = s.placed[building], r = RECIPES[recipe];
    if (!p || !BUILDINGS[p.kind].produces) return ctx.fail('This building makes nothing');
    if (!r || r.at !== p.kind) return ctx.fail('Not made here');
    if (s.level < r.level) return ctx.fail('Reach level {level} first', { level: r.level });
    const q = queueOf(s, building);
    if (q.queue.length >= q.slots) return ctx.fail('The queue is full');
    if (!barn.take(s, r.needs)) return ctx.fail('Missing ingredients');
    const start = Math.max(now, q.queue.length ? q.queue[q.queue.length - 1].doneAt : now);
    q.queue.push({ recipe, doneAt: start + r.timeMs });
    ctx.emit('queued', { building, recipe });
    return { doneAt: start + r.timeMs };
  },
  /** Collect finished products from one building or all: { building }. */
  collectProducts(ctx, { building } = {}) {
    const { s, now } = ctx; let got = 0, full = false;
    for (const id of building ? [building] : Object.keys(s.production)) {
      const q = queueOf(s, id);
      while (q.queue.length && q.queue[0].doneAt <= now) {
        const rid = q.queue[0].recipe, r = RECIPES[rid];
        if (barn.space(s) < r.makes) { full = true; break; }
        barn.add(s, rid, r.makes); q.queue.shift(); got++;
        s.stats.produced += r.makes; gainXp(ctx, XP.produce(r.value));
        ctx.emit('produced', { building: id, good: rid, count: r.makes });
      }
    }
    if (!got) return ctx.fail(full ? 'The barn is full' : 'Nothing is ready yet');
    return { collected: got };
  },
  /** Buy one more queue slot: { building }. */
  buySlot(ctx, { building }) {
    const { s } = ctx, q = queueOf(s, building), cost = SLOTS.cost[q.slots];
    if (!s.placed[building] || !BUILDINGS[s.placed[building].kind].produces) return ctx.fail('This building makes nothing');
    if (q.slots >= SLOTS.max || cost == null) return ctx.fail('No more slots');
    if (s.coins < cost) return ctx.fail('Not enough coins');
    s.coins -= cost; q.slots++;
    return { slots: q.slots };
  },
};
