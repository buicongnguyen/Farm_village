// The rules core (src/core/): every module through the real act() and tick().
import './tz.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { act, tick, ACTIONS } from '../src/core/act.mjs';
import * as grid from '../src/core/grid.mjs';
import * as barn from '../src/core/barn.mjs';
import { charmOf, rentWaiting } from '../src/core/homes.mjs';
import { currentStep, stepReady, mayBuild } from '../src/core/projects.mjs';
import { planDay } from '../src/core/neighbours.mjs';
import { dayKey, shortTime } from '../src/core/clock.mjs';
import { migrate, SAVE_VERSION } from '../src/core/state.mjs';
import { CROPS, RECIPES } from '../src/content/goods.mjs';
import { game, must, setLevel, tutorial, layPath, spine, fenceRect, clearRect, T0, MIN, HOUR } from './helpers.mjs';

/** The crop beds (s.placed also holds the streak garden's flowers). */
const bedsOf = s => Object.keys(s.placed).filter(id => s.placed[id].kind === 'bed');

test('a new game starts with coins, wheat, one parcel and Ada\'s first order', () => {
  const s = game();
  assert.equal(s.level, 1); assert.equal(s.barn.items.wheat, 6); assert.deepEqual(s.parcels, ['0,2']);
  assert.equal(s.orders.cards.length, 3);
  assert.deepEqual(s.orders.cards[0].need, { wheat: 6 }); assert.equal(s.orders.cards[0].from, 'ada');
  assert.equal(currentStep(s).id, 'clear');
});

test('the tutorial steps complete the first two projects', () => {
  const s = game();
  tutorial(s);
  assert.equal(currentStep(s).id, 'mill_coop');
});

test('placement rules: land, overlap, cleared cells and the door path', () => {
  const s = game(); tutorial(s); setLevel(s, 3); s.coins = 5000;
  assert.equal(grid.canPlace(s, 'bed', 60, 57).reason, 'Outside your land');            // parcel 1,2 is not owned
  assert.equal(grid.canPlace(s, 'bed', 32, 57).reason, 'Overlaps something');           // a bed is there
  assert.equal(grid.canPlace(s, 'bed', 34, 59).ok, true);                               // cleared tutorial weed
  assert.equal(grid.canPlace(s, 'cottage', 34, 58).reason, 'Only in the village');
  assert.equal(grid.canPlace(s, 'bed', 29, 60).reason, 'Not on the road or the water');
  // a feed mill whose door has no path is refused; facing the spine it is fine
  assert.equal(grid.canPlace(s, 'feed_mill', 32, 66, 0).reason, 'Needs a path from the door to the road');   // door at (33, 68)
  assert.equal(grid.canPlace(s, 'feed_mill', 32, 64, 2).ok, true);
});

test('refused actions leave the state untouched', () => {
  const s = game(); const before = JSON.stringify(s);
  for (const [action, payload] of [['plant', { id: 'nope', crop: 'wheat' }], ['harvest', { id: 'nope' }], ['place', { kind: 'cottage', x: 40, z: 95 }],
    ['clear', { x: 0, z: 0 }], ['deliverOrder', { id: 'no-such-order' }], ['feed', {}], ['collect', {}], ['produce', { building: 'x', recipe: 'bread' }],
    ['buyParcel', { parcel: '1,2' }], ['upgradeBarn', {}], ['projectDeliver', {}], ['collectRent', {}], ['trade', { id: 'nobody', accept: true }], ['stallCollect', {}]]) {
    const r = act(s, action, payload, T0);
    assert.equal(r.ok, false, `${action} should be refused`);
  }
  if (s.coins < 400) assert.equal(JSON.stringify(s), before);
  assert.ok(Object.keys(ACTIONS).length >= 25);
});

test('farming: plant from the barn, free wheat, harvest two, the first wheat is quick', () => {
  const s = game(); tutorial(s);
  const beds = bedsOf(s);
  must(s, 'plant', { ids: beds, crop: 'wheat' });
  assert.equal(s.barn.items.wheat, 6, 'wheat is free to plant');
  assert.equal(act(s, 'harvest', { ids: beds }, T0 + 10_000).ok, false);
  must(s, 'harvest', { ids: beds }, T0 + 16_000);                                          // the tutorial's 15 s first wheat
  assert.equal(s.barn.items.wheat, 6 + 12);
  must(s, 'plant', { ids: beds, crop: 'wheat' }, T0 + 16_000);                              // after that, wheat takes 20 seconds
  assert.equal(act(s, 'harvest', { ids: beds }, T0 + 30_000).ok, false);
  must(s, 'deliverOrder', { id: s.orders.cards[0].id }, T0 + 40_000);
  assert.ok(s.level >= 2, 'the first order and harvests reach level 2');
});

test('never stuck: a crop you have none of can be bought at its base price', () => {
  const s = game(); tutorial(s); setLevel(s, 2); s.coins = 10;
  const bed = bedsOf(s)[0];
  must(s, 'plant', { id: bed, crop: 'carrot' });
  assert.equal(s.coins, 10 - CROPS.carrot.value);
});

test('the barn caps storage; the harvest that does not fit is sold on the spot, never lost or stuck', () => {
  const s = game(); tutorial(s); s.barn.items.wheat = 49;
  const beds = bedsOf(s);
  must(s, 'plant', { ids: beds, crop: 'wheat' }); s.story.firstWheat = false;
  const r = act(s, 'harvest', { ids: beds }, T0 + HOUR);
  const coins = s.coins; assert.equal(r.ok, true); assert.ok(s.barn.items.wheat <= 50, 'never over the cap'); assert.ok(s.coins > coins || s.stats.coinsEarned > 0, 'the extra is sold');
  s.coins = 500; must(s, 'upgradeBarn', {}); assert.equal(s.barn.cap, 150);
  s.barn.items.wheat = 20; const c2 = s.coins; must(s, 'sellGood', { good: 'wheat', n: 5 }); assert.equal(s.barn.items.wheat, 15); assert.equal(s.coins, c2 + 5 * 2);
});

function millAndCoop(s) {
  tutorial(s); setLevel(s, 3); s.coins = 5000;
  layPath(s, spine(47).filter(([x]) => x > 39));
  const mill = must(s, 'place', { kind: 'feed_mill', x: 32, z: 64, rot: 2 }).id;
  const coop = must(s, 'place', { kind: 'coop', x: 35, z: 64, rot: 2 }).id;
  return { mill, coop };
}
test('animals need no fence work: buy hens, then they eat feed and give produce', () => {
  const s = game(); const { mill, coop } = millAndCoop(s);
  fenceRect(s, 35, 64, 38, 67, 38);
  const coins = s.coins; must(s, 'buyAnimal', { home: coop }); must(s, 'buyAnimal', { home: coop });
  assert.equal(s.coins, coins, 'the first two hens are free');
  assert.equal(act(s, 'feed', {}).reason, 'No feed in the barn: make some at the feed mill');
  must(s, 'produce', { building: mill, recipe: 'chicken_feed' });
  must(s, 'collectProducts', { building: mill }, T0 + 5 * MIN);
  must(s, 'feed', {}, T0 + 5 * MIN);
  must(s, 'collect', {}, T0 + 25 * MIN);
  assert.equal(s.barn.items.egg, 2);
});

test('production queues run one after another and need free slots', () => {
  const s = game(); const { mill } = millAndCoop(s); s.barn.items.wheat = 30;
  const a = must(s, 'produce', { building: mill, recipe: 'chicken_feed' }), b = must(s, 'produce', { building: mill, recipe: 'chicken_feed' });
  assert.equal(b.doneAt - a.doneAt, RECIPES.chicken_feed.timeMs);
  assert.equal(act(s, 'produce', { building: mill, recipe: 'chicken_feed' }).reason, 'The queue is full');
  must(s, 'buySlot', { building: mill });
  must(s, 'produce', { building: mill, recipe: 'chicken_feed' });
});

test('build order: goods are held for the project and the school needs two families with children', () => {
  const s = game(); millAndCoop(s); setLevel(s, 6); s.coins = 20000;
  assert.equal(currentStep(s).id, 'cottage1');
  must(s, 'place', { kind: 'path', x: 35, z: 92 }); must(s, 'place', { kind: 'cottage', x: 34, z: 93, rot: 2 });
  assert.equal(currentStep(s).id, 'cottage2');
  assert.equal(mayBuild(s, 'cottage').ok, false, 'cottage 2 waits for its bread');
  s.barn.items.bread = 5;
  // an order for bread cannot use the held loaves
  s.orders.cards.push({ id: 'ob', from: 'ada', need: { bread: 2 }, coins: 30, xp: 5, readyAt: T0 });
  assert.equal(act(s, 'deliverOrder', { id: 'ob' }).reason, 'Held for the project');
  must(s, 'projectDeliver', {});
  must(s, 'place', { kind: 'path', x: 39, z: 92 }); must(s, 'place', { kind: 'cottage', x: 38, z: 93, rot: 2 });
  assert.equal(currentStep(s).id, 'school');
  assert.equal(stepReady(s, T0).ok, false, 'the families have not arrived yet');
  tick(s, T0 + 3 * MIN);
  assert.equal(stepReady(s, T0 + 3 * MIN).ok, true);
  s.barn.items.bread = 24; s.barn.items.corn_bread = 10;
  must(s, 'projectDeliver', {}, T0 + 3 * MIN);
  must(s, 'place', { kind: 'path', x: 46, z: 92 }, T0 + 3 * MIN);
  const coins = s.coins; must(s, 'place', { kind: 'school', x: 44, z: 93, rot: 2 }, T0 + 3 * MIN);
  assert.equal(coins - s.coins, 4000);
  assert.equal(currentStep(s).id, 'cottages34');
});

test('rent: families pay hourly, more with charm, capped at 8 hours', () => {
  const s = game(); millAndCoop(s); setLevel(s, 4); s.coins = 5000;
  must(s, 'place', { kind: 'path', x: 35, z: 92 });
  const id = must(s, 'place', { kind: 'cottage', x: 34, z: 93, rot: 2 }).id;
  tick(s, T0 + 2 * MIN);
  const base = charmOf(s, id);
  must(s, 'place', { kind: 'flowers', x: 37, z: 94 }); must(s, 'place', { kind: 'bench', x: 37, z: 95 });
  assert.equal(charmOf(s, id), base + 3);
  const oneHour = rentWaiting(s, T0 + 2 * MIN + HOUR), day = rentWaiting(s, T0 + 2 * MIN + 24 * HOUR);
  assert.ok(oneHour >= 10 && oneHour <= 18, `one hour of rent: ${oneHour}`);
  assert.ok(Math.abs(day - oneHour * 8) <= 8, 'capped at 8 hours');
  must(s, 'collectRent', {}, T0 + 10 * HOUR);
  assert.equal(rentWaiting(s, T0 + 10 * HOUR), 0);
});

test('orders: the board fills to its slots, one card is always fillable, discards wait 5 minutes', () => {
  const s = game(); setLevel(s, 5); tick(s, T0 + 1000);
  assert.equal(s.orders.cards.length, 5);
  const id = s.orders.cards[1].id; must(s, 'discardOrder', { id }, T0 + 1000);
  tick(s, T0 + 2 * MIN); assert.equal(s.orders.cards.length, 4);
  tick(s, T0 + 6 * MIN); assert.equal(s.orders.cards.length, 5);
  assert.equal(act(s, 'discardOrder', { id: s.orders.cards[0].id }, T0).reason, 'This one is part of the story');
});

test('neighbours: the same day plans the same visits; visits speed up growing crops', () => {
  const s = game(); tutorial(s);
  assert.deepEqual(planDay(s, 'mai', T0), planDay(s, 'mai', T0 + HOUR));
  s.story.firstWheat = false;
  const beds = bedsOf(s); must(s, 'plant', { ids: beds, crop: 'wheat' }); setLevel(s, 5);
  for (const b of beds) s.beds[b].doneAt = T0 + 10 * HOUR;
  const visit = s.neighbours.mai.visits[0];
  const { events } = tick(s, visit + 1);
  assert.ok(events.some(e => e.type === 'neighbourVisit' && e.helped === 3));
  assert.equal(Object.values(s.beds).filter(b => b.doneAt === T0 + 10 * HOUR - 30 * MIN).length, 3);
});

test('the daily gift rotates and can be claimed once a day', () => {
  const s = game(); const first = s.today.giftDay;
  must(s, 'claimGift', {}); assert.equal(act(s, 'claimGift', {}).ok, false);
  tick(s, T0 + 24 * HOUR); assert.equal(s.today.giftDay, (first + 1) % 7);
  assert.equal(dayKey(new Date(2026, 9, 8, 3, 59).getTime()), '2026-10-07', 'days turn over at 04:00');
});

test('a clock that jumps backward never makes timers longer than their full length', () => {
  const s = game(); tutorial(s); s.story.firstWheat = false;
  const bed = bedsOf(s)[0]; must(s, 'plant', { id: bed, crop: 'wheat' }, T0 + HOUR);
  tick(s, T0 - 5 * HOUR);
  assert.ok(s.beds[bed].doneAt <= T0 - 5 * HOUR + CROPS.wheat.growMs);
});

test('saves: version and migration guard', () => {
  const s = game(); assert.equal(s.version, SAVE_VERSION);
  assert.doesNotThrow(() => migrate(JSON.parse(JSON.stringify(s))));
  assert.throws(() => migrate({ version: SAVE_VERSION + 1 }));
  assert.equal(shortTime(65_000), '1m 05s');
});

test('store and move: contents travel, stored items come back free', () => {
  const s = game(); tutorial(s); s.coins = 500; setLevel(s, 3);
  const flower = must(s, 'place', { kind: 'flowers', x: 40, z: 58 }).id;
  must(s, 'store', { id: flower });
  const coins = s.coins; must(s, 'place', { kind: 'flowers', x: 41, z: 58 }); assert.equal(s.coins, coins);
  const bed = bedsOf(s)[0]; s.story.firstWheat = false; must(s, 'plant', { id: bed, crop: 'wheat' });
  clearRect(s, 38, 56, 38, 56);
  must(s, 'move', { id: bed, x: 38, z: 56 });
  assert.ok(s.beds[bed], 'the crop moved with its bed');
  assert.equal(grid.cellType(s, 38, 56), 'tilled');
});

test('undo gives the last build actions back, and leaving build mode clears it', () => {
  const s = game(); tutorial(s); setLevel(s, 3);
  const coins = s.coins;
  must(s, 'place', { kind: 'flowers', x: 40, z: 58 }); must(s, 'place', { kind: 'path', x: 40, z: 59 });
  must(s, 'undo', {}); must(s, 'undo', {});
  assert.equal(s.coins, coins); assert.equal(grid.cellType(s, 40, 59), 'grass'); assert.equal(s.counts.flowers, 0);
  must(s, 'place', { kind: 'flowers', x: 40, z: 58 }); must(s, 'endBuild', {});
  assert.equal(act(s, 'undo', {}).reason, 'Nothing to undo');
});

// ── The AAA pass: bonds, the weekly cart, fruit trees, unlocks, the streak garden, story hooks and saves ──
import { useBondsData, heartsOf, giftable, villageCharm, chapterReached } from '../src/core/bonds.mjs';
import { cartHere, cratesLeft, CART_SPOT } from '../src/core/cart.mjs';
import { treeState } from '../src/core/trees.mjs';
import { unlocksAt, xpFor } from '../src/core/levels.mjs';
import { buyableParcels } from '../src/core/build.mjs';
import { commentFor, newestFamily } from '../src/core/neighbours.mjs';
import { makeCard, posters } from '../src/core/orders.mjs';
import { gardenCells } from '../src/core/reserved.mjs';
import { gardenFlowers } from '../src/core/today.mjs';
import { CROPS as C, RECIPES as R, ANIMALS as A, FRUITS, GOODS } from '../src/content/goods.mjs';
import { BUILDINGS } from '../src/content/buildings.mjs';
import { VILLAGERS, NEIGHBOURS } from '../src/content/people.mjs';
import { BONDS, CART, ORDERS } from '../src/content/economy.mjs';
import { pack, unpack } from '../src/kit/save.mjs';

const DAY = 24 * HOUR;
/** A game with the first two families (the Trans and the Okafors) moved in, at level 6. */
function village() {
  const s = game(); tutorial(s); setLevel(s, 6); s.coins = 20000;
  must(s, 'testAddFamily', {}); must(s, 'testAddFamily', {});
  return s;
}
const homeOf = (s, family) => Object.keys(s.homes).find(id => s.homes[id].family === family);
const events = (r, type) => r.events.filter(e => e.type === type);

test('hearts: gifts raise them to 10; heart scenes play once each at 3, 6 and 9 with their reward', () => {
  useBondsData({ scenes: { lan: { 6: { lines: [{ who: 'lan', text: 'x' }], reward: { coins: 77 } } } }, wishes: {}, letters: [] });
  try {
    const s = village(); s.barn.items.bread = 50;
    const scenes = [];
    for (let d = 0; d < 40 && heartsOf(s, 'lan') < 10; d++) {
      const coins = s.coins, r = must(s, 'gift', { person: 'lan', good: 'bread' }, T0 + d * DAY);
      assert.equal(r.liked, true, 'Lan likes bread');
      for (const e of events(r, 'heartScene')) { scenes.push(e.at); if (e.at === 6) { assert.equal(e.scripted, true); assert.equal(s.coins - coins, 77); } }
      assert.equal(act(s, 'gift', { person: 'lan', good: 'bread' }, T0 + d * DAY + MIN).reason, 'One gift a day is plenty');
    }
    assert.deepEqual(scenes, BONDS.scenes, 'each scene once, in order');
    assert.equal(heartsOf(s, 'lan'), 10);
    assert.equal(s.stored.flowerpot, 1, 'the 3-heart default reward is a flowerpot');
    assert.ok(s.firsts['heart:lan:9'] > 0, 'the album keeps the heart scenes');
    // a gift they don't care for still counts a little; people who are not here yet cannot get gifts
    const before = s.people.minh?.hearts ?? 0; must(s, 'gift', { person: 'minh', good: 'bread' }, T0 + 50 * DAY);
    assert.equal(s.people.minh.hearts - before, BONDS.gift);
    assert.equal(act(s, 'gift', { person: 'elin', good: 'bread' }).reason, 'They are not in the village yet');
    assert.ok(!giftable(s, T0).includes('mai'), 'neighbours trade, they are not gifted');
  } finally { useBondsData(null); }
});

test('hearts from orders go to the person who posted it', () => {
  const s = village(); s.barn.items.bread = 5;
  s.orders.cards.push({ id: 'oh', from: 'grace', need: { bread: 1 }, coins: 10, xp: 2, readyAt: T0 });
  const r = must(s, 'deliverOrder', { id: 'oh' });
  assert.equal(s.people.grace.hearts, BONDS.order);
  assert.equal(events(r, 'hearts')[0].why, 'order');
});

test('wishes: one a day per household; placing the decoration near their home grants it, far away does not', () => {
  useBondsData({ scenes: {}, wishes: { bo: [{ text: 'A bench, please!', need: { kind: 'bench', near: 'home' } }] }, letters: [] });
  try {
    const s = village(); tick(s, T0 + MIN);
    assert.equal(s.wishes.list.length, 2, 'one wish for each family that has moved in');
    const tran = homeOf(s, 'tran'), w = s.wishes.list.find(x => x.home === tran);
    assert.ok(['minh', 'lan', 'bo'].includes(w.person));
    if (w.person === 'bo') assert.equal(w.kind, 'bench', 'the story\'s own wish is used');
    const p = s.placed[tran];
    must(s, 'place', { kind: w.kind, x: 80, z: 112 }, T0 + MIN);
    assert.equal(w.done, false, 'a decoration far away does not count');
    const hearts = s.people[w.person]?.hearts ?? 0;
    const r = must(s, 'place', { kind: w.kind, x: p.x + 3, z: p.z }, T0 + MIN);   // right beside the cottage
    assert.equal(w.done, true); assert.ok(events(r, 'wishGranted').some(e => e.home === tran && e.person === w.person));
    assert.equal(s.people[w.person].hearts - hearts, BONDS.wish);
    // tomorrow brings new wishes
    tick(s, T0 + DAY); assert.equal(s.wishes.list.length, 2); assert.ok(s.wishes.list.every(x => !x.done));
  } finally { useBondsData(null); }
});

test('letters arrive on chapter, level and heart thresholds; reading one gives its gift once', () => {
  const letters = [
    { id: 'ada1', from: 'ada', when: { type: 'chapter', value: 1 }, text: 'The key is under the seed tin.' },
    { id: 'gus5', from: 'gus', when: { type: 'level', value: 5 }, text: 'Not bad.', reward: { coins: 40 } },
    { id: 'lan3', from: 'lan', when: { type: 'hearts', value: 3 }, text: 'Thank you!' },
  ];
  useBondsData({ scenes: {}, wishes: {}, letters });
  try {
    const s = game();
    assert.deepEqual(s.mail.map(m => m.id), ['ada1'], 'chapter 1 is there from the start');
    assert.equal(chapterReached(s), 1);
    tutorial(s); setLevel(s, 4); s.xp = xpFor(5) - 1;
    const r = must(s, 'place', { kind: 'flowers', x: 40, z: 66 });          // +XP → level 5
    assert.equal(s.level, 5); assert.deepEqual(events(r, 'letter').map(e => e.id), ['gus5']);
    const coins = s.coins; must(s, 'readLetter', { id: 'gus5' }); must(s, 'readLetter', { id: 'gus5' });
    assert.equal(s.coins - coins, 40, 'the gift comes once');
    assert.equal(s.mail.find(m => m.id === 'gus5').read, true);
    s.people.lan = { hearts: 3, scenes: [3] }; tick(s, T0 + MIN);
    assert.equal(s.mail[0].id, 'lan3', 'newest first');
    assert.equal(act(s, 'readLetter', { id: 'nope' }).reason, 'That letter is gone');
  } finally { useBondsData(null); }
});

/** A game whose school opened yesterday (the cart's start). */
function schoolOpen(at = T0) {
  const s = village(); must(s, 'testUnlockAll', {}, at); s.firsts['project:school'] = at - DAY; tick(s, at);
  return s;
}
test('weekly cart: 6 crates, no timer, fills and sends for coins, XP and a decoration, the next one comes the next day', () => {
  const s = schoolOpen();
  assert.ok(cartHere(s)); assert.equal(s.cart.crates.length, CART.crates);
  const goods = JSON.stringify(s.cart.crates.map(c => [c.good, c.n]));
  for (let d = 1; d <= 30; d++) tick(s, T0 + d * DAY);        // a month away: the cart just waits
  assert.ok(cartHere(s)); assert.equal(s.cart.n, 1);
  assert.equal(JSON.stringify(s.cart.crates.map(c => [c.good, c.n])), goods, 'its crates never change');
  assert.equal(act(s, 'sendCart', {}, T0 + 30 * DAY).reason, 'Fill every crate first');
  s.barn.cap = 10000;
  for (const c of s.cart.crates) s.barn.items[c.good] = (s.barn.items[c.good] ?? 0) + c.n;
  const at = T0 + 30 * DAY + HOUR;
  s.cart.crates.forEach((c, i) => { if (!c.filled) must(s, 'fillCrate', { crate: i }, at); });
  assert.equal(act(s, 'fillCrate', { crate: 0 }, at).reason, 'This crate is full already');
  const coins = s.coins, xp = s.xp, decor = s.cart.decor, stored = s.stored[decor] ?? 0;
  const r = must(s, 'sendCart', {}, at);
  assert.equal(s.coins - coins, r.coins); assert.ok(s.xp > xp); assert.equal(s.stored[decor], stored + 1);
  const value = s.cart.crates.reduce((a, c) => a + GOODS[c.good].value * c.n, 0);
  assert.ok(r.coins >= value * ORDERS.pay, 'the cart pays at least what orders pay');
  assert.equal(events(r, 'cartSent').length, 1);
  tick(s, at + MIN); assert.equal(cartHere(s), false, 'no new cart the same day');
  const next = tick(s, at + DAY); assert.equal(s.cart.n, 2); assert.equal(events(next, 'cartArrived').length, 1);
});

test('weekly cart: neighbours fill at most two crates, one a day, and never the last', () => {
  const s = schoolOpen();
  for (let d = 0; d < 10; d++) {
    for (const n of NEIGHBOURS) for (const v of s.neighbours[n.id]?.visits ?? []) tick(s, Math.max(v + 1, T0 + d * DAY));
    tick(s, T0 + (d + 1) * DAY);
  }
  const by = s.cart.crates.filter(c => c.filled).map(c => c.by);
  assert.ok(by.length >= 1 && by.length <= CART.helpMax, `neighbours filled ${by.length}`);
  assert.ok(by.every(b => NEIGHBOURS.some(n => n.id === b)));
  assert.ok(cratesLeft(s) >= 1);
});

test('the cart never comes before the school is open, and its stand is kept free', () => {
  const s = village(); tick(s, T0 + 5 * DAY); assert.equal(s.cart, null);
  assert.equal(grid.canPlace(s, 'flowers', CART_SPOT.x, CART_SPOT.z).reason, 'Kept for the market cart');
});

test('fruit trees: placed once, fruit after a while, then regrow every few hours', () => {
  const s = game(); tutorial(s); setLevel(s, 1);
  assert.equal(act(s, 'place', { kind: 'apple_tree', x: 40, z: 66 }).reason, 'Reach level {level} first');
  setLevel(s, 2);
  const id = must(s, 'place', { kind: 'apple_tree', x: 40, z: 66 }).id, f = FRUITS.apple;
  assert.equal(treeState(s, id, T0).state, 'growing');
  assert.equal(act(s, 'pick', { id }, T0 + f.firstMs - 1).reason, 'Nothing is ready yet');
  const r = must(s, 'pick', { id }, T0 + f.firstMs);
  assert.equal(s.barn.items.apple, f.yield); assert.equal(events(r, 'picked')[0].count, f.yield);
  assert.equal(act(s, 'pick', {}, T0 + f.firstMs + f.regrowMs - 1).ok, false);
  must(s, 'pick', {}, T0 + f.firstMs + f.regrowMs);                                     // no id: every ripe tree
  assert.equal(s.barn.items.apple, 2 * f.yield);
  must(s, 'move', { id, x: 41, z: 66 }); assert.ok(s.trees[id], 'the tree keeps its timer when moved');
  // apples and apple pie only appear on orders once there is a tree
  const t = game(); tutorial(t); setLevel(t, 6); t.counts.bakery = 1;
  for (let i = 0; i < 40; i++) assert.ok(!['apple', 'peach', 'apple_pie'].some(g => makeCard(t, T0).need[g]));
  t.counts.apple_tree = 1; let seen = false;
  for (let i = 0; i < 200 && !seen; i++) seen = ['apple', 'apple_pie'].some(g => makeCard(t, T0).need[g]);
  assert.ok(seen, 'with a tree, apples can be ordered');
});

test('apple pie is baked at the bakery and pays more than its inputs', () => {
  assert.equal(R.apple_pie.at, 'bakery');
  const inputs = Object.entries(R.apple_pie.needs).reduce((a, [g, n]) => a + n * GOODS[g].value, 0);
  assert.ok(R.apple_pie.value > inputs);
});

test('levelUp.unlocks matches the content level fields', () => {
  for (let L = 2; L <= 10; L++) {
    const u = unlocksAt(L), at = o => Object.keys(o).filter(k => o[k].level === L).sort();
    assert.deepEqual([...u.crops].sort(), at(C)); assert.deepEqual([...u.fruits].sort(), at(FRUITS));
    assert.deepEqual([...u.recipes].sort(), at(R)); assert.deepEqual([...u.animals].sort(), at(A));
    assert.deepEqual([...u.buildings].sort(), at(BUILDINGS).filter(k => !BUILDINGS[k].project && !BUILDINGS[k].garden));
    assert.equal(u.list.length, u.crops.length + u.fruits.length + u.recipes.length + u.animals.length + u.buildings.length);
  }
  assert.ok(unlocksAt(2).buildings.includes('apple_tree') && unlocksAt(4).buildings.includes('peach_tree'));
  assert.equal(unlocksAt(3).orderSlots, ORDERS.slots(3)); assert.equal(unlocksAt(4).orderSlots, 0);
  const s = game(); tutorial(s); setLevel(s, 1); s.xp = xpFor(2) - 1;
  const r = must(s, 'place', { kind: 'flowers', x: 40, z: 66 }), up = events(r, 'levelUp')[0];
  assert.deepEqual(up.unlocks, unlocksAt(2));
});

test('locked refusals carry params the interface can group by (lock, kind)', () => {
  const s = game(); tutorial(s); setLevel(s, 1);
  const a = act(s, 'place', { kind: 'bakery', x: 40, z: 66 }), b = act(s, 'place', { kind: 'coop', x: 40, z: 66 }), c = act(s, 'place', { kind: 'bench', x: 40, z: 66 });
  assert.equal(a.params.lock, 'project'); assert.equal(a.params.kind, 'bakery');
  assert.equal(b.params.lock, 'level'); assert.equal(b.params.kind, 'coop'); assert.equal(c.params.lock, 'level'); assert.equal(c.params.level, 3);
  assert.equal(act(s, 'plant', { id: bedsOf(s)[0], crop: 'corn' }).params.lock, 'level');
});

test('story hooks: noOrders villagers never post; lines come from the poster; the same draws as before', () => {
  const s = game(); setLevel(s, 5);
  VILLAGERS.push({ id: 'june', name: 'June', family: true, noOrders: true }, { id: 'pip', name: 'Pip', family: true, noOrders: true });
  const ada = VILLAGERS.find(v => v.id === 'ada');
  try {
    assert.ok(!posters(s, T0).includes('june') && !posters(s, T0).includes('pip'));
    ada.orders = ['Ada line one', 'Ada line two'];
    for (let i = 0; i < 60; i++) { const c = makeCard(s, T0); assert.ok(!['june', 'pip'].includes(c.from)); if (c.from === 'ada') assert.ok(ada.orders.includes(c.line)); }
    // a card for a poster with their own lines advances the seed exactly as one without
    const a = game(77), b = game(77); setLevel(a, 5); setLevel(b, 5);
    delete ada.orders; const ca = makeCard(a, T0); ada.orders = ['only line']; const cb = makeCard(b, T0);
    assert.equal(a.seed, b.seed); assert.equal(ca.from, cb.from); assert.deepEqual(ca.need, cb.need);
  } finally { VILLAGERS.splice(VILLAGERS.findIndex(v => v.id === 'june'), 2); delete ada.orders; }
});

test('neighbour comments fill {count} and {family} from the land; one neighbourVisit per visit', () => {
  const s = village(); tick(s, T0 + 3 * MIN);
  const mai = NEIGHBOURS.find(n => n.id === 'mai'), keep = mai.comments, keepRemarks = mai.remarks;
  mai.remarks = []; // Exercise the legacy adapter independently of the new state-aware remarks.
  mai.comments = [{ text: 'You have {count} hens now!', when: 'hens' }, { text: 'Say hello to the {family} family.', when: 'families' }];
  try {
    const c = commentFor(s, 'mai');
    assert.equal(c.text, 'Say hello to the {family} family.', 'no hens yet, so the hen line is not said');
    assert.equal(c.params.family, 'Okafor'); assert.equal(newestFamily(s), 'Okafor');
    mai.arc = ['First visit line', 'Second visit line'];
    assert.equal(commentFor(s, 'mai', 2).text, 'Second visit line');
    assert.notEqual(commentFor(s, 'mai', 3).text, 'Second visit line');
    delete mai.arc;
  } finally { mai.comments = keep; mai.remarks = keepRemarks; }
  const visits = s.neighbours.mai.visits, before = s.neighbours.mai.total, r = tick(s, visits[visits.length - 1] + 1);
  const mine = events(r, 'neighbourVisit').filter(e => e.id === 'mai');
  assert.ok(mine.length <= 1, 'a late login acts out one visit, not every one that was missed');
  assert.equal(s.neighbours.mai.visited, visits.length, 'every planned visit is accounted for');
  assert.equal(events(tick(s, visits[visits.length - 1] + 2), 'neighbourVisit').filter(e => e.id === 'mai').length, 0, 'and never again');
  assert.ok(mine.every(e => typeof e.comment === 'string' && e.params));
  assert.equal(s.neighbours.mai.total, before + mine.length);
});

test('saves: a played game survives pack and unpack; a file with markup, or not a save at all, is refused', () => {
  const s = game(); tutorial(s); tick(s, T0 + 3 * HOUR);
  const back = unpack(pack(s)); assert.equal(back.coins, s.coins); assert.equal(Object.keys(back.placed).length, Object.keys(s.placed).length);
  assert.equal(back.cells.length, s.cells.length);
  const evil = JSON.parse(pack(s)); evil.orders.cards[0].line = '<img src=x onerror=alert(1)>';
  assert.throws(() => unpack(JSON.stringify(evil)), /not a Farm Village save/);
  const evilKey = JSON.parse(pack(s)); evilKey.stall.items = [{ good: 'x" onmouseover="alert(1)', n: 1 }];
  assert.throws(() => unpack(JSON.stringify(evilKey)), /not a Farm Village save/);
  for (const bad of ['[]', '5', 'null', '{}', '{"version":1}']) assert.throws(() => unpack(bad), undefined, bad);
});

// ── Review fixes: refusals leave no trace, bad input is refused, the clock cannot pay twice ──
test('a refused action leaves no trace, even on a building that has never been used', () => {
  const s = game(); tutorial(s); setLevel(s, 5); s.coins = 9000;
  layPath(s, spine(47).filter(([x]) => x > 39));
  const mill = must(s, 'place', { kind: 'feed_mill', x: 32, z: 64, rot: 2 }).id, coop = must(s, 'place', { kind: 'coop', x: 35, z: 64, rot: 2 }).id;
  s.barn.items = {};
  for (const [a, p] of [['produce', { building: mill, recipe: 'chicken_feed' }], ['buyAnimal', { home: 'nope' }], ['collect', { home: coop }]]) {
    const before = JSON.stringify(s), r = act(s, a, p, T0);
    assert.equal(r.ok, false, a); assert.equal(JSON.stringify(s), before, `${a} changed the state although it was refused`);
  }
});
test('malformed input is refused, never stored or thrown', () => {
  const s = game(); const before = JSON.stringify(s);
  for (const [a, p] of [['tutorial', {}], ['tutorial', { step: 'x' }], ['tutorial', { step: -1 }], ['chapterSeen', {}], ['chapterSeen', { id: 999 }],
    ['harvest', { ids: 5 }], ['plant', { ids: {}, crop: 'wheat' }], ['pick', { ids: 7 }], ['clear', { cells: null }], ['clear', { cells: [[1]] }], ['clear', { x: '34', z: '59' }],
    ['place', { kind: 'bed', x: '34', z: 60 }], ['place', { kind: 'bed', x: 34, z: 60, rot: 9 }], ['move', { id: 'p1', x: 1.5, z: 2 }], ['placeEdge', { kind: 'fence', x: 34, z: 60, side: 'q' }]]) {
    assert.doesNotThrow(() => act(s, a, p, T0), `${a} ${JSON.stringify(p)}`);
    assert.equal(act(s, a, p, T0).ok, false, `${a} ${JSON.stringify(p)} should be refused`);
  }
  assert.equal(JSON.stringify(s), before); assert.ok(Number.isFinite(s.story.tutorial) && Number.isFinite(s.story.chapter));
});
test('a clock moved back and forward pays nothing twice: the day, the gift, the cart, the wishes and the visits', () => {
  const s = village(); schoolOpen(T0);
  const d1 = new Date(2026, 9, 9, 10).getTime(); tick(s, d1);
  const days = s.today.days, wishes = JSON.stringify(s.wishes), visits = JSON.stringify(s.neighbours);
  act(s, 'claimGift', {}, d1);
  tick(s, d1 - 26 * HOUR); tick(s, d1);
  assert.equal(s.today.days, days, 'no extra game day'); assert.equal(s.today.claimed, true, 'the gift stays claimed');
  assert.equal(JSON.stringify(s.wishes), wishes); assert.equal(JSON.stringify(s.neighbours), visits, 'the plans of the day stay');
  // the cart: send one, move the clock back a day: no second cart
  const cart = s.cart; if (cart) { cart.crates.forEach(c => { c.filled = true; c.by = 'you'; }); must(s, 'sendCart', {}, d1); const n = s.cart.n; tick(s, d1 - 24 * HOUR); assert.equal(s.cart.n, n, 'no new cart from a clock moved back'); }
});
test('waits that are not stored as lengths shrink when the clock goes back (orders, the stall, a family on its way)', () => {
  const s = village(); must(s, 'discardOrder', { id: s.orders.cards.find(c => !c.story).id }, T0);
  s.orders.pending = [T0 + 6 * HOUR];
  tick(s, T0 - 5 * HOUR);
  assert.ok(s.orders.pending.every(at => at <= T0 - 5 * HOUR + ORDERS.discardMs), 'an order wait is never longer than its full length');
});
test('catching up after a long time away brings at most one visit from each neighbour', () => {
  const s = game(); const late = new Date(2026, 9, 7, 22, 30).getTime();
  const ev = tick(s, late).events.filter(e => e.type === 'neighbourVisit');
  assert.ok(ev.length <= 2, `${ev.length} visits at once`); assert.equal(new Set(ev.map(e => e.id)).size, ev.length, 'one per neighbour');
});
test('rent and charm follow the placement rule: a door on the road is connected, a cut-off path is not', async () => {
  const { needsOf } = await import('../src/core/homes.mjs');
  const s = village(); const id = Object.keys(s.homes)[0];
  assert.deepEqual(needsOf(s, id), [], 'a connected door has no unmet need');
  const p = s.placed[id], door = grid.doorCell(p.kind, p.x, p.z, p.rot);
  // lift the path tile in front of the door: the door no longer reaches the road, so the family has an unmet need
  assert.equal(act(s, 'clear', { x: door[0], z: door[1] }, T0).ok, true);
  assert.equal(grid.reachesRoad(s, door[0], door[1]), false);
  assert.deepEqual(needsOf(s, id), ['path']);
});

test('parcels: buyableParcels lists the land next to the farm; buyParcel emits parcelBought', () => {
  const s = game(); tutorial(s);
  const list = buyableParcels(s);
  assert.deepEqual(list.map(p => p.parcel).sort(), ['0,1', '0,3', '1,2']);
  assert.ok(list.every(p => !p.ok && p.reason === 'Reach level {level} first' && p.price === 500));
  setLevel(s, 4); s.coins = 1000;
  assert.ok(buyableParcels(s).every(p => p.ok));
  const r = must(s, 'buyParcel', { parcel: '1,2' });
  assert.equal(events(r, 'parcelBought')[0].parcel, '1,2');
  assert.deepEqual(buyableParcels(s), [], 'v0.1 sells one more parcel');
});

test('village charm milestones put up bunting once, for good', () => {
  const s = village(); const p = s.placed[homeOf(s, 'tran')];
  let got = [];
  for (let i = 0; i < 12 && !s.village.milestones.length; i++) got = got.concat(events(must(s, 'place', { kind: 'flowers', x: p.x + (i % 3), z: p.z + 3 + Math.floor(i / 3) }), 'charmMilestone'));
  assert.ok(villageCharm(s) >= 8); assert.equal(got.length, 1); assert.equal(got[0].decor, 'bunting');
  const id = Object.keys(s.placed).find(k => s.placed[k].kind === 'flowers'); must(s, 'store', { id });
  assert.deepEqual(s.village.decor, ['bunting'], 'a milestone is never taken back');
});

test('the streak garden plants one flower for each day you visit and never loses one', () => {
  const s = game(); assert.equal(gardenFlowers(s), 1); assert.equal(s.today.days, 1);
  for (const d of [1, 2, 5]) tick(s, T0 + d * DAY);                 // three more visiting days
  assert.equal(gardenFlowers(s), 4); assert.equal(s.today.days, 4);
  const cells = gardenCells(), flower = Object.keys(s.placed).find(k => s.placed[k].kind === 'garden_flower');
  assert.deepEqual([s.placed[flower].x, s.placed[flower].z], cells[0], 'the first flower is nearest the farmhouse');
  assert.equal(act(s, 'store', { id: flower }).reason, 'The streak garden keeps its flowers');
  assert.equal(act(s, 'move', { id: flower, x: 20, z: 52 }).ok, false);
  assert.equal(grid.canPlace(s, 'flowers', ...cells[10]).reason, 'Kept for your streak garden');
  assert.equal(act(s, 'place', { kind: 'garden_flower', x: 40, z: 66 }).ok, false, 'nobody plants them by hand');
});

test('no pay pressure, no lost progress: a month away takes nothing away', () => {
  const s = schoolOpen(); s.people.lan = { hearts: 4.5, scenes: [3] };
  tick(s, T0);   // post what those hand-set hearts already earned (Lan's 3-heart letter), so the month away starts settled
  const keep = () => ({ hearts: s.people.lan.hearts, flowers: gardenFlowers(s), cart: JSON.stringify(s.cart.crates.map(c => [c.good, c.n, c.filled])), coins: s.coins, stored: JSON.stringify(s.stored), village: JSON.stringify(s.village), level: s.level, mail: s.mail.length });
  const before = keep();
  for (let d = 1; d <= 31; d++) tick(s, T0 + d * DAY);
  const after = keep();
  for (const k of ['hearts', 'coins', 'stored', 'village', 'level', 'mail']) assert.equal(after[k], before[k], k);
  assert.equal(after.flowers, before.flowers + 31, 'only more flowers');
  assert.equal(s.cart.n, 1, 'the cart waited');
  // nothing was refused for being late: every action that was possible before still is
  assert.ok(must(s, 'claimGift', {}, T0 + 31 * DAY));
});

test('an old v0.1 save migrates: new fields get defaults, earned hearts stay, a passed heart scene plays on the next heart', () => {
  const s = village(); s.people.lan = { hearts: 6.25 };
  const old = JSON.parse(pack(s)); old.version = 1;
  for (const k of ['trees', 'mail', 'wishes', 'cart', 'village', 'known']) delete old[k];
  delete old.today.days; for (const k of ['picked', 'gifts', 'carts']) delete old.stats[k];
  const m = unpack(JSON.stringify(old));
  assert.equal(m.version, SAVE_VERSION); assert.deepEqual(m.trees, {}); assert.equal(m.cart, null);
  assert.ok(m.mail.filter(x => !x.read).length <= 2, 'letters already due are filed, the newest two left unread');
  assert.deepEqual(m.village, { milestones: [], decor: [] }); assert.equal(m.today.days, 0); assert.equal(m.stats.picked, 0);
  assert.equal(m.people.lan.hearts, 6.25); assert.deepEqual(m.people.lan.scenes, []);
  tick(m, T0 + 4 * MIN); m.barn.items.bread = 3;
  const r = must(m, 'gift', { person: 'lan', good: 'bread' }, T0 + 4 * MIN);
  assert.deepEqual(events(r, 'heartScene').map(e => e.at), [3, 6], 'the scenes passed before the update play now');
});

test('test-mode helpers: unlock everything, finish every timer, move a family in', () => {
  const s = game(); tutorial(s);
  must(s, 'testUnlockAll', {}); assert.ok(s.level >= 8); assert.ok(s.coins >= 10000); assert.equal(mayBuild(s, 'school').ok, true);
  s.story.firstWheat = false; must(s, 'plant', { ids: bedsOf(s), crop: 'pumpkin' });
  const r = must(s, 'testFinishTimers', {}); assert.ok(r.finished >= 6);
  must(s, 'harvest', { ids: bedsOf(s) });
  const before = Object.keys(s.homes).length, f = must(s, 'testAddFamily', {});
  assert.equal(Object.keys(s.homes).length, before + 1); assert.equal(s.homes[f.id].arrived, true);
});

test('the village square stays clear round the well: no building on the plaza, but a path may cross it', () => {
  const s = village();
  assert.equal(grid.canPlace(s, 'bench', 40, 99).reason, 'Keep the village square clear');
  assert.equal(grid.canPlace(s, 'cottage', 37, 97).reason, 'Keep the village square clear', 'a footprint that reaches into the square');
  assert.notEqual(grid.canPlace(s, 'path', 40, 99).reason, 'Keep the village square clear');
});

test('story beats are marked seen once each; an unknown beat is refused', () => {
  const s = game(); must(s, 'deliverOrder', { id: s.orders.cards[0].id });
  assert.deepEqual(must(s, 'beatSeen', { id: 'first-loaf' }).beats, ['first-loaf']);
  assert.deepEqual(must(s, 'beatSeen', { id: 'first-loaf' }).beats, ['first-loaf']);
  assert.equal(act(s, 'beatSeen', { id: 'nope' }).reason, 'Unknown story moment');
});
