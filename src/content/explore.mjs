// First room only. IDs are independent of language and of the older picnic exploration trail.
export const HOME_APPROACH = [51, 125];
export const HOME_MEMORY = {
  id: 'home_garden_drawing', title: 'A garden drawn together', speaker: 'pip',
  text: 'I drew our garden! This little corner is for flowers, and this big bit is for adventures together.',
  reply: 'There is room for all our ideas here. We can grow them one at a time.',
};
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
