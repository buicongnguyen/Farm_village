// Cells on the home lot that the game keeps for itself (no building there): the streak garden north of the farmhouse
// (today.mjs) and the weekly cart's stand by the farm gate (cart.mjs). The world and interface packages read these too.
/** The streak garden: x 14–25, z 53–56. Flowers fill the row nearest the farmhouse first (z 56), west to east. */
export const GARDEN = { x0: 14, z0: 53, w: 12, d: 4 };
export const gardenCells = () => {
  const out = [];
  for (let z = GARDEN.z0 + GARDEN.d - 1; z >= GARDEN.z0; z--) for (let x = GARDEN.x0; x < GARDEN.x0 + GARDEN.w; x++) out.push([x, z]);
  return out;
};
export const inGarden = (x, z) => x >= GARDEN.x0 && x < GARDEN.x0 + GARDEN.w && z >= GARDEN.z0 && z < GARDEN.z0 + GARDEN.d;
/** Where the weekly cart stands: x 26–27, z 55–56, at the homestead gate by the road, north of the farmhouse. (Not on the
 * strip between the road and the farm: the tutorial's first path runs there.) */
export const CART_SPOT = { x: 26, z: 55, w: 2, d: 2 };
export const inCartSpot = (x, z) => x >= CART_SPOT.x && x < CART_SPOT.x + CART_SPOT.w && z >= CART_SPOT.z && z < CART_SPOT.z + CART_SPOT.d;
/** Why a cell is kept, or null. */
export const reservedReason = (x, z) => inGarden(x, z) ? 'Kept for your streak garden' : inCartSpot(x, z) ? 'Kept for the market cart' : null;
