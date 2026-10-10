// The map (DESIGN 3.1): one world of 128 × 128 cells, 2 m each. Fixed features live here as data; what the player
// changes (cells on their land, placed things) lives in the save.
export const N = 128;              // cells per side
export const CELL = 2;             // metres per cell
export const PARCEL = 16;          // cells per parcel side
// The farm: 4 × 4 parcels. Parcel ids are "px,pz" (0–3 each).
export const FARM = { x0: 32, z0: 24, parcels: 4 };
export const START_PARCEL = '0,2';
export const FARMHOUSE = { x: 22, z: 62, model: 'home_t1', width: 9 };       // west of the start parcel, by the road
/** The farmhouse forecourt (cells): stone tiles from the porch steps toward the road, with a bench and planters (view only;
 *  x 24–26 lie in the farmhouse's fixed footprint, so nothing can be built on them). */
export const HOME_YARD = { x0: 24, x1: 26, z0: 60, z1: 64 };
/** What each farmhouse level adds to the garden: { level, name, model, at: [cell x, cell z] (centre, may be fractional),
 *  rot, scale?, block?: [x0, z0, x1, z1] cells nobody walks through }. Levels 4 and 7 make the house itself bigger. */
export const HOME_GARDEN = [
  { level: 2, name: 'Flower beds by the door', model: 'flowers', at: [24.5, 58.6], scale: 1.1 }, { level: 2, model: 'flowers', at: [24.5, 65.4], scale: 1.1 }, { level: 2, model: 'bush', at: [23.6, 58.5], scale: 0.7 }, { level: 2, model: 'bush', at: [23.6, 65.5], scale: 0.7 },
  { level: 3, name: 'A bench and a lamp on the lawn', model: 'bench', at: [25.5, 56.5], rot: Math.PI }, { level: 3, model: 'lamp', at: [26.5, 56.5] },
  { level: 4, name: 'A bigger farmhouse' },
  { level: 5, name: 'A swimming pool', model: 'home_pool', at: [22.5, 54], block: [21, 53, 23, 54] },
  { level: 6, name: 'Sun loungers and a parasol', model: 'home_loungers', at: [25.5, 54], block: [25, 53, 26, 54] },
  { level: 7, name: 'A grand farmhouse' },
  { level: 8, name: 'A fountain', model: 'fountain', at: [16, 67], block: [15, 66, 16, 67] },
  { level: 9, name: 'A garden gazebo', model: 'home_gazebo', at: [16, 78], block: [15, 77, 16, 78] },
  { level: 10, name: 'A flag over the farm', model: 'home_flag', at: [26.5, 66.5], block: [26, 66, 26, 66] },
];
/** Is this cell taken by something in the farmhouse garden at this house level? */
export const homeGardenAt = (level, x, z) => HOME_GARDEN.some(g => g.block && level >= g.level && x >= g.block[0] && x <= g.block[2] && z >= g.block[1] && z <= g.block[3]);
export const BARN = { x: 22, z: 72, model: 'barn', width: 8 };
export const ORDER_BOARD = { x: 28, z: 58 };
// Roads (2 cells wide) and the brook.
// A ring road round the farm and the village (after Willowmere's county layout): west, south, east and north, with the
// old lane through the middle of the village. Each stretch has an id so it can be damaged and repaired (condition.mjs).
export const ROAD_SEGMENTS = [
  { id: 'road_west', name: 'The brook road', x0: 28, x1: 29, z0: 0, z1: N - 1 },
  { id: 'road_south', name: 'Village street', x0: 0, x1: N - 1, z0: 90, z1: 91 },
  { id: 'road_east', name: 'The east road', x0: 100, x1: 101, z0: 20, z1: 89 },
  { id: 'road_north', name: 'The north lane', x0: 30, x1: 99, z0: 20, z1: 21 },
  // the civic lane: from the village street down to the old school, clinic, police station and company row
  { id: 'road_civic', name: 'School lane', x0: 55, x1: 56, z0: 92, z1: 102 },
  { id: 'road_civic_row', name: 'Civic row', x0: 48, x1: 92, z0: 103, z1: 104 },
  { id: 'road_clinic', name: 'Clinic path', x0: 64, x1: 64, z0: 105, z1: 105 },
];
export const ROADS = ROAD_SEGMENTS;
export const roadSegmentAt = (x, z) => ROAD_SEGMENTS.find(r => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) ?? null;
export const brookZ = x => 12 + Math.round(Math.sin(x / 9) * 3);
export const BROOK_HALF = 1;
// The village area (cottages and civic projects) south of the farm, along the east–west road.
export const VILLAGE = { x0: 32, z0: 92, x1: 95, z1: 116 };   // starts next to the road, so doors can open onto it
// Where the four AI neighbours' roads leave the map (signposts).
// Boarded-up civic buildings waiting for their project (DESIGN 11): seen from the start, rebuilt in the build order.
export const RUINS = [
  { kind: 'school', model: 'school', x: 50, z: 106, rot: 2, width: 9.6 },
  { kind: 'clinic', model: 'hospital', x: 62, z: 106, rot: 2, width: 8 },
  { kind: 'police', model: 'police', x: 73, z: 106, rot: 2, width: 6 },
  { kind: 'company', model: 'company', x: 83, z: 106, rot: 2, width: 8 },
];
/** What each old building on the civic row is called, and what its tidy-up costs and gives (core/ruins.mjs). */
export const RUIN_NAMES = { school: 'The old school', clinic: 'The old clinic', police: 'The old police station', company: 'The old company office' };
export const TIDY = { coins: 40, xp: 15 };
/** The ruin whose footprint holds this cell, if any. */
/** Fixed sites (core/sites.mjs): where the story's own buildings stand, outside the farm and the village lots.
 *  The boat dock (chapter 7): on the south bank of the brook, a few steps east of the road bridge. */
export const SITES = [{ kind: 'dock', x: 32, z: 13, rot: 0, size: [2, 2] }];   // size: the building's footprint (content/buildings.mjs), for the scenery that keeps off it
/** The old water mill on the brook's north bank, across the water from the lane (scenery, view/old-mill.mjs): its middle
 *  in metres, and the cells it covers (wild scatter keeps off them; nobody's land, so nothing can be built there). Its
 *  wheel hangs over the brook on the south side, facing the usual view, and turns once the sluice is open (chapter 8). */
export const OLD_MILL = { x: 82.5, z: 13.5, rot: 0, box: { x0: 39, x1: 43, z0: 5, z1: 7 } };
export const inOldMill = (x, z) => x >= OLD_MILL.box.x0 && x <= OLD_MILL.box.x1 && z >= OLD_MILL.box.z0 && z <= OLD_MILL.box.z1;
/** The bank by the dock: public ground, so anyone can walk to it from the brook road. */
export const DOCK_BANK = { x0: 30, x1: 36, z0: 13, z1: 17 };
export const isDockBank = (x, z) => x >= DOCK_BANK.x0 && x <= DOCK_BANK.x1 && z >= DOCK_BANK.z0 && z <= DOCK_BANK.z1;
export const ruinAt = (x, z) => RUINS.find(r => { const [w, d] = r.kind === 'school' ? [5, 4] : [4, 3]; return x >= r.x && x < r.x + w && z >= r.z && z < r.z + d; }) ?? null;
export const MAILBOX = { x: 27, z: 60 };
export const NEIGHBOUR_SIGNS = [{ id: 'mai', x: 30, z: 126 }, { id: 'gus', x: 2, z: 92 }, { id: 'priya', x: 126, z: 92 }, { id: 'twins', x: 30, z: 1 }];

/** What a piece of land is good for, by where it lies (shown where it is for sale). */
export function parcelNote(id) {
  const [px, pz] = String(id).split(',').map(Number);
  return px === FARM.parcels - 1 ? 'East meadow: room for goats and a dairy' : pz === 0 ? 'North field: nearest the brook'
    : pz === FARM.parcels - 1 ? 'South field: close to the village street' : 'Open field: room for anything';
}
export const parcelOrigin = id => { const [px, pz] = id.split(',').map(Number); return { x: FARM.x0 + px * PARCEL, z: FARM.z0 + pz * PARCEL }; };
export const parcelOf = (x, z) => {
  const px = Math.floor((x - FARM.x0) / PARCEL), pz = Math.floor((z - FARM.z0) / PARCEL);
  return px >= 0 && pz >= 0 && px < FARM.parcels && pz < FARM.parcels ? `${px},${pz}` : null;
};
export const isRoad = (x, z) => ROADS.some(r => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1);
export const isBrook = (x, z) => Math.abs(z - brookZ(x)) <= BROOK_HALF;
export const inVillage = (x, z) => x >= VILLAGE.x0 && x <= VILLAGE.x1 && z >= VILLAGE.z0 && z <= VILLAGE.z1;
export const inFarm = (x, z) => parcelOf(x, z) !== null;
export const nearHome = (x, z) => x >= 14 && x <= 31 && z >= 52 && z <= 80;

// ── Scenery positions (world package): drawn by the view only; the rules never read these ──
/** The brook's smooth centre line in cells (z, fractional); brookZ() is the same curve rounded to whole cells. */
export const brookCurve = x => 12 + Math.sin(x / 9) * 3;
/** The plank bridge where the north–south road crosses the brook (cells). */
export const BRIDGE = { x0: 28, x1: 29, z: brookZ(28.5) };
/** Stepping stones across the brook just north of the farm (cell x; z follows the brook). */
export const STEPPING_STONES = { x: 47 };
/** The duck pond in the woods west of the road, north of the farmhouse (cells, inclusive), and its little dock. */
export const POND = { x0: 12, z0: 40, x1: 17, z1: 44 };
export const POND_DOCK = { x: 18, z: 42, rot: Math.PI / 2 };
export const isPond = (x, z) => x >= POND.x0 && x <= POND.x1 && z >= POND.z0 && z <= POND.z1;
/** Public footpath from the dock to the brook road; walking here never requires buying or building on land. */
export const POND_PATH = { x0: 18, x1: 27, z0: 42, z1: 43 };
/** A small clear bank beside the approach, with three fishing places four metres apart. */
export const POND_SHORE = { x0: 18, x1: 19, z0: 40, z1: 44 };
export const POND_FISHING_SPOTS = [[18, 42], [18, 40], [18, 44]];
/** The pond's water as drawn: an ellipse in metres (view/brook.mjs draws the same shape). The cells of POND are its box. */
export const POND_WATER = { x: (POND.x0 + POND.x1 + 1) / 2 * CELL, z: (POND.z0 + POND.z1 + 1) / 2 * CELL, rx: (POND.x1 - POND.x0 + 1) * CELL / 2 + 0.3, rz: (POND.z1 - POND.z0 + 1) * CELL / 2 + 0.3 };
/** A cell whose middle is in the water (the box's grassy corners are not). */
export const isPondWater = (x, z) => isPond(x, z) && Math.hypot(((x + 0.5) * CELL - POND_WATER.x) / (POND_WATER.rx + 0.5), ((z + 0.5) * CELL - POND_WATER.z) / (POND_WATER.rz + 0.5)) < 1;
/** The public bank all the way round the pond: three cells of open grass that the scenery already keeps clear, so
 *  anyone can walk round the water and fish from any side. (The four lake kiosks stand on it; core/walk.mjs blocks them.) */
export const POND_BANK = { x0: POND.x0 - 3, x1: POND.x1 + 3, z0: POND.z0 - 3, z1: POND.z1 + 3 };
export const isPondBank = (x, z) => x >= POND_BANK.x0 && x <= POND_BANK.x1 && z >= POND_BANK.z0 && z <= POND_BANK.z1;
export const isPondPath = (x, z) => [POND_PATH, POND_SHORE].some(p => x >= p.x0 && x <= p.x1 && z >= p.z0 && z <= p.z1);
/** The village plaza (cells, inclusive): cobbles round the old well, between the cottage row and the ruins. */
export const PLAZA = { x0: 38, z0: 98, x1: 43, z1: 103 };
export const WELL = { x: 41, z: 101 };
/** The arch over the farm entrance, between the road and the start parcel. */
export const FARM_GATE = { x: 30.5, z: 64, rot: Math.PI / 2 };
/** The windmill by the farmhouse (cells). */
export const WINDMILL = { x: 17, z: 54, rot: 0.4 };
/** The land drawn around the map so its edge never shows (metres beyond the edge): low hills, then a far haze. */
export const SKIRT = 72;
