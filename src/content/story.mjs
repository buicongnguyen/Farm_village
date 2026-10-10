// The story (DESIGN 1, docs/STORY.md) and the first-session tutorial (DESIGN 15), as data.
// Chapter cards show when their `when` test first passes. Card 1 opens the game; cards 2–4 close their chapter (the
// DESIGN 1 "ends when" moment) with Ada's beat (`ada`); card 5 closes the clinic chapter.
// `panels` are up to three illustrations in public/assets/story/ (the card falls back to text while one is missing).
// Tutorial steps run in order; Ada speaks each one. Action verbs are bold (<b>), which the guide card renders as HTML.
import { STEPS } from './projects.mjs';
import { RESTORE } from './start.mjs';
import { workingCount } from '../core/working.mjs';
import { normalizeGrowth } from '../core/growth-state.mjs';

/** The village's name, for the HUD and the chapter 1 card. */
export const VILLAGE_NAME = 'Hollowbrook';

const step = id => STEPS.findIndex(st => st.id === id);
const arrivedFamilies = s => Object.values(s.homes ?? {}).filter(h => h.arrived).length;
const panels = (ch, captions) => captions.map((caption, i) => ({ img: `assets/story/ch${ch}-${i + 1}.webp`, caption }));

export const CHAPTERS = [
  { id: 1, title: 'A key and a seed tin', subtitle: 'Every story starts with coming home.', icon: '🗝',
    text: 'Hollowbrook was a busy mill village once. Then the mill closed, the young families followed the work to the city, and the houses emptied one by one. {person:ada:short} stayed. Her letter said: “The key is under the seed tin. Bring Hollowbrook home.” So you came, with {person:june:short} and {person:pip:short}.',
    ada: 'There you are! Mind the weeds. They have had the run of the place since {person:ellis:short} went upriver.',
    panels: panels(1, ['The brook road at dawn.', 'The farm, asleep under the weeds.', '{person:ada:short} at the gate, with the key.']),
    when: () => true },
  { id: 2, title: 'Something takes root', subtitle: 'A small harvest. A big beginning.', icon: '🌱',
    text: 'The hens settle in, and {person:ada:short}\'s oven is warm for the first time in years. {person:pip:short} has already named them: {pet:hen_cloud:short} and {pet:hen_drizzle:short}. Next door, {person:gus:short} from Old Mill Farm pretends not to watch.',
    ada: '{person:ellis:short} always said a farm wakes up one hen at a time. He would be proud of you, dear.',
    panels: panels(2, ['The first hens in the coop.', 'Smoke from {person:ada:short}\'s chimney.', '{person:gus:short}, watching from the lane.']),
    when: s => s.projects.step > step('mill_coop') && Object.values(s.animals ?? {}).some(list => list.length > 0) },
  { id: 3, title: 'A light in the window', subtitle: 'The first family comes home to Hollowbrook.', icon: '🏡',
    text: 'For the first time in years, a window in the village glows after dark. {family:tran} have moved into the cottage on Brook Lane, and {person:bo:short} is already asking about the old school.',
    ada: '{person:lan:short} brought me soup. Real soup, from a real neighbour. I had forgotten how that feels.',
    panels: panels(3, ['A cart on Brook Lane.', '{family:tran} at their new door.', 'One window glowing at night.']),
    when: s => arrivedFamilies(s) > 0 },
  { id: 4, title: 'A bell for the children', subtitle: 'The school opens its doors again.', icon: '🔔',
    text: '{person:cora:short} rings the old bell, and {person:bo:short} and {person:zara:short} race each other to the door. Hollowbrook has children again. That evening a letter comes from a nurse called {person:marisol:short}: her family wants a cottage, and she has a plan for the old clinic.',
    ada: '{person:ellis:short} carried that bell up the hill the year we married. Hear it? That is Hollowbrook saying thank you.',
    panels: panels(4, ['The school, with fresh paint.', '{person:cora:short} rings the bell.', '{person:bo:short} and {person:zara:short} race to the door.']),
    when: s => (s.counts.school ?? 0) > 0 },
  { id: 5, title: 'Someone to care for us', subtitle: 'The clinic opens its doors again.', icon: '🩺',
    text: 'Four families sign {person:marisol:short}’s list, and {person:hazel:display} comes home from the coast. The clinic opens, with {person:grace:short}’s vet room at the back. {person:hazel:short} pauses by the burned festival poster: she remembers treating {person:gus:short}’s hands that night. Outside, {person:ada:short} plants cherries for the grandchildren’s grandchildren.',
    ada: '{person:hazel:short} is home, and {person:ellis:short} has no excuse to hide that fishing-hook scar. Pick some cherries for her, dear.',
    panels: panels(5, ['The old clinic, shutters closed.', '{person:marisol:short} and her list.', 'Where the festival stage once stood.']),
    when: s => workingCount(s, 'clinic') > 0 && arrivedFamilies(s) >= 4 },
  // Act II, the valley wakes (docs/plan/ch06-market-day.md). The deed: sell the good of the day on a market day, and own three fields.
  { id: 6, title: 'Market day', subtitle: 'The square fills up again.', icon: '🧺',
    text: 'Stalls go up on the square, under bunting nobody has seen in years. A baker called {person:hugo:short} unpacks his trays as if he had never left. {person:gus:short} sold you the field “at a fair price, and do not thank me”. Upriver, {person:tomas:short} reads the name on a gatepost: a flour company in the city.',
    ada: 'I can smell fresh bread from my porch again. Go on, dear, buy us a loaf. A big one.',
    panels: panels(6, ['Bunting over the square.', '{person:hugo:short} and his trays.', 'The brook, upriver.']),
    when: s => (s.stats.marketDays ?? 0) >= 1 && s.parcels.length >= 3 },
  // The deed: the police post works again and the boat dock is built (docs/plan/ch07-safe-streets.md).
  { id: 7, title: 'Safe streets', subtitle: 'A lamp at the end of the lane.', icon: '🏮',
    text: 'The lamp over the police post is lit again. {person:pearl:display} reads a whole wall of old reports in a week and files every one. On the brook, {person:olaf:short} hammers the last plank of a dock and pretends it was nothing. In a drawer marked Gates, there is a letter from a flour company.',
    ada: 'I sleep better with a lamp at the end of the lane. And {person:olaf:short} whistles when he works. Have you noticed?',
    panels: panels(7, ['The lamp at the police post.', 'A dock on the brook.', 'The brook from the dock.']),
    when: s => workingCount(s, 'police') > 0 && (s.counts.dock ?? 0) > 0 },
  // The deed: the company office works and its first big delivery is paid (docs/plan/ch08-work-for-everyone.md).
  // Seeing this card opens the sluice (core/today.mjs chapterSeen): the water thread ends here.
  { id: 8, title: 'Work for everyone', subtitle: 'The wheel turns again.', icon: '⚙️',
    text: 'The first crates with Hollowbrook’s own label leave on the truck. With {person:ellis:short}’s notes and {person:pearl:short}’s reports, the village buys the water rights back. {person:tomas:short} oils the old sluice wheel, the gate lifts, and the brook comes down loud. At the mill, the big wheel creaks, then turns.',
    ada: 'I had forgotten the sound of that wheel. Listen, dear. That is what Hollowbrook sounds like when it is working.',
    panels: panels(8, ['The company office, open again.', 'The brook, running full.', 'The mill wheel turns.']),
    when: s => workingCount(s, 'company') > 0 && normalizeGrowth(s).settled >= 1 },
  // The deed: the festival stage is rebuilt and the first Harvest Festival has been held, to its end
  // (docs/plan/ch09-the-village-sings-again.md). The fire thread ends here; seeing this card brings Oak home.
  { id: 9, title: 'The village sings again', subtitle: 'Lanterns on the square.', icon: '🏮',
    text: 'The new stage smells of fresh wood. {person:gus:short} asks to light the first lantern, and says it at last: a storm blew the lanterns over the night he was minding them, the old stage burned, and he carried the children out. {person:ada:short} has kept a letter for him all these years. It says thank you.',
    ada: 'I wrote it the week after the fire, dear, and never found the right day to give it to him. Tonight was the right day.',
    panels: panels(9, ['The stage, rebuilt.', 'Lanterns over the square.', 'The whole village, together.']),
    when: s => (s.counts.stage ?? 0) > 0 && (s.stats.harvestFestivals ?? 0) >= 1 },
  // Act III, the brook co-operative. The deed: three hands hired, and thirty tasks done by them
  // (docs/plan/ch10-hands-to-help.md).
  { id: 10, title: 'Hands to help', subtitle: 'Nobody had to be asked twice.', icon: '🤝',
    text: 'The farm is too big for one pair of hands now, and nobody had to be asked twice. {person:minh:short} takes the far beds, {person:lan:short} the ovens, {person:sam:short} the truck. In the evening {person:ada:short} adds up the day on the back of an envelope, the way she always has.',
    ada: 'A farm is run from the porch as much as from the field, dear. Sit down. Let me show you the sums.',
    panels: panels(10, ['Hands in the field.', 'The ovens, never cold.', 'The day, added up.']),
    when: s => Object.keys(s.hands ?? {}).length >= 3 && (s.stats.handTasks ?? 0) >= 30 },
  // The deed: the player answers Mr Albright (docs/plan/ch11-the-man-from-the-city.md). The card reads by the answer
  // (`variants`, keyed by s.story.albright); the plain text is the cannery's, so every check has one to read.
  { id: 11, title: 'The man from the city', subtitle: 'One meadow, two answers.', icon: '🎩',
    text: 'The cannery goes up in a month, brick by brick, on the brook meadow. {person:albright:display} shakes every hand twice. The first tins leave with Hollowbrook’s name on them, and the wages are good. {person:gus:short} looks at the chimney a long time and says nothing at all.',
    ada: 'Work is work, dear, and I will not sniff at it. But plant a tree by that wall. Plant ten.',
    variants: {
      meadow: { text: '{person:albright:display} folds his drawings, puzzled and polite, and drives back to the city. The brook meadow stays a meadow. By midsummer it is full of flowers, and somebody has left three white beehives at its edge. Nobody will say who. {person:gus:short} has paint on his sleeve.',
        ada: 'He asked what a meadow is for. I said: come back at midsummer and stand in it. He might, you know.',
        panels: [...panels(11, ['The brook meadow.', '{person:albright:short} at the gate.']), { img: 'assets/story/ch11-3m.webp', caption: 'What the valley chose.' }] },
    },
    panels: panels(11, ['The brook meadow.', '{person:albright:short} at the gate.', 'What the valley chose.']),
    when: s => !!s.story.albright },
  // The deed: the co-operative is founded and its first order filled (docs/plan/ch12-one-river-many-farms.md). Seeing
  // the card takes the gate off the old towpath: the far bank can be walked (core/today.mjs). The end of Act III.
  { id: 12, title: 'One river, many farms', subtitle: 'Five carts, one road.', icon: '🤝',
    text: 'One cart cannot carry what the city asks for. Five can. The neighbours sign {person:ada:short}’s kitchen table instead of a paper, {person:gus:short} first, to everyone’s surprise. Then they sweep the old towpath over the brook and lift its gate off the hinges. The far bank lies open.',
    ada: 'Nobody ever got rich alone in this valley, dear. Plenty got poor that way.',
    panels: panels(12, ['New neighbours on the road.', 'The board on the square.', 'The towpath, open.']),
    when: s => !!s.cooperative?.founded && (s.cooperative.filled ?? 0) >= 1 },
  // The deed: the first quay house stands on the paved quay (docs/plan/ch13-the-far-bank.md). Act IV begins.
  { id: 13, title: 'The far bank', subtitle: 'A lamp on the other side.', icon: '🏮',
    text: 'The first lamp is lit on the far side of the brook. {person:tuyet:display} opens the shutters of her tea shop and reads names off a list: every family that wrote to ask if it was true, that the village was back. Four of them are carrying boxes up the stairs above her head.',
    ada: 'I can see that lamp from my porch, dear. I did not know how much I had missed a light over there.',
    panels: panels(13, ['The old quay, paved again.', 'The first house on the far bank.', 'A lamp across the water.']),
    when: s => (s.counts.apartment ?? 0) > 0 },
  // The deed: the hotel stands on the quay and ten guests have stayed and paid (docs/plan/ch14-rooms-with-a-view.md).
  { id: 14, title: 'Rooms with a view', subtitle: 'They came for the quiet, and stayed for breakfast.', icon: '🛎',
    text: 'The first guests are a couple who honeymooned here before the mill shut. They ask for the same room, and it is the only one that kept its old wallpaper. By the end of the week every key is off its hook, and {person:tuyet:display} is charging the hotel for hot water by the kettle.',
    ada: 'Tell them breakfast is from our own oven, dear. And tell them twice: city people never believe it the first time.',
    panels: panels(14, ['The hotel on the quay.', 'Breakfast for room three.', 'Every window lit.']),
    when: s => (s.counts.hotel ?? 0) > 0 && (s.stats.guests ?? 0) >= 10 },
  // The deed: the halt stands and a train has left with at least one full wagon (docs/plan/ch15-the-evening-train.md).
  { id: 15, title: 'The evening train', subtitle: 'Four minutes late, and nobody minded.', icon: '🚂',
    text: 'The first train is four minutes late and nobody minds. Half the village comes to the platform only to hear it. {person:sam:short}, who has carried the post by bicycle longer than he will say, lifts a sack on board and salutes the guard. When the whistle goes, the hens complain all the way down the valley.',
    ada: 'I counted the wagons when I was a girl, dear. I counted them tonight. Old habits keep their own time.',
    panels: panels(15, ['The halt on the quay.', 'Three wagons to fill.', 'The evening train.']),
    when: s => (s.counts.halt ?? 0) > 0 && (s.stats.trains ?? 0) >= 1 },
  // The deed: the three stops upriver are walked (docs/plan/ch16-where-the-brook-begins.md). The end of Act IV; this
  // chapter closes Oak's absence and opens nothing new.
  { id: 16, title: 'Where the brook begins', subtitle: 'The long way round.', icon: '💧',
    text: 'The spring is a wet rock under a fern, and {person:pip:short} is not impressed until {person:ellis:short} says that every drop in the mill race started there. He went upriver to learn why the water had stopped. He found the gate, and he stayed away, because he could not face coming home until it was open.',
    ada: 'He always did take the long way round, dear. My knees stayed home, and so did I. Was the fern still there?',
    panels: panels(16, ['The old weir.', 'The heron pool.', 'The spring.']),
    when: s => (s.upriver?.stops?.length ?? 0) >= 3 },
  // The deed: the valley company is founded (docs/plan/ch17-a-share-for-everyone.md). Act V begins: from here the valley
  // has one number, its value, which every part of the game adds to.
  { id: 17, title: 'A share for everyone', subtitle: 'One page each, and the same number on every page.', icon: '📜',
    text: '{person:bea:short} brings a ledger with one page for every household and the same number on every page. {person:gus:short} reads his three times. {person:june:short} signs last, because the hens wanted feeding. The co-operative, the office and the quay are one thing now, and it belongs to everybody who works in it.',
    ada: 'Your grandfather wants to frame his page, dear. I told him the ledger needs it more than the wall does.',
    panels: panels(17, ['The office on Civic row.', 'A page for every household.', 'The valley, all of it.']),
    when: s => !!s.valley?.founded },
  // The deed: a fair held to its end with at least one ribbon won (docs/plan/ch18-the-valley-fair.md).
  { id: 18, title: 'The valley fair', subtitle: 'Three valleys’ worth of carts on the bridge road.', icon: '🎀',
    text: 'Three valleys’ worth of carts come down the bridge road. {person:lan:short} judges the bread with her eyes closed. {person:olaf:short} measures every fish twice and the winner three times. {person:grace:short} lifts each pumpkin as if it might be asleep. By evening there are ribbons on the board, and one of them is ours.',
    ada: 'My mother’s ribbon is still in the drawer, dear. Now it has company.',
    panels: panels(18, ['Carts from three valleys.', 'The judging table.', 'A ribbon comes home.']),
    when: s => (s.stats?.fairs ?? 0) >= 1 && (s.fair?.ribbons ?? 0) >= 1 },
  // The deed: a picture-postcard valley worth the green mark (docs/plan/ch19-the-green-valley.md), stamped the first
  // time both hold (core/valley.mjs tickValley, greenAward). The card reads by the answer of chapter 11, like that chapter's own. Seeing it puts the plaque up.
  { id: 19, title: 'The green valley', subtitle: 'The prettiest working valley in the county.', icon: '🌿',
    text: 'The cannery has all but vanished behind its trees, and its yard has grown into an orchard. A plaque goes up at the bridge: the prettiest working valley in the county. {person:albright:display} is back, as a guest at the hotel. He stands at his window a long while, and admits the view is better than his drawings.',
    ada: 'I told him so, dear. Twice. He wrote it down the second time.',
    variants: {
      meadow: { text: 'The meadow is a mile of flowers now, with a path through the middle of it. A plaque goes up at the bridge: the prettiest working valley in the county. {person:albright:display} is back, as a guest at the hotel. He walks the path twice, and admits the view is better than his drawings.',
        panels: [...panels(19, ['The plaque at the bridge.', 'A guest at the hotel.']), { img: 'assets/story/ch19-3m.webp', caption: 'The green valley.' }] },
    },
    panels: panels(19, ['The plaque at the bridge.', 'A guest at the hotel.', 'The green valley.']),
    when: s => !!s.firsts?.greenValley },
];

// Short story moments between the chapter cards: shown once each, as a card of speaker lines, when `when` first passes.
export const BEATS = [
  { id: 'first-cherries', chapter: 3, when: s => (s.album?.fruit?.cherry ?? 0) > 0, lines: [
    { who: 'ada', text: 'Cherries for the grandchildren’s grandchildren. {person:ellis:short} says that is a long time to wait for pie.' },
    { who: 'june', text: 'A fruit stand by the lane, love. Let the orchard pay for its own next tree.' },
    { who: 'pip', text: 'I can count the cherries! If nobody eats them while I count.' },
  ] },
  { id: 'biscuit-home', chapter: 3, when: s => (s.counts.kennel ?? 0) > 0 && Object.values(s.homes ?? {}).some(h => h.family === 'okafor' && h.arrived), lines: [
    { who: 'grace', text: 'A kennel for {pet:dog:display}. No city poodle here: he has crows to chase and beds to watch.' },
    { who: 'pip', text: '{pet:dog:short} has a job! Does he get a lunch box?' },
    { who: 'grace', text: 'No upkeep, no chores. A warm roof and a good friend are enough.' },
  ] },
  { id: 'clinic-home', chapter: 5, when: s => (s.story.chapter ?? 0) >= 5 && workingCount(s, 'clinic') > 0, lines: [
    { who: 'marisol', text: 'Four names on the petition. {person:hazel:short}, the waiting room is ready. I have another list.' },
    { who: 'hazel', text: 'A nurse, a vet, and a cherry tree outside. You have given me every reason to stay.' },
    { who: 'ada', text: '{person:ellis:short} will bring his fishing stories. Keep a chair by the window for him, {person:hazel:short}.' },
  ] },
  // the end of chapter 1: the first harvest delivered to Ada
  { id: 'first-loaf', chapter: 1, when: s => (s.stats.ordersFilled ?? 0) > 0, lines: [
    { who: 'ada', text: 'Flour on my hands again! {person:ellis:short} would laugh to see me.' },
    { who: 'ada', text: 'That is the first wheat this farm has sold in eleven years. Keep going, dear.' },
    { who: 'pip', text: 'Can we have bread for dinner? With jam?' },
  ] },
  // the Trans have moved in and the second cottage is the next project: the Okafors are the family that asks for it
  { id: 'okafors-coming', chapter: 3, when: s => s.projects.step >= step('cottage2') && arrivedFamilies(s) >= 1, lines: [
    { who: 'ada', text: 'The next family is {person:sam:short}\'s! He delivered our post on a red bicycle when he was a boy.' },
    { who: 'ada', text: 'He has a vet for a wife now, and a daughter who reads everything.' },
    { who: 'pip', text: 'A girl? Does she like frogs? {person:bo:short} has a frog.' },
  ] },
  // the five loaves for the Okafors' first week are delivered (always after Ada has said who they are)
  { id: 'welcome-bread', chapter: 3, when: s => !!s.story.beats?.includes('okafors-coming') && (s.projects.step > step('cottage2') || (s.projects.step === step('cottage2') && (s.projects.delivered?.bread ?? 0) >= 5)), lines: [
    { who: 'lan', text: 'Five loaves for {family:okafor}! I tied a ribbon round each one.' },
    { who: 'ada', text: 'That is how Hollowbrook used to welcome people. Bread on the doorstep.' },
    { who: 'pip', text: 'I ate the end of one. Just the end.' },
  ] },
  // ── Chapter 6 (docs/plan/ch06-market-day.md). The water thread moves one step; nobody has a key, and Oak is still upriver. ──
  { id: 'gus-field', chapter: 6, when: s => (s.story.chapter ?? 0) >= 5 && s.parcels.length >= 3, lines: [
    { who: 'gus', text: 'A fair price, and not a coin less. Do not thank me. I mean it.' },
    { who: 'june', text: 'He walked the fence twice before he signed, love. He wanted to be sure we would look after it.' },
    { who: 'gus', text: 'Hmph. The soil is good by the old hedge. That is all I am saying.' },
  ] },
  { id: 'animal-corner', chapter: 6, when: s => (s.story.chapter ?? 0) >= 5 && workingCount(s, 'goat_barn') > 0, lines: [
    { who: 'grace', text: 'Goats! Good. They eat what the cows leave, and they complain less than a city poodle.' },
    { who: 'june', text: 'A corner of their own for the animals. It is starting to feel like a real farm, love.' },
    { who: 'pip', text: 'Can I name them? All of them? I have a list.' },
  ] },
  { id: 'first-butter', chapter: 6, when: s => (s.story.chapter ?? 0) >= 5 && (s.stats.butterMade ?? 0) > 0, lines: [
    { who: 'lan', text: 'Butter from your own churn! My mother said good bread needs only two things, and now you make both.' },
    { who: 'pip', text: 'It is yellow. Why is it yellow? The milk was white.' },
    { who: 'lan', text: 'Bring me some, dear, and I will show you what a warm loaf is for.' },
  ] },
  { id: 'cheese-picnic', chapter: 6, when: s => (s.story.chapter ?? 0) >= 5 && (s.stats.butterMade ?? 0) > 0 && (s.stats.cheeseMade ?? 0) > 0, lines: [
    { who: 'ada', text: 'Bread, butter and cheese. I packed that for {person:ellis:short} every time he went upriver.' },
    { who: 'pip', text: 'I counted the plates. There is one too many.' },
    { who: 'ada', text: 'That one stays, dear. He will want it when he comes home.' },
  ] },
  { id: 'flour-company', chapter: 6, when: s => (s.story.chapter ?? 0) >= 6, lines: [
    { who: 'tomas', text: 'The gate upriver has two plates on it. One is the maker. The other is the owner: a flour company in the city.' },
    { who: 'sam', text: 'I carried their letters as a boy! Thick envelopes, never a stamp out of place. Nobody here ever opened one.' },
    { who: 'tomas', text: 'A gate made that well was shut on purpose. Somebody still has the papers.' },
  ] },
  // ── Chapter 7 (docs/plan/ch07-safe-streets.md) ──
  { id: 'pearl-arrives', chapter: 7, when: s => (s.story.chapter ?? 0) >= 6 && workingCount(s, 'police') > 0, lines: [
    { who: 'pearl', text: '{person:pearl:display}, reporting. I have a whistle, a notebook and a kettle. The kettle is the important one.' },
    { who: 'ada', text: 'A constable! Mind you, the worst crime here was {person:gus:short} taking the last scone.' },
    { who: 'pearl', text: 'Noted. I will start with the old reports, and work forward to the scone.' },
  ] },
  { id: 'olaf-dock', chapter: 7, when: s => (s.story.chapter ?? 0) >= 6 && (s.counts.dock ?? 0) > 0, lines: [
    { who: 'olaf', text: 'There. A dock. Every village on a river should have one, and now this one does.' },
    { who: 'pip', text: 'Can we have a boat? A big one? With a flag?' },
    { who: 'olaf', text: 'One plank at a time, little sailor. One plank at a time.' },
  ] },
  { id: 'pond-water', chapter: 7, when: s => (s.story.chapter ?? 0) >= 6 && (s.stats.watered ?? 0) > 0, lines: [
    { who: 'june', text: 'The beds by the pond are ahead of the others, love. The roots found the water before we did.' },
    { who: 'ada', text: '{person:ellis:short} always dug his beds where the ground stayed dark. Now I know why.' },
  ] },
  // ── Chapter 8 (docs/plan/ch08-work-for-everyone.md): the water thread ends; Oak is still upriver ──
  { id: 'bea-arrives', chapter: 8, when: s => (s.story.chapter ?? 0) >= 7 && workingCount(s, 'company') > 0, lines: [
    { who: 'bea', text: '{person:bea:display}, office manager. I count everything twice, and I already like what I am counting.' },
    { who: 'june', text: 'She has a ledger for the ledgers, love.' },
    { who: 'bea', text: 'Three, in fact.' },
  ] },
  { id: 'water-rights', chapter: 8, when: s => (s.story.chapter ?? 0) >= 8, lines: [
    { who: 'bea', text: 'Paid in full and stamped twice. The water is the village’s again, on paper and in the brook.' },
    { who: 'tomas', text: 'One good pull on the wheel and the gate went up. It was never broken. Only shut.' },
    { who: 'ada', text: 'Like the rest of us, dear. Never broken. Only shut.' },
  ] },
  { id: 'wheel-turns', chapter: 8, when: s => (s.story.chapter ?? 0) >= 8 && (s.stats.sluiceMade ?? 0) > 0, lines: [
    { who: 'minh', text: 'I have wanted to see that wheel move since I was a boy. It is faster than I drew it.' },
    { who: 'pip', text: 'It goes round and round and it never gets dizzy!' },
  ] },
  // ── Chapter 9 (docs/plan/ch09-the-village-sings-again.md): the fire thread ends; Oak comes home ──
  { id: 'stage-up', chapter: 9, when: s => (s.story.chapter ?? 0) >= 8 && (s.counts.stage ?? 0) > 0, lines: [
    { who: 'elin', text: 'I found the old festival poster under the clinic stairs. Same colours as your new canopy. I did not plan that.' },
    { who: 'minh', text: 'Every joint pegged, not nailed. This one is staying up.' },
    { who: 'gus', text: 'Hmph. It will want lanterns. I know where the old hooks are.' },
  ] },
  { id: 'gus-truth', chapter: 9, when: s => (s.story.chapter ?? 0) >= 9, lines: [
    { who: 'hazel', text: 'I bandaged those hands that night, {person:gus:short}. You never said how you burned them.' },
    { who: 'gus', text: 'Carrying children is hot work. That is all there is to say about it.' },
    { who: 'ada', text: 'He has read my letter four times since supper. Do not tell him I counted.' },
  ] },
  { id: 'oak-home', chapter: 9, when: s => (s.story.chapter ?? 0) >= 9 && !!s.story.beats?.includes('gus-truth'), lines: [
    { who: 'ellis', text: 'I followed the water down. It knew the way better than I did.' },
    { who: 'pip', text: '{person:ellis:short}! You are real! Did you bring a fish? Did you bring ALL the fish?' },
    { who: 'ada', text: 'Your chair is where you left it. Sit down before you say anything clever.' },
  ] },
  // ── Chapter 10 (docs/plan/ch10-hands-to-help.md) ──
  { id: 'three-hands', chapter: 10, when: s => (s.story.chapter ?? 0) >= 9 && Object.keys(s.hands ?? {}).length >= 3, lines: [
    { who: 'june', text: 'Three pairs of hands, love. I sat down today. In daylight. On purpose.' },
    { who: 'pip', text: 'Can I be a hand? I have two.' },
    { who: 'june', text: 'You are the supervisor, sweetheart. It is a very serious job.' },
  ] },
  { id: 'report-first', chapter: 10, when: s => (s.story.chapter ?? 0) >= 9 && (s.stats.reports ?? 0) >= 1, lines: [
    { who: 'ada', text: 'There. Every coin with a name on it. Your grandfather never believed in sums until the sums believed in him.' },
    { who: 'ellis', text: 'I heard that.' },
  ] },
  // ── Chapter 11 (docs/plan/ch11-the-man-from-the-city.md): the one choice. Both answers are good ones. ──
  { id: 'albright-arrives', chapter: 11, when: s => (s.story.chapter ?? 0) >= 10 && !s.story.albright, lines: [
    { who: 'albright', text: 'Good day. {person:albright:display}, from the city. That meadow along your brook: I would like to build a cannery on it. Good wages, good tins.' },
    { who: 'june', text: 'It is the prettiest corner of the valley, love. And it is the most money anyone has offered us.' },
    { who: 'gus', text: 'Hmph. I learned to swim off that bank. Not that anybody asked me.' },
  ] },
  { id: 'albright-factory', chapter: 11, when: s => (s.story.chapter ?? 0) >= 11 && s.story.albright === 'factory', lines: [
    { who: 'albright', text: 'You will not regret it. And I mean to make it a handsome building. I am not a barbarian.' },
    { who: 'tomas', text: 'I have looked at his machines. They are good machines. I would like a chimney filter on that stack, mind.' },
  ] },
  { id: 'albright-meadow', chapter: 11, when: s => (s.story.chapter ?? 0) >= 11 && s.story.albright === 'meadow', lines: [
    { who: 'albright', text: 'I do not understand it. But I have seldom been refused so kindly. Good day to you all.' },
    { who: 'pip', text: 'He forgot his hat! No, wait. He left it for the scarecrow.' },
  ] },
  // ── Chapter 12 (docs/plan/ch12-one-river-many-farms.md): the co-operative, and the towpath opened. ──
  { id: 'coop-idea', chapter: 12, when: s => (s.story.chapter ?? 0) >= 11 && ['priya', 'twins'].every(id => (s.neighbours?.[id]?.total ?? 0) >= 1), lines: [
    { who: 'mai', text: 'Five farms on one river, and each of us sends a half-empty cart to the city. What if we filled them together?' },
    { who: 'priya', text: 'I have done that sum. It comes out very well indeed.' },
    { who: 'june', text: 'A co-operative. {person:ada:short} has been saying so for years, love. There is a board going up on the square.' },
  ] },
  { id: 'coop-founded', chapter: 12, when: s => !!s.cooperative?.founded, lines: [
    { who: 'gus', text: 'Give me that pen. If I sign first, nobody can say I was talked into it.' },
    { who: 'ada', text: 'Sign the table, all of you. Paper gets lost. This table was here before the mill.' },
    { who: 'twins', text: 'We both signed. — I signed neater. — I signed bigger.' },
  ] },
  { id: 'bridge-open', chapter: 12, when: s => (s.story.chapter ?? 0) >= 12, lines: [
    { who: 'pip', text: 'I ran along the far bank and back! Twice! The grasshoppers over there are DIFFERENT.' },
    { who: 'ellis', text: 'I walked that towpath as a boy. It goes further than you think.' },
  ] },
  // ── Chapter 13 (docs/plan/ch13-the-far-bank.md): the quay paved, the first house on the far bank. ──
  { id: 'quay-paved', chapter: 13, when: s => !!s.firsts?.quay, lines: [
    { who: 'minh', text: 'Good stone under all that grass. Whoever laid this quay meant it to last. It did.' },
    { who: 'ada', text: 'There were seven houses along it when I was a girl. You could buy a hat, a boat and a wedding cake without getting your feet wet.' },
  ] },
  { id: 'tuyet-list', chapter: 13, when: s => (s.story.chapter ?? 0) >= 13, lines: [
    { who: 'tuyet', text: 'Forty-one names on my list, and I have ticked four. The rest are waiting for a roof.' },
    { who: 'sam', text: 'Give me the replies. I will carry every one, and I will take the long way so they last.' },
    { who: 'tuyet', text: 'You always did, boy. You were late with my newspaper for eleven years.' },
  ] },
  // ── Chapter 14 (docs/plan/ch14-rooms-with-a-view.md): the hotel and its guests. ──
  { id: 'first-guests', chapter: 14, when: s => (s.hotel?.n ?? 0) >= 1, lines: [
    { who: 'tuyet', text: 'Two with a suitcase between them, off the morning cart. They asked if the brook still talks at night.' },
    { who: 'lan', text: 'Guests! I shall bake. What do people from the city eat for breakfast? Never mind. They will eat mine.' },
  ] },
  { id: 'full-house', chapter: 14, when: s => !!s.firsts?.fullHouse, lines: [
    { who: 'pip', text: 'Every room has somebody in it! I counted the shoes outside the doors.' },
    { who: 'june', text: 'A full house. The prettier we keep the valley, love, the faster the next ones come.' },
  ] },
  // ── Chapter 15 (docs/plan/ch15-the-evening-train.md): the halt, the train. ──
  { id: 'rails-cleared', chapter: 15, when: s => (s.counts.halt ?? 0) > 0, lines: [
    { who: 'tomas', text: 'New sleepers, old rails. I knocked the rust off every one. They ring like bells.' },
    { who: 'sam', text: 'A train! Do you know how many hills I have pushed that bicycle up? I am going to sit down and watch the post arrive by itself.' },
  ] },
  { id: 'first-whistle', chapter: 15, when: s => (s.train?.n ?? 0) >= 1 || !!s.train?.here, lines: [
    { who: 'pip', text: 'It WHISTLED! Did you hear? {pet:dog:short} hid under the cart!' },
    { who: 'gus', text: 'Hmph. Four minutes late. In my day it was six. Standards are slipping.' },
  ] },
  { id: 'full-train', chapter: 15, when: s => !!s.firsts?.fullTrain, lines: [
    { who: 'bea', text: 'Three wagons, full to the roof, and every crate on my list. I counted twice. I may count again for pleasure.' },
    { who: 'ada', text: 'Hollowbrook on a railway label. Well. I shall need a better hat for the city.' },
  ] },
  // ── Chapter 16 (docs/plan/ch16-where-the-brook-begins.md): the walk upriver, one scene at each stop. ──
  { id: 'upriver-ask', chapter: 16, when: s => (s.story.chapter ?? 0) >= 15, lines: [
    { who: 'ellis', text: 'I have a mind to walk up to the spring again, now that the valley can spare me. Who is coming?' },
    { who: 'pip', text: 'Me! How far is it? Are there frogs? I will bring a jar.' },
    { who: 'ada', text: 'Take the child and a picnic. My knees will hear all about it afterwards.' },
  ] },
  { id: 'upriver-weir', chapter: 16, when: s => !!s.upriver?.stops?.includes('weir'), lines: [
    { who: 'pip', text: 'Eleven stones! One of them wobbles. I am not saying which.' },
    { who: 'ellis', text: 'I fished off this weir with a bent pin and that very float. I caught a boot. Twice.' },
    { who: 'pip', text: 'The SAME boot?' },
  ] },
  { id: 'upriver-heron', chapter: 16, when: s => !!s.upriver?.stops?.includes('heron'), lines: [
    { who: 'ellis', text: 'Stand still. Stiller than that. A heron does not hold with fidgeting.' },
    { who: 'pip', text: 'I counted to forty and it did not blink. I blinked nine times.' },
    { who: 'ellis', text: 'It was here every morning when I came up alone. Good company. It never once asked when I was going home.' },
  ] },
  { id: 'upriver-spring', chapter: 16, when: s => !!s.upriver?.stops?.includes('spring'), lines: [
    { who: 'pip', text: 'That is IT? It is a wet rock.' },
    { who: 'ellis', text: 'Every drop in the mill race began under that fern. I sat here a long while, the year the water stopped, working up the nerve to follow it down.' },
    { who: 'pip', text: 'Then it is the BEST wet rock. Can we take some home in a bottle?' },
  ] },
  // ── Chapter 17 (docs/plan/ch17-a-share-for-everyone.md): the valley company, the first dividend. ──
  { id: 'ledger', chapter: 17, when: s => (s.story.chapter ?? 0) >= 16 && !!s.cooperative?.founded && (s.counts?.apartment ?? 0) > 0, lines: [
    { who: 'bea', text: 'A co-operative, an office and a quay, and three sets of books. I should like one set. I have drawn it up.' },
    { who: 'tuyet', text: 'A company. With shares? I have never owned a share of anything but a rowing boat.' },
    { who: 'bea', text: 'One each, every household alike. It only wants founding, and a sum to found it with.' },
  ] },
  { id: 'first-dividend', chapter: 17, when: s => !!s.firsts?.dividend, lines: [
    { who: 'pip', text: 'Is a dividend the same as pocket money? Can I buy a goat with mine?' },
    { who: 'june', text: 'It is the valley paying itself, love. And no. Half a goat, perhaps.' },
  ] },
  // ── Chapter 18 (docs/plan/ch18-the-valley-fair.md): the fair is talked of, and the first ribbon. ──
  { id: 'fair-talk', chapter: 18, when: s => (s.story.chapter ?? 0) >= 17 && !!s.valley?.founded, lines: [
    { who: 'gus', text: 'Three valleys held a fair on this square every autumn when I was a boy. Then one year nobody had anything to show.' },
    { who: 'ada', text: 'We have things to show now. Three classes, as it always was: field, kitchen and pond.' },
    { who: 'pip', text: 'Can I enter {pet:dog:display}? He is the best at being a dog.' },
  ] },
  { id: 'first-ribbon', chapter: 18, when: s => (s.fair?.ribbons ?? 0) >= 1, lines: [
    { who: 'june', text: 'It is going on the wall by the door, love, where the postman can see it.' },
    { who: 'pip', text: 'Next time I am growing a pumpkin so big it needs its own cart.' },
  ] },
  // ── Chapter 19 (docs/plan/ch19-the-green-valley.md): a line for each title the valley earns, and Mr Albright's return. ──
  { id: 'title-going-farm', chapter: 19, when: s => !!s.firsts?.['title:100000'], lines: [
    { who: 'bea', text: 'A hundred thousand, by my sums. The ledger has a name for that: a going farm.' },
    { who: 'gus', text: 'I have called this valley worse. A going farm will do.' },
  ] },
  { id: 'title-pride', chapter: 19, when: s => !!s.firsts?.['title:1000000'], lines: [
    { who: 'june', text: 'A million, love! They are calling us the pride of the lane.' },
    { who: 'pip', text: 'Which lane? I want to go and stand in it.' },
  ] },
  { id: 'title-larder', chapter: 19, when: s => !!s.firsts?.['title:10000000'], lines: [
    { who: 'bea', text: 'Ten million. The city papers call us the valley’s larder.' },
    { who: 'ada', text: 'A larder wants filling every single day, dear. Do not let it go to your head.' },
  ] },
  { id: 'title-city', chapter: 19, when: s => !!s.firsts?.['title:100000000'], lines: [
    { who: 'tuyet', text: 'A cousin wrote from the city. There is a shop there with our valley’s name over the door.' },
    { who: 'gus', text: 'Known in the city. My father would have asked what the city wanted with us.' },
  ] },
  { id: 'albright-returns', chapter: 19, when: s => (s.story.chapter ?? 0) >= 18 && (s.counts?.hotel ?? 0) > 0 && Object.keys(s.valley?.goals ?? {}).length >= 3, lines: [
    { who: 'albright', text: 'I have taken a room with a view of the brook. I am told there is no other kind.' },
    { who: 'ada', text: 'And how does it look beside your drawings, {person:albright:display}?' },
    { who: 'albright', text: 'My drawings had more chimneys. I find I do not miss them.' },
  ] },
];

// HUD buttons: build, orders, barn, projects, today, settings (turn and language are always there)
const ALL = ['build', 'orders', 'barn', 'projects', 'today'];
/** The first session in the restored village (PLAN-v0.3): things are there, the work is to bring them back. */
export const RESTORE_TUTORIAL = [
  { id: 'harvest', text: 'Welcome back to the farm, dear. {person:ellis:short} sowed this wheat the week before he went upriver, and it has waited for you. When it turns golden, <b>tap</b> a bed and <b>harvest</b>.', hud: ['barn'], point: 'bed',
    done: s => s.stats.harvested > 0 },
  { id: 'order', text: 'I have an order for you. <b>Open</b> the order board and <b>deliver</b> my six wheat. My oven has been cold too long.', hud: ['barn', 'orders'], point: 'orders',
    done: s => s.stats.ordersFilled > 0 },
  { id: 'mill', text: 'Our old feed mill and coop are in a sorry state. <b>Tap</b> the feed mill and <b>repair</b> it, then the coop. {person:ellis:short} built that coop from an old boat.', hud: ['barn', 'orders', 'projects'], point: 'mill',
    done: s => s.projects.step > 2 },
  { id: 'hens', text: '<b>Tap</b> the coop for your first hens. {person:mai:short} from Lotus Farm next door is giving you two!', hud: ['build', 'orders', 'barn', 'projects'], point: 'coop',
    done: s => Object.values(s.animals).some(list => list.length > 0) },
  { id: 'feed', text: 'Hens eat chicken feed. <b>Make</b> some at the feed mill, then <b>tap</b> the coop to feed them. {person:pip:short} will want to help.', hud: ['build', 'orders', 'barn', 'projects'], point: 'mill',
    done: s => Object.values(s.animals).flat().some(a => a.doneAt != null) || (s.barn.items.egg ?? 0) > 0 },
  { id: 'cottage', text: 'A family is looking for a home. <b>Tap</b> a run-down cottage in the village and <b>repair</b> it. Hollowbrook has waited a long time for this.', hud: ALL, point: 'cottage',
    done: s => workingCount(s, 'cottage') > 0 },
  { id: 'free', text: 'You are doing wonderfully, dear. The <b>Today</b> board shows what is ready each day. Hollowbrook is yours to bring back now.', hud: ALL, point: 'today',
    done: () => false, last: true },
];
/** The tutorial for this game: the restored village has its own. */
export const tutorialOf = s => (s?.mode === 'restore' ? RESTORE_TUTORIAL : TUTORIAL);
export const TUTORIAL = [
  { id: 'clear', text: 'First, a patch by the house. <b>Tap</b> the weeds, then <b>tap</b> the broom. {person:ellis:short} hated weeds more than foxes.', hud: [], point: 'weeds',
    done: s => s.stats.cleared >= 3 },
  { id: 'path', text: 'A farm needs a path to the road. <b>Open</b> build mode and <b>lay</b> three path tiles. {person:ellis:short} laid the old one stone by stone.', hud: ['build'], point: 'path',
    done: s => s.stats.paths >= 3 },
  { id: 'beds', text: 'Now <b>place</b> six crop beds on the cleared ground. They are free, dear. The soil remembers.', hud: ['build'], point: 'beds',
    done: s => (s.counts.bed ?? 0) >= 6 },
  { id: 'plant', text: '<b>Tap</b> a bed, <b>choose</b> wheat, then <b>drag</b> across the others to plant them all. {person:ellis:short} could sow a straight row with his eyes shut.', hud: ['build'], point: 'bed',
    done: s => Object.keys(s.beds).length >= 6 || s.stats.harvested > 0 },
  { id: 'harvest', text: 'The first wheat always grows fast. When it turns golden, <b>tap</b> a bed and <b>harvest</b>.', hud: ['build', 'barn'], point: 'bed',
    done: s => s.stats.harvested > 0 },
  { id: 'order', text: 'I have an order for you. <b>Open</b> the order board and <b>deliver</b> my six wheat. My oven has been cold too long.', hud: ['build', 'barn', 'orders'], point: 'orders',
    done: s => s.stats.ordersFilled > 0 },
  { id: 'mill', text: 'Our first project: a feed mill and a coop. <b>Open</b> the projects and <b>follow</b> the steps. {person:ellis:short} built our first coop from an old boat.', hud: ['build', 'barn', 'orders', 'projects'], point: 'projects',
    done: s => s.projects.step > 2 },
  { id: 'hens', text: '<b>Put</b> a fence with a gate around the coop, then <b>tap</b> the coop for your first hens. {person:mai:short} from Lotus Farm next door is giving you two!', hud: ALL.filter(h => h !== 'today'), point: 'coop',
    done: s => Object.values(s.animals).some(list => list.length > 0) },
  { id: 'feed', text: 'Hens eat chicken feed. <b>Make</b> some at the feed mill, then <b>tap</b> the coop to feed them. {person:pip:short} will want to help.', hud: ALL.filter(h => h !== 'today'), point: 'mill',
    done: s => Object.values(s.animals).flat().some(a => a.doneAt != null) || (s.barn.items.egg ?? 0) > 0 },
  { id: 'cottage', text: 'A family is looking for a home. <b>Build</b> the first cottage in the village, with a path to its door. Hollowbrook has waited a long time for this.', hud: ALL, point: 'projects',
    done: s => (s.counts.cottage ?? 0) > 0 },
  { id: 'free', text: 'You are doing wonderfully, dear. The <b>Today</b> board shows what is ready each day. Hollowbrook is yours to grow now.', hud: ALL, point: 'today',
    done: () => false, last: true },
];
