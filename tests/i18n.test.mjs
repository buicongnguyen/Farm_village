// Every player-visible string has a Vietnamese line (the coverage rule from Willowmere).
// Strings are found two ways: t('…') / t("…") literals in src/, and the text fields of the content data (TEXT_FIELDS).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { VI } from '../src/i18n/vi.mjs';
import * as content from '../src/content/index.mjs';

const TEXT_FIELDS = new Set(['name', 'title', 'subtitle', 'line', 'lines', 'text', 'story', 'label', 'hint', 'role', 'wish', 'comment', 'comments', 'needText', 'farm', 'ORDER_LINES']);
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
    for (const m of text.matchAll(/(?:\bt\(|ctx\.fail\(|reason: )\s*(['"])((?:\\.|(?!\1).)*)\1/g)) { const s = m[2].replace(/\\(['"\\])/g, '$1'); if (!(s in VI)) missing.add(`${s}   (${file})`); }
  }
  assert.deepEqual([...missing], [], `missing Vietnamese:\n${[...missing].join('\n')}`);
});

test('every content text has a Vietnamese line', () => {
  const missing = [...contentStrings(content)].filter(s => !(s in VI));
  assert.deepEqual(missing, [], `missing Vietnamese:\n${missing.join('\n')}`);
});

test('Vietnamese lines keep the same placeholders', () => {
  const names = s => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',');
  const wrong = Object.entries(VI).filter(([en, vi]) => names(en) !== names(vi)).map(([en]) => en);
  assert.deepEqual(wrong, []);
});
