// Families, villagers and AI neighbours for v0.1 (DESIGN 9). Families move into cottages in this order.
export const FAMILIES = [
  { id: 'tran', name: 'The Tran family', kids: true, people: [
    { id: 'minh', name: 'Minh', role: 'Carpenter', line: 'A good house starts with a straight beam and a kind neighbour.', likes: ['corn_bread'] },
    { id: 'lan', name: 'Lan', role: 'Cook', line: 'Fresh bread in the morning makes the whole street smile.', likes: ['bread', 'egg'] },
    { id: 'bo', name: 'Bo', role: 'Schoolboy', line: 'Is the school really going to open again? I want a desk by the window!', likes: ['carrot'], kid: true },
  ] },
  { id: 'okafor', name: 'The Okafor family', kids: true, people: [
    { id: 'grace', name: 'Grace', role: 'Vet', line: 'Happy hens lay more eggs. Well, they lay the same, but they look happier doing it.', likes: ['egg', 'milk'] },
    { id: 'sam', name: 'Sam', role: 'Postman', line: 'Letters, parcels and gossip. I deliver all three.', likes: ['pumpkin'] },
    { id: 'zara', name: 'Zara', role: 'Schoolgirl', line: 'I am going to be the best reader in the whole school.', likes: ['carrot_cake'], kid: true },
  ] },
  { id: 'lindqvist', name: 'The Lindqvist family', kids: false, people: [
    { id: 'elin', name: 'Elin', role: 'Painter', line: 'Your fields look like a quilt from the hill. I might paint them.', likes: ['flowers'] },
    { id: 'olaf', name: 'Olaf', role: 'Retired sailor', line: 'The brook is no sea, but it sings just as sweetly.', likes: ['corn'] },
  ] },
  { id: 'reyes', name: 'The Reyes family', kids: true, people: [
    { id: 'marisol', name: 'Marisol', role: 'Nurse', line: 'A village needs a clinic. One day, maybe.', likes: ['milk'] },
    { id: 'tomas', name: 'Tomas', role: 'Mechanic', line: 'If it squeaks, bring it to me.', likes: ['bread'] },
    { id: 'pia', name: 'Pia', role: 'Little sister', line: 'I can count to a hundred. Do you want to hear?', likes: ['carrot'], kid: true },
  ] },
];
export const VILLAGERS = [
  { id: 'ada', name: 'Ada', role: 'Your grandmother', line: 'Bring the village back to life. Start with one seed.' },
  { id: 'cora', name: 'Cora', role: 'Teacher', line: 'Thirty desks, one bell, and all the questions in the world.', arrives: 'school' },
];
export const NEIGHBOURS = [
  { id: 'mai', name: 'Mai', farm: 'Lotus Farm', role: 'Neighbour', line: 'Good morning! I brought you some of my eggs.', gives: ['egg', 'wheat'], wants: ['corn', 'carrot', 'wheat'],
    comments: ['Your fields are so tidy!', 'I love the path to your gate.', 'Those carrots look delicious.', 'Your village is waking up!'] },
  { id: 'gus', name: 'Gus', farm: 'Old Mill Farm', role: 'Neighbour', line: 'Hmph. Nice farm. For a beginner.', gives: ['wheat', 'bread'], wants: ['egg', 'corn', 'pumpkin'],
    comments: ['Not bad. Not bad at all.', 'In my day we planted wheat by hand. Uphill.', 'Your cottages need more flowers. Trust me.', 'That bakery smells better than mine.'] },
];
/** Every person who can post an order, with their portrait colour. */
export const allPeople = () => [...VILLAGERS, ...FAMILIES.flatMap(f => f.people.map(p => ({ ...p, family: f.id }))), ...NEIGHBOURS];
export const ORDER_LINES = [
  'I am baking for the children.', 'My pantry is empty!', 'Could you help with a little picnic?', 'A treat for my neighbours.',
  'We are having friends over tonight.', 'For the village supper.', 'My grandmother is visiting.', 'Just what the recipe needs.',
];
/** The tutorial's first order (DESIGN 15). */
export const FIRST_ORDER = { from: 'ada', need: { wheat: 6 }, coins: 20, xp: 8, line: 'My first loaf in years! Six wheat, please.' };
