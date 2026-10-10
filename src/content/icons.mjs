// Rendered icons (art package): id → image URL, 256 px WebP from art/blender/render_icons.py (job list in
// art/blender/icons.json). Ids: goods and buildings by their content id (wheat, bread, coop ...), tools as 'tool:<name>'
// (clear, harvest, move, store, build), HUD symbols as 'ui:<name>' (coin, xp, heart, barn, orders), people as
// 'person:<id>', families as 'family:<id>', and the one-time lucky finds by their root in discovery-props.glb (lucky_tin,
// lucky_button, lucky_box). Use iconUrl(id) for a lookup that tolerates unknown ids.
const BASE = './assets/icons/';
const GOODS = ['cherry', 'wheat', 'carrot', 'corn', 'pumpkin', 'herb', 'ginseng', 'strawberry', 'tomato', 'potato', 'cabbage', 'onion', 'chili', 'egg', 'milk', 'chicken_feed', 'cow_feed', 'goat_feed', 'goat_milk', 'butter', 'cheese', 'bread', 'corn_bread', 'carrot_cake', 'apple', 'peach', 'orange', 'coconut', 'apple_juice', 'carrot_juice', 'orange_juice', 'noodles', 'instant_noodles', 'apple_pie', 'perch', 'carp', 'catfish', 'goldfish', 'clownfish', 'rainbowfish', 'koi', 'eel', 'pike', 'sunfish', 'pond_giant',
  'lemon', 'plum', 'mango', 'grape', 'longan', 'lychee'];   // tree pack 2 fruit (AR-014)
const BUILDINGS = ['juice_press', 'noodle_factory', 'orange_tree', 'coconut_palm', 'willow', 'cherry_tree', 'fruit_stand', 'kennel', 'clinic', 'bed', 'path', 'fence', 'gate', 'coop', 'cow_barn', 'feed_mill', 'bakery', 'stall', 'market', 'pond', 'truck', 'round_tree', 'pine_tree', 'cottage', 'flowers', 'bush', 'tree', 'bench', 'lamp', 'school', 'fountain', 'picket', 'garden_flower', 'scarecrow', 'hay_bale', 'flowerpot', 'street_lamp', 'apple_tree', 'peach_tree', 'bunting', 'banner', 'sale_sign',
  'maple', 'birch', 'cypress', 'fir', 'great_oak', 'lemon_tree', 'plum_tree', 'mango_tree', 'grape_arbor', 'longan_tree', 'lychee_tree'];   // tree pack 2 (AR-014)
BUILDINGS.push('police', 'company', 'hospital', 'goat_barn', 'dairy', 'dock'); // AR-011 renders (hospital = the clinic's upgrade, s.growth.hospitalAt)
const TOOLS = ['tool:clear', 'tool:harvest', 'tool:move', 'tool:store', 'tool:build'];
const UI = ['ui:coin', 'ui:xp', 'ui:heart', 'ui:barn', 'ui:orders'];
const PEOPLE = ['person:hazel', 'person:hugo', 'person:pearl', 'person:bea', 'person:ada', 'person:cora', 'person:pip', 'person:minh', 'person:lan', 'person:bo', 'person:grace', 'person:sam', 'person:zara', 'person:elin', 'person:olaf', 'person:marisol', 'person:tomas', 'person:pia', 'person:june', 'person:mai', 'person:gus'];
const KEEPSAKES = ['lucky_tin', 'lucky_button', 'lucky_box'];
const TRAIL = ['trail_picnic_ribbon'];   // the old-object discovery trail (AR-010)
const ANIMALS = ['hen', 'cow', 'goat'];   // AR-012: rendered from the rigged models that walk in the world
const MENU = ['ui:today', 'ui:projects', 'ui:mail', 'tool:demolish', 'ui:harvest_all'];   // AR-012 menu pictures
const FAMILIES = ['family:tran', 'family:okafor', 'family:lindqvist', 'family:reyes'];
export const ICON_IDS = { goods: GOODS, buildings: BUILDINGS, tools: TOOLS, ui: UI, people: PEOPLE, families: FAMILIES, keepsakes: KEEPSAKES, trail: TRAIL, animals: ANIMALS, menu: MENU };
export const ICONS = Object.fromEntries([...GOODS, ...BUILDINGS, ...TOOLS, ...UI, ...PEOPLE, ...FAMILIES, ...KEEPSAKES, ...TRAIL, ...ANIMALS, ...MENU].map(id => [id, `${BASE}${id.replace(':', '-')}.webp`]));
/** AR-012: 64 px variants for chip-size pictures (mini, mark, seed, status), one for every icon above, same file names
 *  under assets/icons/sm/ (tests/assets.test.mjs checks they all exist). Data only: the interface chooses when to use them. */
export const SMALL_ICONS = Object.fromEntries(Object.entries(ICONS).map(([id, url]) => [id, url.replace('/icons/', '/icons/sm/')]));
/** The icon URL for an id, or null. A person's id may be given with or without the 'person:' prefix. */
export const iconUrl = id => ICONS[id] ?? ICONS[`person:${id}`] ?? null;
