// The rules core (src/core/): every module through the real act() and tick().
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
    ['buyParcel', { parcel: '1,2' }], ['upgradeBarn', {}], ['projectDeliver', {}], ['collectRent', {}], ['trade', { id: 'mai', accept: true }], ['stallCollect', {}]]) {
    const r = act(s, action, payload, T0);
    assert.equal(r.ok, false, `${action} should be refused`);
  }
  if (s.coins < 400) assert.equal(JSON.stringify(s), before);
  assert.ok(Object.keys(ACTIONS).length >= 25);
});

test('farming: plant from the barn, free wheat, harvest two, the first wheat is quick', () => {
  const s = game(); tutorial(s);
  const beds = Object.keys(s.placed);
  must(s, 'plant', { ids: beds, crop: 'wheat' });
  assert.equal(s.barn.items.wheat, 6, 'wheat is free to plant');
  assert.equal(act(s, 'harvest', { ids: beds }, T0 + 10_000).ok, false);
  must(s, 'harvest', { ids: beds }, T0 + 31_000);                                          // the tutorial's 30 s first wheat
  assert.equal(s.barn.items.wheat, 6 + 12);
  must(s, 'plant', { ids: beds, crop: 'wheat' }, T0 + 31_000);                              // after that, wheat takes 2 minutes
  assert.equal(act(s, 'harvest', { ids: beds }, T0 + 62_000).ok, false);
  must(s, 'deliverOrder', { id: s.orders.cards[0].id }, T0 + 62_000);
  assert.ok(s.level >= 2, 'the first order and harvests reach level 2');
});

test('never stuck: a crop you have none of can be bought at its base price', () => {
  const s = game(); tutorial(s); setLevel(s, 2); s.coins = 10;
  const bed = Object.keys(s.placed)[0];
  must(s, 'plant', { id: bed, crop: 'carrot' });
  assert.equal(s.coins, 10 - CROPS.carrot.value);
});

test('the barn caps storage and harvests stop when it is full', () => {
  const s = game(); tutorial(s); s.barn.items.wheat = 49;
  const beds = Object.keys(s.placed);
  must(s, 'plant', { ids: beds, crop: 'wheat' }); s.story.firstWheat = false;
  const r = act(s, 'harvest', { ids: beds }, T0 + HOUR);
  assert.equal(r.ok, false); assert.equal(r.reason, 'The barn is full');
  must(s, 'upgradeBarn', {}); assert.equal(s.barn.cap, 75);
});

function millAndCoop(s) {
  tutorial(s); setLevel(s, 3); s.coins = 5000;
  layPath(s, spine(47).filter(([x]) => x > 39));
  const mill = must(s, 'place', { kind: 'feed_mill', x: 32, z: 64, rot: 2 }).id;
  const coop = must(s, 'place', { kind: 'coop', x: 35, z: 64, rot: 2 }).id;
  return { mill, coop };
}
test('animals need a closed fence with a gate, then eat feed and give produce', () => {
  const s = game(); const { mill, coop } = millAndCoop(s);
  assert.equal(act(s, 'buyAnimal', { home: coop }).reason, 'The fence has a gap');
  fenceRect(s, 35, 64, 38, 67, 38);
  assert.equal(grid.penOf(s, coop).closed, true);
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
  const s = game(); millAndCoop(s); setLevel(s, 5); s.coins = 20000;
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
  s.barn.items.bread = 10; s.barn.items.corn_bread = 4;
  must(s, 'projectDeliver', {}, T0 + 3 * MIN);
  must(s, 'place', { kind: 'path', x: 46, z: 92 }, T0 + 3 * MIN);
  const coins = s.coins; must(s, 'place', { kind: 'school', x: 44, z: 93, rot: 2 }, T0 + 3 * MIN);
  assert.equal(coins - s.coins, 700);
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
  assert.ok(oneHour >= 3 && oneHour <= 5, `one hour of rent: ${oneHour}`);
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
  const beds = Object.keys(s.placed); must(s, 'plant', { ids: beds, crop: 'wheat' }); setLevel(s, 5);
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
  const bed = Object.keys(s.placed)[0]; must(s, 'plant', { id: bed, crop: 'wheat' }, T0 + HOUR);
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
  const bed = Object.keys(s.placed)[0]; s.story.firstWheat = false; must(s, 'plant', { id: bed, crop: 'wheat' });
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
