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
export const roomAtLevel = (data, level) => ({ ...data, colliders: [...data.colliders, ...HOME_COMFORT.filter(c => c.collider && level >= c.level).map(c => ({ id: c.node, min: [c.collider[0], c.collider[1]], max: [c.collider[2], c.collider[3]] }))] });
export const HOME_OBJECTS = {
  farmhouse_sofa: { label: 'Sit on the sofa' },
  farmhouse_memory_shelf: { label: 'Look at the memory shelf' },
  farmhouse_kitchen: { label: 'Use the kitchen' },
  farmhouse_desk: { label: 'Sit at the desk' },
  farmhouse_table: { label: 'Plan the day' },
  farmhouse_wardrobe: { label: 'Open the wardrobe' },
  farmhouse_exit: { label: 'Go outside' },
};
// Cosy things to do at home, after Zoo Garden's cottage: each has a wall-clock cooldown and a small, kind reward.
// tea: a pot shared with the neighbour you know least (+1 heart), or a quiet cup (+XP) while nobody has moved in.
// draw: a drawing in the journal (+XP); the drawings are counted on the memory shelf.
export const HOME_ACTIVITIES = {
  tea: { at: 'farmhouse_kitchen', cooldownMs: 30 * 60_000, hearts: 1, xp: 5 },
  draw: { at: 'farmhouse_desk', cooldownMs: 8 * 60_000, xp: 5, max: 99 },
};
