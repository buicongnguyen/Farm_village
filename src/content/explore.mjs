// First room only. IDs are independent of language and of the older picnic exploration trail.
export const HOME_APPROACH = [51, 125];
export const HOME_MEMORY = {
  id: 'home_garden_drawing', title: 'A garden drawn together', speaker: 'pip',
  text: 'I drew our garden! This little corner is for flowers, and this big bit is for adventures together.',
  reply: 'There is room for all our ideas here. We can grow them one at a time.',
};
/** What each farmhouse level adds to the room (art: build_farm_kit.py comfort(), kit interior-extras.glb, one node a
 *  level in room coordinates). `collider` ([x0, z0, x1, z1] in metres) is given for the pieces that stand on the floor. */
export const HOME_COMFORT = [
  { level: 2, node: 'home_L2', name: 'Pictures on the walls' },
  { level: 3, node: 'home_L3', name: 'A tall house plant', collider: [-3.6, -2.6, -3.0, -2.0] },
  { level: 4, node: 'home_L4', name: 'A reading lamp', collider: [-3.6, 0.72, -3.1, 1.12] },
  { level: 5, node: 'home_L5', name: 'A second rug' },
  { level: 6, node: 'home_L6', name: 'A big painting' },
  { level: 7, node: 'home_L7', name: 'A piano', collider: [2.95, -0.95, 3.85, 0.45] },
  { level: 8, node: 'home_L8', name: 'A chandelier' },
  { level: 9, node: 'home_L9', name: 'A grandfather clock', collider: [-3.85, 2.4, -3.35, 2.85] },
  { level: 10, node: 'home_L10', name: 'A golden trophy', collider: [1.3, 2.2, 1.9, 2.85] },
];
/** The room as it is at this house level: the kit's metadata with the colliders of what has been added. */
export function roomAtLevel(data, level) {
  const comforts = HOME_COMFORT.filter(c => level >= c.level).map(c => {
    const [, x = 0, z = 0] = data.comfortOffsets?.find(o => o[0] === c.level) ?? [];
    return { ...c, position: [x, 0, z], collider: c.collider?.map((v, i) => v + (i % 2 ? z : x)) };
  });
  return { ...data, comforts, colliders: [...data.colliders, ...comforts.filter(c => c.collider).map(c => ({ id: c.node, min: c.collider.slice(0, 2), max: c.collider.slice(2) }))] };
}
export const HOME_OBJECTS = {
  farmhouse_sofa: { label: 'Sit on the sofa' },
  farmhouse_memory_shelf: { label: 'Look at the memory shelf' },
  farmhouse_kitchen: { label: 'Use the kitchen' },
  farmhouse_desk: { label: 'Sit at the desk' },
  farmhouse_table: { label: 'Plan the day' },
  farmhouse_wardrobe: { label: 'Open the wardrobe' },
  farmhouse_exit: { label: 'Go outside' },
};
const MIN = 60_000;
// Cosy things to do at home, after Zoo Garden's cottage: each has a wall-clock cooldown and a small, kind reward.
// tea: a pot shared with the neighbour you know least (+1 heart), or a quiet cup (+XP) while nobody has moved in.
// draw: a drawing in the journal (+XP); the drawings are counted on the memory shelf.
export const HOME_ACTIVITIES = {
  tea: { at: 'farmhouse_kitchen', cooldownMs: 30 * 60_000, hearts: 1, xp: 5 },
  draw: { at: 'farmhouse_desk', cooldownMs: 8 * 60_000, xp: 5, max: 99 },
};

// The little things around the house, after the house in Willowmere (the owner's own village game: house-rules.mjs), under
// Hollowbrook's rules: there is no energy here, so a rested thing gives a little XP and the rest answer with a line.
// `lines` take turns. `cooldownMs` + `xp`: the reward waits that long (the line never does). `count`: how many you have
// made, kept on the memory shelf. `extra`: a second button. `panel`: it opens that panel instead of a card.
export const HOME_THINGS = {
  fireplace: { name: 'The fireplace', label: 'Fireplace', verb: 'Warm your hands', intro: 'The logs crackle and the room smells of apple wood.',
    lines: ['Your hands are warm again. Chestnuts were roasted here, once.', 'The fire pops and settles. A good place to think.'], xp: 2, cooldownMs: 10 * MIN },
  armchair: { name: 'The armchair', label: 'Armchair', verb: 'Read a chapter', intro: 'A sunny chair with a book left open on its arm.',
    lines: ['One chapter in the sunny chair. Lovely.', 'The story was just getting good. The rest can wait for tomorrow.'], xp: 3, cooldownMs: 15 * MIN },
  bath: { name: 'The bathtub', label: 'Bath', verb: 'Run a bath', intro: 'Warm water, lavender soap and one rubber duck.',
    lines: ['Warm water and lavender soap. Somebody insisted on bubbles.', 'You come out clean and a little sleepy.'], xp: 4, cooldownMs: 20 * MIN,
    extra: { verb: 'Squeeze the duck', lines: ['Squeak! The duck has seen many adventures.', 'Squeak, squeak. It floats off looking pleased.'] } },
  sink: { name: 'The sink', label: 'Sink', verb: 'Wash your hands', intro: 'Cold, clear water from the old well pipe.',
    lines: ['Fresh, cold water. The farm dirt swirls away.', 'Clean hands, ready for supper.'] },
  bed: { name: 'The bed', label: 'Bed', verb: 'Lie down a moment', intro: 'A patchwork quilt, turned down and waiting.',
    lines: ['Forty winks. The farm will still be there.', 'The quilt smells of sun and lavender.'] },
  easel: { name: 'The easel', label: 'Easel', verb: 'Paint a little', intro: 'A canvas, three brushes and a jar of willow green.',
    lines: ['A few strokes of willow green. It needs a chicken, the family says.', 'The valley at sunrise, almost right. One more painting for the wall.'], xp: 5, cooldownMs: 10 * MIN, count: 'paintings' },
  yarn: { name: 'The yarn basket', label: 'Yarn', verb: 'Knit a row', intro: 'A scarf grows here, one row at a time. Every tenth row finishes one to give away.',
    lines: ['One more row. The scarf is getting long.', 'Knit, purl, knit. The needles click along.'], xp: 2, cooldownMs: 5 * MIN, count: 'rows', every: 10, hearts: 1, gift: 10 },
  globe: { name: 'The globe', label: 'Globe', verb: 'Spin the globe', intro: 'An old globe, a little faded along the equator.',
    lines: ['Round and round… it stops on Hollowbrook, of course.', 'It stops in the middle of the sea. A voyage for another day.', 'It stops on a mountain range. Someone there is farming too.'] },
  fridge: { name: 'The fridge', label: 'Fridge', intro: 'It hums to itself in the corner.', shows: ['egg', 'milk', 'butter', 'cheese', 'bread'] },
  books: { name: 'The bookshelf', label: 'Farm notebook', verb: 'Open the farm notebook', panel: 'knowhow' },
  mirror: { name: 'The mirror', label: 'Mirror', verb: 'Look in the mirror', card: 'wardrobe' },
};
for (const [id, th] of Object.entries(HOME_THINGS)) {
  th.id = id; HOME_OBJECTS[`farmhouse_${id}`] = { label: th.verb ?? 'Look inside', thing: id };
  if (th.cooldownMs) HOME_ACTIVITIES[id] = { at: `farmhouse_${id}`, cooldownMs: th.cooldownMs, xp: th.xp };
}
export const HOME_MADE = { paintings: 99, rows: 990 };   // the most of each that is counted

// The family at home (after the house life of Willowmere, the owner's own game): they walk from one thing to the next,
// stop a while at each in a pose, and say a line as they arrive. They are company only: you walk through them, nothing
// is saved, and they wave when you come near. rounds: [the thing they go to, the clip they hold there, what they say].
export const HOME_FAMILY = [
  { id: 'june', body: 'woman', height: 1.8, rounds: [
    ['farmhouse_kitchen', 'Carry', 'Supper will be ready when it is ready.'], ['farmhouse_fireplace', 'Sweep', 'Ash again. The fire eats and never tidies.'],
    ['farmhouse_yarn', 'Idle', 'Ten rows make a scarf. I count every one.'], ['farmhouse_table', 'Talk', 'Sit a moment. The fields can wait five minutes.']] },
  { id: 'pip', body: 'kid', height: 1.3, rounds: [
    ['farmhouse_easel', 'Cheer', 'It needs a chicken. Everything needs a chicken.'], ['farmhouse_globe', 'Jump', 'I found where we live! It is very small.'],
    ['farmhouse_bath', 'Wave', 'The duck is the captain. I am only crew.'], ['farmhouse_armchair', 'Idle', 'I am reading. The pictures, mostly.']] },
  { id: 'ada', body: 'hana', height: 1.7, rounds: [
    ['farmhouse_fridge', 'Knead', 'Dough tells you when it is ready. You only have to listen.'], ['farmhouse_books', 'Idle', 'Every trick in that notebook was a mistake first.'],
    ['farmhouse_sofa', 'Talk', 'Sit, sit. You have earned a chair.'], ['farmhouse_desk', 'Idle', 'A tidy desk. Somebody in this house is hiding something.']] },
];
