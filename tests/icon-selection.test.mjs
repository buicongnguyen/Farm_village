import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ICONS, SMALL_ICONS } from '../src/content/icons.mjs';
import { iconHtml, faceHtml, coinMark } from '../src/ui/icon.mjs';

test('chip classes select delivered small files, including menu aliases and portraits', () => {
  for (const [id, cls, file] of [['carrot', 'mini', 'carrot'], ['coin', 'mark', 'ui-coin'], ['today', 'mini extra', 'ui-today'],
    ['mail', 'status-icon', 'ui-mail'], ['wheat', 'seed', 'wheat'], ['ada', 'mini-face', 'person-ada']]) {
    assert.match(iconHtml(id, '', cls), new RegExp(`src="\\./assets/icons/sm/${file}\\.webp"`));
  }
  assert.match(faceHtml('ada', 'mini-face'), /\/sm\/person-ada\.webp/);
  assert.match(coinMark(), /\/sm\/ui-coin\.webp/);
});

test('large menu, family and item pictures retain the full asset', () => {
  for (const [id, cls, file] of [['carrot', 'icon', 'carrot'], ['today', 'btn-icon', 'ui-today'], ['family:tran', 'family-art', 'family-tran'],
    ['hospital', 'head-icon', 'hospital'], ['demolish', 'icon', 'tool-demolish'], ['cow', 'icon', 'cow'], ['hen', 'icon', 'hen']]) {
    const html = iconHtml(id, '', cls);
    assert.match(html, new RegExp(`src="\\./assets/icons/${file}\\.webp"`));
    assert.doesNotMatch(html, /\/sm\//);
  }
  assert.doesNotMatch(iconHtml('carrot', '', 'not-mini'), /\/sm\//, 'class matching must not catch partial class names');
});

test('unregistered icons preserve SVG or emoji fallback without inventing URLs', () => {
  assert.match(iconHtml('wrench', '', 'mini'), /<svg/);
  assert.equal(iconHtml('unknown-item', '', 'mini'), '');
  assert.match(iconHtml('unknown-item', '🌱', 'mini'), /🌱/);
  assert.doesNotMatch(iconHtml('wrench', '', 'mini'), /src=/);
});

function webpSize(buffer) {
  assert.equal(buffer.toString('ascii', 0, 4), 'RIFF'); assert.equal(buffer.toString('ascii', 8, 12), 'WEBP');
  for (let offset = 12; offset + 8 <= buffer.length;) {
    const type = buffer.toString('ascii', offset, offset + 4), size = buffer.readUInt32LE(offset + 4), at = offset + 8;
    if (type === 'VP8X') return [buffer.readUIntLE(at + 4, 3) + 1, buffer.readUIntLE(at + 7, 3) + 1];
    if (type === 'VP8 ') return [buffer.readUInt16LE(at + 6) & 0x3fff, buffer.readUInt16LE(at + 8) & 0x3fff];
    if (type === 'VP8L') { const bits = buffer.readUInt32LE(at + 1); return [(bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1]; }
    offset = at + size + (size & 1);
  }
  throw Error('WebP picture dimensions are missing');
}
test('every advertised small asset is a 64px WebP matching an existing full icon', () => {
  assert.deepEqual(Object.keys(SMALL_ICONS).sort(), Object.keys(ICONS).sort());
  for (const [id, url] of Object.entries(SMALL_ICONS)) {
    const file = new URL(`../public/${url.slice(2)}`, import.meta.url);
    assert.deepEqual(webpSize(readFileSync(file)), [64, 64], id);
  }
});
