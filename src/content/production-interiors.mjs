// New arrangements of the user's cottage and facility furniture, with the existing production queues.
import { CIVIC_PLANS } from './civic-plans.mjs';
const piece = (kit, x, z, role, s = 1, y = 0) => ({ kit, x, z, role, s, y, rot: 0 });
const shell = () => {
  const p = structuredClone(CIVIC_PLANS.bakery);
  p.pieces = p.pieces.filter(p => ['window', 'plant_big', 'plant_small', 'welcome_mat', 'picture'].includes(p.kit));
  return p;
};
const mill = shell(), dairy = shell();
mill.rooms.forEach((r, i) => r.name = ['Feed workshop', 'Grain store', 'Quiet corner', 'Mill floor'][i]);
mill.pieces.push(piece('workbench', -5.6, -6.4, 'make'), piece('fp_scale', -5.6, -6.4, 'make', .9, 1.05),
  piece('fp_sacks', -8.3, -6.6, 'grain'), piece('fp_sacks', .6, -6.4, 'grain'), piece('fp_crate', 2.3, -6.4),
  piece('fp_toolrack', -8.7, 1, 'tools'), piece('workbench', -6.3, 1, 'tools', .8),
  piece('sofa', 6.1, -6.4), piece('round_table', 6.1, -3.8, null, .8), piece('books', 6.1, -3.8, null, .8, .9),
  piece('fp_sacks', 6.7, 1), piece('fp_crate', 8.2, 1), piece('fp_pail', -6.3, 4.4));
dairy.rooms.forEach((r, i) => r.name = ['Dairy workshop', 'Cool pantry', 'Quiet corner', 'Dairy counter'][i]);
dairy.pieces.push(piece('counter', -5.6, -6.4, 'make', 1.2), piece('fp_pail', -5.6, -6.4, 'make', .8, 1.2),
  piece('sink', -8.4, -6.5), piece('fridge', .6, -6.5, 'pantry'), piece('fp_chiller', 2.2, -6.5, 'pantry', .65),
  piece('sofa', 6.1, -6.4), piece('round_table', 6.1, -3.8, null, .8), piece('kettle', 6.1, -3.8, null, .8, .9),
  piece('fp_noticeboard', -6.3, .6, 'notes'), piece('counter', 6.3, 1.8), piece('fp_scale', 6.3, 1.8, null, .8, 1.05),
  // the counter room was a bare floor: a tasting table, the day's churns and crates by the wall
  piece('round_table', -5.6, 4.6, null, .9), piece('stool', -6.7, 4.6), piece('stool', -4.5, 4.6), piece('fp_pail', -8.6, 3), piece('fp_pail', -7.7, 2.7, null, .85),
  piece('fp_crate', 8.6, 6.8), piece('fp_crate', 7.3, 7, null, .85), piece('fp_cart', 3, 3.2, null, .9));
export const PRODUCTION_PLANS = { feed_mill: mill, dairy };
