// Bounded, reward-free migration. Independent of rule modules that import state.
import { CROPS } from '../content/goods.mjs';
import { GARDEN_STEPS, LEARNING, REPAIR_LESSON } from '../content/learning.mjs';
const record = v => v && typeof v === 'object' && !Array.isArray(v) ? v : {};
export const learningStamp = v => Number.isSafeInteger(v) && v >= 0;
export const newLearning = () => ({ introducedAt: null, lessonIndex: 0, learnedAt: null, steps: [], read: [],
  energy: 0, energyAt: 0, restAt: null, restSerial: 0, restDone: 0 });
export const stampLearning = (s, id, at) => { (s.firsts ??= {})[`learning:${id}`] = at; };
export function normalizeLearning(s) {
  const raw = record(s.learning), firsts = record(s.firsts);
  const savedStamp = (field, key = field) => learningStamp(raw[field]) ? raw[field]
    : learningStamp(firsts[`learning:${key}`]) ? firsts[`learning:${key}`] : null;
  const rawSteps = Array.isArray(raw.steps) ? raw.steps : [];
  const end = Math.max(learningStamp(firsts['learning:memory:garden-ready']) ? 3 : learningStamp(firsts['learning:memory:seed-label']) ? 1 : 0,
    GARDEN_STEPS.reduce((n, step, i) => rawSteps.includes(step.id) || learningStamp(firsts[`learning:step:${step.id}`]) ? i + 1 : n, 0));
  const lessonIndex = Math.max(end ? REPAIR_LESSON.length : 0,
    learningStamp(raw.lessonIndex) ? Math.min(REPAIR_LESSON.length, raw.lessonIndex) : 0,
    ...REPAIR_LESSON.map((q, i) => learningStamp(firsts[`learning:answer:${q.id}`]) ? i + 1 : 0));
  const learnedAt = savedStamp('learnedAt', 'skill') ?? (lessonIndex === REPAIR_LESSON.length ? 0 : null);
  const introducedAt = savedStamp('introducedAt', 'introduced') ?? (learnedAt !== null || lessonIndex ? 0 : null);
  const memories = [...(end >= 1 ? ['seed-label'] : []), ...(end >= GARDEN_STEPS.length ? ['garden-ready'] : [])];
  const savedAt = learningStamp(raw.energyAt) ? raw.energyAt : introducedAt ?? 0;
  const backupAt = firsts['learning:energyAt'];
  const backup = learningStamp(backupAt) && backupAt > savedAt;
  const energy = backup ? firsts['learning:energy'] : raw.energy;
  const restSerial = Math.max(learningStamp(raw.restSerial) ? raw.restSerial : 0, learningStamp(firsts['learning:restSerial']) ? firsts['learning:restSerial'] : 0);
  const restDone = Math.min(restSerial, Math.max(learningStamp(raw.restDone) ? raw.restDone : 0, learningStamp(firsts['learning:restDone']) ? firsts['learning:restDone'] : 0));
  return { introducedAt, lessonIndex: learnedAt !== null ? REPAIR_LESSON.length : lessonIndex, learnedAt,
    steps: GARDEN_STEPS.slice(0, end).map(row => row.id),
    read: memories.filter(id => Array.isArray(raw.read) && raw.read.includes(id) || learningStamp(firsts[`learning:read:${id}`])),
    energy: introducedAt !== null && learningStamp(energy) ? Math.min(LEARNING.cap, energy) : 0,
    energyAt: backup ? backupAt : savedAt,
    restAt: introducedAt !== null && learningStamp(raw.restAt) && raw.restSerial === restSerial && restSerial > restDone ? raw.restAt : null,
    restSerial, restDone };
}
export const gardenComplete = s => normalizeLearning(s).steps.length === GARDEN_STEPS.length;
export const cropOpen = (s, id) => !!CROPS[id] && s.level >= CROPS[id].level && (!CROPS[id].skill || gardenComplete(s));
