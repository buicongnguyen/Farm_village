// Chapter 16, where the brook begins (docs/plan/ch16-where-the-brook-begins.md): the walk upriver in three stops, the
// small deed each asks for, their order, the keepsakes, the spring's beauty, the chapter.
import './tz.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/core/state.mjs';
import { act, tick } from '../src/core/act.mjs';
import { upriverOf, stopPlan, treesOf, upriverOpen } from '../src/core/upriver.mjs';
import { beautyOf } from '../src/core/valley.mjs';
import { UPRIVER } from '../src/content/exploration.mjs';
import { BEAUTY } from '../src/content/economy.mjs';
import { ICONS } from '../src/content/icons.mjs';
import { CHAPTERS, BEATS } from '../src/content/story.mjs';
import { resolveNames } from '../src/content/character-names.mjs';
import { stepDone } from '../src/core/projects.mjs';
import { pack, unpack } from '../src/kit/save.mjs';
import { must, T0, MIN } from './helpers.mjs';

const [weir, heron, spring] = UPRIVER.stops, ch = CHAPTERS.find(c => c.id === 16);
/** A farm at the start of chapter 16 (the tester's jump): the train has run, the walk is open. */
function farm(seed = 4242) {
  const s = newGame(T0, seed, { restore: true }); tick(s, T0); must(s, 'testJumpChapter', { chapter: 16 }); tick(s, T0);
  s.coins = 90000; s.barn.cap = 9000; return s;
}
const picnic = s => { for (const [g, n] of Object.entries(weir.needs.goods)) s.barn.items[g] = (s.barn.items[g] ?? 0) + n; };
const plant = (s, n) => { for (let i = 0; i < n; i++) s.placed[`t_tree_${Object.keys(s.placed).length}`] = { kind: 'pine_tree', x: 2, z: 2, rot: 0 }; };

test('three stops, each with a deed that fits the farm, a keepsake with an icon, coins and a scene', () => {
  assert.deepEqual(UPRIVER.stops.map(st => st.id), ['weir', 'heron', 'spring']);
  for (const st of UPRIVER.stops) {
    assert.ok(st.title && st.text && st.story && st.label && st.coins > 0 && st.xp > 0, st.id); assert.ok(ICONS[st.keepsake.id], `${st.id}: no icon for ${st.keepsake.id}`); assert.ok(st.keepsake.name);
    const beat = BEATS.find(b => b.id === `upriver-${st.id}`); assert.ok(beat && beat.chapter === 16 && beat.lines.length === 3, `${st.id}: its scene`);
    assert.deepEqual([...new Set(beat.lines.map(l => l.who))].sort(), ['ellis', 'pip'], 'Oak and Sunny, nobody else');
  }
  assert.deepEqual(Object.keys(weir.needs), ['goods']); assert.deepEqual(heron.needs, { riverFish: 1 }); assert.deepEqual(spring.needs, { trees: 10 });
});
test('the walk opens when chapter 15 is behind, with the trees that stand that day', () => {
  const early = newGame(T0, 3, { restore: true }); tick(early, T0); must(early, 'testJumpChapter', { chapter: 15 }); tick(early, T0);
  assert.equal(upriverOpen(early), false); assert.equal(early.upriver, undefined); assert.equal(act(early, 'visitStop', { stop: 'weir' }, T0).reason, 'Nobody is ready for the walk yet');
  const s = farm(); assert.ok(upriverOpen(s)); assert.deepEqual(s.upriver, { stops: [], trees0: treesOf(s), fish0: s.stats.riverFish ?? 0 });
  assert.ok(BEATS.find(b => b.id === 'upriver-ask').when(s));
  const u = upriverOf(s); assert.ok(u.open && !u.complete && u.done === 0); assert.deepEqual(u.stops.map(st => [st.done, st.next]), [[false, true], [false, false], [false, false]]);
});
test('the old weir asks for a picnic and takes exactly that; the stops go in order', () => {
  const s = farm(); s.barn.items = { wheat: 5 };
  assert.equal(stopPlan(s, 'weir').reason, 'Not ready for this stop yet'); assert.equal(stopPlan(s, 'heron').reason, 'The path goes by the stop before it'); assert.equal(stopPlan(s, 'pond').reason, 'Unknown stop');
  const before = JSON.stringify(s); for (const stop of ['weir', 'heron', 'spring', 'pond', undefined]) assert.equal(act(s, 'visitStop', { stop }, T0).ok, false); assert.equal(JSON.stringify(s), before);
  picnic(s); s.barn.items.bread += 2; assert.ok(upriverOf(s).stops[0].needs.every(r => r.ok));
  const coins = s.coins, r = must(s, 'visitStop', { stop: 'weir' });
  assert.deepEqual([r.stop, r.keepsake, r.complete], ['weir', 'oak_float', false]); assert.equal(s.barn.items.bread, 2); assert.equal(s.barn.items.cheese ?? 0, 0); assert.equal(s.barn.items.wheat, 5);
  assert.equal(s.coins, coins + weir.coins); assert.deepEqual(s.upriver.stops, ['weir']); assert.equal(s.firsts['upriver:weir'], T0);
  assert.ok(r.events.some(e => e.type === 'upriverStop' && e.stop === 'weir')); assert.ok(BEATS.find(b => b.id === 'upriver-weir').when(s)); assert.equal(BEATS.find(b => b.id === 'upriver-heron').when(s), false);
  assert.equal(act(s, 'visitStop', { stop: 'weir' }, T0).reason, 'You have been there'); assert.equal(s.coins, coins + weir.coins, 'its keepsake and coins come once');
});
test('the heron pool asks for a fish landed at the boat dock after the weir; the spring for ten trees planted since the walk began', () => {
  const s = farm(); s.stats.riverFish = 7; s.upriver.fish0 = 7; picnic(s); must(s, 'visitStop', { stop: 'weir' });
  assert.equal(stopPlan(s, 'heron').reason, 'Not ready for this stop yet', 'the seven fish of before do not count');
  assert.deepEqual(upriverOf(s).stops[1].needs.map(r => [r.kind, r.have, r.need, r.ok]), [['fish', 0, 1, false]]);
  s.stats.riverFish = 8; assert.ok(stopPlan(s, 'heron').ok); must(s, 'visitStop', { stop: 'heron' }); assert.deepEqual(s.upriver.stops, ['weir', 'heron']);
  // the spring: trees planted since the walk opened (a tree taken down again does not count)
  const start = s.upriver.trees0; assert.equal(treesOf(s), start); plant(s, 9);
  assert.deepEqual(upriverOf(s).stops[2].needs.map(r => [r.kind, r.have, r.need, r.ok]), [['trees', 9, 10, false]]); assert.equal(act(s, 'visitStop', { stop: 'spring' }, T0).ok, false);
  plant(s, 1); const was = beautyOf(s), coins = s.coins;
  const r = must(s, 'visitStop', { stop: 'spring' }); assert.equal(r.complete, true); assert.equal(s.coins, coins + spring.coins);
  assert.equal(beautyOf(s).parts.water, was.parts.water + BEAUTY.spring, 'the spring is kept'); assert.equal(beautyOf(s).score, was.score + BEAUTY.spring);
  assert.ok(upriverOf(s).complete); assert.ok(ch.when(s)); assert.ok(stepDone(s, 'upriver')); assert.ok(BEATS.find(b => b.id === 'upriver-spring').when(s));
  const back = unpack(pack(s)); assert.deepEqual(back.upriver, s.upriver); assert.equal(beautyOf(back).score, beautyOf(s).score);
});
test('chapter 16 closes at the spring; the tester can jump past it', () => {
  assert.ok(ch && ch.panels.length === 3 && ch.ada); const en = resolveNames(ch.text, 'en'); assert.ok(en.length <= 340, `${en.length} letters`); assert.match(en, /Sunny/); assert.match(en, /Oak/);
  assert.ok(!/\b(her|she)\b/i.test(en.replace(/until Oak says[^.]*\./, '')), 'the card does not say whether Sunny is a girl or a boy');
  const s = farm(); assert.equal(ch.when(s), false);
  const t = newGame(T0, 3, { restore: true }); tick(t, T0); const r = must(t, 'testJumpChapter', { chapter: 17 });
  assert.deepEqual(r.missing, []); assert.equal(t.story.chapter, 16); assert.deepEqual(t.upriver.stops, ['weir', 'heron', 'spring']); assert.ok(ch.when(t));
  const u = farm(5); must(u, 'testFinishChapter', {}); assert.ok(ch.when(u));
});
