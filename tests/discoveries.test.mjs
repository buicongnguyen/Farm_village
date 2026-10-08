import './tz.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { act, tick } from '../src/core/act.mjs';
import { newGame, migrate, SAVE_VERSION, CELL_TYPES } from '../src/core/state.mjs';
import { discoveryRecords, unreadDiscoveries, normalizeDiscoveries } from '../src/core/discoveries.mjs';
import { DISCOVERIES } from '../src/content/discoveries.mjs';
import { NEIGHBOURS } from '../src/content/people.mjs';
import { N } from '../src/content/world.mjs';
import { REPAIR, START_RESTORE } from '../src/content/economy.mjs';
import { pack, unpack } from '../src/kit/save.mjs';
import { must, T0 } from './helpers.mjs';

const events = (r, type = 'discovery') => r.events.filter(e => e.type === type);
const fresh = seed => {
  const s = newGame(T0, seed ?? 4242, { restore: true });
  // This suite controls actual completion times; incidental neighbour repair is covered separately below.
  s.neighbours = Object.fromEntries(NEIGHBOURS.map(n => [n.id, { day: '9999-12-31', visits: [], visited: 0, total: 0, friendship: 0, trade: null }]));
  return s;
};
const catchFish = (s, now = T0) => {
  const cast = must(s, 'castLine', {}, now);
  return must(s, 'reelIn', {}, cast.doneAt);
};
const rock = (s, x, z) => { s.cells[z * N + x] = CELL_TYPES.rock; return [x, z]; };
const refused = (s, action, payload = {}, now = T0) => {
  const before = structuredClone(s), r = act(s, action, payload, now);
  assert.equal(r.ok, false); assert.deepEqual(r.events, []); assert.deepEqual(s, before);
};

test('second and tenth successful catches grant their deterministic finds once, independently of species and reload', () => {
  for (const seed of [1, 4242]) {
    let s = fresh(seed); const start = s.coins, awards = [];
    for (let n = 1; n <= 12; n++) {
      const r = catchFish(s, T0 + n * 60_000), finds = events(r);
      assert.deepEqual(finds.map(e => e.id), n === 2 ? ['pond-tin'] : n === 10 ? ['pond-keepsake'] : []);
      awards.push(...finds);
      for (const e of finds) assert.deepEqual(events(r, 'coins').find(c => c.source === 'discovery'), { type: 'coins', coins: e.coins, source: 'discovery', id: e.id });
      if (n === 2) s = unpack(pack(s));
    }
    assert.equal(s.coins - start, 60); assert.equal(s.stats.coinsEarned, 60);
    assert.equal(s.discoveries.catches, 10); assert.equal(awards.reduce((n, e) => n + e.coins, 0), 60);
    assert.equal(discoveryRecords(s).length, 2); assert.equal(unreadDiscoveries(s), 2);
    assert.deepEqual(s.news.filter(e => e.type === 'discovery').map(e => e.id), ['pond-keepsake', 'pond-tin']);
    assert.ok(s.firsts['discovery:pond-tin']); assert.ok(s.firsts['discovery:pond-keepsake']);
  }
});

test('casting, unsuccessful reeling, unknown finds and unearned reads neither pay nor initialize absent discovery state', () => {
  const s = fresh(); delete s.discoveries;
  refused(s, 'reelIn'); refused(s, 'readDiscovery', { id: 'pond-tin' }); refused(s, 'readDiscovery', { id: 'made-up' });
  const before = s.coins, cast = must(s, 'castLine');
  assert.equal(Object.hasOwn(s, 'discoveries'), false); assert.equal(events(cast).length, 0);
  refused(s, 'reelIn', {}, cast.doneAt - 1); refused(s, 'castLine');
  const r = must(s, 'reelIn', {}, cast.doneAt);
  assert.equal(s.discoveries.catches, 1); assert.equal(s.coins, before); assert.equal(events(r).length, 0);
});

test('only distinct successfully cleared rocks on owned parcels count, including mixed and duplicate batch cells', () => {
  const s = fresh(), coins = s.coins;
  const a = rock(s, 40, 68), b = rock(s, 41, 68), outside = rock(s, 48, 68), village = rock(s, 50, 96);
  s.cells[68 * N + 42] = CELL_TYPES.weeds;
  const r = must(s, 'clear', { cells: [outside, village, [42, 68], a, a, b, b] });
  assert.equal(r.cleared, 4); assert.equal(s.discoveries.rocks, 2);
  assert.deepEqual(events(r), [{ type: 'discovery', id: 'stone-keepsake', coins: 30, person: 'june' }]);
  assert.equal(s.coins, coins - r.spent + 30); assert.equal(s.cells[68 * N + 48], CELL_TYPES.rock);
  refused(s, 'clear', { cells: [a, b, outside] });
  const next = rock(s, 43, 68); assert.equal(events(must(s, 'clear', { cells: [next] })).length, 0);
  assert.equal(s.discoveries.rocks, 2);
});

test('insufficient clearing funds cannot borrow the future find or count refused rocks', () => {
  const s = fresh(), a = rock(s, 40, 68), b = rock(s, 41, 68); s.coins = 10;
  const r = must(s, 'clear', { cells: [a, b] });
  assert.equal(r.cleared, 1); assert.equal(s.discoveries.rocks, 1); assert.equal(s.coins, 0); assert.equal(events(r).length, 0);
  refused(s, 'clear', { cells: [b] });
  s.coins = 10; assert.equal(events(must(s, 'clear', { cells: [b] }))[0]?.coins, 30);
});

test('Village Street pays on its first completed broken-road restoration, not repair start or School Lane', () => {
  const s = fresh(), start = s.coins;
  let r = must(s, 'repair', { id: 'road_south' });
  assert.equal(events(r).length, 0); assert.equal(s.coins, start - REPAIR.road);
  refused(s, 'repair', { id: 'road_south' });
  r = tick(s, T0 + REPAIR.broken.ms - 1); assert.equal(events(r).length, 0);
  r = tick(s, T0 + REPAIR.broken.ms);
  assert.deepEqual(events(r), [{ type: 'discovery', id: 'street-thanks', coins: 20, person: 'gus' }]);
  assert.equal(s.coins, start - REPAIR.road + 20);
  assert.equal(events(tick(s, T0 + REPAIR.broken.ms + 1)).length, 0);
  s.cond.road_civic = { level: 3, ms: 0 }; must(s, 'repair', { id: 'road_civic' }, T0 + 100_000);
  assert.equal(events(tick(s, T0 + 100_000 + REPAIR.broken.ms)).length, 0);
  s.cond.road_south = { level: 1, ms: 0 };
  assert.equal(events(must(s, 'repair', { id: 'road_south' }, T0 + 200_000)).length, 0);
});

test('neighbour completion of an underway street repair is a real completion and cannot pay twice', () => {
  const s = fresh(); must(s, 'repair', { id: 'road_south' });
  // Find an existing scheduled helper outcome, without changing discovery randomness (there is none).
  let awarded = [];
  for (let n = 1; n <= 20 && s.repairing.road_south; n++) {
    s.neighbours.mai = { day: '9999-12-31', visits: [T0 + n], visited: 0, total: n - 1, friendship: 0, trade: null };
    awarded.push(...events(tick(s, T0 + n)));
  }
  assert.equal(s.repairing.road_south, undefined);
  assert.deepEqual(awarded.map(e => e.id), ['street-thanks']);
  assert.equal(events(tick(s, T0 + REPAIR.broken.ms)).length, 0);
});

test('four finds add at most 110 coins per save; the restored start stays 500 and later days never repeat them', () => {
  const s = fresh(); assert.equal(s.coins, 500); assert.equal(START_RESTORE.coins, 500);
  const finds = [];
  for (let n = 0; n < 15; n++) finds.push(...events(catchFish(s, T0 + n * 60_000)));
  const cells = [rock(s, 40, 68), rock(s, 41, 68)]; finds.push(...events(must(s, 'clear', { cells }, T0 + 1_000_000)));
  must(s, 'repair', { id: 'road_south' }, T0 + 1_000_000);
  finds.push(...events(tick(s, T0 + 1_000_000 + REPAIR.broken.ms)));
  assert.equal(finds.reduce((n, e) => n + e.coins, 0), 110);
  assert.deepEqual(new Set(finds.map(e => e.id)), new Set(DISCOVERIES.map(d => d.id)));
  assert.equal(s.coins, 500 - 20 - REPAIR.road + 110);
  assert.equal(s.stats.coinsEarned, 110);
  for (const days of [1, 10, 365]) assert.equal(events(tick(s, T0 + days * 86_400_000)).length, 0);
  assert.equal(discoveryRecords(s).length, 4); assert.equal(s.discoveries.catches, 10); assert.equal(s.discoveries.rocks, 2);
});

test('reading a saved find acknowledges it without paying or advancing Ellis letters; repeat reads are harmless', () => {
  let s = fresh(); catchFish(s); catchFish(s, T0 + 60_000);
  s = unpack(pack(s)); const money = s.coins, earned = s.stats.coinsEarned, mail = structuredClone(s.mail), story = structuredClone(s.story);
  assert.equal(unreadDiscoveries(s), 1);
  for (let i = 0; i < 2; i++) {
    const r = must(s, 'readDiscovery', { id: 'pond-tin' }, T0 + 200_000);
    assert.equal(r.read, true); assert.equal(events(r).length, 0); assert.equal(events(r, 'coins').length, 0);
  }
  assert.equal(s.coins, money); assert.equal(s.stats.coinsEarned, earned); assert.equal(unreadDiscoveries(s), 0);
  assert.deepEqual(s.mail, mail); assert.deepEqual(s.story, story);
  s = unpack(pack(s)); assert.equal(discoveryRecords(s)[0].read, true); assert.equal(s.discoveries.read.length, 1);
});

test('legacy migration retires passed fishing and street milestones without coins, claims or retroactive notifications', () => {
  const s = fresh(); s.version = 5; delete s.discoveries; delete s.cond.road_south;
  s.fishing.caught = 12; s.stats.fished = 12; s.stats.cleared = 900;
  const money = s.coins, loaded = unpack(pack(s));
  assert.equal(loaded.version, SAVE_VERSION); assert.equal(loaded.coins, money);
  assert.equal(loaded.discoveries.catches, 10); assert.equal(loaded.discoveries.rocks, 0);
  assert.deepEqual(new Set(loaded.discoveries.retired), new Set(['pond-tin', 'pond-keepsake', 'street-thanks']));
  assert.deepEqual(discoveryRecords(loaded), []); assert.equal(unreadDiscoveries(loaded), 0);
  assert.equal(events(tick(loaded, T0)).length, 0); assert.equal(events(catchFish(loaded)).length, 0);
  assert.equal(loaded.coins, money);
  // Rock-only history was never recorded: earn that find through two actual new clears, never the mixed old statistic.
  const cells = [rock(loaded, 40, 68), rock(loaded, 41, 68)];
  assert.deepEqual(events(must(loaded, 'clear', { cells })).map(e => e.id), ['stone-keepsake']);
});

test('legacy unfinished milestones remain earnable, while old completion evidence and earned records survive imports', () => {
  let s = fresh(); s.version = 4; s.story.chapter = 5; s.fishing.caught = 1; delete s.discoveries;
  s = unpack(pack(s)); assert.equal(s.story.chapter, 4); assert.equal(s.version, SAVE_VERSION);
  assert.equal(events(catchFish(s))[0]?.id, 'pond-tin');
  must(s, 'repair', { id: 'road_south' });
  s = unpack(pack(s)); assert.equal(events(tick(s, T0 + REPAIR.broken.ms))[0]?.id, 'street-thanks');
  must(s, 'readDiscovery', { id: 'pond-tin' }, T0 + REPAIR.broken.ms);
  const expected = structuredClone(s.discoveries);
  for (let i = 0; i < 3; i++) s = unpack(pack(s));
  assert.deepEqual(s.discoveries, expected);
  delete s.discoveries; s = unpack(pack(s));
  assert.deepEqual(discoveryRecords(s).map(d => d.id), ['pond-tin', 'street-thanks'], 'earned album stamps recover actual claims');
  assert.equal(events(catchFish(s, T0 + 200_000)).length, 0);
  const old = fresh(); delete old.discoveries;
  old.news = [{ type: 'repaired', id: 'road_south', broken: true, at: T0 - 1 }];
  assert.ok(normalizeDiscoveries(old).retired.includes('street-thanks'), 'known historical completion stays retired even with inconsistent damage');
  assert.throws(() => migrate({ version: SAVE_VERSION + 1 }));
});

test('discovery readers are pure and imported counters are capped without dropping earned claim markers', () => {
  const s = fresh(); delete s.discoveries; const before = structuredClone(s);
  discoveryRecords(s); unreadDiscoveries(s); normalizeDiscoveries(s); assert.deepEqual(s, before);
  s.discoveries = { catches: 900, rocks: 700, claimed: { 'pond-tin': T0 }, read: ['pond-tin', 'pond-tin'], retired: ['pond-keepsake'] };
  const loaded = unpack(pack(s));
  assert.deepEqual(loaded.discoveries, { catches: 10, rocks: 2, claimed: { 'pond-tin': T0 }, read: ['pond-tin'], retired: ['pond-keepsake'] });
  assert.equal(events(catchFish(loaded)).length, 0);
});
