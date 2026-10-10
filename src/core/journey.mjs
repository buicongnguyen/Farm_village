// Read-only progress, derived from saved deeds. Opening the roadmap never changes the farm.
import { STAGES, JOURNEY_UNLOCKS } from '../content/journey.mjs';
import { BUILDINGS } from '../content/buildings.mjs';
import { mayBuild } from './projects.mjs';
import { workingCount } from './working.mjs';
import { normalizeGrowth } from './growth-state.mjs';
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
  marketday: s => (s.stats?.marketDays ?? 0) >= 1,
  fields3: s => s.parcels.length >= 3,
  police: s => workingCount(s, 'police') > 0,
  dock: s => (s.counts.dock ?? 0) > 0,
  company: s => workingCount(s, 'company') > 0,
  contract1: s => normalizeGrowth(s).settled >= 1,
  stage: s => (s.counts.stage ?? 0) > 0,
  festival: s => (s.stats?.harvestFestivals ?? 0) >= 1,
  hands3: s => Object.keys(s.hands ?? {}).length >= 3,
  tasks30: s => (s.stats?.handTasks ?? 0) >= 30,
};
export function journeyOf(s) {
  // the first built stage with something still to do (the homecoming also waits for level 4); after the last, the next planned one
  const built = STAGES.filter(st => !st.planned), open = built.find((st, i) => !st.milestones.every(m => tests[m.test](s)) || (i === 0 && s.level < 4));
  const stage = open ?? STAGES[built.length] ?? built.at(-1);
  const milestones = (stage.milestones ?? []).map(m => ({ ...m, done: tests[m.test](s) }));
  const unlocks = JOURNEY_UNLOCKS.filter(u => u.planned || !workingCount(s, u.kind)).slice(0, 3).map(u => ({ ...u, available: !u.planned && s.level >= BUILDINGS[u.kind].level && mayBuild(s, u.kind).ok }));
  return { stage, milestones, done: milestones.filter(m => m.done).length, total: milestones.length, unlocks };
}
