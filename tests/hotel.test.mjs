// Chapter 14, rooms with a view (docs/plan/ch14-rooms-with-a-view.md): the hotel on a lot of the quay, guests who come
// sooner and tip more in a prettier valley, the breakfast wish, the desk and its cap, the floors, the chapter.
import './tz.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/core/state.mjs';
import { act, tick } from '../src/core/act.mjs';
import { hotelOf, hotelId, roomsOf, arriveEvery, tipOf, remarkOf, breakfastReady } from '../src/core/hotel.mjs';
import { beautyOf } from '../src/core/valley.mjs';
import { lotPlan, onLot } from '../src/core/riverside.mjs';
import { HOTEL, BEAUTY } from '../src/content/economy.mjs';
import { BUILDINGS } from '../src/content/buildings.mjs';
import { GOODS } from '../src/content/goods.mjs';
import { GUEST_REMARKS } from '../src/content/people.mjs';
import { CHAPTERS, BEATS } from '../src/content/story.mjs';
import { resolveNames } from '../src/content/character-names.mjs';
import { stepDone } from '../src/core/projects.mjs';
import { reportOf } from '../src/core/report.mjs';
import { pack, unpack } from '../src/kit/save.mjs';
import { must, T0, MIN } from './helpers.mjs';

const { stayMs, arriveMs, room, tip, cap } = HOTEL, def = BUILDINGS.hotel;
/** A farm at the start of chapter 14 (the tester's jump), its beauty set to a rank by planting or felling. */
function farm(seed = 4242, rank = 0) {
  const s = newGame(T0, seed, { restore: true }); tick(s, T0); must(s, 'testJumpChapter', { chapter: 14 });
  s.coins = 90000; s.barn.cap = 5000; setRank(s, rank); return s;
}
/** Plain numbers for the valley's beauty: nothing but pines, as many as the rank needs. */
function setRank(s, rank) {
  for (const id of Object.keys(s.placed)) if (id.startsWith('t_pine')) delete s.placed[id];
  s.cond = {}; const base = beautyOf(s).score;
  if (base > BEAUTY.ranks[rank]) { s.story.albright = 'factory'; s.firsts.sluice = undefined; }   // a plainer valley for the low ranks
  for (let i = 0; beautyOf(s).rank < rank && i < 40; i++) s.placed[`t_pine_${i}`] = { kind: 'pine_tree', x: 2, z: 2, rot: 0 };
  return beautyOf(s).rank;
}
const build = (s, lot = 'q2', at = T0) => must(s, 'buildOnLot', { lot, kind: 'hotel' }, at).id;
const ch = CHAPTERS.find(c => c.id === 14);

test('the hotel is a riverside building: one, on any free lot of the paved quay', () => {
  assert.ok(def.lot && def.max === 1 && def.cat === 'projects'); assert.deepEqual(def.size, [6, 5]);
  const s = farm(); assert.equal(hotelId(s), null); assert.equal(hotelOf(s, T0).built, false); assert.equal(act(s, 'collectHotel', {}, T0).ok, false);
  s.level = def.level - 1; assert.equal(lotPlan(s, 'q2', 'hotel').reason, 'Reach level {level} first'); s.level = def.level;
  assert.equal(lotPlan(s, 'q1', 'hotel').reason, 'This lot is taken', 'the quay house stands on the first');
  const coins = s.coins, id = build(s, 'q4'); assert.equal(s.coins, coins - def.cost); assert.equal(onLot(s, 'q4'), id); assert.equal(hotelId(s), id); assert.ok(stepDone(s, 'hotel'));
  assert.equal(lotPlan(s, 'q5', 'hotel').reason, 'The quay has all of these it can hold');
  tick(s, T0 + 1); assert.deepEqual(s.hotel.rooms, Array(HOTEL.rooms[0]).fill(null)); assert.equal(roomsOf(s), 6); assert.equal(s.hotel.nextAt, T0 + 1 + arriveEvery(s));
});
test('guests come while a room is free, sooner in a prettier valley; each stays, then pays the room and a tip that grows with beauty', () => {
  for (const rank of [0, 2]) {
    const s = farm(7, rank); assert.equal(beautyOf(s).rank, rank, 'the fixture sets the rank'); build(s); tick(s, T0);
    assert.equal(arriveEvery(s), Math.round(arriveMs / (1 + rank))); assert.equal(tipOf(s), tip * (1 + rank)); assert.equal(tipOf(s, true), 2 * tip * (1 + rank));
    const every = arriveEvery(s), first = T0 + every;
    assert.ok(!tick(s, first - 1).events.some(e => e.type === 'guestArrived'));
    const a = tick(s, first).events.filter(e => e.type === 'guestArrived'); assert.equal(a.length, 1); assert.ok(a[0].first && a[0].n === 0 && a[0].room === 0);
    const g = s.hotel.rooms[0]; assert.deepEqual([g.n, g.at, g.until, g.served], [0, first, first + stayMs, false]); assert.ok(HOTEL.wishes.includes(g.wish) && GOODS[g.wish]);
    assert.ok(BEATS.find(b => b.id === 'first-guests').when(s));
    // the game shut for a long while: everything happens in order, the rooms fill, guests leave and others take their rooms
    const later = first + stayMs + 3 * every, out = tick(s, later).events, left = out.filter(e => e.type === 'guestLeft'), came = out.filter(e => e.type === 'guestArrived');
    assert.ok(left.length >= 1 && came.length >= 5, `${left.length} left, ${came.length} came`);
    assert.equal(left[0].coins, room + tip * (1 + rank)); assert.equal(left[0].served, false); assert.equal(s.stats.guests, left.length); assert.equal(s.hotel.held, left.length * (room + tip * (1 + rank)));
    for (const x of s.hotel.rooms.filter(Boolean)) assert.ok(x.until > later && x.at <= later, 'nobody stays past their time, nobody arrives from the future');
    assert.equal(new Set(s.hotel.rooms.filter(Boolean).map(x => x.n)).size, s.hotel.rooms.filter(Boolean).length, 'one guest, one room');
  }
  // a prettier valley has had more guests by the same hour
  const plain = farm(9, 0), pretty = farm(9, 3); build(plain); build(pretty);
  for (const s of [plain, pretty]) { tick(s, T0); tick(s, T0 + 6 * stayMs); }
  assert.ok(pretty.stats.guests > plain.stats.guests, `${pretty.stats.guests} > ${plain.stats.guests}`); assert.ok(pretty.hotel.held > plain.hotel.held);
});
test('a full hotel turns nobody away twice: the next guest takes the first room that frees', () => {
  const s = farm(3, 4); build(s); tick(s, T0); const every = arriveEvery(s);
  const full = tick(s, T0 + 6 * every).events.filter(e => e.type === 'guestArrived'); assert.equal(full.length, 6); assert.ok(full.at(-1).full); assert.ok(s.firsts.fullHouse);
  assert.equal(hotelOf(s, T0 + 6 * every).free, 0); assert.ok(BEATS.find(b => b.id === 'full-house').when(s));
  assert.ok(!tick(s, T0 + every + stayMs - 1).events.some(e => e.type === 'guestArrived' || e.type === 'guestLeft'), 'no room, no guest');
  const out = tick(s, T0 + every + stayMs).events; assert.deepEqual(out.filter(e => e.type === 'guestLeft' || e.type === 'guestArrived').map(e => e.type), ['guestLeft', 'guestArrived']);
  assert.equal(s.hotel.rooms[0].n, 6); assert.equal(s.hotel.rooms[0].at, T0 + every + stayMs, 'the waiting guest moved in when the room was free');
});
test('breakfast: serving the wish takes one from the barn and doubles that guest\'s tip, once; it is never required', () => {
  const s = farm(5, 1); build(s); tick(s, T0); const every = arriveEvery(s); tick(s, T0 + 2 * every);
  const [a, b] = s.hotel.rooms; assert.ok(a && b); s.barn.items = {};
  assert.equal(breakfastReady(s), null); let before = JSON.stringify(s);
  assert.equal(act(s, 'serveGuest', { room: 0 }, T0).reason, 'Missing goods'); assert.equal(act(s, 'serveGuest', { room: 5 }, T0).reason, 'Nobody is staying in that room');
  assert.equal(act(s, 'serveGuest', { room: 'x' }, T0).ok, false); assert.equal(act(s, 'serveGuest', {}, T0).ok, false); assert.equal(JSON.stringify(s), before);
  s.barn.items[a.wish] = 3; assert.deepEqual(breakfastReady(s), { room: 0, wish: a.wish });
  const r = must(s, 'serveGuest', { room: 0 }); assert.equal(r.wish, a.wish); assert.equal(s.barn.items[a.wish], 2); assert.equal(a.served, true);
  assert.ok(r.events.some(e => e.type === 'guestServed' && e.room === 0)); assert.equal(act(s, 'serveGuest', { room: 0 }, T0).reason, 'They have had their breakfast'); assert.equal(s.barn.items[a.wish], 2);
  const left = tick(s, b.until).events.filter(e => e.type === 'guestLeft');
  assert.deepEqual(left.map(e => [e.room, e.served, e.coins]), [[0, true, room + 2 * tip * 2], [1, false, room + tip * 2]]);
});
test('the desk holds the coins until they are collected, up to its cap; collecting is counted as the hotel\'s in the evening sums', () => {
  const s = farm(11, 4); build(s); tick(s, T0);
  assert.equal(act(s, 'collectHotel', {}, T0).reason, 'Nothing at the desk yet');
  tick(s, T0 + arriveEvery(s) + stayMs + 1); const held = s.hotel.held; assert.ok(held > 0);
  const coins = s.coins, got = must(s, 'collectHotel', {}, T0 + arriveEvery(s) + stayMs + 1); assert.equal(got.coins, held); assert.equal(s.coins, coins + held); assert.equal(s.hotel.held, 0);
  assert.equal(reportOf(s).rows.find(([k]) => k === 'hotel')?.[1], held);
  // days away: the desk fills to its cap and holds there (guests still come and go)
  let at = T0 + arriveEvery(s) + stayMs + 1; for (let i = 0; i < 60; i++) { at += stayMs; tick(s, at); }
  assert.equal(s.hotel.held, cap); assert.ok(hotelOf(s, at).held >= hotelOf(s, at).cap); assert.ok(s.stats.guests > 40);
  const back = unpack(pack(s)); assert.deepEqual(back.hotel, s.hotel);
});
test('two more floors: nine rooms, then twelve', () => {
  const s = farm(13, 2); assert.equal(act(s, 'upgradeHotel', {}, T0).reason, 'Build the hotel first');
  const id = build(s); tick(s, T0); assert.deepEqual(hotelOf(s, T0).upgrade, { rooms: 9, cost: HOTEL.upgradeCost[1] });
  s.coins = HOTEL.upgradeCost[1] - 1; assert.equal(act(s, 'upgradeHotel', {}, T0).reason, 'Not enough coins');
  s.coins = HOTEL.upgradeCost[1] + HOTEL.upgradeCost[2]; const r = must(s, 'upgradeHotel', {});
  assert.equal(r.level, 1); assert.equal(s.hotel.rooms.length, 9); assert.ok(r.events.some(e => e.type === 'hotelUpgraded' && e.id === id && e.rooms === 9));
  must(s, 'upgradeHotel', {}); assert.equal(s.hotel.rooms.length, 12); assert.equal(s.coins, 0); assert.equal(hotelOf(s, T0).upgrade, null);
  assert.equal(act(s, 'upgradeHotel', {}, T0).reason, 'Already the best it can be');
  tick(s, T0 + 12 * arriveEvery(s)); assert.equal(s.hotel.rooms.filter(Boolean).length, 12, 'every new room takes a guest');
});
test('what guests say is true of the valley they looked at', () => {
  assert.ok(GUEST_REMARKS.length >= 10); assert.ok(GUEST_REMARKS.filter(r => !r.needs).length >= 2, 'some remarks are always true');
  const s = farm(17); s.story.albright = 'meadow'; const said = new Set(Array.from({ length: 80 }, (_, n) => remarkOf(s, n)));
  assert.ok(said.size >= 4); assert.ok(![...said].some(x => /cannery/.test(x)), 'nobody hears a cannery in the meadow\'s valley');
  s.story.albright = 'factory'; const there = new Set(Array.from({ length: 80 }, (_, n) => remarkOf(s, n))); assert.ok(![...there].some(x => /meadow full of flowers/.test(x)));
  assert.equal(remarkOf(s, 5), remarkOf(s, 5), 'a guest says the same thing every time they are asked');
});
test('chapter 14 closes when the hotel stands and ten guests have stayed; a tester need not wait', () => {
  assert.ok(ch && ch.panels.length === 3 && ch.ada); const en = resolveNames(ch.text, 'en'); assert.ok(en.length <= 340, `${en.length} letters`); assert.match(en, /Nana Snow/);
  const s = farm(19, 2); assert.equal(ch.when(s), false); build(s); tick(s, T0); s.stats.guests = 9; assert.equal(ch.when(s), false);
  // "Finish every timer" sends the staying guests on their way and brings the next to the door
  tick(s, T0 + arriveEvery(s)); assert.ok(s.hotel.rooms[0]); s.stats.guests = 9;
  must(s, 'testFinishTimers', {}, T0 + arriveEvery(s) + 1000); tick(s, T0 + arriveEvery(s) + 2000);
  assert.equal(s.stats.guests, 10); assert.equal(ch.when(s), true); assert.ok(stepDone(s, 'ten_guests')); assert.ok(s.hotel.rooms.some(Boolean), 'and the next guest is in');
  const t = newGame(T0, 3, { restore: true }); tick(t, T0); const r = must(t, 'testJumpChapter', { chapter: 15 });
  assert.deepEqual(r.missing, []); assert.equal(t.story.chapter, 14); assert.ok(hotelId(t) && ch.when(t)); assert.equal(onLot(t, 'q2'), hotelId(t), 'on the first free lot');
  const u = farm(21); must(u, 'testFinishChapter', {}); assert.ok(ch.when(u));
});
