import './tz.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { act } from '../src/core/act.mjs';
import { newGame, migrate, SAVE_VERSION, CELL_TYPES } from '../src/core/state.mjs';
import { buyableParcels } from '../src/core/build.mjs';
import { canPlace } from '../src/core/grid.mjs';
import { LAND_BRANCH } from '../src/content/land.mjs';
import { PARCELS, START_RESTORE } from '../src/content/economy.mjs';
import { N, PARCEL, START_PARCEL, parcelOrigin } from '../src/content/world.mjs';
import { newLandDiscovery, normalizeLandDiscovery, landBranchStatus, landDiscoverySite, unreadLandDiscovery } from '../src/core/land-discovery.mjs';
import { pack, unpack } from '../src/kit/save.mjs';
import { VI_LAND } from '../src/i18n/vi-land.mjs';

const T0 = 1_700_000_000_000;
const fresh = () => newGame(T0, 4242, { restore: true });
const ready = () => { const s = fresh(); s.level = 4; s.coins = 500; return s; };
const run = (s, action, payload = {}, now = T0) => act(s, action, payload, now);
const inspect = (s, parcel = landBranchStatus(s).parcel) => { const r = run(s, 'inspectLandDiscovery', { parcel }); assert.equal(r.ok, true); return r; };
function refused(s, action, payload = {}, useAct = false, now = T0) {
  const before = structuredClone(s), r = useAct ? act(s, action, payload, now) : run(s, action, payload, now);
  assert.equal(r.ok, false); assert.deepEqual(r.events, []); assert.deepEqual(s, before);
}
function buy(s, parcel = '1,2') { const r = act(s, 'buyParcel', { parcel }, T0); assert.equal(r.ok, true); return r; }

test('the branch previews the existing second-parcel price, level and cap without spending or creating unread work', () => {
  const s = fresh(), before = structuredClone(s), status = landBranchStatus(s);
  assert.equal(s.coins, START_RESTORE.coins); assert.equal(status.parcel, '1,2');
  assert.equal(status.price, 500); assert.equal(status.level, 4); assert.equal(status.size, 16);
  assert.equal(status.stage, 'unowned'); assert.equal(status.canBuy, false); assert.equal(status.canInspect, false);
  assert.equal(status.reason, 'Reach level {level} first'); assert.equal(unreadLandDiscovery(s), 0);
  assert.deepEqual(s, before); assert.equal(PARCELS.maxV01, 16);
  s.level = 4; assert.equal(landBranchStatus(s).canBuy, true);
  s.coins = 499; assert.equal(landBranchStatus(s).reason, 'Not enough coins');
  assert.equal(landBranchStatus(s, '3,0').reason, 'Buy land next to your farm');
});

test('a paid second parcel immediately includes a clear buildable patch and leaves the optional find unread count at zero', () => {
  const s = ready(), beforeCells = [...s.cells], xp = s.xp, cleared = s.stats.cleared, result = buy(s);
  assert.equal(result.price, 500); assert.equal(s.coins, 0); assert.equal(s.xp, xp); assert.equal(s.stats.cleared, cleared);
  assert.equal(landBranchStatus(s).stage, 'covered'); assert.equal(s.landDiscovery.boughtAt, T0); assert.equal(unreadLandDiscovery(s), 0);
  const o = parcelOrigin('1,2'), p = LAND_BRANCH.patch;
  for (let z = o.z + p.z; z < o.z + p.z + p.depth; z++) for (let x = o.x + p.x; x < o.x + p.x + p.width; x++) {
    assert.equal(s.cells[z * N + x], CELL_TYPES.grass); assert.equal(canPlace(s, 'bed', x, z).ok, true);
  }
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) if (x < o.x || x >= o.x + PARCEL || z < o.z || z >= o.z + PARCEL)
    assert.equal(s.cells[z * N + x], beforeCells[z * N + x]);
  assert.ok(buyableParcels(s).some(p => p.parcel === '2,2' && !p.ok), 'the next parcel is not offered'); refused(s, 'buyParcel', { parcel: '2,2' }, true);
});

test('all previously offered second-parcel choices remain valid and receive the same bounded branch', () => {
  for (const parcel of ['0,1', '0,3', '1,2']) {
    const s = ready(); buy(s, parcel); const status = landBranchStatus(s, '1,2');
    assert.equal(status.parcel, parcel); assert.equal(status.owned, true); assert.equal(status.canInspect, true);
    assert.equal(s.parcels.length, 2); assert.equal(s.coins, 0); assert.equal(s.landDiscovery.parcel, parcel);
    assert.equal(inspect(s, parcel).decor, 'bench'); assert.equal(s.stored.bench, 1);
  }
});

test('refused purchases never create progress, terrain changes or discovery rewards', () => {
  const s = fresh(); delete s.landDiscovery;
  refused(s, 'buyParcel', { parcel: '1,2' }, true);
  s.level = 4; s.coins = 499; refused(s, 'buyParcel', { parcel: '1,2' }, true);
  s.coins = 500;
  for (const parcel of ['3,0', START_PARCEL, '4,2', '01,2', '__proto__', null]) refused(s, 'buyParcel', { parcel }, true);
  assert.equal(Object.hasOwn(s, 'landDiscovery'), false);
});

test('one free inspection reveals the memory and bench without money, XP, cell or story mutations', () => {
  const s = ready(); buy(s); const before = structuredClone(s), r = inspect(s);
  assert.deepEqual(r.events, [{ type: 'landDiscovered', id: 'sunlit-clearing', parcel: '1,2', decor: 'bench' }]);
  assert.equal(s.stored.bench, 1); assert.equal(s.landDiscovery.discoveredAt, T0);
  assert.equal(landBranchStatus(s).stage, 'found'); assert.equal(unreadLandDiscovery(s), 1);
  assert.equal(s.firsts['land:planting-marker'], T0); assert.equal(s.news[0].type, 'landDiscovered');
  delete before.landDiscovery; delete before.stored; delete before.firsts; delete before.news;
  const after = structuredClone(s); delete after.landDiscovery; delete after.stored; delete after.firsts; delete after.news; assert.deepEqual(after, before);
  refused(s, 'inspectLandDiscovery', { parcel: '1,2' });
  run(s, 'readLandDiscovery'); assert.equal(unreadLandDiscovery(s), 0);
  const read = structuredClone(s); assert.deepEqual(run(s, 'readLandDiscovery').events, []); assert.deepEqual(s, read);
});

test('inspection refuses unknown, unowned and wrong-parcel actions without initializing a legacy save', () => {
  const s = ready(); delete s.landDiscovery;
  for (const parcel of [undefined, null, '1,2', START_PARCEL, 'constructor']) refused(s, 'inspectLandDiscovery', { parcel });
  refused(s, 'readLandDiscovery'); buy(s, '0,1'); refused(s, 'inspectLandDiscovery', { parcel: '1,2' });
  s.mode = null; refused(s, 'inspectLandDiscovery', { parcel: '0,1' });
});

test('old owned land keeps every building, crop and cell; a new optional memory waits for an explicit inspection', () => {
  const s = ready(); s.parcels.push('0,1'); delete s.landDiscovery;
  const o = parcelOrigin('0,1'); s.cells[(o.z + 1) * N + o.x + 1] = CELL_TYPES.tilled;
  s.placed.oldBed = { kind: 'bed', x: o.x + 1, z: o.z + 1, rot: 0 }; s.beds.oldBed = { crop: 'wheat', doneAt: T0 + 9000 };
  const before = structuredClone(s), d = normalizeLandDiscovery(s);
  assert.equal(d.parcel, '0,1'); assert.equal(d.boughtAt, null); assert.equal(d.discoveredAt, null);
  assert.equal(landBranchStatus(s).canInspect, true); assert.equal(unreadLandDiscovery(s), 0); assert.deepEqual(s, before);
  inspect(s, '0,1'); assert.deepEqual(s.cells, before.cells); assert.deepEqual(s.placed, before.placed); assert.deepEqual(s.beds, before.beds);
});

test('the local cover uses clear empty ground, relocates around placed footprints and never covers paths or fences', () => {
  const s = ready(); buy(s); const first = landDiscoverySite(s), before = structuredClone(s);
  assert.deepEqual(first, { parcel: '1,2', x: 49, z: 57 }); assert.deepEqual(s, before);
  s.placed.barnThere = { kind: 'cow_barn', x: first.x, z: first.z, rot: 0 };
  const next = landDiscoverySite(s); assert.ok(next); assert.ok(next.x >= first.x + 3 || next.z >= first.z + 2);
  s.cells[next.z * N + next.x] = CELL_TYPES.path; const third = landDiscoverySite(s); assert.notDeepEqual(third, next);
  s.fences[`${third.x},${third.z},n`] = 'fence'; assert.notDeepEqual(landDiscoverySite(s), third);
});

test('a densely built legacy parcel still has the free panel inspection without clearing or moving anything', () => {
  const s = ready(); s.parcels.push('1,2'); const o = parcelOrigin('1,2');
  for (let z = o.z; z < o.z + PARCEL; z++) for (let x = o.x; x < o.x + PARCEL; x++) s.cells[z * N + x] = CELL_TYPES.path;
  assert.equal(landDiscoverySite(s), null); const before = [...s.cells]; inspect(s);
  assert.deepEqual(s.cells, before); assert.equal(s.stored.bench, 1);
});

test('completion and firsts backups survive reload and spending the bench without duplicate rewards', () => {
  let s = ready(); buy(s); inspect(s); s.stored.bench = 0;
  s = unpack(pack(s)); refused(s, 'inspectLandDiscovery', { parcel: '1,2' });
  delete s.landDiscovery; s.firsts['land:planting-marker'] = 0;
  assert.equal(landBranchStatus(s).found, true); refused(s, 'inspectLandDiscovery', { parcel: '1,2' });
  run(s, 'readLandDiscovery'); assert.equal(s.stored.bench, 0); assert.equal(unreadLandDiscovery(s), 0);
});

test('normalization and invalid inspection inputs never award or destroy saved stock', () => {
  const s = ready(); buy(s);
  for (const value of [null, [], 12, { parcel: '__proto__', discoveredAt: -1, read: true }, { discoveredAt: Infinity }]) {
    s.landDiscovery = value; const before = structuredClone(s), d = normalizeLandDiscovery(s);
    assert.equal(d.parcel, '1,2'); assert.equal(d.discoveredAt, null); assert.equal(d.read, false); assert.deepEqual(s, before);
  }
  for (const bench of [-1, NaN, Infinity, '1', Number.MAX_SAFE_INTEGER]) { s.stored.bench = bench; refused(s, 'inspectLandDiscovery', { parcel: '1,2' }); }
  s.stored.bench = 0; refused(s, 'inspectLandDiscovery', { parcel: '1,2' }, false, NaN);
  const d = normalizeLandDiscovery(s); assert.deepEqual(normalizeLandDiscovery({ ...s, landDiscovery: d }), d);
});

test('a successful inspection replaces a damaged backup so losing the primary ledger cannot repay the bench', () => {
  for (const value of ['damaged', -1, {}, null]) {
    const s = ready(); buy(s); s.firsts['land:planting-marker'] = value;
    const beforeFirsts = structuredClone(s.firsts); inspect(s);
    assert.equal(s.firsts['land:planting-marker'], T0); assert.equal(s.stored.bench, 1);
    for (const [key, at] of Object.entries(beforeFirsts)) if (key !== 'land:planting-marker') assert.deepEqual(s.firsts[key], at);
    delete s.landDiscovery; s.stored.bench = 0;
    const loaded = unpack(pack(s));
    assert.equal(landBranchStatus(loaded).found, true);
    refused(loaded, 'inspectLandDiscovery', { parcel: '1,2' }); assert.equal(loaded.stored.bench, 0);
  }
});

test('legacy migration preserves an owned alternative parcel without clearing terrain or inventing a reward', () => {
  const s = ready(); s.parcels.push('0,3'); delete s.landDiscovery; s.version = SAVE_VERSION - 1;
  const o = parcelOrigin('0,3'); s.cells[(o.z + 1) * N + o.x + 1] = CELL_TYPES.rock;
  const cells = [...s.cells], stored = structuredClone(s.stored), money = s.coins;
  const loaded = migrate(s, T0);
  assert.equal(landBranchStatus(loaded).parcel, '0,3'); assert.equal(landBranchStatus(loaded).stage, 'covered');
  assert.deepEqual(loaded.cells, cells); assert.deepEqual(loaded.stored, stored); assert.equal(loaded.coins, money);
  assert.equal(unreadLandDiscovery(loaded), 0); assert.equal(loaded.firsts['land:planting-marker'], undefined);
});

test('ordinary empty-mode farms and separate profiles keep their own land and reward state', () => {
  const empty = newGame(T0, 42); empty.level = 4; empty.coins = 500; delete empty.landDiscovery; buy(empty);
  assert.equal(Object.hasOwn(empty, 'landDiscovery'), false); assert.equal(landBranchStatus(empty).enabled, false);
  const a = ready(), b = ready(), c = ready(); buy(a); inspect(a); buy(b, '0,1');
  assert.deepEqual([landBranchStatus(a).stage, landBranchStatus(b).stage, landBranchStatus(c).stage], ['found', 'covered', 'unowned']);
  assert.deepEqual([a.stored.bench ?? 0, b.stored.bench ?? 0, c.stored.bench ?? 0], [1, 0, 0]);
  assert.deepEqual(newLandDiscovery(), { parcel: null, boughtAt: null, discoveredAt: null, read: false });
});

test('the new family memory has full Vietnamese coverage with the established speakers and placeholders', () => {
  const strings = [LAND_BRANCH.title, LAND_BRANCH.text, LAND_BRANCH.purpose, LAND_BRANCH.hint, LAND_BRANCH.discovery.title, LAND_BRANCH.discovery.story,
    ...LAND_BRANCH.discovery.lines.map(l => l.text)];
  for (const str of strings) assert.ok(VI_LAND[str], str);
  assert.deepEqual(LAND_BRANCH.discovery.lines.map(l => l.who), ['ada', 'pip', 'june']);
  for (const line of LAND_BRANCH.discovery.lines) assert.ok(!/\btôi\b/u.test(VI_LAND[line.text]));
  const placeholders = s => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();
  for (const [en, vi] of Object.entries(VI_LAND)) assert.deepEqual(placeholders(en), placeholders(vi));
});
