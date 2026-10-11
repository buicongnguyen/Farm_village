// The review after chapter 20 (docs/plan/95-review.md): the chapters come in their order, letters wait for their
// chapter, optional project steps do not hide the story's step, clocks set back do not lock the later chapters.
import './tz.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/core/state.mjs';
import { act, tick } from '../src/core/act.mjs';
import { CHAPTERS } from '../src/content/story.mjs';
import { STEPS } from '../src/content/projects.mjs';
import { BUILDINGS } from '../src/content/buildings.mjs';
import { chapterReached } from '../src/core/bonds.mjs';
import { currentStep } from '../src/core/projects.mjs';
import { festivalOf, festivalActive } from '../src/core/festival.mjs';
import { fairOf } from '../src/core/fair.mjs';
import { FAIR, HOTEL } from '../src/content/economy.mjs';
import { must, T0 } from './helpers.mjs';

const ch = id => CHAPTERS.find(c => c.id === id);
const farm = chapter => { const s = newGame(T0, 4242, { restore: true }); tick(s, T0); if (chapter) { must(s, 'testJumpChapter', { chapter }); tick(s, T0); } return s; };

test('chapter 10 cannot be done before chapter 9: the thirty tasks are counted from the day chapter 9 is seen', () => {
  const s = farm(9); for (const role of ['field', 'animals', 'workshop']) (s.hands ??= {})[role] = { since: T0 }; s.stats.handTasks = 80;
  assert.equal(s.story.chapter, 8); assert.equal(ch(10).when(s), false, 'eighty tasks before the festival do not close chapter 10');
  must(s, 'testFinishChapter', {}); must(s, 'chapterSeen', { id: 9 }); assert.equal(s.story.handBase, 80); assert.equal(ch(10).when(s), false);
  s.stats.handTasks = 109; assert.equal(ch(10).when(s), false); s.stats.handTasks = 110; assert.ok(ch(10).when(s));
  const t = farm(10); must(t, 'testFinishChapter', {}); assert.ok(ch(10).when(t), 'the tester can still finish it');
  const old = farm(11); assert.ok(ch(10).when(old), 'a farm already past it is not sent back');
});
test('chapter 9 cannot be done before chapter 8: the stage asks for the level the company office asks for', () => {
  assert.ok(BUILDINGS.stage.level >= BUILDINGS.company.level);
  for (const id of ['stage', 'harvest_festival']) assert.ok(STEPS.find(st => st.id === id).needs.level >= BUILDINGS.company.level, id);
});
test('a letter tied to a chapter waits for the chapters before it', () => {
  const s = farm(7); for (const role of ['field', 'animals', 'workshop']) (s.hands ??= {})[role] = { since: T0 }; s.stats.handTasks = 99; s.story.chapter = 9;   // chapter 10's deed done...
  s.story.chapter = 6; assert.ok(chapterReached(s) < 10, 'a later deed done early does not count as its chapter');
  assert.equal(chapterReached(farm(13)), 12);
});
test('an optional project step never hides the story\'s step', () => {
  for (const id of ['anglers', 'fleet', 'hospital']) assert.ok(STEPS.find(st => st.id === id).optional, id);
  for (const n of [8, 12, 14, 18]) { const s = farm(n), step = currentStep(s); assert.ok(step && !step.optional, `chapter ${n}: the panel shows "${step?.id}"`); }
  const done = farm(21); tick(done, T0 + 1000); assert.ok(!currentStep(done) || currentStep(done).optional, 'with the story told, only side steps are left');
});
test('a clock that went back does not lock the festival, the fair or the hotel', () => {
  const s = farm(19); s.barn.items = { bread: 30, wheat: 30, perch: 30 }; s.barn.cap = 9000; s.coins = 90000;
  const later = T0 + 86400000; tick(s, later); must(s, 'holdFair', {}, later); assert.ok(fairOf(s, later).active);
  tick(s, T0 + 5000);   // the clock is a day back
  assert.ok(s.fair.at <= T0 + 5000 && s.fair.until <= T0 + 5000 + FAIR.lastsMs, 'the fair began now at the latest and lasts no longer than a fair');
  tick(s, T0 + 5000 + FAIR.lastsMs); assert.equal(fairOf(s, T0 + 5000 + FAIR.lastsMs).active, false); assert.ok(s.stats.fairs >= 1);
  assert.ok(s.hotel.nextAt <= T0 + 5000 + FAIR.lastsMs + HOTEL.arriveMs); assert.ok(s.valley.dividendFrom <= T0 + 5000 + FAIR.lastsMs);
  assert.equal(festivalActive(s, T0), festivalOf(s, T0).active);
});
test('weeks away are not replayed at the hotel and do not make the valley\'s name', () => {
  const s = farm(16); tick(s, T0); const month = T0 + 30 * 86400000, before = s.stats.guests ?? 0;
  let events = 0; for (let i = 0; i < 6; i++) events += tick(s, month + i * 1000).events.filter(e => e.type === 'guestLeft').length;
  assert.ok((s.stats.guests ?? 0) - before < 120, `${(s.stats.guests ?? 0) - before} guests counted for a month away`); assert.ok(events < 240);
  assert.ok(s.hotel.nextAt <= month + 6000 + HOTEL.arriveMs * 2, 'and the next guest is at the door');
});
