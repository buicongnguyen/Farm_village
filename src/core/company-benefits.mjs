// Production benefit facts and the explicit-use undo marker; independent of production and action modules.
import { FAMILIES } from '../content/people.mjs';
import { BUILDINGS } from '../content/buildings.mjs';
import { GROWTH } from '../content/village-growth.mjs';
import { isWorking, workingCount } from './working.mjs';

export function eligibleCompanyStaff(s, now = s.lastSeen) {
  const arrived = new Set(Object.entries(s.homes ?? {}).filter(([id, h]) => s.placed?.[id]?.kind === 'cottage'
    && h.arrived === true && Number.isFinite(h.arrivesAt) && h.arrivesAt <= now).map(([, h]) => h.family));
  return FAMILIES.filter(f => arrived.has(f.id)).flatMap(f => f.people.filter(p => !p.kid));
}
export const workingFactories = s => Object.entries(s.placed ?? {}).filter(([id, p]) =>
  BUILDINGS[p.kind]?.produces && !['feed_mill', 'bakery'].includes(p.kind) && isWorking(s, id)).map(([id, p]) => ({ id, kind: p.kind }));
export const enoughFactories = s => new Set(workingFactories(s).map(p => p.kind)).size >= GROWTH.company.factories;
export const companyReady = s => s.level >= GROWTH.company.level && workingCount(s, 'company') > 0 && enoughFactories(s);
export const markCompanyUsed = s => { for (const entry of s.undo ?? []) if (entry.type === 'place' && entry.kind === 'company') entry.civicUsed = true; };
export function companyWorkerMultiplier(s, building, now) {
  const worker = s.growth?.staff?.worker;
  return companyReady(s) && worker?.building === building && workingFactories(s).some(p => p.id === building)
    && eligibleCompanyStaff(s, now).some(p => p.id === worker.person) ? GROWTH.workerFactor : 1;
}
