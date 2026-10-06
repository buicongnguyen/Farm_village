// English and Vietnamese. Every player-visible string goes through t(englishText, params), with {placeholders}.
// The English text is the key; src/i18n/vi.mjs maps it to Vietnamese. tests/i18n.test.mjs fails when a string has no
// Vietnamese line (the coverage rule from Willowmere's scripts/vi-coverage.mjs).
import { VI } from '../i18n/vi.mjs';

const KEY = 'farm-village.language';
const listeners = new Set();
let language = (() => {
  try { const saved = globalThis.localStorage?.getItem(KEY); if (saved === 'en' || saved === 'vi') return saved; } catch {}
  return globalThis.navigator?.language?.toLowerCase().startsWith('vi') ? 'vi' : 'en';
})();

export const getLanguage = () => language;
export function setLanguage(next) {
  if (next !== 'en' && next !== 'vi' || next === language) return;
  language = next;
  try { globalThis.localStorage?.setItem(KEY, next); } catch {}
  if (globalThis.document) document.documentElement.lang = next;
  for (const f of listeners) f(next);
}
export const onLanguageChange = f => (listeners.add(f), () => listeners.delete(f));

const fill = (text, params) => params ? text.replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m)) : text;
/** Translate an English string (with {placeholders}) into the current language. */
export const t = (text, params) => fill(language === 'vi' ? VI[text] ?? text : text, params);
/** Same, for a fixed language (tests, saves). */
export const tIn = (lang, text, params) => fill(lang === 'vi' ? VI[text] ?? text : text, params);
/** Format a whole number the local way (1,234 or 1.234). */
export const num = n => Math.round(n).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US');
