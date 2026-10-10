// Hired hands (core/helpers.mjs): after the school, each hand does half of the waiting work; the other half stays yours.
import './tz.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { act, tick } from '../src/core/act.mjs';
import { pack, unpack } from '../src/kit/save.mjs';
import { HANDS } from '../src/content/economy.mjs';
import { handsOpen, handHired } from '../src/core/helpers.mjs';
import { game, T0 } from './helpers.mjs';

const ripeBeds = (s, now) => Object.keys(s.beds).filter(id => s.beds[id].doneAt <= now);
function farmWithBeds(n) {
  const s = game(); s.coins = 5000; s.level = 8; let made = 0;
  for (let z = 56; z <= 71 && made < n; z++) for (let x = 32; x <= 47 && made < n; x++) { act(s, 'clear', { x, z }, T0); if (act(s, 'place', { kind: 'bed', x, z }, T0).ok) made++; }
  const beds = Object.keys(s.placed).filter(id => s.placed[id].kind === 'bed');
  s.barn.cap = 5000; s.barn.items.wheat = 200; act(s, 'plant', { ids: beds, crop: 'wheat' }, T0);
  return { s, beds: Object.keys(s.beds) };
}

test('hands can be hired only once the school stands, for a fee, one per role; letting go is free', () => {
  const s = game(); s.coins = 2000;
  assert.equal(handsOpen(s), false); assert.equal(act(s, 'hireHand', { role: 'field' }, T0).ok, false);
  s.counts.school = 1;
  assert.equal(act(s, 'hireHand', { role: 'nobody' }, T0).ok, false); assert.equal(act(s, 'hireHand', { role: 'constructor' }, T0).ok, false);
  assert.equal(act(s, 'hireHand', { role: 'field' }, T0).ok, true); assert.equal(s.coins, 2000 - HANDS.roles.field.fee); assert.ok(handHired(s, 'field'));
  assert.equal(act(s, 'hireHand', { role: 'field' }, T0).ok, false, 'hired the same hand twice');
  s.coins = HANDS.roles.workshop.fee - 1; assert.equal(act(s, 'hireHand', { role: 'workshop' }, T0).ok, false); assert.equal(s.coins, HANDS.roles.workshop.fee - 1);
  assert.ok(handHired(unpack(pack(s)), 'field'), 'the hire is lost on reload');
  assert.equal(act(s, 'releaseHand', { role: 'field' }, T0).ok, true); assert.equal(handHired(s, 'field'), false);
  assert.equal(act(s, 'releaseHand', { role: 'field' }, T0).ok, false);
});

test('the field hand brings in half of the ripe beds and sows them again; the other half waits for you', () => {
  const { s, beds } = farmWithBeds(8); assert.ok(beds.length >= 6, `only ${beds.length} beds planted`);
  s.level = 2;   // below the family helpers' level, so only the hired hand works
  s.counts.school = 1; assert.equal(act(s, 'hireHand', { role: 'field' }, T0).ok, true);
  const done = Math.max(...beds.map(id => s.beds[id].doneAt)) + 1000;
  tick(s, done); assert.equal(ripeBeds(s, done).length, beds.length, 'the hand worked before its first round');
  const coins = s.coins, wheat = s.barn.items.wheat, later = done + HANDS.everyMs + 1000;
  tick(s, later);
  const left = ripeBeds(s, later).length, did = beds.length - left;
  assert.equal(did, Math.ceil(beds.length / 2), `the hand did ${did} of ${beds.length}`);
  assert.equal(s.coins, coins - did * HANDS.wage); assert.ok(s.barn.items.wheat !== wheat, 'nothing was harvested');
  assert.equal(Object.keys(s.beds).length, beds.length, `the harvested beds were not sown again: ${Object.keys(s.beds).length} of ${beds.length}, level ${s.level}`);
  // with no coins for wages the hand does nothing
  const waiting = () => beds.filter(id => s.beds[id].doneAt <= done).length;   // beds nobody has touched since they first ripened
  assert.equal(waiting(), left);
  s.coins = 0; const idle = later + HANDS.everyMs + 1000; tick(s, idle); assert.equal(waiting(), left, 'the hand worked without pay');
  // and nothing happens while you are away (a long gap)
  s.coins = 500; const away = idle + 6 * 60 * 60_000; tick(s, away); assert.equal(waiting(), left, 'the hand worked while the game was closed');
  const next = away + HANDS.everyMs + 1000; tick(s, next); assert.ok(waiting() < left, 'back at the game, the hand did not go on');
});

test('the village projects go on after the clinic: market day, a third field, juice, pond, a second truck, noodles, police, company, hospital; they lock nothing', async () => {
  const { STEPS } = await import('../src/content/projects.mjs'), { mayBuild, currentStep } = await import('../src/core/projects.mjs');
  const ids = STEPS.map(st => st.id), after = ids.slice(ids.indexOf('clinic') + 1);
  // later chapters add their own steps to this checklist; these keep their order, and the story's next deeds come first
  const first = ['market_day', 'third_field', 'juice', 'anglers', 'fleet', 'noodles', 'police', 'company', 'hospital'];
  assert.deepEqual(after.filter(id => first.includes(id)), first); assert.equal(after[0], 'market_day');
  for (const st of STEPS.slice(ids.indexOf('clinic') + 1)) assert.deepEqual(st.builds, [], `${st.id} locks a building`);
  const s = game(); s.projects.step = ids.indexOf('clinic') + 1; s.level = 20; s.coins = 99999;
  assert.equal(currentStep(s).id, 'market_day');
  assert.notEqual(mayBuild(s, 'noodle_factory').params?.lock, 'project', 'a later project locks the noodle factory');
  // steps already true are ticked off in one go; the rest wait
  s.fishing = { line: null, coins: 0, caught: 5, feeAt: 0 }; s.placed.j1 = { kind: 'juice_press', x: 40, z: 60, rot: 0 }; s.counts.juice_press = 1;
  tick(s, T0 + 1000); assert.equal(currentStep(s).id, 'market_day', 'the first one still open is shown');
  s.stats.marketDays = 1; s.parcels.push('1,2', '2,2'); tick(s, T0 + 1500); assert.equal(currentStep(s).id, 'fleet');
  s.truck.fleet.push({ level: 1, away: false, backAt: 0, load: [], coins: 0 }); tick(s, T0 + 2000); assert.equal(currentStep(s).id, 'noodles');
});

test('the workshop hand keeps a workshop going: it collects half of what is done and starts what the building made last', () => {
  const s = game(); s.level = 4; s.coins = 5000; s.barn.cap = 5000; s.counts.school = 1; s.barn.items.wheat = 60;
  s.placed.bk = { kind: 'bakery', x: 40, z: 60, rot: 0 }; s.counts.bakery = 1; s.production.bk = { slots: 4, queue: [] };
  assert.equal(act(s, 'hireHand', { role: 'workshop' }, T0).ok, true);
  assert.equal(act(s, 'produce', { building: 'bk', recipe: 'bread' }, T0).ok, true); assert.equal(s.lastRecipe.bk, 'bread');
  tick(s, T0 + 1000);                                   // the hand's clock starts
  const round = T0 + 1000 + HANDS.everyMs + 1000; tick(s, round);
  // the one loaf was done: collected (1 task), restarted (same tray), and half of the other free trays started too
  assert.ok((s.barn.items.bread ?? 0) >= 1, 'the finished loaf was not collected');
  const running = s.production.bk.queue.length; assert.ok(running >= 2 && running <= 3, `${running} trays running after one round`);
  assert.ok(s.production.bk.queue.every(j => j.recipe === 'bread'));
  // with no flour nothing starts, and nothing is charged for nothing
  s.barn.items.wheat = 0; const coins = s.coins, later = round + HANDS.everyMs + 1000; tick(s, later);
  assert.ok(s.coins >= coins - 3, 'wages without work');
  // a building that was never used stays idle: the hand does not choose recipes for you
  s.placed.jp = { kind: 'juice_press', x: 44, z: 60, rot: 0 }; s.counts.juice_press = 1; s.production.jp = { slots: 2, queue: [] }; s.barn.items.apple = 30; s.level = 9;
  tick(s, later + HANDS.everyMs + 1000); assert.equal(s.production.jp.queue.length, 0);
});

test('three more hands: the orchard hand picks half the ripe trees, the fisher lands a fish a round, the driver runs the trucks', () => {
  assert.deepEqual(Object.keys(HANDS.roles), ['field', 'animals', 'workshop', 'orchard', 'driver', 'fisher']);
  const s = game(); s.level = 2; s.coins = 9000; s.barn.cap = 5000; s.counts.school = 1;
  for (let i = 0; i < 4; i++) { s.placed[`t${i}`] = { kind: 'cherry_tree', x: 40 + i, z: 60, rot: 0 }; (s.trees ??= {})[`t${i}`] = { doneAt: T0 - 1, picked: 0 }; }
  s.counts.cherry_tree = 4;
  for (const role of ['orchard', 'fisher', 'driver']) assert.equal(act(s, 'hireHand', { role }, T0).ok, true, role);
  s.placed.mk = { kind: 'market', x: 60, z: 96, rot: 0 }; s.counts.market = 1; s.orders.cards = [];   // a working market, and no order holding the goods back
  s.barn.items = { wheat: 40 }; const fishBefore = Object.values(s.album?.fish ?? {}).reduce((a, n) => a + n, 0);
  tick(s, T0 + 1000); const round = T0 + 1000 + HANDS.everyMs + 1000; tick(s, round);
  assert.equal(Object.values(s.trees).filter(t => t.doneAt <= round).length, 2, 'the orchard hand did not pick exactly half of four trees');
  assert.ok((s.stats.picked ?? 0) >= 6, 'no cherries were picked');   // (the driver may already have loaded them)
  assert.equal(Object.values(s.album.fish).reduce((a, n) => a + n, 0), fishBefore + 1, 'the fisher landed no fish');
  // the driver loaded spare goods and sent the truck: it is away now, and the takings come home on a later round
  assert.equal(s.truck.away, true, 'the truck was not sent'); const coins = s.coins;
  const back = Math.max(s.truck.backAt, round) + HANDS.everyMs + 2000; tick(s, s.truck.backAt + 1); tick(s, back);
  assert.ok(s.coins > coins - 20, 'the takings never came in');
});
