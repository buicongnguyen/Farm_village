// One optional family memory. This trail does not advance Ellis's letters or the water-rights mystery.
// `text` is the next action's hint; `story` and `lines` belong to the earned, replayable memory.
export const EXPLORATION_STEPS = [
  { id: 'porch', title: 'A note by the porch', location: 'porch', label: 'Look in the old box',
    text: 'A small wooden box rests beside the farmhouse bench. Its lid is loose.',
    story: 'Inside is a folded note: "Picnic ribbon — in the tin by the pond dock."',
    lines: [
      { who: 'ada', text: 'Oh, my picnic list! I used to tie the ribbon around the bread basket.' },
      { who: 'pip', text: 'Does a ribbon make bread taste better?' },
      { who: 'ada', text: 'Only if you remember to bring the bread, dear.' },
    ] },
  { id: 'pond', title: 'The ribbon in the tin', location: 'pond', label: 'Open the pondside tin',
    text: 'Beside the pond dock, a little tin is tucked among the reeds.',
    story: 'Inside lies a faded pink ribbon, neatly folded and still dry.',
    lines: [
      { who: 'pip', text: 'It looks like a tiny butterfly!' },
      { who: 'june', text: 'Let us take it back to {person:ada:short}, love. She might remember its picnic.' },
      { who: 'pip', text: 'And maybe what they had for pudding!' },
    ] },
  { id: 'share', title: 'Room for another picnic', location: 'porch', label: 'Show {person:ada:short} the ribbon',
    text: 'Bring the ribbon back to the farmhouse and share the find with {person:ada:short}.',
    story: '{person:ada:short} gives you a flowerpot for a new picnic corner. It is waiting in storage.',
    lines: [
      { who: 'ada', text: 'I carried the basket all the way to the pond once. The bread was still cooling at home!' },
      { who: 'pip', text: 'Then this time I will be in charge of the bread!' },
      { who: 'june', text: 'Good. I will look after the blanket, love.' },
    ] },
];

export const PICNIC_TRAIL = {
  id: 'forgotten-picnic', title: 'The picnic we nearly forgot',
  text: 'A folded note, a pondside tin, and a little story to bring home.',
  hint: 'Fill an order, then tap the farmhouse and choose Explore the porch.',
  reward: { decor: 'flowerpot', count: 1 }, steps: EXPLORATION_STEPS,
};

export const explorationStep = id => EXPLORATION_STEPS.find(step => step.id === id) ?? null;

// The walk upriver (chapter 16, core/upriver.mjs): three stops to the spring with Grandpa Oak and Sunny, in order.
// `text`: what the stop asks for (`needs`: goods taken from the barn, fish landed at the boat dock since the stop
// before, trees planted since the walk opened); `story`: what is found there; `keepsake`: its icon id and its name.
// Each stop's three-line scene is a beat in content/story.mjs (upriver-<id>).
export const UPRIVER = {
  id: 'upriver', title: 'Where the brook begins', text: 'A walk upriver with {person:ellis:short} and {person:pip:short}, in three stops, to the spring. Nothing here is in a hurry.',
  stops: [
    { id: 'weir', title: 'The old weir', label: 'Walk to the old weir', needs: { goods: { bread: 3, cheese: 1, apple_juice: 2 } }, coins: 100, xp: 40, keepsake: { id: 'oak_float', name: '{person:ellis:short}’s old float' },
      text: 'Half a day on foot. Pack a picnic for three from the barn.',
      story: 'The weir is a row of mossy stones across the brook. Under the third one, on a rusty nail, hangs a painted cork float.' },
    { id: 'heron', title: 'The heron pool', label: 'Walk on to the heron pool', needs: { riverFish: 1 }, coins: 150, xp: 50, keepsake: { id: 'heron_feather', name: 'A heron’s feather' },
      text: '{person:ellis:short} says a heron only trusts people who can catch their own supper. Land a fish at the boat dock first.',
      story: 'The heron stands so still that it might be a post. When it goes at last, it leaves one grey feather on the bank.' },
    { id: 'spring', title: 'The spring', label: 'Climb to the spring', needs: { trees: 10 }, coins: 200, xp: 60, keepsake: { id: 'spring_water', name: 'A bottle of spring water' },
      text: 'The spring is a long way up, and nobody goes there empty-handed. Plant ten trees in the valley, for the water to come down to.',
      story: 'A wet rock under a fern. The water comes out no thicker than a finger, and it does not stop.' },
  ],
};
