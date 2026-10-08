import './tz.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, SAVE_VERSION } from '../src/core/state.mjs';
import { act, tick } from '../src/core/act.mjs';
import { pack, unpack } from '../src/kit/save.mjs';
import { explorationStatus, unreadExploration } from '../src/core/exploration.mjs';
import { PICNIC_TRAIL, EXPLORATION_STEPS } from '../src/content/exploration.mjs';
import { VI } from '../src/i18n/vi.mjs';
import { T0 } from './helpers.mjs';

test('real order completion unlocks the trail; act and save preserve its one-time reward and history', () => {
  let s = newGame(T0, 3, { restore: true }); tick(s, T0);
  assert.equal(explorationStatus(s).eligible, false);
  const order = s.orders.cards.find(c => c.story);
  assert.ok(order); assert.equal(act(s, 'deliverOrder', { id: order.id }, T0).ok, true);
  assert.equal(explorationStatus(s).eligible, true);
  const coins = s.coins, xp = s.xp, prior = s.stored.flowerpot ?? 0;
  for (const step of EXPLORATION_STEPS) {
    const r = act(s, 'inspectExploration', { step: step.id }, T0 + 100);
    assert.equal(r.ok, true); assert.ok(r.events.some(e => e.type === 'explorationStep' && e.step === step.id));
    assert.equal(s.firsts[`exploration:${step.id}`], T0 + 100);
    assert.ok(s.news.some(e => e.type === 'explorationStep' && e.step === step.id));
    s = unpack(pack(s));
  }
  assert.equal(s.version, SAVE_VERSION); assert.equal(s.coins, coins); assert.equal(s.xp, xp);
  assert.equal(s.stored.flowerpot, prior + 1); assert.equal(unreadExploration(s), 3);
  for (const step of EXPLORATION_STEPS) assert.equal(act(s, 'readExploration', { step: step.id }, T0 + 100).ok, true);
  assert.equal(unreadExploration(s), 0);
  const before = structuredClone(s);
  assert.equal(act(s, 'inspectExploration', { step: 'share' }, T0 + 100).ok, false);
  assert.deepEqual(s, before);
});

test('version 7 farms begin an optional trail without retroactive memory or reward', () => {
  const old = newGame(T0, 3, { restore: true }); old.version = 7; delete old.exploration; old.stats.ordersFilled = 15;
  const money = old.coins, loaded = unpack(pack(old));
  assert.equal(loaded.version, SAVE_VERSION); assert.equal(loaded.coins, money);
  assert.deepEqual(loaded.exploration, { steps: [], read: [], completedAt: null });
  assert.equal(explorationStatus(loaded).next.id, 'porch'); assert.equal(unreadExploration(loaded), 0);
  assert.equal(loaded.stored.flowerpot, undefined);
});

test('every exploration content string and speaker line has an authored Vietnamese translation', () => {
  const strings = [PICNIC_TRAIL.title, PICNIC_TRAIL.text, PICNIC_TRAIL.hint,
    ...EXPLORATION_STEPS.flatMap(s => [s.title, s.label, s.text, s.story, ...s.lines.map(l => l.text)])];
  for (const text of strings) assert.ok(typeof VI[text] === 'string' && VI[text].length, text);
});
