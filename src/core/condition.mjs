// Condition, repair, wear and demolishing (PLAN-v0.3 D2, D3, D6, D7, D11).
//   s.cond[id] = { level, ms }   level 0 fine · 1 worn · 2 shabby · 3 broken; ms = play time since the last repair.
//     ids: a placed thing's id, 'house' (the farmhouse) or a road stretch's id (content/world.mjs ROAD_SEGMENTS).
//   s.repairing[id] = { doneAt }  a broken thing being repaired: out of order until then.
// Broken things (only at the start) do not work until repaired. Wear is very gentle: it counts only play time (a tick never
// counts more than WEAR.tickCapMs, so time away adds nothing), never breaks anything, and costs a few percent of rent and charm.
import { growthStatus, normalizeGrowth } from './village-growth.mjs';
import { BUILDINGS } from '../content/buildings.mjs';
import { REPAIR, WEAR, HOUSE, DEMOLISH, XP } from '../content/economy.mjs';
import { ROAD_SEGMENTS, N, RUINS } from '../content/world.mjs';
import { hash } from './rng.mjs';
import { gainXp } from './levels.mjs';
import { arriveNext } from './homes.mjs';
import { mayBuild } from './projects.mjs';
import { suspendFruitSales, resumeFruitSales } from './orchard.mjs';
import * as grid from './grid.mjs';
import { levelOf, isBroken, isRepairing } from './working.mjs';
export { levelOf, isBroken, isRepairing, isWorking, workingCount } from './working.mjs';

const CONTENTS = ['beds', 'animals', 'production', 'homes', 'trees'];
const road = id => ROAD_SEGMENTS.find(r => r.id === id) ?? null;
/** What an id is: a building kind, 'house' or 'road' (null when there is no such thing). */
export const kindOf = (s, id) => id === 'house' ? 'house' : s.placed?.[id]?.kind ?? (road(id) ? 'road' : null);
/** The thing's price, the base of repair and demolish money. */
export function basisPrice(s, kind) {   // (s kept for callers; the price does not depend on the save)
  if (kind === 'house') return HOUSE.price;
  if (kind === 'road') return REPAIR.road / REPAIR.broken.share;
  const c = BUILDINGS[kind]?.cost; return typeof c === 'function' ? c(0) : c ?? 0;   // a thing that gets dearer with each one (cottages) is priced as the first
}
export function repairCost(s, id) {
  const lv = levelOf(s, id), kind = kindOf(s, id); if (!lv || !kind) return 0;
  const base = basisPrice(s, kind);
  if (lv >= 3) return kind === 'road' ? REPAIR.road : Math.max(REPAIR.broken.min, Math.round(base * REPAIR.broken.share));
  return Math.max(REPAIR.worn.min, Math.round(base * REPAIR.worn.share * (lv === 2 ? 1.5 : 1)));
}
/** Things that can wear: buildings people live and work in, and the farmhouse (not beds, trees, decorations or the garden). */
const wears = (s, id) => id === 'house' ? !!s.house : !BUILDINGS[s.placed[id]?.kind]?.pet && ['animals', 'production', 'homes', 'projects'].includes(BUILDINGS[s.placed[id]?.kind]?.cat);
/** The worst thing that is worn or shabby (level 1–2, not broken), or null. For the neighbours' help. */
export function worstWorn(s) {
  const ids = Object.keys(s.cond ?? {}).filter(id => { const lv = levelOf(s, id); return lv >= 1 && lv <= 2 && kindOf(s, id); })
    .sort((a, b) => levelOf(s, b) - levelOf(s, a) || (a < b ? -1 : 1));
  return ids[0] ?? null;
}

function finish(ctx, id, helper = null) {
  const { s } = ctx, kind = kindOf(s, id), wasBroken = isBroken(s, id), wasClosed = wasBroken || isRepairing(s, id);
  delete s.cond[id]; delete s.repairing?.[id];
  if (BUILDINGS[kind]?.fruitStand && wasClosed) resumeFruitSales(ctx);
  gainXp(ctx, wasBroken ? REPAIR.broken.xp : 2);
  if (kind === 'cottage' && s.homes[id] && !s.homes[id].family) arriveNext(ctx, id);    // the next family moves into a repaired cottage
  ctx.emit('repaired', { id, kind, broken: wasBroken, by: helper });
}
/** Called by tick(): repairs that are done, and the gentle wear of play time. */
export function tickCondition(ctx) {
  const { s, now } = ctx;
  for (const [id, r] of Object.entries(s.repairing ?? {})) if (r.doneAt <= now) finish(ctx, id);
  if (s.mode !== 'restore') return;
  const dt = Math.max(0, Math.min(WEAR.tickCapMs, now - (s.wearAt ?? now))); s.wearAt = now;
  if (!dt) return;
  for (const id of [...Object.keys(s.placed), 'house']) {
    if (!wears(s, id) || isBroken(s, id)) continue;
    const c = (s.cond[id] ??= { level: 0, ms: 0 }); c.ms += dt;
    const lv = c.ms >= WEAR.ms[1] ? 2 : c.ms >= WEAR.ms[0] ? 1 : 0;
    if (lv > c.level) { c.level = lv; ctx.emit('worn', { id, kind: kindOf(s, id), level: lv }); }
  }
}
/** A neighbour on a visit sometimes mends something for you: a repair under way finishes at once, else the worst worn thing. */
export function neighbourFix(ctx, neighbour, visit) {
  const { s } = ctx;
  if (hash(s.createdAt, 'fix', neighbour, visit) % 100 >= 45) return null;
  const id = Object.keys(s.repairing ?? {}).sort()[0] ?? worstWorn(s);
  if (!id) return null;
  const kind = kindOf(s, id); finish(ctx, id, neighbour);
  ctx.emit('neighbourRepair', { id: neighbour, target: id, kind });
  return id;
}

export const actions = {
  /** Repair something: { id } (a placed thing, 'house' or a road stretch). Worn things are mended at once; broken ones take a short wait. */
  repair(ctx, { id }) {
    const { s, now } = ctx, kind = typeof id === 'string' ? kindOf(s, id) : null;
    if (!kind) return ctx.fail('Nothing to repair');
    const lv = levelOf(s, id); if (!lv) return ctx.fail('Nothing to repair');
    if (isRepairing(s, id)) return ctx.fail('It is being repaired');
    if (lv >= 3 && BUILDINGS[kind]) { const may = mayBuild(s, kind, { repair: true }); if (!may.ok) return ctx.fail(may.reason, may.params); }
    const cost = repairCost(s, id); if (s.coins < cost) return ctx.fail('Not enough coins');
    if (lv >= 3 && BUILDINGS[kind]?.fruitStand) suspendFruitSales(ctx);
    s.coins -= cost;
    if (lv >= 3) { (s.repairing ??= {})[id] = { doneAt: now + REPAIR.broken.ms }; ctx.emit('repairStarted', { id, kind, cost, doneAt: now + REPAIR.broken.ms }); }
    else finish(ctx, id);
    return { cost, lasts: lv >= 3 ? REPAIR.broken.ms : 0 };
  },
  /** Take a building down for part of its price; the same thing again later costs half (a rebuild credit). { id } */
  demolish(ctx, { id }) {
    const { s } = ctx, p = typeof id === 'string' && Object.hasOwn(s.placed, id) ? s.placed[id] : null; if (!p) return ctx.fail('Nothing to demolish');
    const def = BUILDINGS[p.kind];
    if (def.garden) return ctx.fail('The streak garden keeps its flowers');
    if (def.lot) return ctx.fail('Buildings on the quay stay where they are');
    if (def.cat === 'projects') {
      // The old civic buildings (school, clinic, police post, company office) can be taken down like anything else; the
      // market square stays (its trucks live there). A company in use says what to do first.
      if (!RUINS.some(r => r.kind === p.kind)) return ctx.fail('Village buildings can be moved, not demolished');
      if (p.kind === 'company') {
        if (Object.values(normalizeGrowth(s).staff).some(Boolean)) return ctx.fail('Release the company staff first');
        if (growthStatus(s).active) return ctx.fail('Wait for the company truck first');
      }
    }
    if (s.homes[id]?.family) return ctx.fail('A family lives here: move the cottage instead');
    if (s.beds[id]) return ctx.fail('Harvest the crop first');
    if (s.animals[id]?.length) return ctx.fail('The animals live here: move it instead');
    if (s.production[id]?.queue?.length) return ctx.fail('Collect what is being made first');
    const refund = Math.floor(basisPrice(s, p.kind) * DEMOLISH.refund);
    if (def.fruitStand) suspendFruitSales(ctx);
    if (def.tills) s.cells[p.z * N + p.x] = 0;
    for (const k of CONTENTS) delete s[k]?.[id];
    delete s.placed[id]; delete s.cond[id]; delete s.repairing?.[id];
    s.counts[p.kind] = Math.max(0, (s.counts[p.kind] ?? 1) - 1); grid.touch(s);
    if (RUINS.some(r => r.kind === p.kind)) (s.village.cleared ??= {})[p.kind] = ctx.now;   // the old ruin does not come back
    s.coins += refund; s.stats.coinsEarned += refund;
    if (p.kind !== 'bed') (s.rebuild ??= {})[p.kind] = Math.min(3, (s.rebuild[p.kind] ?? 0) + 1);
    ctx.emit('demolished', { id, kind: p.kind, x: p.x, z: p.z, refund });
    return { refund, kind: p.kind };
  },
  /** Upgrade the farmhouse one level of comfort: more barn room. */
  upgradeHouse(ctx) {
    const { s } = ctx, lv = s.house?.level; if (!lv) return ctx.fail('Nothing to repair');
    if (lv >= HOUSE.levels) return ctx.fail('Already the best it can be');
    if (isBroken(s, 'house') || isRepairing(s, 'house')) return ctx.fail('Repair the farmhouse first');
    if (s.level < HOUSE.level[lv]) return ctx.fail('Reach level {level} first', { level: HOUSE.level[lv], lock: 'level' });
    const cost = HOUSE.upgradeCost[lv]; if (s.coins < cost) return ctx.fail('Not enough coins');
    s.coins -= cost; s.house.level++; s.barn.cap += HOUSE.barn; gainXp(ctx, XP.build * 2);
    ctx.emit('houseUpgraded', { level: s.house.level, cap: s.barn.cap });
    return { level: s.house.level };
  },
};
