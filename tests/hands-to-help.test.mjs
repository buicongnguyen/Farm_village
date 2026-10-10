// Chapter 10, hands to help (docs/plan/ch10-hands-to-help.md): named villagers take the jobs, their work is counted
// and located, the day's sums and Granny Maple's advice, the chapter and its scenes.
import './tz.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/core/state.mjs';
import { act, tick } from '../src/core/act.mjs';
import { HANDS } from '../src/content/economy.mjs';
import { FAMILIES } from '../src/content/people.mjs';
import { handWho, hiredCount, handHired } from '../src/core/helpers.mjs';
import { reportOf, adviceOf, tallyEarned, SOURCES } from '../src/core/report.mjs';
import { CHAPTERS, BEATS } from '../src/content/story.mjs';
import { stepDone } from '../src/core/projects.mjs';
import { journeyOf } from '../src/core/journey.mjs';
import { pack, unpack } from '../src/kit/save.mjs';
import { must, T0, MIN } from './helpers.mjs';

/** A farm at the start of chapter 10 (the tester's jump): four families, the school, coins to hire with. */
function farm(seed = 4242) { const s = newGame(T0, seed, { restore: true }); tick(s, T0); must(s, 'testJumpChapter', { chapter: 10 }); s.coins = 50000; s.barn.cap = 9000; return s; }
const ch = CHAPTERS.find(c => c.id === 10);

test('each job has a villager who takes it once hired, when their family lives in the village', () => {
  const people = new Set(FAMILIES.flatMap(f => f.people.filter(p => !p.kid).map(p => p.id)));
  const who = Object.values(HANDS.roles).map(r => r.who); assert.equal(new Set(who).size, 6, 'six different people'); assert.ok(who.every(id => people.has(id)), 'grown-ups who live here');
  const s = farm(); assert.equal(handWho(s, 'field', T0), null, 'nobody until hired');
  must(s, 'hireHand', { role: 'field' }); assert.equal(handWho(s, 'field', T0), 'minh'); assert.equal(hiredCount(s), 1);
  // a hand whose villager has not come to the village yet works all the same, without a name
  const early = newGame(T0, 7, { restore: true }); tick(early, T0); must(early, 'testJumpChapter', { chapter: 5 }); early.coins = 5000;
  must(early, 'hireHand', { role: 'orchard' }); assert.ok(handHired(early, 'orchard')); assert.equal(handWho(early, 'orchard', T0), null, 'the painter\'s family has not arrived');
});
test('a hand\'s round is counted, located and told: tasks, where the work was, and who did it', () => {
  const s = farm(); s.story.firstWheat = false;
  for (const role of ['field', 'workshop']) must(s, 'hireHand', { role });
  const beds = Object.keys(s.placed).filter(id => s.placed[id].kind === 'bed'); assert.ok(beds.length >= 4);
  for (const id of Object.keys(s.beds)) delete s.beds[id];
  must(s, 'plant', { ids: beds, crop: 'wheat' }); tick(s, T0 + 1000);   // the hands' clock starts
  const at = T0 + 1000 + HANDS.everyMs + 1, coins = s.coins, r = tick(s, at), did = r.events.find(e => e.type === 'handDid' && e.role === 'field');
  assert.ok(did, 'the field hand did not work'); assert.equal(did.who, 'minh'); assert.ok(beds.includes(did.at), 'the work was at a bed');
  assert.equal(did.count, Math.ceil(beds.length / 2), 'half of the ripe beds, rounded up');
  assert.equal(s.stats.handTasks, did.count); assert.equal(s.hands.field.done, did.count); assert.deepEqual(s.hands.field.last, { at, id: did.at });
  assert.equal(s.today.hands.field, did.count); assert.equal(s.today.wages, did.count * HANDS.wage); assert.ok(s.coins <= coins - did.count * HANDS.wage + 1e6);
  const back = unpack(pack(s)); assert.equal(back.stats.handTasks, did.count); assert.equal(back.hands.field.done, did.count);
});
test('today\'s sums: the total is exact, the sources are named, and a new day starts again', () => {
  const s = farm(); tick(s, T0 + 1000); const base = s.today.earnedBase; assert.equal(base, s.stats.coinsEarned);
  s.barn.items.pumpkin = 20; const sale = must(s, 'sellGood', { good: 'pumpkin', n: 4 }, T0 + 2000).coins;
  let r = reportOf(s); assert.equal(r.total, sale); assert.deepEqual(r.rows, [['sales', sale]]); assert.equal(r.other, 0); assert.equal(r.best, 'sales');
  // an order filled, and coins nobody named
  tallyEarned(s, [{ type: 'orderFilled', coins: 70 }]); s.stats.coinsEarned += 70 + 15;
  r = reportOf(s); assert.equal(r.total, sale + 85); assert.deepEqual(Object.fromEntries(r.rows), { orders: 70, sales: sale }); assert.equal(r.other, 15);
  assert.ok(r.rows.every(([k]) => SOURCES.includes(k)));
  // a festival's hat is the festival's, not a sale
  const f = farm(3); tick(f, T0 + 1000); tallyEarned(f, [{ type: 'harvestFestivalStarted', coins: 500 }, { type: 'coins', coins: 500 }]); assert.deepEqual(f.today.earned, { festival: 500 });
  // the report is seen once a day; the next day starts from nothing
  assert.equal(reportOf(s).seen, false); must(s, 'seeReport', {}); must(s, 'seeReport', {}); assert.equal(s.stats.reports, 1); assert.equal(reportOf(s).seen, true);
  tick(s, T0 + 26 * 60 * MIN); r = reportOf(s); assert.equal(r.total, 0); assert.deepEqual(r.rows, []); assert.equal(r.seen, false); assert.equal(s.today.wages, 0);
  // an old save without the day's base starts counting from now, never with a jump
  const old = JSON.parse(pack(farm(5))); delete old.today.earnedBase; old.stats.coinsEarned = 99999; assert.equal(reportOf(unpack(JSON.stringify(old))).total, 0);
});
test('Granny Maple gives one piece of advice, the first that fits', () => {
  const s = farm(); s.coins = 0;
  for (const id of Object.keys(s.placed)) if (s.placed[id].kind === 'bed') s.beds[id] = { crop: 'wheat', doneAt: T0 + 1 };
  for (const q of Object.values(s.production)) q.queue = [{ recipe: 'bread', doneAt: T0 + 1, slot: 0 }];
  const idle = Object.keys(s.production).find(id => s.placed[id]);
  s.barn.items = { wheat: Math.ceil(s.barn.cap * 0.95) }; assert.deepEqual(adviceOf(s), ['barn', 'market']);
  s.barn.items = {}; const beds = Object.keys(s.placed).filter(id => s.placed[id].kind === 'bed');
  for (const id of beds.slice(0, 3)) delete s.beds[id]; assert.equal(adviceOf(s)[0], 'beds');
  for (const id of beds) s.beds[id] = { crop: 'wheat', doneAt: T0 + 1 };
  if (idle) { s.production[idle].queue = []; assert.equal(adviceOf(s)[0], 'trays'); s.production[idle].queue = [{ recipe: 'bread', doneAt: T0 + 1, slot: 0 }]; }
  s.coins = 99999; assert.deepEqual(adviceOf(s), ['hire', 'friends']);
  for (const role of Object.keys(HANDS.roles)) s.hands = { ...(s.hands ?? {}), [role]: { since: T0 } };
  assert.ok(['grow', 'praise'].includes(adviceOf(s)[0]));
});
test('chapter 10 closes with three hands hired and thirty tasks done by them', () => {
  const s = farm(); assert.ok(ch && ch.panels.length === 3 && ch.ada); assert.equal(ch.when(s), false);
  for (const role of ['field', 'animals', 'workshop']) must(s, 'hireHand', { role });
  assert.equal(ch.when(s), false, 'hired is half of it'); assert.ok(BEATS.find(b => b.id === 'three-hands').when(s));
  s.stats.handTasks = 29; assert.equal(ch.when(s), false); s.stats.handTasks = 30; assert.equal(ch.when(s), true);
  tick(s, T0 + MIN); assert.ok(stepDone(s, 'three_hands')); must(s, 'chapterSeen', { id: 10 }, T0 + MIN); assert.equal(s.story.chapter, 10);
  const report = BEATS.find(b => b.id === 'report-first'); assert.equal(report.when(s), false); must(s, 'seeReport', {}, T0 + MIN); assert.equal(report.when(s), true);
  for (const id of ['three-hands', 'report-first']) assert.equal(BEATS.find(b => b.id === id).chapter, 10);
  // the roadmap's stage and the tester's jump past the chapter
  const t = newGame(T0, 9, { restore: true }); tick(t, T0); const r = must(t, 'testJumpChapter', { chapter: 11 });
  assert.deepEqual(r.missing, []); assert.ok(ch.when(t)); assert.equal(hiredCount(t), 3);
  const j = farm(11); j.house = { level: 5 }; j.stats.cheeseMade = 1; j.album.fruit.cherry = 9;
  for (const kind of ['goat_barn', 'dairy', 'fruit_stand', 'kennel']) { j.placed[`x_${kind}`] = { kind, x: 2, z: 2, rot: 0 }; j.counts[kind] = 1; }
  j.hands = { field: { since: T0 } }; let stage = journeyOf(j); assert.equal(stage.stage.id, 'coop'); assert.equal(stage.total, 2); assert.equal(stage.done, 0);
});
