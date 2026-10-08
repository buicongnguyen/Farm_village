// Persistent advice metadata has no world/grid dependency, so loading a save cannot create an ESM cycle.
import { ADVICE_TOPICS } from '../content/advice.mjs';
import { STEPS } from '../content/projects.mjs';
export const ADVICE_CELEBRATIONS = ['first-bread', 'school-open', 'clinic-open'];
const celebrations = ADVICE_CELEBRATIONS;
const record = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const amount = value => Number.isFinite(value) && value > 0 ? value : 0;
const stamp = value => Number.isSafeInteger(value) && value >= 0;
const unique = value => [...new Set(Array.isArray(value) ? value.filter(k => typeof k === 'string' && k.length <= 220) : [])];
const own = (o, k) => Object.hasOwn(o, k);
const stock = (s, good) => amount(s.barn?.items?.[good]);
export const newAdvice = () => ({ read: [], deferred: [], celebrated: {}, retired: [] });

/** Pure save normalization. Legacy achievements are retired; old farms never receive a stack of invented news. */
export function normalizeAdvice(s) {
  const old = record(s.advice), legacy = !s.advice || !Object.keys(old).length;
  const celebrated = {};
  for (const id of celebrations) {
    const at = record(old.celebrated)[id] ?? s.firsts?.[`advice:${id}`];
    if (stamp(at)) celebrated[id] = at;
  }
  const retired = new Set(unique(old.retired).filter(id => celebrations.includes(id)));
  if (legacy) {
    if (amount(s.stats?.produced) || own(s.firsts ?? {}, 'product') || stock(s, 'bread')) retired.add('first-bread');
    if ((s.counts?.school ?? 0) > 0 || s.projects?.step > STEPS.findIndex(p => p.id === 'school')) retired.add('school-open');
    if ((s.counts?.clinic ?? 0) > 0 || s.projects?.step > STEPS.findIndex(p => p.id === 'clinic')) retired.add('clinic-open');
  }
  // An order id is never reused, and removed buildings cannot return with the same id. Prune those references only;
  // never expire a deferral because time passed or a stock count temporarily changed.
  const validKey = key => {
    const split = key.indexOf(':'), id = key.slice(0, split), context = key.slice(split + 1);
    if (split < 1 || !own(ADVICE_TOPICS, id) || !context) return false;
    if (context.startsWith('order/')) return (s.orders?.cards ?? []).some(o => o.id === context.split('/')[1]);
    if (context.startsWith('building/')) return own(s.placed ?? {}, context.split('/')[1]);
    return context === 'pond' || context === 'fruit-stand' || celebrations.includes(id) && context === 'earned';
  };
  return { read: unique(old.read).filter(validKey), deferred: unique(old.deferred).filter(validKey), celebrated,
    retired: [...retired].filter(id => !own(celebrated, id)) };
}


