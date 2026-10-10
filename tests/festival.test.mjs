// Chapter 9, the village sings again (docs/plan/ch09-the-village-sings-again.md): the festival stage on its site on the
// square, the Harvest Festival (feast, evening, hearts, the hat, the rest between two), the chapter, Oak coming home.
import './tz.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/core/state.mjs';
import { act, tick } from '../src/core/act.mjs';
import { festivalOf, feastOf, feastValue, festivalCoins, stageBuilt } from '../src/core/festival.mjs';
import { FESTIVAL_DAY } from '../src/content/economy.mjs';
import { GOODS } from '../src/content/goods.mjs';
import { BUILDINGS } from '../src/content/buildings.mjs';
import { SITES, PLAZA, WELL } from '../src/content/world.mjs';
import { siteOf } from '../src/core/sites.mjs';
import * as grid from '../src/core/grid.mjs';
import { giftable, heartsOf } from '../src/core/bonds.mjs';
import { CHAPTERS, BEATS } from '../src/content/story.mjs';
import { VILLAGERS, oakHome } from '../src/content/people.mjs';
import { stepDone } from '../src/core/projects.mjs';
import { journeyOf } from '../src/core/journey.mjs';
import { pack, unpack } from '../src/kit/save.mjs';
import { must, T0, MIN } from './helpers.mjs';

const { kinds, each, lastsMs, everyMs } = FESTIVAL_DAY;
/** A farm at the start of chapter 9 (the tester's jump), with coins and a barn that can lay a feast. */
function farm(seed = 4242) {
  const s = newGame(T0, seed, { restore: true }); tick(s, T0); must(s, 'testJumpChapter', { chapter: 9 });
  s.coins = 50000; s.barn.cap = 5000; return s;
}
const FEAST = { bread: 5, corn_bread: 4, apple_juice: 3, cheese: 3, apple: 9, egg: 12, wheat: 40, perch: 6, chicken_feed: 9 };
const stock = (s, items = FEAST) => { s.barn.items = { ...items }; };
const ch = CHAPTERS.find(c => c.id === 9), stage = siteOf('stage');

test('the stage has its place on the north edge of the village square, facing the well; what is left of the old one stands there first', () => {
  assert.ok(stage && stage.ruin === 'stage_burned'); assert.deepEqual(stage.size, BUILDINGS.stage.size);
  const cells = grid.cellsOf('stage', stage.x, stage.z, stage.rot);
  for (const [x, z] of cells) assert.ok(x >= PLAZA.x0 && x <= PLAZA.x1 && z >= PLAZA.z0 && z <= PLAZA.z1, `${x},${z} is off the square`);
  assert.ok(!cells.some(([x, z]) => x === WELL.x && z === WELL.z)); assert.ok(WELL.z > stage.z + stage.size[1] - 1, 'the well is in front of it');
  const s = farm(); assert.equal(grid.canPlace(s, 'bench', stage.x, stage.z, 0).ok, false, 'nothing else is built on the square');
  s.level = BUILDINGS.stage.level - 1; assert.equal(act(s, 'buildSite', { kind: 'stage' }, T0).reason, 'Reach level {level} first');
  s.level = BUILDINGS.stage.level; const coins = s.coins, r = must(s, 'buildSite', { kind: 'stage' });
  assert.equal(s.coins, coins - BUILDINGS.stage.cost); assert.ok(stageBuilt(s)); assert.ok(stepDone(s, 'stage')); assert.equal(s.placed[r.id].kind, 'stage');
  assert.equal(act(s, 'move', { id: r.id, x: 50, z: 95, rot: 0 }, T0).ok, false); assert.equal(act(s, 'demolish', { id: r.id }, T0).ok, false);
  // a path the player laid across the square does not stop the stage
  const p = farm(5); p.level = 12; must(p, 'place', { kind: 'path', x: stage.x + 1, z: stage.z }); must(p, 'buildSite', { kind: 'stage' });
});
test('the feast is six different foods, three of each, the best the barn has; fish and feed are not feast food', () => {
  const s = farm(); stock(s);
  const feast = feastOf(s); assert.equal(feast.length, kinds); assert.ok(feast.every(row => row.n === each));
  assert.deepEqual(feast.map(r => r.good), ['cheese', 'corn_bread', 'apple_juice', 'bread', 'apple', 'egg'], 'made food first, then fruit, then eggs');
  assert.ok(!feast.some(r => ['perch', 'chicken_feed'].includes(r.good)));
  assert.equal(festivalCoins(feast), Math.round(feastValue(feast) * FESTIVAL_DAY.pay) + FESTIVAL_DAY.coins);
  s.barn.items.cheese = each - 1; assert.ok(!feastOf(s).some(r => r.good === 'cheese'), 'too little of it to lay');
  assert.ok(feastOf(s).some(r => r.good === 'wheat'), 'a crop fills the place');
});
test('holding the festival: needs the stage and a feast, takes the feast, starts the evening, pays the hat and warms every heart', () => {
  const s = farm(); stock(s);
  let st = festivalOf(s, T0); assert.equal(st.reason, 'Build the festival stage first');
  const before = JSON.stringify(s); assert.equal(act(s, 'holdFestival', {}, T0).ok, false); assert.equal(JSON.stringify(s), before);
  s.level = 12; must(s, 'buildSite', { kind: 'stage' });
  s.barn.items = { bread: 9 }; st = festivalOf(s, T0); assert.equal(st.ok, false); assert.equal(st.reason, 'The feast needs {kinds} different foods, {each} of each');
  const poor = JSON.stringify(s); assert.equal(act(s, 'holdFestival', {}, T0).ok, false); assert.equal(JSON.stringify(s), poor);
  stock(s); st = festivalOf(s, T0); assert.ok(st.ok && !st.active);
  const guests = giftable(s, T0), hearts = Object.fromEntries(guests.map(id => [id, s.people[id]?.hearts ?? 0])), coins = s.coins;
  assert.ok(guests.length >= 8, 'four families and the villagers');
  const r = must(s, 'holdFestival', {});
  assert.equal(r.coins, st.coins); assert.equal(s.coins, coins + st.coins); assert.equal(r.until, T0 + lastsMs);
  for (const row of st.feast) assert.equal(s.barn.items[row.good] ?? 0, FEAST[row.good] - each, `${row.good} was not taken`);
  assert.equal(s.barn.items.perch, 6); assert.equal(s.barn.items.wheat, 40);
  for (const id of guests) assert.equal(s.people[id].hearts, Math.min(10, hearts[id] + FESTIVAL_DAY.hearts), `${id}'s heart`);
  assert.ok(r.events.some(e => e.type === 'harvestFestivalStarted' && e.coins === st.coins && e.guests === guests.length));
  // the evening: on until it ends, told once, counted when over; then the village rests
  assert.ok(festivalOf(s, T0 + lastsMs - 1).active); assert.equal(act(s, 'holdFestival', {}, T0 + 1000).reason, 'The festival is on');
  assert.equal(s.stats.harvestFestivals ?? 0, 0, 'not counted until it is over'); assert.equal(ch.when(s), false);
  const back = unpack(pack(s)); assert.ok(festivalOf(back, T0 + 1000).active, 'the evening survives a reload');
  const end = tick(s, T0 + lastsMs + 5); assert.equal(end.events.filter(e => e.type === 'harvestFestivalEnded').length, 1); assert.equal(s.stats.harvestFestivals, 1);
  assert.ok(!tick(s, T0 + lastsMs + 9000).events.some(e => e.type === 'harvestFestivalEnded')); assert.equal(s.stats.harvestFestivals, 1);
  stock(s); assert.equal(act(s, 'holdFestival', {}, T0 + lastsMs + 10_000).reason, 'The village is resting after the last festival');
  assert.equal(festivalOf(s, T0 + lastsMs + 10_000).readyAt, T0 + everyMs);
  must(s, 'holdFestival', {}, T0 + everyMs); assert.equal(s.festival.n, 2);
  tick(s, T0 + everyMs + lastsMs + 1); assert.equal(s.stats.harvestFestivals, 2);
});
test('"Finish every timer" ends the evening too, so a tester is not kept waiting', () => {
  const s = farm(); stock(s); s.level = 12; must(s, 'buildSite', { kind: 'stage' }); must(s, 'holdFestival', {});
  must(s, 'testFinishTimers', {}, T0 + 1000); tick(s, T0 + 2000); assert.equal(s.stats.harvestFestivals, 1); assert.ok(!festivalOf(s, T0 + 2000).active);
});
test('chapter 9 closes after the first festival is over; then Bramble\'s scene, and Oak comes home', () => {
  assert.ok(ch && ch.panels.length === 3 && ch.ada);
  const s = farm(); stock(s); s.level = 12; assert.equal(ch.when(s), false); assert.equal(oakHome(s), false);
  must(s, 'buildSite', { kind: 'stage' }); assert.equal(ch.when(s), false, 'the stage alone is half of it');
  assert.ok(BEATS.find(b => b.id === 'stage-up').when(s));
  must(s, 'holdFestival', {}); tick(s, T0 + lastsMs + 1); assert.equal(ch.when(s), true); assert.ok(stepDone(s, 'harvest_festival'));
  const truth = BEATS.find(b => b.id === 'gus-truth'), home = BEATS.find(b => b.id === 'oak-home');
  assert.ok(!truth.when(s) && !home.when(s));
  must(s, 'chapterSeen', { id: 9 }, T0 + lastsMs + 2); assert.equal(oakHome(s), true); assert.ok(truth.when(s)); assert.ok(!home.when(s), 'Oak arrives after Bramble has spoken');
  must(s, 'beatSeen', { id: 'gus-truth' }, T0 + lastsMs + 3); assert.ok(home.when(s));
  const oak = VILLAGERS.find(v => v.id === 'ellis'); assert.ok(oak.idle.length >= 5 && oak.family && oak.noOrders, 'he chats when tapped, and still posts no orders');
  assert.ok(!giftable(s, T0 + lastsMs + 3).includes('ellis'), 'your own family takes no gifts');
  for (const id of ['stage-up', 'gus-truth', 'oak-home']) assert.equal(BEATS.find(b => b.id === id).chapter, 9);
  assert.ok(!/\d{4}|years ago/.test(ch.text), 'the fire carries no date');
});
test('the roadmap has the festival\'s stage, and the tester\'s jump past chapter 9 arranges it', () => {
  const s = farm(); s.house = { level: 5 }; s.hands = { field: { since: T0 } }; s.stats.cheeseMade = 1; s.album.fruit.cherry = 9;
  for (const kind of ['goat_barn', 'dairy', 'fruit_stand', 'kennel']) { s.placed[`x_${kind}`] = { kind, x: 2, z: 2, rot: 0 }; s.counts[kind] = 1; }
  let j = journeyOf(s); assert.equal(j.stage.id, 'sings'); assert.equal(j.total, 2); assert.equal(j.done, 0);
  const t = newGame(T0, 3, { restore: true }); tick(t, T0); const r = must(t, 'testJumpChapter', { chapter: 10 });
  assert.deepEqual(r.missing, []); assert.ok(stageBuilt(t)); assert.ok(ch.when(t)); assert.equal(oakHome(t), true); assert.ok(SITES.some(x => x.kind === 'stage'));
});
