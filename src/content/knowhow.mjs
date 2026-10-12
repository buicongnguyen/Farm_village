// Farm know-how: things the farmer finds out by trying them (core/knowhow.mjs). Each is a real growing technique, told
// simply, and each changes one rule for good. `level`: the farm level at which its hint appears in the notebook.
//   hint   what makes the farmer curious (shown before it is tried)
//   need   what must be true before it can be tried, in words
//   found  what happened when it was tried
//   effect what is different from now on
//   fact   the real technique behind it
export const KNOWHOW = {
  soak: { cost: 6, need: 12, grow: 0.85 },          // spends `cost` of a crop the barn holds `need` of; crops take 85% of their time
  stone: { picked: 9, coins: 60 },                  // after nine fruit picked: a pot and soil for the stone
  pair: { grown: 4, grow: 0.8 },                    // four harvests of each of corn and pumpkin; a bed beside its partner takes 80%
  graft: { picks: 3, first: 0.4, regrow: 0.7 },     // a tree picked three times gives a branch; a grafted tree's waits
  thin: { picked: 30, extra: 1 },                   // after thirty fruit picked: one more fruit from every pick
  cross: { coins: 200, picks: 3, mango: 2 },        // an apple tree picked three times and a mango tree picked twice
};
/** Crops that grow better side by side (both ways). */
export const COMPANIONS = { corn: 'pumpkin', pumpkin: 'corn', carrot: 'onion', onion: 'carrot', tomato: 'herb', herb: 'tomato' };
export const TRICKS = [
  { id: 'soak', level: 2, icon: 'wheat', name: 'Wake the old seeds',
    hint: 'The seed at the bottom of the barn is dry and hard. Granny Maple says a night in a bowl of water wakes it up.',
    need: 'Keep 12 of one crop in the barn', how: 'Soak a handful overnight',
    found: 'By morning the seeds were plump, and the first shoots were up two days early.',
    effect: 'Every crop grows 15% faster.',
    fact: 'Real farms call this seed priming: soaked seed takes up water before it is sown, so it sprouts sooner and more evenly.' },
  { id: 'stone', level: 4, icon: 'mango', name: 'The stone in the fruit crate',
    hint: 'Under the last cherries in the crate lies a big flat stone from a fruit nobody here has grown. It has a crack, and something green in it.',
    need: 'Pick 9 fruit from your trees', how: 'Plant it in a pot',
    found: 'It grew faster than anything on the farm. Tomas knew the leaves at once: a mango.',
    effect: 'Mango trees can be planted. The first one is in your storage.',
    fact: 'A mango stone sprouts within weeks if its husk is opened and it is kept warm and damp.' },
  { id: 'companions', level: 5, icon: 'corn', name: 'Good neighbours in the beds',
    hint: 'The corn beside the pumpkins stands a hand taller than the rest of the row. Is it the company it keeps?',
    need: 'Harvest corn and pumpkin four times each', how: 'Plant them side by side on purpose',
    found: 'The pumpkin leaves shaded the corn’s roots and kept the soil damp. Both did better than apart.',
    effect: 'A bed sown next to its partner grows 20% faster: corn with pumpkin, carrot with onion, tomato with healing herb.',
    fact: 'This is companion planting. Corn, beans and squash grown together are called the Three Sisters; onions beside carrots hide them from the carrot fly.' },
  { id: 'graft', level: 6, icon: 'orange_tree', name: 'A branch that becomes a tree',
    hint: 'A young tree from a pip takes years, and nobody knows what its fruit will be like. Chip says his grandfather never planted pips: he cut branches.',
    need: 'Pick the same tree 3 times', how: 'Cut a branch and bind it to a young stem',
    found: 'The branch took. It already knew how to make fruit: it had been doing it on the old tree for years.',
    effect: 'A tree picked 3 times gives a free grafted sapling of its own kind. Grafted trees fruit much sooner and ripen 30% faster.',
    fact: 'This is grafting. A grafted tree fruits in two to four years where a tree from seed takes five to ten, and its fruit is the same as its parent’s.' },
  { id: 'thin', level: 7, icon: 'peach', name: 'Fewer, bigger fruit',
    hint: 'The peach tree sets more fruit than it can feed, and they stay small. Ada pinches half of them off in spring. It looks like waste.',
    need: 'Pick 30 fruit from your trees', how: 'Pinch off the small ones',
    found: 'What stayed on the branch grew twice the size, and the tree did not rest the year after.',
    effect: 'Every pick gives one more fruit.',
    fact: 'This is fruit thinning: with fewer young fruit to feed, the tree makes the rest larger and bears evenly every year.' },
  { id: 'cross', level: 8, icon: 'mango_apple', name: 'Two trees in one',
    hint: 'If an orange branch grows on an orange tree, what would a mango branch do on an apple tree?',
    need: 'Know grafting, and pick a mango tree twice', how: 'Try the mango branch on an apple tree',
    found: 'It should not have worked. The fruit has an apple’s crunch and a mango’s sweetness, and nobody in the valley has tasted one.',
    effect: 'An apple tree picked 3 times can take a mango branch (200 coins). It then bears Mango apples, which sell for much more.',
    fact: 'Growers do graft several kinds onto one trunk (a "fruit salad tree"), though only close relatives join in real orchards. The Mango apple is Hollowbrook’s own.' },
];
export const trickOf = id => TRICKS.find(t => t.id === id) ?? null;
