// Rental cottages, families and rent, and charm (DESIGN 10 and 12).
import { quayRent, quayRentCollected } from './riverside.mjs';
import { BUILDINGS } from '../content/buildings.mjs';
import { FAMILIES } from '../content/people.mjs';
import { RENT, FAMILY_ARRIVAL_MS, HOUR, WEAR } from '../content/economy.mjs';
import { isBrook } from '../content/world.mjs';
import { cellsOf, doorCell, cellType, reachesRoad } from './grid.mjs';
import { levelOf } from './working.mjs';
import { rng, hash } from './rng.mjs';

const CHARM_RADIUS = 3;
/** A cottage's charm (DESIGN 12): decorations within 3 cells, a path at the door, the brook; production and pens cost a little. */
export function charmOf(s, id) {
  const p = s.placed[id]; if (!p) return 0;
  const cells = cellsOf(p.kind, p.x, p.z, p.rot);
  const xs = cells.map(c => c[0]), zs = cells.map(c => c[1]);
  const x0 = Math.min(...xs) - CHARM_RADIUS, x1 = Math.max(...xs) + CHARM_RADIUS, z0 = Math.min(...zs) - CHARM_RADIUS, z1 = Math.max(...zs) + CHARM_RADIUS;
  let charm = 0, brook = false;
  for (const [oid, o] of Object.entries(s.placed)) {
    if (oid === id) continue;
    const def = BUILDINGS[o.kind];
    if (!def.charm && !def.animals) continue;
    const near = cellsOf(o.kind, o.x, o.z, o.rot).some(([x, z]) => x >= x0 && x <= x1 && z >= z0 && z <= z1);
    if (!near) continue;
    charm += def.charm ?? 0; if (def.animals) charm -= 1;
  }
  for (let z = z0; z <= z1 && !brook; z++) for (let x = x0; x <= x1; x++) if (isBrook(x, z)) { brook = true; break; }
  if (brook) charm += 3;
  const door = doorCell(p.kind, p.x, p.z, p.rot); if (door && cellType(s, door[0], door[1]) === 'path' && reachesRoad(s, door[0], door[1])) charm += 2;
  charm -= Math.min(2, levelOf(s, id)) * WEAR.charm;   // a worn cottage is a little less charming
  return Math.max(0, charm);
}
/** Which cottages a charm item at (x, z) would help, and by how much (the build-mode charm preview, DESIGN 12). */
export function charmPreview(s, kind, x, z, rot = 0) {
  const value = BUILDINGS[kind]?.charm; if (!value) return null;
  const cells = cellsOf(kind, x, z, rot), helped = [];
  for (const [id, p] of Object.entries(s.placed)) {
    if (!BUILDINGS[p.kind].home) continue;
    const hc = cellsOf(p.kind, p.x, p.z, p.rot), xs = hc.map(c => c[0]), zs = hc.map(c => c[1]);
    if (cells.some(([cx, cz]) => cx >= Math.min(...xs) - CHARM_RADIUS && cx <= Math.max(...xs) + CHARM_RADIUS && cz >= Math.min(...zs) - CHARM_RADIUS && cz <= Math.max(...zs) + CHARM_RADIUS)) helped.push(id);
  }
  return { value, homes: helped };
}
export const familyOf = (s, id) => FAMILIES.find(f => f.id === s.homes[id]?.family) ?? null;
/** The next family waiting for a cottage, in order. */
export const nextFamily = s => FAMILIES.find(f => !Object.values(s.homes).some(h => h.family === f.id)) ?? null;
/** A new cottage: the next family is on its way (DESIGN 10, step 3). */
export function arriveNext(ctx, id) {
  const { s, now } = ctx, fam = nextFamily(s);
  s.homes[id] = { level: 0, family: fam?.id ?? null, arrivesAt: now + FAMILY_ARRIVAL_MS, rentFrom: now + FAMILY_ARRIVAL_MS };
  if (fam) ctx.emit('familyComing', { id, family: fam.id, at: now + FAMILY_ARRIVAL_MS });
}
/** Families with unmet needs pay a quarter less (DESIGN 10, step 6). v0.1 needs: a way from the door to the road, the same
 * rule as placing the cottage (a door right on the road counts; a path cut off from the road does not). */
export function needsOf(s, id) {
  const p = s.placed[id], door = p && doorCell(p.kind, p.x, p.z, p.rot);
  return door && !reachesRoad(s, door[0], door[1]) ? ['path'] : [];
}
export function rentPerHour(s, id) {
  const h = s.homes[id]; if (!h?.family) return 0;
  const wear = 1 - WEAR.rent * Math.min(2, levelOf(s, id));   // worn and shabby cottages pay a few percent less
  return RENT.perHour[h.level] * (1 + RENT.charmBonus(charmOf(s, id))) * wear * (needsOf(s, id).length ? 1 - RENT.unmetNeed : 1);
}
/** Rent waiting in the mailbox (capped at RENT.capHours per cottage). */
export function rentWaiting(s, now) {
  let total = quayRent(s, now);   // the quay houses pay into the same mailbox (core/riverside.mjs)
  for (const [id, h] of Object.entries(s.homes)) {
    if (!h.family || h.arrivesAt > now) continue;
    total += rentPerHour(s, id) * Math.min(RENT.capHours, Math.max(0, now - h.rentFrom) / HOUR);
  }
  return Math.floor(total);
}

export const actions = {
  collectRent(ctx) {
    const { s, now } = ctx, coins = rentWaiting(s, now);
    if (coins <= 0) return ctx.fail('The mailbox is empty');
    for (const h of Object.values(s.homes)) if (h.family && h.arrivesAt <= now) h.rentFrom = now;
    quayRentCollected(s, now);
    s.coins += coins; s.stats.coinsEarned += coins;
    ctx.emit('rent', { coins });
    return { coins };
  },
  /** Furnish a cottage one level up: { id }. */
  upgradeHome(ctx, { id }) {
    const { s, now } = ctx, h = s.homes[id]; if (!h) return ctx.fail('Not a cottage');
    if (h.level >= RENT.perHour.length - 1) return ctx.fail('Already the best it can be');
    const price = RENT.upgradeCost[h.level + 1]; if (s.coins < price) return ctx.fail('Not enough coins');
    // rent so far is paid at the old rate first
    actions.collectRent({ ...ctx, fail: () => ({}), emit: ctx.emit });
    s.coins -= price; h.level++; h.rentFrom = Math.max(h.rentFrom, now);
    ctx.emit('homeUpgraded', { id, level: h.level });
    return { level: h.level };
  },
};
/** Called by tick(): families whose arrival time has come move in. */
export function tickHomes(ctx) {
  const { s, now } = ctx;
  for (const [id, h] of Object.entries(s.homes)) if (h.family && h.arrivesAt <= now && !h.arrived) { h.arrived = true; ctx.emit('familyArrived', { id, family: h.family }); }
  // a happy family now and then leaves a thank-you tip on the spot: passive income you did not have to collect (v0.3c)
  for (const [id, h] of Object.entries(s.homes)) {
    if (!h.family || h.arrivesAt > now || levelOf(s, id) >= 3) continue;
    if (!h.tipAt) { h.tipAt = now + RENT.tipMs[0]; continue; }
    if (h.tipAt > now) continue;
    if (now - h.tipAt > WEAR.tickCapMs) { h.tipAt = now + RENT.tipMs[0]; continue; }   // a tip only comes while the game is open, never as back pay
    const coins = RENT.tipCoins[0] + Math.floor(rng(hash(id, h.tipAt))() * (RENT.tipCoins[1] - RENT.tipCoins[0] + 1));
    s.coins += coins; s.stats.coinsEarned += coins; h.tipAt = now + RENT.tipMs[0] + Math.floor(rng(hash(id, now))() * (RENT.tipMs[1] - RENT.tipMs[0]));
    ctx.emit('familyTip', { id, family: h.family, coins });
  }
}
