// Letters to the farmhouse mailbox (DESIGN 9.2, docs/STORY.md). core/bonds.mjs (play package) posts each one to s.mail
// once its `when` is met:
//   { type: 'chapter', value: n }  when chapter card n has been seen (s.story.chapter >= n)
//   { type: 'hearts',  value: n }  when the sender (`from`) has n hearts or more
//   { type: 'level',   value: n }  when the farm reaches level n
// Ellis is away upriver all through v0.1: his letters are the only way the player meets him (and set up fishing in v0.2).
export const LETTERS = [
  { id: 'ellis-1', from: 'ellis', when: { type: 'chapter', value: 1 },
    text: 'Sorry I was not at the gate. Gone fishing upriver. Back when the fish say so. Mind Ada\'s knees and the hens\' feelings. -E' },
  { id: 'ada-1', from: 'ada', when: { type: 'level', value: 2 },
    text: 'You sold your first wheat today. I watched from the window and cried into the teapot. Silly old thing. Love, Ada' },
  { id: 'mai-1', from: 'mai', when: { type: 'chapter', value: 2 },
    text: 'Welcome to the valley! Those two hens were Pancake and Biscuit, but I hear Pip renamed them. Quite right. Come to Lotus Farm for tea! Love, Mai' },
  { id: 'gus-1', from: 'gus', when: { type: 'level', value: 3 },
    text: 'To the new farmer. Your fence is crooked. Your wheat is fine. Do not let it go to your head. -Gus' },
  { id: 'ellis-2', from: 'ellis', when: { type: 'chapter', value: 3 },
    text: 'The fish upriver are thin this year, and the brook runs lower than it should. Someone has been busy at the old sluice. I am looking into it. Tell Ada I am eating properly. -E' },
  { id: 'ada-2', from: 'ada', when: { type: 'chapter', value: 3 },
    text: 'I sat on the porch tonight and listened to children laughing on Brook Lane. Ellis would say I have gone soft. He would be right. Love, Ada' },
  { id: 'lan-1', from: 'lan', when: { type: 'hearts', value: 3 },
    text: 'My welcome bread, for your recipe box: three wheat, a pinch of salt, and a neighbour to share it with. -Lan' },
  { id: 'sam-1', from: 'sam', when: { type: 'hearts', value: 3 },
    text: 'Hand-delivered by me, to you, from me. Thank you for the pumpkins. The long way home smells of pie now. -Sam' },
  { id: 'zara-1', from: 'zara', when: { type: 'hearts', value: 3 },
    text: 'Dear farmer, I am writing you a letter because I can. I can do joined-up writing too. Look: Zara. -Zara, age 8' },
  { id: 'gus-2', from: 'gus', when: { type: 'level', value: 5 },
    text: 'That bread of yours. Fold it once more before it rises. Somebody taught me that once. -Gus' },
  { id: 'ellis-3', from: 'ellis', when: { type: 'level', value: 5 },
    text: 'Caught a trout as long as Pip\'s arm and let it go. It looked like it had somewhere to be. There is a new padlock on the sluice gate. Who locks a river? -E' },
  { id: 'cora-1', from: 'cora', when: { type: 'chapter', value: 4 },
    text: 'Thank you for the school. Thirty desks, one bell and seven pupils so far. Bo has already asked to be bell monitor. With thanks, Cora' },
  { id: 'marisol-1', from: 'marisol', when: { type: 'chapter', value: 4 },
    text: 'Dear farmer, Cora wrote to me about Hollowbrook. My family would love a cottage, and I would love to talk about the old clinic. I have a list. -Marisol Reyes' },
  { id: 'ellis-4', from: 'ellis', when: { type: 'chapter', value: 4 },
    text: 'Heard the school bell all the way upriver. The wind was right. Had to sit down for a minute. Proud of you. Bring Hollowbrook home. -E' },
  { id: 'olaf-1', from: 'olaf', when: { type: 'hearts', value: 3 },
    text: 'The brook sang all night, and I slept like a ship in harbour. Thank you, young farmer. -Olaf' },
  { id: 'pia-1', from: 'pia', when: { type: 'hearts', value: 3 },
    text: 'I counted the stars from my window. There were 100. Then I fell asleep. -Pia' },
];
