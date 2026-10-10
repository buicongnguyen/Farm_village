// A short, truthful ladder: future stages are plans until their version exists.
export const STAGES = [
  { id: 'homecoming', name: 'Homecoming', goal: 'Bring the farm back', level: 1, version: '0.3',
    milestones: [{ name: 'Repair the feed mill and coop', test: 'farm' }, { name: 'Welcome the first family', test: 'family' }] },
  { id: 'orchard', name: 'The orchard', goal: 'Plant an orchard', level: 4, version: '0.4',
    milestones: [{ name: 'Pick nine cherries', test: 'cherries' }, { name: 'Build a fruit stand', test: 'stand' },
      { name: 'Give {pet:dog:short} a kennel', test: 'kennel' }, { name: 'Reopen the clinic', test: 'clinic' }] },
  { id: 'meadow', name: 'Home and dairy', goal: 'Make the farm a home', level: 6, version: '0.5',
    milestones: [{ name: 'Raise the farmhouse to level 5', test: 'house5' }, { name: 'Build a goat barn', test: 'goatbarn' },
      { name: 'Make cheese at the dairy', test: 'cheese' }, { name: 'Hire a farm hand', test: 'hand' }] },
  // Act II of the story (docs/plan): each chapter adds its deed here as it is built.
  { id: 'wakes', name: 'The valley wakes', goal: 'Bring the village back to life', level: 6, version: '0.6',
    milestones: [{ name: 'Sell the good of the day on a market day', test: 'marketday' }, { name: 'Own three fields', test: 'fields3' }] },
  { id: 'streets', name: 'Safe streets and work for all', goal: 'Reopen the police post and the company office', level: 12, version: '0.7',
    milestones: [{ name: 'Rebuild the police post', test: 'police' }, { name: 'Build the boat dock on the brook', test: 'dock' },
      { name: 'Reopen the company office', test: 'company' }, { name: 'Send the first company delivery', test: 'contract1' }] },
  { id: 'sings', name: 'The village sings again', goal: 'Hold the Harvest Festival', level: 12, version: '0.7',
    milestones: [{ name: 'Rebuild the festival stage', test: 'stage' }, { name: 'Hold the Harvest Festival', test: 'festival' }] },
  // Act III: chapters 10 to 12 add their deeds here
  { id: 'coop', name: 'The brook co-operative', goal: 'Run the farm with the whole valley', level: 12, version: '0.8',
    milestones: [{ name: 'Hire three farm hands', test: 'hands3' }, { name: 'Let them do thirty tasks', test: 'tasks30' },
      { name: 'Answer the man from the city', test: 'albright' }, { name: 'Found the co-operative', test: 'cooperative' }, { name: 'Fill a shared order', test: 'cooperativeOrder' }] },
  // Act IV: chapters 13 to 16 add their deeds here
  { id: 'farbank', name: 'Across the river', goal: 'Build the riverside town', level: 14, version: '0.9',
    milestones: [{ name: 'Pave the old quay', test: 'quay' }, { name: 'Build a house on the quay', test: 'quayHouse' },
      { name: 'Open the hotel', test: 'hotel' }, { name: 'Welcome ten guests', test: 'guests10' }] },
  { id: 'valley', name: 'The valley of plenty', goal: 'Make the valley thrive', level: 22, version: '1.0', planned: true },
];
export const JOURNEY_UNLOCKS = [
  { name: 'Cherry tree', level: 4, kind: 'cherry_tree' }, { name: 'Fruit stand', level: 4, kind: 'fruit_stand' },
  { name: "{pet:dog:short}'s kennel", level: 5, kind: 'kennel' }, { name: 'School', level: 6, kind: 'school' },
  { name: 'Clinic', level: 6, kind: 'clinic' },
  { name: 'Goat barn', level: 8, kind: 'goat_barn' }, { name: 'Dairy', level: 8, kind: 'dairy' },
  { name: 'Police post', level: 12, kind: 'police' }, { name: 'Company office', level: 15, kind: 'company' },
  { name: 'Boat dock', level: 10, kind: 'dock' },
  { name: 'Festival stage', level: 12, kind: 'stage' },
  { name: 'Riverside town', level: 18, version: '0.9', planned: true },
];
