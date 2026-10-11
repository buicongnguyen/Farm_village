import './tz.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, migrate } from '../src/core/state.mjs';
import { act, tick } from '../src/core/act.mjs';
import { tickShops, shopStatus, normalizeShops } from '../src/core/shops.mjs';
import { SHOP_WAIT_MS, SHOP_SKIP_MS } from '../src/content/shops.mjs';
import { GOODS } from '../src/content/goods.mjs';
import { stepIndex } from '../src/core/projects.mjs';
import * as barn from '../src/core/barn.mjs';
import { Game } from '../src/game.mjs';
const NOW = 1_800_000_000_000;
function fixture() {
  const s = newGame(NOW, 8841); s.level = 10; s.story.tutorial = 999; s.projects.step = 999;
  s.barn.items = { perch: 4, bread: 20, herb: 10, carrot: 20 };
  tickShops({ s, now: NOW }); return s;
}
test('new idle shop requests notify normal autosave once without a news badge or payment', () => {
  const s = fixture(); s.shops = {};
  const game = new Game(s, () => NOW), updates = [];
  game.on((result, action) => { if (action === 'tick' && result.events.some(e => e.type === 'shopRequest')) updates.push(result); });
  const coins = s.coins;
  game.tick();
  assert.equal(updates.length, 1);
  assert.equal(updates[0].events.filter(e => e.type === 'shopRequest').length, 4);
  assert.equal(s.coins, coins);
  assert.ok(!(s.news ?? []).some(e => e.type === 'shopRequest'));
  game.tick(); assert.equal(updates.length, 1);
});
test('shop quotes are pure, obtainable, exact premiums and never reserve goods', () => {
  const s = fixture(), before = structuredClone(s);
  for (const id of ['fish', 'snacks', 'flowers', 'plaza']) {
    const st = shopStatus(s, id, NOW);
    assert.ok(st.offer && st.canSell); assert.ok(st.coins > st.base);
    assert.equal(st.coins, Math.ceil(GOODS[st.offer.good].value * 1.35) * st.offer.n);
  }
  assert.deepEqual(s, before);
});
test('one sale takes only quoted goods, pays once and starts a bounded cooldown', () => {
  const s = fixture(), st = shopStatus(s, 'fish', NOW), before = s.coins, xp = s.xp;
  const payload = { shop: 'fish', offer: st.offer.id };
  assert.ok(act(s, 'sellToShop', payload, NOW).ok);
  assert.equal(s.coins, before + st.coins); assert.equal(s.barn.items.perch, 3); assert.equal(s.xp, xp);
  assert.equal(s.shops.fish.nextAt, NOW + SHOP_WAIT_MS);
  const after = structuredClone(s); assert.equal(act(s, 'sellToShop', payload, NOW).ok, false); assert.deepEqual(s, after);
  tickShops({ s, now: NOW + SHOP_WAIT_MS - 1 }); assert.equal(s.shops.fish.offer, null);
  tickShops({ s, now: NOW + SHOP_WAIT_MS }); assert.notEqual(s.shops.fish.offer.id, payload.offer);
});
test('requests persist through a long absence and migration; loading never pays', () => {
  const s = fixture(), before = structuredClone(s.shops);
  tickShops({ s, now: NOW + 40 * 86400e3 }); assert.deepEqual(s.shops, before);
  const loaded = migrate(structuredClone(s)); assert.deepEqual(loaded.shops, before); assert.equal(loaded.coins, s.coins);
  const legacy = newGame(NOW, 42); delete legacy.shops; legacy.version = 9;
  const updated = migrate(legacy); assert.ok(Object.values(updated.shops).every(r => r.offer === null));
});
test('missing goods, unknown shops and stale quotes refuse without changing state', () => {
  const s = fixture(); s.barn.items.perch = 0;
  for (const payload of [{ shop: 'fish', offer: s.shops.fish.offer.id }, { shop: 'missing' }, { shop: 'fish', offer: 'fish:999' }]) {
    const before = structuredClone(s); assert.equal(act(s, 'sellToShop', payload, NOW).ok, false); assert.deepEqual(s, before);
  }
});
test('shops preserve bread held for the second cottage, including partially delivered projects', () => {
  for (const delivered of [0, 2]) {
    const s = fixture(), held = 5 - delivered;
    s.projects = { step: stepIndex('cottage2'), delivered: { bread: delivered } };
    s.shops.snacks = { serial: 0, nextAt: 0, offer: { id: 'snacks:0', good: 'bread', n: 3 } };
    s.barn.items.bread = held + 2;
    const payload = { shop: 'snacks', offer: 'snacks:0' };
    assert.deepEqual(barn.held(s), { bread: held });
    assert.equal(shopStatus(s, 'snacks', NOW).have, 2);
    assert.equal(shopStatus(s, 'snacks', NOW).canSell, false);
    const before = structuredClone(s);
    assert.equal(act(s, 'sellToShop', payload, NOW).ok, false);
    assert.deepEqual(s, before);

    // One more loaf supplies the complete shop basket without borrowing from the project.
    s.barn.items.bread++;
    const quoted = shopStatus(s, 'snacks', NOW), coins = s.coins;
    assert.equal(quoted.canSell, true);
    assert.equal(act(s, 'sellToShop', payload, NOW).ok, true);
    assert.equal(s.barn.items.bread, held);
    assert.equal(barn.free(s, 'bread'), 0);
    assert.equal(s.coins, coins + quoted.coins);
    assert.deepEqual(s.projects, before.projects);
  }
});
test('free replacement consumes nothing, waits five minutes and rejects stale clicks', () => {
  const s = fixture(), st = shopStatus(s, 'snacks', NOW), coins = s.coins, stock = structuredClone(s.barn.items);
  const payload = { shop: 'snacks', offer: st.offer.id };
  assert.ok(act(s, 'changeShopRequest', payload, NOW).ok);
  assert.equal(s.shops.snacks.nextAt, NOW + SHOP_SKIP_MS); assert.equal(s.coins, coins); assert.deepEqual(s.barn.items, stock);
  const after = structuredClone(s); assert.equal(act(s, 'changeShopRequest', payload, NOW).ok, false); assert.deepEqual(s, after);
});
test('shop locks apply even to imported inventory and no sources create no phantom request', () => {
  const s = newGame(NOW, 44); s.level = 1; s.barn.items = { ginseng: 99 }; tickShops({ s, now: NOW });
  assert.deepEqual(s.shops, {});
  s.level = 10; s.barn.items = {}; tickShops({ s, now: NOW }); assert.deepEqual(s.shops, {});
  const old = fixture(); old.level = 1; const before = structuredClone(old);
  assert.equal(act(old, 'sellToShop', { shop: 'flowers', offer: old.shops.flowers.offer.id }, NOW).ok, false); assert.deepEqual(old, before);
});
test('normalization rejects forged offer quantities and counters without rewards', () => {
  const s = fixture(); s.shops.fish.offer.n = -100;
  assert.equal(normalizeShops(s).fish.offer, null);
  s.shops.fish.serial = Infinity; assert.equal(normalizeShops(s).fish.serial, 0);
});
test('unsupported imported goods never become a shop request', () => {
  const s = newGame(NOW, 93); s.level = 10; s.barn.items = { strawberry: 8, bogus: 10 };
  tickShops({ s, now: NOW }); assert.deepEqual(s.shops, {});
  s.shops.plaza = { serial: 0, nextAt: 0, offer: { id: 'plaza:0', good: 'strawberry', n: 4 } };
  assert.equal(shopStatus(s, 'plaza', NOW).offer, null);
  assert.equal(normalizeShops(s).plaza.offer, null);
});
test('a backward clock never extends a promised replacement wait beyond five minutes', () => {
  const s = fixture(); act(s, 'changeShopRequest', { shop: 'snacks', offer: s.shops.snacks.offer.id }, NOW);
  const back = NOW - 86400e3; tick(s, back);
  assert.equal(s.shops.snacks.nextAt - back, SHOP_SKIP_MS);
});
