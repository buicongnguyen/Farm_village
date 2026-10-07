// Saves (TECH-PLAN 4): browser storage, written one second after the last change and whenever the page is hidden,
// with a backup copy restored if the main copy cannot be read. Cells are stored as a digit string (one per cell).
import { migrate } from '../core/state.mjs';

const KEY = profile => `farm-village:save:${profile}`;
export function pack(s) { return JSON.stringify({ ...s, cells: s.cells.join('') }); }
export function unpack(text) {
  const s = JSON.parse(text);
  if (typeof s.cells === 'string') s.cells = Array.from(s.cells, Number);
  return migrate(s);
}
export function load(profile = 1) {
  for (const key of [KEY(profile), `${KEY(profile)}:backup`]) {
    try { const text = localStorage.getItem(key); if (text) return unpack(text); } catch {}
  }
  return null;
}
export function save(s, profile = 1) {
  try {
    const text = pack(s), old = localStorage.getItem(KEY(profile));
    if (old) localStorage.setItem(`${KEY(profile)}:backup`, old);
    localStorage.setItem(KEY(profile), text);
    return true;
  } catch { return false; }
}
export function erase(profile = 1) { try { localStorage.removeItem(KEY(profile)); localStorage.removeItem(`${KEY(profile)}:backup`); } catch {} }
/** Keep a game saved: after changes (debounced), when the page is hidden, and before a stale-file reload. */
export function autosave(game, profile = 1) {
  let timer = 0;
  const now = () => { clearTimeout(timer); timer = 0; save(game.s, profile); };
  game.on(r => { if (r.ok && (r.events?.length || r.events === undefined)) { clearTimeout(timer); timer = setTimeout(now, 1000); } });
  document.addEventListener('visibilitychange', () => { if (document.hidden) now(); });
  addEventListener('pagehide', now);
  window.__fvSave = now;     // the stale-file guard saves before it reloads
  return now;
}
