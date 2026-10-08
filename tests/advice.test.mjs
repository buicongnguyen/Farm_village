import './tz.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { act, tick } from '../src/core/act.mjs';
import { newGame, migrate } from '../src/core/state.mjs';
import { adviceCards, adviceOf, unreadAdvice, earnedCelebrations, normalizeAdvice, newAdvice } from '../src/core/advice.mjs';
import { STEPS } from '../src/content/projects.mjs';
import { RECIPES } from '../src/content/goods.mjs';
import { canPlace, touch } from '../src/core/grid.mjs';
import { pack, unpack } from '../src/kit/save.mjs';
import { must, T0 } from './helpers.mjs';

const base = () => {
  const s = newGame(T0, 123); s.advice = newAdvice(); s.level = 4; s.coins = 500; s.stats.harvested = 1;
  s.projects.step = STEPS.findIndex(p => p.id === 'cottage2');
  s.placed.bakery = { kind: 'bakery', x: 40, z: 60, rot: 0 }; s.counts.bakery = 1;
  s.production.bakery = { slots: 2, queue: [] };
  s.barn.items = { bread: 8, corn: 4, egg: 4 };
  s.orders.cards = [{ id: 'advice-order', from: 'mai', need: { corn_bread: 2 }, coins: 140, xp: 4 }];
  return s;
};
const card = (s, id, now = T0) => adviceCards(s, now).find(c => c.id === id);
const payload = c => ({ id: c.id, context: c.context });
const refuse = (s, action, data = {}) => {
  const before = structuredClone(s), r = act(s, action, data, T0);
  assert.equal(r.ok, false); assert.deepEqual(r.events, []); assert.deepEqual(s, before);
};
const queueJob = (s, recipe, doneAt) => s.production.bakery.queue.push({ recipe, doneAt });

test('the opening stays quiet until a harvest or completed tutorial', () => {
  const s = newGame(T0, 1, { restore: true });
  assert.deepEqual(adviceCards(s), []); assert.equal(unreadAdvice(s), 0);
  s.stats.harvested = 1; assert.ok(card(s, 'fishing-break'));
  s.stats.harvested = 0; s.story.tutorial = 999; assert.ok(card(s, 'fishing-break'));
  s.fishing.line = { doneAt: T0 + 10 }; assert.equal(card(s, 'fishing-break'), undefined);
});

test('bread surplus means surplus after the current project and real orders, including queued bread', () => {
  const s = base(); assert.ok(card(s, 'order-bread-surplus'));
  s.barn.items.bread = 7; assert.ok(card(s, 'order-make')); assert.equal(card(s, 'order-bread-surplus'), undefined);
  queueJob(s, 'bread', T0 + 30_000); assert.ok(card(s, 'order-bread-surplus'));
  s.orders.cards.push({ id: 'bread-order', need: { bread: 3 }, coins: 45 });
  assert.equal(card(s, 'order-bread-surplus'), undefined);
  // The current school reserves its bread before the level/family requirements are reached.
  s.projects.step = STEPS.findIndex(p => p.id === 'school'); s.barn.items.bread = 26;
  assert.equal(card(s, 'order-bread-surplus'), undefined);
});

test('ready advice chooses a real deliverable request and never offers current-project bread', () => {
  const s = base(); s.orders.cards = [{ id: 'bread-order', from: 'mai', need: { bread: 4 }, coins: 60, xp: 4 }];
  assert.equal(card(s, 'order-ready'), undefined); // only three bread are uncommitted
  s.barn.items.bread = 9;
  const c = card(s, 'order-ready'); assert.equal(c.params.coins, 60); assert.equal(c.target.id, 'bread-order');
  const before = s.coins; must(s, 'readAdvice', payload(c)); assert.equal(s.coins, before); assert.equal(s.orders.cards.length, 1);
  must(s, 'deliverOrder', { id: 'bread-order' }); assert.equal(card(s, 'order-ready'), undefined);
});

test('the same request changes from missing ingredients to the right batch queued, collectable and deliverable', () => {
  const s = base(); delete s.barn.items.egg;
  assert.equal(card(s, 'order-ingredient').params.ingredient, 'Egg');
  s.barn.items.egg = 4; assert.ok(card(s, 'order-bread-surplus'));
  const first = must(s, 'produce', { building: 'bakery', recipe: 'corn_bread' }, T0);
  // A partial batch does not falsely claim the full requested quantity is already queued.
  assert.equal(card(s, 'order-queued'), undefined);
  const last = must(s, 'produce', { building: 'bakery', recipe: 'corn_bread' }, T0);
  assert.ok(card(s, 'order-queued')); assert.equal(card(s, 'order-bread-surplus'), undefined);
  assert.ok(card(s, 'order-collect', first.doneAt));
  must(s, 'collectProducts', { building: 'bakery' }, last.doneAt);
  assert.ok(card(s, 'order-ready', last.doneAt));
});

test('queued product first covers a current project and cannot be promised twice', () => {
  const s = base(); s.projects.step = STEPS.findIndex(p => p.id === 'school');
  queueJob(s, 'corn_bread', T0 + 20_000); queueJob(s, 'corn_bread', T0 + 40_000);
  assert.equal(card(s, 'order-queued'), undefined);
  s.projects.delivered.corn_bread = 10; assert.ok(card(s, 'order-queued'));
});

test('an unlocked recipe still names a broken maker, a missing maker or a real missing input', () => {
  const s = base(); s.cond.bakery = { level: 3 };
  assert.ok(card(s, 'maker-broken')); s.repairing.bakery = { doneAt: T0 + 20_000 };
  assert.ok(card(s, 'maker-broken')); delete s.cond.bakery; delete s.repairing.bakery;
  delete s.placed.bakery; assert.ok(card(s, 'maker-missing')); assert.equal(card(s, 'maker-broken'), undefined);
  s.orders.cards[0].need = { carrot_cake: 1 };
  assert.equal(card(s, 'order-unlock').params.level, 7);
  s.level = 7; s.placed.bakery = { kind: 'bakery', x: 40, z: 60, rot: 0 }; s.barn.items = { carrot: 3, egg: 2 };
  assert.equal(card(s, 'order-ingredient').params.ingredient, 'Milk');
  s.orders.cards[0].need = { wheat: 2 }; assert.ok(card(s, 'order-gather'));
});

test('queue investment requires a full working queue, usable recipe inputs and an affordable available slot', () => {
  const s = base(); queueJob(s, 'bread', T0 + 30_000); queueJob(s, 'bread', T0 + 60_000);
  const c = card(s, 'queue-full'); assert.equal(c.params.cost, 60);
  assert.match(c.reason, /another batch at the same time/);
  s.coins = 59; assert.equal(card(s, 'queue-full'), undefined);
  s.coins = 500; s.production.bakery.slots = 6; while (s.production.bakery.queue.length < 6) queueJob(s, 'bread', T0 + 60_000);
  assert.equal(card(s, 'queue-full'), undefined);
  s.production.bakery.slots = 2; s.production.bakery.queue.length = 2; delete s.barn.items.egg;
  assert.ok(card(s, 'order-ingredient')); assert.equal(card(s, 'queue-full'), undefined);
});

test('fruit suggestions protect projects, direct orders and ingredients for unmade requested pies', () => {
  const s = base(); s.orders.cards = []; s.placed.stand = { kind: 'fruit_stand', x: 60, z: 72, rot: 0 }; s.counts.fruit_stand = 1;
  s.barn.items = { apple: 5 }; assert.ok(card(s, 'stand-empty'));
  s.orders.cards = [{ id: 'pie-order', need: { apple_pie: 1 }, coins: 90 }];
  assert.equal(card(s, 'stand-empty'), undefined); // three apples needed for the pie leaves two
  queueJob(s, 'apple_pie', T0 + 60_000); // those ingredients were already paid, so these five apples are spare
  assert.ok(card(s, 'stand-empty'));
  s.orders.cards = [{ id: 'fruit-order', need: { apple: 3 }, coins: 40 }]; assert.equal(card(s, 'stand-empty'), undefined);
  s.projects.step = STEPS.findIndex(p => p.id === 'clinic'); s.orders.cards = []; s.barn.items = { cherry: 11 };
  assert.equal(card(s, 'stand-empty'), undefined); s.barn.items.cherry = 12; assert.ok(card(s, 'stand-empty'));
  s.cond.stand = { level: 3 }; assert.equal(card(s, 'stand-empty'), undefined);
});

test('a stand investment is affordable and has an actually legal road-connected spot; the return is incremental', () => {
  const s = base(); s.orders.cards = []; s.barn.items = { cherry: 4 };
  s.cells.fill(0); touch(s);
  const c = card(s, 'stand-invest'); assert.ok(c); assert.deepEqual(c.params, { cost: 80, good: 'Cherry', extra: 2, sales: 40 });
  assert.equal(canPlace(s, 'fruit_stand', c.target.x, c.target.z, c.target.rot).ok, true);
  s.coins = 79; assert.equal(card(s, 'stand-invest'), undefined);
  s.stored.fruit_stand = 1; assert.equal(card(s, 'stand-invest').params.cost, 0);
  s.stored.fruit_stand = 0; s.rebuild.fruit_stand = 1; assert.equal(card(s, 'stand-invest').params.cost, 40);
  s.cells.fill(2); touch(s); assert.equal(card(s, 'stand-invest'), undefined);
  s.cells.fill(0); touch(s); s.level = 3; assert.equal(card(s, 'stand-invest'), undefined);
});

test('already-earned stand takings remain collectible even while the stand is stored', () => {
  const s = base(); s.orders.cards = []; s.fruitStand.coins = 23;
  const c = card(s, 'stand-collect'); assert.equal(c.params.coins, 23); assert.equal(c.target.kind, 'fruit-stand');
  must(s, 'fruitCollect'); assert.equal(card(s, 'stand-collect'), undefined);
});

test('read/deferral survive save reload, quantity changes, missing conditions and language changes', () => {
  let s = base(); const c = card(s, 'order-bread-surplus');
  const before = { coins: s.coins, barn: structuredClone(s.barn), xp: s.xp };
  must(s, 'readAdvice', payload(c)); assert.equal(card(s, c.id).read, true);
  must(s, 'deferAdvice', payload(c)); assert.equal(card(s, c.id), undefined);
  const deferred = adviceCards(s, T0, { includeDeferred: true }).find(a => a.id === c.id); assert.equal(deferred.deferred, true);
  s = unpack(pack(s)); s.settings.language = 'vi'; s.barn.items.bread += 7;
  assert.equal(card(s, c.id), undefined); assert.equal(adviceOf(s, c.id, c.context, T0, { includeDeferred: true }).deferred, true);
  delete s.barn.items.egg; assert.equal(adviceOf(s, c.id, c.context, T0, { includeDeferred: true }), null);
  s.barn.items.egg = 4; assert.equal(card(s, c.id), undefined);
  must(s, 'restoreAdvice', payload(c)); assert.equal(card(s, c.id).read, true);
  assert.equal(s.coins, before.coins); assert.equal(s.xp, before.xp); assert.equal(s.barn.items.corn, before.barn.items.corn);
});

test('stale advice and malformed acknowledgement actions refuse without initializing or changing state', () => {
  const s = base(), c = card(s, 'order-bread-surplus'); delete s.advice; delete s.barn.items.egg;
  for (const action of ['readAdvice', 'deferAdvice', 'restoreAdvice']) { refuse(s, action, payload(c)); refuse(s, action); refuse(s, action, { id: '__proto__', context: 'earned' }); }
  assert.equal(Object.hasOwn(s, 'advice'), false);
});

test('a postponed order remains restorable when another eligible order becomes higher priority', () => {
  const s = base(); s.barn.items.corn_bread = 2;
  const original = card(s, 'order-ready'); must(s, 'deferAdvice', payload(original));
  s.orders.cards.push({ id: 'higher-value', from: 'gus', need: { corn: 3 }, coins: 240, xp: 5 });
  assert.equal(card(s, 'order-ready').target.id, 'higher-value');
  const postponed = adviceCards(s, T0, { includeDeferred: true }).find(c => c.context === original.context);
  assert.equal(postponed.deferred, true);
  assert.equal(adviceOf(s, original.id, original.context, T0, { includeDeferred: true }).target.id, 'advice-order');
  must(s, 'restoreAdvice', payload(original));
  assert.equal(adviceCards(s).filter(c => c.context.startsWith('order/')).length, 1);
  // Although it is below the grouped visible choice, the old card still describes a valid preview.
  assert.equal(adviceOf(s, original.id, original.context).read, true);
  assert.equal(s.orders.cards.length, 2); assert.equal(s.barn.items.corn_bread, 2);
});

test('every selector is read-only, including a missing queue or absent advice state', () => {
  const s = base(); delete s.advice; delete s.production.bakery; s.barn.items.cherry = 6;
  const before = structuredClone(s);
  for (let i = 0; i < 3; i++) { adviceCards(s); unreadAdvice(s); normalizeAdvice(s); earnedCelebrations(s); }
  assert.deepEqual(s, before); assert.equal(Object.hasOwn(s.production, 'bakery'), false);
});

test('only an actual collected loaf earns the first-bread memory, once, without added currency', () => {
  let s = base(); s.barn.items.wheat = 6;
  const before = s.coins, q = must(s, 'produce', { building: 'bakery', recipe: 'bread' });
  assert.equal(card(s, 'first-bread'), undefined);
  const r = must(s, 'collectProducts', { building: 'bakery' }, q.doneAt);
  assert.deepEqual(r.events.filter(e => e.type === 'adviceEarned'), [{ type: 'adviceEarned', id: 'first-bread' }]);
  assert.ok(card(s, 'first-bread')); assert.equal(s.coins, before);
  s = unpack(pack(s)); const again = must(s, 'produce', { building: 'bakery', recipe: 'bread' }, q.doneAt);
  assert.equal(must(s, 'collectProducts', { building: 'bakery' }, again.doneAt).events.some(e => e.type === 'adviceEarned'), false);
  assert.equal(earnedCelebrations(s).length, 1);
});

test('school and clinic milestones wait for their chapter introductions and remain bounded memories', () => {
  const s = base(); s.projects.step = STEPS.findIndex(p => p.id === 'school');
  s.placed.school = { kind: 'school', x: 75, z: 75, rot: 0 }; s.counts.school = 1;
  tick(s, T0); assert.equal(s.advice.celebrated['school-open'], T0); assert.equal(card(s, 'school-open'), undefined);
  s.story.chapter = 4; assert.ok(card(s, 'school-open'));
  s.projects.step = STEPS.findIndex(p => p.id === 'clinic'); s.placed.clinic = { kind: 'clinic', x: 84, z: 75, rot: 0 }; s.counts.clinic = 1;
  tick(s, T0 + 1); assert.equal(card(s, 'clinic-open'), undefined);
  s.story.chapter = 5; assert.ok(card(s, 'clinic-open'));
  delete s.placed.school; delete s.placed.clinic; assert.equal(earnedCelebrations(s).length, 2);
  assert.equal(card(s, 'school-open').target.kind, 'album');
  const c = card(s, 'school-open'); must(s, 'deferAdvice', payload(c)); assert.equal(card(s, 'school-open'), undefined);
  assert.equal(earnedCelebrations(s).find(a => a.id === 'school-open').deferred, true);
});

test('legacy loading retires already-passed milestones without money, invented memories or repeat rewards', () => {
  const s = base(); delete s.advice; s.version = 6; s.stats.produced = 1; s.counts.school = 1; s.counts.clinic = 1;
  const before = s.coins, updated = migrate(s);
  assert.deepEqual(new Set(updated.advice.retired), new Set(['first-bread', 'school-open', 'clinic-open']));
  assert.deepEqual(earnedCelebrations(updated), []); assert.equal(updated.coins, before);
  updated.barn.items.wheat = 3; const q = must(updated, 'produce', { building: 'bakery', recipe: 'bread' });
  assert.equal(must(updated, 'collectProducts', { building: 'bakery' }, q.doneAt).events.some(e => e.type === 'adviceEarned'), false);
  const partial = base(); partial.firsts['advice:first-bread'] = T0; partial.advice = { read: [], deferred: [] };
  assert.equal(normalizeAdvice(partial).celebrated['first-bread'], T0);
});
