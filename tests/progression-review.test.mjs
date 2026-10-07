// Progress must describe the deeds still needed, and story acknowledgements must follow their conditions.
import './tz.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { act } from '../src/core/act.mjs';
import { journeyOf } from '../src/core/journey.mjs';
import { CHAPTERS, BEATS } from '../src/content/story.mjs';
import { game, must, setLevel, T0 } from './helpers.mjs';

function refused(s, action, payload) {
  const before = JSON.stringify(s);
  assert.equal(act(s, action, payload, T0).ok, false);
  assert.equal(JSON.stringify(s), before, action + ' refusal changed state');
}
function restoredFarm(s) {
  for (const kind of ['feed_mill', 'coop']) { s.placed[kind] = { kind, x: 32, z: 64, rot: 2 }; s.counts[kind] = 1; }
}

test('roadmap keeps unfinished Homecoming goals even when farming reaches orchard levels', () => {
  const s = game(); setLevel(s, 4);
  assert.equal(journeyOf(s).stage.id, 'homecoming');
  assert.equal(journeyOf(s).done, 0);
  restoredFarm(s);
  assert.equal(journeyOf(s).stage.id, 'homecoming');
  assert.equal(journeyOf(s).done, 1);
  s.homes.h1 = { family: 'tran', arrived: false, arrivesAt: T0 + 120000 };
  assert.equal(journeyOf(s).stage.id, 'homecoming', 'a family on its way is not settled');
  s.homes.h1.arrived = true;
  assert.equal(journeyOf(s).stage.id, 'orchard');
});

test('finished Homecoming waits for level four, and broken farm buildings remain a goal', () => {
  const s = game(); setLevel(s, 3); restoredFarm(s);
  s.homes.h1 = { family: 'tran', arrived: true, arrivesAt: T0 };
  assert.equal(journeyOf(s).stage.id, 'homecoming');
  assert.equal(journeyOf(s).done, 2);
  setLevel(s, 4); s.cond.coop = { level: 3, ms: 0 };
  assert.equal(journeyOf(s).stage.id, 'homecoming');
  delete s.cond.coop;
  assert.equal(journeyOf(s).stage.id, 'orchard');
});

test('unmet chapter and beat acknowledgements cannot skip the story or post future letters', () => {
  const s = game();
  for (const chapter of CHAPTERS.filter(c => !c.when(s))) refused(s, 'chapterSeen', { id: chapter.id });
  for (const beat of BEATS.filter(b => !b.when(s))) refused(s, 'beatSeen', { id: beat.id });
  assert.equal(s.story.chapter, 0);
  assert.equal(s.story.beats, undefined);
  must(s, 'chapterSeen', { id: 1 });
  assert.equal(s.story.chapter, 1);
  must(s, 'chapterSeen', { id: 1 });
});

test('chapter five acknowledgement needs an open clinic and four arrived families', () => {
  const s = game(); s.story.chapter = 4;
  refused(s, 'chapterSeen', { id: 5 });
  s.placed.clinic = { kind: 'clinic', x: 62, z: 106, rot: 2 }; s.counts.clinic = 1;
  for (const [i, family] of ['tran', 'okafor', 'lindqvist', 'reyes'].entries()) s.homes['h' + i] = { family, arrived: i < 3, arrivesAt: T0 };
  refused(s, 'chapterSeen', { id: 5 });
  s.homes.h3.arrived = true;
  must(s, 'chapterSeen', { id: 5 });
  assert.equal(s.story.chapter, 5);
  delete s.placed.clinic; s.counts.clinic = 0;
  must(s, 'chapterSeen', { id: 5 });
});

test('due independent story beats can be acknowledged, and repeats stay idempotent', () => {
  const s = game(); must(s, 'chapterSeen', { id: 1 });
  must(s, 'deliverOrder', { id: s.orders.cards[0].id });
  must(s, 'beatSeen', { id: 'first-loaf' });
  s.stats.ordersFilled = 0;
  assert.deepEqual(must(s, 'beatSeen', { id: 'first-loaf' }).beats, ['first-loaf']);
  s.album.fruit.cherry = 3;
  must(s, 'beatSeen', { id: 'first-cherries' });
  assert.deepEqual(s.story.beats, ['first-loaf', 'first-cherries']);
});

test('a family arriving before hens cannot skip chapter two', () => {
  const s = game(); must(s, 'chapterSeen', { id: 1 });
  s.homes.h1 = { family: 'tran', arrived: true, arrivesAt: T0 };
  assert.equal(CHAPTERS[2].when(s), true, 'the next family deed has already happened');
  refused(s, 'chapterSeen', { id: 3 });
  assert.equal(s.story.chapter, 1);
  s.projects.step = 3;
  s.animals.story_hens = [{ kind: 'hen', doneAt: null }];
  must(s, 'chapterSeen', { id: 2 });
  must(s, 'chapterSeen', { id: 3 });
  assert.equal(s.story.chapter, 3);
  must(s, 'chapterSeen', { id: 2 });
  assert.equal(s.story.chapter, 3, 'already-seen cards stay idempotent');
});
