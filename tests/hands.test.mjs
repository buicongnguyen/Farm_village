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

test('the village projects go on after the clinic: juice, pond, a second truck, noodles, police, company, hospital; they lock nothing', async () => {
  const { STEPS } = await import('../src/content/projects.mjs'), { mayBuild, currentStep } = await import('../src/core/projects.mjs');
  const ids = STEPS.map(st => st.id), after = ids.slice(ids.indexOf('clinic') + 1);
  assert.deepEqual(after, ['juice', 'anglers', 'fleet', 'noodles', 'police', 'company', 'hospital']);
  for (const st of STEPS.slice(ids.indexOf('clinic') + 1)) assert.deepEqual(st.builds, [], `${st.id} locks a building`);
  const s = game(); s.projects.step = ids.indexOf('clinic') + 1; s.level = 20; s.coins = 99999;
  assert.equal(currentStep(s).id, 'juice');
  assert.notEqual(mayBuild(s, 'noodle_factory').params?.lock, 'project', 'a later project locks the noodle factory');
  // steps already true are ticked off in one go; the rest wait
  s.fishing = { line: null, coins: 0, caught: 5, feeAt: 0 }; s.placed.j1 = { kind: 'juice_press', x: 40, z: 60, rot: 0 }; s.counts.juice_press = 1;
  tick(s, T0 + 1000); assert.equal(currentStep(s).id, 'fleet');
  s.truck.fleet.push({ level: 1, away: false, backAt: 0, load: [], coins: 0 }); tick(s, T0 + 2000); assert.equal(currentStep(s).id, 'noodles');
});
