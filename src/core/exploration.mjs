// Explicit, sequential exploration actions. Reading a memory never grants its decoration again.
import { EXPLORATION_STEPS, PICNIC_TRAIL, explorationStep } from '../content/exploration.mjs';

const ids = EXPLORATION_STEPS.map(step => step.id);
const last = ids.at(-1);
const record = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const stamp = value => Number.isSafeInteger(value) && value >= 0;
const eligible = s => s.mode === 'restore' && Number.isFinite(s.stats?.ordersFilled) && s.stats.ordersFilled >= 1;

export const newExploration = () => ({ steps: [], read: [], completedAt: null });

/** Pure, bounded save normalization; never grants anything. A later saved milestone implies the earlier ones.
 * Preserve either final marker if a partial imported save lost the other, so the decoration cannot be paid twice.
 * Inferred earlier steps are already read: repairing an incomplete record must not create new notifications. */
export function normalizeExploration(s) {
  const saved = record(s.exploration), raw = [...(Array.isArray(saved.steps) ? saved.steps : [])];
  const firsts = record(s.firsts);
  // The event journal is a second durable record if a partial imported save lost the trail object.
  for (const id of ids) if (stamp(firsts[`exploration:${id}`]) && !raw.includes(id)) raw.push(id);
  const final = raw.includes(last) || stamp(saved.completedAt);
  const end = final ? ids.length - 1 : ids.reduce((max, id, i) => raw.includes(id) ? i : max, -1);
  const steps = ids.slice(0, end + 1), acknowledged = Array.isArray(saved.read) ? saved.read : [];
  return { steps, read: steps.filter(id => acknowledged.includes(id) || !raw.includes(id)),
    completedAt: final ? stamp(saved.completedAt) ? saved.completedAt : stamp(firsts[`exploration:${last}`]) ? firsts[`exploration:${last}`] : 0 : null };
}

/** UI contract: next is an available content step or null; earned memories may always be replayed.
 * Being eligible to explore does not add a notification. Only earned and unread memories count. */
export function explorationStatus(s) {
  const e = normalizeExploration(s), complete = e.completedAt !== null, open = eligible(s);
  return { id: PICNIC_TRAIL.id, eligible: open, complete, completedAt: e.completedAt,
    next: open && !complete ? EXPLORATION_STEPS[e.steps.length] ?? null : null,
    earned: e.steps.map(id => ({ ...explorationStep(id), read: e.read.includes(id) })) };
}

export const unreadExploration = s => explorationStatus(s).earned.filter(step => !step.read).length;

export const actions = {
  inspectExploration(ctx, { step }) {
    if (!eligible(ctx.s)) return ctx.fail('Finish your first order before exploring');
    const e = normalizeExploration(ctx.s);
    if (e.completedAt !== null) return ctx.fail('This picnic memory is already complete');
    if (!explorationStep(step) || ids[e.steps.length] !== step) return ctx.fail('Follow the next picnic clue');
    if (!stamp(ctx.now)) return ctx.fail('Cannot record this picnic memory yet');
    const complete = step === last, stored = record(ctx.s.stored), decor = PICNIC_TRAIL.reward.decor;
    const current = stored[decor] ?? 0;
    // A malformed or overflowing storage count is not permission to discard stock or duplicate the final payment.
    if (complete && (!Number.isSafeInteger(current) || current < 0 || current >= Number.MAX_SAFE_INTEGER))
      return ctx.fail('Cannot record this picnic memory yet');
    e.steps.push(step);
    if (complete) e.completedAt = ctx.now;
    // The final marker and storage credit are committed together inside this one validated action.
    ctx.s.exploration = e;
    if (complete) ctx.s.stored = { ...stored, [decor]: current + PICNIC_TRAIL.reward.count };
    const result = { step, complete, ...(complete ? { decor } : {}) };
    ctx.emit('explorationStep', { id: PICNIC_TRAIL.id, ...result });
    return result;
  },

  readExploration(ctx, { step }) {
    const e = normalizeExploration(ctx.s);
    if (!explorationStep(step) || !e.steps.includes(step)) return ctx.fail('Nothing to remember here yet');
    if (!e.read.includes(step)) { e.read.push(step); ctx.s.exploration = e; }
    return { step, read: true };
  },
};
