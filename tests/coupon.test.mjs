// The coupon (docs/plan/00-tester-tools.md C): a code switches the tester's tools on for one farm; any amount of coins;
// instant mode. The owner's code is kept as a hash, so these tests add a code of their own to the table.
import './tz.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/core/state.mjs';
import { act, tick } from '../src/core/act.mjs';
import { COUPONS, couponKey, testerOn } from '../src/core/testmode.mjs';
import { festivalOf } from '../src/core/festival.mjs';
import { fairOf } from '../src/core/fair.mjs';
import { CROPS, RECIPES } from '../src/content/goods.mjs';
import { FAMILY_ARRIVAL_MS, FAIR, FESTIVAL_DAY } from '../src/content/economy.mjs';
import { pack, unpack } from '../src/kit/save.mjs';
import { must, T0 } from './helpers.mjs';

const CODE = 'Harvest-Moon-42';
COUPONS[couponKey(CODE)] = { tester: true };
const farm = (chapter = 0) => { const s = newGame(T0, 4242, { restore: true }); tick(s, T0); if (chapter) { must(s, 'testJumpChapter', { chapter }); tick(s, T0); } return s; };

test('a coupon switches the tester\'s tools on for this farm, once; a wrong code changes nothing', () => {
  const s = farm(); assert.equal(testerOn(s), false);
  for (const code of ['', '   ', 'hollowbrook', 'open sesame', undefined, null, 42, 'Harvest-Moon-43']) {
    const before = JSON.stringify(s), r = act(s, 'redeemCoupon', { code }, T0); assert.equal(r.ok, false, String(code)); assert.equal(r.reason, 'That code is not known'); assert.equal(JSON.stringify(s), before);
  }
  const r = must(s, 'redeemCoupon', { code: `  ${CODE.toUpperCase()} ` }, T0 + 5);   // spaces and capitals do not matter
  assert.ok(r.events.some(e => e.type === 'couponRedeemed')); assert.equal(s.tester.coupon, T0 + 5); assert.ok(testerOn(s));
  assert.equal(act(s, 'redeemCoupon', { code: CODE }, T0 + 9).reason, 'This farm has its tester tools already'); assert.equal(s.tester.coupon, T0 + 5);
  assert.ok(testerOn(unpack(pack(s))), 'the tools stay on after saving and loading');
  // the words of a real code are not in the table: only numbers
  assert.ok(Object.keys(COUPONS).length >= 2); for (const k of Object.keys(COUPONS)) assert.match(k, /^\d+$/);
  assert.equal(couponKey(' abc '), couponKey('ABC')); assert.notEqual(couponKey('abc'), couponKey('abd'));
});
test('any amount of coins, up to a billion at a time', () => {
  const s = farm(), coins = s.coins;
  assert.equal(must(s, 'testAddCoins', { coins: 250000 }).coins, coins + 250000); assert.equal(must(s, 'testAddCoins', { coins: 1e9 }).coins, coins + 250000 + 1e9);
  for (const bad of [0, -1, 1.5, 1e9 + 1, '500', NaN]) { const before = s.coins; assert.equal(act(s, 'testAddCoins', { coins: bad }, T0).ok, false, String(bad)); assert.equal(s.coins, before); }
});
test('instant mode: what the farm starts is done at once, and stays so while it is on', () => {
  const s = farm(), bed = Object.keys(s.placed).find(id => s.placed[id].kind === 'bed'), crop = Object.keys(CROPS).find(c => CROPS[c].level <= s.level);
  s.barn.items[crop] = 0; s.beds[bed] = { crop, doneAt: T0 + CROPS[crop].growMs };
  const cottage = Object.keys(s.homes)[0]; if (cottage) Object.assign(s.homes[cottage], { family: s.homes[cottage].family ?? 'tran', arrivesAt: T0 + FAMILY_ARRIVAL_MS, rentFrom: T0 + FAMILY_ARRIVAL_MS });
  s.repairing = { [bed]: { doneAt: T0 + 30000 } }; (s.truck ??= { level: 1, away: false, backAt: 0, load: [], coins: 0, fleet: [] }).away = true; s.truck.backAt = T0 + 50000;
  tick(s, T0 + 1000); assert.ok(s.beds[bed].doneAt > T0 + 1000, 'nothing is hurried while instant mode is off');
  const r = must(s, 'testInstant', { on: true }, T0 + 2000); assert.equal(r.instant, true); assert.ok(r.events.some(e => e.type === 'instantMode' && e.on));
  assert.ok(s.beds[bed].doneAt <= T0 + 2000); assert.ok(!cottage || s.homes[cottage].arrivesAt <= T0 + 2000); assert.ok(s.truck.backAt <= T0 + 2000);
  tick(s, T0 + 3000); assert.equal(s.repairing[bed], undefined, 'the repair is finished');
  // something started later is done on the next tick
  must(s, 'harvest', { ids: [bed] }, T0 + 3000); s.beds[bed] = { crop, doneAt: T0 + 3000 + CROPS[crop].growMs }; tick(s, T0 + 4000); assert.ok(s.beds[bed].doneAt <= T0 + 4000);
  const mill = Object.keys(s.placed).find(id => s.production?.[id] || RECIPES && s.placed[id].kind === 'feed_mill');
  if (mill && s.production?.[mill]?.queue?.length) { for (const j of s.production[mill].queue) j.doneAt = T0 + 9e6; tick(s, T0 + 5000); assert.ok(s.production[mill].queue.every(j => j.doneAt <= T0 + 5000)); }
  // off again: the next crop takes its time
  must(s, 'testInstant', { on: false }, T0 + 6000); s.beds[bed] = { crop, doneAt: T0 + 6000 + CROPS[crop].growMs }; tick(s, T0 + 7000); assert.ok(s.beds[bed].doneAt > T0 + 7000);
  assert.equal(unpack(pack(s)).tester.instant, false);
});
test('instant mode ends the rest between festivals and fairs, but not a festival or a fair that is running', () => {
  const s = farm(19); must(s, 'testInstant', { on: true }, T0);
  s.barn.items = { bread: 30, wheat: 30, perch: 30, corn: 30, carrot: 30, egg: 30, apple: 30, pumpkin: 30 }; s.barn.cap = 9000; s.coins = 90000;
  const held = must(s, 'holdFair', {}, T0 + 1000); tick(s, T0 + 2000);
  assert.ok(fairOf(s, T0 + 2000).active, 'the fair that is running keeps its time'); assert.equal(s.fair.until, held.until);
  tick(s, held.until + 1000); const f = fairOf(s, held.until + 1000); assert.equal(f.active, false); assert.ok(f.readyAt <= held.until + 1000, 'the valleys need no rest'); assert.equal(s.stats.fairs >= 1, true);
  assert.ok(must(s, 'holdFair', {}, held.until + 2000).until > held.until, 'and the next fair can be held at once');
  const fest = festivalOf(s, held.until + 3000);
  if (fest.ok) { const e = must(s, 'holdFestival', {}, held.until + 3000); tick(s, held.until + 4000); assert.ok(festivalOf(s, held.until + 4000).active); tick(s, e.until + 1000); assert.ok(festivalOf(s, e.until + 1000).readyAt <= e.until + 1000); }
  assert.ok(FAIR.everyMs > 0 && FESTIVAL_DAY.everyMs > 0);
});
