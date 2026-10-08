// The build order (DESIGN 11, ECONOMY 4.3). Only the next step can be worked on. A step is done when its `done` test
// passes; `builds` are the kinds it unlocks for placing (they can only be placed once the step is reached); `deliver`
// are goods handed over with the projectDeliver action (held from the order board once the requirements are met), and
// must all be delivered before the step's building can be placed; `cost` is added to that building's price; `allow`
// raises how many of a kind may exist.
import { workingCount } from '../core/working.mjs';
const working = (s, kind) => workingCount(s, kind);   // repaired or never broken (a run-down start has broken ones standing)
export const STEPS = [
  { id: 'clear', name: 'Clear the land and lay a path', text: 'Clear three patches of weeds and lay three path tiles to the gate.',
    needs: {}, builds: ['path'], done: s => s.stats.cleared >= 3 && s.stats.paths >= 3 },
  { id: 'plot', name: 'Farm plot', text: 'Place six crop beds.',
    needs: {}, builds: ['bed'], done: s => s.counts.bed >= 6 },
  { id: 'mill_coop', name: 'Feed mill and coop', text: 'Build a feed mill and a coop with a fence and a gate.',
    restore: 'Repair the old feed mill and the coop, so the hens have a home.', needs: { level: 2 }, builds: ['feed_mill', 'coop', 'fence', 'gate'], done: s => working(s, 'feed_mill') >= 1 && working(s, 'coop') >= 1 },
  { id: 'cottage1', name: 'The first cottage', text: 'Build a rental cottage in the village. A family is waiting to move in.',
    restore: 'Repair a run-down cottage in the village. A family is waiting to move in.', needs: { level: 3 }, builds: ['cottage'], allow: { cottage: 1 }, done: s => working(s, 'cottage') >= 1 },
  { id: 'cottage2', name: 'A second cottage', text: 'Another family wants to move in. They ask for bread for their first week.',
    restore: 'Another family wants to move in. They ask for bread for their first week, then repair the second cottage.', needs: { level: 4 }, deliver: { bread: 5 }, builds: ['cottage'], allow: { cottage: 2 }, done: s => working(s, 'cottage') >= 2 },
  { id: 'school', name: 'The school', text: 'Two families with children ask for the old school to reopen.',
    needs: { level: 6, kidsFamilies: 2 }, deliver: { bread: 24, corn_bread: 10 }, cost: 4000, builds: ['school'], done: s => s.counts.school >= 1 },
  { id: 'cottages34', name: 'Cottages three and four', text: 'The school brings new families. Build two more cottages.',
    restore: 'The school brings new families. Repair the last cottage and build one more.', needs: {}, builds: ['cottage'], allow: { cottage: 4 }, done: s => working(s, 'cottage') >= 4 },
  { id: 'clinic', name: 'Someone to care for us', text: 'Four settled families, bread for the waiting room and cherries from the orchard: help Marisol reopen the clinic.',
    needs: { level: 6, families: 4 }, deliver: { bread: 12, cherry: 9 }, builds: ['clinic'], done: s => working(s, 'clinic') >= 1 },
];
export const V01_LAST_STEP = 'school';
