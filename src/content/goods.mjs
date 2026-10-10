// Crops, fruit, animals and recipes (ECONOMY.md section 2). `value` is the base price; `level` unlocks it.
import { MIN, HOUR } from './economy.mjs';

export const CROPS = {
  wheat:   { name: 'Wheat',   growMs: 20_000,  value: 2,  level: 1, free: true, model: 'crop_wheat', icon: '🌾' },
  carrot:  { name: 'Carrot',  growMs: 30_000,  value: 4,  level: 2, model: 'crop_carrot', icon: '🥕' },
  corn:    { name: 'Corn',    growMs: 45_000, value: 7,  level: 3, model: 'crop_goldcorn', icon: '🌽' },
  strawberry: { name: 'Strawberry', growMs: 2 * MIN, value: 12, level: 4, skill: 'garden-repairs', model: 'crop_strawberry', icon: '🍓' },
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
  orange: { name: 'Orange', tree: 'orange_tree', value: 18, level: 5, yield: 3, firstMs: 4 * MIN, regrowMs: 6 * MIN, icon: '🍊' },
  coconut: { name: 'Coconut', tree: 'coconut_palm', value: 26, level: 8, yield: 2, firstMs: 6 * MIN, regrowMs: 10 * MIN, icon: '🥥' },
};

/** Fish from the pond (core/fishing.mjs). Icons are Willowmere's fish art. `weight`: how often it bites (bait doubles
 *  the rare ones). `model`: its node in fish.glb (fish_<model>); `len`: how long it is drawn in the water, in metres. */
export const FISH_TABLE = [
  { id: 'perch', name: 'Perch', value: 6, weight: 22, model: 'perch', len: 1.0 }, { id: 'carp', name: 'Carp', value: 12, weight: 16, model: 'carp', len: 1.15 },
  { id: 'clownfish', name: 'Clownfish', value: 10, weight: 13, model: 'clown', len: 0.7 }, { id: 'rainbowfish', name: 'Rainbow fish', value: 14, weight: 12, model: 'rainbow', len: 1.0 },
  { id: 'catfish', name: 'Catfish', value: 22, weight: 10, rare: true, model: 'catfish', len: 1.2 }, { id: 'koi', name: 'Koi', value: 24, weight: 9, rare: true, model: 'koi', len: 1.3 },
  { id: 'eel', name: 'Eel', value: 28, weight: 7, rare: true, model: 'eel', len: 1.8 }, { id: 'pike', name: 'Blue pike', value: 36, weight: 5, rare: true, model: 'icepike', len: 2.0 },
  { id: 'goldfish', name: 'Golden carp', value: 70, weight: 3, rare: true, model: 'golden', len: 0.85 }, { id: 'sunfish', name: 'Sunfish', value: 60, weight: 2, rare: true, model: 'sunfish', len: 2.4 },
  { id: 'pond_giant', name: 'Crystal giant', value: 100, weight: 1, rare: true, model: 'guardian', len: 3.0 },
];
export const ANIMALS = {
  hen: { name: 'Hen', home: 'coop', eats: 'chicken_feed', gives: 'egg', everyMs: 45_000, price: 40, freeFirst: 2, level: 2, perHome: 8 },
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
  apple_juice:  { name: 'Apple juice', at: 'juice_press', needs: { apple: 3 }, makes: 1, timeMs: 40_000, value: 40, level: 6, icon: '🧃' },
  carrot_juice: { name: 'Carrot juice', at: 'juice_press', needs: { carrot: 4 }, makes: 1, timeMs: 45_000, value: 26, level: 6, icon: '🥕' },
  orange_juice: { name: 'Orange juice', at: 'juice_press', needs: { orange: 3 }, makes: 1, timeMs: 60_000, value: 70, level: 6, icon: '🍊' },
  noodles:      { name: 'Noodles', at: 'noodle_factory', needs: { wheat: 4, egg: 1 }, makes: 2, timeMs: 60_000, value: 30, level: 8, icon: '🍜' },
  instant_noodles: { name: 'Instant noodles', at: 'noodle_factory', needs: { noodles: 2, carrot: 1 }, makes: 1, timeMs: 2 * MIN, value: 95, level: 9, icon: '🍲' },
};
/** Every good the barn can hold: { id → { name, value, icon, kind } }. */
export const GOODS = {
  ...Object.fromEntries(Object.entries(CROPS).map(([id, c]) => [id, { name: c.name, value: c.value, icon: c.icon, kind: 'crop', level: c.level }])),
  ...Object.fromEntries(FISH_TABLE.map(f => [f.id, { name: f.name, value: f.value, icon: '🐟', kind: 'fish', level: 2 }])),
  ...Object.fromEntries(Object.entries(FRUITS).map(([id, f]) => [id, { name: f.name, value: f.value, icon: f.icon, kind: 'fruit', level: f.level }])),
  ...Object.fromEntries(Object.entries(PRODUCE).map(([id, p]) => [id, { ...p, kind: 'produce', level: Object.values(ANIMALS).find(a => a.gives === id).level }])),
  ...Object.fromEntries(Object.entries(RECIPES).map(([id, r]) => [id, { name: r.name, value: r.value, icon: r.icon, kind: id.endsWith('_feed') ? 'feed' : 'product', level: r.level }])),
};
