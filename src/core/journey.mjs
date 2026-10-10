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
  house5: s => !s.house || s.house.level >= 5,   // a farm without an upgradable farmhouse (not the restore mode) is not held back
  goatbarn: s => workingCount(s, 'goat_barn') > 0,
  cheese: s => (s.barn.items.cheese ?? 0) > 0 || !!s.firsts?.cheese || (s.stats?.cheeseMade ?? 0) > 0,
  hand: s => Object.keys(s.hands ?? {}).length > 0,
};
export function journeyOf(s) {
  const homecoming = STAGES[0].milestones.every(m => tests[m.test](s));
  const orchard = STAGES[1].milestones.every(m => tests[m.test](s));
  const home = STAGES[2].milestones.every(m => tests[m.test](s));
  const stage = !homecoming || s.level < 4 ? STAGES[0] : !orchard ? STAGES[1] : home ? STAGES[3] : STAGES[2];
  const milestones = (stage.milestones ?? []).map(m => ({ ...m, done: tests[m.test](s) }));
  const unlocks = JOURNEY_UNLOCKS.filter(u => u.planned || !workingCount(s, u.kind)).slice(0, 3).map(u => ({ ...u, available: !u.planned && s.level >= BUILDINGS[u.kind].level && mayBuild(s, u.kind).ok }));
  return { stage, milestones, done: milestones.filter(m => m.done).length, total: milestones.length, unlocks };
}
