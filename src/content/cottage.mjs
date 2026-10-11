// Cottage room plan adapted from the user's Zoo Garden, commit 483913d (src/house.ts).
// Imported only by the metadata builder; the runtime fetches the generated room when Explore opens.
const INDOOR_Y = 40;
const SPACE = 1.15;
const WALL_NEAR = 0.75, PLAN_X = [-10, -5, -2, 3, 5, 10], PLAN_Z = [-7, -2, 6.5];
const spread = (v, walls) => {
  let best = null;
  for (const w of walls) if (Math.abs(v - w) < WALL_NEAR && (best === null || Math.abs(v - w) < Math.abs(v - best))) best = w;
  return best === null ? v * SPACE : best * SPACE + (v - best);
};
const spreadPoint = (p) => ({ ...p, x: spread(p.x, PLAN_X), z: spread(p.z, PLAN_Z) });
const spreadActivity = spreadPoint;
const WALL = { thick: 0.2, full: 2.6, low: 0.55 };
const CLEARANCE = 0.36;
const HOUSE = {
  /** Camera zoom indoors (the outdoor default is 1): closer, so rooms read like a dollhouse; a little wider on landscape screens. */
  zoom: 0.8 * 1.08,
  wideZoom: 0.9 * 1.08,
  /** Where you stand after coming in, facing into the living room. */
  spawn: spreadPoint({ x: 0, z: 5.2 }),
  /** Inside the front door: tapping it or walking into it leaves. */
  door: spreadPoint({ x: 0, z: 6.35 }),
  /** The cottage (world.ts: home at (0, -8)) and the outdoor spot in front of its door. */
  cottage: { x: 0, z: -8 },
  outdoorDoor: { x: 0, z: -5.5 },
  outside: { x: 0, z: -4.3 },
  bounds: { x0: -10 * SPACE, x1: 10 * SPACE, z0: -7 * SPACE, z1: 6.5 * SPACE }
};
const ROOMS_PLAN = [
  { id: "living", name: "Living room", rect: { x0: -5, x1: 5, z0: -2, z1: 6.5 }, floor: ["#d7965a", "#c9874d"], wall: "#ffdcae", pattern: "planks" },
  { id: "kitchen", name: "Kitchen", rect: { x0: -10, x1: -5, z0: -2, z1: 6.5 }, floor: ["#fff3dc", "#f0b9a0"], wall: "#b8ead2", pattern: "tiles" },
  { id: "craft", name: "Craft room", rect: { x0: 5, x1: 10, z0: -2, z1: 6.5 }, floor: ["#e8b37b", "#dca46b"], wall: "#ffcadb", pattern: "planks" },
  { id: "bedroom", name: "Bedroom", rect: { x0: -10, x1: -2, z0: -7, z1: -2 }, floor: ["#c68456", "#b9774b"], wall: "#d3c6ff", pattern: "planks" },
  { id: "bath", name: "Bathroom", rect: { x0: -2, x1: 3, z0: -7, z1: -2 }, floor: ["#e4f6ff", "#a9dcf2"], wall: "#9fe0ee", pattern: "tiles" },
  { id: "study", name: "Study", rect: { x0: 3, x1: 10, z0: -7, z1: -2 }, floor: ["#b9794a", "#ad6e40"], wall: "#fff0b2", pattern: "planks" }
];
const ROOMS = ROOMS_PLAN.map((r) => ({ ...r, rect: { x0: r.rect.x0 * SPACE, x1: r.rect.x1 * SPACE, z0: r.rect.z0 * SPACE, z1: r.rect.z1 * SPACE } }));
const BIG_ROOM = "living";
const WALLS_PLAN = [
  { axis: "x", at: -7, from: -10, to: 10, height: WALL.full, gaps: [] },
  { axis: "x", at: 6.5, from: -10, to: 10, height: WALL.low, gaps: [[-0.85, 0.85]] },
  { axis: "x", at: -2, from: -10, to: 10, height: WALL.low, gaps: [[-4.6, -3], [-0.3, 1.3], [3.2, 4.8]] },
  { axis: "z", at: -10, from: -7, to: 6.5, height: WALL.full, gaps: [] },
  { axis: "z", at: 10, from: -7, to: 6.5, height: WALL.full, gaps: [] },
  { axis: "z", at: -5, from: -2, to: 6.5, height: WALL.full, gaps: [[3.9, 5.5]] },
  { axis: "z", at: 5, from: -2, to: 6.5, height: WALL.full, gaps: [[3.9, 5.5]] },
  { axis: "z", at: -2, from: -7, to: -2, height: WALL.full, gaps: [] },
  { axis: "z", at: 3, from: -7, to: -2, height: WALL.full, gaps: [] }
];
const WALLS = WALLS_PLAN.map((w) => ({ ...w, at: w.at * SPACE, from: w.from * SPACE, to: w.to * SPACE, gaps: w.at === 6.5 ? w.gaps : w.gaps.map(([a, b]) => [a * SPACE, b * SPACE]) }));
const Q = Math.PI / 2;
const FURNITURE_PLAN = [
  // Living room: fireplace corner with the sofa facing it, a dining table, shelves, plants and lamps.
  { kit: "fireplace", x: -4.62, z: 1.7, rot: Q, block: [1.6, 0.6] },
  { kit: "picture", x: -4.88, z: 3.75, rot: Q },
  { kit: "rug_round", x: -1.9, z: -0.1 },
  { kit: "sofa", x: -1.9, z: -1.38, block: [2, 0.8] },
  { kit: "coffee_table", x: -1.9, z: 0.05, block: [0.85, 0.85] },
  { kit: "floor_lamp", x: -0.5, z: -1.5, block: [0.4, 0.4] },
  { kit: "armchair", x: -3.3, z: 4.4, rot: Math.PI * 0.75, block: [0.9, 0.8] },
  { kit: "plant_small", x: -4.7, z: -0.9, block: [0.3, 0.3] },
  { kit: "rug_rect", x: 2.6, z: 1 },
  { kit: "dining_table", x: 2.6, z: 1, block: [1.4, 0.9] },
  { kit: "chair", x: 2.6, z: 1.85, rot: Math.PI, block: [0.45, 0.45] },
  { kit: "chair", x: 2.6, z: 0.15, block: [0.45, 0.45] },
  { kit: "bookshelf", x: 4.76, z: 1.6, rot: -Q, block: [1.2, 0.4] },
  { kit: "plant_big", x: 4.4, z: 5.9, block: [0.6, 0.6] },
  { kit: "plant_big", x: -4.4, z: 5.9, block: [0.6, 0.6] },
  { kit: "plant_small", x: 2.3, z: -1.6, block: [0.3, 0.3] },
  { kit: "welcome_mat", x: 0, z: 5.75 },
  { kit: "door_frame", x: 0, z: 6.5 },
  // Kitchen: counter, stove and fridge along the outer wall, a little round table.
  { kit: "fridge", x: -9.58, z: -1.25, rot: Q, block: [0.75, 0.7] },
  { kit: "counter", x: -9.58, z: 0.7, rot: Q, block: [2.4, 0.65] },
  { kit: "stove", x: -9.58, z: 2.4, rot: Q, block: [0.8, 0.65] },
  { kit: "window", x: -9.93, z: 4.4, rot: Q },
  { kit: "round_table", x: -7.4, z: 3, block: [1, 1] },
  { kit: "stool", x: -7.4, z: 4, block: [0.4, 0.4] },
  { kit: "stool", x: -6.45, z: 2.6, block: [0.4, 0.4] },
  { kit: "plant_small", x: -9.6, z: 5.9, block: [0.3, 0.3] },
  // Craft room: workbench, easel, yarn and a shelf.
  { kit: "workbench", x: 9.6, z: 0.3, rot: -Q, block: [1.6, 0.7] },
  { kit: "upgrade_bench", x: 9.55, z: 2.6, rot: -Q, block: [1.2, 0.7] },
  { kit: "window", x: 9.93, z: 2.4, rot: -Q },
  { kit: "easel", x: 7.2, z: -0.9, rot: 0.4, block: [0.7, 0.6] },
  { kit: "rug_rect", x: 7.5, z: 3, rot: Q, scale: 0.8 },
  { kit: "yarn_basket", x: 8.6, z: 4.9, block: [0.6, 0.6] },
  { kit: "bookshelf", x: 9.76, z: 4.6, rot: -Q, block: [1.2, 0.4] },
  { kit: "plant_big", x: 5.6, z: -1.35, block: [0.6, 0.6] },
  // Bedroom: bed against the back wall, wardrobe and mirror (both open your own gear).
  { kit: "rug_round", x: -6.4, z: -4.2, scale: 0.7 },
  { kit: "bed", x: -7, z: -5.85, block: [1.4, 2.1] },
  { kit: "nightstand", x: -8.15, z: -6.55, block: [0.5, 0.45] },
  { kit: "lamp_small", x: -8.15, z: -6.55, y: 0.52 },
  { kit: "window", x: -5.2, z: -6.93 },
  { kit: "wardrobe", x: -9.62, z: -3.6, rot: Q, block: [1.2, 0.6], use: "wardrobe" },
  { kit: "mirror", x: -2.35, z: -4.9, rot: -Q, block: [0.6, 0.4], use: "mirror" },
  { kit: "plant_small", x: -9.6, z: -6.6, block: [0.3, 0.3] },
  // Bathroom: tub with a duck, sink, towels.
  { kit: "bathtub", x: -0.75, z: -6.4, block: [1.75, 0.9] },
  { kit: "duck", x: -0.4, z: -6.35, y: 0.5 },
  { kit: "sink", x: 2.35, z: -6.62, block: [0.55, 0.5] },
  { kit: "towel_rack", x: 2.72, z: -4.4, rot: -Q, block: [0.7, 0.2] },
  { kit: "window", x: 1, z: -6.93 },
  { kit: "rug_rect", x: 0.5, z: -4.6, scale: 0.55 },
  // Study: desk under the window, books, globe, reading chair.
  { kit: "rug_rect", x: 6.6, z: -4.5 },
  { kit: "desk", x: 6.5, z: -6.55, block: [1.3, 0.65] },
  { kit: "chair", x: 6.5, z: -5.7, rot: Math.PI, block: [0.45, 0.45] },
  { kit: "window", x: 8.6, z: -6.93 },
  { kit: "bookshelf", x: 9.76, z: -4.4, rot: -Q, block: [1.2, 0.4] },
  { kit: "globe", x: 3.8, z: -6.4, block: [0.45, 0.45] },
  { kit: "armchair", x: 8.2, z: -2.9, rot: Math.PI * 1.15, block: [0.9, 0.8] },
  { kit: "floor_lamp", x: 9.3, z: -6.45, block: [0.45, 0.45] },
  // Activities (house-activities.ts): the trophy shelf, a radio on the dining table, the kettle, the diary on the study desk.
  { kit: "trophy_shelf", x: 2.25, z: -1.9, y: -0.695 },
  { kit: "radio", x: 3, z: 0.85, y: 0.8, rot: -0.3 },
  { kit: "kettle", x: -9.5, z: 0.05, y: 0.92, rot: Q },
  { kit: "books", x: 6.95, z: -6.5, y: 0.8, rot: 0.3 }
];
const FURNITURE = FURNITURE_PLAN.map((p) => ({ ...spreadPoint(p), ...p.kit.startsWith("rug_") ? { scale: (p.scale ?? 1) * SPACE } : {} }));
export {
  BIG_ROOM,
  CLEARANCE,
  FURNITURE,
  HOUSE,
  INDOOR_Y,
  ROOMS,
  SPACE,
  WALL,
  WALLS,
  spreadActivity
};


// Hollowbrook keeps its own actions, names, rewards and saves. These IDs still name the same activities.
const findPiece = (kit, x, z) => {
  const at = spreadActivity({ x, z });
  return FURNITURE.find(p => p.kit === kit && Math.hypot(p.x - at.x, p.z - at.z) < .01);
};
const sofa = findPiece('sofa', -1.9, -1.38), shelf = findPiece('bookshelf', 4.76, 1.6);
const kitchen = findPiece('counter', -9.58, .7), desk = findPiece('desk', 6.5, -6.55);
const table = findPiece('dining_table', 2.6, 1), wardrobe = findPiece('wardrobe', -9.62, -3.6);
// Keep Hollowbrook's personal keepsakes and family drawing table alongside Zoo Garden's furnishings.
const uses = new Map([[sofa, 'farmhouse_sofa'], [shelf, 'farmhouse_memory_shelf'], [kitchen, 'farmhouse_kitchen'],
  [desk, 'farmhouse_desk'], [table, 'farmhouse_table'], [wardrobe, 'farmhouse_wardrobe']]);
// The reading lamp, piano corner and clock are earned house comforts, so leave room for them.
table.kit = 'farmhouse_table'; table.block = [1.55, 1.88];
shelf.kit = 'farmhouse_memory_shelf'; shelf.block = [1.04, 1.04]; shelf.x -= .32;
const replaced = new Set([findPiece('floor_lamp', -.5, -1.5), findPiece('upgrade_bench', 9.55, 2.6), findPiece('plant_big', -4.4, 5.9), findPiece('chair', 2.6, 1.85), findPiece('chair', 2.6, .15)]);
export const COTTAGE_FURNITURE = FURNITURE.filter(p => !replaced.has(p)).map((p, i) => ({ ...p, id: `furniture_${i}`, use: uses.get(p) ?? null }));
for (const p of COTTAGE_FURNITURE) {
  if (p.kit === 'kettle' || p.kit === 'stove') p.use = 'farmhouse_kitchen';
  if (p.kit === 'radio') { p.x = 2.5; p.z = 1.15; }
  if (p.kit === 'books') p.use = 'farmhouse_desk';
  if (p.kit === 'door_frame') p.use = 'farmhouse_exit';
}
COTTAGE_FURNITURE.push({ id: 'front_door', kit: 'door', x: -.66, z: HOUSE.bounds.z1, rot: -.35, use: 'farmhouse_exit' });
export function wallSegments() {
  return WALLS.flatMap((wall, index) => {
    const spans = []; let at = wall.from;
    for (const [a, b] of [...wall.gaps].sort((a, b) => a[0] - b[0])) { if (a > at) spans.push([at, a]); at = Math.max(at, b); }
    if (at < wall.to) spans.push([at, wall.to]);
    return spans.map(([from, to], i) => ({ ...wall, id: `wall_${index}_${i}`, from, to }));
  });
}
const rect = (id, x, z, w, d) => ({ id, min: [x - w / 2, z - d / 2], max: [x + w / 2, z + d / 2] });
const colliders = COTTAGE_FURNITURE.filter(p => p.block).map(p => {
  const [w, d] = p.block.map(v => v * (p.scale ?? 1)), c = Math.abs(Math.cos(p.rot ?? 0)), s = Math.abs(Math.sin(p.rot ?? 0));
  return rect(p.id, p.x, p.z, w * c + d * s, w * s + d * c);
});
for (const w of wallSegments()) colliders.push(w.axis === 'x' ? rect(w.id, (w.from + w.to) / 2, w.at, w.to - w.from, WALL.thick) : rect(w.id, w.at, (w.from + w.to) / 2, WALL.thick, w.to - w.from));
const interact = (id, p, stand, height) => ({ id, stand: [stand[0], 0, stand[1]], focus: [p.x, height, p.z] });
const interactions = [
  interact('farmhouse_sofa', sofa, [sofa.x + 1.5, sofa.z + .65], .7),
  interact('farmhouse_memory_shelf', shelf, [shelf.x - 1.15, shelf.z + 1], 1.1),
  interact('farmhouse_kitchen', kitchen, [kitchen.x + 1.25, kitchen.z - .7], 1),
  interact('farmhouse_desk', desk, [desk.x - 1.2, desk.z + .9], .9),
  interact('farmhouse_table', table, [table.x - 1.25, table.z], .8),
  interact('farmhouse_wardrobe', wardrobe, [wardrobe.x + 1.25, wardrobe.z], 1.2),
  { id: 'farmhouse_exit', stand: [0, 0, HOUSE.bounds.z1 - .6], focus: [0, 1.1, HOUSE.bounds.z1] },
];
const b = HOUSE.bounds;
export const COTTAGE_ROOM = {
  schemaVersion: 2, roomId: 'farmhouse_main', kit: 'cottage-furniture', site: 'farmhouse',
  bounds: { room: { min: [b.x0, b.z0], max: [b.x1, b.z1] }, wallHeight: WALL.full, wallThickness: WALL.thick,
    avatarCentre: { min: [b.x0 + .46, b.z0 + .46], max: [b.x1 - .46, b.z1 - .46] }, avatar: { radius: .3, height: 1.8 } },
  rooms: ROOMS, walls: wallSegments(), furniture: COTTAGE_FURNITURE, colliders, interactions,
  entry: { position: [HOUSE.spawn.x, 0, HOUSE.spawn.z] }, exit: { id: 'farmhouse_exit', stand: interactions.at(-1).stand },
  camera: { position: [3, 20, 22], target: [0, 0, 0], projection: 'orthographic' },
  seats: [{ id: 'farmhouse_sofa', position: [sofa.x, 0, sofa.z + .06], facing: [0, 0, 1], cushionTop: .5,
    measured: { man: { hipHeight: .459 }, woman: { hipHeight: .433 } } }],
  // Offsets for the original interior-extras kit; paid-for comforts survive the new floor plan.
  comfortOffsets: [[2, -7.65, -5.2], [3, 14.1, 9.05], [4, 2.775, -2.72], [5, 6.7, 3.8], [6, 6.48, -5.2],
    [7, 7.62, 3.15], [8, 0, 2], [9, -1.75, 4.13], [10, .4, 4.15]],
};
