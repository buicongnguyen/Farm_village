import './tz.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { newGame } from '../src/core/state.mjs';
import { actions, schoolStatus, unreadSchool } from '../src/core/school-activity.mjs';
import { newSchool, normalizeSchool, schoolQuestions } from '../src/core/school-state.mjs';
import { SCHOOL_ACTIVITY, SCHOOL_MEMORY } from '../src/content/school-activity.mjs';
import { VI_SCHOOL_ACTIVITY as VI } from '../src/i18n/vi-school-activity.mjs';
import { renderSchool, renderSchoolEntry, renderSchoolMemory } from '../src/ui/school-activity-panel.mjs';
import { personName, resolveNames } from '../src/content/character-names.mjs';

const NOW = 1_800_000_000_000;
function ready() {
  const s = newGame(NOW, 2345); s.schoolActivity = newSchool(); s.story.chapter = 4;
  s.placed.classroom = { kind: 'school', x: 84, z: 49, rot: 0 };
  return s;
}
function call(s, action, payload = {}, now = NOW) {
  const events = [], ctx = { s, now, emit: (type, data = {}) => events.push({ type, ...data }), fail: reason => ({ ok: false, reason }) };
  return { ok: true, ...actions[action](ctx, payload), events };
}
function refused(s, action, payload = {}, now = NOW) {
  const before = structuredClone(s), result = call(s, action, payload, now);
  assert.equal(result.ok, false); assert.deepEqual(result.events, []); assert.deepEqual(s, before); return result;
}
const start = (s, difficulty = 'simple') => call(s, 'startSchoolActivity', { difficulty });
function answer(s, correct = true) {
  const q = schoolStatus(s).question;
  return call(s, 'answerSchoolActivity', { question: q.id, choice: correct ? q.answer : q.choices.find(choice => choice !== q.answer) });
}
const complete = s => { let result; for (let i = 0; i < 3; i++) result = answer(s); return result; };

test('school play waits for Cora’s read introduction and a real working school, while reads are pure', () => {
  const s = ready(), before = structuredClone(s); schoolStatus(s); normalizeSchool(s); unreadSchool(s); assert.deepEqual(s, before);
  s.story.chapter = 3;
  assert.ok(resolveNames(refused(s, 'startSchoolActivity', { difficulty: 'simple' }).reason, 'en').includes(personName('cora', 'en', 'short')));
  s.story.chapter = 4; s.counts.school = 1; delete s.placed.classroom; refused(s, 'startSchoolActivity', { difficulty: 'simple' });
  s.placed.classroom = { kind: 'school' }; s.cond.classroom = { level: 3 }; refused(s, 'startSchoolActivity', { difficulty: 'simple' });
  delete s.cond.classroom; s.repairing.classroom = { doneAt: NOW - 1 }; refused(s, 'startSchoolActivity', { difficulty: 'simple' });
  delete s.repairing.classroom; assert.equal(start(s).ok, true);
});

test('starting and answering reject forged difficulty, choice, stale ID and invalid clock without mutations', () => {
  const s = ready();
  for (const difficulty of ['__proto__', 'constructor', null, 1, 'difficult']) refused(s, 'startSchoolActivity', { difficulty });
  refused(s, 'startSchoolActivity', { difficulty: 'simple' }, NaN); refused(s, 'answerSchoolActivity', { question: 'made-up', choice: 1 });
  start(s); const q = schoolStatus(s).question;
  for (const choice of [String(q.answer), NaN, Infinity, q.answer + 0.5, 999, {}, null]) refused(s, 'answerSchoolActivity', { question: q.id, choice });
  refused(s, 'answerSchoolActivity', { question: 'basket:1:simple:2', choice: q.answer });
  refused(s, 'answerSchoolActivity', { question: q.id, choice: q.answer }, -1);
  answer(s); refused(s, 'answerSchoolActivity', { question: q.id, choice: q.answer });
});

test('wrong answers offer free retries, retain the question, and count first-try answers truthfully', () => {
  const s = ready(); start(s); const original = schoolStatus(s).question;
  assert.equal(answer(s, false).correct, false); assert.deepEqual(schoolStatus(s).question, original);
  assert.match(renderSchool(s), /Let’s have another look/); assert.equal(answer(s, false).correct, false);
  answer(s); answer(s); const done = answer(s);
  assert.deepEqual({ complete: done.complete, score: done.score, first: done.first }, { complete: true, score: 2, first: true });
  assert.equal(s.schoolActivity.completed, 1); assert.equal(s.schoolActivity.best, 2); assert.equal(s.schoolActivity.active, null);
});

test('all school rounds leave the economy, farm RNG, stock, XP, and ordinary milestones untouched', () => {
  const s = ready(), before = structuredClone(s);
  for (let i = 0; i < 8; i++) { start(s, i % 2 ? 'challenge' : 'simple'); complete(s); }
  const changed = Object.keys(s).filter(key => JSON.stringify(s[key]) !== JSON.stringify(before[key]));
  assert.deepEqual(changed.sort(), ['firsts', 'schoolActivity']); assert.equal(s.schoolActivity.completed, 8);
  assert.equal(Object.keys(s.firsts).length, 1); assert.equal(unreadSchool(s), 1);
});

test('saved partial rounds retain pictures, answers and retries; copies remain independent', () => {
  const s = ready(); start(s, 'challenge'); answer(s); answer(s, false);
  const copy = structuredClone(s); copy.schoolActivity = normalizeSchool(copy);
  assert.deepEqual(copy.schoolActivity, s.schoolActivity); assert.deepEqual(schoolStatus(copy).question, schoolStatus(s).question);
  answer(copy); answer(copy); assert.equal(copy.schoolActivity.lastScore, 2); assert.equal(s.schoolActivity.active.step, 1);
});

test('only the first finished round creates an unread memory, durable across partial imported saves', () => {
  const s = ready(); refused(s, 'readSchoolMemory'); start(s); assert.equal(complete(s).first, true);
  assert.equal(unreadSchool(s), 1); assert.equal(s.firsts['school:memory'], NOW);
  const earned = structuredClone(s); delete earned.schoolActivity;
  assert.equal(normalizeSchool(earned).memoryAt, NOW); assert.equal(unreadSchool(earned), 1);
  call(s, 'readSchoolMemory'); assert.equal(unreadSchool(s), 0);
  start(s); const second = complete(s); assert.equal(second.first, false); assert.equal(unreadSchool(s), 0);
  delete s.schoolActivity; assert.equal(unreadSchool(s), 0); assert.equal(normalizeSchool(s).memoryAt, NOW);
  start(s); assert.equal(complete(s).first, false); assert.equal(unreadSchool(s), 0);
});

test('a closed school pauses participation but never hides an earned memory', () => {
  const s = ready(); start(s); complete(s); start(s); const q = schoolStatus(s).question;
  s.cond.classroom = { level: 3 }; refused(s, 'answerSchoolActivity', { question: q.id, choice: q.answer });
  refused(s, 'startSchoolActivity', { difficulty: 'simple' });
  assert.match(renderSchoolMemory(s), /A drawing for the classroom/); assert.equal(call(s, 'readSchoolMemory').ok, true);
  delete s.cond.classroom; assert.deepEqual(schoolStatus(s).question, q); assert.equal(answer(s).correct, true);
});

test('restarting an unfinished round replaces it explicitly and cannot complete or reward it', () => {
  const s = ready(); start(s); answer(s); const q = schoolStatus(s).question;
  start(s, 'challenge'); assert.equal(s.schoolActivity.active.step, 0); assert.equal(s.schoolActivity.rounds, 2);
  assert.equal(s.schoolActivity.completed, 0); assert.equal(unreadSchool(s), 0); assert.deepEqual(s.firsts, {});
  refused(s, 'answerSchoolActivity', { question: q.id, choice: q.answer });
});

test('normalization discards malformed round progress and never turns counters into earned memories', () => {
  const s = ready(); start(s); answer(s); const good = structuredClone(s.schoolActivity);
  for (const mutate of [a => a.step = 3, a => a.round++, a => a.signature += 'bad', a => a.difficulty = 'constructor',
    a => a.answers = [999], a => a.answers = [], a => a.missed = [false], a => a.missed[2] = true, a => a.step = 0.5]) {
    s.schoolActivity = structuredClone(good); mutate(s.schoolActivity.active);
    assert.equal(normalizeSchool(s).active, null); refused(s, 'answerSchoolActivity', { question: 'forged', choice: 3 });
  }
  s.schoolActivity = { rounds: Infinity, completed: 99999999999999, best: 100, memoryAt: -1, memoryRead: true };
  assert.deepEqual(normalizeSchool(s), newSchool()); assert.equal(unreadSchool(s), 0);
  s.schoolActivity = { rounds: 1_000_000_000, completed: 1_000_000_000 }; start(s); assert.equal(s.schoolActivity.rounds, 1);
  complete(s); assert.equal(s.schoolActivity.completed, 1_000_000_000);
});

test('question sets vary, keep three distinct numeric choices and stay bounded for both difficulties', () => {
  for (const difficulty of ['simple', 'challenge']) {
    const signatures = new Set();
    for (let round = 1; round <= 80; round++) {
      const questions = schoolQuestions(round, difficulty); assert.equal(questions.length, 3);
      signatures.add(JSON.stringify(questions.map(q => [q.rows, q.choices])));
      for (const q of questions) {
        assert.equal(new Set(q.choices).size, 3); assert.equal(q.choices.filter(n => n === q.answer).length, 1);
        assert.ok(q.choices.every(n => Number.isInteger(n) && n >= 0 && n <= 22));
        assert.ok(q.rows.flat().length <= 20); assert.ok(q.rows.flat().every(good => SCHOOL_ACTIVITY.goods.includes(good)));
        assert.ok(SCHOOL_ACTIVITY.questions[q.type]);
      }
    }
    assert.ok(signatures.size >= 30, `only ${signatures.size} distinct ${difficulty} rounds`);
  }
});

test('school entry distinguishes available activities from only earned album pages', () => {
  const s = ready(); assert.match(renderSchoolEntry(s), /schoolActivity/); assert.equal(renderSchoolEntry(s, NOW, { album: true }), '');
  s.story.chapter = 3; assert.equal(renderSchoolEntry(s), ''); s.story.chapter = 4; start(s); complete(s);
  assert.match(renderSchoolEntry(s, NOW, { album: true }), /schoolMemory/); assert.match(renderSchool(s), /notebook/);
});

test('classroom content and UI have Vietnamese coverage and preserve friendly speaker pronouns', async () => {
  const strings = [SCHOOL_ACTIVITY.title, ...Object.values(SCHOOL_ACTIVITY.difficulties), SCHOOL_MEMORY.title,
    ...SCHOOL_MEMORY.lines.map(line => line.text), ...Object.values(SCHOOL_ACTIVITY.questions).flatMap(q => [q.text, q.hint])];
  for (const path of ['../src/ui/school-activity-panel.mjs', '../src/core/school-activity.mjs']) {
    const source = await readFile(new URL(path, import.meta.url), 'utf8');
    for (const m of source.matchAll(/(?:\bt\(|ctx\.fail\()\s*(['"])((?:\\.|(?!\1).)*)\1/g)) strings.push(m[2]);
  }
  const globalVI = (await import('../src/i18n/vi.mjs')).VI;
  for (const source of strings) assert.ok(VI[source] || globalVI[source], source);
  for (const [en, vi] of Object.entries(VI)) assert.deepEqual([...en.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort(), [...vi.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort(), en);
  const byPerson = Object.fromEntries(SCHOOL_MEMORY.lines.map(line => [line.who, resolveNames(VI[line.text], 'vi')]));
  assert.match(byPerson.cora, /Cô/); assert.doesNotMatch(byPerson.cora, /\btôi\b/u);
  assert.match(byPerson.pip, /Con/); assert.doesNotMatch(byPerson.pip, /\btôi\b/u);
  assert.ok(byPerson.june.includes(personName('june', 'vi', 'short'))); assert.match(byPerson.june, /mình/);
});

test('changing language translates the same saved classroom puzzle without resetting its answer or retry', async () => {
  const { setLanguage } = await import('../src/kit/i18n.mjs');
  const s = ready(); start(s, 'challenge'); answer(s, false);
  const before = structuredClone(s), question = schoolStatus(s).question;
  try {
    await setLanguage('vi'); const vietnamese = renderSchool(s);
    assert.ok(vietnamese.includes(resolveNames(VI[SCHOOL_ACTIVITY.title], 'vi')));
    assert.ok(vietnamese.includes(VI['Let’s have another look. There is plenty of time.']));
    assert.ok(vietnamese.includes(`data-school-question="${question.id}"`));
    await setLanguage('en'); const english = renderSchool(s);
    assert.ok(english.includes(resolveNames(SCHOOL_ACTIVITY.title, 'en'))); assert.ok(english.includes(question.id));
    assert.deepEqual(s, before); assert.deepEqual(schoolStatus(s).question, question);
  } finally { await setLanguage('en'); }
});
