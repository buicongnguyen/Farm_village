// Which model draws each placed kind, and how big. Sizes are in metres; `lod` picks the level-of-detail family
// (TECH-PLAN 6). Kinds marked `placeholder` wait for their own Blender model (TECH-PLAN 5, ROADMAP M3).
export const KIND_MODELS = {
  coop:      { kit: 'farm', node: 'coop', width: 3.6, lod: 'static' },
  cow_barn:  { kit: 'farm', node: 'cow_shelter', width: 5.6, lod: 'static' },
  feed_mill: { kit: 'rural', node: 'silo', width: 3, lod: 'static', placeholder: true },
  bakery:    { kit: 'town', node: 'house_round', width: 5.4, lod: 'static', placeholder: true },
  stall:     { kit: 'market-stall', node: 'market-stall', width: 3.8, lod: 'static' },
  school:    { kit: 'town', node: 'school', width: 9.6, lod: 'static' },
  flowers:   { kit: 'scenery', node: 'flowers', width: 1.4, lod: 'crop' },
  bush:      { kit: 'scenery', node: 'bush', width: 1.7, lod: 'crop' },
  tree:      { kit: 'scenery', node: 'tree_blossom', height: 4.5, lod: 'tree' },
  bench:     { kit: 'rural', node: 'stump', width: 1.4, lod: 'static', placeholder: true },
  lamp:      { kit: 'rural', node: 'mailbox', height: 2.2, lod: 'static', placeholder: true },
  fence:     { kit: 'farm', node: 'pen_fence', width: 2, lod: 'static' },
  gate:      { kit: 'farm', node: 'pen_gate', width: 2, lod: 'static' },
  weeds:     { kit: 'scenery', node: 'tuft', width: 1.3, lod: 'crop' },
  weeds2:    { kit: 'scenery', node: 'bush', width: 1.1, lod: 'crop' },
  rock:      { kit: 'scenery', node: 'rock', width: 1.5, lod: 'crop' },
  hen:       { kit: 'farm', node: 'chicken', height: 0.7, lod: 'animal' },
  cow:       { kit: 'farm', node: 'cow', height: 1.6, lod: 'animal' },
};
/** Cottages cycle through the town's five house styles. */
export const COTTAGE_STYLES = ['house_gable', 'house_front', 'house_hip', 'house_tall', 'house_round'];
for (const h of COTTAGE_STYLES) KIND_MODELS[`cottage_${h}`] = { kit: 'town', node: h, width: 5.6, lod: 'static' };
export const modelFor = (kind, id) => kind === 'cottage' ? `cottage_${COTTAGE_STYLES[(parseInt(id.slice(1), 10) || 0) % COTTAGE_STYLES.length]}` : kind;
