// The build order (DESIGN 11): requirements, goods delivery, and moving on when a step is done.
import { STEPS } from '../content/projects.mjs';
import { FAMILIES } from '../content/people.mjs';
import { RECIPES, FRUITS } from '../content/goods.mjs';
import { BUILDINGS } from '../content/buildings.mjs';
import { XP } from '../content/economy.mjs';
import * as barn from './barn.mjs';
import { committedCount } from './working.mjs';
import { gainXp } from './levels.mjs';
import { civicBuildReason } from './village-growth.mjs';

export const stepIndex = id => STEPS.findIndex(st => st.id === id);
/** Where the checklist starts: the first step that locks nothing (content/projects.mjs). Steps before it run in order
 *  and are kept by position (s.projects.step). From here on a step is kept by id (s.firsts['project:<id>']) and is
 *  ticked off whenever it is true, so a later chapter can add a step anywhere in this part without moving an old farm. */
export const TAIL = STEPS.findIndex(st => !st.builds.length);
const stamped = (s, step) => !!s.firsts?.[`project:${step.id}`];
/** Is this step behind the player? (For the list in Village projects.) */
export const stepDone = (s, id) => { const i = stepIndex(id); return i >= 0 && (i < TAIL ? i < s.projects.step : stamped(s, STEPS[i])); };
export const currentStep = s => STEPS[s.projects.step] ?? null;
export const reached = (s, id) => s.projects.step >= stepIndex(id);
export const completed = (s, id) => s.projects.step > stepIndex(id);
export const familiesIn = (s, now = Infinity) => Object.values(s.homes).filter(h => h.family && h.arrivesAt <= now).map(h => FAMILIES.find(f => f.id === h.family));
/** Are the current step's requirements met? { ok, missing: [{ need, have, want }] } */
export function stepReady(s, now = Infinity) {
  const step = currentStep(s); if (!step) return { ok: false, missing: [] };
  const missing = [];
  if (step.needs.level && s.level < step.needs.level) missing.push({ need: 'level', have: s.level, want: step.needs.level });
  if (step.needs.families) { const have = familiesIn(s, now).length; if (have < step.needs.families) missing.push({ need: 'families', have, want: step.needs.families }); }
  if (step.needs.kidsFamilies) { const have = familiesIn(s, now).filter(f => f.kids).length; if (have < step.needs.kidsFamilies) missing.push({ need: 'kidsFamilies', have, want: step.needs.kidsFamilies }); }
  return { ok: !missing.length, missing };
}
export const deliveredAll = (s, step = currentStep(s)) => !step?.deliver || Object.entries(step.deliver).every(([id, n]) => (s.projects.delivered[id] ?? 0) >= n);
/** How many of a kind may exist now (build-order allowances and per-kind maxima). */
export function allowance(s, kind) {
  const def = BUILDINGS[kind]; let max = def.max ?? Infinity;
  const allows = STEPS.slice(0, s.projects.step + 1).map(st => st.allow?.[kind]).filter(n => n != null);
  if (allows.length) max = Math.min(max, Math.max(...allows));
  return max;
}
/** Can this kind be placed at all right now (ignoring the spot)? { ok, reason, params } */
export function mayBuild(s, kind, { repair = false, now = s.lastSeen } = {}) {
  const def = BUILDINGS[kind];
  if (def.choice && s.story?.albright !== def.choice) return { ok: false, reason: 'This belongs to the other answer you could have given', params: { kind, lock: 'choice' } };
  if (def.lot) return (s.counts[kind] ?? 0) >= (def.max ?? Infinity) ? { ok: false, reason: 'The quay has all of these it can hold', params: { kind, lock: 'max' } } : { ok: true };   // core/riverside.mjs judges the rest
  if (def.site) return (s.counts[kind] ?? 0) > 0 ? { ok: false, reason: 'It is already built', params: { kind, lock: 'max' } } : { ok: true };   // core/sites.mjs judges the rest
  const civicReason = civicBuildReason(s, kind); if (civicReason) return { ok: false, reason: civicReason };
  if (def.garden) return { ok: false, reason: 'It grows by itself in your streak garden', params: { kind, lock: 'garden' } };
  if (def.project && !reached(s, def.project)) return { ok: false, reason: 'Opens with the project "{name}"', params: { name: STEPS[stepIndex(def.project)].name, project: def.project, kind, lock: 'project' } };
  if (def.after && !completed(s, def.after)) return { ok: false, reason: 'Opens after the project "{name}"', params: { name: STEPS[stepIndex(def.after)].name, project: def.after, kind, lock: 'project' } };
  // repairing a broken thing needs a free place among the working ones; building needs a free place among all that stand
  const have = repair ? committedCount(s, kind) : s.counts[kind] ?? 0;
  if (have >= allowance(s, kind)) return { ok: false, reason: 'You have built all you can of this for now', params: { kind, lock: 'max' } };
  // a step's building waits until its goods are delivered
  const step = currentStep(s);
  if (def.project === 'clinic' && step?.id === 'clinic' && !stepReady(s, now).ok) return { ok: false, reason: 'The project is not open yet' };
  if (step?.builds.includes(kind) && step.deliver && !deliveredAll(s, step) && (kind !== 'cottage' || have >= (STEPS[s.projects.step - 1]?.allow?.cottage ?? 0)))
    return { ok: false, reason: 'Deliver the goods for "{name}" first', params: { name: step.name, project: step.id, kind, lock: 'goods' } };
  return { ok: true };
}
/** The extra project price for a building (the step's `cost`), on top of the catalogue price. */
export const projectCost = (s, kind) => { const step = currentStep(s); return step?.builds.includes(kind) && step.cost ? step.cost : 0; };
/** Move past every step whose `done` test passes. */
export function advance(ctx) {
  const { s } = ctx, finished = [];
  const finish = step => {
    (s.firsts ??= {})[`project:${step.id}`] ??= ctx.now;   // stamped here, so the cart (the day after the school) sees it in the same action
    gainXp(ctx, XP.build * 4); finished.push(step);
  };
  while (s.projects.step < TAIL && currentStep(s).done(s)) { const step = currentStep(s); s.projects.step++; s.projects.delivered = {}; finish(step); }
  if (s.projects.step >= TAIL) {
    // the checklist: whatever is true is ticked off (once: the stamp is the record); the step shown is the first still open
    for (const step of STEPS.slice(TAIL)) if (!stamped(s, step) && step.done(s)) finish(step);
    const open = STEPS.findIndex((st, i) => i >= TAIL && !stamped(s, st)), at = open < 0 ? STEPS.length : open;
    if (at !== s.projects.step) { s.projects.step = at; s.projects.delivered = {}; }
  }
  for (const step of finished) ctx.emit('projectDone', { id: step.id, name: step.name, next: currentStep(s)?.id ?? null });
}
/** Where a missing good is made, for "show the way" (DESIGN 11): a building kind, or 'farm' for crops. */
export function madeAt(good) {
  if (RECIPES[good]) return RECIPES[good].at;
  if (good === 'egg') return 'coop'; if (good === 'milk') return 'cow_barn'; if (good === 'goat_milk') return 'goat_barn';
  if (FRUITS[good]) return FRUITS[good].tree;
  return 'farm';
}

export const actions = {
  /** Hand over goods for the current step: { goods: { id: n } } or everything that is missing and in the barn. */
  projectDeliver(ctx, { goods } = {}) {
    const { s, now } = ctx, step = currentStep(s);
    if (!step?.deliver) return ctx.fail('This project needs no goods');
    if (!stepReady(s, now).ok) return ctx.fail('The project is not open yet');
    if (goods != null && (typeof goods !== 'object' || Array.isArray(goods) || Object.entries(goods).some(([id, n]) => !Object.hasOwn(step.deliver, id) || !Number.isSafeInteger(n) || n < 0))) return ctx.fail('Missing ingredients');
    let given = 0;
    for (const [id, want] of Object.entries(step.deliver)) {
      const left = want - (s.projects.delivered[id] ?? 0), n = Math.min(left, goods?.[id] ?? left, barn.stock(s, id));
      if (n > 0) { barn.take(s, { [id]: n }, false); s.projects.delivered[id] = (s.projects.delivered[id] ?? 0) + n; given += n; }
    }
    if (!given) return ctx.fail('Missing ingredients');
    ctx.emit('delivered', { step: step.id, given, complete: deliveredAll(s, step) });
    return { given, complete: deliveredAll(s, step) };
  },
};
