// Crops, fruit, animals and recipes (ECONOMY.md section 2). `value` is the base price; `level` unlocks it.
import { MIN, HOUR } from './economy.mjs';

export const CROPS = {
  wheat:   { name: 'Wheat',   growMs: 20_000,  value: 2,  level: 1, free: true, model: 'crop_wheat', icon: '🌾' },
  carrot:  { name: 'Carrot',  growMs: 30_000,  value: 4,  level: 2, model: 'crop_carrot', icon: '🥕' },
  corn:    { name: 'Corn',    growMs: 45_000, value: 7,  level: 3, model: 'crop_goldcorn', icon: '🌽' },
  pumpkin: { name: 'Pumpkin', growMs: 5 * MIN, value: 18, level: 5, model: 'crop_pumpkin', icon: '🎃' },
  // premium crops (docs/VILLAGE-GROWTH-PLAN.md, stage 2): slow and valuable, the money for the village's big buildings
  herb:    { name: 'Healing herb', growMs: 15 * MIN, value: 45, level: 7, model: 'crop_herb', icon: '🌿' },
  ginseng: { name: 'Ginseng', growMs: 40 * MIN, value: 120, level: 9, model: 'crop_ginseng', icon: '🫚' },
};
export const TUTORIAL_FIRST_GROW_MS = 15_000;   // the very first wheat (DESIGN 15)

/** Fruit grows on trees (buildings.mjs `fruit`): a tree is planted once and gives `yield` fruit every `regrowMs`. */
export const FRUITS = {
  cherry: { name: 'Cherry', tree: 'cherry_tree', value: 7, level: 4, yield: 3, firstMs: 25_000, regrowMs: 40_000 },
  apple: { name: 'Apple', tree: 'apple_tree', value: 9,  level: 2, yield: 3, firstMs: 30_000, regrowMs: 50_000, icon: '🍎' },
  peach: { name: 'Peach', tree: 'peach_tree', value: 15, level: 4, yield: 3, firstMs: 3 * MIN, regrowMs: 5 * MIN, icon: '🍑' },
};

/** Fish from the pond (core/fishing.mjs). Icons are Willowmere's fish art. */
export const FISH_TABLE = [
  { id: 'perch', name: 'Perch', value: 6, weight: 50 }, { id: 'carp', name: 'Carp', value: 12, weight: 30 },
  { id: 'catfish', name: 'Catfish', value: 22, weight: 15, rare: true }, { id: 'goldfish', name: 'Golden carp', value: 70, weight: 5, rare: true },
];
export const ANIMALS = {
  hen: { name: 'Hen', home: 'coop', eats: 'chicken_feed', gives: 'egg', everyMs: 45_000, price: 40, freeFirst: 2, level: 2, perHome: 6 },
  cow: { name: 'Cow', home: 'cow_barn', eats: 'cow_feed', gives: 'milk', everyMs: 5 * MIN, price: 150, freeFirst: 0, level: 6, perHome: 4 },
};
export const PRODUCE = {
  egg: { name: 'Egg', value: 12, icon: '🥚' },
  milk: { name: 'Milk', value: 30, icon: '🥛' },
};
export const RECIPES = {
  chicken_feed: { name: 'Chicken feed', at: 'feed_mill', needs: { wheat: 3 }, makes: 3, timeMs: 20_000, value: 3, level: 2, icon: '🌰' },
  cow_feed:     { name: 'Cow feed', at: 'feed_mill', needs: { corn: 2, wheat: 1 }, makes: 3, timeMs: 40_000, value: 8, level: 6, icon: '🫘' },
  bread:        { name: 'Bread', at: 'bakery', needs: { wheat: 3 }, makes: 1, timeMs: 30_000, value: 12, level: 3, icon: '🍞' },
  corn_bread:   { name: 'Corn bread', at: 'bakery', needs: { corn: 2, egg: 2 }, makes: 1, timeMs: 45_000, value: 55, level: 4, icon: '🥖' },
  apple_pie:    { name: 'Apple pie', at: 'bakery', needs: { apple: 3, wheat: 2, egg: 1 }, makes: 1, timeMs: 55_000, value: 70, level: 5, icon: '🥧' },
  carrot_cake:  { name: 'Carrot cake', at: 'bakery', needs: { carrot: 3, egg: 2, milk: 1 }, makes: 1, timeMs: 5 * MIN, value: 110, level: 7, icon: '🍰' },
};
/** Every good the barn can hold: { id → { name, value, icon, kind } }. */
export const GOODS = {
  ...Object.fromEntries(Object.entries(CROPS).map(([id, c]) => [id, { name: c.name, value: c.value, icon: c.icon, kind: 'crop', level: c.level }])),
  ...Object.fromEntries(FISH_TABLE.map(f => [f.id, { name: f.name, value: f.value, icon: '🐟', kind: 'fish', level: 2 }])),
  ...Object.fromEntries(Object.entries(FRUITS).map(([id, f]) => [id, { name: f.name, value: f.value, icon: f.icon, kind: 'fruit', level: f.level }])),
  ...Object.fromEntries(Object.entries(PRODUCE).map(([id, p]) => [id, { ...p, kind: 'produce', level: Object.values(ANIMALS).find(a => a.gives === id).level }])),
  ...Object.fromEntries(Object.entries(RECIPES).map(([id, r]) => [id, { name: r.name, value: r.value, icon: r.icon, kind: id.endsWith('_feed') ? 'feed' : 'product', level: r.level }])),
};
