import test from 'node:test';
import assert from 'node:assert/strict';
import { EXPLORATION_STEPS, PICNIC_TRAIL } from '../src/content/exploration.mjs';
import { actions, newExploration, normalizeExploration, explorationStatus, unreadExploration } from '../src/core/exploration.mjs';

const T0 = 1_700_000_000_000;
const fresh = () => ({ mode: 'restore', stats: { ordersFilled: 1, coinsEarned: 17 }, coins: 500, xp: 9,
  stored: { flowerpot: 2, bench: 1 }, mail: { read: ['ellis-1'] }, story: { chapter: 1 }, exploration: newExploration() });
function run(s, action, step, now = T0) {
  const events = [], ctx = { s, now, emit: (type, data) => events.push({ type, ...data }), fail: reason => ({ ok: false, reason }) };
  return { ok: true, ...actions[action](ctx, { step }), events };
}
function refused(s, action, step, now = T0) {
  const before = structuredClone(s), result = run(s, action, step, now);
  assert.equal(result.ok, false); assert.deepEqual(result.events, []); assert.deepEqual(s, before);
}
const inspect = (s, step, now = T0) => { const r = run(s, 'inspectExploration', step, now); assert.equal(r.ok, true); return r; };

test('exploration unlocks only after a restored farm fills an order, without counting unfinished tasks as unread', () => {
  for (const [mode, count] of [['restore', 0], [null, 1], ['restore', NaN], ['restore', '1'], ['restore', Infinity]]) {
    const s = fresh(); s.mode = mode; s.stats.ordersFilled = count; delete s.exploration;
    assert.equal(explorationStatus(s).next, null); assert.equal(unreadExploration(s), 0);
    refused(s, 'inspectExploration', 'porch'); assert.equal(Object.hasOwn(s, 'exploration'), false);
  }
  const s = fresh(); assert.equal(explorationStatus(s).next.id, 'porch'); assert.equal(unreadExploration(s), 0);
});

test('porch, pond and share form one sequential optional trail with exactly one stored flowerpot reward', () => {
  const s = fresh(), unchanged = structuredClone(s); delete unchanged.exploration; delete unchanged.stored;
  for (const [index, step] of ['porch', 'pond', 'share'].entries()) {
    const r = inspect(s, step, T0 + index);
    assert.deepEqual(r.events, [{ type: 'explorationStep', id: PICNIC_TRAIL.id, step, complete: step === 'share', ...(step === 'share' ? { decor: 'flowerpot' } : {}) }]);
    assert.equal(unreadExploration(s), index + 1);
    assert.equal(s.stored.flowerpot, index === 2 ? 3 : 2);
  }
  assert.equal(explorationStatus(s).complete, true); assert.equal(explorationStatus(s).next, null);
  assert.equal(s.exploration.completedAt, T0 + 2); assert.equal(s.stored.bench, 1);
  const after = structuredClone(s); delete after.exploration; delete after.stored;
  assert.deepEqual(after, unchanged, 'the trail must not change money, experience, mail, story gates or other game state');
});

test('unknown, duplicate and out-of-order inspections refuse without initializing or changing any state', () => {
  const s = fresh(); delete s.exploration;
  for (const step of [undefined, null, {}, 'constructor', '__proto__', 'unknown', 'pond', 'share']) refused(s, 'inspectExploration', step);
  inspect(s, 'porch'); refused(s, 'inspectExploration', 'porch'); refused(s, 'inspectExploration', 'share');
  inspect(s, 'pond'); refused(s, 'inspectExploration', 'pond'); inspect(s, 'share');
  for (const step of ['porch', 'pond', 'share']) refused(s, 'inspectExploration', step);
});

test('only earned memories can be read, and replay never changes rewards or emits another event', () => {
  const s = fresh(); delete s.exploration;
  refused(s, 'readExploration', 'porch'); refused(s, 'readExploration', 'unknown');
  inspect(s, 'porch'); refused(s, 'readExploration', 'pond');
  assert.equal(run(s, 'readExploration', 'porch').read, true); assert.equal(unreadExploration(s), 0);
  const before = structuredClone(s); assert.deepEqual(run(s, 'readExploration', 'porch').events, []); assert.deepEqual(s, before);
  inspect(s, 'pond'); inspect(s, 'share');
  for (const step of ['porch', 'pond', 'share']) assert.deepEqual(run(s, 'readExploration', step).events, []);
  assert.equal(unreadExploration(s), 0); assert.equal(s.stored.flowerpot, 3);
});

test('JSON round-trips preserve progress, unread memories and completion after the decoration is used', () => {
  let s = fresh(); inspect(s, 'porch'); run(s, 'readExploration', 'porch');
  s = JSON.parse(JSON.stringify(s)); assert.equal(explorationStatus(s).next.id, 'pond'); assert.equal(unreadExploration(s), 0);
  inspect(s, 'pond'); s = JSON.parse(JSON.stringify(s)); assert.equal(unreadExploration(s), 1);
  inspect(s, 'share'); s.stored.flowerpot = 0;
  s = JSON.parse(JSON.stringify(s)); refused(s, 'inspectExploration', 'share');
  for (const step of ['porch', 'pond', 'share']) run(s, 'readExploration', step);
  assert.equal(s.stored.flowerpot, 0); assert.equal(explorationStatus(s).complete, true);
});

test('normalization is pure, bounded and idempotent, and legacy saves get no retroactive grant', () => {
  const s = fresh(); delete s.exploration; s.stats.ordersFilled = 200;
  const before = structuredClone(s);
  assert.deepEqual(normalizeExploration(s), newExploration()); assert.equal(explorationStatus(s).next.id, 'porch'); assert.deepEqual(s, before);
  for (const exploration of [null, [], true, 'porch', { steps: [null, {}, 'unknown'], read: ['share'], completedAt: -1 }]) {
    const legacy = { ...s, exploration }, snap = structuredClone(legacy);
    assert.deepEqual(normalizeExploration(legacy), newExploration()); assert.deepEqual(legacy, snap);
  }
  s.exploration = { steps: ['porch', 'pond', 'pond', 'unknown'], read: ['pond', 'unknown', 'share'], completedAt: Infinity, extra: 'discard' };
  const normalized = normalizeExploration(s);
  assert.deepEqual(normalized, { steps: ['porch', 'pond'], read: ['pond'], completedAt: null });
  assert.deepEqual(normalizeExploration({ exploration: normalized }), normalized);
});

test('partial imported completion markers cannot make the reward claimable again', () => {
  for (const exploration of [{ steps: ['share'] }, { completedAt: T0 }, { steps: ['share'], completedAt: -5 }]) {
    const s = fresh(); s.exploration = exploration; const before = structuredClone(s);
    const normalized = normalizeExploration(s);
    assert.deepEqual(normalized.steps, ['porch', 'pond', 'share']); assert.notEqual(normalized.completedAt, null);
    assert.equal(explorationStatus(s).complete, true); refused(s, 'inspectExploration', 'share'); assert.deepEqual(s, before);
    assert.ok(unreadExploration(s) <= 1, 'normalizing earlier implied steps must not create new notifications');
  }
  const s = fresh(); s.exploration = { steps: ['pond'], read: [] };
  assert.equal(explorationStatus(s).next.id, 'share'); assert.equal(unreadExploration(s), 1);
});

test('farm profiles have independent progress and reward accounting', () => {
  const a = fresh(), b = fresh(), c = fresh();
  for (const step of ['porch', 'pond', 'share']) inspect(a, step);
  inspect(b, 'porch');
  assert.equal(explorationStatus(a).complete, true); assert.equal(explorationStatus(b).next.id, 'pond'); assert.equal(explorationStatus(c).next.id, 'porch');
  assert.deepEqual([a.stored.flowerpot, b.stored.flowerpot, c.stored.flowerpot], [3, 2, 2]);
  assert.deepEqual([unreadExploration(a), unreadExploration(b), unreadExploration(c)], [3, 1, 0]);
});

test('the firsts journal restores earned progress without repaying a lost completion record', () => {
  const s = fresh(); delete s.exploration;
  s.firsts = { 'exploration:pond': T0 };
  const before = structuredClone(s), progress = normalizeExploration(s);
  assert.deepEqual(progress, { steps: ['porch', 'pond'], read: ['porch'], completedAt: null });
  assert.equal(explorationStatus(s).next.id, 'share'); assert.equal(unreadExploration(s), 1); assert.deepEqual(s, before);
  refused(s, 'inspectExploration', 'pond');
  for (const exploration of [undefined, { steps: [], read: [] }, { steps: ['porch'], read: ['porch'] }]) {
    s.exploration = exploration; s.firsts = { 'exploration:share': T0 + 7 }; s.stored.flowerpot = 0;
    assert.deepEqual(normalizeExploration(s), { steps: ['porch', 'pond', 'share'], read: ['porch', 'pond'], completedAt: T0 + 7 });
    assert.equal(unreadExploration(s), 1); refused(s, 'inspectExploration', 'share');
    assert.equal(s.stored.flowerpot, 0); assert.equal(run(s, 'readExploration', 'share').read, true);
    assert.equal(unreadExploration(s), 0); assert.equal(s.stored.flowerpot, 0);
  }
  s.exploration = undefined; s.firsts = { 'exploration:share': 0 };
  assert.equal(explorationStatus(s).complete, true); assert.equal(normalizeExploration(s).completedAt, 0);
  for (const value of [-1, NaN, Infinity, '1']) {
    s.firsts = { 'exploration:share': value, 'exploration:unknown': T0 };
    assert.deepEqual(normalizeExploration(s), newExploration());
  }
});

test('invalid clock or storage values refuse before saving a final marker', () => {
  const s = fresh(); refused(s, 'inspectExploration', 'porch', NaN); inspect(s, 'porch'); inspect(s, 'pond');
  for (const current of [-1, NaN, Infinity, '2', Number.MAX_SAFE_INTEGER]) {
    s.stored.flowerpot = current; refused(s, 'inspectExploration', 'share');
  }
  s.stored.flowerpot = 0; inspect(s, 'share', 0); assert.equal(s.exploration.completedAt, 0); assert.equal(explorationStatus(s).complete, true);
});

test('old saves without storage initialize it only when the final action grants the decoration', () => {
  const s = fresh(); delete s.stored; inspect(s, 'porch'); assert.equal(Object.hasOwn(s, 'stored'), false);
  inspect(s, 'pond'); inspect(s, 'share'); assert.deepEqual(s.stored, { flowerpot: 1 });
});

test('each authored step has a readable hint, a replay scene and an existing family speaker', () => {
  assert.deepEqual(EXPLORATION_STEPS.map(s => s.id), ['porch', 'pond', 'share']);
  assert.deepEqual(EXPLORATION_STEPS.map(s => s.location), ['porch', 'pond', 'porch']);
  assert.deepEqual(PICNIC_TRAIL.reward, { decor: 'flowerpot', count: 1 });
  for (const step of EXPLORATION_STEPS) {
    for (const key of ['title', 'label', 'text', 'story']) assert.ok(typeof step[key] === 'string' && step[key].length > 0 && step[key].length < 200);
    assert.equal(step.lines.length, 3);
    for (const line of step.lines) { assert.ok(['ada', 'june', 'pip'].includes(line.who)); assert.ok(line.text.length <= 130); }
  }
});
