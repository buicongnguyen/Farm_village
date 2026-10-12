// Save normalization must not import farm actions or grid/state modules.
import { CROPS } from '../content/goods.mjs';
import { FIELD_WORK, HANDS, HELP } from '../content/economy.mjs';
export { FIELD_WORK } from '../content/economy.mjs';
export const workBoardOpen = s => s.level >= HELP.level || !!s.hands?.field;
const natural = n => Number.isSafeInteger(n) && n >= 0;
export function normalizeFieldWork(s) {
  const raw = s.fieldWork, j = raw?.job;
  const last = raw?.last && natural(raw.last.done) && natural(raw.last.skipped) && natural(raw.last.spent)
    ? { done: raw.last.done, skipped: raw.last.skipped, spent: raw.last.spent } : null;
  if (!j) return { enabled: raw?.enabled === true, job: null, last };
  const ok = ['family', 'field'].includes(j.owner) && ['pause', 'ready'].includes(j.mode)
    && Array.isArray(j.targets) && j.targets.length <= FIELD_WORK.max
    && natural(j.total) && j.total > 0 && j.total <= FIELD_WORK.max
    && natural(j.done) && natural(j.skipped) && natural(j.spent)
    && j.targets.length + j.done + j.skipped === j.total && j.spent <= j.done * HANDS.wage
    && new Set(j.targets.map(p => p?.id)).size === j.targets.length
    && j.targets.every(p => p && typeof p.id === 'string' && Object.hasOwn(CROPS, p.crop)
      && Number.isFinite(p.doneAt) && p.doneAt >= 0 && (p.ripeAt === null || Number.isFinite(p.ripeAt) && p.ripeAt >= 0));
  return { enabled: raw?.enabled === true || ok, job: ok ? { owner: j.owner, mode: j.mode, total: j.total, done: j.done, skipped: j.skipped, spent: j.spent,
    targets: j.targets.map(p => ({ id: p.id, crop: p.crop, doneAt: p.doneAt, ripeAt: p.ripeAt })) } : null, last };
}
