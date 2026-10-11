// Output upgrades: an animal home or a workshop can be upgraded OUTPUT_UP.max times, and every upgrade doubles what one
// collection gives (the same feed, the same ingredients, the same time). s.outputUp = { [placed id]: upgrades bought }.
import { BUILDINGS } from '../content/buildings.mjs';
import { OUTPUT_UP } from '../content/economy.mjs';
import { isWorking } from './working.mjs';

export const outputLevel = (s, id) => Math.min(OUTPUT_UP.max, Math.max(0, Math.floor(s.outputUp?.[id] ?? 0)));
/** How many times its plain amount a collection from this building gives: 1, 2, 4, 8, 16. */
export const outputTimes = (s, id) => 2 ** outputLevel(s, id);
/** What the next upgrade of this building is: { ok, level, next, times, price, reason, params } (next: null when at the top). */
export function outputPlan(s, id) {
  const p = s.placed[id], def = p && BUILDINGS[p.kind], level = outputLevel(s, id);
  if (!def || !(def.animals || def.produces)) return { ok: false, level: 0, next: null, reason: 'This cannot be upgraded' };
  if (level >= OUTPUT_UP.max) return { ok: false, level, next: null, times: 2 ** level, reason: 'This is as big as it gets' };
  const price = OUTPUT_UP.cost(def.cost ?? 0, level), need = OUTPUT_UP.level[level];
  const reason = !isWorking(s, id) ? 'It needs repairs first' : s.level < need ? 'Reach level {level} first' : s.coins < price ? 'Not enough coins' : null;
  return { ok: !reason, level, next: level + 1, times: 2 ** (level + 1), price, need, reason, params: reason === 'Reach level {level} first' ? { level: need } : null };
}
export const actions = {
  /** Double what a building gives: { building }. */
  upgradeOutput(ctx, { building } = {}) {
    const { s } = ctx, plan = outputPlan(s, building); if (!plan.ok) return ctx.fail(plan.reason, plan.params ?? undefined);
    s.coins -= plan.price; (s.outputUp ??= {})[building] = plan.next;
    ctx.emit('outputUpgraded', { building, kind: s.placed[building].kind, level: plan.next, times: plan.times });
    return { level: plan.next, times: plan.times, price: plan.price };
  },
};
