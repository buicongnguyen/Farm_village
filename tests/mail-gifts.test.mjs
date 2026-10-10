// Mailbox gifts: letters carry a small present that matches them, given once; villagers post thank-you notes after orders.
import './tz.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/core/state.mjs';
import { act, tick } from '../src/core/act.mjs';
import { LETTERS } from '../src/content/letters.mjs';
import { GOODS } from '../src/content/goods.mjs';
import { BUILDINGS } from '../src/content/buildings.mjs';
import { letterOf, THANKS, unread } from '../src/core/bonds.mjs';
import { VI_MAIL } from '../src/i18n/vi-mail.mjs';
import { KO_MAIL } from '../src/i18n/ko-mail.mjs';
import { JA_MAIL } from '../src/i18n/ja-mail.mjs';
import { T0 } from './helpers.mjs';

const fresh = () => { const s = newGame(T0, 77, { restore: true }); tick(s, T0); return s; };
const must = (s, a, p, now = T0) => { const r = act(s, a, p, now); assert.equal(r.ok, true, `${a} refused: ${r.reason}`); return r; };
function fill(s, from, n = 1) {
  for (let i = 0; i < n; i++) {
    s.barn.items.wheat = (s.barn.items.wheat ?? 0) + 1;
    s.orders.cards.push({ id: `t${from}${s.stats.ordersFilled}${i}`, from, need: { wheat: 1 }, coins: 5, xp: 1 });
    must(s, 'deliverOrder', { id: s.orders.cards.at(-1).id });
  }
}

test('most letters carry a present that exists in the game; a few stay plain', () => {
  const gifted = LETTERS.filter(l => l.reward);
  assert.ok(gifted.length >= 15 && gifted.length < LETTERS.length, `${gifted.length} of ${LETTERS.length} letters have a gift`);
  for (const l of gifted) {
    const r = l.reward, kinds = Object.keys(r);
    assert.ok(kinds.length === 1 && ['coins', 'goods', 'decor'].includes(kinds[0]), `${l.id}: ${JSON.stringify(r)}`);
    if (r.coins) assert.ok(r.coins > 0 && r.coins <= 60, `${l.id} gives ${r.coins} coins`);
    if (r.decor) assert.ok(BUILDINGS[r.decor]?.cat === 'charm', `${l.id}: ${r.decor} is not a decoration`);
    for (const [g, n] of Object.entries(r.goods ?? {})) assert.ok(GOODS[g] && n > 0 && n <= 5, `${l.id}: ${n} ${g}`);
  }
});

test('opening a letter gives its present once; a letter read before the update gives nothing', () => {
  const s = fresh();
  s.mail = [{ id: 'ada-1', from: 'ada', at: T0, read: false }, { id: 'ellis-1', from: 'ellis', at: T0, read: true }, { id: 'gus-1', from: 'gus', at: T0, read: false }];
  const coins = s.coins;
  assert.deepEqual(must(s, 'readLetter', { id: 'ada-1' }).reward, { coins: 20 }); assert.equal(s.coins, coins + 20);
  assert.deepEqual(must(s, 'readLetter', { id: 'ada-1' }).reward, {}); assert.equal(s.coins, coins + 20, 'a second read paid again');
  const feed = s.barn.items.chicken_feed ?? 0;
  assert.deepEqual(must(s, 'readLetter', { id: 'ellis-1' }).reward, {}); assert.equal(s.barn.items.chicken_feed ?? 0, feed, 'an already-read letter paid out');
  const stored = s.stored.picket ?? 0;
  assert.deepEqual(must(s, 'readLetter', { id: 'gus-1' }).reward, { decor: 'picket' }); assert.equal(s.stored.picket, stored + 1, 'the decoration is kept to place later');
});

test('every fourth order for the same person brings a thank-you note with a small present', () => {
  const s = fresh(), before = s.mail.length;
  fill(s, 'ada', 3); fill(s, 'gus', 3);
  assert.equal(s.mail.filter(m => m.id.startsWith('thanks:')).length, 0, 'a note came early');
  fill(s, 'ada', 1);
  const note = s.mail.find(m => m.id.startsWith('thanks:'));
  assert.deepEqual({ id: note.id, from: note.from, read: note.read }, { id: 'thanks:ada:1', from: 'ada', read: false });
  assert.ok(s.mail.length >= before + 1 && unread(s) >= 1);
  const letter = letterOf(note.id), coins = s.coins, stock = { ...s.barn.items };
  assert.ok(THANKS.texts.includes(letter.text) && letter.reward);
  const got = must(s, 'readLetter', { id: note.id }).reward;
  assert.ok(got.coins ? s.coins === coins + got.coins : Object.entries(got.goods).every(([g, n]) => s.barn.items[g] === (stock[g] ?? 0) + n), 'the note gave nothing');
  assert.deepEqual(must(s, 'readLetter', { id: note.id }).reward, {});
});

test('thank-you notes rotate their words and presents, and old read ones are thinned out', () => {
  const s = fresh();
  for (let k = 1; k <= 12; k++) { fill(s, 'ada', 4); must(s, 'readLetter', { id: `thanks:ada:${k}` }); }
  const notes = s.mail.filter(m => m.id.startsWith('thanks:'));
  assert.ok(notes.length <= THANKS.keep, `${notes.length} thank-you notes kept`);
  assert.equal(new Set([1, 2, 3].map(k => letterOf(`thanks:ada:${k}`).text)).size, 3);
  assert.ok(s.mail.every(m => m.id.startsWith('thanks:') || LETTERS.some(l => l.id === m.id)), 'a story letter was thinned out');
});

test('the new mailbox words are translated in Vietnamese, Korean and Japanese', () => {
  for (const pack of [VI_MAIL, KO_MAIL, JA_MAIL]) for (const key of [...THANKS.texts, 'A gift is inside']) assert.ok(pack[key]?.length > 3, `missing: ${key}`);
});
