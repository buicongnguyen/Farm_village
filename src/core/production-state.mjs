// Save-compatible tray metadata. The queue name remains in saves, but each job owns an independent tray.
import { RECIPES } from '../content/goods.mjs';
import { SLOTS } from '../content/economy.mjs';

/** Pure: old serial jobs keep their exact completion time and implied start, including future reservations. */
export function normalizeProductionQueue(saved) {
  const jobs = saved?.queue ?? [];
  if (!Array.isArray(jobs) || jobs.length > SLOTS.max) throw new Error('invalid production queue');
  const bought = Number.isSafeInteger(saved?.slots) && saved.slots >= 1 && saved.slots <= SLOTS.max ? saved.slots : SLOTS.start;
  const slots = Math.max(bought, jobs.length), occupied = new Set();
  const queue = jobs.map(job => {
    if (!job || !Object.hasOwn(RECIPES, job.recipe) || !Number.isFinite(job.doneAt)) throw new Error('invalid production job');
    let slot = job.slot;
    if (!Number.isSafeInteger(slot) || slot < 0 || slot >= slots || occupied.has(slot)) {
      slot = 0; while (occupied.has(slot)) slot++;
    }
    occupied.add(slot);
    const durationMs = Number.isFinite(job.durationMs) && job.durationMs > 0 ? job.durationMs : RECIPES[job.recipe].timeMs;
    const startedAt = Number.isFinite(job.startedAt) && job.startedAt <= job.doneAt ? job.startedAt : job.doneAt - durationMs;
    return { recipe: job.recipe, slot, startedAt, doneAt: job.doneAt, durationMs };
  });
  return { slots, queue };
}

export const productionOf = (s, id) => normalizeProductionQueue(s.production?.[id]);
export const normalizeProduction = s => Object.fromEntries(Object.entries(s.production ?? {}).map(([id, q]) => [id, normalizeProductionQueue(q)]));

/** tick() only: a backward device clock cannot extend each independent tray beyond one recipe's duration. */
export function clampProductionClock(s, now) {
  s.production = normalizeProduction(s);
  for (const q of Object.values(s.production)) for (const job of q.queue) {
    job.doneAt = Math.min(job.doneAt, now + job.durationMs);
    job.startedAt = Math.min(job.startedAt, job.doneAt, now);
  }
}
