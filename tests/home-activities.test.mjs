// Cosy things to do in the farmhouse (after Zoo Garden's cottage): tea in the kitchen, drawing at the desk, both on a
// wall-clock cooldown with a small, kind reward; every piece of furniture has a use.
import './tz.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { newGame } from '../src/core/state.mjs';
import { act } from '../src/core/act.mjs';
import { pack, unpack } from '../src/kit/save.mjs';
import { installExplore, startExplore, exploreState, exploreSession, routeExplore, moveExplore, atObject, homeCooldown } from '../src/core/explore.mjs';
import { xz } from '../src/core/explore-navigation.mjs';
import { HOME_OBJECTS, HOME_ACTIVITIES, HOME_THINGS, roomAtLevel } from '../src/content/explore.mjs';
import { HATS, COSTUMES, hatOf, wearOf, costumeOf, wardrobe } from '../src/content/wardrobe.mjs';
import { HOME_FAMILY } from '../src/content/explore.mjs';
import { existsSync } from 'node:fs';
import { residents, heartsOf } from '../src/core/bonds.mjs';
import { VI_EXPLORE } from '../src/i18n/vi-explore.mjs';
import { KO_EXPLORE } from '../src/i18n/ko-explore.mjs';
import { JA_EXPLORE } from '../src/i18n/ja-explore.mjs';

const room = JSON.parse(readFileSync(new URL('../public/assets/models/interior-cottage.json', import.meta.url)));
const NOW = 1_800_000_000_000, MIN = 60_000;
installExplore();
function fixture() { const s = newGame(NOW, 123, { restore: true }); s.cond.house = { level: 0, ms: 0 }; startExplore(s, [51, 125], room); assert.ok(act(s, 'enterFarmhouse', {}, NOW).ok); return s; }
function walk(s, id) {
  assert.ok(routeExplore(s, xz(room.interactions.find(o => o.id === id).stand)));
  for (let i = 0; i < 600 && exploreSession(s).route.length; i++) moveExplore(s, 0, 0, .1);
  assert.ok(atObject(s, id), `could not walk to ${id}`);
}

test('every piece of farmhouse furniture has a use, and can be walked to', () => {
  const s = fixture();
  for (const o of room.interactions) { assert.ok(HOME_OBJECTS[o.id]?.label, `${o.id} does nothing`); walk(s, o.id); }
  for (const a of Object.values(HOME_ACTIVITIES)) assert.ok(HOME_OBJECTS[a.at] && a.cooldownMs >= 5 * MIN);
});

test('tea is brewed at the kitchen only, gives a quiet cup alone, and waits out its cooldown', () => {
  const s = fixture(), xp = s.xp;
  assert.equal(act(s, 'brewTea', {}, NOW).ok, false, 'tea from across the room');
  walk(s, 'farmhouse_kitchen');
  const r = act(s, 'brewTea', {}, NOW); assert.equal(r.ok, true); assert.equal(r.xp, HOME_ACTIVITIES.tea.xp); assert.ok(s.xp > xp || s.level > 1);
  assert.equal(homeCooldown(s, 'tea', NOW), HOME_ACTIVITIES.tea.cooldownMs);
  const saved = pack(s);
  assert.equal(act(s, 'brewTea', {}, NOW + 5 * MIN).ok, false, 'tea again during the cooldown'); assert.equal(pack(s), saved, 'a refused tea changed the save');
  assert.equal(act(s, 'brewTea', {}, NOW + HOME_ACTIVITIES.tea.cooldownMs).ok, true, 'tea after the cooldown');
});

test('with neighbours in the village, tea is shared with the one you know least: one heart, never past ten', () => {
  const s = fixture();
  const home = Object.keys(s.homes)[0]; s.homes[home].family = 'tran'; s.homes[home].arrivesAt = NOW - 1;
  const people = residents(s, NOW).map(r => r.id); assert.ok(people.length >= 2, 'the fixture has no residents');
  for (const id of people) s.people[id] = { hearts: 4, scenes: [3] };
  s.people[people[1]].hearts = 1;
  walk(s, 'farmhouse_kitchen');
  const r = act(s, 'brewTea', {}, NOW); assert.equal(r.ok, true); assert.equal(r.guest, people[1]); assert.equal(heartsOf(s, people[1]), 2);
  for (const id of people) s.people[id].hearts = 10;
  const again = act(s, 'brewTea', {}, NOW + HOME_ACTIVITIES.tea.cooldownMs); assert.equal(again.ok, true); assert.equal(again.guest, undefined, 'tea raised a full friendship'); assert.ok(again.xp > 0);
});

test('drawing in the journal counts on the shelf, survives a save, and a clock set back cannot lock it', () => {
  const s = fixture(); walk(s, 'farmhouse_desk');
  assert.equal(act(s, 'drawInJournal', {}, NOW).drawings, 1);
  assert.equal(act(s, 'drawInJournal', {}, NOW + MIN).ok, false);
  assert.equal(act(s, 'drawInJournal', {}, NOW + HOME_ACTIVITIES.draw.cooldownMs).drawings, 2);
  const back = unpack(pack(s)); assert.equal(exploreState(back).drawings, 2); assert.ok(exploreState(back).used.draw > 0);
  assert.ok(homeCooldown(s, 'draw', NOW - 365 * 24 * 60 * MIN) <= HOME_ACTIVITIES.draw.cooldownMs, 'a clock set back locked the desk');
  s.explore.used = { draw: 'soon', tea: -5, other: 1 }; s.explore.drawings = 1e9;
  assert.deepEqual(exploreState(s).used, {}); assert.equal(exploreState(s).drawings, HOME_ACTIVITIES.draw.max);
});

test('the home words are translated in Vietnamese, Korean and Japanese', () => {
  const keys = [...Object.values(HOME_OBJECTS).map(o => o.label), 'Brew tea', 'Draw in the journal', 'Open the journal', 'The day on the table', 'Ready again in {time}', 'Our collection', 'Pick a shirt for today.'];
  for (const pack of [VI_EXPLORE, KO_EXPLORE, JA_EXPLORE]) for (const k of keys) assert.ok(pack[k]?.length > 1, `missing: ${k}`);
});

// The little things (after the house in Willowmere) and the wardrobe's hats and costumes.
test('the little things at home answer every time, reward only when rested, and stay reachable in a fully furnished house', () => {
  const s = fixture(), xp = s.xp;
  assert.equal(act(s, 'useAtHome', { id: 'globe' }, NOW).ok, false, 'the globe from across the room');
  walk(s, 'farmhouse_globe');
  const a = act(s, 'useAtHome', { id: 'globe' }, NOW), b = act(s, 'useAtHome', { id: 'globe' }, NOW);
  assert.ok(a.ok && b.ok && a.line !== b.line, 'the lines take turns'); assert.equal(s.xp, xp, 'a line gave XP');
  walk(s, 'farmhouse_bath');
  assert.ok(act(s, 'useAtHome', { id: 'bath', extra: true }, NOW).line.includes('Squeak'));
  const bath = act(s, 'useAtHome', { id: 'bath' }, NOW); assert.equal(bath.xp, HOME_THINGS.bath.xp); assert.ok(s.xp > xp);
  const saved = pack(s); assert.equal(act(s, 'useAtHome', { id: 'bath' }, NOW + MIN).ok, false); assert.equal(pack(s), saved, 'a refused bath changed the save');
  assert.ok(act(s, 'useAtHome', { id: 'bath', extra: true }, NOW + MIN).ok, 'the duck never waits');
  assert.ok(act(s, 'useAtHome', { id: 'bath' }, NOW + HOME_THINGS.bath.cooldownMs).ok);
  assert.equal(act(s, 'useAtHome', { id: 'books' }, NOW).ok, false); assert.equal(act(s, 'useAtHome', { id: 'nothing' }, NOW).ok, false);
  const full = roomAtLevel(room, 10), t = newGame(NOW, 5, { restore: true }); t.cond.house = { level: 0, ms: 0 }; startExplore(t, [51, 125], full); assert.ok(act(t, 'enterFarmhouse', {}, NOW).ok);
  for (const o of full.interactions) { assert.ok(routeExplore(t, xz(o.stand)), `no way to ${o.id} in a full house`); for (let i = 0; i < 600 && exploreSession(t).route.length; i++) moveExplore(t, 0, 0, .1); assert.ok(atObject(t, o.id), `could not reach ${o.id} in a full house`); }
});

test('paintings and knitted rows are counted and saved; every tenth row finishes a scarf for the neighbour you know least', () => {
  const s = fixture(); walk(s, 'farmhouse_easel');
  assert.equal(act(s, 'useAtHome', { id: 'easel' }, NOW).made, 1);
  assert.equal(exploreState(unpack(pack(s))).made.paintings, 1);
  s.explore.made = { paintings: 'x', rows: -4 }; assert.deepEqual(exploreState(s).made, { paintings: 0, rows: 0 });
  const home = Object.keys(s.homes)[0]; s.homes[home].family = 'tran'; s.homes[home].arrivesAt = NOW - 1;
  const people = residents(s, NOW).map(r => r.id); for (const id of people) s.people[id] = { hearts: 4, scenes: [3] }; s.people[people[0]].hearts = 2;
  walk(s, 'farmhouse_yarn'); let last = null;
  for (let i = 0; i < 10; i++) { last = act(s, 'useAtHome', { id: 'yarn' }, NOW + i * HOME_THINGS.yarn.cooldownMs); assert.ok(last.ok); assert.equal(!!last.finished, i === 9); }
  assert.equal(last.guest, people[0]); assert.equal(heartsOf(s, people[0]), 3); assert.equal(exploreState(s).made.rows, 10);
});

test('the wardrobe: a hat or a costume opens at its level, a costume brings its own hat and colours, and each has its picture', () => {
  const s = newGame(NOW, 9, { restore: true }); s.level = 3;
  assert.equal(hatOf(s), ''); assert.equal(act(s, 'setting', { key: 'playerHat', value: 'hat_straw' }, NOW).ok, true); assert.equal(hatOf(s), 'hat_straw');
  const saved = pack(s);
  assert.equal(act(s, 'setting', { key: 'playerHat', value: 'crown' }, NOW).ok, false, 'a locked hat'); assert.equal(act(s, 'setting', { key: 'playerHat', value: 'hat_nope' }, NOW).ok, false);
  assert.equal(act(s, 'setting', { key: 'playerLook', value: 'royal' }, NOW).ok, false, 'a locked costume'); assert.equal(pack(s), saved);
  assert.equal(act(s, 'setting', { key: 'playerLook', value: 'aodai' }, NOW).ok, true); assert.equal(hatOf(s), '', 'a costume with its own headwear takes your hat off'); assert.equal(wearOf(s), 'kit:dz_aodai'); assert.equal(costumeOf(s).top, COSTUMES.aodai.top);
  s.level = 4; assert.ok(act(s, 'setting', { key: 'playerLook', value: 'chef' }, NOW).ok); assert.equal(wearOf(s), 'kit:armor_chef+hat_chef'); s.level = 3; assert.ok(act(s, 'setting', { key: 'playerLook', value: 'aodai' }, NOW).ok);
  assert.equal(act(s, 'setting', { key: 'playerLook', value: '' }, NOW).ok, true); assert.equal(hatOf(s), 'hat_straw');
  assert.equal(act(s, 'setting', { key: 'playerHat', value: '' }, NOW).ok, true); assert.equal(hatOf(s), '');
  const w = wardrobe(s); assert.equal(w.hats.filter(h => h.open).length, Object.values(HATS).filter(h => h.level <= 3).length); assert.ok(w.hats[0].open && !w.hats.at(-1).open);
  for (const h of Object.values(HATS)) assert.ok(existsSync(new URL(`../public/assets/icons/wear/${h.id}.webp`, import.meta.url)), `no picture for ${h.id}`);
  const kits = new Set(JSON.parse(readFileSync(new URL('../public/assets/models/rigged/costumes.glb', import.meta.url)).subarray(20, 20 + readFileSync(new URL('../public/assets/models/rigged/costumes.glb', import.meta.url)).readUInt32LE(12)).toString()).nodes.map(n => n.name.split('__')[0]));
  for (const c of Object.values(COSTUMES)) { assert.ok(c.kit || HATS[c.hat], `${c.id} is nothing to wear`); if (c.hat) assert.ok(HATS[c.hat]); if (c.kit) { assert.ok(kits.has(c.kit), `${c.id}: no kit ${c.kit} in costumes.glb`); assert.ok(existsSync(new URL(`../public/assets/icons/wear/${c.kit}.webp`, import.meta.url))); } assert.ok(c.level >= 1); assert.match(c.top, /^#[0-9a-f]{6}$/); assert.match(c.bottom, /^#[0-9a-f]{6}$/); }
  const levels = Object.values(HATS).map(h => h.level); for (let l = 2; l <= 26; l++) assert.ok(levels.includes(l), `nothing new in the wardrobe at level ${l}`);
});

test('the words of the little things and of the wardrobe are in all three packs', () => {
  const keys = [...Object.values(HOME_THINGS).flatMap(t => [t.name, t.label, t.verb, t.intro, ...(t.lines ?? []), t.extra?.verb, ...(t.extra?.lines ?? [])]), ...Object.values(HATS).map(h => h.name), ...Object.values(COSTUMES).map(c => c.name), 'Hats', 'Costumes', 'None'].filter(k => k && k !== 'Farm notebook');   // (the notebook's name is in the farm's own pack)
  for (const pack of [VI_EXPLORE, KO_EXPLORE, JA_EXPLORE]) for (const k of keys) assert.ok(pack[k]?.length > 0, `missing: ${k}`);
});

test('choosing a shirt takes a costume off, in the wardrobe or in Settings', () => {
  const s = newGame(NOW, 11, { restore: true }); s.level = 5;
  assert.ok(act(s, 'setting', { key: 'playerLook', value: 'chef' }, NOW).ok); assert.equal(costumeOf(s).id, 'chef');
  assert.ok(act(s, 'setting', { key: 'playerColor', value: '#3a86ff' }, NOW).ok); assert.equal(costumeOf(s), null); assert.equal(s.settings.playerColor, '#3a86ff');
});

test('the family at home: every stop is a thing in the house they can walk to, with a pose their body has and a line in three languages', () => {
  const clips = { woman: ['Carry', 'Cheer', 'Hammer', 'Idle', 'Jump', 'Sit', 'Sweep', 'Talk', 'Walk', 'Wave'], kid: ['Carry', 'Cheer', 'Hammer', 'Idle', 'Jump', 'Sit', 'Sweep', 'Talk', 'Walk', 'Wave'], hana: ['Cheer', 'Idle', 'Knead', 'Talk', 'Walk', 'Wave'] };
  const s = fixture();
  for (const f of HOME_FAMILY) {
    assert.ok(clips[f.body], `${f.id}: no such body`); assert.ok(f.rounds.length >= 3);
    for (const [id, clip, line] of f.rounds) {
      assert.ok(room.interactions.some(o => o.id === id), `${f.id} goes to ${id}, which is not in the house`); walk(s, id);
      assert.ok(clips[f.body].includes(clip), `${f.id} cannot ${clip}`);
      for (const pack of [VI_EXPLORE, KO_EXPLORE, JA_EXPLORE]) assert.ok(pack[line]?.length > 0, `missing: ${line}`);
    }
  }
});

test('the mirror: you can be a man, a woman, a boy or a girl, and each has a model, a size and a name in three languages', async () => {
  const { BODIES, bodyOf } = await import('../src/content/wardrobe.mjs'), { RIGS } = await import('../src/view/skinned.mjs');
  const packs = await Promise.all(['vi', 'ko', 'ja'].map(l => import(`../src/i18n/${l}-fishing.mjs`).then(m => Object.values(m)[0])));
  const s = newGame(NOW, 4, { restore: true }); assert.equal(bodyOf(s).id, 'man');
  for (const b of Object.values(BODIES)) {
    assert.ok(act(s, 'setting', { key: 'playerBody', value: b.id }, NOW).ok, b.id); assert.equal(bodyOf(s), b);
    assert.ok(RIGS[b.rig]?.tint, `${b.id}: no such model`); assert.ok(b.size > 0.5 && b.size <= 1);
    assert.ok(b.name);
  }
  for (const name of ['Boy', 'Girl']) assert.ok(packs.every(p => p[name]?.length > 0), `missing: ${name}`);
  assert.equal(act(s, 'setting', { key: 'playerBody', value: 'giant' }, NOW).ok, false);
  s.settings.playerBody = 'nobody'; assert.equal(bodyOf(s).id, 'man', 'an unknown body in an old save');
});
