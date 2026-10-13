// Surprises (content/surprises.mjs, docs/plan/96-surprises.md): rare hens, a herd that grows by itself, the gold rush,
// two gifts by letter, and the album of lucky finds. They only ever add; every roll is seeded and has a ceiling.
//   s.stats.playMs   time played (at most a minute per tick: a closed game or a jumped clock earns none)
//   s.surprises = { found: { [find]: when }, hens: bought so far, rare: hens since the last rare one, rainbow: true once
//     one came, goat / calf: { at: play time when the herd began, n: how many came }, rushAt: play time of the last roll,
//     misses: rolls since the last rush, rush: { from, until, pans, panAt } | null, house: when inherited, houseFrom:
//     rent collected up to, truck: when given }
//   an animal may carry variant: 'black' | 'rainbow' (a hen), wild: true (the forest goat), bornAt (a calf)
import { SURPRISES, HEN_EGGS, LUCKY_FINDS } from '../content/surprises.mjs';
import { ANIMALS } from '../content/goods.mjs';
import { BUILDINGS } from '../content/buildings.mjs';
import { TRUCK, HOUR, RENT } from '../content/economy.mjs';
import { hash } from './rng.mjs';
import { isWorking } from './working.mjs';

const stamp = n => Number.isSafeInteger(n) && n >= 0;
const whole = (n, max = 1e9) => (Number.isSafeInteger(n) && n > 0 ? Math.min(n, max) : 0);
const FIND_IDS = new Set(LUCKY_FINDS.map(f => f.id));
/** A clean copy of the saved surprises. */
export function normalizeSurprises(s) {
  const raw = s.surprises && typeof s.surprises === 'object' && !Array.isArray(s.surprises) ? s.surprises : {}, found = {};
  for (const id of FIND_IDS) if (stamp(raw.found?.[id])) found[id] = raw.found[id];
  const herd = h => (h && stamp(h.at) ? { at: h.at, n: whole(h.n, SURPRISES.herd.extra) } : null);
  const r = raw.rush, rush = r && stamp(r.from) && stamp(r.until) && r.until > r.from ? { from: r.from, until: r.until, pans: whole(r.pans, SURPRISES.rush.pans), panAt: stamp(r.panAt) ? r.panAt : 0, ...(r.told === true ? { told: true } : {}) } : null;
  const rentRushes = (Array.isArray(raw.rentRushes) ? raw.rentRushes : []).filter(r => stamp(r?.from) && stamp(r?.until) && r.until > r.from)
    .map(r => ({ from: r.from, until: Math.min(r.until, r.from + SURPRISES.rush.lastsMs) })).sort((a, b) => a.from - b.from).slice(-64);
  return { found, ...(rentRushes.length ? { rentRushes } : {}), ...(stamp(raw.playAt) ? { playAt: raw.playAt } : {}), hens: whole(raw.hens), rare: whole(raw.rare), rainbow: raw.rainbow === true, goat: herd(raw.goat), calf: herd(raw.calf),
    rushAt: stamp(raw.rushAt) ? raw.rushAt : 0, misses: whole(raw.misses, SURPRISES.rush.by), rush, house: stamp(raw.house) ? raw.house : null,
    houseFrom: stamp(raw.houseFrom) ? raw.houseFrom : null, truck: stamp(raw.truck) ? raw.truck : null };
}
const state = s => (s.surprises = normalizeSurprises(s));
const find = (ctx, st, id, extra = {}) => { if (st.found[id] != null) return; st.found[id] = ctx.now; ctx.emit('luckyFind', { id, ...extra }); };
export const luckyFinds = s => { const found = s.surprises?.found ?? {}; return LUCKY_FINDS.map(f => ({ ...f, at: stamp(found[f.id]) ? found[f.id] : null })); };

// ── Rare hens ──
/** What the next hen bought will be: null, 'black' or 'rainbow'. Seeded by the farm and how many hens it has bought. */
export function nextHen(s) {
  const st = normalizeSurprises(s), n = st.hens + 1, H = SURPRISES.hens;
  if (n <= H.after) return null;
  if (!st.rainbow && (n >= H.rainbowBy || hash(s.seed, 'rainbow-hen', n) % H.rainbow === 0)) return 'rainbow';
  return st.rare + 1 >= H.blackBy || hash(s.seed, 'black-hen', n) % H.black === 0 ? 'black' : null;
}
/** Called when an animal is bought: a hen may turn out rare. Returns its variant or null. */
export function henArrives(ctx, animal) {
  if (animal.kind !== 'hen') return null;
  const variant = nextHen(ctx.s), st = state(ctx.s);
  st.hens++; st.rare = variant ? 0 : st.rare + 1; if (variant === 'rainbow') st.rainbow = true;
  if (variant) { animal.variant = variant; find(ctx, st, `${variant}_hen`); ctx.emit('rareHen', { variant }); }
  return variant;
}
/** What an animal gives when collected: its kind's produce, or a rare hen's egg. */
export const produceOf = an => HEN_EGGS[an.variant] ?? ANIMALS[an.kind].gives;

// ── The herd grows ──
const homesOf = (s, kind) => Object.keys(s.placed).filter(id => BUILDINGS[s.placed[id].kind]?.animals === kind && isWorking(s, id));
function herdGrows(ctx, st, key, kind, need, findId, make) {
  const { s } = ctx, H = SURPRISES.herd, homes = homesOf(s, kind), have = homes.reduce((n, id) => n + (s.animals[id]?.length ?? 0), 0);
  if (have < need) return;
  const h = (st[key] ??= { at: s.stats.playMs, n: 0 }), due = H[key][h.n];
  if (due == null || s.stats.playMs - h.at < due) return;
  // the barn with the fewest animals takes it, also when it is full (H.extra more than it holds, at most)
  const room = homes.map(id => [id, s.animals[id]?.length ?? 0]).filter(([, n]) => n < ANIMALS[kind].perHome + H.extra).sort((a, b) => a[1] - b[1])[0];
  if (!room) return;
  h.n++; (s.animals[room[0]] ??= []).push(make()); find(ctx, st, findId);
  ctx.emit('herdGrew', { home: room[0], kind, find: findId }); ctx.emit('animalArrived', { home: room[0], kind });
}

// ── The gold rush ──
export const rushActive = (s, now) => { const r = s.surprises?.rush; return !!r && now >= r.from && now < r.until; };
/** { active, leftMs, pans, pansLeft, canPan, waitMs } for the panel and the pill. */
export function rushStatus(s, now) {
  const r = s.surprises?.rush, active = rushActive(s, now), R = SURPRISES.rush;
  const pans = active ? r.pans ?? 0 : 0, waitMs = active ? Math.max(0, (r.panAt ?? 0) + R.panMs - now) : 0;
  return { active, leftMs: active ? r.until - now : 0, pans, pansLeft: active ? R.pans - pans : 0, waitMs, canPan: active && pans < R.pans && waitMs <= 0 };
}
const rented = (s, now) => Object.values(s.homes ?? {}).some(h => h.family && h.arrivesAt <= now);
/** How long of [from, to] lies inside the rush (ms): the part of a cottage's uncollected rent that is doubled. */
export function rushOverlap(s, from, to) {
  const st = s.surprises; if (!st) return 0;
  // Union the windows, so even duplicate or overlapping saved periods cannot pay twice.
  let total = 0, cursor = from;
  for (const r of [...(st.rentRushes ?? []), ...(st.rush ? [st.rush] : [])].sort((a, b) => a.from - b.from)) {
    const start = Math.max(cursor, r.from), end = Math.min(to, r.until);
    if (end > start) { total += end - start; cursor = end; }
  }
  return total;
}
/** The uncle's house in town: rent waiting (capped like a cottage's). */
export function houseRent(s, now) {
  const st = s.surprises; if (!stamp(st?.house)) return 0;
  const H = SURPRISES.house; return Math.floor(H.perHour * Math.min(H.capHours, Math.max(0, now - (st.houseFrom ?? st.house)) / HOUR));
}
/** Rent was collected: the house's rent starts again, and a finished rush is forgotten. */
export function rentCollected(s, now) {
  if (!s.surprises) return; delete s.surprises.rentRushes; if (stamp(s.surprises.house)) s.surprises.houseFrom = now;
  if (s.surprises.rush && now >= s.surprises.rush.until) s.surprises.rush = null;
}

/** Called by tick(): play time, the herd, the rush's roll. */
export function tickSurprises(ctx) {
  const { s, now } = ctx, st = state(s), elapsed = now - (st.playAt ?? s.lastSeen ?? now);
  // Actions also update lastSeen. A separate tick clock counts their time without treating absence as play.
  s.stats.playMs = (s.stats.playMs ?? 0) + (elapsed >= 0 && elapsed <= SURPRISES.tickCap ? elapsed : 0);
  st.playAt = now;
  if (st.rentRushes) st.rentRushes = st.rentRushes.filter(r => r.until > now - RENT.capHours * HOUR);
  const H = SURPRISES.herd, R = SURPRISES.rush, play = s.stats.playMs;
  const goats = homesOf(s, 'goat').length, cows = homesOf(s, 'cow').length, homes = rented(s, now);
  if (!goats && !cows && !homes && !s.surprises?.rush) return;   // nothing a surprise is about yet
  if (goats) herdGrows(ctx, st, 'goat', 'goat', 1, 'wild_goat', () => ({ kind: 'goat', doneAt: null, wild: true }));
  if (cows) herdGrows(ctx, st, 'calf', 'cow', H.cows, 'calf', () => ({ kind: 'cow', doneAt: null, bornAt: now }));
  // the rush: one roll for every R.everyMs of play with a rented cottage; certain on the R.by-th roll in a row
  if (st.rush && now >= st.rush.until && !st.rush.told) { st.rush.told = true; ctx.emit('rushEnded', {}); }
  if (homes && !rushActive(s, now)) {
    if (!st.rushAt) st.rushAt = play;   // the first roll comes a full stretch after the first tenant
    else if (play - st.rushAt >= R.everyMs) {
      st.rushAt = play; const roll = hash(s.seed, 'gold-rush', Math.floor(play / R.everyMs));
      if (st.misses + 1 >= R.by || roll % R.chance === 0) {
        if (st.rush) (st.rentRushes ??= []).push({ from: st.rush.from, until: st.rush.until });
        st.misses = 0; st.rush = { from: now, until: now + R.lastsMs, pans: 0, panAt: 0 }; find(ctx, st, 'gold_rush'); ctx.emit('rushBegan', { until: st.rush.until }); }
      else st.misses++;
    }
  }
}

export const actions = {
  /** Pan the brook for gold while the rush runs: a few coins each time, R.pans times in a rush. */
  panGold(ctx) {
    const { s, now } = ctx, r = rushStatus(s, now), R = SURPRISES.rush;
    if (!r.active) return ctx.fail('The brook carries no gold today');
    if (r.pansLeft < 1) return ctx.fail('The gravel here is panned out');
    if (r.waitMs > 0) return ctx.fail('Let the water clear first');
    const st = state(s), coins = R.coins[0] + hash(s.seed, 'pan', st.rush.from, st.rush.pans) % (R.coins[1] - R.coins[0] + 1);
    st.rush.pans++; st.rush.panAt = now; s.coins += coins; s.stats.coinsEarned += coins; s.stats.goldPanned = (s.stats.goldPanned ?? 0) + coins;
    find(ctx, st, 'gold_pan'); ctx.emit('goldPanned', { coins, left: R.pans - st.rush.pans }); ctx.emit('coins', { coins });
    return { coins };
  },
};
/** A letter was read (core/bonds.mjs): the uncle's letter gives his house, the company's letter the truck. */
export function letterGift(ctx, id) {
  const { s, now } = ctx;
  if (id === 'uncle-house') { const st = state(s); if (st.house == null) { st.house = now; st.houseFrom = now; find(ctx, st, 'uncle_house'); ctx.emit('houseInherited', {}); } }
  if (id === 'bea-truck') {
    const st = state(s); if (st.truck != null) return;
    st.truck = now; const t = (s.truck ??= { level: 1, away: false, backAt: 0, load: [], coins: 0, fleet: [] }); t.fleet ??= [];
    const fits = 1 + t.fleet.length < TRUCK.fleet.max;
    if (fits) t.fleet.push({ away: false, backAt: 0, load: [], coins: 0 }); else { s.coins += SURPRISES.truck.coins; s.stats.coinsEarned += SURPRISES.truck.coins; }
    find(ctx, st, 'gift_truck'); ctx.emit('truckGiven', { truck: fits, coins: fits ? 0 : SURPRISES.truck.coins });
  }
}
