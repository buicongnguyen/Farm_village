import './tz.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { newGame } from '../src/core/state.mjs';
import { act, tick } from '../src/core/act.mjs';
import { pack, unpack } from '../src/kit/save.mjs';
import { installExplore, startExplore, endExplore, exploreState, exploreSession, routeExplore, moveExplore, atObject } from '../src/core/explore.mjs';
import { roomClear, roomRoute, segmentClear, xz } from '../src/core/explore-navigation.mjs';
import { HOME_MEMORY, HOME_OBJECTS } from '../src/content/explore.mjs';
import { VI_EXPLORE } from '../src/i18n/vi-explore.mjs';
import { KO_EXPLORE } from '../src/i18n/ko-explore.mjs';
import { JA_EXPLORE } from '../src/i18n/ja-explore.mjs';
const room = JSON.parse(readFileSync(new URL('../public/assets/models/interior-farmhouse.json', import.meta.url)));
const NOW = 1_800_000_000_000;
installExplore();
function fixture() { const s = newGame(NOW, 123, { restore: true }); s.cond.house = { level: 0, ms: 0 }; startExplore(s, [51,125], room); return s; }
function walk(s, id) {
  const to = xz(room.interactions.find(o => o.id === id).stand);
  assert.ok(routeExplore(s, to));
  for (let i = 0; i < 600 && exploreSession(s).route.length; i++) moveExplore(s, 0, 0, .1);
  assert.ok(atObject(s, id), `could not walk to ${id}: ${exploreSession(s).p}`);
}
function refuses(s, action, payload) {
  const saved = pack(s), pose = JSON.stringify(exploreSession(s));
  assert.equal(act(s, action, payload, NOW).ok, false, action);
  assert.equal(pack(s), saved); assert.equal(JSON.stringify(exploreSession(s)), pose);
}
test('every AR-015 interaction is connected, with swept collision around furniture and hidden walls', () => {
  const from = xz(room.entry.position);
  for (const object of room.interactions) {
    const path = roomRoute(room, from, xz(object.stand)); assert.ok(path.length, object.id);
    let previous = from;
    for (const p of path) { assert.ok(segmentClear(previous, p, q => roomClear(room, q))); previous = p; }
  }
  assert.equal(roomClear(room, [0, -.3]), false, 'table');
  assert.equal(roomClear(room, [3.9, 0]), false, 'hidden wall');
  assert.deepEqual(roomRoute(room, from, [0, -.3]), []);
  const s = fixture(); assert.ok(act(s, 'enterFarmhouse', {}, NOW).ok);
  for (let i = 0; i < 200; i++) moveExplore(s, 0, -1, 99);
  assert.ok(roomClear(room, exploreSession(s).p));
  assert.ok(exploreSession(s).p[1] >= .949, 'tunnelled through table');
});
test('entry rechecks condition and actual arrival, refusals are atomic and broken homes still allow exit', () => {
  const s = fixture(); exploreSession(s).p = [53,125]; refuses(s, 'enterFarmhouse');
  exploreSession(s).p = [51,125]; s.cond.house.level = 3; refuses(s, 'enterFarmhouse');
  s.cond.house.level = 2; s.repairing.house = { doneAt: NOW + 1000 }; refuses(s, 'enterFarmhouse');
  delete s.repairing.house; assert.ok(act(s, 'enterFarmhouse', {}, NOW).ok);
  walk(s, 'farmhouse_sofa'); refuses(s, 'leaveFarmhouse');
  s.cond.house.level = 3; walk(s, 'farmhouse_exit'); assert.ok(act(s, 'leaveFarmhouse', {}, NOW).ok);
  assert.equal(exploreSession(s).location, 'outdoors');
});
test('sofa and shelf need arrival; resting reuses the project timer and home memory never pays coins or XP', () => {
  const s = fixture(); act(s, 'enterFarmhouse', {}, NOW);
  refuses(s, 'sitAtHome'); refuses(s, 'readHomeMemory'); refuses(s, 'restOnSofa');
  walk(s, 'farmhouse_sofa'); assert.ok(act(s, 'sitAtHome', {}, NOW).ok);
  refuses(s, 'restOnSofa'); s.learning.introducedAt = NOW; s.learning.energy = 30; s.learning.energyAt = NOW;
  assert.ok(act(s, 'restOnSofa', {}, NOW).ok); refuses(s, 'restOnSofa');
  walk(s, 'farmhouse_memory_shelf'); const before = { coins: s.coins, xp: s.xp, discoveries: structuredClone(s.discoveries) };
  assert.equal(act(s, 'readHomeMemory', {}, NOW).first, true);
  assert.equal(act(s, 'readHomeMemory', {}, NOW + 1).first, false);
  assert.deepEqual({ coins: s.coins, xp: s.xp, discoveries: s.discoveries }, before);
  assert.equal(exploreState(s).memories[HOME_MEMORY.id].discoveredAt, NOW);
  act(s, 'leaveFarmhouse', { recover: true }, NOW); endExplore(s);
  const loaded = unpack(pack(s)); tick(loaded, NOW + 30_000);
  assert.equal(loaded.learning.energy, 90); assert.equal(loaded.learning.restAt, null);
  assert.equal(exploreSession(loaded), undefined); assert.deepEqual(exploreState(loaded).memories, exploreState(s).memories);
});
test('old saves and malformed optional records normalize without rewards; independent profiles never share a session', () => {
  const s = fixture(), other = newGame(NOW, 222, { restore: true });
  assert.equal(exploreSession(other), undefined); assert.deepEqual(exploreState(other).memories, {});
  s.explore = { controls: 'bad', introduced: 'yes', memories: { [HOME_MEMORY.id]: { discoveredAt: -5, readAt: Infinity } }, location: 'farmhouse_main' };
  assert.deepEqual(exploreState(s), { version: 1, controls: 'tap', introduced: false, memories: {} });
  act(s, 'introduceExplore', {}, NOW); assert.equal(s.explore.location, undefined);
  act(s, 'exploreControls', { controls: 'joystick' }, NOW);
  assert.equal(exploreState(unpack(pack(s))).controls, 'joystick');
  refuses(s, 'exploreControls', { controls: 'bad' });
});
test('outdoor direct movement cannot cross fences or leave the map and can route to the public porch', () => {
  const s = fixture(); s.fences['26,62,w'] = 'fence';
  for (let i = 0; i < 40; i++) moveExplore(s, 1, 0, .1);
  assert.ok(exploreSession(s).p[0] < 52);
  delete s.fences['26,62,w']; assert.ok(routeExplore(s, [55,125]));
  for (let i = 0; i < 200; i++) moveExplore(s, 0, 0, .1);
  assert.ok(routeExplore(s, [51,125]));
  for (let i = 0; i < 200; i++) moveExplore(s, 0, 0, .1);
  assert.ok(act(s, 'enterFarmhouse', {}, NOW).ok);
});
test('Explore copy has all four editions and keeps the child and partner Vietnamese voices', () => {
  const keys = Object.keys(VI_EXPLORE);
  for (const catalog of [KO_EXPLORE, JA_EXPLORE]) assert.deepEqual(Object.keys(catalog), keys);
  for (const key of [HOME_MEMORY.title, HOME_MEMORY.text, HOME_MEMORY.reply, ...Object.values(HOME_OBJECTS).map(o => o.label)]) assert.ok(VI_EXPLORE[key]);
  assert.match(VI_EXPLORE[HOME_MEMORY.text], /\bCon\b/);
  assert.doesNotMatch(VI_EXPLORE[HOME_MEMORY.reply], /tôi|tao|bạn/iu);
});
