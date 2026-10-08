// Three independent browser saves. Existing save:1 and its backup remain Profile 1 without a copy or migration.
// Cells are stored as a digit string; metadata is derived from each saved farm rather than a second mutable index.
import { migrate, CELL_TYPES } from '../core/state.mjs';
import { N } from '../content/world.mjs';
import { BUILDINGS } from '../content/buildings.mjs';
import { TRUCK } from '../content/economy.mjs';
import { upgradeV1 } from '../core/upgrade.mjs';

export const PROFILE_IDS = Object.freeze([1, 2, 3]);
const PROFILE_KEY = 'farm-village:profile';
const KEY = profile => `farm-village:save:${profile}`;
/** Only the three supported slots, including their canonical HTML/storage strings. Never clamp an invalid slot. */
export function profileId(value) {
  return PROFILE_IDS.find(id => value === id || value === String(id)) ?? null;
}
export function activeProfile() {
  try { return profileId(localStorage.getItem(PROFILE_KEY)) ?? 1; } catch { return 1; }
}
/** Select only after the caller has successfully saved the departing farm. */
export function selectProfile(profile) {
  const id = profileId(profile); if (id == null) return false;
  try { localStorage.setItem(PROFILE_KEY, String(id)); return true; } catch { return false; }
}
export function pack(s) { return JSON.stringify({ ...s, cells: s.cells.join('') }); }
/** Structural checks only: never tick a farm to decide whether it is safe to load.
 * These essentials already exist in the frozen v0.1 exports; newer optional fields still go through migration. */
const record = value => !!value && typeof value === 'object' && !Array.isArray(value);
const records = value => record(value) && Object.values(value).every(record);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const natural = value => Number.isSafeInteger(value) && value >= 0;
const known = (table, key) => typeof key === 'string' && Object.hasOwn(table, key);
const requireSave = condition => { if (!condition) throw new Error('not a Farm Village save'); };
function validateSave(s) {
  requireSave(record(s));
  requireSave(s.version == null || natural(s.version) && s.version >= 1);
  for (const k of ['createdAt', 'lastSeen', 'seed', 'coins', 'xp']) requireSave(finite(s[k]));
  requireSave(natural(s.level) && s.level >= 1 && natural(s.nextId));
  requireSave(Array.isArray(s.parcels) && s.parcels.length > 0 && s.parcels.every(p => typeof p === 'string' && /^[0-3],[0-3]$/.test(p)));
  const types = new Set(Object.values(CELL_TYPES));
  requireSave(Array.isArray(s.cells) && s.cells.length === N * N && s.cells.every(cell => types.has(cell)));
  for (const k of ['placed', 'fences', 'beds', 'animals', 'production', 'barn', 'orders', 'projects', 'stall', 'story']) requireSave(record(s[k]));
  requireSave(record(s.barn.items) && finite(s.barn.cap) && s.barn.cap >= 0);
  requireSave(Array.isArray(s.orders.cards) && s.orders.cards.every(c => record(c) && record(c.need)));
  requireSave(natural(s.projects.step) && record(s.projects.delivered));
  requireSave(natural(s.story.chapter) && natural(s.story.tutorial));
  requireSave(Array.isArray(s.stall.items) && s.stall.items.every(record));
  for (const p of Object.values(s.placed)) requireSave(record(p) && known(BUILDINGS, p.kind)
    && natural(p.x) && p.x < N && natural(p.z) && p.z < N && (p.rot == null || natural(p.rot) && p.rot < 4));
  // These collections are read during boot; migration fills missing later-version containers, not malformed ones.
  for (const k of ['beds', 'homes', 'people', 'neighbours', 'trees', 'cond', 'repairing']) if (s[k] !== undefined) requireSave(records(s[k]));
  for (const list of Object.values(s.animals)) requireSave(Array.isArray(list) && list.every(record));
  for (const p of Object.values(s.production)) requireSave(record(p) && Array.isArray(p.queue) && p.queue.every(record));
  for (const k of ['today', 'stats', 'settings', 'firsts', 'counts', 'stored', 'known', 'rebuild', 'fishing', 'truck', 'quests', 'hurry', 'album', 'wishes', 'village']) if (s[k] !== undefined) requireSave(record(s[k]));
  for (const k of ['mail', 'news', 'undo']) if (s[k] !== undefined) requireSave(Array.isArray(s[k]) && s[k].every(record));
  // the delivery trucks: the first is s.truck, more (bought later) in s.truck.fleet, never more than the fleet allows
  const truckRecord = u => record(u) && (u.load === undefined || Array.isArray(u.load) && u.load.every(i => record(i) && typeof i.good === 'string' && natural(i.n)));
  if (s.truck !== undefined) requireSave(truckRecord(s.truck) && (s.truck.fleet === undefined
    || Array.isArray(s.truck.fleet) && s.truck.fleet.length < TRUCK.fleet.max && s.truck.fleet.every(u => truckRecord(u) && Array.isArray(u.load))));

}
/**
 * A save holds ids, numbers and times, never markup. Menus build their HTML from save values (card ids, stall goods,
 * wish kinds), so a file with < > " or ` in a key or a text value is refused: an imported save cannot inject markup.
 * (Story text, which has quotes and the tutorial's <b>, is content, not save data.)
 */
const MARKUP = /[<>"`]/;
export function unpack(text) {
  const s = JSON.parse(text, (k, v) => { if (MARKUP.test(k) || (typeof v === 'string' && MARKUP.test(v))) throw new Error('not a Farm Village save'); return v; });
  if (!s || typeof s !== 'object' || Array.isArray(s) || typeof s.placed !== 'object' || !Array.isArray(s.cells) && typeof s.cells !== 'string') throw new Error('not a Farm Village save');
  if (typeof s.cells === 'string') {
    requireSave(s.cells.length === N * N && /^[0-4]+$/.test(s.cells));
    s.cells = Array.from(s.cells, Number);
  }
  validateSave(s);
  const from = s.version ?? 1, m = migrate(s);
  return from < 2 ? upgradeV1(m) : m;
}
/** Inspect without writing. Unreadable data is distinct from an empty slot so boot cannot overwrite it silently. */
export function inspectProfile(profile = 1) {
  const id = profileId(profile), out = { id, state: null, source: null, exists: false, error: null };
  if (id == null) return { ...out, error: 'invalid-profile' };
  let unavailable = false;
  for (const [source, key] of [['primary', KEY(id)], ['backup', `${KEY(id)}:backup`]]) {
    let text;
    try { text = localStorage.getItem(key); } catch { unavailable = true; continue; }
    if (text == null) continue;
    out.exists = true;
    try { return { ...out, state: unpack(text), source }; } catch { /* try the independent backup */ }
  }
  return { ...out, error: unavailable ? 'unavailable' : out.exists ? 'corrupt' : null };
}
export function load(profile = 1) { return inspectProfile(profile).state; }

/** Three read-only previews; the current farm may provide fresher metadata while its debounce is pending. */
export function listProfiles(currentState = null, currentId = activeProfile()) {
  const selected = profileId(currentId) ?? 1;
  const number = (value, fallback = 0) => Number.isFinite(value) && value >= 0 ? value : fallback;
  return PROFILE_IDS.map(id => {
    const info = inspectProfile(id), active = id === selected, s = active && currentState ? currentState : info.state;
    return { id, active, source: info.source, exists: info.exists,
      status: info.state ? info.source === 'backup' ? 'backup' : 'saved' : info.error ?? 'empty',
      level: s ? number(s.level, 1) : null, coins: s ? number(s.coins) : null,
      chapter: s ? number(s.story?.chapter) : null, lastSeen: s ? number(s.lastSeen) : null,
      playerName: typeof s?.settings?.playerName === 'string' ? s.settings.playerName : '' };
  });
}

/** Keep the preceding readable save as backup; corrupt primary data must never overwrite a healthy backup. */
export function save(s, profile = 1) {
  const id = profileId(profile); if (id == null) return false;
  try {
    validateSave(s);
    const text = pack(s), key = KEY(id), old = localStorage.getItem(key);
    if (old === text) return true;   // a pagehide flush must not replace a useful backup with a duplicate
    let readable = false;
    if (old != null) { try { unpack(old); readable = true; } catch {} }
    const backupKey = `${key}:backup`, backup = readable ? localStorage.getItem(backupKey) : null;
    if (readable) localStorage.setItem(backupKey, old);
    try { localStorage.setItem(key, text); } catch (error) {
      if (readable) { try { if (backup == null) localStorage.removeItem(backupKey); else localStorage.setItem(backupKey, backup); } catch {} }
      throw error;
    }
    return true;
  } catch { return false; }
}
/** Reset only this slot. Backups go first so an incomplete deletion cannot silently resurrect a reset primary. */
export function erase(profile = 1) {
  const id = profileId(profile); if (id == null) return false;
  const keys = [`${KEY(id)}:backup`, KEY(id)];
  let previous;
  try {
    previous = keys.map(key => [key, localStorage.getItem(key)]);
    for (const key of keys) localStorage.removeItem(key);
    return true;
  } catch {
    // Storage errors are uncommon, but a failed reset should leave the last readable farm recoverable.
    for (const [key, value] of previous ?? []) if (value != null) { try { localStorage.setItem(key, value); } catch {} }
    return false;
  }
}

/**
 * Callable flush() for existing callers and the stale-file guard, with pause/resume/dispose for profile transitions.
 * Pause before a reset; dispose after a successful import/reset/switch and before navigation. A failed operation can
 * resume the same farm. Every callback stays bound to the original slot, even when another tab changes the selector.
 */
export function autosave(game, profile = 1) {
  const id = profileId(profile); if (id == null) throw new RangeError('Invalid save profile');
  const doc = document, page = window;
  let timer = 0, paused = false, disposed = false;
  const cancel = () => { clearTimeout(timer); timer = 0; };
  const now = () => { cancel(); return !paused && !disposed && save(game.s, id); };
  const schedule = () => { if (paused || disposed) return; cancel(); timer = setTimeout(now, 1000); };
  // Accepted actions can change the save without events; only ticks with events need a delayed write.
  const unsubscribe = game.on((r, action) => { if (r.ok && (action !== 'tick' || r.events?.length)) schedule(); });
  const hidden = () => { if (doc.hidden) now(); };
  doc.addEventListener('visibilitychange', hidden);
  page.addEventListener('pagehide', now);
  page.__fvSave = now;
  now.pause = () => { if (disposed) return false; paused = true; cancel(); return true; };
  now.resume = () => { if (disposed) return false; paused = false; schedule(); return true; };
  now.dispose = () => {
    if (disposed) return;
    disposed = true; paused = true; cancel(); unsubscribe();
    doc.removeEventListener('visibilitychange', hidden);
    page.removeEventListener('pagehide', now);
    if (page.__fvSave === now) delete page.__fvSave;
  };
  return now;
}
