import './tz.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { act, tick } from '../src/core/act.mjs';
import { FIELD_WORK, normalizeFieldWork } from '../src/core/field-work.mjs';
import { HANDS } from '../src/content/economy.mjs';
import { pack, unpack } from '../src/kit/save.mjs';
import { game, T0 } from './helpers.mjs';

function setup(n = 8) {
  const s = game(); s.level = 8; s.coins = 5000; s.counts.school = 1; s.barn.cap = 10000;
  s.firsts.festival = T0; s.projects.step = 999; s.story.chapter = 20; s.story.tutorial = 999;
  const ids = Array.from({ length: n }, (_, i) => 'workbed' + i);
  ids.forEach((id, i) => { s.placed[id] = { kind: 'bed', x: 32 + i, z: 57, rot: 0 }; s.beds[id] = { crop: 'carrot', doneAt: T0 }; });
  assert.ok(act(s, 'hireHand', { role: 'field' }, T0).ok);
  tick(s, T0); // settle unrelated one-time village milestone rewards before measuring wages
  return { s, ids };
}
function assign(s, ids, options = {}) {
  const result = act(s, 'startFieldWork', { ids, owner: 'field', ...options }, T0);
  assert.ok(result.ok, result.reason);
}
function round(s, now) { s.handsAt = now; s.helpAt = now; return tick(s, now); }

test('unassigned crops remain ripe through repeated family and hired rounds', () => {
  const { s, ids } = setup(); const coins = s.coins;
  for (let i = 1; i <= 6; i++) round(s, T0 + i * 60_000);
  assert.deepEqual(Object.keys(s.beds), ids); assert.equal(s.coins, coins);
});
test('paused assignments wait 45 seconds, work in small batches and never replant or spill into other beds', () => {
  const { s, ids } = setup(); assign(s, ids.slice(0, 5));
  const coins = s.coins;
  round(s, T0 + FIELD_WORK.graceMs - 1); assert.equal(Object.keys(s.beds).length, 8);
  round(s, T0 + FIELD_WORK.graceMs); assert.equal(s.fieldWork.job.done, 3);
  round(s, T0 + FIELD_WORK.graceMs + 1000);
  assert.equal(s.fieldWork.job, null); assert.deepEqual(s.fieldWork.last, { done: 5, skipped: 0, spent: 5 * HANDS.wage });
  assert.deepEqual(Object.keys(s.beds), ids.slice(5)); assert.equal(s.coins, coins - 5 * HANDS.wage);
  round(s, T0 + 90_000); assert.deepEqual(Object.keys(s.beds), ids.slice(5));
});
test('manual harvest/replant wins: same bed with a new crop batch is skipped without wages', () => {
  const { s, ids } = setup(2); assign(s, ids, { mode: 'ready' }); const coins = s.coins;
  assert.ok(act(s, 'harvest', { id: ids[0] }, T0).ok);
  assert.ok(act(s, 'plant', { id: ids[0], crop: 'wheat' }, T0).ok);
  const batch = { ...s.beds[ids[0]] }; round(s, T0 + 1000);
  assert.deepEqual(s.beds[ids[0]], batch); assert.equal(s.coins, coins - HANDS.wage);
  assert.deepEqual(s.fieldWork.last, { done: 1, skipped: 1, spent: HANDS.wage });
});
test('full storage or missing wages pauses safely; cancel releases remaining work without charge', () => {
  const { s, ids } = setup(4); assign(s, ids, { mode: 'ready' });
  s.barn.cap = Object.values(s.barn.items).reduce((a, b) => a + b, 0);
  const coins = s.coins; round(s, T0 + 1000); assert.equal(s.coins, coins); assert.equal(s.fieldWork.job.done, 0);
  s.barn.cap += 100; s.coins = 0; round(s, T0 + 2000); assert.equal(s.fieldWork.job.done, 0);
  s.coins = 1; round(s, T0 + 3000); assert.equal(s.fieldWork.job.done, 1); assert.equal(s.coins, 0);
  assert.ok(act(s, 'cancelFieldWork', {}, T0 + 3000).ok);
  assert.deepEqual(s.fieldWork.last, { done: 1, skipped: 3, spent: 1 });
  round(s, T0 + 4000); assert.equal(Object.keys(s.beds).length, 3);
});
test('family assignments are free and finite, and hired workers cannot race them', () => {
  const { s, ids } = setup(7); assign(s, ids.slice(0, 5), { owner: 'family', mode: 'ready' }); const coins = s.coins;
  round(s, T0 + 1000); round(s, T0 + 2000);
  assert.equal(s.fieldWork.last.done, 5); assert.equal(s.fieldWork.last.spent, 0); assert.equal(s.coins, coins);
  assert.equal(Object.keys(s.beds).length, 2);
});
test('assignments snapshot growing crops and give a viewing window on ripening and returning from absence', () => {
  const { s, ids } = setup(1); s.beds[ids[0]].doneAt = T0 + 10_000; assign(s, ids);
  round(s, T0 + 10_000); assert.equal(s.fieldWork.job.targets[0].ripeAt, T0 + 10_000);
  const restored = unpack(pack(s)); round(restored, T0 + 3_600_000);
  assert.ok(restored.beds[ids[0]], 'first returning tick harvested before the player could see it');
  round(restored, T0 + 3_600_000 + FIELD_WORK.graceMs); assert.equal(restored.fieldWork.last.done, 1);
});
test('assignment survives save/profile boundaries and malformed new data is safely disabled', () => {
  const { s, ids } = setup(2); assign(s, ids);
  const back = unpack(pack(s)); assert.deepEqual(back.fieldWork, s.fieldWork);
  assert.equal(game().fieldWork.job, null); delete s.fieldWork; assert.equal(unpack(pack(s)).fieldWork.job, null);
  for (const value of [[], { job: { targets: null } }, { job: { owner: 'field', targets: [null] } }]) {
    s.fieldWork = value; assert.equal(normalizeFieldWork(s).job, null);
  }
});
test('invalid assignments refuse atomically and releasing a worker cancels their remaining crop job', () => {
  const { s, ids } = setup(13);
  for (const payload of [{ ids: [] }, { ids }, { ids: [ids[0], ids[0]] }, { ids: ['missing'] }, { ids: [ids[0]], mode: 'invalid' }, { ids: [ids[0]], owner: 'constructor' }]) {
    const before = pack(s); assert.equal(act(s, 'startFieldWork', payload, T0).ok, false); assert.equal(pack(s), before);
  }
  assign(s, ids.slice(0, 2));
  const before = pack(s); assert.equal(act(s, 'startFieldWork', { ids: [ids[2]] }, T0).ok, false); assert.equal(pack(s), before);
  assert.ok(act(s, 'releaseHand', { role: 'field' }, T0).ok); assert.equal(s.fieldWork.job, null);
  assert.deepEqual(s.fieldWork.last, { done: 0, skipped: 2, spent: 0 });
});

test('opening family help is preserved until an explicit free switch, which then persists', () => {
  const s = game(); s.level = 4; s.barn.cap = 10000;
  s.placed.protected = { kind: 'bed', x: 32, z: 57, rot: 0 };
  s.beds.protected = { crop: 'wheat', doneAt: T0 };
  assert.equal(s.fieldWork.enabled, false);
  const coins = s.coins;
  assert.ok(act(s, 'protectFieldCrops', {}, T0).ok);
  assert.equal(s.coins, coins);
  const back = unpack(pack(s));
  round(back, T0 + 1000); round(back, T0 + 2000);
  assert.equal(back.fieldWork.enabled, true); assert.ok(back.beds.protected);
});
test('a returning old field hire is retained and cannot sweep unassigned crops', () => {
  const { s, ids } = setup(2); delete s.fieldWork;
  const back = unpack(pack(s)); const coins = back.coins;
  round(back, T0 + 1000);
  assert.ok(back.hands.field); assert.deepEqual(Object.keys(back.beds), ids); assert.equal(back.coins, coins);
});


test('a backward clock resets the viewing pause once and hired work resumes within one round', () => {
  const { s, ids } = setup(1);
  s.beds[ids[0]].doneAt = T0 - 3 * 3_600_000;
  assign(s, ids); const coins = s.coins;
  s.handsAt = T0 + HANDS.everyMs;
  const back = T0 - 3_600_000;
  tick(s, back);
  assert.equal(s.fieldWork.job.targets[0].ripeAt, back);
  assert.equal(s.handsAt, back + HANDS.everyMs);
  tick(s, back + 30_000);
  assert.equal(s.fieldWork.job.targets[0].ripeAt, back, 'the viewing window restarted again');
  assert.ok(s.beds[ids[0]]);
  tick(s, back + HANDS.everyMs);
  assert.equal(s.fieldWork.job, null); assert.equal(s.fieldWork.last.done, 1);
  assert.equal(s.coins, coins - HANDS.wage);
});
