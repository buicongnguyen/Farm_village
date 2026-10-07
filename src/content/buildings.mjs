// Everything the player can place (DESIGN 4.1). size = [width, depth] in cells at rotation 0; the door (if any) is in the
// middle of the front edge (+z at rotation 0) and must open onto a path that reaches the road (DESIGN 4.3 rule 3).
// area: 'farm' (owned parcels), 'village' (the village area) or 'any' (either).
// cost: coins, or a function of how many of this kind already exist. project: placeable once that build step is reached;
// after: once that step is done; max: how many can exist.
import { BEDS } from './economy.mjs';

export const CATEGORIES = [
  { id: 'farm', name: 'Farm' }, { id: 'animals', name: 'Animals' }, { id: 'production', name: 'Production' },
  { id: 'homes', name: 'Homes' }, { id: 'charm', name: 'Charm' }, { id: 'paths', name: 'Paths and fences' }, { id: 'projects', name: 'Projects' },
];
const COTTAGE_COSTS = [150, 250, 900, 1400, 2000, 2800, 3800, 5000, 6500, 8000];

export const BUILDINGS = {
  // Farm
  bed:        { name: 'Crop bed', cat: 'farm', size: [1, 1], area: 'farm', level: 1, cost: n => BEDS.cost(n + 1), tills: true },
  // Fruit trees (goods.mjs FRUITS): planted once, picked again and again. Pretty too, so they count as charm.
  apple_tree: { name: 'Apple tree', cat: 'farm', size: [1, 1], area: 'any', level: 2, cost: 120, fruit: 'apple', charm: 2, max: 12, model: 'tree_apple' },
  peach_tree: { name: 'Peach tree', cat: 'farm', size: [1, 1], area: 'any', level: 4, cost: 240, fruit: 'peach', charm: 2, max: 12, model: 'tree_peach' },
  // Paths and fences (fence and gate sit on cell edges)
  path:       { name: 'Path', cat: 'paths', size: [1, 1], area: 'any', level: 1, cost: 1, cell: 'path', charm: 0 },
  fence:      { name: 'Fence', cat: 'paths', edge: true, area: 'any', level: 2, cost: 3, model: 'pen_fence' },
  gate:       { name: 'Gate', cat: 'paths', edge: true, area: 'any', level: 2, cost: 10, model: 'pen_gate' },
  // Animals
  coop:       { name: 'Coop', cat: 'animals', size: [2, 2], area: 'farm', level: 2, cost: 40, door: true, animals: 'hen', project: 'mill_coop', max: 2, model: 'coop' },
  cow_barn:   { name: 'Cow barn', cat: 'animals', size: [3, 2], area: 'farm', level: 6, cost: 0, door: true, animals: 'cow', after: 'school', max: 1, model: 'cow_shelter' },
  // Production
  feed_mill:  { name: 'Feed mill', cat: 'production', size: [2, 2], area: 'farm', level: 2, cost: 30, door: true, produces: true, project: 'mill_coop', max: 1, model: 'feed_mill', charm: -1 },
  bakery:     { name: 'Bakery', cat: 'production', size: [3, 2], area: 'farm', level: 3, cost: 150, door: true, produces: true, after: 'mill_coop', max: 1, model: 'bakery', charm: -1 },
  stall:      { name: 'Roadside stall', cat: 'production', size: [2, 1], area: 'any', level: 4, cost: 80, door: true, stall: true, max: 1, model: 'market-stall' },
  // The market square: the village's old market, where the delivery truck sells (core/market.mjs)
  market:     { name: 'Market square', cat: 'projects', size: [5, 3], area: 'village', level: 1, cost: 60, door: true, market: true, max: 1, model: 'market' },
  // The fish pond: cast a line, reel in a fish; fishing villagers pay a little to sit by it (core/fishing.mjs)
  pond:       { name: 'Fish pond', cat: 'production', size: [4, 4], area: 'any', level: 2, cost: 120, pond: true, max: 2, model: 'pond', charm: 2 },
  // Homes
  cottage:    { name: 'Rental cottage', cat: 'homes', size: [3, 3], area: 'village', level: 3, cost: n => COTTAGE_COSTS[n] ?? 10000, door: true, home: true, project: 'cottage1', model: 'house', charm: 0 },
  // Charm (DESIGN 12)
  flowers:    { name: 'Flower bed', cat: 'charm', size: [1, 1], area: 'any', level: 1, cost: 5, charm: 1, model: 'flowers' },
  round_tree: { name: 'Round tree', cat: 'charm', size: [1, 1], area: 'any', level: 1, cost: 15, charm: 2, model: 'tree_round' },
  pine_tree:  { name: 'Pine tree', cat: 'charm', size: [1, 1], area: 'any', level: 2, cost: 20, charm: 2, model: 'tree_pine' },
  bush:       { name: 'Bush', cat: 'charm', size: [1, 1], area: 'any', level: 2, cost: 8, charm: 1, model: 'bush' },
  tree:       { name: 'Blossom tree', cat: 'charm', size: [1, 1], area: 'any', level: 3, cost: 25, charm: 2, model: 'tree_blossom' },
  bench:      { name: 'Bench', cat: 'charm', size: [1, 1], area: 'any', level: 3, cost: 30, charm: 2, model: 'bench' },
  lamp:       { name: 'Lamp', cat: 'charm', size: [1, 1], area: 'any', level: 4, cost: 40, charm: 2, model: 'lamp' },
  flowerpot:  { name: 'Flowerpot', cat: 'charm', size: [1, 1], area: 'any', level: 1, cost: 8, charm: 1, model: 'flowerpot' },
  hay_bale:   { name: 'Hay bale', cat: 'charm', size: [1, 1], area: 'any', level: 2, cost: 10, charm: 1, model: 'hay_bale' },
  picket:     { name: 'Picket fence', cat: 'charm', size: [1, 1], area: 'any', level: 2, cost: 6, charm: 1, model: 'picket' },
  scarecrow:  { name: 'Scarecrow', cat: 'charm', size: [1, 1], area: 'any', level: 3, cost: 20, charm: 1, model: 'scarecrow' },
  fountain:   { name: 'Fountain', cat: 'charm', size: [2, 2], area: 'any', level: 5, cost: 300, charm: 4, model: 'fountain' },
  street_lamp:{ name: 'Street lamp', cat: 'charm', size: [1, 1], area: 'any', level: 6, cost: 90, charm: 3, model: 'street_lamp' },
  // The streak garden (today.mjs): one flower for every day you visit, planted by itself by the farmhouse. Not in the catalogue.
  garden_flower: { name: 'Garden flower', cat: 'garden', size: [1, 1], area: 'any', level: 1, cost: 0, garden: true, model: 'flowers' },
  // Village projects (placed through the build order, DESIGN 11)
  school:     { name: 'School', cat: 'projects', size: [5, 4], area: 'village', level: 6, cost: 0, door: true, project: 'school', max: 1, model: 'school' },
};
export const COTTAGE_LEVELS = [{ name: 'Basic' }, { name: 'Cozy' }, { name: 'Deluxe' }];
/** Footprint size after rotation (0–3). */
export const footprint = (kind, rot = 0) => { const [w, d] = BUILDINGS[kind].size; return rot % 2 ? [d, w] : [w, d]; };
