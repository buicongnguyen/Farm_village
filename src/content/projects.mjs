// The build order (DESIGN 11, ECONOMY 4.3). Only the next step can be worked on. A step is done when its `done` test
// passes; `builds` are the kinds it unlocks for placing (they can only be placed once the step is reached); `deliver`
// are goods handed over with the projectDeliver action (held from the order board once the requirements are met), and
// must all be delivered before the step's building can be placed; `cost` is added to that building's price; `allow`
// raises how many of a kind may exist.
import { workingCount } from '../core/working.mjs';
import { normalizeGrowth } from '../core/growth-state.mjs';
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
  { id: 'clinic', name: 'Someone to care for us', text: 'Four settled families, bread for the waiting room and cherries from the orchard: help {person:marisol:short} reopen the clinic.',
    needs: { level: 6, families: 4 }, deliver: { bread: 12, cherry: 9 }, builds: ['clinic'], done: s => working(s, 'clinic') >= 1 },
  // After the clinic the village keeps growing. These steps lock nothing (builds is empty): each names the next thing
  // worth doing, is ticked off as soon as it is true, and `site` is the building its button takes you to (`panel`: the
  // menu it opens, for a step that is not done by building).
  // They are a checklist kept by id (core/projects.mjs TAIL): a new one may go anywhere from here on. Never add a step
  // above this line: the steps above are kept by their position in old saves.
  // chapter 6 (docs/plan/ch06-market-day.md): the story's next deeds come first in the checklist
  { id: 'market_day', name: 'The first market day', text: 'The square holds a market day now and then. Sell the good of the day while it lasts: it pays double.',
    needs: { level: 6 }, panel: 'barn', done: s => (s.stats.marketDays ?? 0) >= 1, builds: [] },
  { id: 'third_field', name: 'A third field', text: 'The farm is ready to grow. Buy a third piece of land.',
    needs: { level: 4 }, done: s => s.parcels.length >= 3, builds: [] },
  { id: 'juice', name: 'Fresh juice for the village', text: 'The families ask for something cool to drink. Build a juice press on the farm.',
    needs: { level: 6 }, site: 'juice_press', done: s => working(s, 'juice_press') >= 1, builds: [] },
  { id: 'anglers', name: 'A quiet day at the pond', text: 'The children want fish for supper. Land five fish at the pond.',
    needs: {}, done: s => (s.fishing?.caught ?? 0) >= 5, builds: [] },
  { id: 'fleet', name: 'A second truck for the market road', text: 'One truck cannot carry it all any more. Buy a second delivery truck.',
    needs: { level: 7 }, panel: 'market', done: s => (s.truck?.fleet?.length ?? 0) >= 1, builds: [] },
  { id: 'noodles', name: 'Noodles for the whole street', text: 'Build a noodle factory, so there is a hot bowl for everyone.',
    needs: { level: 8 }, site: 'noodle_factory', done: s => working(s, 'noodle_factory') >= 1, builds: [] },
  { id: 'police', name: 'A police post for a safe village', text: 'The village has grown. Build a police post, so someone keeps watch at night.',
    needs: { level: 12 }, site: 'police', done: s => (s.counts.police ?? 0) >= 1, builds: [] },
  // chapter 7 (docs/plan/ch07-safe-streets.md)
  { id: 'dock', name: 'A dock on the brook', text: '{person:olaf:short} has drawn a boat dock for the brook, by the bridge. Build it, and fish where the big ones are.',
    needs: { level: 10 }, site: 'dock', done: s => (s.counts.dock ?? 0) >= 1, builds: [] },
  { id: 'company', name: 'The company office', text: 'Open a company office, where neighbours can take proper jobs.',
    needs: { level: 15 }, site: 'company', done: s => (s.counts.company ?? 0) >= 1, builds: [] },
  // chapter 8 (docs/plan/ch08-work-for-everyone.md)
  { id: 'first_contract', name: 'The first big delivery', text: 'The company office takes orders bigger than any cart. Send its first delivery from the village board, and collect the payment.',
    needs: { level: 15 }, panel: 'villageGrowth', done: s => normalizeGrowth(s).settled >= 1, builds: [] },
  // chapter 9 (docs/plan/ch09-the-village-sings-again.md)
  { id: 'stage', name: 'The festival stage', text: 'Only a burned platform is left of the old stage on the village square. Build a new one where it stood.',
    needs: { level: 12 }, site: 'stage', done: s => (s.counts.stage ?? 0) >= 1, builds: [] },
  { id: 'harvest_festival', name: 'The Harvest Festival', text: 'Lay a feast from your barn and hold the Harvest Festival at the stage. The whole village comes.',
    needs: { level: 12 }, panel: 'festival', done: s => (s.stats.harvestFestivals ?? 0) >= 1, builds: [] },
  // chapter 10 (docs/plan/ch10-hands-to-help.md)
  { id: 'three_hands', name: 'Three pairs of hands', text: 'The farm has outgrown one pair of hands. Hire three neighbours in Friends, and let them do thirty tasks.',
    needs: {}, panel: 'friends', done: s => Object.keys(s.hands ?? {}).length >= 3 && (s.stats.handTasks ?? 0) >= 30, builds: [] },
  { id: 'hospital', name: 'From clinic to hospital', text: 'Help the clinic grow into a hospital for the whole valley.',
    needs: { level: 15 }, done: s => Number.isSafeInteger(s.growth?.hospitalAt), builds: [] },
];
export const V01_LAST_STEP = 'school';
