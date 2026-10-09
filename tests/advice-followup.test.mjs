import './tz.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { act } from '../src/core/act.mjs';
import { newGame, CELL_TYPES, migrate } from '../src/core/state.mjs';
import { adviceCards, adviceOf, normalizeAdvice, unreadAdvice } from '../src/core/advice.mjs';
import { followupAdvice } from '../src/core/advice-followup.mjs';
import { learningStatus } from '../src/core/learning.mjs';
import { schoolStatus } from '../src/core/school-activity.mjs';
import { repairCost } from '../src/core/condition.mjs';
import { touch } from '../src/core/grid.mjs';
import { ADVICE_TOPICS } from '../src/content/advice.mjs';
import { REPAIR_LESSON } from '../src/content/learning.mjs';
import { N } from '../src/content/world.mjs';
import { setLanguage, t, tParams } from '../src/kit/i18n.mjs';
import { pack, unpack } from '../src/kit/save.mjs';
import { T0, must } from './helpers.mjs';

function fixture() {
  const s = newGame(T0, 726, { restore: true });
  s.stats.harvested = 1; s.orders.cards = []; s.story.tutorial = 999; s.story.chapter = 3;
  s.level = 4; s.coins = 500;
  return s;
}
const card = (s, id, now = T0) => followupAdvice(s, now).find(c => c.id === id);
const ref = c => ({ id: c.id, context: c.context });
function family(s) {
  s.placed.h1 = { kind: 'cottage', x: 38, z: 95, rot: 0 };
  s.homes.h1 = { family: 'tran', arrived: true, arrivesAt: T0 - 1 };
}
function learned(s) {
  family(s); must(s, 'inspectLearning', {}, T0);
  for (const q of REPAIR_LESSON) must(s, 'answerRepairLesson', { question: q.id, choice: q.answer }, T0);
}
function refused(s, c) {
  for (const action of ['readAdvice', 'deferAdvice', 'restoreAdvice']) {
    const before = structuredClone(s), result = act(s, action, ref(c), T0);
    assert.equal(result.ok, false); assert.deepEqual(result.events, []); assert.deepEqual(s, before);
  }
}

test('picnic suggestions follow earned clues without showing later answers and stop after completion', () => {
  const s = fixture(); assert.equal(card(s, 'picnic-porch'), undefined);
  s.stats.ordersFilled = 1;
  const first = card(s, 'picnic-porch'); assert.deepEqual(first.target, { kind: 'exploration', step: 'porch' });
  assert.doesNotMatch(first.line + first.reason, /ribbon|flowerpot|tin by the pond/i);
  assert.equal(card(s, 'picnic-pond'), undefined); assert.equal(card(s, 'picnic-share'), undefined);
  const coins = s.coins;
  must(s, 'readAdvice', ref(first)); assert.equal(s.coins, coins); assert.deepEqual(s.exploration.steps, []);
  must(s, 'inspectExploration', { step: 'porch' }); refused(s, first);
  assert.ok(card(s, 'picnic-pond')); assert.equal(card(s, 'picnic-share'), undefined);
  must(s, 'inspectExploration', { step: 'pond' }); assert.ok(card(s, 'picnic-share'));
  must(s, 'inspectExploration', { step: 'share' });
  assert.ok(!followupAdvice(s, T0).some(c => c.context.startsWith('picnic/')));
  assert.equal(s.coins, coins); assert.equal(s.stored.flowerpot, 1);
});

test('garden advice waits for the actual family and chapter, survives retries and explains exact shortages', () => {
  const s = fixture(); assert.equal(card(s, 'garden-lesson'), undefined); family(s);
  s.homes.h1.arrivesAt = T0 + 1; assert.equal(card(s, 'garden-lesson'), undefined);
  s.homes.h1.arrivesAt = T0 - 1; s.story.chapter = 2; assert.equal(card(s, 'garden-lesson'), undefined);
  s.story.chapter = 3; const lesson = card(s, 'garden-lesson'); assert.ok(lesson);
  must(s, 'deferAdvice', ref(lesson)); assert.equal(adviceOf(s, lesson.id, lesson.context, T0), null);
  const q = REPAIR_LESSON[0]; must(s, 'inspectLearning');
  const before = structuredClone(s); assert.equal(act(s, 'answerRepairLesson', { question: q.id, choice: 'trays' }, T0).ok, false); assert.deepEqual(s, before);
  for (const question of REPAIR_LESSON) must(s, 'answerRepairLesson', { question: question.id, choice: question.answer });
  refused(s, lesson); s.coins = 7;
  const saving = card(s, 'garden-save'); assert.equal(saving.params.cost, 20); assert.equal(saving.params.short, 13);
  assert.match(saving.line, /free cast/); assert.equal(card(s, 'garden-work'), undefined);
  s.coins = 20; assert.equal(card(s, 'garden-save'), undefined); assert.equal(card(s, 'garden-work').params.energy, 20);
});

test('free-rest guidance reflects projected energy, never fabricates work while resting and stops when finished', () => {
  const s = fixture(); learned(s); s.learning.energy = 0; s.firsts['learning:energy'] = 0;
  const rest = card(s, 'garden-rest'); assert.ok(rest); assert.equal(card(s, 'garden-work'), undefined);
  must(s, 'readAdvice', ref(rest)); const coins = s.coins;
  must(s, 'restForProject'); assert.equal(card(s, 'garden-rest'), undefined); assert.equal(card(s, 'garden-work'), undefined);
  assert.ok(card(s, 'garden-work', T0 + 30_000)); assert.equal(s.coins, coins);
  for (const step of ['uncover', 'brace', 'trays']) must(s, 'workGardenProject', { step }, T0 + 30_000);
  assert.ok(!followupAdvice(s, T0 + 30_000).some(c => c.context.startsWith('garden/')));
  assert.equal(learningStatus(s, T0 + 30_000).complete, true); assert.equal(s.coins, coins - 80);
});

test('school advice requires the introduced working school and preserves one acknowledgement over replay', () => {
  let s = fixture(); s.placed.school = { kind: 'school', x: 50, z: 106, rot: 2 };
  assert.equal(card(s, 'school-baskets'), undefined); s.story.chapter = 4;
  s.cond.school = { level: 3 }; assert.equal(card(s, 'school-baskets'), undefined); delete s.cond.school;
  const first = card(s, 'school-baskets'); assert.ok(first); must(s, 'readAdvice', ref(first));
  must(s, 'startSchoolActivity', { difficulty: 'simple' }); s = unpack(pack(s));
  assert.equal(adviceOf(s, first.id, first.context, T0).read, true);
  for (let i = 0; i < 3; i++) { const q = schoolStatus(s).question; must(s, 'answerSchoolActivity', { question: q.id, choice: q.answer }); }
  assert.equal(card(s, 'school-baskets'), undefined); refused(s, first);
  must(s, 'startSchoolActivity', { difficulty: 'challenge' });
  assert.equal(adviceOf(s, first.id, first.context, T0).read, true);
  s.repairing.school = { doneAt: T0 + 100 }; assert.equal(card(s, 'school-baskets'), undefined);
});

test('land hints offer an affordable adjacent plot or an owned marker, never a promised hidden reward', () => {
  const s = fixture(); assert.equal(card(s, 'clearing-room'), undefined); s.stats.ordersFilled = 1;
  s.coins = 499; assert.equal(card(s, 'clearing-room'), undefined); s.coins = 500;
  const buy = card(s, 'clearing-room'); assert.equal(buy.params.cost, 500);
  assert.doesNotMatch(buy.line + buy.reason, /bench|sun carved|coins.*reward/i);
  must(s, 'buyParcel', { parcel: buy.target.parcel }); refused(s, buy);
  const inspect = card(s, 'clearing-inspect'); assert.ok(inspect);
  assert.doesNotMatch(inspect.line + inspect.reason, /bench|sun carved/);
  const before = structuredClone(s); adviceCards(s, T0); assert.deepEqual(s, before);
  must(s, 'inspectLandDiscovery', { parcel: inspect.target.parcel }); refused(s, inspect);
  assert.equal(card(s, 'clearing-inspect'), undefined); assert.equal(s.stored.bench, 1);
});

test('lucky activity clues never quote money or counts, require an available real target and retire cleanly', () => {
  const s = fixture(); s.stats.ordersFilled = 1; s.discoveries.catches = 1;
  const pond = card(s, 'pond-curiosity'); assert.ok(pond);
  assert.doesNotMatch(pond.line + pond.reason, /twenty|second|ten|40|20|tin|button/i);
  s.fishing.line = { doneAt: T0 + 1 }; assert.equal(card(s, 'pond-curiosity'), undefined); s.fishing.line = null;
  s.discoveries.retired.push('pond-tin'); assert.equal(card(s, 'pond-curiosity'), undefined);
  s.discoveries.catches = 9; assert.ok(card(s, 'pond-curiosity'));
  s.firsts['discovery:pond-keepsake'] = T0; assert.equal(card(s, 'pond-curiosity'), undefined);
  s.cells.fill(CELL_TYPES.grass); s.discoveries.rocks = 1; s.cells[60 * N + 35] = CELL_TYPES.rock; touch(s);
  const stone = card(s, 'stone-space'); assert.deepEqual(stone.target, { kind: 'cell', x: 35, z: 60 });
  assert.equal(stone.params.cost, 10); assert.doesNotMatch(stone.line + stone.reason, /treasure|box|thirty|30/);
  s.coins = 9; assert.equal(card(s, 'stone-space'), undefined); s.coins = 500;
  s.cells[60 * N + 35] = CELL_TYPES.grass; touch(s); assert.equal(card(s, 'stone-space'), undefined);
  s.cells[40 * N + 80] = CELL_TYPES.rock; touch(s); assert.equal(card(s, 'stone-space'), undefined, 'unowned rock is never suggested');
});

test('Village Street advice offers an honest shortfall before free earning and disappears when work starts', () => {
  const s = fixture(); s.stats.ordersFilled = 1; s.cond.road_south = { level: 3 }; s.coins = 0;
  const saving = card(s, 'street-save'); assert.ok(saving);
  assert.equal(saving.params.cost, repairCost(s, 'road_south')); assert.equal(saving.params.short, saving.params.cost);
  assert.match(saving.line, /free fishing/); assert.doesNotMatch(saving.line + saving.reason, /Gus|reward|thank.you/i);
  s.coins = saving.params.cost; const ready = card(s, 'street-repair'); assert.ok(ready); refused(s, saving);
  must(s, 'repair', { id: 'road_south' }); assert.equal(card(s, 'street-repair'), undefined); refused(s, ready);
  delete s.repairing.road_south; delete s.cond.road_south; assert.equal(card(s, 'street-save'), undefined);
});

test('order and source advice keep priority, while reading optional guidance makes room for another idea', () => {
  const s = fixture(); family(s); s.stats.ordersFilled = 1; s.story.chapter = 4;
  s.placed.school = { kind: 'school', x: 50, z: 106, rot: 2 }; s.orders.cards = [{ id: 'needed', need: { wheat: 2 }, coins: 50 }];
  s.barn.items = {};
  const first = adviceCards(s, T0); assert.equal(first[0].id, 'order-gather'); assert.equal(first.length, 3);
  const lesson = first.find(c => c.id === 'garden-lesson'); assert.ok(lesson); must(s, 'readAdvice', ref(lesson));
  const next = adviceCards(s, T0); assert.equal(next[0].id, 'order-gather'); assert.ok(next.some(c => c.id === 'picnic-porch'));
  assert.equal(adviceOf(s, lesson.id, lesson.context, T0).read, true);
  // A productive farm can retain two valid stand topics indefinitely; acknowledged ones must not bury the lesson.
  s.placed.stand = { kind: 'fruit_stand', x: 50, z: 70, rot: 0 }; s.fruitStand = { coins: 20, items: [] }; s.barn.items.cherry = 9;
  for (const id of ['stand-collect', 'stand-empty']) {
    const c = adviceCards(s, T0).find(a => a.id === id); assert.ok(c); must(s, 'readAdvice', ref(c));
  }
  s.advice.read = s.advice.read.filter(k => !k.startsWith('garden-lesson:'));
  const productive = adviceCards(s, T0);
  assert.equal(productive[0].id, 'order-gather'); assert.ok(productive.some(c => c.id === 'garden-lesson'));
});

test('language changes, save reloads and temporary gates preserve read/defer without invented earned memories', async () => {
  let s = fixture(); family(s); s.stats.ordersFilled = 1;
  const c = card(s, 'garden-lesson'); must(s, 'deferAdvice', ref(c));
  const before = structuredClone(s); await setLanguage('vi');
  const vi = t(c.line, tParams(c.params)); assert.match(vi, /Chú Minh/);
  assert.deepEqual(s, before); assert.deepEqual(card(s, c.id), c);
  await setLanguage('en'); assert.equal(t(c.line), c.line); s = unpack(pack(s));
  s.story.chapter = 2; assert.equal(adviceOf(s, c.id, c.context, T0, { includeDeferred: true }), null);
  s.story.chapter = 3; assert.equal(adviceOf(s, c.id, c.context, T0, { includeDeferred: true }).deferred, true);
  must(s, 'restoreAdvice', ref(c)); assert.equal(adviceOf(s, c.id, c.context, T0).read, true);
  delete s.advice; const coins = s.coins, discoveries = structuredClone(s.discoveries), exploration = structuredClone(s.exploration);
  s = migrate(s); assert.deepEqual(s.advice.celebrated, {}); assert.equal(s.coins, coins);
  assert.deepEqual(s.discoveries, discoveries); assert.deepEqual(s.exploration, exploration);
});

test('new suggestion histories accept only finite authored contexts and selectors remain pure', () => {
  const s = fixture(); family(s); s.stats.ordersFilled = 1;
  const fixed = Object.entries(ADVICE_TOPICS).flatMap(([id, a]) => (a.contexts ?? []).map(context => `${id}:${context}`));
  s.advice.read = [...fixed, ...Array.from({ length: 2000 }, (_, i) => `school-baskets:school/${i}`), 'garden-lesson:picnic/share'];
  s.advice.deferred = [...s.advice.read];
  assert.deepEqual(normalizeAdvice(s).read, fixed); assert.deepEqual(normalizeAdvice(s).deferred, fixed);
  const before = structuredClone(s);
  for (let i = 0; i < 3; i++) { followupAdvice(s, T0); adviceCards(s, T0); normalizeAdvice(s); }
  assert.deepEqual(s, before);
});

test('completed optional branches create no dangling advice count or replay announcement', () => {
  const s = fixture(); learned(s); s.stats.ordersFilled = 1;
  for (const step of ['uncover', 'brace', 'trays']) must(s, 'workGardenProject', { step });
  for (const step of ['porch', 'pond', 'share']) must(s, 'inspectExploration', { step });
  s.parcels.push('1,2'); s.landDiscovery = { parcel: '1,2', boughtAt: T0, discoveredAt: T0, read: true };
  s.schoolActivity.completed = 1; s.schoolActivity.memoryAt = T0; s.schoolActivity.memoryRead = true;
  s.discoveries.catches = 10; s.discoveries.rocks = 2; delete s.cond.road_south;
  s.advice.read = Object.entries(ADVICE_TOPICS).flatMap(([id, a]) => (a.contexts ?? []).map(context => `${id}:${context}`));
  s.advice.read.push('fishing-break:pond');
  assert.deepEqual(followupAdvice(s, T0), []); assert.equal(unreadAdvice(s, T0), 0);
  const reloaded = unpack(pack(s)); assert.deepEqual(followupAdvice(reloaded, T0), []); assert.equal(unreadAdvice(reloaded, T0), 0);
});
