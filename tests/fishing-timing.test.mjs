import './tz.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/core/state.mjs';
import { act, tick } from '../src/core/act.mjs';
import { pick, reelPosition, REEL_TIMING } from '../src/core/fishing.mjs';
import { FISH } from '../src/content/economy.mjs';
import { FISH_TABLE } from '../src/content/goods.mjs';
import { pack, unpack } from '../src/kit/save.mjs';
import { T0, must } from './helpers.mjs';
const fresh = () => { const s = newGame(T0, 31415, { restore: true }); tick(s, T0); return s; };
const refuse = (s, action, payload, now) => { const before = pack(s), result = act(s, action, payload, now); assert.equal(result.ok, false); assert.equal(pack(s), before); assert.deepEqual(result.events, []); return result; };
const start = (s, bait = false) => { const { doneAt } = must(s, 'castLine', { bait }, T0); must(s, 'startReeling', {}, doneAt); return doneAt; };

test('built pond casts save their location and reject stale pond IDs before consuming bait', () => {
  const s = fresh(); s.barn.items.chicken_feed = 2;
  for (const pond of ['missing', 'constructor', 12, {}]) refuse(s, 'castLine', { pond, bait: true }, T0);
  const nonPond = Object.keys(s.placed)[0]; refuse(s, 'castLine', { pond: nonPond, bait: true }, T0);
  s.placed.fishingGarden = { kind: 'pond', x: 38, z: 64, rot: 0 };
  const result = must(s, 'castLine', { pond: 'fishingGarden', bait: true }, T0);
  assert.equal(s.fishing.line.pond, 'fishingGarden'); assert.equal(s.barn.items.chicken_feed, 1);
  const loaded = unpack(pack(s)); assert.equal(loaded.fishing.line.pond, 'fishingGarden');
  delete loaded.placed.fishingGarden;
  assert.ok(must(loaded, 'reelIn', { steady: true }, result.doneAt).fish, 'moving or storing the pond lost a previously cast fish');
});

test('starting reeling requires a ready line and never takes a second bait or changes its fish', () => {
  const s = fresh(); refuse(s, 'startReeling', {}, T0);
  s.barn.items.chicken_feed = 2;
  const cast = must(s, 'castLine', { bait: true }, T0), line = structuredClone(s.fishing.line);
  assert.equal(cast.doneAt, T0 + FISH.baitMs); assert.equal(s.barn.items.chicken_feed, 1);
  refuse(s, 'startReeling', {}, cast.doneAt - 1);
  const result = must(s, 'startReeling', {}, cast.doneAt);
  assert.equal(result.startedAt, cast.doneAt); assert.ok(result.events.some(e => e.type === 'reelingStarted'));
  assert.deepEqual(s.fishing.line, { ...line, reeling: { startedAt: cast.doneAt } });
  const duplicate = must(s, 'startReeling', {}, cast.doneAt + 100);
  assert.equal(duplicate.startedAt, cast.doneAt); assert.ok(!duplicate.events.some(e => e.type === 'reelingStarted'));
  assert.equal(s.barn.items.chicken_feed, 1);
});

test('a missed timing window costs nothing, preserves the fish, and can be retried immediately', () => {
  const s = fresh(), at = start(s), fish = pick(s.fishing.line.seed, false), seed = s.fishing.line.seed;
  assert.equal(reelPosition(s.fishing.line, at), 0);
  assert.match(refuse(s, 'reelIn', {}, at).reason, /green band/);
  assert.equal(s.fishing.line.seed, seed); assert.equal(s.fishing.caught, 0);
  const caught = must(s, 'reelIn', {}, at + REEL_TIMING.periodMs / 4);
  assert.equal(caught.fish, fish); assert.equal(s.fishing.line, null); assert.equal(s.fishing.caught, 1);
  assert.equal(caught.events.filter(e => e.type === 'fishCaught').length, 1); refuse(s, 'reelIn', {}, at + REEL_TIMING.periodMs / 4);
});

test('the action clock checks both inclusive band edges in both directions, across repeated cycles', () => {
  for (const fraction of [.125, .375, .625, .875]) for (const cycles of [0, 5]) {
    const s = fresh(), at = start(s), now = at + REEL_TIMING.periodMs * (cycles + fraction);
    assert.ok([REEL_TIMING.from, REEL_TIMING.to].includes(reelPosition(s.fishing.line, now)));
    assert.ok(must(s, 'reelIn', {}, now).fish);
  }
  for (const fraction of [0, .1, .4, .5, .6, .9]) {
    const s = fresh(), at = start(s); refuse(s, 'reelIn', {}, at + REEL_TIMING.periodMs * fraction);
  }
});

test('steady reeling gives the identical seeded catch and rewards, including bait rarity and a full barn', () => {
  for (const bait of [false, true]) for (const full of [false, true]) {
    const timed = fresh(); timed.barn.items.chicken_feed = 2;
    const at = start(timed, bait);
    if (full) timed.barn.items.wheat = timed.barn.cap;
    const steady = unpack(pack(timed)), wanted = pick(timed.fishing.line.seed, bait);
    const a = must(timed, 'reelIn', {}, at + REEL_TIMING.periodMs / 4), b = must(steady, 'reelIn', { steady: true }, at);
    assert.equal(a.fish, wanted); assert.equal(b.fish, wanted);
    assert.deepEqual(a.events.filter(e => ['fishCaught', 'barnSold', 'discovery'].includes(e.type)), b.events.filter(e => ['fishCaught', 'barnSold', 'discovery'].includes(e.type)));
    assert.deepEqual(timed.barn, steady.barn); assert.deepEqual(timed.album, steady.album); assert.equal(timed.coins, steady.coins);
  }
});

test('steady mode cannot bypass waiting and malformed truthy options do not bypass an active timing window', () => {
  const s = fresh(), cast = must(s, 'castLine', {}, T0);
  refuse(s, 'reelIn', { steady: true }, cast.doneAt - 1); must(s, 'startReeling', {}, cast.doneAt);
  for (const steady of ['true', 1, {}]) refuse(s, 'reelIn', { steady }, cast.doneAt);
  assert.ok(must(s, 'reelIn', { steady: true }, cast.doneAt).fish);
});

test('legacy ready lines still reel directly and saved timing sessions remain playable after returning', () => {
  const legacy = fresh(); legacy.fishing.line = { seed: 'old-save', bait: false, doneAt: T0 };
  assert.equal(must(unpack(pack(legacy)), 'reelIn', {}, T0).fish, pick('old-save', false));
  const s = fresh(), at = start(s), expected = pick(s.fishing.line.seed, false), loaded = unpack(pack(s));
  assert.deepEqual(loaded.fishing.line, s.fishing.line);
  const muchLater = at + 30 * 86400000;
  tick(loaded, muchLater); assert.equal(loaded.fishing.line.seed, s.fishing.line.seed, 'an absent player lost the waiting fish');
  assert.equal(must(loaded, 'reelIn', { steady: true }, muchLater).fish, expected);
});

test('a backwards clock restarts the marker without discarding the fish or changing its wait', () => {
  const s = fresh(), cast = must(s, 'castLine', {}, T0);
  const at = cast.doneAt + 10000; must(s, 'startReeling', {}, at);
  const saved = structuredClone(s.fishing.line), expected = pick(saved.seed, saved.bait);
  assert.equal(reelPosition(s.fishing.line, cast.doneAt), 0);
  refuse(s, 'reelIn', {}, cast.doneAt);
  tick(s, cast.doneAt);
  assert.deepEqual(s.fishing.line, { ...saved, reeling: { startedAt: cast.doneAt } });
  assert.equal(must(s, 'reelIn', {}, cast.doneAt + 900).fish, expected);
});

test('all fish species keep the same catch accounting through a timing session', () => {
  for (const def of FISH_TABLE) {
    const s = fresh(); let seed = 0; while (pick(seed, false) !== def.id) seed++;
    s.fishing.line = { seed, bait: false, doneAt: T0 }; must(s, 'startReeling', {}, T0);
    const result = must(s, 'reelIn', {}, T0 + 900), event = result.events.find(e => e.type === 'fishCaught');
    assert.equal(result.fish, def.id); assert.equal(event.stored, 1); assert.equal(event.first, true); assert.equal(event.rare, !!def.rare);
    assert.equal(s.stats.fished, 1); assert.equal(s.album.fish[def.id], 1);
  }
});
