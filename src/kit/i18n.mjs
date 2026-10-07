// English and Vietnamese. Every player-visible string goes through t(englishText, params), with {placeholders}.
// The English text is the key; src/i18n/vi.mjs maps it to Vietnamese. tests/i18n.test.mjs fails when a string has no
// Vietnamese line (the coverage rule from Willowmere's scripts/vi-coverage.mjs).
// The Vietnamese lines (about 85 KB) are their own chunk: loaded at boot for a Vietnamese reader (languageReady), and on
// the first switch to Vietnamese for everyone else. Until they are in, t() gives the English.
let VI = null, viLoading = null;
export const loadVietnamese = () => (viLoading ??= import('../i18n/vi.mjs').then(m => { VI = m.VI; }));

const KEY = 'farm-village.language';
const listeners = new Set();
let language = (() => {
  try { const saved = globalThis.localStorage?.getItem(KEY); if (saved === 'en' || saved === 'vi') return saved; } catch {}
  return globalThis.navigator?.language?.toLowerCase().startsWith('vi') ? 'vi' : 'en';
})();

let wanted = language;   // the last language asked for (a switch waits for its lines)
export const getLanguage = () => language;
/** Switch the language (after its lines have loaded); listeners hear about it then. Returns a promise. */
export function setLanguage(next) {
  if (next !== 'en' && next !== 'vi') return Promise.resolve();
  wanted = next;
  const apply = () => {
    if (wanted !== next || next === language) return;   // a later switch won, or nothing changed
    language = next;
    try { globalThis.localStorage?.setItem(KEY, next); } catch {}
    if (globalThis.document) document.documentElement.lang = next;
    for (const f of listeners) f(next);
  };
  if (next === 'en' || VI) { apply(); return Promise.resolve(); }   // lines already here: switch at once
  return loadVietnamese().then(apply);
}
/** Resolves when the boot language's lines are in (await it before the first text is drawn). */
export const languageReady = language === 'vi' ? loadVietnamese().catch(() => { language = 'en'; }) : Promise.resolve();
export const onLanguageChange = f => (listeners.add(f), () => listeners.delete(f));

const fill = (text, params) => params ? text.replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m)) : text;
/** Translate an English string (with {placeholders}) into the current language. */
export const t = (text, params) => fill(language === 'vi' ? VI?.[text] ?? text : text, params);
/** Same, for a fixed language (tests, saves). */
export const tIn = (lang, text, params) => fill(lang === 'vi' ? VI?.[text] ?? text : text, params);   // vi once loaded
/** Format a whole number the local way (1,234 or 1.234). */
export const num = n => Math.round(n).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US');
