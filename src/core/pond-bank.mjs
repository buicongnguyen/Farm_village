// Fishing from the bank on foot (Explore), after Willowmere and Zoo Garden: walk anywhere round a pond, the rod comes
// out near the water, a tap on the water is where the float lands, and the catch lies on the grass beside you until you
// walk off. Pure geometry in metres; the views (view/fishing-view.mjs, ui/explore-mode.mjs) draw and drive it.
import { CELL, POND_WATER } from '../content/world.mjs';

export const BANK = Object.freeze({
  reach: 3,        // the rod comes out this close to the water...
  leave: 4,        // ...and goes away again past this (so it does not flicker at the edge)
  min: 1.8, max: 7, // how near and how far a cast can land, measured from the angler
  edge: 0.7,       // a float never lands closer than this to the rim
  straight: 3.4,   // a cast with no chosen spot goes this far out
  gap: 0.9,        // where to stand when walking up to the water
  pack: 2.5,       // walk this far from your catch and it is packed away
  pile: 12,        // fish shown on the grass at once
});

/** Every pond as an ellipse: the village pond (id null), then built ponds by their placed id. */
export function pondsOf(s) {
  const out = [{ id: null, x: POND_WATER.x, z: POND_WATER.z, rx: POND_WATER.rx, rz: POND_WATER.rz, surface: 0.06 }];
  for (const [id, p] of Object.entries(s.placed ?? {})) if (p.kind === 'pond') out.push({ id, x: (p.x + 2) * CELL - 0.3, z: (p.z + 2) * CELL, rx: 2.0, rz: 2.0, surface: 0.24 });
  return out;
}
const norm = (pond, x, z) => Math.hypot((x - pond.x) / pond.rx, (z - pond.z) / pond.rz);
/** Metres from (x, z) to the water's edge: negative inside the water. */
export const waterDistance = (pond, x, z) => (norm(pond, x, z) - 1) * Math.min(pond.rx, pond.rz);
export function nearestPond(s, x, z) {
  let best = null;
  for (const pond of pondsOf(s)) { const d = waterDistance(pond, x, z); if (!best || d < best.d) best = { pond, d }; }
  return best;
}
/** The pond whose water holds this point, or null. */
export const pondAt = (s, x, z) => pondsOf(s).find(p => waterDistance(p, x, z) < 0) ?? null;
/** Where the float lands: toward the tap (or straight out), between BANK.min and BANK.max from the angler, inside the rim. */
export function castPlan(pond, from, tap = null) {
  const out = waterDistance(pond, from[0], from[1]);
  let dx = (tap?.[0] ?? pond.x) - from[0], dz = (tap?.[1] ?? pond.z) - from[1], len = Math.hypot(dx, dz) || 1;
  dx /= len; dz /= len;
  const want = tap ? len : Math.max(0, out) + BANK.straight;
  const d = Math.max(Math.max(0, out) + BANK.min, Math.min(Math.max(0, out) + BANK.max, want));
  let x = from[0] + dx * d, z = from[1] + dz * d;
  const limit = 1 - BANK.edge / Math.min(pond.rx, pond.rz), n = norm(pond, x, z);
  if (n > limit) { x = pond.x + (x - pond.x) * limit / n; z = pond.z + (z - pond.z) * limit / n; }
  return [x, z];
}
/** A dry spot BANK.gap from the rim, on the side of the water nearest to `toward`. */
export function shorePoint(pond, toward) {
  const a = Math.atan2((toward[1] - pond.z) / pond.rz, (toward[0] - pond.x) / pond.rx);
  const rim = [pond.x + Math.cos(a) * pond.rx, pond.z + Math.sin(a) * pond.rz], out = Math.hypot(rim[0] - pond.x, rim[1] - pond.z) || 1;
  return [rim[0] + (rim[0] - pond.x) / out * BANK.gap, rim[1] + (rim[1] - pond.z) / out * BANK.gap];
}
/** The places a catch can lie: fanned round the angler along the bank and behind, a good stride apart, on dry ground
 *  that `free(x, z)` allows (not a kiosk, a building or a fence line). Nearest and most to the side first. */
export function bankSpots(pond, anchor, free = () => true) {
  let nx = anchor[0] - pond.x, nz = anchor[1] - pond.z; const len = Math.hypot(nx, nz) || 1; nx /= len; nz /= len;   // outward from the water
  const base = Math.atan2(nz, nx), out = [];
  for (const r of [1.8, 2.9, 4.0]) {
    const step = 1.15 / r, half = Math.floor(1.95 / step);   // about 1.15 m apart along the arc, out to 110 degrees each side
    for (let k = half; k >= 0; k--) for (const sign of k ? [1, -1] : [1]) {
      const a = base + sign * k * step, x = anchor[0] + Math.cos(a) * r, z = anchor[1] + Math.sin(a) * r;
      if (waterDistance(pond, x, z) >= 1.0 && free(x, z)) out.push({ x, z });
    }
  }
  return out;
}
/** Where the n-th fish of a catch lies: its own spot while there is room; only then do they pile (level 1, 2, ...).
 *  Returns { x, z, rot, level } (rot: the way its nose points). */
export function bankSlot(pond, anchor, n, free) {
  const spots = bankSpots(pond, anchor, free), at = spots.length ? spots[n % spots.length] : { x: anchor[0], z: anchor[1] };
  return { x: at.x, z: at.z, rot: ((n * 2.399963) % (Math.PI * 2)), level: spots.length ? Math.floor(n / spots.length) : n };
}
