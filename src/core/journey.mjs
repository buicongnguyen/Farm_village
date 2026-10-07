// Read-only progress, derived from saved deeds. Opening the roadmap never changes the farm.
import { STAGES, JOURNEY_UNLOCKS } from '../content/journey.mjs';
import { BUILDINGS } from '../content/buildings.mjs';
import { mayBuild } from './projects.mjs';
import { workingCount } from './working.mjs';
const tests = {
  farm: s => workingCount(s, 'feed_mill') > 0 && workingCount(s, 'coop') > 0,
  family: s => Object.values(s.homes).some(h => h.arrived),
  cherries: s => (s.album.fruit.cherry ?? 0) >= 9,
  stand: s => workingCount(s, 'fruit_stand') > 0,
  kennel: s => workingCount(s, 'kennel') > 0,
  clinic: s => workingCount(s, 'clinic') > 0,
};
export function journeyOf(s) {
  const orchard = STAGES[1].milestones.every(m => tests[m.test](s));
  const stage = orchard ? STAGES[2] : s.level >= 4 ? STAGES[1] : STAGES[0];
  const milestones = (stage.milestones ?? []).map(m => ({ ...m, done: tests[m.test](s) }));
  const unlocks = JOURNEY_UNLOCKS.filter(u => u.planned || !workingCount(s, u.kind)).slice(0, 3).map(u => ({ ...u, available: !u.planned && s.level >= BUILDINGS[u.kind].level && mayBuild(s, u.kind).ok }));
  return { stage, milestones, done: milestones.filter(m => m.done).length, total: milestones.length, unlocks };
}
