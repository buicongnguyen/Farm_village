// XP and levels (ECONOMY 6).
import { LEVELS } from '../content/economy.mjs';
import { CROPS, RECIPES, ANIMALS } from '../content/goods.mjs';
import { BUILDINGS } from '../content/buildings.mjs';

export const xpFor = LEVELS.xpFor;
/** Add XP; emits a 'levelUp' event per level gained. */
export function gainXp(ctx, amount) {
  const { s } = ctx; if (!Number.isFinite(amount)) throw new Error(`bad XP amount ${amount}`); s.xp += Math.max(0, Math.round(amount));
  while (s.level < LEVELS.max && s.xp >= xpFor(s.level + 1)) { s.level++; ctx.emit('levelUp', { level: s.level, unlocks: unlocksAt(s.level) }); }
}
/** What opens at a level: crop, recipe, animal and building ids. */
export function unlocksAt(level) {
  const pick = obj => Object.entries(obj).filter(([, v]) => v.level === level).map(([k]) => k);
  return { crops: pick(CROPS), recipes: pick(RECIPES), animals: pick(ANIMALS), buildings: pick(BUILDINGS).filter(k => !BUILDINGS[k].project) };
}
export const progress = s => { const a = xpFor(s.level), b = xpFor(s.level + 1); return { level: s.level, xp: s.xp, from: a, to: b, ratio: (s.xp - a) / Math.max(1, b - a) }; };
