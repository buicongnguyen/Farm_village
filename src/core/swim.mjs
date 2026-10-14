// Into the water (docs/plan/98-zoo-garden-moves.md step 3, after Zoo Garden's swim rules): the bank is solid until you
// keep pushing into the water for a moment, then you wade where it is shallow and swim in the middle, slower, sinking
// to the knees or the chest. Swimming tires you (SWIM.breath seconds, back again in the shallows or on land); when you
// are tired you are carried back to the bank. No swings, no rods in the water. Nothing saved: it is how you move.
// Waters: the brook (its centre line from content/world.mjs) and the village pond.
import { CELL, brookCurve, POND_WATER, isRoad, STEPPING_STONES } from '../content/world.mjs';

export const SWIM = { push: 0.5, shallow: 1.4, wade: 0.7, swim: 0.55, sinkWade: 0.25, sinkSwim: 0.7, breath: 18, refillShallow: 9, refillLand: 4, brookHalf: 3.6 };
/** How deep into the water a point (metres) lies: metres from the nearest edge, or 0 on land (bridges and stepping stones are land). */
export function depthAt(x, z) {
  const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
  const brook = SWIM.brookHalf - Math.abs(z - (brookCurve(x / CELL) + 0.5) * CELL);   // the water as drawn (wider than the brook's cells)
  if (brook > 0) return isRoad(cx, cz) || cx === STEPPING_STONES.x ? 0 : brook;
  const k = Math.hypot((x - POND_WATER.x) / POND_WATER.rx, (z - POND_WATER.z) / POND_WATER.rz);
  return k < 1 ? (1 - k) * Math.min(POND_WATER.rx, POND_WATER.rz) : 0;
}
/** For the views: how you are in the water. { depth, deep, sink, breath (0..1) } */
export function wetOf(e) {
  const d = e?.wet ?? 0;
  return { depth: d, deep: d >= SWIM.shallow, sink: d <= 0 ? 0 : d >= SWIM.shallow ? SWIM.sinkSwim : SWIM.sinkWade * Math.min(1, d / 0.6), breath: Math.max(0, Math.min(1, (e?.breath ?? SWIM.breath) / SWIM.breath)) };
}
/** The speed a step in the water is made at, against a step on land. */
export const waterPace = depth => depth <= 0 ? 1 : depth >= SWIM.shallow ? SWIM.swim : SWIM.wade;
/** Keep the swimmer's state for one frame: breath, the push into the water, the way back when tired.
 *  e: the Explore session; `pushing`: the stick or keys push into water the player could not step into. */
export function tickSwim(e, dt, pushing, landNear) {
  const d = depthAt(...e.p); e.wet = d;
  e.breath ??= SWIM.breath;
  if (d >= SWIM.shallow) e.breath = Math.max(0, e.breath - dt);
  else e.breath = Math.min(SWIM.breath, e.breath + dt * SWIM.breath / (d > 0 ? SWIM.refillShallow : SWIM.refillLand));
  e.dry = d > 0 ? 0 : (e.dry ?? 0) + dt;
  if (e.dry > 1 && !e.tired) e.inWater = false;   // a second on dry land: the bank is solid again
  e.push = pushing && !e.inWater ? (e.push ?? 0) + dt : 0;
  if (e.push >= SWIM.push) { e.inWater = true; e.push = 0; e.dry = 0; }
  if (e.breath <= 0 && d > 0 && !e.tired) { const shore = landNear(e.p); if (shore) { e.tired = true; e.route = [shore]; } }
  if (e.tired && d <= 0) e.tired = false;
}
