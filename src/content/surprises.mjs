// Surprises (core/surprises.mjs, docs/plan/96-surprises.md): things that happen to the farmer. Numbers here; every roll
// is seeded from the farm and has a ceiling after which the rare result is certain.
import { paced, MIN } from './economy.mjs';

export const SURPRISES = {
  tickCap: MIN,                                             // play time counted per tick, at most (a closed game earns none)
  hens: { after: 4, black: 8, rainbow: 25, blackBy: 12, rainbowBy: 30 },   // the first `after` hens are plain (a new farm needs its eggs); then 1 in N, certain by the Nth
  herd: { goat: [10 * MIN, 40 * MIN], calf: [15 * MIN, 50 * MIN], cows: 2, extra: 2, youngMs: 10 * MIN },   // play time with the herd
  rush: { everyMs: 12 * MIN, chance: 3, by: 3, lastsMs: paced(5 * MIN), pans: 12, panMs: 8000, coins: [25, 74], rent: 2 },
  house: { afterMs: 60 * MIN, perHour: 90, capHours: 8 },   // the uncle's house in town: rent into the mailbox
  truck: { trips: 100, coins: 3000 },                       // the gift truck (coins when the fleet is full)
};
/** What a rare hen lays instead of an egg. */
export const HEN_EGGS = { black: 'black_egg', rainbow: 'rainbow_egg' };
/** Goods only surprises give (no order, recipe or shop asks for them). */
export const LUCKY_GOODS = {
  black_egg: { name: 'Black egg', value: 40, icon: '🥚' },
  rainbow_egg: { name: 'Rainbow egg', value: 120, icon: '🥚' },
};
/** The album, in the order it is shown: { id, name, icon, text (once found), hint (before) }. */
export const LUCKY_FINDS = [
  { id: 'black_hen', icon: 'black_egg', name: 'A black hen', hint: 'Not every chick in the crate is the colour you expect.',
    text: 'Black from comb to claw, and her eggs are black too. The market pays well for them.' },
  { id: 'rainbow_hen', icon: 'rainbow_egg', name: 'A rainbow hen', hint: 'They say one hen in a great many has every colour at once.',
    text: 'Nobody believes it until they see her. Her eggs shine like the inside of a shell.' },
  { id: 'wild_goat', icon: 'goat', name: 'The goat from the forest', hint: 'Something watches the goat barn from the trees.',
    text: 'She walked out of the forest, looked the barn over, and stayed.' },
  { id: 'calf', icon: 'cow', name: 'A calf', hint: 'Two cows, a warm barn, and time.',
    text: 'Born in the night, on her feet by morning.' },
  { id: 'gold_rush', icon: 'ui:coin', name: 'Gold in the brook', hint: 'After rain upriver, the brook sometimes carries more than water.',
    text: 'A glint in the gravel, then another. By noon every room in the valley was let.' },
  { id: 'gold_pan', icon: 'ui:coin', name: 'Your first pan of gold', hint: 'A pan, cold hands and patience.',
    text: 'A few bright grains at the bottom of the pan, and you could not stop smiling.' },
  { id: 'uncle_house', icon: 'cottage', name: 'Uncle Bao’s house', hint: 'A letter is on its way that nobody expects.',
    text: 'A narrow house in town with a blue door. The rent comes with the mail.' },
  { id: 'gift_truck', icon: 'truck', name: 'The gift truck', hint: 'A hundred trips to market do not go unnoticed.',
    text: 'The company sent it with a ribbon on the mirror: for the farm that never missed a delivery.' },
];
