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
import { HOME_OBJECTS, HOME_ACTIVITIES } from '../src/content/explore.mjs';
import { residents, heartsOf } from '../src/core/bonds.mjs';
import { VI_EXPLORE } from '../src/i18n/vi-explore.mjs';
import { KO_EXPLORE } from '../src/i18n/ko-explore.mjs';
import { JA_EXPLORE } from '../src/i18n/ja-explore.mjs';

const room = JSON.parse(readFileSync(new URL('../public/assets/models/interior-farmhouse.json', import.meta.url)));
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
