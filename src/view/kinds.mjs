// Which model draws each placed kind, and how big (TECH-PLAN 6). Sizes are in metres: `width` (footprint), `height`, or
// `authored: true` for pieces modelled at their real size around the footprint centre (farm-kit and decor, made by
// art/blender/build_farm_kit.py; their ANCHORS are in the same space). `lod` picks the level-of-detail family.
// `late: true` kits load after the first frame (land-view registers them in its second wave); until then an item
// whose kind has an EARLY stand-in draws with that, and anything else waits.
export const KIND_MODELS = {
  coop:      { kit: 'farm-kit', node: 'coop', authored: true, lod: 'static' },
  cow_barn:  { kit: 'farm-kit', node: 'cow_barn', authored: true, lod: 'static' },
  goat_barn: { kit: 'decor', node: 'goat_barn', authored: true, lod: 'static', late: true },   // v0.5 (decor kit: loaded after the first scene)
  dairy:     { kit: 'decor', node: 'dairy', authored: true, lod: 'static', late: true },
  feed_mill: { kit: 'farm-kit', node: 'feed_mill', authored: true, lod: 'static' },
  feed_mill_sails: { kit: 'farm-kit', node: 'feed_mill_sails', authored: true, lod: 'static', ao: 0 },
  bakery:    { kit: 'farm-kit', node: 'bakery', authored: true, lod: 'static' },
  cherry_tree: { kit: 'farm-kit', node: 'cute_cherry', width: 3.2, lod: 'tree' },
  'cherry_tree:bare': { kit: 'farm-kit', node: 'cute_cherry_bare', width: 3.2, lod: 'tree' },
  fruit_stand: { kit: 'farm-kit', node: 'fruit_stand', authored: true, lod: 'static' },
  kennel: { kit: 'farm-kit', node: 'kennel', authored: true, lod: 'static' },
  clinic: { kit: 'town', node: 'hospital', width: 7.8, lod: 'static', late: true },
  // AR-011: the clinic's hospital upgrade (s.growth.hospitalAt); same 4 x 3 footprint, door at the front centre. Codex selects it.
  // Tree pack 2: later trees, one or two per chapter (docs/ASSET-REQUESTS.md AR-014). Codex adds the catalogue and the levels.
  maple: { kit: 'decor', node: 'tree2_maple', width: 3.4, lod: 'tree', late: true },
  birch: { kit: 'decor', node: 'tree2_birch', height: 5.4, lod: 'tree', late: true },
  cypress: { kit: 'decor', node: 'tree2_cypress', height: 4.8, lod: 'tree', late: true },
  fir: { kit: 'decor', node: 'tree2_fir', height: 7.2, lod: 'tree', late: true },
  great_oak: { kit: 'decor', node: 'tree2_oak', width: 6.6, lod: 'tree', late: true },
  lemon_tree: { kit: 'decor', node: 'tree2_lemon', width: 3.4, lod: 'tree', late: true },
  'lemon_tree:bare': { kit: 'decor', node: 'tree2_lemon_bare', width: 3.4, lod: 'tree', late: true },
  plum_tree: { kit: 'decor', node: 'tree2_plum', width: 3.4, lod: 'tree', late: true },
  'plum_tree:bare': { kit: 'decor', node: 'tree2_plum_bare', width: 3.4, lod: 'tree', late: true },
  mango_tree: { kit: 'decor', node: 'tree2_mango', width: 4.2, lod: 'tree', late: true },
  'mango_tree:bare': { kit: 'decor', node: 'tree2_mango_bare', width: 4.2, lod: 'tree', late: true },
  grape_arbor: { kit: 'decor', node: 'tree2_grape', width: 2.0, lod: 'static', late: true },
  'grape_arbor:bare': { kit: 'decor', node: 'tree2_grape_bare', width: 2.0, lod: 'static', late: true },
  longan_tree: { kit: 'decor', node: 'tree2_longan', width: 3.6, lod: 'tree', late: true },
  'longan_tree:bare': { kit: 'decor', node: 'tree2_longan_bare', width: 3.6, lod: 'tree', late: true },
  lychee_tree: { kit: 'decor', node: 'tree2_lychee', width: 3.6, lod: 'tree', late: true },
  'lychee_tree:bare': { kit: 'decor', node: 'tree2_lychee_bare', width: 3.6, lod: 'tree', late: true },
  // AR-013: the old potting bench's three stages (fixed site, learning-site.mjs); Codex maps stage -> model
  potting_bench_overgrown: { kit: 'decor', node: 'potting_bench_overgrown', authored: true, lod: 'static', late: true },
  potting_bench_repaired: { kit: 'decor', node: 'potting_bench_repaired', authored: true, lod: 'static', late: true },
  potting_bench_done: { kit: 'decor', node: 'potting_bench_done', authored: true, lod: 'static', late: true },
  'clinic:hospital': { kit: 'decor', node: 'hospital', authored: true, lod: 'static', late: true },
  police: { kit: 'town', node: 'police', width: 6, lod: 'static', late: true }, // existing model, stand-in for AR-011
  company: { kit: 'town', node: 'company', width: 8, lod: 'static', late: true }, // existing model, stand-in for AR-011
  stall:     { kit: 'market-stall', node: 'market-stall', width: 3.8, lod: 'static' },
  market:    { kit: 'market-stall', node: 'market-stall', width: 5.4, lod: 'static' },
  pond:      { kit: 'farm-kit', node: 'pond', authored: true, lod: 'static' },
  truck:     { kit: 'farm-kit', node: 'truck', authored: true, lod: 'static' },
  truck_teal: { kit: 'decor', node: 'truck_teal', authored: true, lod: 'static', late: true },   // the 2nd and 3rd trucks (land-view)
  truck_sun:  { kit: 'decor', node: 'truck_sun', authored: true, lod: 'static', late: true },
  school:    { kit: 'town', node: 'school', width: 9.6, lod: 'static', late: true },
  flowers:   { kit: 'nature', node: 'flowers_a', width: 1.5, lod: 'crop', late: true },
  round_tree: { kit: 'farm-kit', node: 'cute_round', width: 3.4, lod: 'tree' },
  pine_tree: { kit: 'farm-kit', node: 'cute_pine', width: 3.0, lod: 'tree' },
  bush:      { kit: 'nature', node: 'bush_a', width: 1.6, lod: 'crop', late: true },
  tree:      { kit: 'farm-kit', node: 'cute_blossom', width: 3.8, lod: 'tree' },
  bench:     { kit: 'farm-kit', node: 'bench', authored: true, lod: 'static' },
  lamp:      { kit: 'farm-kit', node: 'lamp', authored: true, lod: 'static' },
  fence:     { kit: 'farm-kit', node: 'picket_straight', authored: true, lod: 'static' },
  gate:      { kit: 'farm-kit', node: 'picket_gate', authored: true, lod: 'static' },
  'fence:post':   { kit: 'farm-kit', node: 'picket_post', authored: true, lod: 'static' },
  'fence:corner': { kit: 'farm-kit', node: 'picket_corner', authored: true, lod: 'static' },
  'fence:t':      { kit: 'farm-kit', node: 'picket_t', authored: true, lod: 'static' },
  weeds:     { kit: 'scenery', node: 'tuft', width: 1.3, lod: 'crop' },
  weeds2:    { kit: 'scenery', node: 'bush', width: 1.1, lod: 'crop' },
  rock:      { kit: 'scenery', node: 'rock', width: 1.5, lod: 'crop' },
  hen:       { kit: 'farm', node: 'chicken', height: 0.7, lod: 'animal' },
  cow:       { kit: 'farm', node: 'cow', height: 1.6, lod: 'animal' },
  goat:      { kit: 'farm', node: 'goat', height: 1.1, lod: 'animal', late: true },
  goose:     { kit: 'farm', node: 'goose', height: 0.8, lod: 'animal', late: true },
  order_board: { kit: 'farm-kit', node: 'order_board', authored: true, lod: 'static' },
  'produce:egg':  { kit: 'animal-produce', node: 'egg', height: 0.32, lod: 'static' },
  'produce:milk': { kit: 'animal-produce', node: 'milk', height: 0.5, lod: 'static' },
  // decorations and fruit trees the play package adds (drawn as soon as their kind exists in BUILDINGS)
  fountain:     { kit: 'decor', node: 'fountain', authored: true, lod: 'static', late: true },
  survey_stakes: { kit: 'decor', node: 'survey_stakes', authored: true, lod: 'static', late: true },   // chapter 11: on the meadow while the offer is open
  car:          { kit: 'decor', node: 'car', authored: true, lod: 'static', late: true },   // Mr Albright's, on the verge by the gate
  cannery:      { kit: 'decor', node: 'cannery', authored: true, lod: 'static', late: true },   // chapter 11: on the brook meadow, if the offer is taken
  beehive:      { kit: 'decor', node: 'beehive', authored: true, lod: 'static', late: true },   // chapter 11: for the kept meadow
  stage:        { kit: 'decor', node: 'stage', authored: true, lod: 'static', late: true },          // chapter 9: the festival stage on the square
  stage_burned: { kit: 'decor', node: 'stage_burned', authored: true, lod: 'static', late: true },   // what is left of the old one, until it is rebuilt
  dock:         { kit: 'decor', node: 'dock', authored: true, lod: 'static', late: true },   // chapter 7: the pier reaches north of its footprint, over the brook
  bunting:      { kit: 'decor', node: 'bunting', authored: true, lod: 'static', late: true },
  banner:       { kit: 'decor', node: 'banner', authored: true, lod: 'static', late: true },
  picket:       { kit: 'farm-kit', node: 'picket_straight', authored: true, lod: 'static' },
  garden_flower: { kit: 'nature', node: 'flowers_b', width: 1.2, lod: 'crop', late: true },
  scarecrow:    { kit: 'props', node: 'scarecrow', height: 2.2, lod: 'static', late: true },
  hay_bale:     { kit: 'props', node: 'haybale', width: 1.5, lod: 'static', late: true },
  flowerpot:    { kit: 'props', node: 'flowerpot', width: 1.1, lod: 'static', late: true },
  street_lamp:  { kit: 'props', node: 'street_lamp', height: 3, lod: 'static', late: true },
  apple_tree:   { kit: 'farm-kit', node: 'cute_apple', width: 3.6, lod: 'tree' },
  'apple_tree:bare': { kit: 'farm-kit', node: 'cute_apple_bare', width: 3.6, lod: 'tree' },
  peach_tree:   { kit: 'farm-kit', node: 'cute_peach', width: 3.6, lod: 'tree' },
  'peach_tree:bare': { kit: 'farm-kit', node: 'cute_peach_bare', width: 3.6, lod: 'tree' },
  orange_tree:  { kit: 'farm-kit', node: 'cute_orange', width: 3.6, lod: 'tree' },
  'orange_tree:bare': { kit: 'farm-kit', node: 'cute_orange_bare', width: 3.6, lod: 'tree' },
  coconut_palm: { kit: 'farm-kit', node: 'cute_palm', height: 5.2, lod: 'tree' },
  'coconut_palm:bare': { kit: 'farm-kit', node: 'cute_palm_bare', height: 5.2, lod: 'tree' },
  willow:       { kit: 'farm-kit', node: 'cute_willow', width: 3.8, lod: 'tree' },
  // dressing drawn by land-view (not placeable)
  scaffold:     { kit: 'decor', node: 'scaffold', authored: true, lod: 'static', late: true },
  juice_press:  { kit: 'decor', node: 'juice_press', authored: true, lod: 'static', late: true },
  lake_kiosk_fish: { kit: 'decor', node: 'lake_kiosk_fish', authored: true, lod: 'static', late: true },   // lakeside shops (dress.mjs)
  lake_kiosk_flowers: { kit: 'decor', node: 'lake_kiosk_flowers', authored: true, lod: 'static', late: true },
  lake_kiosk_snacks: { kit: 'decor', node: 'lake_kiosk_snacks', authored: true, lod: 'static', late: true },
  noodle_factory: { kit: 'decor', node: 'noodle_factory', authored: true, lod: 'static', late: true },
  window_box:   { kit: 'decor', node: 'window_box', authored: true, lod: 'static', late: true },
  door_lantern: { kit: 'decor', node: 'door_lantern', authored: true, lod: 'static', late: true },
  flowerpots:   { kit: 'decor', node: 'flowerpots', authored: true, lod: 'static', late: true },
  doormat:      { kit: 'decor', node: 'doormat', authored: true, lod: 'static', late: true },
  path_stones:  { kit: 'decor', node: 'path_stones', authored: true, lod: 'static', late: true },
  sale_sign:    { kit: 'decor', node: 'sale_sign', authored: true, lod: 'static', late: true },
};
/** First-frame stand-ins for late kinds (registered as `<kind>~`). */
export const EARLY = {
  flowers: { kit: 'scenery', node: 'flowers', width: 1.4, lod: 'crop' },
  bush:    { kit: 'scenery', node: 'bush', width: 1.7, lod: 'crop' },
  tree:    { kit: 'farm-kit', node: 'cute_blossom', height: 4.5, lod: 'tree' },
  garden_flower: { kit: 'scenery', node: 'flowers', width: 1.2, lod: 'crop' },
};

// ── Crops: three growth stages, authored at their real size in farm-kit.glb ──
export const CROP_MODELS = ['wheat', 'carrot', 'corn', 'pumpkin', 'strawberry', 'herb', 'ginseng', 'tomato', 'potato', 'cabbage', 'onion', 'chili'];
const LATE_CROPS = new Set(['tomato', 'potato', 'cabbage', 'onion', 'chili']);   // in the decor kit, after the first scene (carrot leaves stand in until then)
export const CROP_STAGES = ['sprout', 'mid', 'ripe'];
for (const c of CROP_MODELS) for (const st of CROP_STAGES) KIND_MODELS[`crop:${c}:${st}`] = LATE_CROPS.has(c) ? { kit: 'decor', node: `crop_${c}_${st}`, authored: true, lod: 'crop', late: true } : { kit: 'farm-kit', node: `crop_${c}_${st}`, authored: true, lod: 'crop' };
for (const c of CROP_MODELS) KIND_MODELS[`crop:${c}`] = KIND_MODELS[`crop:${c}:ripe`];     // v0.1 names (life-view's cropStage)
KIND_MODELS['crop:sprout'] = KIND_MODELS['crop:wheat:sprout'];
/**
 * A crop's look for its progress (0–1): [model, scale]. Sprout below a third, the leafy middle stage up to 90 %, then
 * ripe. The middle stage grows in two steps. A crop with no models of its own borrows the carrot's leaves.
 */
export function cropLook(crop, progress) {
  const c = CROP_MODELS.includes(crop) ? crop : 'carrot';
  if (progress < 0.33) return [`crop:${c}:sprout`, progress < 0.15 ? 0.8 : 1];
  if (progress < 0.9) return [`crop:${c}:mid`, progress < 0.6 ? 0.85 : 1];
  return [CROP_MODELS.includes(crop) ? `crop:${c}:ripe` : `crop:${c}:mid`, 1];
}

/** Cottages cycle through the town's five house styles. */
export const COTTAGE_STYLES = ['house_gable', 'house_front', 'house_hip', 'house_tall', 'house_round'];
for (const h of COTTAGE_STYLES) KIND_MODELS[`cottage_${h}`] = { kit: 'town', node: h, width: 5.6, lod: 'static', late: true };
// The farmhouse grows with its comfort level (content/world.mjs HOME_GARDEN): bigger homes at levels 4 and 7, garden pieces between.
KIND_MODELS['farmhouse:2'] = { kit: 'rural-extra', node: 'home_t2', width: 9.8, lod: 'static', late: true };
KIND_MODELS['farmhouse:3'] = { kit: 'rural-extra', node: 'home_t3', width: 10.6, lod: 'static', late: true };
for (const piece of ['home_pool', 'home_loungers', 'home_gazebo', 'home_flag']) KIND_MODELS[piece] = { kit: 'decor', node: piece, authored: true, lod: 'static', late: true };
// Rental cottages have a shape of their own for each furnish level (art/blender/build_farm_kit.py rental()); the town
// houses above stand in until the decor kit has loaded.
for (const tier of [0, 1, 2]) KIND_MODELS[`cottage_t${tier}`] = { kit: 'decor', node: `cottage_t${tier}`, authored: true, lod: 'static', late: true };
export const modelFor = (kind, id) => kind === 'cottage' ? `cottage_${COTTAGE_STYLES[(parseInt(id.slice(1), 10) || 0) % COTTAGE_STYLES.length]}` : kind;

/** The size argument for models.mjs fit()/tiers() from a KIND_MODELS entry. */
export const sizeOf = spec => spec.authored ? { scale: 1 } : spec.width ? { width: spec.width } : { height: spec.height };

// ── Kit contents for other views (dress, critters, icons): the roots of the reused kits (art/blender/extract_kit.py) ──
export const KITS = {
  props: ['scarecrow', 'haybale', 'sacks', 'crate', 'barrel', 'cart', 'signpost', 'postbox', 'street_lamp', 'flowerpot', 'laundry_line', 'beehive_branch'],
  nature: ['lilypads', 'reeds', 'stepping_stone_a', 'stepping_stone_b', 'rock_a', 'rock_b', 'rock_c', 'flowers_a', 'flowers_b', 'hydrangea',
    'bush_a', 'bush_b', 'grass_tuft', 'tree_broadleaf_a', 'tree_broadleaf_b', 'tree_maple', 'tree_sakura', 'tree_chestnut',
    'tree_peach', 'tree_peach_bare', 'tree_apple', 'tree_apple_bare'],
  'rural-extra': ['silo', 'home_t0', 'home_t2', 'home_t3', 'picket_fence', 'rail_fence', 'hay_round', 'tractor', 'pond_dock', 'stump'],
  decor: ['plank_bridge', 'fountain', 'bunting', 'banner', 'sale_sign', 'scaffold', 'window_box', 'door_lantern', 'flowerpots', 'doormat',
    'path_stones', 'obstacle_bush', 'obstacle_stump', 'obstacle_log'],
  // the lucky-find keepsakes (AR-009): handheld presentation pieces, loaded only when a discovery shows one, never placed
  'discovery-props': ['lucky_tin', 'lucky_button', 'lucky_box'],
  // the old-object discovery trail (AR-010): one state of each shown at a time; placed by the logic lane, not dressed here
  'exploration-props': ['trail_porch_box_closed', 'trail_porch_box_open', 'trail_pond_cache_closed', 'trail_pond_cache_open', 'trail_picnic_ribbon'],
};

// <anchors> generated by art/blender/anchors.mjs — do not edit by hand
export const ANCHORS = {
  "goat_barn": {"window":[[1.45,1.175,1.41,0,1],[2.21,1.175,0,1,0]],"door":[[0,0.2,1.42]]},
  "dairy": {"window":[[-1.4,1.27,1.45,0,1],[1.4,1.325,1.46,0,1],[-2.26,1.4,0,-1,0],[2.26,1.4,0,1,0]],"door":[[0,0.28,1.47]],"chimney":[[-1.4,3.9,-0.5]]},
  "cottage_t0": {"window":[[0.8,1.35,1.66,0,1],[-1.96,1.375,0,-1,0],[1.96,1.375,0,1,0],[0,1.35,-1.66,0,-1]],"chimney":[[1.15,4.053,-0.5]]},
  "cottage_t1": {"window":[[0.25,1.35,1.76,0,1],[-2.86,1.375,0,-1,0],[-1.65,1.35,-1.76,0,-1],[0.15,1.35,-1.76,0,-1],[1.9,1.3,1.31,0,1],[2.66,1.3,-0.1,1,0],[1.9,1.3,-1.51,0,-1]],"chimney":[[0.55,4.225,-0.5]]},
  "cottage_t2": {"window":[[-1.75,3.5,1.91,0,1],[-1.75,3.5,-1.91,0,-1],[0.25,3.5,1.91,0,1],[0.25,3.5,-1.91,0,-1],[0.25,1.35,1.81,0,1],[-2.86,1.375,0,-1,0],[-1.65,1.35,-1.81,0,-1],[0.15,1.35,-1.81,0,-1],[1.9,1.3,1.36,0,1],[2.66,1.3,-0.1,1,0],[1.9,1.3,-1.56,0,-1]],"chimney":[[0.55,6.312,-0.5]]},
  "feed_mill": {"window":[[-0.75,2.025,1.16,0,1], [0.75,2.025,1.16,0,1], [-1.26,1.95,0.2,-1,0], [0,3.05,1.15,0,1]],"door":[[0,0.32,1.17]],"sails":[[0,3.3,1.6]],"chimney":[[-0.65,4.15,-0.65]]},
  "bakery": {"window":[[1.25,1.25,1.4,0,1], [-1.55,1.35,1.41,0,1], [-2.36,1.45,0,-1,0], [2.36,1.45,0,1,0]],"door":[[-0.2,0.3,1.42]],"chimney":[[1.5,4.45,-0.5]]},
  "coop": {"window":[[0.72,1.17,-0.015,0,1]],"door":[[0,0,0.775]]},
  "cow_barn": {"window":[[-1.65,1.275,1.56,0,1], [1.65,1.275,1.56,0,1], [-1.5,1.28,-1.54,0,-1], [-0.45,1.28,-1.54,0,-1], [-2.36,1.25,0,-1,0], [2.36,1.25,0,1,0]],"door":[[0,0.2,1.57]]},
  "feed_mill_sails": {"hub":[[0,0,0]]},
  "lamp": {"light":[[0,2.33,0]]},
  "door_lantern": {"light":[[0,0.39,0.3]]},
  "cottage_house_gable": {"window":[[-2.462,1.338,-0.914,-1,-0.02], [-1.473,1.338,1.415,-0.04,0.999], [1.473,1.338,1.415,0.04,0.999], [2.462,1.338,-0.914,1,-0.02], [0,1.502,1.468,0,1], [2.427,2.837,-0.521,0.974,-0.227]]},
  "cottage_house_front": {"window":[[-2.471,1.343,-0.488,-1,-0.02], [1.008,1.343,1.447,0.025,1], [2.471,1.343,0.185,1,0], [2.471,1.343,-1.293,1,-0.02], [-1.084,1.494,1.499,-0.228,0.974], [0,2.949,1.413,0,1]]},
  "cottage_house_hip": {"window":[[-2.606,1.381,-0.39,-1,-0.02], [-1.137,1.381,1.647,-0.024,1], [2.599,1.381,-0.39,1,-0.02], [1.28,1.575,1.703,0.228,0.974], [-0.004,2.903,1.435,0,1]]},
  "cottage_house_tall": {"window":[[1.043,1.303,1.85,0.015,1], [2.438,1.303,-0.29,1,0], [-1.126,1.672,1.908,-0.228,0.974], [-2.438,2.681,-0.29,-1,0], [-1.118,2.681,1.85,-0.021,1], [1.043,2.681,1.85,0.021,1], [2.438,2.681,-0.29,1,0], [2.4,4.155,-0.299,0.974,-0.227]]},
  "cottage_house_round": {"window":[[-1.614,1.381,0.764,-0.841,0.54], [1.43,1.381,-1.551,0.746,-0.666], [1.614,1.381,0.764,0.841,0.54], [0,1.55,1.673,0,1]]},
  "farmhouse": {"window":[[0,2.538,2.085,0,1], [-4.089,2.67,-1.21,-0.997,-0.075], [-2.725,2.67,2.085,-0.08,0.997], [2.725,2.67,2.085,0.08,0.997], [4.089,2.67,-1.21,0.997,-0.075], [-4.075,5.06,-0.949,-0.982,-0.191], [4.075,5.06,-0.949,0.982,-0.191]]}
};
// </anchors>

/**
 * World positions of a model's anchor points for a placed item { x, z, rot, y?, scale? } (as given to batches.set):
 * [{ x, y, z, nx, nz }]. nx/nz is the outward facing for windows (0 when the anchor has none).
 */
export function anchorPoints(model, label, item) {
  const pts = ANCHORS[model]?.[label] ?? [], c = Math.cos(item.rot ?? 0), s = Math.sin(item.rot ?? 0), k = item.scale ?? 1;
  return pts.map(([x, y, z, nx = 0, nz = 0]) => ({
    x: item.x + (x * c + z * s) * k, y: (item.y ?? 0) + y * k, z: item.z + (-x * s + z * c) * k,
    nx: nx * c + nz * s, nz: -nx * s + nz * c,
  }));
}
