// Finite harvest assignments. Unassigned crops always belong to the player.
import { CROPS } from '../content/goods.mjs';
import { HANDS, HELP, WEAR } from '../content/economy.mjs';
import { actions as farm } from './farm.mjs';
import * as barn from './barn.mjs';

import { FIELD_WORK, workBoardOpen } from './field-work-state.mjs';
export { FIELD_WORK, workBoardOpen, normalizeFieldWork } from './field-work-state.mjs';
const targetMatches = (s, p) => s.placed[p.id]?.kind === 'bed' && s.beds[p.id]?.crop === p.crop && s.beds[p.id]?.doneAt === p.doneAt;
function finish(ctx) {
  const w = ctx.s.fieldWork, j = w?.job;
  if (j && !j.targets.length) {
    w.last = { done: j.done, skipped: j.skipped, spent: j.spent }; w.job = null;
    ctx.emit('fieldWorkFinished', { ...w.last });
  }
}
// Observe ripeness before either helper runs. A return from absence gives paused crops a fresh viewing window.
export function observeFieldWork(ctx) {
  const { s, now } = ctx, j = s.fieldWork?.job; if (!j) return;
  const away = now - s.lastSeen > WEAR.tickCapMs; // backward clocks reset ripeAt once below, not on every tick
  j.targets = j.targets.filter(p => { if (targetMatches(s, p)) return true; j.skipped++; return false; });
  for (const p of j.targets) {
    if (now < p.doneAt) p.ripeAt = null;
    else if (p.ripeAt === null || away || p.ripeAt > now) p.ripeAt = now;
  }
  finish(ctx);
}
export const actions = {
  protectFieldCrops(ctx) {
    if (!workBoardOpen(ctx.s)) return ctx.fail('Reach level {level} first', { level: HELP.level });
    if (ctx.s.fieldWork?.job) return ctx.fail('Finish or cancel the current assignment first');
    ctx.s.fieldWork = { enabled: true, job: null, last: ctx.s.fieldWork?.last ?? null };
    ctx.emit('fieldWorkChanged'); return {};
  },
  startFieldWork(ctx, { ids, owner = 'family', mode = 'pause' }) {
    const { s, now } = ctx;
    if (!workBoardOpen(s)) return ctx.fail('Reach level {level} first', { level: HELP.level });
    if (s.fieldWork?.job) return ctx.fail('Finish or cancel the current assignment first');
    if (!['family', 'field'].includes(owner) || !['pause', 'ready'].includes(mode)) return ctx.fail('Choose a valid harvest assignment');
    if (owner === 'field' && (!s.hands?.field || !(s.counts?.school > 0))) return ctx.fail('Hire a field hand first');
    if (!Array.isArray(ids) || !ids.length || ids.length > FIELD_WORK.max || new Set(ids).size !== ids.length
      || ids.some(id => typeof id !== 'string' || s.placed[id]?.kind !== 'bed' || !Object.hasOwn(CROPS, s.beds[id]?.crop)
        || !Number.isFinite(s.beds[id]?.doneAt) || s.beds[id].doneAt < 0))
      return ctx.fail('Choose up to {count} planted beds', { count: FIELD_WORK.max });
    if (owner === 'field' && s.coins < ids.length * HANDS.wage) return ctx.fail('Not enough coins');
    s.fieldWork = { enabled: true, job: { owner, mode, total: ids.length, done: 0, skipped: 0, spent: 0,
      targets: ids.map(id => ({ id, crop: s.beds[id].crop, doneAt: s.beds[id].doneAt, ripeAt: s.beds[id].doneAt <= now ? now : null })) }, last: null };
    ctx.emit('fieldWorkChanged'); return {};
  },
  cancelFieldWork(ctx) {
    if (!ctx.s.fieldWork?.job) return ctx.fail('No harvest assignment is active');
    const j = ctx.s.fieldWork.job;
    ctx.s.fieldWork = { enabled: true, job: null, last: { done: j.done, skipped: j.skipped + j.targets.length, spent: j.spent } };
    ctx.emit('fieldWorkChanged'); return {};
  },
};
/** One small round. Manual work wins; no substitutes, replanting, extra purchases or overflow sales. */
export function workFieldRound(ctx, owner) {
  const { s, now } = ctx, j = s.fieldWork?.job;
  if (!j || j.owner !== owner) return { count: 0, at: null };
  let count = 0, at = null;
  const candidates = [...j.targets];
  for (const p of candidates) {
    if (count >= (owner === 'family' ? HELP.beds : FIELD_WORK.batch)) break;
    if (!targetMatches(s, p)) { j.targets.splice(j.targets.indexOf(p), 1); j.skipped++; continue; }
    if (p.doneAt > now || p.ripeAt === null || j.mode === 'pause' && now - p.ripeAt < FIELD_WORK.graceMs) continue;
    if (barn.space(s) < 2 || owner === 'field' && s.coins < HANDS.wage) break;
    const result = farm.harvest(ctx, { id: p.id });
    if (result?.ok === false || !result?.harvested) continue;
    j.targets.splice(j.targets.indexOf(p), 1); j.done++; count++; at ??= p.id;
    // Hired wages are charged by tickHands in the same round. Reserve their cumulative affordability here.
    if (owner === 'field') { j.spent += HANDS.wage; if (s.coins < (count + 1) * HANDS.wage) break; }
  }
  finish(ctx); return { count, at };
}
