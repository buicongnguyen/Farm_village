import './tz.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { game, setLevel, T0 } from './helpers.mjs';
import { conversationLine, juneTopics, juneAdvice, pipReactionLines } from '../src/core/conversation.mjs';
import { commentFor, eligibleRemarks } from '../src/core/neighbours.mjs';
import { FAMILIES, NEIGHBOURS, REMARK_FACTS, VILLAGERS } from '../src/content/people.mjs';
import { CHATTER } from '../src/content/chatter.mjs';
import { act } from '../src/core/act.mjs';

const keys = s => juneTopics(s, T0).map(t => t.key);
function withAnimals() {
  const s = game(); setLevel(s, 2);
  s.placed.coop = { kind: 'coop', x: 32, z: 56 };
  s.placed.mill = { kind: 'feed_mill', x: 36, z: 56 };
  s.animals.coop = [{ kind: 'hen', doneAt: null }];
  s.barn.items = { wheat: 3 };
  return s;
}

test('school and clinic introductions follow working buildings, including a first meeting after opening', () => {
  const s = game();
  const bo = FAMILIES[0].people.find(p => p.id === 'bo');
  assert.equal(conversationLine(s, 'bo').text, bo.line);
  s.placed.school = { kind: 'school', x: 0, z: 0 };
  assert.equal(conversationLine(s, 'bo').key, 'school');
  assert.equal(conversationLine(s, 'bo').text, bo.contextLines[0].text);
  assert.equal(conversationLine(s, 'marisol').key, 'intro');
  s.placed.clinic = { kind: 'clinic', x: 0, z: 0 };
  s.cond.clinic = { level: 3 };
  assert.equal(conversationLine(s, 'marisol').key, 'intro');
  delete s.cond.clinic;
  assert.equal(conversationLine(s, 'marisol').key, 'clinic');
});

test('June distinguishes available feed, makeable feed, queued feed and a broken mill without mutating state', () => {
  const s = withAnimals(), before = JSON.stringify(s);
  assert.ok(keys(s).includes('makeFeed'));
  assert.ok(!keys(s).includes('feed'));
  assert.equal(JSON.stringify(s), before, 'read-only advice must not create production queues');
  s.cond.mill = { level: 3 };
  assert.ok(!keys(s).includes('makeFeed'));
  delete s.cond.mill;
  s.production.mill = { slots: 2, queue: [{ recipe: 'chicken_feed', doneAt: T0 + 20_000 }] };
  assert.ok(!keys(s).includes('makeFeed'), 'the feed already being made is enough for a hint');
  s.production.mill.queue[0].doneAt = T0;
  assert.ok(keys(s).includes('products'));
  s.barn.cap = 3;
  assert.ok(!keys(s).includes('products'), 'collection would fail with a full barn');
  s.barn.cap = 100; s.barn.items.chicken_feed = 1;
  assert.ok(keys(s).includes('feed'));
  assert.ok(act(s, 'feed', { home: 'coop' }, T0).ok, 'the suggested feed action succeeds');
  assert.ok(!keys(s).includes('feed'));
});

test('June only suggests making feed when ingredients, an open recipe and a queue slot permit it', () => {
  const s = withAnimals();
  s.barn.items.wheat = 2; assert.ok(!keys(s).includes('makeFeed'));
  s.barn.items.wheat = 3; s.level = 1; assert.ok(!keys(s).includes('makeFeed'));
  s.level = 2; s.production.mill = { slots: 1, queue: [{ recipe: 'cow_feed', doneAt: T0 + 1000 }] };
  assert.ok(!keys(s).includes('makeFeed'));
  delete s.production.mill;
  assert.ok(keys(s).includes('makeFeed'));
  assert.ok(act(s, 'produce', { building: 'mill', recipe: 'chicken_feed' }, T0).ok, 'the suggested recipe can be queued');
  assert.ok(!keys(s).includes('makeFeed'));
});

test('June never offers project-reserved goods to an order and varies true topics within the session', () => {
  const s = game(); setLevel(s, 6); s.projects.step = 5;
  s.homes = { a: { family: 'tran', arrived: true, arrivesAt: T0 }, b: { family: 'okafor', arrived: true, arrivesAt: T0 } };
  s.barn.items = { bread: 24, corn_bread: 10 };
  s.orders.cards = [{ id: 'test', from: 'ada', need: { bread: 1 } }];
  assert.ok(!keys(s).includes('orders'));
  s.barn.items.bread++;
  assert.ok(keys(s).includes('orders'));
  const first = juneAdvice(s, T0), second = juneAdvice(s, T0, first.key);
  assert.notEqual(first.key, second.key);
  assert.ok(juneTopics(s, T0).some(topic => topic.key === second.key));
  s.projects.step = 99; s.orders.cards = [];
  assert.equal(juneAdvice(s, T0).key, 'rest');
});

test('Mai and Gus use every eligible remark, rotate visits, and keep the three-visit Gus arc first', () => {
  const s = game();
  s.counts.bed = 8;
  s.animals.coop = [{ kind: 'hen' }, { kind: 'hen' }];
  s.placed.bakery = { kind: 'bakery', x: 0, z: 0 };
  s.homes = { a: { family: 'tran', arrived: true, arrivesAt: T0 }, b: { family: 'okafor', arrived: true, arrivesAt: T0 + 1 } };
  const before = JSON.stringify(s);
  for (const id of ['mai', 'gus']) {
    const info = NEIGHBOURS.find(p => p.id === id), remarks = eligibleRemarks(s, id);
    assert.equal(remarks.length, 5);
    const start = id === 'gus' ? 4 : 1;
    const visits = Array.from({ length: remarks.length }, (_, i) => commentFor(s, id, start + i));
    assert.deepEqual(new Set(visits.map(v => v.text)), new Set(info.remarks.map(r => r.text)));
    assert.ok(visits.every(v => !v.text.includes('{family}') || v.params.family === 'The Okafor family'));
  }
  for (let n = 1; n <= 3; n++) assert.equal(commentFor(s, 'gus', n).text, NEIGHBOURS.find(p => p.id === 'gus').arc[n - 1].text);
  assert.equal(JSON.stringify(s), before, 'comments must not advance the economy RNG or alter the save');
});

test('unfinished homes and a broken bakery never qualify for active-village remarks', () => {
  const s = game(); s.counts.cottage = 3; s.counts.bakery = 1;
  s.placed.bakery = { kind: 'bakery', x: 0, z: 0 }; s.cond.bakery = { level: 3 };
  s.homes = { a: { family: 'tran', arrived: false, arrivesAt: T0 + 1 }, b: { family: 'okafor', arrived: false, arrivesAt: T0 + 2 } };
  assert.equal(REMARK_FACTS.cottages(s), null); assert.equal(REMARK_FACTS.family(s), null); assert.equal(REMARK_FACTS.bakery(s), null);
  assert.deepEqual(eligibleRemarks(s, 'mai'), []);
  delete s.cond.bakery; s.repairing.bakery = { doneAt: T0 + 10 };
  assert.equal(REMARK_FACTS.bakery(s), null);
});

test('Pip names only the first two hens, keeps names after reload, and distinguishes milk from eggs', () => {
  const s = withAnimals(), pip = VILLAGERS.find(p => p.id === 'pip');
  assert.deepEqual(pipReactionLines(s, { type: 'animalArrived', kind: 'hen' }), [pip.says.animalArrived.first]);
  s.animals.coop.push({ kind: 'hen', doneAt: null });
  assert.deepEqual(pipReactionLines(JSON.parse(JSON.stringify(s)), { type: 'animalArrived', kind: 'hen' }, true), [pip.says.animalArrived.lines[0]]);
  s.animals.coop.push({ kind: 'hen', doneAt: null });
  assert.deepEqual(pipReactionLines(s, { type: 'animalArrived', kind: 'hen' }, true), [pip.says.animalArrived.lines[1]]);
  assert.deepEqual(pipReactionLines(s, { type: 'animalArrived', kind: 'cow' }, true), ['Welcome to the farm, new friend!']);
  assert.deepEqual(pipReactionLines(s, { type: 'collected', good: 'milk' }), ['Fresh from the farm!']);
  assert.deepEqual(pipReactionLines(s, { type: 'collected', good: 'egg' }), pip.says.collected.lines);
  assert.ok(!Object.values(CHATTER).flatMap(part => Object.values(part).flat()).some(l => /beds will not water/i.test(l)));
});


test('June never points at an orphan, broken or repairing crop bed, animal home or workshop', () => {
  const s = game();
  s.beds.bed = { crop: 'wheat', doneAt: T0 };
  s.animals.coop = [{ kind: 'hen', doneAt: T0 }];
  s.production.mill = { slots: 2, queue: [{ recipe: 'chicken_feed', doneAt: T0 }] };
  for (const key of ['harvest', 'collect', 'products']) assert.ok(!keys(s).includes(key), 'orphan ' + key);
  for (const [id, kind] of [['bed', 'bed'], ['coop', 'coop'], ['mill', 'feed_mill']]) {
    s.placed[id] = { kind, x: 0, z: 0 }; s.cond[id] = { level: 3 };
  }
  for (const key of ['harvest', 'collect', 'products']) assert.ok(!keys(s).includes(key), 'broken ' + key);
  s.cond = {};
  for (const key of ['harvest', 'collect', 'products']) assert.ok(keys(s).includes(key), 'available ' + key);
  for (const id of ['bed', 'coop', 'mill']) s.repairing[id] = { doneAt: T0 + 1000 };
  for (const key of ['harvest', 'collect', 'products']) assert.ok(!keys(s).includes(key), 'repairing ' + key);
  delete s.beds.bed; assert.ok(!keys(s).includes('plant'));
  s.animals.coop[0].doneAt = null; s.barn.items.chicken_feed = 1;
  assert.ok(!keys(s).includes('feed'));
  s.repairing = {}; assert.ok(keys(s).includes('plant')); assert.ok(keys(s).includes('feed'));
});

test('legacy neighbour fallback never mistakes bare cottages for a working bakery or crops for carrots', () => {
  const s = game(); s.counts.cottage = 3;
  for (let i = 0; i < 6; i++) s.beds['bed' + i] = { crop: 'wheat', doneAt: T0 + 1000 };
  for (let visit = 4; visit <= 12; visit++) {
    assert.ok(!/bakery|bread/i.test(commentFor(s, 'gus', visit).text));
    assert.ok(!/carrot/i.test(commentFor(s, 'mai', visit).text));
  }
});
