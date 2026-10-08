import './tz.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, migrate } from '../src/core/state.mjs';
import { actions, learningStatus, unreadLearning, tickLearning } from '../src/core/learning.mjs';
import { newLearning, normalizeLearning, cropOpen } from '../src/core/learning-state.mjs';
import { actions as farm } from '../src/core/farm.mjs';
import { orderable } from '../src/core/orders.mjs';
import { unlocksAt } from '../src/core/levels.mjs';
import { GARDEN_STEPS, LEARNING, LEARNING_MEMORIES, REPAIR_LESSON } from '../src/content/learning.mjs';
import { VI_LEARNING } from '../src/i18n/vi-learning.mjs';

const NOW = 1_800_000_000_000;
function fixture() {
  const s = newGame(NOW, 621, { restore: true }); s.level = 4; s.coins = 500; s.story.chapter = 3;
  s.placed.lessonHome = { kind: 'cottage', x: 4, z: 4, rot: 0 };
  s.homes.lessonHome = { family: 'tran', arrived: true, arrivesAt: NOW, rentFrom: NOW };
  s.learning = newLearning(); return s;
}
function call(s, action, payload = {}, now = NOW, handlers = actions) {
  const events = [], ctx = { s, now, emit: (type, data = {}) => events.push({ type, ...data }), fail: (reason, params) => ({ ok: false, reason, params }) };
  const result = handlers[action](ctx, payload) ?? {}; return { ok: true, ...result, events };
}
function tick(s, now) { const events = []; tickLearning({ s, now, emit: (type, data = {}) => events.push({ type, ...data }) }); return events; }
function learn(s) {
  assert.ok(call(s, 'inspectLearning').ok);
  for (const q of REPAIR_LESSON) assert.ok(call(s, 'answerRepairLesson', { question: q.id, choice: q.answer }).ok);
}
function finish(s) { learn(s); for (const step of GARDEN_STEPS) assert.ok(call(s, 'workGardenProject', { step: step.id }).ok); }
function refuses(s, action, payload = {}, now = NOW) {
  const before = structuredClone(s), out = call(s, action, payload, now);
  assert.equal(out.ok, false, action); assert.deepEqual(s, before, action); assert.deepEqual(out.events, [], action); return out;
}

test('lesson waits for the real first family and read chapter, starts full once and pays nothing', () => {
  for (const change of [s => { s.story.chapter = 2; }, s => { s.homes.lessonHome.arrived = false; },
    s => { s.homes.lessonHome.arrivesAt = NOW + 1; }, s => { delete s.placed.lessonHome; }, s => { s.homes.lessonHome.family = 'reyes'; }]) {
    const s = fixture(); change(s); assert.equal(learningStatus(s, NOW).eligible, false); refuses(s, 'inspectLearning');
  }
  const s = fixture(), before = structuredClone(s);
  assert.equal(unreadLearning(s), 0); assert.ok(call(s, 'inspectLearning').ok);
  assert.equal(s.learning.energy, 100); assert.equal(s.coins, before.coins); assert.equal(s.xp, before.xp);
  assert.equal(learningStatus(s, NOW).question.id, REPAIR_LESSON[0].id);
  refuses(s, 'inspectLearning');
});

test('both ordered lesson answers are required; mistakes retry freely and skills are permanent', () => {
  const s = fixture(); call(s, 'inspectLearning'); const [a, b] = REPAIR_LESSON;
  refuses(s, 'answerRepairLesson', { question: b.id, choice: b.answer });
  refuses(s, 'answerRepairLesson', { question: a.id, choice: 'missing' });
  const bad = refuses(s, 'answerRepairLesson', { question: a.id, choice: a.choices.find(c => c.id !== a.answer).id });
  assert.equal(bad.params.hint, a.help); assert.ok(VI_LEARNING[bad.params.hint]);
  call(s, 'answerRepairLesson', { question: a.id, choice: a.answer });
  refuses(s, 'answerRepairLesson', { question: a.id, choice: a.answer });
  assert.equal(learningStatus(s, NOW).learned, false);
  call(s, 'answerRepairLesson', { question: b.id, choice: b.answer });
  assert.equal(learningStatus(s, NOW).learned, true); assert.equal(s.xp, 0); assert.equal(s.coins, 500); assert.equal(s.learning.energy, 100);
  delete s.homes.lessonHome; assert.equal(learningStatus(s, NOW).learned, true);
  assert.ok(call(s, 'workGardenProject', { step: 'uncover' }).ok, 'learned repairs stay usable if the teacher house is absent from an imported save');
});

test('three visible phases cost exactly 80 coins and 50 energy, with two saved memories and no lucky cash', () => {
  const s = fixture(), cells = [...s.cells], stock = { ...s.barn.items }; learn(s);
  assert.equal(learningStatus(s, NOW).nextStep.id, 'uncover');
  for (const [index, step] of GARDEN_STEPS.entries()) {
    assert.ok(call(s, 'workGardenProject', { step: step.id }).ok);
    assert.equal(s.coins, 500 - GARDEN_STEPS.slice(0, index + 1).reduce((sum, row) => sum + row.coins, 0));
    refuses(s, 'workGardenProject', { step: step.id });
  }
  const st = learningStatus(s, NOW);
  assert.equal(s.coins, 420); assert.equal(st.energy, 50); assert.equal(st.complete, true); assert.equal(st.nextStep, null);
  assert.equal(unreadLearning(s), 2); assert.equal(s.xp, 0); assert.deepEqual(s.barn.items, stock); assert.deepEqual(s.cells, cells);
  refuses(s, 'workGardenProject', { step: 'trays' });
});

test('project previews are pure and all invalid, unaffordable or energy-short steps leave no trace', () => {
  const s = fixture(); refuses(s, 'workGardenProject', { step: 'uncover' }); learn(s);
  for (const step of ['brace', 'trays', 'bogus']) refuses(s, 'workGardenProject', { step });
  s.coins = 19; let before = structuredClone(s), st = learningStatus(s, NOW);
  assert.equal(st.coinsNeeded, 1); assert.equal(st.canWork, false); assert.deepEqual(s, before);
  refuses(s, 'workGardenProject', { step: 'uncover' }); s.coins = 500;
  s.learning.energy = 19; s.firsts['learning:energy'] = 19;
  st = learningStatus(s, NOW); assert.equal(st.energyNeeded, 1); refuses(s, 'workGardenProject', { step: 'uncover' });
  refuses(s, 'workGardenProject', { step: 'uncover' }, NaN);
});

test('passive recovery is one point per complete minute including absence, capped without banked time', () => {
  const s = fixture(); finish(s);
  assert.equal(learningStatus(s, NOW + 59_999).energy, 50);
  assert.equal(tick(s, NOW + 60_000).length, 1); assert.equal(s.learning.energy, 51);
  tick(s, NOW + 180 * 60_000); assert.equal(s.learning.energy, 100);
  // A later project would spend from the projected present, not from a reserve of time above the cap.
  const t = fixture(); learn(t); tick(t, NOW + 180 * 60_000);
  call(t, 'workGardenProject', { step: 'uncover' }, NOW + 180 * 60_000);
  assert.equal(learningStatus(t, NOW + 180 * 60_000).energy, 80);
  assert.equal(learningStatus(t, NOW + 180 * 60_000 + 59_999).energy, 80);
  assert.equal(learningStatus(t, NOW + 181 * 60_000).energy, 81);
});

test('backward clocks never generate passive energy and the short free rest is reachable at zero coins', () => {
  const s = fixture(); finish(s); s.learning.energy = 0; s.firsts['learning:energy'] = 0; s.coins = 0;
  tick(s, NOW - 86400e3); assert.equal(s.learning.energy, 0);
  assert.equal(learningStatus(s, NOW - 86400e3).energy, 0);
  assert.ok(call(s, 'restForProject', {}, NOW - 86400e3).ok);
  refuses(s, 'restForProject', {}, NOW - 86400e3);
  tick(s, NOW - 86400e3 + 29_999); assert.equal(s.learning.energy, 0);
  const events = tick(s, NOW - 86400e3 + 30_000); assert.equal(s.learning.energy, 60); assert.equal(events[0].rested, true);
  assert.equal(s.coins, 0); assert.equal(s.xp, 0);
  tick(s, NOW - 86400e3 + 30_001); assert.equal(s.learning.energy, 60);
  tick(s, NOW); assert.equal(s.learning.energy, 60);
});

test('rest costs no goods, caps its benefit, survives reload and completes only once', () => {
  const s = fixture(); finish(s); const stock = structuredClone(s.barn.items);
  assert.ok(call(s, 'restForProject').ok);
  const loaded = migrate(structuredClone(s));
  tick(loaded, NOW + LEARNING.restMs - 1); assert.equal(loaded.learning.energy, 50);
  tick(loaded, NOW + LEARNING.restMs); assert.equal(loaded.learning.energy, 100); assert.equal(loaded.learning.restAt, null);
  assert.deepEqual(loaded.barn.items, stock); assert.equal(loaded.coins, 420);
  refuses(loaded, 'restForProject', {}, NOW + LEARNING.restMs);
  assert.deepEqual(tick(loaded, NOW + LEARNING.restMs), []);
});

test('pending rest stays a full short wait after a backward clock and never pays on that correction', () => {
  const s = fixture(); finish(s); call(s, 'restForProject');
  tick(s, NOW - 3600e3); assert.equal(s.learning.energy, 50);
  assert.equal(learningStatus(s, NOW - 3600e3).restLeftMs, 30_000);
  tick(s, NOW - 3600e3 + 29_999); assert.equal(s.learning.energy, 50);
  tick(s, NOW - 3600e3 + 30_000); assert.equal(s.learning.energy, 100);
});

test('a partial imported rest record cannot collect its finished recovery twice', () => {
  const s = fixture(); finish(s); call(s, 'restForProject'); const pending = structuredClone(s.learning);
  tick(s, NOW + LEARNING.restMs); assert.equal(s.learning.energy, 100);
  s.learning = { ...pending, energy: 0 }; // restored stale UI fields alongside the durable completion journal
  const normalized = normalizeLearning(s); assert.equal(normalized.restAt, null);
  assert.equal(normalized.restDone, normalized.restSerial);
  s.learning = normalized; const energy = learningStatus(s, NOW + LEARNING.restMs).energy;
  tick(s, NOW + LEARNING.restMs); assert.equal(s.learning.energy, energy);
  // A genuinely new rest still works, even on an earlier device clock.
  s.learning.energy = 0; s.firsts['learning:energy'] = 0;
  assert.ok(call(s, 'restForProject', {}, NOW - 86400e3).ok);
  tick(s, NOW - 86400e3 + LEARNING.restMs); assert.equal(s.learning.energy, 60);
});

test('earned lessons, phases, finds and read status survive missing or partial save fields without paying again', () => {
  const s = fixture(); finish(s);
  for (const id of ['seed-label', 'garden-ready']) assert.ok(call(s, 'readLearningMemory', { id }).ok);
  assert.equal(unreadLearning(s), 0); refuses(s, 'readLearningMemory', { id: 'garden-ready' });
  const coins = s.coins; delete s.learning; s.learning = normalizeLearning(s);
  assert.equal(learningStatus(s, NOW).complete, true); assert.equal(learningStatus(s, NOW).learned, true); assert.equal(unreadLearning(s), 0);
  assert.equal(s.coins, coins); refuses(s, 'workGardenProject', { step: 'trays' }); refuses(s, 'inspectLearning');
  const partial = fixture(); partial.firsts = { 'learning:memory:seed-label': NOW, 'learning:read:seed-label': NOW };
  partial.learning = normalizeLearning(partial);
  assert.equal(learningStatus(partial, NOW).nextStep.id, 'brace'); assert.equal(unreadLearning(partial), 0);
  assert.equal(partial.coins, 500); assert.equal(partial.learning.energy, 0, 'partial migration does not replenish energy');
});

test('fresh and old saves gain no lesson, energy, coin, terrain change or notification during normalization', () => {
  const s = fixture(); delete s.learning; const before = structuredClone(s);
  assert.deepEqual(normalizeLearning(s), newLearning()); assert.deepEqual(s, before);
  const migrated = migrate(structuredClone(s));
  assert.equal(learningStatus(migrated, NOW).introduced, false); assert.equal(unreadLearning(migrated), 0);
  assert.equal(migrated.coins, before.coins); assert.deepEqual(migrated.cells, before.cells);
});

test('strawberries require the finished bench and level four; existing crops and zero-energy farming stay available', () => {
  const s = fixture(); s.placed.lessonBed = { kind: 'bed', x: 8, z: 8 }; delete s.beds.lessonBed;
  assert.equal(cropOpen(s, 'strawberry'), false); assert.equal(cropOpen(s, 'carrot'), true);
  assert.ok(!orderable(s).includes('strawberry')); assert.ok(!unlocksAt(4).crops.includes('strawberry'));
  let before = structuredClone(s);
  assert.equal(call(s, 'plant', { id: 'lessonBed', crop: 'strawberry' }, NOW, farm).ok, false); assert.deepEqual(s, before);
  finish(s); assert.equal(cropOpen(s, 'strawberry'), true); assert.ok(orderable(s).includes('strawberry'));
  s.level = 3; assert.equal(cropOpen(s, 'strawberry'), false); s.level = 4;
  s.learning.energy = 0; s.firsts['learning:energy'] = 0;
  const coins = s.coins;
  assert.ok(call(s, 'plant', { id: 'lessonBed', crop: 'strawberry' }, NOW, farm).ok); assert.equal(s.coins, coins - 12);
  assert.equal(s.beds.lessonBed.doneAt, NOW + 120_000); assert.equal(s.learning.energy, 0);
  assert.ok(call(s, 'harvest', { id: 'lessonBed' }, NOW + 120_000, farm).ok); assert.equal(s.barn.items.strawberry, 2);
  assert.ok(call(s, 'plant', { id: 'lessonBed', crop: 'strawberry' }, NOW + 120_000, farm).ok);
  assert.equal(s.barn.items.strawberry, 1); assert.equal(s.coins, coins - 12); assert.equal(s.learning.energy, 0);
});

test('all lesson and memory content is bilingual and speakers retain their Vietnamese relationships', () => {
  const strings = [LEARNING.name, LEARNING.project, LEARNING.intro, ...REPAIR_LESSON.flatMap(q => [q.prompt, q.help, ...q.choices.map(c => c.text)]),
    ...GARDEN_STEPS.map(s => s.name), ...LEARNING_MEMORIES.flatMap(m => [m.title, ...m.lines.map(l => l.text)])];
  for (const en of strings) assert.ok(VI_LEARNING[en], en);
  for (const memory of LEARNING_MEMORIES) {
    assert.equal(memory.lines.length, 3);
    for (const line of memory.lines) {
      assert.ok(['ada', 'minh', 'pip'].includes(line.who));
      const vi = VI_LEARNING[line.text]; assert.doesNotMatch(vi, /\btôi\b|của bạn|cho bạn|bạn đã/iu);
      if (line.who === 'pip') assert.ok(!vi.includes('cháu') && !vi.includes('tớ'));
    }
  }
});
