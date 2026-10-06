// Which model draws each placed kind, and how big. Sizes are in metres; `lod` picks the level-of-detail family
// (TECH-PLAN 6). farm-kit.glb comes from art/blender/build_farm_kit.py.
export const KIND_MODELS = {
  coop:      { kit: 'farm', node: 'coop', width: 3.6, lod: 'static' },
  cow_barn:  { kit: 'farm', node: 'cow_shelter', width: 5.6, lod: 'static' },
  feed_mill: { kit: 'farm-kit', node: 'feed_mill', width: 3.6, lod: 'static' },
  bakery:    { kit: 'farm-kit', node: 'bakery', width: 5.4, lod: 'static' },
  stall:     { kit: 'market-stall', node: 'market-stall', width: 3.8, lod: 'static' },
  school:    { kit: 'town', node: 'school', width: 9.6, lod: 'static' },
  flowers:   { kit: 'scenery', node: 'flowers', width: 1.4, lod: 'crop' },
  bush:      { kit: 'scenery', node: 'bush', width: 1.7, lod: 'crop' },
  tree:      { kit: 'scenery', node: 'tree_blossom', height: 4.5, lod: 'tree' },
  bench:     { kit: 'farm-kit', node: 'bench', width: 1.5, lod: 'static' },
  lamp:      { kit: 'farm-kit', node: 'lamp', height: 2.5, lod: 'static' },
  fence:     { kit: 'farm', node: 'pen_fence', width: 2, lod: 'static' },
  gate:      { kit: 'farm', node: 'pen_gate', width: 2, lod: 'static' },
  weeds:     { kit: 'scenery', node: 'tuft', width: 1.3, lod: 'crop' },
  weeds2:    { kit: 'scenery', node: 'bush', width: 1.1, lod: 'crop' },
  rock:      { kit: 'scenery', node: 'rock', width: 1.5, lod: 'crop' },
  hen:       { kit: 'farm', node: 'chicken', height: 0.7, lod: 'animal' },
  cow:       { kit: 'farm', node: 'cow', height: 1.6, lod: 'animal' },
  order_board: { kit: 'farm-kit', node: 'order_board', height: 2.3, lod: 'static' },
  'crop:sprout':  { kit: 'crops', node: 'crop_sprout', width: 0.9, lod: 'crop' },
  'crop:wheat':   { kit: 'farm-kit', node: 'crop_wheat', width: 1.3, lod: 'crop' },
  'crop:carrot':  { kit: 'crops', node: 'crop_carrot', width: 1.4, lod: 'crop' },
  'crop:corn':    { kit: 'crops', node: 'crop_goldcorn', width: 1.3, lod: 'crop' },
  'crop:pumpkin': { kit: 'crops', node: 'crop_pumpkin', width: 1.5, lod: 'crop' },
  'produce:egg':  { kit: 'animal-produce', node: 'egg', height: 0.32, lod: 'static' },
  'produce:milk': { kit: 'animal-produce', node: 'milk', height: 0.5, lod: 'static' },
};
/** Cottages cycle through the town's five house styles. */
export const COTTAGE_STYLES = ['house_gable', 'house_front', 'house_hip', 'house_tall', 'house_round'];
for (const h of COTTAGE_STYLES) KIND_MODELS[`cottage_${h}`] = { kit: 'town', node: h, width: 5.6, lod: 'static' };
export const modelFor = (kind, id) => kind === 'cottage' ? `cottage_${COTTAGE_STYLES[(parseInt(id.slice(1), 10) || 0) % COTTAGE_STYLES.length]}` : kind;
