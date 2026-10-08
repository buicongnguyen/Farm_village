// The map (DESIGN 3.1): one world of 128 × 128 cells, 2 m each. Fixed features live here as data; what the player
// changes (cells on their land, placed things) lives in the save.
export const N = 128;              // cells per side
export const CELL = 2;             // metres per cell
export const PARCEL = 16;          // cells per parcel side
// The farm: 4 × 4 parcels. Parcel ids are "px,pz" (0–3 each).
export const FARM = { x0: 32, z0: 24, parcels: 4 };
export const START_PARCEL = '0,2';
export const FARMHOUSE = { x: 22, z: 62, model: 'home_t1', width: 9 };       // west of the start parcel, by the road
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
export const ruinAt = (x, z) => RUINS.find(r => { const [w, d] = r.kind === 'school' ? [5, 4] : [4, 3]; return x >= r.x && x < r.x + w && z >= r.z && z < r.z + d; }) ?? null;
export const MAILBOX = { x: 27, z: 60 };
export const NEIGHBOUR_SIGNS = [{ id: 'mai', x: 30, z: 126 }, { id: 'gus', x: 2, z: 92 }, { id: 'priya', x: 126, z: 92 }, { id: 'twins', x: 30, z: 1 }];

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
/** The village plaza (cells, inclusive): cobbles round the old well, between the cottage row and the ruins. */
export const PLAZA = { x0: 38, z0: 98, x1: 43, z1: 103 };
export const WELL = { x: 41, z: 101 };
/** The arch over the farm entrance, between the road and the start parcel. */
export const FARM_GATE = { x: 30.5, z: 64, rot: Math.PI / 2 };
/** The windmill by the farmhouse (cells). */
export const WINDMILL = { x: 17, z: 54, rot: 0.4 };
/** The land drawn around the map so its edge never shows (metres beyond the edge): low hills, then a far haze. */
export const SKIRT = 72;
