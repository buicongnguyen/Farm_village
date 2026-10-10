// Production buildings: independent trays. Inputs are paid when work starts; finished products keep their tray
// until collected. Legacy serial jobs keep their saved schedule until that batch is collected.
import { RECIPES } from '../content/goods.mjs';
import { SLOTS, XP } from '../content/economy.mjs';
import { BUILDINGS } from '../content/buildings.mjs';
import * as barn from './barn.mjs';
import { gainXp } from './levels.mjs';
import { isWorking } from './working.mjs';
import { productionOf } from './production-state.mjs';
import { companyWorkerMultiplier, markCompanyUsed } from './company-benefits.mjs';
export { productionOf } from './production-state.mjs';

export const queueOf = (s, id) => (s.production[id] ??= { slots: SLOTS.start, queue: [] });
/** A recipe is open at its level, or earlier when a heart scene taught it (s.known). */
export const recipeOpen = (s, id) => !!RECIPES[id] && (RECIPES[id].level <= s.level || !!s.known?.[id]);
export const recipesAt = (s, kind) => Object.keys(RECIPES).filter(k => RECIPES[k].at === kind && recipeOpen(s, k));
export const readyCount = (s, id, now) => productionOf(s, id).queue.filter(j => j.doneAt <= now).length;
export const slotCost = (s, id) => SLOTS.cost[productionOf(s, id).slots] ?? null;
/** Current quote for a new batch. Existing work keeps the duration stored when its inputs were paid. */
export const productionDuration = (s, building, recipe, now) => Math.max(1, Math.round(RECIPES[recipe].timeMs * companyWorkerMultiplier(s, building, now)));

/** Exact collection preview: skip unfinished or oversized batches; no tray is held behind another one. */
export function collectableJobs(s, id, now) {
  let space = barn.space(s);
  return productionOf(s, id).queue.filter(job => {
    const amount = RECIPES[job.recipe].makes;
    if (job.doneAt > now || amount > space) return false;
    space -= amount; return true;
  });
}

/** One transaction for direct work and an explicitly confirmed manager batch. No repeating/autonomous orders. */
export function queueBatches(ctx, { building, recipe, count = 1 }) {
  const { s, now } = ctx, p = s.placed[building], r = RECIPES[recipe];
  if (!Number.isSafeInteger(count) || count < 1 || count > 3) return ctx.fail('Choose one to three batches');
  if (!BUILDINGS[p?.kind]?.produces) return ctx.fail('This building makes nothing');
  if (!isWorking(s, building)) return ctx.fail('It needs repairs first');
  if (!r || r.at !== p.kind) return ctx.fail('Not made here');
  if (!recipeOpen(s, recipe)) return ctx.fail('Reach level {level} first', { level: r.level, recipe, lock: 'level' });
  const q = productionOf(s, building);   // normalized only in memory until all checks pass
  if (q.queue.length + count > q.slots) return ctx.fail('The queue is full');
  const inputs = Object.fromEntries(Object.entries(r.needs).map(([good, n]) => [good, n * count]));
  if (!barn.hasAll(s, inputs)) return ctx.fail('Missing ingredients');
  const durationMs = productionDuration(s, building, recipe, now);
  if (!Number.isFinite(now) || !Number.isFinite(now + durationMs)) return ctx.fail('The production clock is unavailable');
  const slots = [], occupied = new Set(q.queue.map(job => job.slot));
  for (let i = 0; i < count; i++) { let slot = 0; while (occupied.has(slot)) slot++; occupied.add(slot); slots.push(slot); }
  barn.take(s, inputs); s.production[building] = q; (s.lastRecipe ??= {})[building] = recipe;   // what this building last made: a hired workshop hand keeps it going
  if (durationMs < r.timeMs) markCompanyUsed(s);
  for (const slot of slots) {
    q.queue.push({ recipe, slot, startedAt: now, doneAt: now + durationMs, durationMs });
    ctx.emit('queued', { building, recipe, slot });
  }
  return { queued: count, slots, slot: slots[0], startedAt: now, doneAt: now + durationMs };
}

export const actions = {
  /** Start a recipe immediately in the first free tray: { building, recipe }. */
  produce(ctx, { building, recipe }) {
    return queueBatches(ctx, { building, recipe, count: 1 });
  },
  /** Fill every free tray with one recipe, as far as the ingredients go: { building, recipe }. Fails only if not even one starts. */
  produceAll(ctx, { building, recipe }) {
    const first = queueBatches(ctx, { building, recipe, count: 1 }); if (first?.ok === false) return first;
    let count = 1; const q = productionOf(ctx.s, building), r = RECIPES[recipe];
    while (q.queue.length < q.slots && barn.hasAll(ctx.s, r.needs) && count < SLOTS.max) { if (queueBatches(ctx, { building, recipe, count: 1 })?.ok === false) break; count++; }
    return { count };
  },
  /** Collect finished products from one building or all: { building }. */
  collectProducts(ctx, { building, limit = Infinity } = {}) {   // limit: at most this many trays (a hired hand does half)
    const { s, now } = ctx; let got = 0, full = false;
    for (const id of building ? [building] : Object.keys(s.production)) {
      if (!s.production[id]) continue;   // read only: a refusal leaves no trace
      const q = productionOf(s, id), jobs = collectableJobs(s, id, now).slice(0, Math.max(0, limit - got)), collectedSlots = new Set(jobs.map(job => job.slot));
      if (q.queue.some(job => job.doneAt <= now && !collectedSlots.has(job.slot))) full = true;
      if (!jobs.length) continue;
      for (const job of jobs) {
        const rid = job.recipe, r = RECIPES[rid];
        barn.add(s, rid, r.makes); got++;
        s.stats.produced += r.makes; gainXp(ctx, XP.produce(r.value));
        ctx.emit('produced', { building: id, good: rid, count: r.makes, slot: job.slot });
      }
      q.queue = q.queue.filter(job => !collectedSlots.has(job.slot)); s.production[id] = q;
    }
    if (!got) return ctx.fail(full ? 'The barn is full' : 'Nothing is ready yet');
    return { collected: got };
  },
  /** Buy one more independent tray, without changing existing work: { building }. */
  buySlot(ctx, { building }) {
    const { s } = ctx;
    if (!BUILDINGS[s.placed[building]?.kind]?.produces) return ctx.fail('This building makes nothing');
    const q = productionOf(s, building), cost = SLOTS.cost[q.slots];
    if (q.slots >= SLOTS.max || cost == null) return ctx.fail('No more slots');
    if (s.coins < cost) return ctx.fail('Not enough coins');
    s.coins -= cost; q.slots++; s.production[building] = q;
    ctx.emit('slotBought', { building, slots: q.slots });
    return { slots: q.slots };
  },
};
