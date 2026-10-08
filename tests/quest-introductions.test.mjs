// Personal favours must not introduce a household before it actually arrives.
import './tz.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, migrate } from '../src/core/state.mjs';
import { act } from '../src/core/act.mjs';
import { tickQuests, questsOf, ready } from '../src/core/quests.mjs';

const NOW = Date.UTC(2026, 9, 8, 3);
const fresh = seed => newGame(NOW, seed, { restore: true });
function seenFavourPeople(setup = () => {}, now = NOW) {
  const seen = new Set();
  // The known seed-3 regression is included. A fixed range exercises all favour choices without mocking randomness.
  for (let seed = 1; seed <= 96; seed++) {
    const s = fresh(seed); setup(s);
    tickQuests({ s, now, emit() {} });
    for (const q of s.quests.list) if (q.favour) seen.add(q.person);
  }
  return seen;
}
const arrive = (s, family, at = NOW) => {
  s.homes[`home-${family}`] = { family, arrivesAt: at, arrived: at <= NOW, level: 1, rentFrom: NOW };
};
const request = (person, good = 'wheat', n = 12) => ({
  id: `saved-${person}`, favour: true, person, good, n, coins: 60, xp: 14, hearts: 0.5,
});

test('fresh farms never receive Lan or Sam favours before their families arrive, even with apples unlocked', () => {
  const seen = seenFavourPeople(s => { s.level = 3; s.counts.apple_tree = 1; });
  assert.ok(!seen.has('lan'), 'Lan must not request starter wheat before the Tran arrival');
  assert.ok(!seen.has('sam'), 'an apple tree must not introduce Sam before the Okafor arrival');
  assert.ok(seen.has('gus'), 'the familiar visiting neighbour remains eligible');
});

test('favours become available when the relevant household arrives, not merely when it is assigned a cottage', () => {
  const setup = s => { s.level = 3; s.counts.apple_tree = 1; arrive(s, 'tran', NOW + 1000); arrive(s, 'okafor', NOW + 1000); };
  const pending = seenFavourPeople(setup, NOW + 999);
  assert.ok(!pending.has('lan') && !pending.has('sam'), 'families still travelling must wait');
  const arrived = seenFavourPeople(setup, NOW + 1000);
  assert.ok(arrived.has('lan') && arrived.has('sam'), 'arrival unlocks each family through the existing order rules');
  const oneFamily = seenFavourPeople(s => { s.level = 3; s.counts.apple_tree = 1; arrive(s, 'tran'); });
  assert.ok(oneFamily.has('lan') && !oneFamily.has('sam'), 'one arrival must not unlock another family');
});

test('saved premature favours refuse without consuming goods, paying coins, adding hearts or touching history', () => {
  for (const [person, good, n] of [['lan', 'wheat', 12], ['sam', 'apple', 3], ['not-a-person', 'wheat', 12]]) {
    const s = fresh(3), q = request(person, good, n);
    s.quests = { done: 7, list: [q] }; s.stats.questsDone = 7;
    s.barn.items[good] = n;
    s.people[person] = { hearts: 2.5, scenes: [], giftDay: '2026-10-07' };
    s.mail = [{ id: 'ellis-1', from: 'ellis', at: NOW - 1000, read: true }];
    const loaded = migrate(JSON.parse(JSON.stringify(s))), before = structuredClone(loaded);
    const result = act(loaded, 'claimQuest', { id: q.id }, NOW);
    assert.equal(result.ok, false, person);
    assert.equal(result.reason, 'They are not in the village yet');
    assert.deepEqual(result.events, []);
    assert.deepEqual(loaded, before, `${person}: a rejected legacy favour changed the farm`);
  }
});

test('a saved waiting favour completes normally after arrival and cannot be claimed twice', () => {
  const s = fresh(3), q = request('lan');
  s.quests = { done: 7, list: [q] }; s.stats.questsDone = 7;
  s.people.lan = { hearts: 2.5, scenes: [] };
  assert.equal(act(s, 'claimQuest', { id: q.id }, NOW).ok, false);
  arrive(s, 'tran');
  const before = s.coins, result = act(s, 'claimQuest', { id: q.id }, NOW);
  assert.equal(result.ok, true);
  assert.equal(s.coins, before + q.coins);
  assert.equal(s.barn.items.wheat ?? 0, 0);
  assert.equal(s.people.lan.hearts, 3);
  assert.deepEqual(s.people.lan.scenes, [3]);
  assert.equal(result.events.filter(e => e.type === 'heartScene' && e.person === 'lan').length, 1);
  assert.equal(s.quests.done, 8); assert.equal(s.stats.questsDone, 8);
  const completed = structuredClone(s);
  assert.equal(act(s, 'claimQuest', { id: q.id }, NOW).ok, false);
  assert.deepEqual(s, completed, 'duplicate claim changed the completed history');
});

test('existing grandmother and neighbour favours still grant their normal rewards without resident households', () => {
  for (const [person, good, n] of [['ada', 'bread', 2], ['mai', 'egg', 3], ['gus', 'perch', 2]]) {
    const s = fresh(23), q = request(person, good, n);
    s.quests.list = [q]; s.barn.items[good] = n;
    const before = s.coins, result = act(s, 'claimQuest', { id: q.id }, NOW);
    assert.equal(result.ok, true, person);
    assert.equal(s.coins, before + q.coins);
    assert.equal(s.people[person].hearts, q.hearts);
    assert.equal(s.quests.done, 1);
  }
});
test('premature saved favours stay out of visible goals and leave room for three usable goals', () => {
  const s = fresh(3), waiting = [request('lan'), request('sam', 'apple', 3)];
  s.quests = { done: 4, list: structuredClone(waiting) }; s.stats.questsDone = 4;
  s.barn.items.apple = 3;
  const before = structuredClone(s);
  assert.deepEqual(questsOf(s, NOW), { done: 4, list: [] });
  assert.equal(ready(s, waiting[0], NOW), false, 'the ready count must not reveal Lan');
  assert.equal(ready(s, waiting[1], NOW), false, 'the ready count must not reveal Sam');
  assert.deepEqual(s, before, 'checking visible goals must not rewrite saved data');
  tickQuests({ s, now: NOW, emit() {} });
  const visible = questsOf(s, NOW);
  assert.equal(visible.list.length, 3, 'hidden legacy favours must not leave empty active slots');
  assert.ok(visible.list.every(q => !q.favour || !['lan', 'sam'].includes(q.person)));
  assert.deepEqual(s.quests.list.slice(0, 2), waiting, 'waiting favours retain their ids, goods and rewards');
  assert.equal(s.quests.done, 4); assert.equal(s.stats.questsDone, 4);
  const allIds = s.quests.list.map(q => q.id);
  arrive(s, 'tran');
  assert.equal(questsOf(s, NOW).list.length, 3, 'arrival must not overfill the visible board');
  assert.equal(questsOf(s, NOW).list[0].id, waiting[0].id, 'the original Lan request returns after arrival');
  assert.ok(!questsOf(s, NOW).list.some(q => q.person === 'sam'), 'Sam is still travelling');
  assert.deepEqual(s.quests.list.map(q => q.id), allIds, 'arrival must not discard displaced normal goals');
  assert.equal(act(s, 'claimQuest', { id: waiting[0].id }, NOW).ok, true);
  assert.equal(questsOf(s, NOW).list.length, 3, 'the displaced goal returns after the old favour completes');
  assert.equal(s.quests.done, 5);
});