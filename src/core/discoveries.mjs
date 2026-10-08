// One-time finds follow successful game events. No random rolls, daily resets, or money for opening a card.
import { DISCOVERIES, discoveryOf } from '../content/discoveries.mjs';

const record = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const count = (value, cap) => Math.min(cap, Math.max(0, Number.isFinite(value) ? Math.floor(value) : 0));
const stamp = value => Number.isSafeInteger(value) && value >= 0;
const knownIds = new Set(DISCOVERIES.map(d => d.id));
const ids = value => [...new Set(Array.isArray(value) ? value.filter(id => knownIds.has(id)) : [])];
const has = (object, id) => Object.hasOwn(object, id);

export const newDiscoveries = () => ({ catches: 0, rocks: 0, claimed: {}, retired: [], read: [] });

/** Normalize without mutating. Legacy catches are known; old clearing totals mixed weeds and rocks, so rocks start at zero.
 * Passed milestones are retired, never presented as finds or paid on loading. A still-broken street remains eligible. */
export function normalizeDiscoveries(s) {
  const saved = record(s.discoveries), legacy = !s.discoveries || !Object.keys(saved).length;
  const caught = Math.max(count(s.fishing?.caught, 10), count(s.stats?.fished, 10),
    count(Object.values(record(s.album?.fish)).reduce((n, x) => n + count(x, 10), 0), 10));
  const claimed = { ...record(saved.claimed) };
  // If a partial imported save kept the album stamp but lost this field, do not pay the same find twice.
  for (const d of DISCOVERIES) {
    const at = s.firsts?.[`discovery:${d.id}`];
    if (!has(claimed, d.id) && stamp(at)) claimed[d.id] = at;
  }
  const retired = new Set(ids(saved.retired)), catches = count(saved.catches ?? caught, 10);
  if (legacy || saved.catches == null) {
    for (const d of DISCOVERIES) if (d.trigger.kind === 'catch' && catches >= d.trigger.at && !has(claimed, d.id)) retired.add(d.id);
  }
  if (legacy) {
    const repairedBefore = (s.news ?? []).some(e => e.type === 'repaired' && e.id === 'road_south' && e.broken
      || e.type === 'neighbourRepair' && e.target === 'road_south');
    if ((!(s.cond?.road_south?.level >= 3) && !s.repairing?.road_south || repairedBefore) && !has(claimed, 'street-thanks')) retired.add('street-thanks');
  }
  return { catches, rocks: count(saved.rocks, 2), claimed, retired: [...retired], read: ids(saved.read).filter(id => has(claimed, id)) };
}

/** Read-only album entries: retired legacy milestones are deliberately absent. */
export function discoveryRecords(s) {
  const d = normalizeDiscoveries(s);
  return DISCOVERIES.filter(find => has(d.claimed, find.id) && stamp(d.claimed[find.id]))
    .map(find => ({ ...find, at: d.claimed[find.id], read: d.read.includes(find.id) }));
}
export const unreadDiscoveries = s => discoveryRecords(s).filter(d => !d.read).length;

/** Called only after a successful action, or after tick's repairs. The baseline is captured before any rule changes. */
export function afterDiscoveries(ctx) {
  const catches = ctx.events.filter(e => e.type === 'fishCaught').length;
  const rocks = ctx.events.filter(e => e.type === 'cellChanged' && e.cleared === 'rock' && e.owned).length;
  const street = ctx.events.some(e => e.type === 'repaired' && e.id === 'road_south' && e.broken);
  if (!catches && !rocks && !street) return;
  const before = ctx.discoveryBefore, d = { ...before, claimed: { ...before.claimed } };
  d.catches = Math.min(10, before.catches + catches); d.rocks = Math.min(2, before.rocks + rocks);
  ctx.s.discoveries = d;
  for (const find of DISCOVERIES) {
    const trigger = find.trigger, reached = trigger.kind === 'catch' ? catches > 0 && before.catches < trigger.at && d.catches >= trigger.at
      : trigger.kind === 'rocks' ? rocks > 0 && before.rocks < trigger.at && d.rocks >= trigger.at : street;
    if (!reached || has(d.claimed, find.id) || d.retired.includes(find.id)) continue;
    d.claimed[find.id] = ctx.now;
    ctx.s.coins += find.coins; ctx.s.stats.coinsEarned += find.coins;
    ctx.emit('discovery', { id: find.id, coins: find.coins, person: find.person });
    ctx.emit('coins', { coins: find.coins, source: 'discovery', id: find.id });
  }
}

export const actions = {
  /** Acknowledge an earned card; reading it again is harmless and never pays. */
  readDiscovery(ctx, { id }) {
    const d = ctx.discoveryBefore;
    if (!discoveryOf(id) || !has(d.claimed, id) || !stamp(d.claimed[id])) return ctx.fail('Nothing discovered yet');
    if (!d.read.includes(id)) { d.read.push(id); ctx.s.discoveries = d; }
    return { id, read: true };
  },
};
