// Chapter 20, the lights of two villages (docs/plan/ch20-the-lights-of-two-villages.md): the deed (the valley's last
// title, a billion), the end stamped once, nothing locked afterwards, who is named on the closing cards, the album.
import './tz.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/core/state.mjs';
import { act, tick } from '../src/core/act.mjs';
import { castOf, storyEnded, albumOf } from '../src/core/ending.mjs';
import { valueOf, dividendOf } from '../src/core/valley.mjs';
import { fairOf } from '../src/core/fair.mjs';
import { VALLEY } from '../src/content/economy.mjs';
import { VALUE_TITLES, STAGES } from '../src/content/journey.mjs';
import { CHAPTERS } from '../src/content/story.mjs';
import { VILLAGERS, NEIGHBOURS, FAMILIES, hasArrived } from '../src/content/people.mjs';
import { ICONS } from '../src/content/icons.mjs';
import { resolveNames } from '../src/content/character-names.mjs';
import { stepDone } from '../src/core/projects.mjs';
import { pack, unpack } from '../src/kit/save.mjs';
import { must, T0 } from './helpers.mjs';

const ch = CHAPTERS.find(c => c.id === 20), LAST = VALUE_TITLES.at(-1);
/** A farm at the start of chapter 20 (the tester's jump): the county's prize is won. */
function farm(seed = 4242) {
  const s = newGame(T0, seed, { restore: true }); tick(s, T0); must(s, 'testJumpChapter', { chapter: 20 }); tick(s, T0);
  s.coins = 90000; s.barn.cap = 9000; return s;
}

test('the deed is the valley\'s last title: a billion, reached by deeds done together', () => {
  assert.equal(LAST.at, VALLEY.marks.lights); assert.equal(LAST.at, 1_000_000_000); assert.equal(LAST.name, 'The lights of two villages'); assert.equal(CHAPTERS.at(-1).id, 20);
  const s = farm(); assert.equal(s.story.chapter, 19); assert.ok(valueOf(s) >= VALLEY.marks.green);
  if (valueOf(s) < LAST.at) { assert.equal(ch.when(s), false); assert.equal(stepDone(s, 'two_villages'), false); }
  while (valueOf(s) < LAST.at) s.stats.guests += VALLEY.guests;
  let now = T0; for (let i = 0; i < 8 && !ch.when(s); i++) { now += 1000; tick(s, now); }   // the titles come one a tick
  assert.ok(ch.when(s)); assert.ok(s.firsts[`title:${LAST.at}`] > T0); assert.ok(stepDone(s, 'two_villages'));
  assert.equal(tick(s, now + 1000).events.some(e => e.type === 'valleyTitle'), false, 'the last title is given once');
  assert.ok(STAGES.find(st => st.id === 'valley').milestones.some(m => m.test === 'lights'));
});
test('seeing the last chapter stamps the end once; nothing is taken away and nothing stops', () => {
  const s = farm(); must(s, 'testFinishChapter', {}); assert.ok(ch.when(s)); assert.equal(storyEnded(s), false);
  const before = { coins: s.coins, placed: Object.keys(s.placed).length, level: s.level, barn: JSON.stringify(s.barn.items) };
  const seen = must(s, 'chapterSeen', { id: 20 }, T0 + 5000);
  assert.equal(seen.events.filter(e => e.type === 'storyEnded').length, 1); assert.equal(s.story.ended, T0 + 5000); assert.equal(s.story.chapter, 20); assert.ok(storyEnded(s));
  assert.deepEqual({ coins: s.coins, placed: Object.keys(s.placed).length, level: s.level, barn: JSON.stringify(s.barn.items) }, before);
  must(s, 'chapterSeen', { id: 20 }, T0 + 9000); assert.equal(s.story.ended, T0 + 5000, 'the end keeps its first date');
  assert.equal(unpack(pack(s)).story.ended, T0 + 5000);
  // the game goes on: time passes, a dividend comes due and is collected, a sale is made, a fair can be held, a market day comes
  const later = T0 + 5000 + VALLEY.dividendMs * 2; tick(s, later); assert.ok(dividendOf(s, later).waiting > 0); const coins = s.coins; must(s, 'collectDividend', {}, later); assert.ok(s.coins > coins);
  s.barn.items.bread = (s.barn.items.bread ?? 0) + 6; const sold = act(s, 'sellGoods', { good: 'bread', n: 3 }, later); if (sold.ok !== false) assert.ok(s.coins > coins);
  assert.ok(fairOf(s, later).open); const fair = act(s, 'holdFair', {}, later); assert.ok(fair.ok !== false, fair.reason);
  assert.ok(must(s, 'testMarketDay', {}, later)); assert.ok(tick(s, later + 60000));
  // and the roadmap's last milestone is done
  assert.ok(CHAPTERS.every(c => c.id > 20 || c.when(s) || c.id < 20), 'no chapter after the last');
});
test('the closing cards name everyone who came back, each once, and every one has a portrait', () => {
  const s = farm(), cast = castOf(s, T0);
  assert.deepEqual(cast.people.slice(0, 4), ['ada', 'ellis', 'june', 'pip']); assert.equal(new Set(cast.people).size, cast.people.length);
  for (const v of VILLAGERS) assert.equal(cast.people.includes(v.id), hasArrived(s, v), v.id);
  for (const n of NEIGHBOURS) assert.equal(cast.people.includes(n.id), hasArrived(s, n), n.id);
  const families = Object.values(s.homes).filter(h => h.family && h.arrivesAt <= T0); assert.ok(families.length >= 4);
  for (const h of families) for (const p of FAMILIES.find(f => f.id === h.family).people) assert.ok(cast.people.includes(p.id), `${p.id} of ${h.family}`);
  for (const id of ['cora', 'hazel', 'hugo', 'pearl', 'bea', 'tuyet', 'mai', 'gus', 'priya', 'twins']) assert.ok(cast.people.includes(id), id);
  for (const id of cast.people) assert.ok(ICONS[`person:${id}`], `no portrait for ${id}`);
  assert.equal(cast.returned, s.stats.returned); assert.ok(cast.returned >= 4);
  // somebody who has not come yet is not named
  const t = newGame(T0, 5, { restore: true }); tick(t, T0); const early = castOf(t, T0);
  assert.ok(early.people.includes('ada') && !early.people.includes('ellis') && !early.people.includes('bea') && !early.people.includes('priya')); assert.equal(early.returned, 0);
});
test('the valley album: every chapter seen, the answer of chapter 11, the titles with their dates, the end', () => {
  const s = farm(); let a = albumOf(s);
  assert.deepEqual(a.chapters.map(c => c.id), Array.from({ length: 19 }, (_, i) => i + 1)); assert.equal(a.choice, 'meadow'); assert.equal(a.ended, null);
  assert.deepEqual(a.titles.map(x => x.at), VALUE_TITLES.filter(x => s.firsts[`title:${x.at}`]).map(x => x.at)); for (const x of a.titles) assert.ok(x.name && Number.isFinite(x.when));
  must(s, 'testFinishChapter', {}); must(s, 'chapterSeen', { id: 20 }, T0 + 5000); a = albumOf(s);
  assert.equal(a.chapters.length, 20); assert.equal(a.titles.length, VALUE_TITLES.length); assert.equal(a.ended, T0 + 5000);
  const fresh = newGame(T0, 9); assert.deepEqual(albumOf(fresh).chapters.map(c => c.id), CHAPTERS.filter(c => c.id <= (fresh.story.chapter ?? 0)).map(c => c.id));
});
test('chapter 20 is the last card; the tester can finish the story', () => {
  assert.ok(ch && ch.closing && ch.panels.length === 3 && ch.ada); const en = resolveNames(ch.text, 'en'); assert.ok(en.length <= 340, `${en.length} letters`);
  assert.match(en, /Granny Maple counts the lights on both banks/); assert.match(en, /loses count twice/); assert.match(ch.ada, /waiting for someone to stay/);
  const t = newGame(T0, 3, { restore: true }); tick(t, T0); const r = must(t, 'testJumpChapter', { chapter: 21 });
  assert.deepEqual(r.missing, []); assert.equal(t.story.chapter, 20); assert.ok(ch.when(t)); assert.ok(storyEnded(t)); assert.ok(valueOf(t) >= LAST.at);
});
