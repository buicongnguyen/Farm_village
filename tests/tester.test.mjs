// The tester's tools (docs/plan/00-tester-tools.md): the chapter jumps, the checklist of village projects kept by id,
// and the pace switch.
import './tz.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { newGame } from '../src/core/state.mjs';
import { act, tick, ACTIONS } from '../src/core/act.mjs';
import { JUMPS, JUMP_CHAPTERS } from '../src/core/testmode.mjs';
import { CHAPTERS, BEATS } from '../src/content/story.mjs';
import { STEPS } from '../src/content/projects.mjs';
import { TAIL, currentStep, stepDone } from '../src/core/projects.mjs';
import { journeyOf } from '../src/core/journey.mjs';
import { CROPS, RECIPES, ANIMALS, FRUITS } from '../src/content/goods.mjs';
import { TRUCK, PACE, paced, LEVELS } from '../src/content/economy.mjs';
import { workingCount } from '../src/core/working.mjs';
import { pack, unpack } from '../src/kit/save.mjs';
import { game, must, T0, MIN } from './helpers.mjs';

const restored = () => { const s = newGame(T0, 4242, { restore: true }); tick(s, T0); return s; };
const idx = id => STEPS.findIndex(st => st.id === id);

test('a jump brings a new farm to the start of each chapter: every earlier deed is done, the cards are behind it', () => {
  for (const chapter of JUMP_CHAPTERS) {
    const s = restored(), r = must(s, 'testJumpChapter', { chapter });
    assert.deepEqual(r.missing, [], `chapter ${chapter}: deeds not arranged`);
    assert.equal(s.story.chapter, chapter - 1); assert.equal(s.story.tutorial, 99);
    for (const c of CHAPTERS.filter(c => c.id < chapter)) assert.ok(c.when(s), `chapter ${c.id} deed at the start of ${chapter}`);
    for (const b of BEATS.filter(b => b.chapter < chapter)) assert.ok(s.story.beats.includes(b.id), `beat ${b.id} is behind the player`);
    assert.ok(s.coins >= 1000 * chapter); assert.deepEqual(s.undo, []);
    // the farm is a farm the rules accept: it ticks, it saves and it loads
    tick(s, T0 + MIN); const back = unpack(pack(s)); assert.equal(back.story.chapter, chapter - 1); assert.equal(back.projects.step, s.projects.step);
    assert.ok(journeyOf(s), 'the roadmap reads it');
  }
});
test('the jump to chapter 6 leaves a village with a school, a clinic and four families; the next step is the first open one', () => {
  const s = restored(); must(s, 'testJumpChapter', { chapter: 6 });
  assert.ok(s.counts.school >= 1); assert.equal(workingCount(s, 'clinic'), 1);
  assert.equal(Object.values(s.homes).filter(h => h.family && h.arrived).length, 4);
  assert.ok(s.level >= 6); assert.ok(s.projects.step >= TAIL, 'the build order is past the clinic');
  assert.ok(Object.values(s.animals).some(list => list.length > 0), 'hens in the coop');
  for (const st of STEPS.slice(0, TAIL)) assert.ok(stepDone(s, st.id), st.id);
});
test('a jump only goes forward, and a refused jump changes nothing', () => {
  const s = restored(); must(s, 'testJumpChapter', { chapter: 4 });
  for (const chapter of [2, 3, 4, 99, 0, '5', null, 2.5]) {
    const before = JSON.stringify(s), r = act(s, 'testJumpChapter', { chapter }, T0);
    assert.equal(r.ok, false, `jump to ${chapter}`); assert.equal(JSON.stringify(s), before);
  }
  must(s, 'testJumpChapter', { chapter: 6 }); assert.equal(s.story.chapter, 5);
  assert.equal(act(s, 'testJumpChapter', { chapter: 6 }, T0).reason, 'This farm is already there');
});
test('a jump on a farm in the middle of the game keeps what it has', () => {
  const s = restored(); must(s, 'testJumpChapter', { chapter: 3 });
  s.coins = 123456; s.barn.items.wheat = 40; const placed = Object.keys(s.placed).length, level = s.level;
  must(s, 'testJumpChapter', { chapter: 6 });
  assert.equal(s.coins, 123456, 'the purse is only topped up'); assert.equal(s.barn.items.wheat, 40);
  assert.ok(Object.keys(s.placed).length >= placed); assert.ok(s.level >= level);
});
test('an empty field (the test builds\' start) is jumped as far as there is room, without an error', () => {
  for (const chapter of JUMP_CHAPTERS) {
    const s = game(), r = act(s, 'testJumpChapter', { chapter }, T0);
    assert.equal(r.ok, true); assert.ok(Array.isArray(r.missing)); assert.doesNotThrow(() => tick(s, T0 + MIN));
  }
});
test('every chapter that has a card after the first can be jumped to', () => {
  assert.deepEqual(JUMP_CHAPTERS, [...JUMP_CHAPTERS].sort((a, b) => a - b));
  for (const c of CHAPTERS) if (c.id >= 2) assert.ok(Object.hasOwn(JUMPS, c.id), `no jump to chapter ${c.id}`);
});
test('coins and levels for testers: real level-ups, bad amounts refused, the top level is the top', () => {
  const s = restored(), coins = s.coins, level = s.level;
  assert.equal(must(s, 'testAddCoins', {}).coins, coins + 10000);
  const r = must(s, 'testAddLevels', {}); assert.equal(s.level, level + 5);
  assert.deepEqual(r.events.filter(e => e.type === 'levelUp').map(e => e.level), [1, 2, 3, 4, 5].map(n => level + n));
  assert.ok(s.xp >= LEVELS.xpFor(s.level));
  for (const [a, p] of [['testAddCoins', { coins: -5 }], ['testAddCoins', { coins: '9' }], ['testAddCoins', { coins: 1e9 }], ['testAddLevels', { levels: 0 }], ['testAddLevels', { levels: 1.5 }]]) {
    const before = JSON.stringify(s); assert.equal(act(s, a, p, T0).ok, false, `${a} ${JSON.stringify(p)}`); assert.equal(JSON.stringify(s), before);
  }
  must(s, 'testAddLevels', { levels: LEVELS.max }); assert.equal(s.level, LEVELS.max);
  assert.equal(act(s, 'testAddLevels', {}, T0).reason, 'This is the top level');
  assert.ok(['testAddCoins', 'testAddLevels', 'testJumpChapter'].every(a => Object.hasOwn(ACTIONS, a)));
});

// ── The village projects after the clinic are a checklist kept by id ──
test('the steps after the clinic are ticked off in any order, each paid once, and the first open one is shown', () => {
  assert.equal(STEPS[TAIL - 1].id, 'clinic', 'the checklist starts right after the clinic'); assert.ok(STEPS.slice(TAIL).every(st => !st.builds.length));
  assert.ok(STEPS.slice(0, TAIL).every(st => st.builds.length), 'the steps before it lock something and run in order');
  const s = restored(); must(s, 'testJumpChapter', { chapter: 6 });
  const first = currentStep(s); assert.equal(first.id, STEPS[TAIL].id);
  // a later step comes true first: it is ticked off, the one shown does not move
  s.fishing.caught = 5; const xp = s.xp, r = act(s, 'seeToday', {}, T0);
  assert.deepEqual(r.events.filter(e => e.type === 'projectDone').map(e => e.id), ['anglers']);
  assert.ok(s.xp > xp); assert.ok(stepDone(s, 'anglers')); assert.equal(currentStep(s).id, first.id);
  const paid = s.xp; act(s, 'seeToday', {}, T0); tick(s, T0 + MIN); assert.equal(s.xp, paid, 'paid once');
  assert.ok(!stepDone(s, first.id)); assert.ok(!stepDone(s, 'police'));
});
test('a step added to the checklist later does not move an old farm, and a farm past it is asked for it', () => {
  const s = restored(); must(s, 'testJumpChapter', { chapter: 6 });
  // an old farm: everything after the clinic was done, each stamped as the game does
  for (const st of STEPS.slice(TAIL)) s.firsts[`project:${st.id}`] = T0;
  act(s, 'seeToday', {}, T0); assert.equal(currentStep(s), null); assert.equal(s.projects.step, STEPS.length);
  const added = { id: 'later_step', name: 'Fresh juice for the village', text: 'Fresh juice for the village', needs: {}, builds: [], done: st => st.stats.laterDone === true };
  STEPS.splice(TAIL + 1, 0, added);
  try {
    const xp = s.xp, r = act(s, 'seeToday', {}, T0);
    assert.equal(currentStep(s).id, 'later_step', 'the new step is the one shown'); assert.equal(s.xp, xp, 'nothing is paid again');
    assert.deepEqual(r.events.filter(e => e.type === 'projectDone'), []);
    for (const st of STEPS.slice(TAIL)) assert.equal(stepDone(s, st.id), st.id !== 'later_step', st.id);
    const back = unpack(pack(s)); tick(back, T0 + MIN); assert.equal(currentStep(back).id, 'later_step', 'after a reload too');
    s.stats.laterDone = true; const done = act(s, 'seeToday', {}, T0);
    assert.deepEqual(done.events.filter(e => e.type === 'projectDone').map(e => e.id), ['later_step']); assert.equal(currentStep(s), null);
  } finally { STEPS.splice(STEPS.indexOf(added), 1); }
});
test('the steps before the checklist still run in order, by position', () => {
  const s = restored(); assert.equal(s.projects.step, idx('mill_coop'));
  s.fishing.caught = 9; tick(s, T0 + MIN);
  assert.equal(s.projects.step, idx('mill_coop'), 'a later deed does not skip the build order'); assert.ok(!stepDone(s, 'anglers'));
});

// ── The pace switch ──
test('testing pace is what ships: paced() changes nothing', () => {
  assert.equal(PACE.mode, 'testing'); assert.equal(paced(1234), 1234); assert.deepEqual(paced([10, 20]), [10, 20]);
  assert.equal(CROPS.wheat.growMs, 20_000); assert.equal(TRUCK.tripMs, 50_000);
});
test('release pace stretches every timer by its factor (FV_PACE=release)', () => {
  const code = `import('./src/content/goods.mjs').then(async g => { const e = await import('./src/content/economy.mjs');
    console.log(JSON.stringify({ mode: e.PACE.mode, k: e.PACE.time.release, crops: Object.values(g.CROPS).map(c => c.growMs), fruits: Object.values(g.FRUITS).flatMap(f => [f.firstMs, f.regrowMs]),
      animals: Object.values(g.ANIMALS).map(a => a.everyMs), recipes: Object.values(g.RECIPES).map(r => r.timeMs), truck: e.TRUCK.tripMs, fish: [e.FISH.waitMs, e.FISH.baitMs, ...e.FISH.footMs], hands: e.HANDS.everyMs, repair: e.REPAIR.broken.ms, family: e.FAMILY_ARRIVAL_MS })); });`;
  const out = JSON.parse(execFileSync(process.execPath, ['-e', code], { env: { ...process.env, FV_PACE: 'release' }, encoding: 'utf8' }));
  assert.equal(out.mode, 'release'); const k = out.k; assert.ok(k > 1);
  assert.deepEqual(out.crops, Object.values(CROPS).map(c => Math.round(c.growMs * k)));
  assert.deepEqual(out.fruits, Object.values(FRUITS).flatMap(f => [f.firstMs, f.regrowMs]).map(ms => Math.round(ms * k)));
  assert.deepEqual(out.animals, Object.values(ANIMALS).map(a => Math.round(a.everyMs * k)));
  assert.deepEqual(out.recipes, Object.values(RECIPES).map(r => Math.round(r.timeMs * k)));
  assert.equal(out.truck, TRUCK.tripMs * k); assert.equal(out.hands, 60_000 * k); assert.equal(out.repair, 30_000 * k); assert.equal(out.family, 2 * MIN * k);
  assert.deepEqual(out.fish, [25_000, 12_000, 4500, 9000].map(ms => ms * k));
});
test('"Finish this chapter" does the deed of the chapter in progress without marking its card seen', () => {
  for (const chapter of JUMP_CHAPTERS.slice(0, -1)) {
    const s = restored(); must(s, 'testJumpChapter', { chapter }); const seen = s.story.chapter, r = must(s, 'testFinishChapter', {});
    assert.equal(r.chapter, chapter); assert.equal(r.done, true, `chapter ${chapter}'s deed`); assert.equal(s.story.chapter, seen, 'the card is still to come');
    assert.ok(CHAPTERS.find(c => c.id === chapter).when(s)); must(s, 'chapterSeen', { id: chapter }); assert.equal(s.story.chapter, chapter);
  }
  // at the last chapter that exists there is nothing to finish, and nothing changes
  const s = restored(); must(s, 'testJumpChapter', { chapter: JUMP_CHAPTERS.at(-1) });
  const before = JSON.stringify(s), r = act(s, 'testFinishChapter', {}, T0); assert.equal(r.ok, false); assert.equal(JSON.stringify(s), before);
});
