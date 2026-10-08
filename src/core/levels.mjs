// XP and levels (ECONOMY 6).
import { LEVELS } from '../content/economy.mjs';
import { CROPS, RECIPES, ANIMALS, FRUITS } from '../content/goods.mjs';
import { ORDERS } from '../content/economy.mjs';
import { BUILDINGS } from '../content/buildings.mjs';

export const xpFor = LEVELS.xpFor;
/** Add XP; emits a 'levelUp' event per level gained. */
export function gainXp(ctx, amount) {
  const { s } = ctx; if (!Number.isFinite(amount)) throw new Error(`bad XP amount ${amount}`); s.xp += Math.max(0, Math.round(amount));
  while (s.level < LEVELS.max && s.xp >= xpFor(s.level + 1)) { s.level++; ctx.emit('levelUp', { level: s.level, unlocks: unlocksAt(s.level) }); }
}
/**
 * What opens at a level, from the content's level fields: crop, fruit, recipe, animal and building ids, the new order slot
 * count (or 0), and `list`: every unlock as { type, id } in that order (the level-up card's tiles).
 * Project buildings are left out: their project opens them.
 */
export function unlocksAt(level) {
  const pick = obj => Object.entries(obj).filter(([, v]) => v.level === level).map(([k]) => k);
  const out = { crops: pick(CROPS).filter(id => !CROPS[id].skill), fruits: pick(FRUITS), recipes: pick(RECIPES), animals: pick(ANIMALS), buildings: pick(BUILDINGS).filter(k => !BUILDINGS[k].project && !BUILDINGS[k].garden),
    orderSlots: level > 1 && ORDERS.slots(level) > ORDERS.slots(level - 1) ? ORDERS.slots(level) : 0 };
  out.list = [...out.crops.map(id => ({ type: 'crop', id })), ...out.fruits.map(id => ({ type: 'fruit', id })), ...out.recipes.map(id => ({ type: 'recipe', id })),
    ...out.animals.map(id => ({ type: 'animal', id })), ...out.buildings.map(id => ({ type: 'building', id }))];
  return out;
}
export const progress = s => { const a = xpFor(s.level), b = xpFor(s.level + 1); return { level: s.level, xp: s.xp, from: a, to: b, ratio: (s.xp - a) / Math.max(1, b - a) }; };
