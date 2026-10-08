// Existing lakeside kiosks and plaza stalls share one saved offer per shop, not one per decorative copy.
import { POND, PLAZA } from './world.mjs';
export const SHOP_WAIT_MS = 15 * 60_000;
export const SHOP_SKIP_MS = 5 * 60_000;
export const SHOPS = {
  fish: { name: 'Lakeside fish buyer', level: 2, goods: ['perch', 'carp', 'catfish', 'goldfish'], n: 1, line: 'A fresh catch for the lakeside kitchen. Bring it whenever you like.' },
  snacks: { name: 'Lakeside snack kiosk', level: 4, goods: ['bread', 'corn_bread', 'apple', 'orange', 'coconut', 'apple_juice', 'carrot_juice', 'orange_juice'], n: 3, line: 'Something tasty for a picnic basket. There is no rush.' },
  flowers: { name: 'Lakeside garden kiosk', level: 7, goods: ['herb', 'ginseng'], n: 2, line: 'The garden stall would love a few roots or herbs from your beds.' },
  plaza: { name: 'Plaza produce stalls', level: 4, goods: ['carrot', 'corn', 'pumpkin', 'peach', 'cherry', 'orange', 'coconut', 'noodles', 'instant_noodles'], n: 4, line: 'A small basket from your farm will brighten the village market.' },
};
export const SHOP_SITES = [
  { id: 'lake-shop0', shop: 'fish', x: POND.x0 + .5, z: POND.z0 - 1.6 },
  { id: 'lake-shop1', shop: 'snacks', x: POND.x1 - .5, z: POND.z0 - 1.6 },
  { id: 'lake-shop2', shop: 'flowers', x: POND.x0 + .5, z: POND.z1 + 2.6 },
  { id: 'lake-shop3', shop: 'fish', x: POND.x1 - .5, z: POND.z1 + 2.6 },
  { id: 'plaza-stall1', shop: 'plaza', x: PLAZA.x0 + 1, z: PLAZA.z0 + 1 },
  { id: 'plaza-stall2', shop: 'plaza', x: PLAZA.x1, z: PLAZA.z0 + 1 },
  { id: 'plaza-stall3', shop: 'plaza', x: PLAZA.x1, z: PLAZA.z1 },
];
