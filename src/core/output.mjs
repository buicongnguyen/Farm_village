// Output upgrades: an animal home or a workshop can be upgraded OUTPUT_UP.max times, and every upgrade doubles what one
// collection gives (the same feed, the same ingredients, the same time). s.outputUp = { [placed id]: upgrades bought }.
import { BUILDINGS } from '../content/buildings.mjs';
import { OUTPUT_UP } from '../content/economy.mjs';
import { isWorking } from './working.mjs';

export const outputLevel = (s, id) => {
  const n = s.outputUp?.[id];
  return Number.isSafeInteger(n) && n > 0 ? Math.min(OUTPUT_UP.max, n) : 0;
};
/** Optional imported data never supplies nonnumeric multipliers, inherited keys or upgrades for removed buildings. */
export function normalizeOutput(s) {
  const saved = s.outputUp;
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return {};
  return Object.fromEntries(Object.keys(saved).filter(id => Object.hasOwn(s.placed ?? {}, id)
    && (BUILDINGS[s.placed[id].kind]?.animals || BUILDINGS[s.placed[id].kind]?.produces) && outputLevel(s, id) > 0)
    .map(id => [id, outputLevel(s, id)]));
}
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
// Music in the barn: a radio for the cow barn or the goat barn, bought once. Calm animals give half as much again at
// every collection (rounded up, so the first radio doubles a barn that has no output upgrade yet).
export const MUSIC = { cow_barn: { cost: 900, level: 8 }, goat_barn: { cost: 900, level: 10 } };
export const hasMusic = (s, id) => !!s.music?.[id] && !!MUSIC[s.placed?.[id]?.kind];
/** What one ready animal gives at this home: the output upgrades, and the music on top. */
export const animalYield = (s, id) => Math.round(outputTimes(s, id) * (hasMusic(s, id) ? 1.5 : 1));
/** Can this home have music? null when it is not a barn for it; { has } once bought; else the price and what is missing. */
export function musicPlan(s, id) {
  const m = MUSIC[s.placed?.[id]?.kind]; if (!m) return null;
  if (hasMusic(s, id)) return { has: true };
  const reason = !isWorking(s, id) ? 'Repair it first' : s.level < m.level ? 'Reach level {level} first' : s.coins < m.cost ? 'Not enough coins' : null;
  return { ok: !reason, price: m.cost, need: m.level, reason, params: { level: m.level } };
}
export const actions = {
  /** A radio for the herd: { building }. */
  buyMusic(ctx, { building } = {}) {
    const { s } = ctx, plan = musicPlan(s, building); if (!plan || plan.has) return ctx.fail('There is nothing to add here');
    if (!plan.ok) return ctx.fail(plan.reason, plan.params);
    s.coins -= plan.price; (s.music ??= {})[building] = true;
    ctx.emit('musicBought', { building, kind: s.placed[building].kind }); return { price: plan.price };
  },
  /** Double what a building gives: { building }. */
  upgradeOutput(ctx, { building } = {}) {
    const { s } = ctx, plan = outputPlan(s, building); if (!plan.ok) return ctx.fail(plan.reason, plan.params ?? undefined);
    s.coins -= plan.price; (s.outputUp ??= {})[building] = plan.next;
    ctx.emit('outputUpgraded', { building, kind: s.placed[building].kind, level: plan.next, times: plan.times });
    return { level: plan.next, times: plan.times, price: plan.price };
  },
};
