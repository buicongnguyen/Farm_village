// Complete language editions share the same authored keys and gameplay identities.
import './tz.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { VI } from '../src/i18n/vi.mjs';
import { KO } from '../src/i18n/ko.mjs';
import { JA } from '../src/i18n/ja.mjs';
import { CHARACTER_NAMES, PET_NAMES, FAMILY_NAMES, resolveNames } from '../src/content/character-names.mjs';
import { LANGUAGES, loadLanguage, setLanguage, getLanguage, getLocale, num, t, tIn, tParams } from '../src/kit/i18n.mjs';

const catalogs = { vi: VI, ko: KO, ja: JA };
const params = text => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
const tokens = text => [...text.matchAll(/\{(person|pet|family):([^{}]+)\}/g)];
const identities = text => [...new Set(tokens(text).map(match => `${match[1]}:${match[2].split(':')[0]}`))].sort();
const markup = text => [...text.matchAll(/<\/?(?:b|i|strong|em)>/g)].map(match => match[0]);
// Display-only identity keys and technical symbols are not untranslated English prose.
const technical = text => !/[A-Za-z]/.test(text.replace(/\{[^{}]+\}/g, '').replace(/\b(?:XP|FPS|JSON|WebGL|OK)\b/g, ''));

for (const [language, catalog] of Object.entries(catalogs)) {
  test(`${language}: complete catalog keys, nonempty text and ordinary parameters`, () => {
    assert.deepEqual(Object.keys(catalog).sort(), Object.keys(VI).sort(), `${language}: a partial edition must not appear in the menu`);
    for (const [source, translated] of Object.entries(catalog)) {
      assert.equal(typeof translated, 'string', source);
      assert.ok(translated.trim(), `${language}: empty ${source}`);
      assert.deepEqual(params(translated), params(source), `${language}: parameters in ${source}`);
      if (!technical(source)) {
        assert.notEqual(translated, source, `${language}: untranslated English ${source}`);
        if (language === 'ko') assert.match(resolveNames(translated, language), /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]/u, `${language}: prose lacks Korean text: ${source}`);
        if (language === 'ja') assert.match(resolveNames(translated, language), /[\u3040-\u30ff\u3400-\u9fff]/u, `${language}: prose lacks Japanese text: ${source}`);
      }
      assert.doesNotMatch(translated, /\uFFFD/, `${language}: replacement glyph in ${source}`);
    }
  });

  test(`${language}: emphasis remains balanced and identity references are valid`, () => {
    for (const [source, translated] of Object.entries(catalog)) {
      assert.deepEqual(markup(translated).sort(), markup(source).sort(), `${language}: emphasis in ${source}`);
      const stack = [];
      for (const tag of markup(translated)) {
        if (tag.startsWith('</')) assert.equal(stack.pop(), tag.slice(2, -1), `${language}: malformed emphasis in ${source}`);
        else stack.push(tag.slice(1, -1));
      }
      assert.deepEqual(stack, [], `${language}: unclosed emphasis in ${source}`);
      for (const [, type, raw] of tokens(translated)) {
        const [id, form, extra] = raw.split(':'), table = type === 'person' ? CHARACTER_NAMES : type === 'pet' ? PET_NAMES : FAMILY_NAMES;
        assert.ok(Object.hasOwn(table, id), `${language}: unknown ${type}:${id}`);
        assert.ok(type === 'family' ? !form : !extra && ['short', 'display'].includes(form), `${language}: invalid identity ${raw}`);
      }
      assert.doesNotMatch(resolveNames(translated, language), /\{(?:person|pet|family):/, `${language}: unresolved identity in ${source}`);
      // Vietnamese's partner self-name convention is covered by its existing speaker-aware test.
      if (language !== 'vi') assert.deepEqual(identities(translated), identities(source), `${language}: changed referenced person in ${source}`);
    }
  });
}

test('each edition formats numbers and nested content without rewriting player parameters', async () => {
  assert.deepEqual(LANGUAGES.map(({ id, locale }) => [id, locale]), [['en', 'en-US'], ['vi', 'vi-VN'], ['ko', 'ko-KR'], ['ja', 'ja-JP']]);
  const literal = 'Mai {person:ada:display} 하루 &amp;';
  try {
    for (const { id, locale } of LANGUAGES) {
      await loadLanguage(id); await setLanguage(id);
      assert.equal(getLanguage(), id); assert.equal(getLocale(), locale);
      assert.equal(num(1234.5, 1), id === 'vi' ? '1.234,5' : '1,234.5');
      assert.equal(num(1234.5), id === 'vi' ? '1.235' : '1,235');
      const raw = { name: 'The school', count: 2 }, translated = tParams(raw);
      assert.deepEqual(raw, { name: 'The school', count: 2 });
      assert.equal(translated.count, 2); assert.equal(translated.name, tIn(id, 'The school'));
      const source = id === 'en' ? 'From {name}' : catalogs[id]['From {name}'];
      assert.equal(t('From {name}', { name: literal }), source.replace('{name}', literal));
      assert.equal(t('Mai wrote a private sentence about Sunny.'), 'Mai wrote a private sentence about Sunny.');
    }
    await setLanguage('fr'); assert.equal(getLanguage(), 'ja');
    assert.equal(getLocale('fr'), 'en-US');
  } finally { await setLanguage('en'); }
});

test('unknown saved text and inherited parameter properties stay literal in every edition', async () => {
  const inherited = Object.create({ name: 'inherited name', constructor: 'inherited constructor', toString: 'inherited method' });
  inherited.count = 2;
  const nullPrototype = Object.create(null); nullPrototype.name = 'constructor';
  try {
    for (const { id } of LANGUAGES) {
      await loadLanguage(id); await setLanguage(id);
      for (const text of ['constructor', 'toString', '__proto__', 'hasOwnProperty', 'valueOf']) {
        assert.equal(t(text), text, `${id}: inherited catalog key ${text}`);
        assert.equal(tIn(id, text), text, `${id}: fixed-locale inherited catalog key ${text}`);
      }
      const template = '{name}|{count}|{constructor}|{toString}';
      assert.equal(t(template, inherited), '{name}|2|{constructor}|{toString}');
      assert.equal(tIn(id, template, inherited), '{name}|2|{constructor}|{toString}');
      assert.equal(t('{name}', nullPrototype), 'constructor', 'valid own properties on a null-prototype parameter map were lost');
      assert.equal(t('{name}', { name: '{person:pip:short}' }), '{person:pip:short}', 'player text was interpreted as a second translation pass');
    }
  } finally { await setLanguage('en'); }
});

test('independent lazy language requests coalesce and the most recent selection wins', async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  let api;
  try {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => 'en', setItem() {} } });
    api = await import(`../src/kit/i18n.mjs?locale-race=${Date.now()}`);
    await api.languageReady;
  } finally { if (previous) Object.defineProperty(globalThis, 'localStorage', previous); else delete globalThis.localStorage; }
  const first = api.loadLanguage('ko'), duplicate = api.loadLanguage('ko'), sibling = api.loadLanguage('ja');
  assert.equal(first, duplicate, 'duplicate loads must share the pending promise');
  assert.notEqual(first, sibling, 'different editions must not share a catalog request');
  const pending = [api.setLanguage('ko'), api.setLanguage('ja'), api.setLanguage('en')];
  await Promise.all([first, duplicate, sibling, ...pending]);
  assert.equal(api.getLanguage(), 'en', 'an earlier slow language won after the last selection');
  await api.setLanguage('ko'); assert.equal(api.t('Settings'), KO.Settings);
  await api.setLanguage('ja'); assert.equal(api.t('Settings'), JA.Settings);
  await api.setLanguage('en'); assert.equal(api.t('Settings'), 'Settings');
});

test('saved editions override browser languages, with regional and ordered preference fallback', async () => {
  const names = ['navigator', 'localStorage', 'document'], previous = names.map(name => Object.getOwnPropertyDescriptor(globalThis, name));
  try {
    let serial = 0;
    for (const [saved, browser, expected] of [
      ['ja', ['ko-KR'], 'ja'], ['ko', ['en-US'], 'ko'], ['vi', ['ja-JP'], 'vi'],
      [null, ['ko-KR'], 'ko'], [null, ['ja-JP'], 'ja'], [null, ['fr-FR', 'vi-VN'], 'vi'],
      ['fr', ['ja-JP', 'ko-KR'], 'ja'], [null, ['fr-FR'], 'en'], [null, [], 'en'],
    ]) {
      Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { languages: browser, language: browser[0] } });
      Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => saved, setItem() {} } });
      Object.defineProperty(globalThis, 'document', { configurable: true, value: { documentElement: {} } });
      const api = await import(`../src/kit/i18n.mjs?locale-detection=${Date.now()}-${serial++}`);
      await api.languageReady;
      assert.equal(api.getLanguage(), expected, `${saved}/${browser}`);
      assert.equal(document.documentElement.lang, expected);
    }
  } finally {
    names.forEach((name, i) => previous[i] ? Object.defineProperty(globalThis, name, previous[i]) : delete globalThis[name]);
  }
});

test('explicitly selecting the current browser language persists it without duplicate change events', async () => {
  const names = ['navigator', 'localStorage', 'document'], previous = names.map(name => Object.getOwnPropertyDescriptor(globalThis, name));
  const stored = new Map(), changes = [];
  try {
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { languages: ['ko-KR'], language: 'ko-KR' } });
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: key => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value) } });
    Object.defineProperty(globalThis, 'document', { configurable: true, value: { documentElement: {} } });
    const api = await import(`../src/kit/i18n.mjs?locale-explicit=${Date.now()}`);
    await api.languageReady; api.onLanguageChange(id => changes.push(id));
    assert.equal(api.getLanguage(), 'ko'); assert.equal(stored.has('farm-village.language'), false);
    await api.setLanguage('ko'); await api.setLanguage('ko');
    assert.equal(stored.get('farm-village.language'), 'ko'); assert.deepEqual(changes, []);
    await api.setLanguage('ja'); await api.setLanguage('ja');
    assert.equal(stored.get('farm-village.language'), 'ja'); assert.deepEqual(changes, ['ja']);
  } finally {
    names.forEach((name, i) => previous[i] ? Object.defineProperty(globalThis, name, previous[i]) : delete globalThis[name]);
  }
});
