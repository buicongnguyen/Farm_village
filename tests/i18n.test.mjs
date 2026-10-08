// Every player-visible string has a Vietnamese line (the coverage rule from Willowmere).
// Strings are found two ways: t('…') / t("…") literals in src/, and the text fields of the content data (TEXT_FIELDS).
import './tz.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { VI } from '../src/i18n/vi.mjs';
import { PIP_LINES } from '../src/content/chatter.mjs';
import * as content from '../src/content/index.mjs';

// `orders`: each person's order lines; `ada`: Ada's line on a chapter card; `caption`: story panels; `tip`/`tips`: June;
// `first`/`idle`: Pip's speech bubbles; VILLAGE_NAME: the village's name on the HUD.
const TEXT_FIELDS = new Set(['name', 'title', 'subtitle', 'line', 'lines', 'text', 'story', 'label', 'hint', 'role', 'wish', 'comment', 'comments', 'needText', 'farm', 'ORDER_LINES',
  'orders', 'ada', 'caption', 'tip', 'tips', 'first', 'idle', 'restore', 'goal', 'kid', 'grown', 'VILLAGE_NAME']);
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
