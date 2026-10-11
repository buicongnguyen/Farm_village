// Chapter 17, a share for everyone (docs/plan/ch17-a-share-for-everyone.md): the valley's value (assets times
// goodwill), the short form of big numbers, founding the valley company, dividends, who holds a share, the chapter.
import './tz.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/core/state.mjs';
import { act, tick } from '../src/core/act.mjs';
import { assetsOf, deedsOf, goodwillOf, valueOf, titleOf, companyPlan, dividendOf, shareholders } from '../src/core/valley.mjs';
import { VALLEY, PARCELS, HOTEL } from '../src/content/economy.mjs';
import { BUILDINGS } from '../src/content/buildings.mjs';
import { GOODS, ANIMALS } from '../src/content/goods.mjs';
import { VALUE_TITLES } from '../src/content/journey.mjs';
import { CHAPTERS, BEATS } from '../src/content/story.mjs';
import { resolveNames } from '../src/content/character-names.mjs';
import { shortIn } from '../src/kit/i18n.mjs';
import { stepDone } from '../src/core/projects.mjs';
import { reportOf } from '../src/core/report.mjs';
import * as grid from '../src/core/grid.mjs';
import { pack, unpack } from '../src/kit/save.mjs';
import { must, T0, MIN } from './helpers.mjs';

const { found, step, dividend, dividendMs, cap } = VALLEY, ch = CHAPTERS.find(c => c.id === 17);
/** A farm at the start of chapter 17 (the tester's jump): the walk upriver is behind it. */
function farm(seed = 4242) {
  const s = newGame(T0, seed, { restore: true }); tick(s, T0); must(s, 'testJumpChapter', { chapter: 17 }); tick(s, T0);
  s.coins = 90000; s.barn.cap = 9000; return s;
}
function spot(s, kind) { for (let z = 24; z <= 87; z++) for (let x = 32; x <= 95; x++) if (grid.canPlace(s, kind, x, z, 0).ok) return { x, z }; throw new Error(`no room for ${kind}`); }

test('big numbers have a short form in each language, and small ones are written out', () => {
  assert.deepEqual([0, 950, 9999, 12500, 1_200_000, 120_000_000, 1_000_000_000].map(n => shortIn('en', n)), ['0', '950', '9,999', '12.5K', '1.2M', '120M', '1B']);
  assert.deepEqual([12500, 1_200_000, 120_000_000, 1_000_000_000].map(n => shortIn('ko', n)), ['1.3만', '120만', '1.2억', '10억']);
  assert.deepEqual([12500, 1_200_000, 120_000_000, 1_000_000_000].map(n => shortIn('ja', n)), ['1.3万', '120万', '1.2億', '10億']);
  for (const n of [12500, 1_200_000, 1_000_000_000]) assert.ok(shortIn('vi', n).length <= 8 && /\d/.test(shortIn('vi', n)), shortIn('vi', n));
});
test('the valley\'s assets: coins, the barn at market price, what is built at its cost, land, works, the herd, beauty', () => {
  const s = farm(), a = assetsOf(s);
  assert.equal(a.coins, s.coins); assert.equal(a.barn, Object.entries(s.barn.items).reduce((sum, [g, n]) => sum + GOODS[g].value * n, 0));
  assert.equal(a.land, s.parcels.reduce((sum, _, i) => sum + PARCELS.cost(i + 1), 0)); assert.equal(a.herd, Object.values(s.animals).flat().reduce((sum, x) => sum + ANIMALS[x.kind].price, 0));
  assert.ok(a.buildings >= BUILDINGS.apartment.cost + BUILDINGS.hotel.cost + BUILDINGS.halt.cost, 'the quay\'s three buildings are in it'); assert.ok(a.works > 0 && a.beauty > 0);
  assert.equal(a.total, a.coins + a.barn + a.buildings + a.land + a.works + a.herd + a.beauty); assert.ok(Number.isFinite(a.total) && a.total > 50000);
  // spending converts: buying a building, a field, an animal or a floor never makes the total fall
  for (const [name, spend] of [['a bakery', t => must(t, 'place', { kind: 'bench', ...spot(t, 'bench') })], ['a pond', t => must(t, 'place', { kind: 'pond', ...spot(t, 'pond') })],
    ['a hotel floor', t => { tick(t, T0); must(t, 'upgradeHotel', {}); }], ['a bed', t => must(t, 'place', { kind: 'bed', ...spot(t, 'bed') })]]) {
    const t = farm(7), before = assetsOf(t).total, coins = t.coins; spend(t);
    assert.ok(t.coins < coins || name === 'a bed', `${name} cost nothing`); assert.ok(assetsOf(t).total >= before, `${name}: ${assetsOf(t).total} < ${before}`);
  }
  s.barn.items.bread = (s.barn.items.bread ?? 0) + 10; assert.equal(assetsOf(s).total, a.total + 10 * GOODS.bread.value);
});
test('goodwill grows with every deed done together, and the value is assets times goodwill', () => {
  const s = farm(); s.stats.marketDays = 0; s.stats.cooperativeOrders = 0; s.stats.trains = 0; s.stats.harvestFestivals = 0; s.stats.guests = 0; s.stats.fairs = 0;
  assert.equal(deedsOf(s), 0); assert.equal(goodwillOf(s), 1); assert.equal(valueOf(s), assetsOf(s).total);
  s.stats.marketDays = 3; s.stats.cooperativeOrders = 2; s.stats.trains = 1; s.stats.harvestFestivals = 1; s.stats.guests = 4 * VALLEY.guests + VALLEY.guests - 1;
  assert.equal(deedsOf(s), 3 + 2 + 1 + 1 + 4); assert.ok(Math.abs(goodwillOf(s) - step ** 11) < 1e-9); assert.equal(valueOf(s), Math.round(assetsOf(s).total * step ** 11));
  const before = valueOf(s); s.stats.trains++; assert.ok(valueOf(s) > before, 'one more train makes the valley worth more');
  s.stats.guests = 1e9; assert.equal(deedsOf(s), VALLEY.deeds, 'there is an end to it'); assert.ok(Number.isFinite(valueOf(s)));
  // the titles: one for every mark, in rising order
  assert.deepEqual(VALUE_TITLES.map(x => x.at), [1e5, 1e6, 1e7, 1e8, 1e9]); assert.equal(titleOf(99_999).title, null); assert.equal(titleOf(99_999).next.at, 1e5);
  assert.equal(titleOf(1e5).title.name, 'A going farm'); assert.equal(titleOf(5e8).title.at, 1e8); assert.equal(titleOf(2e9).title.at, 1e9); assert.equal(titleOf(2e9).next, null);
});
test('founding the valley company: the co-operative, the office, a quay house and the founding sum; once', () => {
  const s = farm(); let plan = companyPlan(s);
  assert.deepEqual(plan.needs.map(n => n.id), ['chapter', 'cooperative', 'office', 'quay', 'coins']); assert.ok(plan.ok, JSON.stringify(plan));
  assert.ok(BEATS.find(b => b.id === 'ledger').when(s)); assert.equal(ch.when(s), false); assert.equal(dividendOf(s, T0).waiting, 0);
  assert.equal(act(s, 'collectDividend', {}, T0).reason, 'The valley company is not founded yet');
  for (const [name, spoil] of [['the walk', t => { t.story.chapter = 15; }], ['the co-operative', t => { delete t.cooperative; }], ['the office', t => { for (const id of Object.keys(t.placed)) if (t.placed[id].kind === 'company') t.cond[id] = { level: 3 }; }],
    ['a quay house', t => { t.counts.apartment = 0; }], ['the sum', t => { t.coins = found - 1; }]]) {
    const t = farm(9); spoil(t); const before = JSON.stringify(t);
    assert.equal(companyPlan(t).ok, false, `founded without ${name}`); assert.equal(act(t, 'foundValley', {}, T0).ok, false); assert.equal(JSON.stringify(t), before);
  }
  const coins = s.coins, value = assetsOf(s).total, r = must(s, 'foundValley', {});
  assert.equal(s.coins, coins - found); assert.equal(s.valley.founded, T0); assert.equal(s.valley.dividendFrom, T0); assert.equal(assetsOf(s).total, value, 'the founding sum became part of the valley\'s works');
  assert.ok(r.events.some(e => e.type === 'valleyFounded' && e.shares >= 8)); assert.ok(ch.when(s)); assert.ok(stepDone(s, 'valley_company'));
  assert.equal(act(s, 'foundValley', {}, T0).reason, 'The valley company is founded already'); assert.equal(s.coins, coins - found);
  const back = unpack(pack(s)); assert.equal(back.valley.founded, T0); assert.equal(valueOf(back), valueOf(s));
});
test('every household holds a share: yours, each family, each villager and neighbour who has come, and the families on the quay as a number', () => {
  const s = farm(), who = shareholders(s, T0);
  assert.ok(who.people.includes('ada') && who.people.includes('mai') && who.people.includes('gus') && who.people.includes('priya') && who.people.includes('twins'));
  for (const id of ['cora', 'hazel', 'hugo', 'pearl', 'bea', 'tuyet']) assert.ok(who.people.includes(id), `${id} holds no share`);
  assert.ok(!who.people.includes('albright') && !who.people.includes('june') && !who.people.includes('pip'), 'one share for a household, none for a visitor');
  assert.equal(new Set(who.people).size, who.people.length); assert.equal(who.returned, s.stats.returned); assert.ok(who.returned >= 4);
  const families = Object.values(s.homes).filter(h => h.family && h.arrivesAt <= T0).length; assert.ok(families >= 4); assert.equal(who.people.length, 1 + families + 6 + 4);
});
test('the dividend: a share of the assets every ten minutes, a few payments waiting at most, collected once', () => {
  const s = farm(); must(s, 'foundValley', {});
  assert.equal(dividendOf(s, T0 + dividendMs - 1).waiting, 0); assert.equal(act(s, 'collectDividend', {}, T0 + 1000).reason, 'No dividend is waiting yet');
  const each = Math.round(assetsOf(s).total * dividend); let d = dividendOf(s, T0 + dividendMs);
  assert.deepEqual([d.each, d.payments, d.waiting, d.nextAt], [each, 1, each, T0 + 2 * dividendMs]);
  d = dividendOf(s, T0 + 99 * dividendMs); assert.equal(d.payments, cap); assert.equal(d.nextAt, null, 'no more can wait');
  const at = T0 + 2.5 * dividendMs, coins = s.coins, got = must(s, 'collectDividend', {}, at);
  assert.equal(got.coins, 2 * each); assert.equal(s.coins, coins + 2 * each); assert.ok(got.events.some(e => e.type === 'coins' && e.source === 'dividend'));
  assert.equal(reportOf(s).rows.find(([k]) => k === 'dividend')?.[1], 2 * each); assert.ok(BEATS.find(b => b.id === 'first-dividend').when(s));
  assert.equal(dividendOf(s, at).waiting, 0); assert.equal(dividendOf(s, at + 0.5 * dividendMs).payments, 1, 'the half already waited for is kept');
  must(s, 'collectDividend', {}, T0 + 500 * dividendMs); assert.equal(s.valley.dividendFrom, T0 + 500 * dividendMs, 'a full till starts again from now');
  assert.ok(each > 0 && each < assetsOf(s).total / 100, 'a dividend is a small part of the valley, on its assets and not on its name');
});
test('chapter 17 closes when the company is founded; the tester can jump past it', () => {
  assert.ok(ch && ch.panels.length === 3 && ch.ada); const en = resolveNames(ch.text, 'en'); assert.ok(en.length <= 340, `${en.length} letters`); assert.match(en, /Penny/); assert.match(en, /Bramble reads his three times/);
  for (const id of ['ledger', 'first-dividend']) assert.equal(BEATS.find(b => b.id === id).chapter, 17);
  const t = newGame(T0, 3, { restore: true }); tick(t, T0); const r = must(t, 'testJumpChapter', { chapter: 18 });
  assert.deepEqual(r.missing, []); assert.equal(t.story.chapter, 17); assert.ok(t.valley.founded && ch.when(t)); assert.ok(valueOf(t) > 0);
  const u = farm(5); must(u, 'testFinishChapter', {}); assert.ok(ch.when(u));
});
