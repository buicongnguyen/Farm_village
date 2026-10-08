// Fixed scenery anchors, in cells. Unlike placed buildings these are exact centres: world position = x/z * CELL.
// The porch box fits between the forecourt bench and its east planter. The cache is on the dry east pond bank,
// clear of the dock planks, roads, buildable farm/village land and the existing wild-scatter area.
import { HOME_YARD, POND_DOCK } from './world.mjs';

export const EXPLORATION_SITES = {
  porch: { x: HOME_YARD.x1 + 0.15, z: HOME_YARD.z1 + 0.6 },
  pond: { x: POND_DOCK.x + 1.4, z: POND_DOCK.z + 1.2 },
};
