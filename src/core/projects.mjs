// The build order (DESIGN 11): requirements, goods delivery, and moving on when a step is done.
import { STEPS } from '../content/projects.mjs';
import { FAMILIES } from '../content/people.mjs';
import { RECIPES, FRUITS } from '../content/goods.mjs';
import { BUILDINGS } from '../content/buildings.mjs';
import { XP } from '../content/economy.mjs';
import * as barn from './barn.mjs';
import { gainXp } from './levels.mjs';

export const stepIndex = id => STEPS.findIndex(st => st.id === id);
export const currentStep = s => STEPS[s.projects.step] ?? null;
export const reached = (s, id) => s.projects.step >= stepIndex(id);
export const completed = (s, id) => s.projects.step > stepIndex(id);
export const familiesIn = (s, now = Infinity) => Object.values(s.homes).filter(h => h.family && h.arrivesAt <= now).map(h => FAMILIES.find(f => f.id === h.family));
/** Are the current step's requirements met? { ok, missing: [{ need, have, want }] } */
export function stepReady(s, now = Infinity) {
  const step = currentStep(s); if (!step) return { ok: false, missing: [] };
  const missing = [];
  if (step.needs.level && s.level < step.needs.level) missing.push({ need: 'level', have: s.level, want: step.needs.level });
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
export function mayBuild(s, kind) {
  const def = BUILDINGS[kind];
  if (def.garden) return { ok: false, reason: 'It grows by itself in your streak garden', params: { kind, lock: 'garden' } };
  if (def.project && !reached(s, def.project)) return { ok: false, reason: 'Opens with the project "{name}"', params: { name: STEPS[stepIndex(def.project)].name, project: def.project, kind, lock: 'project' } };
  if (def.after && !completed(s, def.after)) return { ok: false, reason: 'Opens after the project "{name}"', params: { name: STEPS[stepIndex(def.after)].name, project: def.after, kind, lock: 'project' } };
  if ((s.counts[kind] ?? 0) >= allowance(s, kind)) return { ok: false, reason: 'You have built all you can of this for now', params: { kind, lock: 'max' } };
  // a step's building waits until its goods are delivered
  const step = currentStep(s);
  if (step?.builds.includes(kind) && step.deliver && !deliveredAll(s, step) && (kind !== 'cottage' || (s.counts.cottage ?? 0) >= (STEPS[s.projects.step - 1]?.allow?.cottage ?? 0)))
    return { ok: false, reason: 'Deliver the goods for "{name}" first', params: { name: step.name, project: step.id, kind, lock: 'goods' } };
  return { ok: true };
}
/** The extra project price for a building (the step's `cost`), on top of the catalogue price. */
export const projectCost = (s, kind) => { const step = currentStep(s); return step?.builds.includes(kind) && step.cost ? step.cost : 0; };
/** Move past every step whose `done` test passes. */
export function advance(ctx) {
  const { s } = ctx;
  while (currentStep(s) && currentStep(s).done(s)) {
    const step = currentStep(s); s.projects.step++; s.projects.delivered = {};
    gainXp(ctx, XP.build * 4); ctx.emit('projectDone', { id: step.id, name: step.name, next: currentStep(s)?.id ?? null });
  }
}
/** Where a missing good is made, for "show the way" (DESIGN 11): a building kind, or 'farm' for crops. */
export function madeAt(good) {
  if (RECIPES[good]) return RECIPES[good].at;
  if (good === 'egg') return 'coop'; if (good === 'milk') return 'cow_barn';
  if (FRUITS[good]) return FRUITS[good].tree;
  return 'farm';
}

export const actions = {
  /** Hand over goods for the current step: { goods: { id: n } } or everything that is missing and in the barn. */
  projectDeliver(ctx, { goods } = {}) {
    const { s, now } = ctx, step = currentStep(s);
    if (!step?.deliver) return ctx.fail('This project needs no goods');
    if (!stepReady(s, now).ok) return ctx.fail('The project is not open yet');
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
