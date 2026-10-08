import './tz.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/core/state.mjs';
import { readFileSync } from 'node:fs';
import { makeCart } from '../src/core/cart.mjs';
import { Game } from '../src/game.mjs';
import { PROFILE_IDS, profileId, activeProfile, selectProfile, inspectProfile, listProfiles,
  pack, unpack, load, save, erase, autosave } from '../src/kit/save.mjs';
import { T0 } from './helpers.mjs';

const key = id => `farm-village:save:${id}`;
const selector = 'farm-village:profile';
class Storage {
  data = new Map(); failures = new Map();
  fail(method, key, times = 1) { this.failures.set(`${method}:${key}`, times); }
  check(method, key) {
    const id = `${method}:${key}`, left = this.failures.get(id) ?? 0;
    if (left) { this.failures.set(id, left - 1); throw new Error('Storage unavailable'); }
  }
  getItem(key) { this.check('get', key); return this.data.get(key) ?? null; }
  setItem(key, value) { this.check('set', key); this.data.set(key, String(value)); }
  removeItem(key) { this.check('remove', key); this.data.delete(key); }
}
function storageFor(t) {
  const before = Object.getOwnPropertyDescriptor(globalThis, 'localStorage'), storage = new Storage();
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
  t.after(() => { if (before) Object.defineProperty(globalThis, 'localStorage', before); else delete globalThis.localStorage; });
  return storage;
}
function farm(id = 1) {
  const s = newGame(T0 + id, 100 + id, { restore: true });
  s.coins = id * 111; s.settings.playerName = `Farmer ${id}`;
  s.people.ada = { hearts: id, scenes: [] }; s.story.chapter = id;
  return s;
}
function pageFor(t) {
  const before = ['document', 'window'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]);
  const document = new EventTarget(), window = new EventTarget(); document.hidden = false;
  Object.defineProperty(globalThis, 'document', { value: document, configurable: true });
  Object.defineProperty(globalThis, 'window', { value: window, configurable: true });
  t.mock.timers.enable({ apis: ['setTimeout'] });
  t.after(() => { for (const [key, desc] of before) { if (desc) Object.defineProperty(globalThis, key, desc); else delete globalThis[key]; } });
  return { document, window };
}

test('the existing farm and backup remain Profile 1 byte-for-byte; other slots start empty', t => {
  const storage = storageFor(t), existing = pack(farm(1)), backup = pack(farm(2));
  storage.setItem(key(1), existing); storage.setItem(`${key(1)}:backup`, backup);
  const before = new Map(storage.data);
  assert.equal(activeProfile(), 1);
  assert.equal(load().coins, 111);
  const slots = listProfiles();
  assert.deepEqual(slots.map(s => [s.id, s.active, s.status]), [[1, true, 'saved'], [2, false, 'empty'], [3, false, 'empty']]);
  assert.deepEqual(storage.data, before, 'inspection must neither migrate storage keys nor create empty farms');
});

test('slot bounds reject malformed IDs and corrupt selectors fall back to Profile 1 without touching saves', t => {
  const storage = storageFor(t); save(farm(), 1);
  assert.deepEqual(PROFILE_IDS, [1, 2, 3]);
  for (const value of [0, 4, -1, 1.5, NaN, Infinity, null, undefined, {}, [], 'NaN', '2.5', '04', ' 2 ', '__proto__']) {
    assert.equal(profileId(value), null, String(value));
    const before = new Map(storage.data);
    assert.equal(selectProfile(value), false); assert.equal(save(farm(), value), value === undefined);
    // Omitted/default arguments intentionally keep the pre-existing Profile 1 API.
    if (value !== undefined) { assert.equal(load(value), null); assert.equal(erase(value), false); assert.equal(inspectProfile(value).error, 'invalid-profile'); }
    if (value !== undefined) assert.deepEqual(storage.data, before);
  }
  for (const invalid of ['NaN', '2.5', '0', '4', ' 2 ', '']) { storage.setItem(selector, invalid); assert.equal(activeProfile(), 1); }
  for (const id of PROFILE_IDS) { assert.equal(selectProfile(String(id)), true); assert.equal(activeProfile(), id); }
});

test('three farms, their backups, imported progress and reset remain independent', t => {
  const storage = storageFor(t);
  for (const id of PROFILE_IDS) { const s = farm(id); assert.ok(save(s, id)); s.coins++; assert.ok(save(s, id)); }
  for (const id of PROFILE_IDS) {
    assert.equal(load(id).coins, id * 111 + 1);
    assert.equal(unpack(storage.getItem(`${key(id)}:backup`)).coins, id * 111);
  }
  const original1 = storage.getItem(key(1)), backup1 = storage.getItem(`${key(1)}:backup`);
  const original3 = storage.getItem(key(3));
  assert.ok(erase(2)); assert.equal(inspectProfile(2).exists, false);
  assert.equal(storage.getItem(key(3)), original3);
  const imported = unpack(pack(farm(2))); assert.ok(save(imported, 3));
  assert.equal(load(3).coins, 222); assert.equal(load(3).people.ada.hearts, 2);
  assert.equal(storage.getItem(`${key(3)}:backup`), original3);
  assert.equal(storage.getItem(key(1)), original1); assert.equal(storage.getItem(`${key(1)}:backup`), backup1);
  assert.equal(inspectProfile(2).state, null);
});

test('a corrupt primary recovers from its own backup and never replaces that backup with corrupt or duplicate data', t => {
  const storage = storageFor(t), good = pack(farm(3));
  storage.setItem(key(2), '{broken'); storage.setItem(`${key(2)}:backup`, good);
  assert.equal(inspectProfile(2).source, 'backup'); assert.equal(load(2).coins, 333);
  assert.ok(save(load(2), 2)); assert.equal(storage.getItem(`${key(2)}:backup`), good);
  const newer = load(2); newer.coins = 700; assert.ok(save(newer, 2));
  const before = storage.getItem(`${key(2)}:backup`);
  assert.ok(save(newer, 2)); assert.equal(storage.getItem(`${key(2)}:backup`), before);
  assert.equal(inspectProfile(1).exists, false); assert.equal(inspectProfile(3).exists, false);
});

test('previews distinguish empty, corrupt, backup and unavailable slots, without writing or ticking farms', t => {
  const storage = storageFor(t);
  storage.setItem(key(1), ''); storage.setItem(`${key(2)}:backup`, pack(farm(2)));
  let slots = listProfiles();
  assert.deepEqual(slots.map(s => s.status), ['corrupt', 'backup', 'empty']);
  assert.equal(slots[1].source, 'backup'); assert.equal(slots[1].lastSeen, T0 + 2);
  const current = farm(1); current.coins = 876; const before = new Map(storage.data);
  slots = listProfiles(current, 1); assert.equal(slots[0].coins, 876); assert.equal(slots[0].playerName, 'Farmer 1');
  assert.equal(slots[0].status, 'corrupt', 'current metadata must not hide unreadable persisted data');
  assert.deepEqual(storage.data, before);
  storage.fail('get', key(3)); storage.fail('get', `${key(3)}:backup`);
  assert.equal(inspectProfile(3).error, 'unavailable');
});

test('failed serialization, quota writes and active-profile writes preserve recoverable farms', t => {
  const storage = storageFor(t), old = farm(1); save(old, 1); old.coins++; save(old, 1);
  selectProfile(1); const before = new Map(storage.data);
  assert.equal(save({ cells: null }, 1), false); assert.deepEqual(storage.data, before);
  const next = farm(2); storage.fail('set', key(1));
  assert.equal(save(next, 1), false); assert.deepEqual(storage.data, before, 'failed primary write restores the preceding backup');
  storage.fail('set', `${key(1)}:backup`);
  assert.equal(save(next, 1), false); assert.deepEqual(storage.data, before);
  storage.fail('set', selector);
  assert.equal(selectProfile(3), false); assert.equal(activeProfile(), 1); assert.deepEqual(storage.data, before);
});

test('a failed reset restores this profile and never deletes the other farms or selection', t => {
  const storage = storageFor(t); save(farm(1), 1); save(farm(2), 1); save(farm(3), 3); selectProfile(1);
  const before = new Map(storage.data); storage.fail('remove', key(1));
  assert.equal(erase(1), false); assert.deepEqual(storage.data, before);
  storage.fail('remove', `${key(1)}:backup`);
  assert.equal(erase(1), false); assert.deepEqual(storage.data, before);
  assert.equal(erase(1), true); assert.equal(load(1), null); assert.equal(load(3).coins, 333); assert.equal(activeProfile(), 1);
});

test('autosave is pinned to its farm, saves accepted changes, and exposes a callable stale-reload flush', t => {
  storageFor(t); const page = pageFor(t), game = new Game(farm(1), () => T0), flush = autosave(game, 1);
  t.after(() => flush.dispose());
  assert.equal(page.window.__fvSave, flush); assert.equal(flush(), true);
  game.s.coins = 900; game.emit({ ok: false, events: [] }, 'refused'); t.mock.timers.tick(1000);
  assert.equal(load(1).coins, 111);
  game.emit({ ok: true, events: [] }, 'beatSeen'); selectProfile(2); t.mock.timers.tick(1000);
  assert.equal(load(1).coins, 900); assert.equal(load(2), null);
  game.s.coins = 901; page.document.hidden = true; page.document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(load(1).coins, 901);
  game.s.coins = 902; page.window.dispatchEvent(new Event('pagehide')); assert.equal(load(1).coins, 902);
});

test('disposing pending autosave after import prevents timer and unload from restoring the old farm', t => {
  storageFor(t); const page = pageFor(t), game = new Game(farm(1), () => T0), flush = autosave(game, 1);
  flush(); game.s.coins = 999; game.emit({ ok: true, events: [] }, 'test');
  assert.ok(save(unpack(pack(farm(3))), 1)); flush.dispose();
  assert.equal(page.window.__fvSave, undefined); assert.equal(game.listeners.size, 0);
  t.mock.timers.tick(2000); page.window.dispatchEvent(new Event('pagehide'));
  page.document.hidden = true; page.document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(load(1).coins, 333); assert.equal(flush(), false); assert.equal(flush.resume(), false);
});

test('pausing and disposing reset autosave prevents erased farms from being recreated during navigation', t => {
  storageFor(t); const page = pageFor(t), game = new Game(farm(2), () => T0), flush = autosave(game, 2);
  flush(); game.emit({ ok: true, events: [] }, 'test'); assert.equal(flush.pause(), true);
  assert.equal(flush(), false); assert.ok(erase(2)); flush.dispose();
  t.mock.timers.tick(2000); page.window.dispatchEvent(new Event('pagehide')); assert.equal(load(2), null);
});

test('failed import/reset can resume the original pending farm; a failed switch keeps its autosave alive', t => {
  const storage = storageFor(t); pageFor(t);
  const game = new Game(farm(1), () => T0), flush = autosave(game, 1); t.after(() => flush.dispose());
  flush(); game.s.coins = 500; game.emit({ ok: true, events: [] }, 'test'); flush.pause();
  storage.fail('set', key(1)); assert.equal(save(farm(3), 1), false);
  assert.equal(flush.resume(), true); t.mock.timers.tick(1000); assert.equal(load(1).coins, 500);
  flush.pause(); storage.fail('remove', key(1)); assert.equal(erase(1), false); flush.resume();
  game.s.coins = 501; t.mock.timers.tick(1000); assert.equal(load(1).coins, 501);
  assert.ok(flush()); storage.fail('set', selector); assert.equal(selectProfile(2), false);
  game.s.coins = 502; game.emit({ ok: true, events: [] }, 'test'); t.mock.timers.tick(1000);
  assert.equal(load(1).coins, 502); assert.equal(load(2), null);
});


test('incomplete or malformed imports are refused before they can replace a healthy primary or backup', t => {
  const storage = storageFor(t), s = farm(1); save(s, 1); s.coins++; save(s, 1);
  const before = new Map(storage.data);
  const broken = [{ version: 6, cells: [], placed: {} }, { ...farm(), cells: [] }];
  for (const edit of [
    s => { delete s.projects; }, s => { s.projects = { step: 'zero', delivered: {} }; },
    s => { s.barn.items = null; }, s => { s.placed = null; }, s => { s.placed.bad = null; },
    s => { s.placed.bad = { kind: 'unknown', x: 40, z: 68 }; },
    s => { s.cells[0] = 9; }, s => { s.parcels = {}; }, s => { s.coins = null; },
    s => { s.orders.cards = {}; }, s => { s.orders.cards = [null]; },
    s => { s.beds.bad = null; },
    s => { s.animals.bad = null; }, s => { s.production.bad = { slots: 1, queue: [null] }; },
    s => { s.neighbours = { mai: null }; }, s => { s.news = {}; },
  ]) { const s = farm(); edit(s); broken.push(s); }
  const invalidTexts = broken.map(s => JSON.stringify(s));
  const compressed = JSON.parse(pack(farm())); compressed.cells = compressed.cells.slice(1);
  invalidTexts.push(JSON.stringify(compressed));
  compressed.cells = ' '.repeat(farm().cells.length); invalidTexts.push(JSON.stringify(compressed));
  for (const text of invalidTexts) {
    assert.throws(() => save(unpack(text), 1), /not a Farm Village save/);
    assert.deepEqual(storage.data, before, 'refused import must not rotate a backup or replace any slot');
  }
  for (const bad of broken) { const copy = structuredClone(bad); assert.equal(save(bad, 1), false); assert.deepEqual(bad, copy); }
  assert.deepEqual(storage.data, before, 'invalid direct saves also leave storage untouched');
});

test('structurally broken JSON primary falls back to a healthy backup without ticking or overwriting either', t => {
  const storage = storageFor(t), backup = pack(farm(3));
  const broken = JSON.stringify({ version: 6, cells: [], placed: {} });
  storage.setItem(key(2), broken); storage.setItem(key(2) + ':backup', backup);
  const before = new Map(storage.data), inspected = inspectProfile(2);
  assert.equal(inspected.error, null); assert.equal(inspected.source, 'backup'); assert.equal(inspected.state.coins, 333);
  assert.equal(inspected.state.lastSeen, farm(3).lastSeen); assert.deepEqual(inspected.state.news, []);
  assert.deepEqual(storage.data, before, 'inspection must be read-only');
  assert.ok(save(inspected.state, 2));
  assert.equal(storage.getItem(key(2) + ':backup'), backup, 'invalid JSON-shaped primary is never promoted over healthy backup');
  storage.removeItem(key(2) + ':backup'); storage.setItem(key(2), broken);
  assert.equal(inspectProfile(2).error, 'corrupt'); assert.equal(load(2), null);
});

test('validation preserves authentic v0.1 exports, array grids, newer defaults and a mature farm with a cart', t => {
  storageFor(t);
  for (const name of ['v01-steady-day2', 'v01-keen-day21']) {
    const text = readFileSync(new URL('./fixtures/' + name + '.json', import.meta.url), 'utf8'), raw = JSON.parse(text);
    const loaded = unpack(text);
    assert.equal(raw.cells.length, 128 * 128); assert.equal(loaded.cells.length, raw.cells.length);
    assert.equal(loaded.coins, raw.coins); assert.equal(loaded.lastSeen, raw.lastSeen);
    assert.equal(Object.keys(loaded.placed).length, Object.keys(raw.placed).length);
    assert.equal(save(loaded, 1), true);
    const arrayFormat = JSON.stringify({ ...loaded, cells: loaded.cells });
    assert.equal(unpack(arrayFormat).coins, loaded.coins);
    loaded.cart = makeCart(loaded, 1);
    const production = Object.values(loaded.production)[0];
    if (production) production.queue.push({ recipe: 'chicken_feed', doneAt: T0 + 60_000 });
    const snapshot = structuredClone(loaded);
    assert.equal(save(loaded, 2), true); assert.deepEqual(loaded, snapshot, 'save validation does not mutate live state');
    assert.deepEqual(unpack(pack(loaded)).cart, loaded.cart);
  }
});
