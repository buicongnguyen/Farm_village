// Crops, animals and recipes for v0.1 (ECONOMY.md section 2). `value` is the base price; `level` unlocks it.
import { MIN, HOUR } from './economy.mjs';

export const CROPS = {
  wheat:   { name: 'Wheat',   growMs: 2 * MIN,  value: 2,  level: 1, free: true, model: 'crop_wheat', icon: '🌾' },
  carrot:  { name: 'Carrot',  growMs: 5 * MIN,  value: 4,  level: 2, model: 'crop_carrot', icon: '🥕' },
  corn:    { name: 'Corn',    growMs: 15 * MIN, value: 7,  level: 3, model: 'crop_goldcorn', icon: '🌽' },
  pumpkin: { name: 'Pumpkin', growMs: 1 * HOUR, value: 18, level: 5, model: 'crop_pumpkin', icon: '🎃' },
};
export const TUTORIAL_FIRST_GROW_MS = 30_000;   // the very first wheat (DESIGN 15)

export const ANIMALS = {
  hen: { name: 'Hen', home: 'coop', eats: 'chicken_feed', gives: 'egg', everyMs: 20 * MIN, price: 40, freeFirst: 2, level: 2, perHome: 6 },
  cow: { name: 'Cow', home: 'cow_barn', eats: 'cow_feed', gives: 'milk', everyMs: 1 * HOUR, price: 150, freeFirst: 0, level: 6, perHome: 4 },
};
export const PRODUCE = {
  egg: { name: 'Egg', value: 12, icon: '🥚' },
  milk: { name: 'Milk', value: 30, icon: '🥛' },
};
export const RECIPES = {
  chicken_feed: { name: 'Chicken feed', at: 'feed_mill', needs: { wheat: 3 }, makes: 3, timeMs: 5 * MIN, value: 3, level: 2, icon: '🌰' },
  cow_feed:     { name: 'Cow feed', at: 'feed_mill', needs: { corn: 2, wheat: 1 }, makes: 3, timeMs: 10 * MIN, value: 8, level: 6, icon: '🫘' },
  bread:        { name: 'Bread', at: 'bakery', needs: { wheat: 3 }, makes: 1, timeMs: 5 * MIN, value: 12, level: 3, icon: '🍞' },
  corn_bread:   { name: 'Corn bread', at: 'bakery', needs: { corn: 2, egg: 2 }, makes: 1, timeMs: 30 * MIN, value: 55, level: 4, icon: '🥖' },
  carrot_cake:  { name: 'Carrot cake', at: 'bakery', needs: { carrot: 3, egg: 2, milk: 1 }, makes: 1, timeMs: 45 * MIN, value: 110, level: 7, icon: '🍰' },
};
/** Every good the barn can hold: { id → { name, value, icon, kind } }. */
export const GOODS = {
  ...Object.fromEntries(Object.entries(CROPS).map(([id, c]) => [id, { name: c.name, value: c.value, icon: c.icon, kind: 'crop', level: c.level }])),
  ...Object.fromEntries(Object.entries(PRODUCE).map(([id, p]) => [id, { ...p, kind: 'produce', level: Object.values(ANIMALS).find(a => a.gives === id).level }])),
  ...Object.fromEntries(Object.entries(RECIPES).map(([id, r]) => [id, { name: r.name, value: r.value, icon: r.icon, kind: id.endsWith('_feed') ? 'feed' : 'product', level: r.level }])),
};
