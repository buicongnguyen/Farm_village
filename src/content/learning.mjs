// The first optional practical lesson. This never spends farm XP or gates existing crops.
export const LEARNING = { name: 'Garden repairs', project: 'Old potting bench', cap: 100,
  everyMs: 60_000, restMs: 30_000, restGain: 60,
  intro: 'Minh can help you restore the old potting bench. Learn two simple repairs, then choose when to work. The finished bench unlocks strawberries.' };
export const REPAIR_LESSON = [
  { id: 'steady-frame', prompt: 'The empty bench wobbles. What should we check first?', answer: 'joints',
    choices: [{ id: 'joints', text: 'Check the legs and loose joints' }, { id: 'trays', text: 'Fill the trays before checking' }],
    help: 'Check the empty frame before adding weight.' },
  { id: 'draining-trays', prompt: 'What helps a seed tray drain after watering?', answer: 'holes',
    choices: [{ id: 'sealed', text: 'Seal every gap in the bottom' }, { id: 'holes', text: 'Leave small drainage holes' }],
    help: 'Small holes let extra water drain away.' },
];
export const GARDEN_STEPS = [
  { id: 'uncover', name: 'Uncover the frame', coins: 20, energy: 20 },
  { id: 'brace', name: 'Brace the frame', coins: 35, energy: 20 },
  { id: 'trays', name: 'Fit the seed trays', coins: 25, energy: 10 },
];
export const LEARNING_MEMORIES = [
  { id: 'seed-label', title: 'A strawberry-red label', lines: [
    { who: 'pip', text: 'There is a tiny strawberry on this label! Was the bench hiding a garden?' },
    { who: 'ada', text: 'Ellis painted that label for our old seed trays. I thought the rain had taken it.' },
    { who: 'minh', text: 'The label survived. This frame can too. A brace here, and it will stand straight.' },
  ] },
  { id: 'garden-ready', title: 'Room for little beginnings', lines: [
    { who: 'minh', text: 'A straight frame, steady trays. You have learned a repair worth keeping.' },
    { who: 'ada', text: 'Pip has already picked a sunny bed. Strawberries will suit this old village nicely.' },
    { who: 'pip', text: 'I will count the strawberries! Unless there are lots. Then I will count twice.' },
  ] },
];
