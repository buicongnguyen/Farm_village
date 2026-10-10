// The hotel on the quay (chapter 14, docs/plan/ch14-rooms-with-a-view.md): guests come because the valley is
// beautiful. While a room is free a guest arrives every now and then (sooner in a prettier valley), stays a while, and
// pays for the room with a tip that grows with the valley's beauty. Each guest wishes for one made food at breakfast:
// serving it from the barn doubles that guest's tip, and is never required. The coins wait at the desk, up to a cap.
//   s.hotel = { level, rooms: [null | { n, at, until, wish, served }], nextAt, held, n }
import { HOTEL as H } from '../content/economy.mjs';
import { GUEST_REMARKS } from '../content/people.mjs';
import { orderable } from './orders.mjs';
import { beautyOf } from './valley.mjs';
import { rng, hash } from './rng.mjs';
import * as barn from './barn.mjs';

/** The hotel's building id, or null. */
export const hotelId = s => Object.keys(s.placed).find(id => s.placed[id].kind === 'hotel') ?? null;
export const roomsOf = s => H.rooms[Math.min(H.rooms.length - 1, s.hotel?.level ?? 0)];
/** How often a guest comes while a room is free, and what a guest tips, at the valley's beauty now. */
export const arriveEvery = s => Math.round(H.arriveMs / (1 + beautyOf(s).rank));
export const tipOf = (s, served = false) => H.tip * (1 + beautyOf(s).rank) * (served ? 2 : 1);
/** When a guest's remark is true of the valley (content/people.mjs GUEST_REMARKS `needs`). */
const GUEST_NEEDS = {
  sluice: s => !!s.firsts?.sluice, meadow: s => s.story?.albright === 'meadow', factory: s => s.story?.albright === 'factory',
  festival: s => (s.stats?.harvestFestivals ?? 0) > 0, towpath: s => !!s.firsts?.bridge, trees: s => beautyOf(s).parts.trees >= 20,
  pond: s => (s.counts?.pond ?? 0) > 0, dock: s => (s.counts?.dock ?? 0) > 0,
};
/** The remark of guest number n (seeded), from those true of the valley now. */
export function remarkOf(s, n) {
  const ok = GUEST_REMARKS.filter(r => !r.needs || GUEST_NEEDS[r.needs]?.(s));
  return ok[hash(s.createdAt, 'guest', n) % ok.length].text;
}
/** What guest number n would like for breakfast: a made food this farm can make, else bread. */
function wishOf(s, n) {
  const can = new Set(orderable(s)), pool = H.wishes.filter(g => can.has(g));
  return pool.length ? rng(hash(s.createdAt, 'wish', n)).pick(pool) : 'bread';
}
/** For the panel: { built, level, rooms: [...], staying, free, held, cap, nextAt, every, rank, canUpgrade }. */
export function hotelOf(s, now) {
  const h = s.hotel, built = !!hotelId(s), rooms = h?.rooms ?? [], rank = beautyOf(s).rank;
  const staying = rooms.filter(Boolean).length, level = h?.level ?? 0;
  return { built, level, rooms, staying, free: rooms.length - staying, held: h?.held ?? 0, cap: H.cap, nextAt: h?.nextAt ?? now, every: arriveEvery(s), rank,
    upgrade: level + 1 < H.rooms.length ? { rooms: H.rooms[level + 1], cost: H.upgradeCost[level + 1] } : null };
}
/** The first staying guest whose wish is in the barn and not yet served: { room, wish } or null (for the HUD). */
export function breakfastReady(s) {
  const rooms = s.hotel?.rooms ?? [];
  for (let i = 0; i < rooms.length; i++) { const g = rooms[i]; if (g && !g.served && barn.free(s, g.wish) > 0) return { room: i, wish: g.wish }; }
  return null;
}
/** Guests leave and arrive in the order it happened, also over the time the game was shut (at most 80 events a tick). */
export function tickHotel(ctx) {
  const { s, now } = ctx, id = hotelId(s); if (!id) return;
  const h = (s.hotel ??= { level: 0, rooms: [], nextAt: now + arriveEvery(s), held: 0, n: 0 });
  while (h.rooms.length < roomsOf(s)) h.rooms.push(null);
  for (let guard = 0; guard < 80; guard++) {
    // the earliest thing due: a guest leaving, or one arriving at a free room
    let leave = -1; for (let i = 0; i < h.rooms.length; i++) if (h.rooms[i] && h.rooms[i].until <= now && (leave < 0 || h.rooms[i].until < h.rooms[leave].until)) leave = i;
    const free = h.rooms.indexOf(null), arriveAt = free >= 0 && h.nextAt <= now ? h.nextAt : Infinity, leaveAt = leave >= 0 ? h.rooms[leave].until : Infinity;
    if (leaveAt === Infinity && arriveAt === Infinity) break;
    if (leaveAt <= arriveAt) {
      const g = h.rooms[leave], coins = H.room + tipOf(s, g.served), kept = Math.min(coins, Math.max(0, H.cap - h.held));
      h.held += kept; h.rooms[leave] = null; s.stats.guests = (s.stats.guests ?? 0) + 1;
      if (h.nextAt < g.until) h.nextAt = g.until;   // a room that was full all along: the next guest was waiting for it
      ctx.emit('guestLeft', { room: leave, coins: kept, served: !!g.served, guests: s.stats.guests });
    } else {
      const n = h.n++, at = h.nextAt;
      h.rooms[free] = { n, at, until: at + H.stayMs, wish: wishOf(s, n), served: false };
      h.nextAt = at + arriveEvery(s);
      const full = !h.rooms.includes(null); if (full && !s.firsts?.fullHouse) (s.firsts ??= {}).fullHouse = now;
      ctx.emit('guestArrived', { room: free, n, wish: h.rooms[free].wish, first: n === 0, full });
    }
  }
}

export const actions = {
  /** Serve a staying guest the breakfast they wished for, from the barn: { room }. Their tip doubles. */
  serveGuest(ctx, { room } = {}) {
    const { s } = ctx, g = Number.isSafeInteger(room) ? s.hotel?.rooms?.[room] : null;
    if (!g) return ctx.fail('Nobody is staying in that room');
    if (g.served) return ctx.fail('They have had their breakfast');
    if (!barn.take(s, { [g.wish]: 1 })) return ctx.fail('Missing goods');
    g.served = true;
    ctx.emit('guestServed', { room, wish: g.wish });
    return { wish: g.wish };
  },
  /** Take the coins waiting at the hotel's desk. */
  collectHotel(ctx) {
    const { s } = ctx, coins = s.hotel?.held ?? 0;
    if (coins <= 0) return ctx.fail('Nothing at the desk yet');
    s.hotel.held = 0; s.coins += coins; s.stats.coinsEarned += coins;
    ctx.emit('coins', { coins, source: 'hotel' });
    return { coins };
  },
  /** Add a floor of rooms: 6 to 9 to 12. */
  upgradeHotel(ctx) {
    const { s } = ctx, h = s.hotel;
    if (!hotelId(s) || !h) return ctx.fail('Build the hotel first');
    if (h.level + 1 >= H.rooms.length) return ctx.fail('Already the best it can be');
    const price = H.upgradeCost[h.level + 1]; if (s.coins < price) return ctx.fail('Not enough coins');
    s.coins -= price; h.level++; while (h.rooms.length < roomsOf(s)) h.rooms.push(null);
    ctx.emit('hotelUpgraded', { id: hotelId(s), level: h.level, rooms: h.rooms.length });
    return { level: h.level };
  },
};
