import { LEARNING, REPAIR_LESSON, GARDEN_STEPS, LEARNING_MEMORIES } from '../content/learning.mjs';
import { newLearning, normalizeLearning, learningStamp, stampLearning } from './learning-state.mjs';
export { newLearning, normalizeLearning } from './learning-state.mjs';

const eligible = (s, now) => s.story?.chapter >= 3 && Object.entries(s.homes ?? {}).some(([id, home]) =>
  s.placed?.[id]?.kind === 'cottage' && home.family === 'tran' && home.arrived === true && learningStamp(home.arrivesAt) && home.arrivesAt <= now);
/** Pure energy projection. A backward clock earns nothing; full reserves cannot bank future recovery. */
function energyAt(l, now) {
  if (l.introducedAt === null || !learningStamp(now)) return l;
  const next = { ...l }, minutes = Math.floor(Math.max(0, now - l.energyAt) / LEARNING.everyMs);
  next.energy = Math.min(LEARNING.cap, l.energy + minutes);
  next.energyAt = next.energy === LEARNING.cap ? Math.max(l.energyAt, now) : l.energyAt + minutes * LEARNING.everyMs;
  if (l.restAt !== null && now >= l.restAt + LEARNING.restMs) {
    next.energy = Math.min(LEARNING.cap, next.energy + LEARNING.restGain);
    next.energyAt = Math.max(next.energyAt, now); next.restAt = null; next.restDone = l.restSerial;
  }
  return next;
}
function save(ctx, l) {
  ctx.s.learning = l;
  stampLearning(ctx.s, 'energy', l.energy); stampLearning(ctx.s, 'energyAt', l.energyAt);
  stampLearning(ctx.s, 'restSerial', l.restSerial); stampLearning(ctx.s, 'restDone', l.restDone);
}
export function learningStatus(s, now = Date.now()) {
  const l = energyAt(normalizeLearning(s), now), complete = l.steps.length === GARDEN_STEPS.length;
  const nextStep = l.learnedAt !== null && !complete ? GARDEN_STEPS[l.steps.length] : null;
  const restLeftMs = l.restAt === null ? 0 : Math.min(LEARNING.restMs, Math.max(0, l.restAt + LEARNING.restMs - now));
  return { eligible: eligible(s, now), introduced: l.introducedAt !== null, learned: l.learnedAt !== null,
    lessonIndex: l.lessonIndex, question: l.introducedAt !== null && l.learnedAt === null ? REPAIR_LESSON[l.lessonIndex] : null,
    steps: l.steps, nextStep, complete, energy: l.energy, cap: LEARNING.cap, resting: l.restAt !== null, restLeftMs,
    canRest: l.introducedAt !== null && l.energy < LEARNING.cap && l.restAt === null,
    coinsNeeded: Math.max(0, (nextStep?.coins ?? 0) - s.coins), energyNeeded: Math.max(0, (nextStep?.energy ?? 0) - l.energy),
    canWork: !!nextStep && s.coins >= nextStep.coins && l.energy >= nextStep.energy,
    earned: LEARNING_MEMORIES.filter(m => m.id === 'seed-label' ? l.steps.length >= 1 : complete).map(m => ({ ...m, read: l.read.includes(m.id) })) };
}
export const unreadLearning = s => learningStatus(s).earned.filter(m => !m.read).length;
export function tickLearning(ctx) {
  if (!learningStamp(ctx.now)) return;
  const before = normalizeLearning(ctx.s); if (before.introducedAt === null) return;
  // Rest is always a short, free wait, including after a clock correction. Passive recovery keeps its high-water mark.
  if (before.restAt !== null && before.restAt > ctx.now) before.restAt = ctx.now;
  const after = energyAt(before, ctx.now);
  if (after.energy !== ctx.s.learning?.energy || after.restAt !== ctx.s.learning?.restAt) {
    save(ctx, after); ctx.emit('projectEnergy', { energy: after.energy, rested: before.restAt !== null && after.restAt === null });
  }
}
export const actions = {
  inspectLearning(ctx) {
    if (!eligible(ctx.s, ctx.now)) return ctx.fail('Meet {person:minh:short} after the first family arrives');
    if (!learningStamp(ctx.now)) return ctx.fail('The project clock is unavailable');
    const l = normalizeLearning(ctx.s);
    if (l.introducedAt !== null) return ctx.fail('This repair lesson is already open');
    l.introducedAt = ctx.now; l.energy = LEARNING.cap; l.energyAt = ctx.now;
    save(ctx, l); stampLearning(ctx.s, 'introduced', ctx.now); ctx.emit('learningOpened'); return {};
  },
  answerRepairLesson(ctx, { question, choice }) {
    const l = normalizeLearning(ctx.s), q = REPAIR_LESSON[l.lessonIndex];
    if (!eligible(ctx.s, ctx.now)) return ctx.fail('Meet {person:minh:short} after the first family arrives');
    if (!learningStamp(ctx.now)) return ctx.fail('The project clock is unavailable');
    if (l.introducedAt === null || l.learnedAt !== null || !q || q.id !== question) return ctx.fail('Follow the next repair question');
    if (!q.choices.some(c => c.id === choice)) return ctx.fail('Choose one of the lesson answers');
    if (choice !== q.answer) return ctx.fail('Try again: {hint}', { hint: q.help });
    l.lessonIndex++; stampLearning(ctx.s, `answer:${q.id}`, ctx.now);
    if (l.lessonIndex === REPAIR_LESSON.length) { l.learnedAt = ctx.now; stampLearning(ctx.s, 'skill', ctx.now); }
    save(ctx, energyAt(l, ctx.now)); ctx.emit(l.learnedAt !== null ? 'repairLearned' : 'repairAnswered', { question }); return { learned: l.learnedAt !== null };
  },
  workGardenProject(ctx, { step }) {
    const l = energyAt(normalizeLearning(ctx.s), ctx.now), next = GARDEN_STEPS[l.steps.length];
    if (!learningStamp(ctx.now)) return ctx.fail('The project clock is unavailable');
    if (l.learnedAt === null) return ctx.fail('Learn Garden repairs first');
    if (!next || next.id !== step) return ctx.fail('Choose the next potting bench step');
    if (!Number.isSafeInteger(ctx.s.coins) || ctx.s.coins < next.coins) return ctx.fail('Not enough coins');
    if (l.energy < next.energy) return ctx.fail('Rest at home for more project energy');
    l.energy -= next.energy; l.steps.push(next.id); ctx.s.coins -= next.coins;
    save(ctx, l); stampLearning(ctx.s, `step:${next.id}`, ctx.now);
    const memory = next.id === 'uncover' ? 'seed-label' : next.id === 'trays' ? 'garden-ready' : null;
    if (memory) stampLearning(ctx.s, `memory:${memory}`, ctx.now);
    ctx.emit('gardenProject', { step, complete: next.id === 'trays', memory }); return { step, memory };
  },
  restForProject(ctx) {
    if (!learningStamp(ctx.now)) return ctx.fail('The project clock is unavailable');
    const l = energyAt(normalizeLearning(ctx.s), ctx.now);
    if (l.introducedAt === null) return ctx.fail('Open the potting bench lesson first');
    if (l.restAt !== null) return ctx.fail('Your project rest is already underway');
    if (l.energy >= LEARNING.cap) return ctx.fail('Your project energy is already full');
    if (l.restSerial >= Number.MAX_SAFE_INTEGER) return ctx.fail('The project clock is unavailable');
    l.restAt = ctx.now; l.restSerial++; save(ctx, l); ctx.emit('projectRest'); return {};
  },
  readLearningMemory(ctx, { id }) {
    const l = normalizeLearning(ctx.s), st = learningStatus(ctx.s, ctx.now);
    if (!st.earned.some(m => m.id === id)) return ctx.fail('Nothing to remember here yet');
    if (l.read.includes(id)) return ctx.fail('This garden memory is already read');
    if (!learningStamp(ctx.now)) return ctx.fail('The project clock is unavailable');
    l.read.push(id); ctx.s.learning = l; stampLearning(ctx.s, `read:${id}`, ctx.now); return { id };
  },
};
