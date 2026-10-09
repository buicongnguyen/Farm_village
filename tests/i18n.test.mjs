// Every player-visible string has a Vietnamese line (the coverage rule from Willowmere).
// Strings are found two ways: t('…') / t("…") literals in src/, and the text fields of the content data (TEXT_FIELDS).
import './tz.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { VI } from '../src/i18n/vi.mjs';
import { PIP_LINES } from '../src/content/chatter.mjs';
import { VILLAGERS, JUNE_TIPS } from '../src/content/people.mjs';
import { CHARACTER_NAMES, PET_NAMES, FAMILY_NAMES, resolveNames } from '../src/content/character-names.mjs';
import * as content from '../src/content/index.mjs';

// `orders`: each person's order lines; `ada`: Ada's line on a chapter card; `caption`: story panels; `tip`/`tips`: June;
// `first`/`idle`: Pip's speech bubbles; VILLAGE_NAME: the village's name on the HUD.
const TEXT_FIELDS = new Set(['name', 'title', 'subtitle', 'line', 'lines', 'text', 'story', 'label', 'hint', 'role', 'wish', 'comment', 'comments', 'needText', 'farm', 'ORDER_LINES',
  'orders', 'reason', 'ada', 'caption', 'tip', 'tips', 'first', 'idle', 'restore', 'goal', 'kid', 'grown', 'VILLAGE_NAME']);
async function files(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await files(p)); else if (p.endsWith('.mjs')) out.push(p);
  }
  return out;
}
function contentStrings(value, key = '', out = new Set()) {
  if (typeof value === 'string') { if (TEXT_FIELDS.has(key)) out.add(value); }
  else if (Array.isArray(value)) for (const v of value) contentStrings(v, key, out);
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) contentStrings(v, k, out);
  return out;
}

test('every t() string and refusal reason in src/ has a Vietnamese line', async () => {
  const missing = new Set();
  for (const file of await files('src')) {
    if (file.includes(`${'i18n'}${process.platform === 'win32' ? '\\' : '/'}vi.mjs`)) continue;
    const text = await readFile(file, 'utf8');
    // t('…') in the interface, and the refusal reasons of the rules (ctx.fail('…'), reason: '…'), which the interface shows
    for (const m of text.matchAll(/(?:\bt\(|ctx\.fail\(|(?:hud|this)\.refuse\(|reason: )\s*(['"])((?:\\.|(?!\1).)*)\1/g)) { const s = m[2].replace(/\\(['"\\])/g, '$1'); if (!(s in VI)) missing.add(`${s}   (${file})`); }
  }
  assert.deepEqual([...missing], [], `missing Vietnamese:\n${[...missing].join('\n')}`);
});

test('every content text has a Vietnamese line', () => {
  const strings = contentStrings(content);
  for (const line of Object.values(PIP_LINES).flat()) strings.add(line);
  const missing = [...strings].filter(s => !(s in VI));
  assert.deepEqual(missing, [], `missing Vietnamese:\n${missing.join('\n')}`);
});

test('Vietnamese lines keep the same placeholders', () => {
  const names = s => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',');
  const wrong = Object.entries(VI).filter(([en, vi]) => names(en) !== names(vi)).map(([en]) => en);
  assert.deepEqual(wrong, []);
});

const identityTokens = text => [...text.matchAll(/\{(person|pet|family):([^{}]+)\}/g)].map(match => ({ token: match[0], type: match[1], parts: match[2].split(':') }));
const identities = text => [...new Set(identityTokens(text).map(({ type, parts }) => `${type}:${parts[0]}`))].sort();

test('Vietnamese preserves referenced identities while allowing natural short and titled forms', () => {
  // The partner sometimes uses her own name where English says I/we. Only her actual authored speech may do so.
  const juneLines = contentStrings(VILLAGERS.find(person => person.id === 'june'));
  for (const line of Object.values(JUNE_TIPS)) juneLines.add(line);
  const collect = value => {
    if (!value || typeof value !== 'object') return;
    if (value.who === 'june' && typeof value.text === 'string') juneLines.add(value.text);
    if (value.person === 'june' && typeof value.line === 'string') juneLines.add(value.line);
    for (const child of Object.values(value)) collect(child);
  };
  collect(content);
  for (const [en, vi] of Object.entries(VI)) {
    const source = identities(en), translated = identities(vi);
    const expected = juneLines.has(en) && !source.includes('person:june') && translated.includes('person:june')
      ? [...source, 'person:june'].sort() : source;
    assert.deepEqual(translated, expected, en);
  }
});

test('all authored identity tokens resolve in every prepared locale and name captions have Vietnamese coverage', async () => {
  const strings = contentStrings(content);
  for (const line of Object.values(PIP_LINES).flat()) strings.add(line);
  for (const [en, vi] of Object.entries(VI)) { strings.add(en); strings.add(vi); }
  for (const file of await files('src')) {
    const source = await readFile(file, 'utf8');
    for (const match of source.matchAll(/(?:\bt\(|ctx\.fail\()\s*(['"])((?:\\.|(?!\1).)*)\1/g))
      strings.add(match[2].replace(/\\(['"\\])/g, '$1'));
  }
  let checked = 0;
  for (const text of strings) for (const { token, type, parts } of identityTokens(text)) {
    const [id, form] = parts, table = type === 'person' ? CHARACTER_NAMES : type === 'pet' ? PET_NAMES : FAMILY_NAMES;
    assert.ok(Object.hasOwn(table, id), `unknown identity ${token} in ${text}`);
    assert.ok(type === 'family' ? parts.length === 1 : parts.length === 2 && ['short', 'display'].includes(form), `invalid identity form ${token}`);
    for (const lang of ['en', 'vi', 'ko', 'ja']) assert.ok(resolveNames(token, lang) && resolveNames(token, lang) !== token, `${lang}: ${token}`);
    checked++;
  }
  for (const text of strings) for (const lang of ['en', 'vi', 'ko', 'ja'])
    assert.doesNotMatch(resolveNames(text, lang), /\{(?:person|pet|family):/, `${lang}: unresolved or malformed identity in ${text}`);
  assert.ok(checked > 100, 'identity references disappeared from the authored story');
});

test('current authored story and screen keys use identities instead of literal former cast names', async () => {
  const strings = contentStrings(content);
  for (const line of Object.values(PIP_LINES).flat()) strings.add(line);
  for (const file of await files('src')) {
    const source = await readFile(file, 'utf8');
    for (const match of source.matchAll(/(?:\bt\(|ctx\.fail\()\s*(['"])((?:\\.|(?!\1).)*)\1/g))
      strings.add(match[2].replace(/\\(['"\\])/g, '$1'));
  }
  // This checks authored English keys, not translated prose (Mai can mean tomorrow) or player-supplied text.
  // Legacy saved phrase aliases are intentionally absent: they are compatibility keys, not current content.
  const oldNames = /\b(?:Ada|Ellis|June|Pip|Minh|Lan|Bo|Grace|Sam|Zara|Elin|Olaf|Marisol|Tomas|Pia|Cora|Hazel|Mai|Gus|Biscuit|Cloud|Drizzle|Captain|Miso|Tran|Okafor|Lindqvist|Reyes)\b/;
  for (const text of strings) assert.doesNotMatch(text, oldNames, text);
});

// Tutorial emphasis carries the action instructions. Keeping balanced tags prevents a translated line from
// swallowing the rest of a guide card, or losing the highlighted verb on a phone.
test('Vietnamese instructions retain balanced emphasis markup', () => {
  const tags = s => [...s.matchAll(/<\/?(?:b|i|strong|em)>/g)].map(m => m[0]);
  for (const [en, vi] of Object.entries(VI)) {
    assert.deepEqual(tags(vi).sort(), tags(en).sort(), en);
    const stack = [];
    for (const tag of tags(vi)) {
      if (tag[1] === '/') assert.equal(stack.pop(), tag.slice(2, -1), en);
      else stack.push(tag.slice(1, -1));
    }
    assert.deepEqual(stack, [], en);
  }
});

test('nested content names and decimal rates follow the selected language', async () => {
  const { setLanguage, t, tParams, num } = await import('../src/kit/i18n.mjs');
  const params = { name: 'The school', count: 2 };
  for (const lang of ['vi', 'en']) {
    await setLanguage(lang);
    const translated = tParams(params);
    assert.equal(translated.count, 2);
    assert.equal(params.name, 'The school', 'translation must not mutate game data');
    const message = t('Opens with the project "{name}"', translated);
    assert.ok(message.includes(lang === 'vi' ? VI['The school'] : 'The school'));
    assert.ok(!message.includes('{name}'));
    assert.equal(num(1234.5, 1), lang === 'vi' ? '1.234,5' : '1,234.5');
    assert.equal(num(1234.5), lang === 'vi' ? '1.235' : '1,235');
  }
});
