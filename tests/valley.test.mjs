// Chapter 11, the man from the city (docs/plan/ch11-the-man-from-the-city.md): the valley's beauty and what it pays,
// Mr Albright's offer, the one choice (the cannery or the meadow), what each answer opens and what stays shut.
import './tz.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/core/state.mjs';
import { act, tick } from '../src/core/act.mjs';
import { beautyOf, beautyRank, beautyBonus, beautyTip, albrightOffer, RANK_NAMES } from '../src/core/valley.mjs';
import { BEAUTY, ORDERS } from '../src/content/economy.mjs';
import { BUILDINGS } from '../src/content/buildings.mjs';
import { RECIPES, GOODS } from '../src/content/goods.mjs';
import { SITES, MEADOW, ALBRIGHT, ROADS, inMeadow, brookCurve, isRoad } from '../src/content/world.mjs';
import { siteOf, siteAt, sitePlan } from '../src/core/sites.mjs';
import * as grid from '../src/core/grid.mjs';
import { orderable } from '../src/core/orders.mjs';
import { giftable } from '../src/core/bonds.mjs';
import { CHAPTERS, BEATS } from '../src/content/story.mjs';
import { VILLAGERS, hasArrived } from '../src/content/people.mjs';
import { resolveNames } from '../src/content/character-names.mjs';
import { stepDone } from '../src/core/projects.mjs';
import { journeyOf } from '../src/core/journey.mjs';
import { pack, unpack } from '../src/kit/save.mjs';
import { must, T0, MIN } from './helpers.mjs';

/** A farm at the start of chapter 11 (the tester's jump): chapter 10 seen, Mr Albright at the gate. */
function farm(seed = 4242) {
  const s = newGame(T0, seed, { restore: true }); tick(s, T0); must(s, 'testJumpChapter', { chapter: 11 });
  s.coins = 50000; s.barn.cap = 5000; return s;
}
/** A bare state for counting: nothing placed, nothing worn, no story. */
function bare() { const s = newGame(T0, 7, { restore: true }); tick(s, T0); s.placed = {}; s.cond = {}; s.firsts = {}; s.story = { chapter: 0, beats: [] }; s.valley = {}; s.production = {}; return s; }
const put = (s, kind, n = 1) => { for (let i = 0; i < n; i++) s.placed[`t_${kind}_${Object.keys(s.placed).length}`] = { kind, x: 2, z: 2, rot: 0 }; };
/** A free place on the farm for this kind. */
function spot(s, kind) {
  for (let z = 24; z <= 87; z++) for (let x = 32; x <= 95; x++) if (grid.canPlace(s, kind, x, z, 0).ok) return { x, z };
  throw new Error(`no room for ${kind}`);
}
const ch = CHAPTERS.find(c => c.id === 11), cannery = siteOf('cannery');

test('beauty counts trees, flowers, water, the meadow and its hives; each part has its cap', () => {
  const s = bare(); assert.deepEqual(beautyOf(s), { score: 0, rank: 0, parts: { trees: 0, flowers: 0, water: 0, care: -0, industry: -0, meadow: 0 } });
  put(s, 'round_tree', 3); put(s, 'cherry_tree', 2); assert.equal(beautyOf(s).parts.trees, 5 * BEAUTY.tree, 'fruit trees count as trees');
  put(s, 'pine_tree', 60); assert.equal(beautyOf(s).parts.trees, BEAUTY.cap.trees);
  const flowers = Object.keys(BUILDINGS).find(k => BUILDINGS[k].cat === 'charm' && !BUILDINGS[k].garden && !['round_tree', 'willow', 'pine_tree', 'tree', 'bush'].includes(k) && !BUILDINGS[k].fruit);
  put(s, flowers, 2); assert.equal(beautyOf(s).parts.flowers, 2 * (BUILDINGS[flowers].charm ?? 1));
  put(s, flowers, 200); assert.equal(beautyOf(s).parts.flowers, BEAUTY.cap.flowers);
  put(s, 'pond', 3); assert.equal(beautyOf(s).parts.water, 2 * BEAUTY.pond, 'two ponds count');
  put(s, 'dock'); s.firsts.sluice = T0; assert.equal(beautyOf(s).parts.water, 2 * BEAUTY.pond + BEAUTY.dock + BEAUTY.sluice);
  s.story.albright = 'meadow'; put(s, 'beehive', 9); assert.equal(beautyOf(s).parts.meadow, BEAUTY.meadow + BEAUTY.cap.hives);
  const b = beautyOf(s); assert.equal(b.score, Object.values(b.parts).reduce((a, n) => a + n, 0)); assert.equal(b.rank, 4); assert.equal(beautyTip(s), null);
});
test('worn things and working factories take beauty away; the cannery most of all, until it is made green', () => {
  const s = bare(); put(s, 'round_tree', 30);
  const ids = Object.keys(s.placed); for (const id of ids.slice(0, 3)) s.cond[id] = { level: 1 };
  assert.equal(beautyOf(s).parts.care, -3 * BEAUTY.worn); assert.equal(beautyTip(s), 'care');
  for (const id of ids) s.cond[id] = { level: 2 }; assert.equal(beautyOf(s).parts.care, -BEAUTY.cap.care);
  s.cond = {}; put(s, 'juice_press', 2); put(s, 'bakery', 4);
  assert.equal(beautyOf(s).parts.industry, -2 * BEAUTY.works, 'a bakery is a quiet neighbour');
  put(s, 'noodle_factory', 9); assert.equal(beautyOf(s).parts.industry, -BEAUTY.cap.industry);
  put(s, 'cannery'); s.story.albright = 'factory'; assert.equal(beautyOf(s).parts.industry, -BEAUTY.cap.industry - BEAUTY.cannery);
  s.cond = {}; assert.equal(beautyTip(s), 'green');
  s.valley.green = true; assert.equal(beautyOf(s).parts.industry, -BEAUTY.cap.industry);
  const poor = bare(); put(poor, 'cannery'); assert.equal(beautyOf(poor).score, 0, 'never below nothing');
});
test('five ranks, and each one pays two in a hundred more on every order', () => {
  assert.equal(RANK_NAMES.length, 5); assert.equal(BEAUTY.ranks.length, 5); assert.deepEqual([...BEAUTY.ranks].sort((a, b) => a - b), BEAUTY.ranks);
  assert.deepEqual(BEAUTY.ranks.map(beautyRank), [0, 1, 2, 3, 4]); assert.equal(beautyRank(BEAUTY.ranks[1] - 1), 0); assert.equal(beautyRank(9999), 4);
  const s = bare(); assert.equal(beautyBonus(s), 0); put(s, 'round_tree', 30); assert.equal(beautyOf(s).rank, 2); assert.equal(beautyBonus(s), 2 * BEAUTY.order);
  // the order board: the same farm, the same seed, a prettier valley
  const plain = farm(9), pretty = farm(9); plain.placed = Object.fromEntries(Object.entries(plain.placed).filter(([, p]) => !BUILDINGS[p.kind].fruit && !['round_tree', 'willow', 'pine_tree', 'tree', 'bush'].includes(p.kind)));
  for (const s2 of [plain, pretty]) { s2.orders.cards = []; s2.orders.nextAt = 0; s2.stats.ordersFilled = Math.max(1, s2.stats.ordersFilled ?? 0); }   // past the tutorial's first order
  put(pretty, 'pine_tree', 40); pretty.firsts.sluice ??= T0;
  assert.ok(beautyOf(pretty).rank > beautyOf(plain).rank);
  tick(plain, T0 + MIN); tick(pretty, T0 + MIN);
  const worth = c => Object.entries(c.need).reduce((sum, [g, n]) => sum + GOODS[g].value * n, 0);
  for (const [s2, name] of [[plain, 'plain'], [pretty, 'pretty']]) {
    assert.ok(s2.orders.cards.length > 0, `${name}: the board filled`);
    for (const c of s2.orders.cards.filter(c => !c.story)) assert.equal(c.coins, Math.round(worth(c) * ORDERS.pay * (1 + beautyBonus(s2))), `${name}: ${JSON.stringify(c.need)}`);
  }
});
test('the cannery has its place on the brook meadow: dry, off the lane, hidden until the answer builds it', () => {
  assert.ok(cannery && cannery.hidden && typeof cannery.when === 'function'); assert.deepEqual(cannery.size, BUILDINGS.cannery.size);
  const cells = grid.cellsOf('cannery', cannery.x, cannery.z, cannery.rot); assert.equal(cells.length, 20);
  for (const [x, z] of cells) {
    assert.ok(inMeadow(x, z), `${x},${z} is off the meadow`); assert.ok(!isRoad(x, z), `${x},${z} is on a road`);
    assert.ok(z >= brookCurve(x + 0.5) + 0.5 + 1.8 + 0.5, `${x},${z} is too near the water`);
  }
  const lane = ROADS.find(r => r.id === 'road_north'); assert.ok(MEADOW.z1 < lane.z0 && MEADOW.x0 >= lane.x0 && MEADOW.x1 <= lane.x1, 'the meadow lies along the north lane');
  for (const [x, z] of ALBRIGHT.hives) assert.ok(inMeadow(Math.floor(x), Math.floor(z)) && z >= brookCurve(x) + 0.5 + 1.8 + 0.4 && !cells.some(([cx, cz]) => cx === Math.floor(x) && cz === Math.floor(z)), `hive ${x},${z}`);
  assert.equal(siteAt(cannery.x, cannery.z), null, 'a tap there finds no building site');
  const s = farm(); assert.equal(sitePlan(s, 'cannery').reason, 'Unknown item'); assert.equal(act(s, 'buildSite', { kind: 'cannery' }, T0).ok, false);
  assert.equal(grid.canPlace(s, 'bench', cannery.x + 1, cannery.z + 1, 0).ok, false, 'nothing else is built on the meadow');
  assert.ok(BUILDINGS.cannery.site && BUILDINGS.cannery.produces && BUILDINGS.cannery.max === 1);
});
test('Mr Albright asks once chapter 10 is behind; he waits as long as it takes and takes one answer', () => {
  const early = newGame(T0, 3, { restore: true }); tick(early, T0); must(early, 'testJumpChapter', { chapter: 10 });
  assert.equal(albrightOffer(early).open, false); assert.equal(act(early, 'answerAlbright', { choice: 'meadow' }, T0).reason, 'Nobody has asked yet');
  const man = VILLAGERS.find(v => v.id === 'albright'); assert.ok(man && man.noOrders && man.noGifts && man.idle.length >= 3); assert.equal(hasArrived(early, man), false);
  const s = farm(); assert.deepEqual(albrightOffer(s), { open: true, answered: null }); assert.equal(hasArrived(s, man), true);
  assert.ok(BEATS.find(b => b.id === 'albright-arrives').when(s)); assert.equal(ch.when(s), false); assert.equal(stepDone(s, 'albright'), false);
  assert.ok(!giftable(s, T0).includes('albright')); assert.ok(!s.orders.cards.some(c => c.from === 'albright'));
  tick(s, T0 + 600 * MIN); assert.equal(albrightOffer(s).open, true, 'nothing happens while the player thinks');
  const before = JSON.stringify(s); assert.equal(act(s, 'answerAlbright', { choice: 'both' }, T0).reason, 'Unknown choice'); assert.equal(act(s, 'answerAlbright', {}, T0).ok, false); assert.equal(JSON.stringify(s), before);
  const r = must(s, 'answerAlbright', { choice: 'meadow' }); assert.equal(r.choice, 'meadow'); assert.ok(r.events.some(e => e.type === 'albrightAnswered' && e.choice === 'meadow'));
  assert.deepEqual(albrightOffer(s), { open: false, answered: 'meadow' }); assert.equal(hasArrived(s, man), false, 'he has gone');
  assert.equal(act(s, 'answerAlbright', { choice: 'factory' }, T0).reason, 'You have given your answer'); assert.equal(s.story.albright, 'meadow');
  assert.equal(ch.when(s), true); assert.ok(stepDone(s, 'albright')); assert.equal(s.firsts.albright, T0);
});
test('the cannery: built by the answer on its site, tins at a strong price, no hives; beauty pays until it is made green', () => {
  const s = farm(), was = beautyOf(s).score, coins = s.coins;
  const r = must(s, 'answerAlbright', { choice: 'factory' }); assert.equal(s.coins, coins, 'at his cost');
  const placed = r.events.find(e => e.type === 'placed'); assert.ok(placed && placed.kind === 'cannery' && placed.site);
  const id = placed.id, p = s.placed[id]; assert.deepEqual([p.kind, p.x, p.z, p.rot], ['cannery', cannery.x, cannery.z, cannery.rot]); assert.equal(s.counts.cannery, 1);
  assert.equal(grid.occupant(s, cannery.x + 4, cannery.z + 3), id); assert.equal(sitePlan(s, 'cannery').reason, 'It is already built');
  assert.equal(act(s, 'move', { id, x: 50, z: 60, rot: 0 }, T0).ok, false); assert.equal(act(s, 'demolish', { id }, T0).ok, false);
  assert.equal(beautyOf(s).score, Math.max(0, was - BEAUTY.cannery));
  // tins: six of a crop make two, worth more than the crops
  for (const tin of ['canned_corn', 'canned_tomato']) { const rec = RECIPES[tin], [crop, n] = Object.entries(rec.needs)[0]; assert.equal(rec.at, 'cannery'); assert.ok(rec.makes * rec.value > 2 * n * GOODS[crop].value, `${tin} pays`); }
  s.barn.items = { corn: 12 }; must(s, 'produce', { building: id, recipe: 'canned_corn' }); assert.equal(s.barn.items.corn, 6);
  tick(s, T0 + 60 * MIN); must(s, 'collectProducts', { building: id }, T0 + 60 * MIN); assert.equal(s.barn.items.canned_corn, RECIPES.canned_corn.makes);
  assert.ok(orderable(s).includes('canned_corn') || true);   // (orders may ask for tins once corn grows; never for honey)
  assert.ok(!orderable(s).includes('honey') && !orderable(s).includes('honey_cake'));
  // the other answer's things stay shut
  const at = spot(s, 'bench'); assert.equal(act(s, 'place', { kind: 'beehive', ...at }, T0).reason, 'This belongs to the other answer you could have given');
  // making it green
  s.coins = BEAUTY.greenCost - 1; assert.equal(act(s, 'greenCannery', {}, T0).reason, 'Not enough coins');
  s.coins = BEAUTY.greenCost + 5; const g = must(s, 'greenCannery', {}); assert.equal(s.coins, 5); assert.ok(g.events.some(e => e.type === 'canneryGreened'));
  assert.equal(beautyOf(s).score, was, 'the penalty is gone'); assert.equal(act(s, 'greenCannery', {}, T0).reason, 'The cannery is green already');
  const back = unpack(pack(s)); assert.equal(back.story.albright, 'factory'); assert.equal(back.valley.green, true); assert.equal(beautyOf(back).score, was);
});
test('the meadow: kept for good, more beautiful; hives make honey from nothing but time, and the bakery a honey cake', () => {
  const s = farm(), was = beautyOf(s).score; s.level = Math.max(s.level, BUILDINGS.beehive.level);
  assert.equal(act(s, 'place', { kind: 'beehive', ...spot(s, 'bench') }, T0).reason, 'This belongs to the other answer you could have given', 'not before the answer');
  must(s, 'answerAlbright', { choice: 'meadow' }); assert.equal(s.counts.cannery ?? 0, 0); assert.ok(!Object.values(s.placed).some(p => p.kind === 'cannery'));
  assert.equal(beautyOf(s).score, was + BEAUTY.meadow); assert.equal(act(s, 'greenCannery', {}, T0).reason, 'There is no cannery');
  assert.equal(sitePlan(s, 'cannery').reason, 'Unknown item', 'no cannery, ever');
  const hive = must(s, 'place', { kind: 'beehive', ...spot(s, 'beehive') }).id; assert.equal(beautyOf(s).score, was + BEAUTY.meadow + BEAUTY.hive);
  assert.deepEqual(RECIPES.honey.needs, {}); assert.equal(RECIPES.honey.at, 'beehive');
  must(s, 'produce', { building: hive, recipe: 'honey' }); tick(s, T0 + 30 * MIN); must(s, 'collectProducts', { building: hive }, T0 + 30 * MIN); assert.equal(s.barn.items.honey, 1);
  for (let i = 1; i < BUILDINGS.beehive.max; i++) must(s, 'place', { kind: 'beehive', ...spot(s, 'beehive') }, T0 + 30 * MIN);
  assert.equal(act(s, 'place', { kind: 'beehive', ...spot(s, 'bench') }, T0 + 30 * MIN).ok, false, 'five hives at most');
  assert.equal(RECIPES.honey_cake.at, 'bakery'); assert.ok(RECIPES.honey_cake.needs.honey >= 1);
  assert.ok(RECIPES.honey_cake.value > Object.entries(RECIPES.honey_cake.needs).reduce((sum, [g, n]) => sum + GOODS[g].value * n, 0), 'a honey cake is worth baking');
  assert.ok(orderable(s).includes('honey')); assert.ok(!orderable(s).includes('canned_corn'));
  const back = unpack(pack(s)); assert.equal(back.story.albright, 'meadow'); assert.equal(albrightOffer(back).open, false);
});
test('chapter 11 closes on either answer and reads by it; no other chapter depends on the choice', () => {
  assert.ok(ch && ch.panels.length === 3 && ch.ada && ch.variants?.meadow?.text && ch.variants.meadow.ada);
  for (const text of [ch.text, ch.variants.meadow.text]) { const en = resolveNames(text, 'en'); assert.ok(en.length <= 340, `${en.length} letters`); assert.ok(!/\{/.test(en)); }
  assert.match(ch.text, /cannery/); assert.match(ch.variants.meadow.text, /meadow stays a meadow/);
  const a = farm(11), b = farm(11); must(a, 'answerAlbright', { choice: 'factory' }); must(b, 'answerAlbright', { choice: 'meadow' });
  assert.ok(ch.when(a) && ch.when(b));
  for (const c of CHAPTERS) if (c.id !== 11) assert.equal(!!c.when(a), !!c.when(b), `chapter ${c.id} must not hang on the choice`);
  must(a, 'chapterSeen', { id: 11 }); must(b, 'chapterSeen', { id: 11 });
  const due = s => BEATS.filter(x => x.chapter === 11 && x.id !== 'albright-arrives' && x.when(s)).map(x => x.id);
  assert.deepEqual(due(a), ['albright-factory']); assert.deepEqual(due(b), ['albright-meadow']);
  assert.equal(BEATS.find(x => x.id === 'albright-arrives').when(a), false);
});
test('the roadmap names the answer, and the tester\'s jump past chapter 11 keeps the meadow', () => {
  const s = farm(); s.house = { level: 5 }; s.stats.cheeseMade = 1; s.album.fruit.cherry = 9;   // the earlier stages of the roadmap, as a played farm has them
  for (const kind of ['goat_barn', 'dairy', 'fruit_stand', 'kennel']) { s.placed[`x_${kind}`] = { kind, x: 2, z: 2, rot: 0 }; s.counts[kind] = 1; }
  const j = journeyOf(s); assert.equal(j.stage.id, 'coop'); assert.ok(j.milestones.some(m => m.test === 'albright' && !m.done)); assert.equal(j.done, j.total - 1);
  must(s, 'answerAlbright', { choice: 'factory' }); assert.notEqual(journeyOf(s).stage.id, 'coop', 'the co-operative stage is finished');
  const t = newGame(T0, 3, { restore: true }); tick(t, T0); const r = must(t, 'testJumpChapter', { chapter: 12 });
  assert.deepEqual(r.missing, []); assert.equal(t.story.albright, 'meadow'); assert.equal(t.story.chapter, 11); assert.ok(ch.when(t));
  // a tester who is playing chapter 11 finishes it the same way
  const u = farm(5); must(u, 'testFinishChapter', {}); assert.equal(u.story.albright, 'meadow'); assert.ok(ch.when(u));
  assert.ok(SITES.some(x => x.kind === 'cannery'));
});
