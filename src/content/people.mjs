// Families, villagers and AI neighbours for v0.1 (DESIGN 9, docs/STORY.md). Families move into cottages in this order.
// Every person who can post an order has 4–6 `orders` lines in their own voice (orders.mjs picks from them and falls
// back to ORDER_LINES). Voices and Vietnamese pronouns per speaker are listed in docs/STORY.md.
export const FAMILIES = [
  { id: 'tran', name: 'The Tran family', kids: true, people: [
    { id: 'minh', name: 'Minh', role: 'Carpenter', line: 'A good house starts with a straight beam and a kind neighbour.', likes: ['corn_bread'],
      orders: ['Hungry work, raising rafters.', 'Lunch for the workbench crew. That is me and a saw.', 'Sawdust makes a man hungry.',
        'For the house-warming. I built the house, so I get to warm it.'] },
    { id: 'lan', name: 'Lan', role: 'Cook', line: 'Fresh bread in the morning makes the whole street smile.', likes: ['bread', 'egg'],
      orders: ['For the street supper on Friday.', 'Bo grew three centimetres this month. He eats like a horse.', 'Testing a recipe from my mother\'s notebook.',
        'A welcome basket for whoever moves in next.', 'I cook when I am happy. I am very happy.'] },
    { id: 'bo', name: 'Bo', role: 'Schoolboy', line: 'Is the school really going to open again? I want a desk by the window!', likes: ['carrot'], kid: true,
      orders: ['Mum said I could order something! This one!', 'It is for a frog party. Captain is the guest.', 'For my lunchbox. Zara says hers is better.',
        'I need it for school. It is important. Really!'] },
  ] },
  { id: 'okafor', name: 'The Okafor family', kids: true, people: [
    { id: 'grace', name: 'Grace', role: 'Vet', line: 'Happy hens lay more eggs. Well, they lay the same, but they look happier doing it.', likes: ['egg', 'milk'],
      orders: ['For a hungry goose at Lotus Farm.', 'Rounds today. Snacks for the patients. They are hens.', 'A long night with a calf. I need breakfast.',
        'Zara\'s reading club meets at our house today.'] },
    { id: 'sam', name: 'Sam', role: 'Postman', line: 'Letters, parcels and gossip. I deliver all three.', likes: ['pumpkin'],
      orders: ['Lunch for the long way round.', 'Snacks for the post bag. They keep the dogs friendly.', 'A parcel for my mother in the city.',
        'Special delivery: to me, from you.'] },
    { id: 'zara', name: 'Zara', role: 'Schoolgirl', line: 'I am going to be the best reader in the whole school.', likes: ['carrot_cake'], kid: true,
      orders: ['For my book club. We are reading about farms!', 'I am doing a science experiment. It needs this.',
        'Mum says I can have a treat when I finish chapter nine. I finished it.', 'For Bo. He lost our race, so I am being nice.'] },
  ] },
  { id: 'lindqvist', name: 'The Lindqvist family', kids: false, people: [
    { id: 'elin', name: 'Elin', role: 'Painter', line: 'Your fields look like a quilt from the hill. I might paint them.', likes: ['flowers'],
      orders: ['A still-life study. I will eat the model afterwards.', 'Painting all day makes me forget to eat.', 'For a picnic on the hill at sunset.',
        'Food for the painters\' club. Two members so far.'] },
    { id: 'olaf', name: 'Olaf', role: 'Retired sailor', line: 'The brook is no sea, but it sings just as sweetly.', likes: ['corn'],
      orders: ['Provisions for the porch.', 'At sea we ate biscuits as hard as bricks. Something softer, please.', 'For Elin. She forgets to eat when she paints.',
        'Fill the galley! A storm is coming. Probably.'] },
  ] },
  { id: 'reyes', name: 'The Reyes family', kids: true, people: [
    { id: 'marisol', name: 'Marisol', role: 'Nurse', line: 'A village needs a clinic. I have a list, and a plan.', likes: ['milk'],
      orders: ['For the clinic fundraiser.', 'Healthy snacks for the school. Nurse\'s orders.', 'Pia counted the pantry. All forty jars are empty.',
        'For a family I visit on my rounds.'] },
    { id: 'tomas', name: 'Tomas', role: 'Mechanic', line: 'If it squeaks, bring it to me.', likes: ['bread'],
      orders: ['Fuel for the mechanic.', 'I fixed Gus\'s tractor. Time to celebrate.', 'Grease on my hands, hunger in my belly.',
        'Lunch in the workshop. Pia is helping. Mostly by eating.'] },
    { id: 'pia', name: 'Pia', role: 'Little sister', line: 'I can count to a hundred. Do you want to hear?', likes: ['carrot'], kid: true,
      orders: ['I want this one! I counted it!', 'For my teddy\'s birthday. He is four.', 'Mama said one treat. This is one. One big one.',
        'For the Brook Club! Pip says clubs need snacks.'] },
  ] },
];

// Villagers who are not in a rental family. `family: true` marks your own family: they never post orders (noOrders),
// June gives tips, Pip comments on events in speech bubbles, and Ellis is away upriver: he appears only through letters.
export const VILLAGERS = [
  { id: 'ada', name: 'Ada', role: 'Your grandmother', line: 'Bring Hollowbrook home, dear. Start with one seed.',
    orders: ['Ellis\'s favourite. I still make it for him, even when he is upriver.', 'For my oven. It has not been this busy since you were small.',
      'Pip asked for my old recipe. We will make it together.', 'A little something for whoever moves in next.',
      'I sold these at the mill gate when I was a girl. Let us see if I still can.'] },
  { id: 'june', name: 'June', role: 'Your partner', family: true, noOrders: true, line: 'I will keep the house, you keep the fields. Deal?',
    // `tip`: the stuck tip after two idle minutes; `tips`: the next ones, in turn
    tip: 'Stuck, love? The order board always has one card you can fill. Start there.',
    tips: ['The Today board says what is ready and what comes next.', 'Short crops while we are here, long crops before bed. That is my rule.',
      'Projects open new things. Peek at the next one when you are not sure.'] },
  { id: 'pip', name: 'Pip', role: 'Your child', family: true, noOrders: true, kid: true, line: 'Can I name the next hen? Please?',
    // speech bubbles keyed by game event type: `first` the first time it happens, then one of `lines`; `idle` now and then
    says: {
      harvested: { first: 'We grew that! From a seed! Can I tell Granny Ada?', lines: ['Crunchy!', 'I am counting the wheat. One, two... a lot.', 'Can we grow a pumpkin as big as a car?'] },
      animalArrived: { first: 'A hen! She is looking at me! I am calling her Cloud.', lines: ['Another one! This one is Drizzle.', 'Hello, hen. I am Pip. I am in charge.'] },
      familyArrived: { first: 'Neighbours! Real ones! Please have a kid. Please have a kid.', lines: ['More neighbours! Hollowbrook is getting big.'] },
      collected: { lines: ['Still warm!', 'An egg! Do not drop it, do not drop it...'] },
      orderFilled: { lines: ['Another happy customer!', 'Can I hold the coins? Just hold them.'] },
      projectDone: { lines: ['We built it! Well, you built it. I watched really hard.'] },
      levelUp: { lines: ['Level up! Do we get cake?'] },
      neighbourVisit: { lines: ['Someone is at the gate! Visitors!'] },
    },
    idle: ['Why is it called a brook and not a river?', 'Do hens dream? What about?', 'Granny Ada says Grandpa Ellis talks to fish.'] },
  { id: 'ellis', name: 'Ellis', role: 'Your grandfather', family: true, noOrders: true, away: true, line: 'Gone fishing upriver. Back when the fish say so. -E' },
  { id: 'cora', name: 'Cora', role: 'Teacher', line: 'Thirty desks, one bell, and all the questions in the world.', arrives: 'school',
    orders: ['For the class picnic. Thirty little hands, all hungry.', 'A reward for good spelling. I promised.',
      'We are learning where food comes from. You are the lesson!', 'For the staff room. The staff is me.',
      'Science project: does bread rise faster if you sing to it?'] },
];

// AI neighbours. `comments` follow commentFor's facts in order (10 beds, 6 paths, 6 planted, a cottage). `remarks` read
// the state: REMARK_FACTS[fact](s) gives the {placeholders}, or null when the remark does not apply yet. Gus also has a
// three-visit `arc` that ends with him admitting Ada taught him to bake.
export const NEIGHBOURS = [
  { id: 'mai', name: 'Mai', farm: 'Lotus Farm', role: 'Neighbour', line: 'Good morning! I brought you some of my eggs.', gives: ['egg', 'wheat'], wants: ['corn', 'carrot', 'wheat'],
    comments: ['Your fields are so tidy!', 'I love the path to your gate.', 'Those carrots look delicious.', 'Your village is waking up!'],
    remarks: [
      { fact: 'hens', text: '{count} hens! You will have eggs all spring.' },
      { fact: 'beds', text: '{count} crop beds already? You work faster than my ducks swim.' },
      { fact: 'family', text: '{family} waved at me from their window. So lovely!' },
      { fact: 'cottages', text: '{count} cottages with their lights on. Hollowbrook is waking up!' },
      { fact: 'bakery', text: 'Is that fresh bread I smell? Save me a slice!' },
    ],
    orders: ['My ducks ate my lunch again! Help?', 'I am making a basket for a friend in the city.', 'Tea at Lotus Farm this afternoon! Can you spare some?',
      'I am trying a new recipe. Wish me luck!', 'Swapping is more fun than shopping, right?'] },
  { id: 'gus', name: 'Gus', farm: 'Old Mill Farm', role: 'Neighbour', line: 'Hmph. Nice farm. For a beginner.', gives: ['wheat', 'bread'], wants: ['egg', 'corn', 'pumpkin'],
    comments: ['Not bad. Not bad at all.', 'In my day we planted wheat by hand. Uphill.', 'Your cottages need more flowers. Trust me.', 'That bakery smells better than mine.'],
    remarks: [
      { fact: 'hens', text: '{count} hens. Hmph. Mine lay bigger eggs. Probably.' },
      { fact: 'beds', text: '{count} beds. At your age I had... fewer. Do not tell anyone.' },
      { fact: 'family', text: 'So {family} moved in. Good people. Do not tell them I said so.' },
      { fact: 'cottages', text: '{count} cottages. Next you will be wanting a festival.' },
      { fact: 'bakery', text: 'Your bread is almost as good as mine. Almost.' },
    ],
    arc: [
      { visit: 1, text: 'Hmph. Ada\'s grandchild. You have her stubborn chin.' },
      { visit: 2, text: 'That oven of hers... I learned on it, you know. A long time ago. Forget I said that.' },
      { visit: 3, text: 'Fine. Ada taught me to bake, the winter the mill froze. I never thanked her. You tell her. No, wait. I will tell her.' },
    ],
    orders: ['Hmph. My oven is bigger than yours. Fill it.', 'Not for me. For a friend. Fine, it is for me.', 'Old Mill Farm has standards. Meet them.',
      'Do not tell Ada I ordered this.', 'My wheat is busy. Yours will do.'] },
];

/** What a neighbour can remark on: each returns the template's {placeholders}, or null when it is not true yet.
 *  `family` is the family's English name: translate it with t() before filling the template. */
export const REMARK_FACTS = {
  hens: s => { const n = Object.values(s.animals ?? {}).flat().filter(a => a.kind === 'hen').length; return n >= 2 ? { count: n } : null; },
  beds: s => (s.counts?.bed ?? 0) >= 8 ? { count: s.counts.bed } : null,
  family: s => {
    const h = Object.values(s.homes ?? {}).filter(x => x.arrived && x.family).sort((a, b) => b.arrivesAt - a.arrivesAt)[0];
    const f = h && FAMILIES.find(x => x.id === h.family); return f ? { family: f.name } : null;
  },
  cottages: s => (s.counts?.cottage ?? 0) >= 2 ? { count: s.counts.cottage } : null,
  bakery: s => (s.counts?.bakery ?? 0) >= 1 ? {} : null,
};

/** Every person who can post an order, with their portrait colour. */
export const allPeople = () => [...VILLAGERS, ...FAMILIES.flatMap(f => f.people.map(p => ({ ...p, family: f.id }))), ...NEIGHBOURS];
/** Fallback order lines for anyone without their own `orders`. */
export const ORDER_LINES = [
  'I am baking for the children.', 'My pantry is empty!', 'Could you help with a little picnic?', 'A treat for my neighbours.',
  'We are having friends over tonight.', 'For the village supper.', 'My grandmother is visiting.', 'Just what the recipe needs.',
];
/** The tutorial's first order (DESIGN 15). */
export const FIRST_ORDER = { from: 'ada', need: { wheat: 6 }, coins: 20, xp: 8, line: 'My first loaf in years! Six wheat, please.' };
