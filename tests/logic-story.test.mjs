// Optional story order and contextual heart scenes through the real act()/tick() entry points.
import './tz.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { act, tick } from '../src/core/act.mjs';
import { pack, unpack } from '../src/kit/save.mjs';
import { sceneFor, letterDue, letterReady, letterPrerequisite, useBondsData } from '../src/core/bonds.mjs';
import { LETTERS } from '../src/content/letters.mjs';
import { HEART_SCENES } from '../src/content/hearts.mjs';
import { BEATS } from '../src/content/story.mjs';
import { resolveNames } from '../src/content/character-names.mjs';
import { game, must, setLevel, T0, HOUR } from './helpers.mjs';

const clueIds = ['ellis-1', 'ellis-2', 'ellis-3', 'ellis-4', 'ellis-5', 'ellis-6', 'gus-3', 'ellis-7', 'ellis-8'];
const fixtureLetters = [
  { id: 'first', from: 'ellis', when: { type: 'level', value: 1 }, text: 'First clue.' },
  { id: 'second', from: 'gus', when: { type: 'level', value: 1 }, after: ['first'], text: 'Second clue.', reward: { coins: 25 } },
  { id: 'third', from: 'ellis', when: { type: 'level', value: 1 }, after: ['second'], text: 'Third clue.' },
];
const withLetters = fn => {
  useBondsData({ letters: fixtureLetters });
  try { fn(); } finally { useBondsData(null); }
};
const refusedWithoutMutation = (s, id, reason) => {
  const before = structuredClone(s), r = act(s, 'readLetter', { id }, T0);
  assert.equal(r.ok, false); assert.equal(r.reason, reason); assert.deepEqual(r.events, []);
  assert.deepEqual(s, before, `refused reading ${id} changed the save`);
};

test('clues arrive one at a time after the previous delivered letter is read', () => withLetters(() => {
  const s = game();
  assert.deepEqual(s.mail.map(m => m.id), ['first']);
  assert.equal(letterDue(s, fixtureLetters[1]), true, 'world eligibility remains separate for migration');
  assert.equal(letterReady(s, fixtureLetters[1]), false);
  assert.equal(letterPrerequisite(s, 'third'), 'first');
  tick(s, T0 + 1);
  assert.equal(s.mail.length, 1, 'delivery alone does not acknowledge a clue');
  refusedWithoutMutation(s, 'second', 'That letter is gone');
  must(s, 'readLetter', { id: 'first' });
  assert.deepEqual(s.mail.map(m => m.id), ['second', 'first']);
  assert.equal(letterPrerequisite(s, 'third'), 'second');
  const coins = s.coins;
  must(s, 'readLetter', { id: 'second' });
  assert.deepEqual(s.mail.map(m => m.id), ['third', 'second', 'first']);
  assert.equal(s.coins, coins + 25);
  must(s, 'readLetter', { id: 'second' });
  tick(s, T0 + 2);
  assert.equal(s.coins, coins + 25, 'the same gift cannot be claimed twice');
  assert.equal(s.mail.length, 3, 'letters cannot be delivered twice');
}));

test('old saves with delivered but unread later clues must acknowledge earlier facts first', () => withLetters(() => {
  const s = game();
  s.mail.unshift({ id: 'third', from: 'ellis', at: T0 - 100, read: false });
  refusedWithoutMutation(s, 'third', 'Read the earlier letter first');
  refusedWithoutMutation(s, 'unknown', 'That letter is gone');
  must(s, 'readLetter', { id: 'first' });
  refusedWithoutMutation(s, 'third', 'Read the earlier letter first');
  must(s, 'readLetter', { id: 'second' });
  must(s, 'readLetter', { id: 'third' });
  assert.equal(s.mail.filter(m => m.id === 'third').length, 1);
  assert.equal(s.mail.find(m => m.id === 'third').at, T0 - 100, 'old delivery records survive');
}));

test('already-read legacy clues stay acknowledged without replaying rewards or demanding missing predecessors', () => withLetters(() => {
  const s = game();
  s.mail = [{ id: 'second', from: 'gus', at: T0 - 100, read: true }];
  const coins = s.coins;
  assert.equal(letterPrerequisite(s, 'third'), null, 'a read legacy clue is an established fact');
  must(s, 'readLetter', { id: 'second' });
  assert.equal(s.coins, coins);
  assert.ok(s.mail.some(m => m.id === 'third'), 'the legacy reader can continue the thread');
  assert.ok(s.mail.find(m => m.id === 'second').read);
  assert.equal(s.mail.filter(m => m.id === 'second').length, 1);
  must(s, 'readLetter', { id: 'third' });
  assert.equal(s.coins, coins);
}));

test('acknowledging a clue does not bypass its later world milestone', () => {
  const letters = [fixtureLetters[0], { ...fixtureLetters[1], when: { type: 'level', value: 5 } }];
  useBondsData({ letters });
  try {
    const s = game(); must(s, 'readLetter', { id: 'first' });
    assert.equal(s.mail.length, 1);
    setLevel(s, 5); tick(s, T0 + 1);
    assert.ok(s.mail.some(m => m.id === 'second'));
  } finally { useBondsData(null); }
});

test('the authored Ellis/Gus thread is acyclic, ordered and remains an unresolved water history', () => {
  const ids = new Set(LETTERS.map(l => l.id));
  const walk = (id, path = []) => {
    assert.ok(!path.includes(id), `letter cycle: ${[...path, id].join(' -> ')}`);
    for (const before of LETTERS.find(l => l.id === id)?.after ?? []) {
      assert.ok(ids.has(before), `missing prerequisite ${before}`); walk(before, [...path, id]);
    }
  };
  LETTERS.forEach(l => walk(l.id));
  const s = game(); s.story.chapter = 4; setLevel(s, 5);
  Object.assign(s.stats, { fished: 3, trips: 2, questsDone: 9, festival: 1 });
  tick(s, T0 + 1);
  for (let i = 0; i < clueIds.length; i++) {
    const delivered = s.mail.filter(m => clueIds.includes(m.id));
    assert.deepEqual(delivered.map(m => m.id), clueIds.slice(0, i + 1).reverse());
    assert.equal(delivered.filter(m => !m.read).length, 1);
    must(s, 'readLetter', { id: clueIds[i] });
  }
  const text = LETTERS.filter(l => clueIds.includes(l.id)).map(l => l.text).join(' ');
  assert.doesNotMatch(text, /key under the bell|paid me to lock|Open the sluice|Back at the gate at last/);
  assert.match(LETTERS.find(l => l.id === 'ellis-8').text, /school celebration.*still upriver/);
  const mai = resolveNames(LETTERS.find(l => l.id === 'mai-1').text, 'en');
  assert.match(mai, /Cloud and Drizzle/); assert.doesNotMatch(mai, /Biscuit|Pancake/);
});

test('school and clinic heart variants use the current place without changing rewards', () => {
  const s = game();
  for (const [person, at, kind] of [['zara', 3, 'school'], ['tomas', 9, 'school'], ['marisol', 3, 'clinic'], ['marisol', 6, 'clinic'], ['marisol', 9, 'clinic']]) {
    s.counts[kind] = 0;
    const before = sceneFor(person, at, s), base = sceneFor(person, at);
    assert.deepEqual(before.lines, base.lines, `${person} before ${kind}`);
    s.counts[kind] = 1;
    const after = sceneFor(person, at, s);
    assert.notDeepEqual(after.lines, before.lines, `${person} should react to ${kind}`);
    assert.deepEqual(after.reward, before.reward);
    assert.equal(after.lines.length, 3);
    assert.ok(after.lines.some(l => l.who === person));
  }
  for (const at of [3, 6, 9]) {
    assert.doesNotMatch(sceneFor('marisol', at, s).lines.map(l => l.text).join(' '), /needs a proper clinic|wants the clinic back|coming to visit/);
  }
  assert.equal(sceneFor('missing', 3, s), null);
  assert.deepEqual(HEART_SCENES.zara[3].lines, sceneFor('zara', 3).lines, 'lookup never mutates content');
});

test('real gift actions select the contextual heart dialogue and grant its unchanged reward once', () => {
  for (const clinicOpen of [false, true]) {
    const s = game();
    s.homes.testHome = { family: 'reyes', arrived: true, arrivesAt: T0 };
    s.people.marisol = { hearts: 2, scenes: [] };
    s.barn.items.milk = 2; s.counts.clinic = clinicOpen ? 1 : 0;
    const stored = s.stored.flowerpot ?? 0;
    const result = must(s, 'gift', { person: 'marisol', good: 'milk' });
    const scene = result.events.find(e => e.type === 'heartScene' && e.person === 'marisol');
    assert.ok(scene); assert.equal(scene.variant, clinicOpen ? 0 : null);
    assert.equal(Object.hasOwn(scene, 'lines'), false, 'events store the variant index, not dialogue');
    assert.deepEqual(scene.reward, { decor: 'flowerpot' });
    assert.equal(s.stored.flowerpot, stored + 1);
    const playedVariant = scene.variant;
    s.counts.clinic = clinicOpen ? 0 : 1;
    const later = must(s, 'gift', { person: 'marisol', good: 'milk' }, T0 + 24 * HOUR);
    assert.ok(!later.events.some(e => e.type === 'heartScene' && e.person === 'marisol'));
    assert.equal(s.stored.flowerpot, stored + 1);
    assert.equal(scene.variant, playedVariant, 'an earned event keeps its original context');
    const loaded = unpack(pack(s));
    assert.equal(loaded.news.find(e => e.type === 'heartScene' && e.person === 'marisol').variant, playedVariant);
  }
});

test('a heart scene with quoted dialogue survives save export and import', () => {
  const s = game();
  s.homes.testHome = { family: 'tran', arrived: true, arrivesAt: T0 };
  s.people.lan = { hearts: 5, scenes: [3] }; s.barn.items.egg = 1;
  assert.match(sceneFor('lan', 6).lines[0].text, /"more butter"/);
  const r = must(s, 'gift', { person: 'lan', good: 'egg' });
  assert.ok(r.events.some(e => e.type === 'heartScene' && e.at === 6));
  const loaded = unpack(pack(s));
  assert.ok(loaded.people.lan.scenes.includes(6));
  assert.ok(loaded.news.some(e => e.type === 'heartScene' && e.person === 'lan' && e.at === T0));
});


test('the first-cherry beat waits for a harvest and works before or after its suggested chapter', () => {
  const beat = BEATS.find(b => b.id === 'first-cherries');
  for (const chapter of [1, 5]) {
    const s = game(); s.story.chapter = chapter; s.counts.cherry_tree = 1;
    assert.equal(beat.when(s), false, 'planting a tree is not a cherry harvest');
    const before = structuredClone(s), refused = act(s, 'beatSeen', { id: beat.id }, T0);
    assert.equal(refused.ok, false); assert.deepEqual(s, before);
    s.album.fruit.cherry = 3;
    assert.equal(beat.when(s), true, 'the chapter tag must not hide a real optional discovery');
    must(s, 'beatSeen', { id: beat.id });
    s.album.fruit.cherry = 0;
    must(s, 'beatSeen', { id: beat.id });
    assert.equal(s.story.beats.filter(id => id === beat.id).length, 1);
  }
});

test("Biscuit's welcome requires his kennel and Grace's arrival, even on late farms", () => {
  const beat = BEATS.find(b => b.id === 'biscuit-home');
  for (const chapter of [1, 5]) {
    const s = game(); s.story.chapter = chapter; s.counts.kennel = 1;
    s.homes.tranHome = { family: 'tran', arrived: true, arrivesAt: T0 };
    s.homes.okaforHome = { family: 'okafor', arrived: false, arrivesAt: T0 + HOUR };
    assert.equal(beat.when(s), false, 'an unrelated arrived family does not introduce Grace');
    const before = structuredClone(s), refused = act(s, 'beatSeen', { id: beat.id }, T0);
    assert.equal(refused.ok, false); assert.deepEqual(s, before);
    tick(s, T0 + HOUR);
    assert.ok(s.homes.okaforHome.arrived);
    s.counts.kennel = 0; assert.equal(beat.when(s), false, 'Grace alone does not imply a kennel');
    s.counts.kennel = 1; assert.equal(beat.when(s), true);
    must(s, 'beatSeen', { id: beat.id }, T0 + HOUR);
    must(s, 'beatSeen', { id: beat.id }, T0 + HOUR);
    assert.equal(s.story.beats.filter(id => id === beat.id).length, 1);
  }
});
