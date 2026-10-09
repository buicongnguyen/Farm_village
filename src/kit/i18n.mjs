// Authored English keys, explicit identity references and independently loaded language catalogs.
// A locale switch commits only after its complete catalog loads; farms and game time do not depend on language.
import { resolveNames } from '../content/character-names.mjs';
import { LEGACY_NAME_TEXT } from '../content/legacy-name-text.mjs';
export const LANGUAGES = Object.freeze([
  { id: 'en', label: 'English', locale: 'en-US' }, { id: 'vi', label: 'Tiếng Việt', locale: 'vi-VN' },
  { id: 'ko', label: '한국어', locale: 'ko-KR' }, { id: 'ja', label: '日本語', locale: 'ja-JP' },
]);
const supported = id => LANGUAGES.some(lang => lang.id === id);
const loaders = { vi: () => import('../i18n/vi.mjs'), ko: () => import('../i18n/ko.mjs'), ja: () => import('../i18n/ja.mjs') };
const catalogs = Object.create(null), loading = Object.create(null), retry = Object.create(null);
// A failed download is not cached: the next call tries again. The browser remembers a module URL that failed, so the
// retry asks for the same chunk with a fresh query (Chrome names the URL in the error; elsewhere it simply tries again).
export function loadLanguage(id) {
  if (!supported(id) || id === 'en' || catalogs[id]) return Promise.resolve();
  return loading[id] ??= (retry[id] ? import(retry[id]) : loaders[id]()).then(m => {
    catalogs[id] = m[id.toUpperCase()];
    if (!catalogs[id]) throw new Error(`Missing language catalog: ${id}`);
  }).catch(e => {
    delete loading[id];
    const url = String(e?.message ?? '').match(/https?:\/\/\S+?\.js/)?.[0];
    if (url) retry[id] = `${url}?retry=${Date.now().toString(36)}`;
    throw e;
  });
}
export const loadVietnamese = () => loadLanguage('vi');

const KEY = 'farm-village.language';
const listeners = new Set();
let language = (() => {
  try { const saved = globalThis.localStorage?.getItem(KEY); if (supported(saved)) return saved; } catch {}
  const requested = globalThis.navigator?.languages ?? [globalThis.navigator?.language];
  return requested.map(lang => String(lang ?? '').toLowerCase().split('-')[0]).find(supported) ?? 'en';
})();

let wanted = language;   // the last language asked for (a switch waits for its lines)
export const getLanguage = () => language;
export const getLocale = (lang = language) => (LANGUAGES.find(entry => entry.id === lang) ?? LANGUAGES[0]).locale;
/** Switch the language (after its lines have loaded); listeners hear about it then. Returns a promise. */
export function setLanguage(next) {
  if (!supported(next)) return Promise.resolve();
  wanted = next;
  const apply = () => {
    if (wanted !== next) return;   // a later switch won
    try { globalThis.localStorage?.setItem(KEY, next); } catch {}
    if (next === language) return;   // an explicit choice still persists after browser detection or load fallback
    language = next;
    if (globalThis.document) document.documentElement.lang = next;
    for (const f of listeners) f(next);
  };
  if (next === 'en' || catalogs[next]) { apply(); return Promise.resolve(); }   // lines already here: switch at once
  return loadLanguage(next).then(apply, error => { if (wanted === next) throw error; });
}
/** Resolves when the boot language's lines are in (await it before the first text is drawn). */
const bootLanguage = language;
export const languageReady = loadLanguage(bootLanguage).catch(() => {
  if (language === bootLanguage) language = 'en';
  if (wanted === bootLanguage) wanted = 'en';
}).then(() => {
  if (globalThis.document) document.documentElement.lang = language;
});
export const onLanguageChange = f => (listeners.add(f), () => listeners.delete(f));

const fill = (text, params) => params ? text.replace(/\{(\w+)\}/g, (m, k) => (Object.hasOwn(params, k) ? String(params[k]) : m)) : text;
function render(lang, text, params) {
  // Old saves keep their original authored sentences and IDs; only their display key changes.
  const key = Object.hasOwn(LEGACY_NAME_TEXT, text) ? LEGACY_NAME_TEXT[text] : text;
  const catalog = supported(lang) && lang !== 'en' ? catalogs[lang] : null;
  const translated = catalog && Object.hasOwn(catalog, key) ? catalog[key] : key;
  // Resolve names before inserting arbitrary parameter values (including the player's chosen name).
  return fill(resolveNames(translated, lang), params);
}
/** Translate an English string (with {placeholders}) into the current language. */
export const t = (text, params) => render(language, text, params);
/** Translate content names nested in a message's parameters (leave counts as numbers). */
export const tParams = params => params && Object.fromEntries(Object.entries(params).map(([k, v]) => [k, typeof v === 'string' ? t(v) : v]));
/** Same, for a fixed language (tests, saves). */
export const tIn = (lang, text, params) => render(lang, text, params);   // catalog once loaded
/** Format numbers with local separators; whole numbers by default, fixed decimals for rates. */
export const num = (n, digits = 0) => {
  const locale = getLocale();
  return digits ? n.toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }) : Math.round(n).toLocaleString(locale);
};
