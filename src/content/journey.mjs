// A short, truthful ladder: future stages are plans until their version exists.
export const STAGES = [
  { id: 'homecoming', name: 'Homecoming', goal: 'Bring the farm back', level: 1, version: '0.3',
    milestones: [{ name: 'Repair the feed mill and coop', test: 'farm' }, { name: 'Welcome the first family', test: 'family' }] },
  { id: 'orchard', name: 'The orchard', goal: 'Plant an orchard', level: 4, version: '0.4',
    milestones: [{ name: 'Pick nine cherries', test: 'cherries' }, { name: 'Build a fruit stand', test: 'stand' },
      { name: 'Give {pet:dog:short} a kennel', test: 'kennel' }, { name: 'Reopen the clinic', test: 'clinic' }] },
  { id: 'meadow', name: 'The meadow', goal: 'Buy the east meadow', level: 6, version: '0.5', planned: true },
  { id: 'river', name: 'Down to the river', goal: 'Reach the river', level: 9, version: '0.6', planned: true },
  { id: 'village', name: 'A village to be proud of', goal: 'Make Hollowbrook a home', level: 13, version: '0.7', planned: true },
  { id: 'company', name: 'Hollowbrook Farm Co.', goal: 'Reopen the company', level: 18, version: '0.8', planned: true },
  { id: 'hills', name: 'Over the hills', goal: 'Open the road to Pine Ridge', level: 26, version: '1.0', planned: true },
  { id: 'valley', name: 'The valley of plenty', goal: 'Make the valley thrive', level: 35, version: '1.1', planned: true },
];
export const JOURNEY_UNLOCKS = [
  { name: 'Cherry tree', level: 4, kind: 'cherry_tree' }, { name: 'Fruit stand', level: 4, kind: 'fruit_stand' },
  { name: "{pet:dog:short}'s kennel", level: 5, kind: 'kennel' }, { name: 'School', level: 6, kind: 'school' },
  { name: 'Clinic', level: 6, kind: 'clinic' },
  { name: 'East meadow and land deeds', level: 6, version: '0.5', planned: true },
  { name: 'Goats and the dairy', level: 8, version: '0.5', planned: true },
  { name: '{pet:cat:short} and the barn', level: 8, version: '0.5', planned: true },
];
