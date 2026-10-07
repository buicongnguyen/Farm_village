// Rendered icons (art package): id → image URL, 256 px WebP from art/blender/render_icons.py (job list in
// art/blender/icons.json). Ids: goods and buildings by their content id (wheat, bread, coop ...), tools as 'tool:<name>'
// (clear, harvest, move, store, build), HUD symbols as 'ui:<name>' (coin, xp, heart, barn, orders), people as
// 'person:<id>' and families as 'family:<id>'. Use iconUrl(id) for a lookup that tolerates unknown ids.
const BASE = './assets/icons/';
const GOODS = ['wheat', 'carrot', 'corn', 'pumpkin', 'strawberry', 'egg', 'milk', 'chicken_feed', 'cow_feed', 'bread', 'corn_bread', 'carrot_cake', 'apple', 'peach', 'apple_pie', 'perch', 'carp', 'catfish', 'goldfish'];
const BUILDINGS = ['bed', 'path', 'fence', 'gate', 'coop', 'cow_barn', 'feed_mill', 'bakery', 'stall', 'market', 'pond', 'truck', 'round_tree', 'pine_tree', 'cottage', 'flowers', 'bush', 'tree', 'bench', 'lamp', 'school', 'fountain', 'picket', 'garden_flower', 'scarecrow', 'hay_bale', 'flowerpot', 'street_lamp', 'apple_tree', 'peach_tree', 'bunting', 'banner', 'sale_sign'];
const TOOLS = ['tool:clear', 'tool:harvest', 'tool:move', 'tool:store', 'tool:build'];
const UI = ['ui:coin', 'ui:xp', 'ui:heart', 'ui:barn', 'ui:orders'];
const PEOPLE = ['person:ada', 'person:cora', 'person:pip', 'person:minh', 'person:lan', 'person:bo', 'person:grace', 'person:sam', 'person:zara', 'person:elin', 'person:olaf', 'person:marisol', 'person:tomas', 'person:pia', 'person:june', 'person:mai', 'person:gus'];
const FAMILIES = ['family:tran', 'family:okafor', 'family:lindqvist', 'family:reyes'];
export const ICON_IDS = { goods: GOODS, buildings: BUILDINGS, tools: TOOLS, ui: UI, people: PEOPLE, families: FAMILIES };
export const ICONS = Object.fromEntries([...GOODS, ...BUILDINGS, ...TOOLS, ...UI, ...PEOPLE, ...FAMILIES].map(id => [id, `${BASE}${id.replace(':', '-')}.webp`]));
/** The icon URL for an id, or null. A person's id may be given with or without the 'person:' prefix. */
export const iconUrl = id => ICONS[id] ?? ICONS[`person:${id}`] ?? null;
