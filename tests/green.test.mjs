// Chapter 19, the green valley (docs/plan/ch19-the-green-valley.md): the six green goals (counted, stamped and paid
// once), the beauty they add, the titles the valley earns as its value passes each mark, the award, and the chapter.
import './tz.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/core/state.mjs';
import { act, tick } from '../src/core/act.mjs';
import { beautyOf, greenOpen, greenProgress, greenAward, valueOf, assetsOf, titleOf } from '../src/core/valley.mjs';
import { GREEN_GOALS } from '../src/content/valley.mjs';
import { BEAUTY, VALLEY } from '../src/content/economy.mjs';
import { VALUE_TITLES } from '../src/content/journey.mjs';
import { CHAPTERS, BEATS } from '../src/content/story.mjs';
import { resolveNames } from '../src/content/character-names.mjs';
import { stepDone } from '../src/core/projects.mjs';
import * as grid from '../src/core/grid.mjs';
import { pack, unpack } from '../src/kit/save.mjs';
import { must, T0 } from './helpers.mjs';

const ch = CHAPTERS.find(c => c.id === 19), TOP = BEAUTY.ranks.length - 1;
/** A farm at the start of chapter 19 (the tester's jump): a fair with a ribbon is behind it. `choice`: the chapter 11 answer. */
function farm(choice = 'meadow', seed = 4242) {
  const s = newGame(T0, seed, { restore: true }); tick(s, T0); must(s, 'testJumpChapter', { chapter: 19 }); tick(s, T0);
  s.coins = 90000; s.barn.cap = 9000;
  if (choice === 'factory' && s.story.albright !== 'factory') { s.story.albright = 'factory'; s.placed.t_cannery = { kind: 'cannery', x: 55, z: 16, rot: 0 }; s.counts.cannery = 1; grid.touch(s); }
  return s;
}
function plant(s, kind, n) { for (let i = 0; i < n; i++) { const at = grid.findSpot(s, kind, 60, 50); assert.ok(at, `no room for ${kind}`); must(s, 'place', { kind, ...at }); } }
const goal = (s, id) => greenProgress(s).find(g => g.id === id);

test('six green goals, counted from what stands in the valley; the last is by the answer of chapter 11', () => {
  assert.deepEqual(GREEN_GOALS.map(g => g.id), ['trees', 'flowers', 'ponds', 'lanes', 'care', 'choice']);
  for (const g of GREEN_GOALS) assert.ok(g.name && g.need >= 1 && g.coins > 0 && g.icon, g.id);
  const s = farm('meadow'), base = Object.fromEntries(greenProgress(s).map(g => [g.id, g.have]));
  assert.ok(greenOpen(s)); assert.equal(goal(s, 'choice').name, 'Five beehives by the meadow'); assert.equal(goal(s, 'choice').need, 5);
  plant(s, 'round_tree', 2); plant(s, 'apple_tree', 1); plant(s, 'bush', 3); assert.equal(goal(s, 'trees').have, Math.min(30, base.trees + 3), 'a bush is not a tree');
  plant(s, 'flowers', 2); plant(s, 'flowerpot', 1); assert.equal(goal(s, 'flowers').have, Math.min(25, base.flowers + 3));
  plant(s, 'bench', 1); plant(s, 'lamp', 1); plant(s, 'street_lamp', 1); assert.equal(goal(s, 'lanes').have, Math.min(8, base.lanes + 3));
  assert.equal(goal(s, 'ponds').have, Math.min(2, Object.values(s.placed).filter(p => p.kind === 'pond').length));
  const worn = Object.keys(s.placed)[0]; s.cond[worn] = { level: 1 }; assert.equal(goal(s, 'care').have, 0); delete s.cond[worn];
  for (const id of Object.keys(s.cond)) delete s.cond[id]; assert.equal(goal(s, 'care').have, 1);
  // a cannery owner's last goal is the green cannery
  const f = farm('factory'); assert.equal(goal(f, 'choice').name, 'The cannery made a green one'); assert.equal(goal(f, 'choice').need, 1); assert.equal(goal(f, 'choice').have, 0);
  f.coins = 99999; must(f, 'greenCannery', {}); assert.equal(goal(f, 'choice').have, 1);
  // before chapter 18 is behind, nothing is counted towards a prize
  const early = farm(); early.story.chapter = 17; for (const id of Object.keys(early.cond)) delete early.cond[id]; const before = JSON.stringify(early.valley ?? {});
  tick(early, T0 + 1000); assert.equal(greenOpen(early), false); assert.equal(JSON.stringify(early.valley ?? {}), before);
});
test('a goal reached is stamped and paid once, stays reached, and adds to the beauty for good', () => {
  const s = farm(); for (const id of Object.keys(s.cond)) delete s.cond[id]; delete s.valley.goals;
  const beauty = beautyOf(s), coins = s.coins, r = tick(s, T0 + 1000), got = r.events.filter(e => e.type === 'greenGoal');
  assert.ok(got.some(e => e.id === 'care' && e.coins === GREEN_GOALS.find(g => g.id === 'care').coins && e.name === 'Nothing in the valley left worn'));
  const paid = got.reduce((sum, e) => sum + e.coins, 0); assert.ok(s.coins >= coins + paid && paid > 0); assert.equal(s.valley.goals.care, T0 + 1000);
  assert.equal(beautyOf(s).parts.goals, got.length * BEAUTY.goal); assert.equal(beautyOf(s).score, beauty.score - beauty.parts.goals + got.length * BEAUTY.goal);
  // it stays reached when the valley changes, and is not paid twice
  const worn = Object.keys(s.placed)[0]; s.cond[worn] = { level: 1 }; assert.ok(goal(s, 'care').done); assert.equal(goal(s, 'care').have, 1);
  const again = tick(s, T0 + 2000); assert.equal(again.events.filter(e => e.type === 'greenGoal' && e.id === 'care').length, 0); assert.equal(beautyOf(s).parts.goals, got.length * BEAUTY.goal);
  delete s.cond[worn]; assert.equal(tick(s, T0 + 3000).events.filter(e => e.type === 'greenGoal' && e.id === 'care').length, 0);
  const back = unpack(pack(s)); assert.deepEqual(back.valley.goals, s.valley.goals); assert.equal(beautyOf(back).score, beautyOf(s).score);
});
test('a picture-postcard valley can be reached on both answers of chapter 11', () => {
  for (const choice of ['meadow', 'factory']) {
    const s = farm(choice); s.coins = 9e6; for (const id of Object.keys(s.cond)) delete s.cond[id];
    if (choice === 'factory') must(s, 'greenCannery', {});
    plant(s, 'round_tree', 30); plant(s, 'flowers', 50); plant(s, 'bench', 8);
    tick(s, T0 + 1000); const b = beautyOf(s);
    assert.ok(b.rank >= TOP, `${choice}: beauty ${b.score} is rank ${b.rank} (${JSON.stringify(b.parts)})`); assert.ok(greenProgress(s).filter(g => g.done).length >= 4, choice);
  }
});
test('titles: one for every mark the value passes, in order, each given once', () => {
  const s = farm(); const marks = VALUE_TITLES.map(x => x.at); s.stats.guests = 0; s.stats.marketDays = 0; s.stats.cooperativeOrders = 0; s.stats.trains = 0; s.stats.harvestFestivals = 0; s.stats.fairs = 0;
  for (const k of Object.keys(s.firsts)) if (k.startsWith('title:')) delete s.firsts[k];
  const assets = assetsOf(s).total; assert.ok(assets > marks[0] && assets < marks[2], `a farm of ${assets} at chapter 19`);
  let now = T0, titles = [];
  const run = () => { for (let i = 0; i < 8; i++) { now += 1000; titles.push(...tick(s, now).events.filter(e => e.type === 'valleyTitle')); } };
  run(); const first = titles.length; assert.ok(first >= 1 && titles[0].at === marks[0] && titles[0].name === 'A going farm'); assert.equal(s.firsts[`title:${marks[0]}`], T0 + 1000);
  assert.ok(BEATS.find(b => b.id === 'title-going-farm').when(s)); assert.equal(BEATS.find(b => b.id === 'title-city').when(s), false);
  // deeds done together carry the value past the next marks: one title a tick, never one twice
  while (valueOf(s) < marks[3]) s.stats.guests += VALLEY.guests; run();
  assert.deepEqual(titles.map(e => e.at), marks.slice(0, 4)); assert.equal(new Set(titles.map(e => e.at)).size, titles.length);
  assert.ok(BEATS.find(b => b.id === 'title-city').when(s)); assert.equal(titleOf(valueOf(s)).title.at, marks[3]);
  run(); assert.equal(titles.length, 4); assert.equal(s.firsts[`title:${marks[4]}`], undefined);
  // no title without a company
  const t = farm(); delete t.valley.founded; for (const k of Object.keys(t.firsts)) if (k.startsWith('title:')) delete t.firsts[k];
  assert.equal(tick(t, T0 + 1000).events.some(e => e.type === 'valleyTitle'), false);
});
test('the award: a picture postcard and the green mark at once, stamped the first time both hold', () => {
  const s = farm(); s.coins = 9e6; for (const id of Object.keys(s.cond)) delete s.cond[id];
  let a = greenAward(s); assert.equal(a.rankNeed, TOP); assert.equal(a.valueNeed, VALLEY.marks.green); assert.equal(a.ok, false); assert.equal(ch.when(s), false); assert.equal(stepDone(s, 'green_valley'), false);
  // the value alone is not enough
  while (valueOf(s) < VALLEY.marks.green) s.stats.guests += VALLEY.guests;
  if (beautyOf(s).rank < TOP) { tick(s, T0 + 1000); assert.equal(greenAward(s).ok, false); assert.equal(ch.when(s), false); }
  plant(s, 'round_tree', 30); plant(s, 'flowers', 50);
  const r = tick(s, T0 + 2000); a = greenAward(s); assert.ok(a.ok, JSON.stringify(a)); assert.ok(r.events.some(e => e.type === 'greenValleyReached')); assert.equal(s.firsts.greenValley, T0 + 2000);
  assert.ok(ch.when(s)); assert.ok(stepDone(s, 'green_valley'));
  // a worn roof afterwards does not take the prize back
  for (const id of Object.keys(s.placed).slice(0, 12)) s.cond[id] = { level: 2 }; tick(s, T0 + 3000); assert.ok(ch.when(s));
  assert.equal(tick(s, T0 + 4000).events.some(e => e.type === 'greenValleyReached'), false);
  // seeing the card puts the plaque up, once
  const seen = must(s, 'chapterSeen', { id: 19 }, T0 + 5000); assert.ok(seen.events.some(e => e.type === 'valleyAwarded')); assert.equal(s.firsts.award, T0 + 5000); assert.equal(s.story.chapter, 19);
});
test('chapter 19 reads by the answer of chapter 11; the tester can jump past it', () => {
  assert.ok(ch && ch.panels.length === 3 && ch.ada && ch.variants?.meadow?.text && ch.variants.meadow.panels.length === 3);
  for (const text of [ch.text, ch.variants.meadow.text]) { const en = resolveNames(text, 'en'); assert.ok(en.length <= 340, `${en.length} letters`); assert.ok(!/\{/.test(en)); assert.match(en, /Mr Albright is back, as a guest at the hotel/); assert.match(en, /better than his drawings/); }
  assert.match(ch.text, /cannery/); assert.match(ch.variants.meadow.text, /mile of flowers/);
  for (const id of ['title-going-farm', 'title-pride', 'title-larder', 'title-city', 'albright-returns']) assert.equal(BEATS.find(b => b.id === id).chapter, 19, id);
  const t = newGame(T0, 3, { restore: true }); tick(t, T0); const r = must(t, 'testJumpChapter', { chapter: 20 });
  assert.deepEqual(r.missing, []); assert.equal(t.story.chapter, 19); assert.ok(ch.when(t)); assert.ok(greenAward(t).ok, JSON.stringify(greenAward(t))); assert.ok(t.firsts.award, 'the plaque is up');
  assert.ok(greenProgress(t).every(g => g.done));
  const u = farm(); must(u, 'testFinishChapter', {}); assert.ok(ch.when(u));
});
