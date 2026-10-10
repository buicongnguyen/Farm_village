// The story (DESIGN 1, docs/STORY.md) and the first-session tutorial (DESIGN 15), as data.
// Chapter cards show when their `when` test first passes. Card 1 opens the game; cards 2–4 close their chapter (the
// DESIGN 1 "ends when" moment) with Ada's beat (`ada`); card 5 closes the clinic chapter.
// `panels` are up to three illustrations in public/assets/story/ (the card falls back to text while one is missing).
// Tutorial steps run in order; Ada speaks each one. Action verbs are bold (<b>), which the guide card renders as HTML.
import { STEPS } from './projects.mjs';
import { RESTORE } from './start.mjs';
import { workingCount } from '../core/working.mjs';

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
