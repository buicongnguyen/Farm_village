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
      { who: 'june', text: 'Let us take it back to Ada, love. She might remember its picnic.' },
      { who: 'pip', text: 'And maybe what they had for pudding!' },
    ] },
  { id: 'share', title: 'Room for another picnic', location: 'porch', label: 'Show Ada the ribbon',
    text: 'Bring the ribbon back to the farmhouse and share the find with Ada.',
    story: 'Ada gives you a flowerpot for a new picnic corner. It is waiting in storage.',
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
