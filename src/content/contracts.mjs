// A finite, optional neighbourhood meal. These are not the later company contracts or a new story chapter.
// Goods are handed over once per batch; the saved memory and payment belong to that same delivery.
export const PICNIC_MENU = {
  id: 'pond-picnic-menu', title: 'A picnic menu',
  text: 'Three small batches for a meal beside the pond. Take your time; every request will wait.',
  introduction: 'Welcome the first family and read their homecoming chapter.',
};

export const CONTRACTS = [
  {
    id: 'picnic-drinks', title: 'Something bright to pour', person: 'lan', icon: 'carrot_juice', level: 6,
    need: { carrot_juice: 2 }, coins: 70,
    line: 'Shall we plan a little picnic? Two bottles of carrot juice would be a lovely start.',
    ribbonLine: 'Ada showed me the picnic ribbon you found. Shall we fill a basket to go with it? Two bottles of carrot juice would be a lovely start.',
    method: 'Grow carrots, then make carrot juice at a working juice press.',
    memory: {
      title: 'The first bottles in the basket',
      text: 'Lan packs the two bottles of carrot juice and leaves room for the rest of the picnic menu.',
      lines: [
        { who: 'lan', text: 'Such a cheerful colour! The first two bottles are packed.' },
        { who: 'pip', text: 'They look like bottled sunshine!' },
        { who: 'june', text: 'A good beginning, love. We can plan the food whenever we are ready.' },
      ],
    },
  },
  {
    id: 'picnic-noodles', title: 'A basket of fresh noodles', person: 'lan', icon: 'noodles', level: 8,
    need: { noodles: 4 }, coins: 150,
    line: 'Four portions of noodles would go nicely with our juice. Wheat and an egg make a lovely batch.',
    method: 'Grow wheat, gather eggs from fed hens, and make two batches of noodles at a working noodle factory.',
    memory: {
      title: 'Noodles worth gathering for',
      text: 'Four portions of noodles join the picnic menu. Lan brings the bowls, and Pip counts the chopsticks.',
      lines: [
        { who: 'lan', text: 'Four portions, all ready. I will bring my favourite bowls.' },
        { who: 'pip', text: 'Two chopsticks each! I counted them in pairs.' },
        { who: 'june', text: 'That will help us share them out, Pip.' },
      ],
    },
  },
  {
    id: 'picnic-packets', title: 'The last things for our picnic', person: 'lan', icon: 'instant_noodles', level: 9,
    need: { instant_noodles: 2, carrot_juice: 2 }, coins: 300,
    line: 'Two noodle cups and two more bottles of carrot juice will finish our menu. We can take them to the pond together.',
    method: 'Use fresh noodles and carrots to make instant noodles. Make the extra carrot juice separately at the juice press.',
    memory: {
      title: 'Everyone brought something',
      text: 'Beside the pond, Lan sets out the noodles and carrot juice. June spreads the blanket, and Pip gives everyone a cup. The picnic they planned is finally here.',
      lines: [
        { who: 'lan', text: 'Fresh noodles, noodle cups, and carrot juice. What a lovely meal we made together.' },
        { who: 'pip', text: 'Everybody has a cup! Now I can sit down too.' },
        { who: 'june', text: 'Come sit beside us, love. There is room for you on the blanket.' },
      ],
    },
  },
];
export const contractOf = id => CONTRACTS.find(request => request.id === id) ?? null;
export const CONTRACT_REQUIREMENTS = {
  level: 'Reach level {level} to make {good}.',
  maker: 'Bring the {building} into working order.',
  beds: 'Have a crop bed available for growing {good}.',
  animal: 'Keep at least one hen in a working coop.',
};
