// The riverside (Act IV, docs/plan/act4-far-bank.md and ch13-the-far-bank.md): the far bank east of the old mill.
// Once the towpath is open (chapter 12) the old quay can be paved; that shows its lots. A riverside building stands
// on a lot and nowhere else, and nothing else stands on a lot: it is built from the quay's panel, never moved.
//   s.firsts.quay           when the quay was paved
//   s.placed[id].lot        the lot a riverside building stands on ('q1' .. 'q7')
//   s.flats[id]             a quay house's rent clock: { rentFrom }
import { RIVERSIDE as R, XP } from '../content/economy.mjs';
import { BUILDINGS } from '../content/buildings.mjs';
import { LOTS } from '../content/world.mjs';
import { gainXp } from './levels.mjs';
import * as grid from './grid.mjs';

export const quayOf = s => ({ open: !!s.firsts?.bridge, paved: !!s.firsts?.quay });
/** What paving the quay takes. Pure: { ok, reason?, params?, price }. */
export function quayPlan(s) {
  const price = R.quay.cost;
  if (s.firsts?.quay) return { ok: false, reason: 'The quay is paved already', price };
  if (!s.firsts?.bridge) return { ok: false, reason: 'The towpath gate is still shut', price };
  if (s.level < R.quay.level) return { ok: false, reason: 'Reach level {level} first', params: { level: R.quay.level, lock: 'level' }, price };
  if (s.coins < price) return { ok: false, reason: 'Not enough coins', price };
  return { ok: true, price };
}
export const lotOf = id => LOTS.find(l => l.id === id) ?? null;
/** The id of what stands on a lot, or null. */
export const onLot = (s, lot) => Object.keys(s.placed).find(id => s.placed[id].lot === lot) ?? null;
export const freeLots = s => LOTS.filter(l => !onLot(s, l.id) && !l.reserved);
/** The kinds that are built on lots, in catalogue order. */
export const riversideKinds = () => Object.keys(BUILDINGS).filter(k => BUILDINGS[k].lot);
/** What building `kind` on `lot` takes. Pure: { ok, reason?, params?, lot, price }. */
export function lotPlan(s, lotId, kind) {
  const def = typeof kind === 'string' && Object.hasOwn(BUILDINGS, kind) ? BUILDINGS[kind] : null, lot = lotOf(lotId);
  if (!def?.lot || !lot) return { ok: false, reason: 'Unknown item' };
  const price = def.cost ?? 0;
  if (!s.firsts?.quay) return { ok: false, reason: 'Pave the quay first', lot, price };
  if (onLot(s, lot.id)) return { ok: false, reason: 'This lot is taken', lot, price };
  if (def.lots && !def.lots.includes(lot.id) || lot.reserved && !def.lots?.includes(lot.id)) return { ok: false, reason: 'It belongs on another lot', lot, price };
  if ((s.counts[kind] ?? 0) >= (def.max ?? Infinity)) return { ok: false, reason: 'The quay has all of these it can hold', params: { kind, lock: 'max' }, lot, price };
  if (s.level < def.level) return { ok: false, reason: 'Reach level {level} first', params: { level: def.level, kind, lock: 'level' }, lot, price };
  if (s.coins < price) return { ok: false, reason: 'Not enough coins', lot, price };
  return { ok: true, lot, price };
}
/** Rent waiting at the quay houses: R.house.rent for every rentMs since it was last collected, at most `cap` payments each. */
export function quayRent(s, now) {
  let total = 0;
  for (const [id, f] of Object.entries(s.flats ?? {})) if (s.placed[id]) total += R.house.rent * Math.min(R.house.cap, Math.floor(Math.max(0, now - f.rentFrom) / R.house.rentMs));
  return total;
}
/** The rent was collected (core/homes.mjs collectRent): each house keeps the part of a payment already waited for. */
export function quayRentCollected(s, now) {
  for (const [id, f] of Object.entries(s.flats ?? {})) {
    if (!s.placed[id]) continue;
    const waited = Math.max(0, now - f.rentFrom);
    f.rentFrom = waited >= R.house.cap * R.house.rentMs ? now : now - waited % R.house.rentMs;
  }
}
/** Families who have come back to live on the quay. */
export const returnedFamilies = s => s.stats?.returned ?? 0;

export const actions = {
  /** Pave the old quay: its cobbles, its lamps, and seven lots for the riverside town. */
  paveQuay(ctx) {
    const { s, now } = ctx, plan = quayPlan(s);
    if (!plan.ok) return ctx.fail(plan.reason, plan.params);
    s.coins -= plan.price; (s.firsts ??= {}).quay = now; gainXp(ctx, XP.build * 6);
    ctx.emit('quayPaved', { lots: LOTS.length });
    return { price: plan.price };
  },
  /** Build a riverside building on a free lot: { lot, kind }. */
  buildOnLot(ctx, { lot, kind } = {}) {
    const { s, now } = ctx, plan = lotPlan(s, lot, kind);
    if (!plan.ok) return ctx.fail(plan.reason, plan.params);
    const def = BUILDINGS[kind], at = plan.lot, id = `p${s.nextId++}`;
    s.coins -= plan.price; s.placed[id] = { kind, x: at.x, z: at.z, rot: 0, lot: at.id };
    s.counts[kind] = (s.counts[kind] ?? 0) + 1; grid.touch(s);
    const built = (s.stats.built ??= {}); if (s.counts[kind] > (built[kind] ?? 0)) { built[kind] = s.counts[kind]; gainXp(ctx, XP.build * 6); }
    if (def.flats) {   // a quay house: families who left the valley come back to live in it
      (s.flats ??= {})[id] = { rentFrom: now }; s.stats.returned = (s.stats.returned ?? 0) + def.flats;
      ctx.emit('familiesReturned', { id, count: def.flats, total: s.stats.returned });
    }
    ctx.emit('placed', { id, kind, x: at.x, z: at.z, rot: 0, lot: at.id });
    return { id, price: plan.price };
  },
};
