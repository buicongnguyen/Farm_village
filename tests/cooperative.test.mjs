// Chapter 12, one river, many farms (docs/plan/ch12-one-river-many-farms.md): the two growers from outside, the
// co-operative (founding, shared orders, settling) and the old towpath on the far bank, opened when the chapter is seen.
import './tz.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/core/state.mjs';
import { act, tick } from '../src/core/act.mjs';
import { foundingPlan, makeOrder, lineLeft, members, hasCalled, isFounded, cooperativeOf } from '../src/core/cooperative.mjs';
import { COOPERATIVE, NEIGHBOURS as N } from '../src/content/economy.mjs';
import { GOODS } from '../src/content/goods.mjs';
import { NEIGHBOURS, hasArrived } from '../src/content/people.mjs';
import { planDay } from '../src/core/neighbours.mjs';
import { posters } from '../src/core/orders.mjs';
import { stepCost, findRoute } from '../src/core/walk.mjs';
import { TOWPATH, TOWPATH_GATE, COOPERATIVE_BOARD, OLD_MILL, NEIGHBOUR_SIGNS, PLAZA, WELL, SITES, inTowpath, isBrook, isRoad, inOldMill, brookZ, STEPPING_STONES } from '../src/content/world.mjs';
import { CHAPTERS, BEATS } from '../src/content/story.mjs';
import { HEART_SCENES } from '../src/content/hearts.mjs';
import { resolveNames } from '../src/content/character-names.mjs';
import { stepDone } from '../src/core/projects.mjs';
import { reportOf } from '../src/core/report.mjs';
import * as grid from '../src/core/grid.mjs';
import { pack, unpack } from '../src/kit/save.mjs';
import { must, T0, MIN } from './helpers.mjs';

/** A farm at the start of chapter 12 (the tester's jump): chapter 11 seen, the meadow kept. */
function farm(seed = 4242) {
  const s = newGame(T0, seed, { restore: true }); tick(s, T0); must(s, 'testJumpChapter', { chapter: 12 });
  s.coins = 50000; s.barn.cap = 5000; return s;
}
/** Both newcomers have called: time passes until each has paid the first visit. */
function called(s, from = T0) { tick(s, from + 1); const at = from + 1 + 3 * N.firstCallMs; tick(s, at); return at; }   // they arrive, then call
const gift = s => { for (const [g, n] of Object.entries(COOPERATIVE.gift)) s.barn.items[g] = (s.barn.items[g] ?? 0) + n; };
const ch = CHAPTERS.find(c => c.id === 12), newcomers = NEIGHBOURS.filter(n => n.arrives);

test('two growers from outside come with chapter 11: they call soon, one after the other, then live like the other neighbours', () => {
  assert.deepEqual(newcomers.map(n => n.id), ['priya', 'twins']); assert.equal(NEIGHBOURS.length, 4);
  for (const n of newcomers) {
    assert.ok(n.farm && n.line && n.orders.length >= 4 && n.orders.length <= 6 && n.arc?.[0]?.visit === 1 && n.remarks.length >= 2, n.id);
    for (const g of [...n.gives, ...n.wants, ...Object.values(n.givesBy ?? {}).flat()]) assert.ok(GOODS[g], `${n.id}: no good ${g}`);
    assert.ok(NEIGHBOUR_SIGNS.some(sg => sg.id === n.id), `${n.id} has no signpost`);
    assert.deepEqual(Object.keys(HEART_SCENES[n.id]).map(Number), [3, 6, 9]);
  }
  const early = newGame(T0, 3, { restore: true }); tick(early, T0); must(early, 'testJumpChapter', { chapter: 11 });
  for (const n of newcomers) { assert.equal(hasArrived(early, n), false); assert.equal(early.neighbours[n.id], undefined, `${n.id} is here too soon`); assert.ok(!posters(early, T0).includes(n.id)); }
  assert.deepEqual(members(early), ['mai', 'gus']);
  const s = farm(); assert.deepEqual(members(s), ['mai', 'gus', 'priya', 'twins']);
  tick(s, T0 + 1000);
  assert.deepEqual(s.neighbours.priya.visits, [T0 + 1000 + N.firstCallMs]); assert.deepEqual(s.neighbours.twins.visits, [T0 + 1000 + 2 * N.firstCallMs]);
  assert.ok(!hasCalled(s, 'priya') && !hasCalled(s, 'twins'));
  const first = tick(s, T0 + 1000 + N.firstCallMs + 1).events.filter(e => e.type === 'neighbourVisit');
  assert.deepEqual(first.map(e => e.id), ['priya']); assert.match(resolveNames(first[0].comment, 'en'), /Juniper, from Hillside Orchard/);
  const second = tick(s, T0 + 1000 + 2 * N.firstCallMs + 1).events.filter(e => e.type === 'neighbourVisit');
  assert.deepEqual(second.map(e => e.id), ['twins']); assert.match(resolveNames(second[0].comment, 'en'), /Pebble and Sprig, from Brookhead Farm/);
  assert.ok(hasCalled(s, 'priya') && hasCalled(s, 'twins')); assert.ok(posters(s, T0).includes('priya') && posters(s, T0).includes('twins'));
  assert.ok(BEATS.find(b => b.id === 'coop-idea').when(s), 'the idea comes once both have called');
  // the next day they plan like anyone
  tick(s, T0 + 26 * 60 * MIN); assert.equal(s.neighbours.twins.visits.length, N.visitsPerDay);
});
test('the twins bring what the answer to Mr Albright did not give: honey to the cannery\'s valley, tins to the meadow\'s', () => {
  const meadow = farm(1), factory = farm(1); factory.story.albright = 'factory';
  const gives = (s, days = 12) => new Set(Array.from({ length: days }, (_, d) => planDay(s, 'twins', T0 + d * 24 * 60 * MIN).trade).filter(Boolean).flatMap(t => Object.keys(t.gives)));
  assert.deepEqual([...gives(meadow)].sort(), ['canned_corn', 'canned_tomato']); assert.deepEqual([...gives(factory)], ['honey']);
  const p = planDay(meadow, 'priya', T0).trade; if (p) assert.ok(['peach', 'orange', 'coconut'].includes(Object.keys(p.gives)[0]));
});
test('founding: both newcomers must have called, and it takes exactly the gift', () => {
  const s = farm(); gift(s);
  let plan = foundingPlan(s); assert.equal(plan.ok, false); assert.equal(plan.reason, 'Your new neighbours have not both called yet'); assert.deepEqual(plan.callers.map(c => c.called), [false, false]);
  const before = JSON.stringify(s); assert.equal(act(s, 'foundCooperative', {}, T0).ok, false); assert.equal(JSON.stringify(s), before);
  const at = called(s); s.barn.items = { wheat: 50 };
  plan = foundingPlan(s); assert.equal(plan.reason, 'The founding gift is not in the barn yet'); assert.ok(plan.callers.every(c => c.called)); assert.ok(plan.gift.every(g => g.have === 0));
  s.barn.items = { wheat: 50 }; gift(s); s.barn.items.bread += 3;
  plan = foundingPlan(s); assert.ok(plan.ok); assert.equal(stepDone(s, 'cooperative'), false);
  const r = act(s, 'foundCooperative', {}, at); assert.ok(r.ok, r.reason);
  assert.equal(s.barn.items.bread, 3); for (const g of Object.keys(COOPERATIVE.gift)) if (g !== 'bread') assert.equal(s.barn.items[g] ?? 0, 0, `${g} was not taken`);
  assert.equal(s.barn.items.wheat, 50); assert.ok(isFounded(s)); assert.ok(stepDone(s, 'cooperative'));
  assert.ok(r.events.some(e => e.type === 'cooperativeFounded' && e.members.length === 4)); assert.ok(r.events.some(e => e.type === 'cooperativeOrderPosted' && e.n === 0));
  assert.ok(s.cooperative.order, 'the first order is posted at once'); assert.ok(BEATS.find(b => b.id === 'coop-founded').when(s));
  assert.equal(act(s, 'foundCooperative', {}, at).reason, 'The co-operative is founded already');
  const none = newGame(T0, 3, { restore: true }); tick(none, T0); assert.equal(foundingPlan(none).reason, 'Nobody has thought of it yet'); assert.equal(act(none, 'foundCooperative', {}, T0).ok, false);
});
test('a shared order: three goods, a third of each brought by a neighbour, seeded and kept over a reload', () => {
  const s = farm(), o = makeOrder(s, 0);
  assert.equal(o.lines.length, COOPERATIVE.lines); assert.equal(new Set(o.lines.map(l => l.good)).size, COOPERATIVE.lines);
  for (const l of o.lines) {
    assert.ok(GOODS[l.good] && !['feed', 'fish'].includes(GOODS[l.good].kind), l.good);
    assert.ok(l.need >= COOPERATIVE.min && l.need <= COOPERATIVE.max, `${l.good} × ${l.need}`);
    assert.equal(l.pledged, Math.round(l.need * COOPERATIVE.pledge)); assert.ok(members(s).includes(l.by)); assert.equal(l.sent, 0); assert.ok(lineLeft(l) > 0);
  }
  const worth = o.lines.reduce((sum, l) => sum + (l.need - l.pledged) * GOODS[l.good].value, 0);
  assert.equal(o.coins, Math.round(worth * COOPERATIVE.pay) + COOPERATIVE.coins); assert.ok(o.coins > worth, 'sending together pays better than the barn door');
  assert.deepEqual(makeOrder(s, 0), o, 'the same farm is asked the same thing'); assert.notDeepEqual(makeOrder(s, 1).lines.map(l => l.good), o.lines.map(l => l.good).concat('x'));
  // a bare farm is still asked for three things any farm can sow
  const bare = newGame(T0, 9); tick(bare, T0); assert.equal(makeOrder(bare, 0).lines.length, COOPERATIVE.lines);
  const at = called(s); gift(s); must(s, 'foundCooperative', {}, at);
  const back = unpack(pack(s)); assert.deepEqual(back.cooperative.order, s.cooperative.order); assert.deepEqual(cooperativeOf(back).order.lines, s.cooperative.order.lines);
});
test('filling: a little at a time from the barn, never more than is wanted; the last crate settles it, once', () => {
  const s = farm(); const at = called(s); gift(s); must(s, 'foundCooperative', {}, at);
  const o = s.cooperative.order, [a, b, c] = o.lines;
  assert.equal(act(s, 'fillCooperative', { good: 'no_such_good' }, at).reason, 'The order does not ask for that');
  s.barn.items = {}; let before = JSON.stringify(s);
  assert.equal(act(s, 'fillCooperative', { good: a.good }, at).reason, 'Missing goods'); assert.equal(act(s, 'fillCooperative', { good: a.good, n: -2 }, at).reason, 'Unknown amount'); assert.equal(JSON.stringify(s), before);
  s.barn.items[a.good] = 1; let r = must(s, 'fillCooperative', { good: a.good, n: 3 }, at); assert.equal(r.sent, 1, 'all that is in the barn'); assert.equal(s.barn.items[a.good] ?? 0, 0); assert.equal(a.sent, 1); assert.equal(r.done, false);
  assert.ok(r.events.some(e => e.type === 'cooperativeSent' && e.good === a.good && e.n === 1 && e.left === lineLeft(a)));
  const left = lineLeft(a); s.barn.items[a.good] = left + 40; r = must(s, 'fillCooperative', { good: a.good, n: left + 40 }, at);
  assert.equal(r.sent, left, 'never more than the line wants'); assert.equal(s.barn.items[a.good], 40); assert.equal(lineLeft(a), 0);
  assert.equal(act(s, 'fillCooperative', { good: a.good }, at).reason, 'That line is full');
  s.barn.items[b.good] = lineLeft(b); must(s, 'fillCooperative', { good: b.good }, at); assert.equal(ch.when(s), false);
  const coins = s.coins, earned = s.stats.coinsEarned, friends = Object.fromEntries(members(s).map(id => [id, s.neighbours[id].friendship ?? 0]));
  s.barn.items[c.good] = lineLeft(c); r = must(s, 'fillCooperative', { good: c.good }, at); assert.equal(r.done, true);
  const done = r.events.find(e => e.type === 'cooperativeOrderDone'); assert.ok(done && done.coins === o.coins && done.n === 0);
  assert.equal(s.coins, coins + o.coins); assert.equal(s.stats.coinsEarned, earned + o.coins); assert.equal(s.cooperative.filled, 1); assert.equal(s.cooperative.order, null);
  assert.ok(done.friends.length >= 1 && done.friends.length <= COOPERATIVE.friends); for (const id of done.friends) assert.equal(s.neighbours[id].friendship, Math.min(10, friends[id] + 1));
  assert.equal(reportOf(s).rows.find(([k]) => k === 'cooperative')?.[1], o.coins, 'the evening sums know where the coins came from');
  assert.equal(act(s, 'fillCooperative', { good: c.good }, at).reason, 'No order is posted just now'); assert.equal(s.coins, coins + o.coins, 'paid once');
  assert.ok(stepDone(s, 'cooperative_order')); assert.equal(ch.when(s), true);
  // the next order waits for the carts to come back
  assert.equal(s.cooperative.nextAt, at + COOPERATIVE.everyMs); assert.ok(!tick(s, at + COOPERATIVE.everyMs - 1000).events.some(e => e.type === 'cooperativeOrderPosted'));
  const next = tick(s, at + COOPERATIVE.everyMs + 1).events.find(e => e.type === 'cooperativeOrderPosted'); assert.ok(next && next.n === 1); assert.equal(s.cooperative.order.n, 1);
  // and a tester need not wait
  const t = farm(7); const at2 = called(t); gift(t); must(t, 'foundCooperative', {}, at2); for (const l of t.cooperative.order.lines) { t.barn.items[l.good] = lineLeft(l); must(t, 'fillCooperative', { good: l.good }, at2); }
  must(t, 'testFinishTimers', {}, at2 + 1000); assert.ok(tick(t, at2 + 2000).events.some(e => e.type === 'cooperativeOrderPosted'));
  const nobody = farm(8); assert.equal(act(nobody, 'fillCooperative', { good: 'wheat' }, T0).reason, 'The co-operative is not founded yet');
});
test('the old towpath: two cells along the far bank, round the old mill, dry, and shut until chapter 12 is seen', () => {
  const cells = []; for (let x = TOWPATH.x0; x <= TOWPATH.x1; x++) for (let z = 0; z < 24; z++) if (inTowpath(x, z)) cells.push([x, z]);
  assert.ok(cells.length >= 2 * (TOWPATH.x1 - TOWPATH.x0 + 1));
  for (const [x, z] of cells) { assert.ok(!isBrook(x, z), `${x},${z} is water`); assert.ok(z < brookZ(x), `${x},${z} is on the near bank`); assert.ok(!inOldMill(x, z), `${x},${z} is in the mill`); assert.ok(z >= 1, `${x},${z} is off the map`); }
  for (let x = TOWPATH.x0; x <= TOWPATH.x1; x++) assert.ok(cells.filter(c => c[0] === x).length >= 2, `column ${x}`);
  assert.ok(!inTowpath(TOWPATH.x0 - 1, brookZ(TOWPATH.x0 - 1) - 2) && !inTowpath(50, brookZ(50) + 3));
  assert.ok(inTowpath(Math.floor(TOWPATH_GATE.x), Math.floor(TOWPATH_GATE.z)) && inTowpath(Math.floor(TOWPATH_GATE.x), Math.ceil(TOWPATH_GATE.z) - 1), 'the gate stands across the path');
  // shut: nobody walks there; the road and the stepping stones are as they were
  const s = farm(), far = [OLD_MILL.box.x1 + 3, brookZ(OLD_MILL.box.x1 + 3) - 2], home = [40, 63];
  assert.equal(stepCost(s, ...far), 0); assert.equal(findRoute(s, home, far, { exact: true }).length, 0);
  assert.ok(stepCost(s, STEPPING_STONES.x, brookZ(STEPPING_STONES.x)) > 0); assert.ok(isRoad(28, 5) && stepCost(s, 28, 5) > 0);
  // the deed, then the card: the gate comes off
  const at = called(s); gift(s); must(s, 'foundCooperative', {}, at); for (const l of s.cooperative.order.lines) { s.barn.items[l.good] = lineLeft(l); must(s, 'fillCooperative', { good: l.good }, at); }
  assert.equal(s.firsts.bridge, undefined); assert.equal(BEATS.find(b => b.id === 'bridge-open').when(s), false);
  const seen = must(s, 'chapterSeen', { id: 12 }, at + 5); assert.equal(s.firsts.bridge, at + 5); assert.equal(seen.events.filter(e => e.type === 'bridgeOpened').length, 1);
  assert.ok(BEATS.find(b => b.id === 'bridge-open').when(s));
  for (const [x, z] of cells) assert.ok(stepCost(s, x, z) > 0, `${x},${z} cannot be walked`);
  const way = findRoute(s, home, far, { exact: true }); assert.ok(way.length > 10, 'no way to the far bank'); assert.ok(way.some(([x, z]) => isBrook(x, z)), 'it crosses the water by the road bridge or the stones');
  assert.ok(findRoute(s, [TOWPATH.x0, brookZ(TOWPATH.x0) - 2], [TOWPATH.x1, brookZ(TOWPATH.x1) - 2], { exact: true }).length >= TOWPATH.x1 - TOWPATH.x0, 'the path is one path, end to end');
  const again = must(s, 'chapterSeen', { id: 12 }, at + 99); assert.equal(s.firsts.bridge, at + 5); assert.ok(!again.events.some(e => e.type === 'bridgeOpened'));
  assert.equal(unpack(pack(s)).firsts.bridge, at + 5);
});
test('the co-operative\'s board stands on the village square, clear of the stage and the well; nobody walks through it', () => {
  const { x, z } = COOPERATIVE_BOARD; assert.ok(x >= PLAZA.x0 && x <= PLAZA.x1 && z >= PLAZA.z0 && z <= PLAZA.z1); assert.ok(!(x === WELL.x && z === WELL.z));
  const stage = SITES.find(st => st.kind === 'stage'); assert.ok(!grid.cellsOf('stage', stage.x, stage.z, stage.rot).some(([cx, cz]) => cx === x && cz === z));
  const early = newGame(T0, 3, { restore: true }); tick(early, T0); assert.ok(stepCost(early, x, z) > 0, 'before the idea, the cell is open square');
  const s = farm(); assert.equal(stepCost(s, x, z), 0); assert.ok(stepCost(s, x, z + 1) > 0, 'one can stand in front of it');
  assert.equal(grid.canPlace(s, 'bench', x, z, 0).ok, false);
});
test('chapter 12: the deed is the first shared order; the tester can jump past it', () => {
  assert.ok(ch && ch.panels.length === 3 && ch.ada); const en = resolveNames(ch.text, 'en'); assert.ok(en.length <= 340, `${en.length} letters`); assert.match(en, /Bramble first/);
  for (const id of ['coop-idea', 'coop-founded', 'bridge-open']) assert.equal(BEATS.find(b => b.id === id).chapter, 12);
  const s = farm(); assert.equal(ch.when(s), false);
  const t = newGame(T0, 3, { restore: true }); tick(t, T0); const r = must(t, 'testJumpChapter', { chapter: 13 });
  assert.deepEqual(r.missing, []); assert.ok(isFounded(t) && t.cooperative.filled >= 1 && ch.when(t)); assert.equal(t.story.chapter, 12); assert.ok(t.firsts.bridge, 'the gate is off');
  assert.ok(hasCalled(t, 'priya') && hasCalled(t, 'twins'));
  const u = farm(5); must(u, 'testFinishChapter', {}); assert.ok(ch.when(u)); assert.equal(u.firsts.bridge, undefined, 'the card opens the gate, not the deed');
  tick(u, T0 + 5000); assert.ok(u.cooperative.order, 'a tester who finished the chapter still finds an order on the board');
});
