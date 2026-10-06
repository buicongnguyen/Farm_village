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
export const ROADS = [{ x0: 28, x1: 29, z0: 0, z1: N - 1 }, { x0: 0, x1: N - 1, z0: 90, z1: 91 }];
export const brookZ = x => 12 + Math.round(Math.sin(x / 9) * 3);
export const BROOK_HALF = 1;
// The village area (cottages and civic projects) south of the farm, along the east–west road.
export const VILLAGE = { x0: 32, z0: 92, x1: 95, z1: 116 };   // starts next to the road, so doors can open onto it
// Where the four AI neighbours' roads leave the map (signposts).
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
