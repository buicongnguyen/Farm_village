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
    text: 'Hollowbrook was a busy mill village once. Then the mill closed, the young families followed the work to the city, and the houses emptied one by one. Ada stayed. Her letter said: “The key is under the seed tin. Bring Hollowbrook home.” So you came, with June and Pip.',
    ada: 'There you are! Mind the weeds. They have had the run of the place since Ellis went upriver.',
    panels: panels(1, ['The brook road at dawn.', 'The farm, asleep under the weeds.', 'Ada at the gate, with the key.']),
    when: () => true },
  { id: 2, title: 'Something takes root', subtitle: 'A small harvest. A big beginning.', icon: '🌱',
    text: 'The hens settle in, and Ada\'s oven is warm for the first time in years. Pip has already named them: Cloud and Drizzle. Next door, Gus from Old Mill Farm pretends not to watch.',
    ada: 'Ellis always said a farm wakes up one hen at a time. He would be proud of you, dear.',
    panels: panels(2, ['The first hens in the coop.', 'Smoke from Ada\'s chimney.', 'Gus, watching from the lane.']),
    when: s => s.projects.step > step('mill_coop') && Object.values(s.animals ?? {}).some(list => list.length > 0) },
  { id: 3, title: 'A light in the window', subtitle: 'The first family comes home to Hollowbrook.', icon: '🏡',
    text: 'For the first time in years, a window in the village glows after dark. The Trans have moved into the cottage on Brook Lane, and Bo is already asking about the old school.',
    ada: 'Lan brought me soup. Real soup, from a real neighbour. I had forgotten how that feels.',
    panels: panels(3, ['A cart on Brook Lane.', 'The Trans at their new door.', 'One window glowing at night.']),
    when: s => arrivedFamilies(s) > 0 },
  { id: 4, title: 'A bell for the children', subtitle: 'The school opens its doors again.', icon: '🔔',
    text: 'Cora rings the old bell, and Bo and Zara race each other to the door. Hollowbrook has children again. That evening a letter comes from a nurse called Marisol: her family wants a cottage, and she has a plan for the old clinic.',
    ada: 'Ellis carried that bell up the hill the year we married. Hear it? That is Hollowbrook saying thank you.',
    panels: panels(4, ['The school, with fresh paint.', 'Cora rings the bell.', 'Bo and Zara race to the door.']),
    when: s => (s.counts.school ?? 0) > 0 },
  { id: 5, title: 'Someone to care for us', subtitle: 'The clinic opens its doors again.', icon: '🩺',
    text: 'Four families sign Marisol’s list, and Dr Hazel comes home from the coast. The clinic opens, with Grace’s vet room at the back. Hazel pauses by the burned festival poster: she remembers treating Gus’s hands that night. Outside, Ada plants cherries for the grandchildren’s grandchildren.',
    ada: 'Hazel is home, and Ellis has no excuse to hide that fishing-hook scar. Pick some cherries for her, dear.',
    panels: panels(5, ['The old clinic, shutters closed.', 'Marisol and her list.', 'Where the festival stage once stood.']),
    when: s => workingCount(s, 'clinic') > 0 && arrivedFamilies(s) >= 4 },
];

// Short story moments between the chapter cards: shown once each, as a card of speaker lines, when `when` first passes.
export const BEATS = [
  { id: 'first-cherries', chapter: 3, when: s => (s.album?.fruit?.cherry ?? 0) > 0, lines: [
    { who: 'ada', text: 'Cherries for the grandchildren’s grandchildren. Ellis says that is a long time to wait for pie.' },
    { who: 'june', text: 'A fruit stand by the lane, love. Let the orchard pay for its own next tree.' },
    { who: 'pip', text: 'I can count the cherries! If nobody eats them while I count.' },
  ] },
  { id: 'biscuit-home', chapter: 3, when: s => (s.counts.kennel ?? 0) > 0 && Object.values(s.homes ?? {}).some(h => h.family === 'okafor' && h.arrived), lines: [
    { who: 'grace', text: 'A kennel for Biscuit. No city poodle here: he has crows to chase and beds to watch.' },
    { who: 'pip', text: 'Biscuit has a job! Does he get a lunch box?' },
    { who: 'grace', text: 'No upkeep, no chores. A warm roof and a good friend are enough.' },
  ] },
  { id: 'clinic-home', chapter: 5, when: s => (s.story.chapter ?? 0) >= 5 && workingCount(s, 'clinic') > 0, lines: [
    { who: 'marisol', text: 'Four names on the petition. Hazel, the waiting room is ready. I have another list.' },
    { who: 'hazel', text: 'A nurse, a vet, and a cherry tree outside. You have given me every reason to stay.' },
    { who: 'ada', text: 'Ellis will bring his fishing stories. Keep a chair by the window for him, Hazel.' },
  ] },
  // the end of chapter 1: the first harvest delivered to Ada
  { id: 'first-loaf', chapter: 1, when: s => (s.stats.ordersFilled ?? 0) > 0, lines: [
    { who: 'ada', text: 'Flour on my hands again! Ellis would laugh to see me.' },
    { who: 'ada', text: 'That is the first wheat this farm has sold in eleven years. Keep going, dear.' },
    { who: 'pip', text: 'Can we have bread for dinner? With jam?' },
  ] },
  // the Trans have moved in and the second cottage is the next project: the Okafors are the family that asks for it
  { id: 'okafors-coming', chapter: 3, when: s => s.projects.step >= step('cottage2') && arrivedFamilies(s) >= 1, lines: [
    { who: 'ada', text: 'The next family is Sam Okafor\'s! He delivered our post on a red bicycle when he was a boy.' },
    { who: 'ada', text: 'He has a vet for a wife now, and a daughter who reads everything.' },
    { who: 'pip', text: 'A girl? Does she like frogs? Bo has a frog.' },
  ] },
  // the five loaves for the Okafors' first week are delivered (always after Ada has said who they are)
  { id: 'welcome-bread', chapter: 3, when: s => !!s.story.beats?.includes('okafors-coming') && (s.projects.step > step('cottage2') || (s.projects.step === step('cottage2') && (s.projects.delivered?.bread ?? 0) >= 5)), lines: [
    { who: 'lan', text: 'Five loaves for the Okafors! I tied a ribbon round each one.' },
    { who: 'ada', text: 'That is how Hollowbrook used to welcome people. Bread on the doorstep.' },
    { who: 'pip', text: 'I ate the end of one. Just the end.' },
  ] },
];

// HUD buttons: build, orders, barn, projects, today, settings (turn and language are always there)
const ALL = ['build', 'orders', 'barn', 'projects', 'today'];
/** The first session in the restored village (PLAN-v0.3): things are there, the work is to bring them back. */
export const RESTORE_TUTORIAL = [
  { id: 'harvest', text: 'Welcome back to the farm, dear. Ellis sowed this wheat the week before he went upriver, and it has waited for you. When it turns golden, <b>tap</b> a bed and <b>harvest</b>.', hud: ['barn'], point: 'bed',
    done: s => s.stats.harvested > 0 },
  { id: 'order', text: 'I have an order for you. <b>Open</b> the order board and <b>deliver</b> my six wheat. My oven has been cold too long.', hud: ['barn', 'orders'], point: 'orders',
    done: s => s.stats.ordersFilled > 0 },
  { id: 'mill', text: 'Our old feed mill and coop are in a sorry state. <b>Tap</b> the feed mill and <b>repair</b> it, then the coop. Ellis built that coop from an old boat.', hud: ['barn', 'orders', 'projects'], point: 'mill',
    done: s => s.projects.step > 2 },
  { id: 'hens', text: '<b>Tap</b> the coop for your first hens. Mai from Lotus Farm next door is giving you two!', hud: ['build', 'orders', 'barn', 'projects'], point: 'coop',
    done: s => Object.values(s.animals).some(list => list.length > 0) },
  { id: 'feed', text: 'Hens eat chicken feed. <b>Make</b> some at the feed mill, then <b>tap</b> the coop to feed them. Pip will want to help.', hud: ['build', 'orders', 'barn', 'projects'], point: 'mill',
    done: s => Object.values(s.animals).flat().some(a => a.doneAt != null) || (s.barn.items.egg ?? 0) > 0 },
  { id: 'cottage', text: 'A family is looking for a home. <b>Tap</b> a run-down cottage in the village and <b>repair</b> it. Hollowbrook has waited a long time for this.', hud: ALL, point: 'cottage',
    done: s => workingCount(s, 'cottage') > 0 },
  { id: 'free', text: 'You are doing wonderfully, dear. The <b>Today</b> board shows what is ready each day. Hollowbrook is yours to bring back now.', hud: ALL, point: 'today',
    done: () => false, last: true },
];
/** The tutorial for this game: the restored village has its own. */
export const tutorialOf = s => (s?.mode === 'restore' ? RESTORE_TUTORIAL : TUTORIAL);
export const TUTORIAL = [
  { id: 'clear', text: 'First, a patch by the house. <b>Tap</b> the weeds, then <b>tap</b> the broom. Ellis hated weeds more than foxes.', hud: [], point: 'weeds',
    done: s => s.stats.cleared >= 3 },
  { id: 'path', text: 'A farm needs a path to the road. <b>Open</b> build mode and <b>lay</b> three path tiles. Ellis laid the old one stone by stone.', hud: ['build'], point: 'path',
    done: s => s.stats.paths >= 3 },
  { id: 'beds', text: 'Now <b>place</b> six crop beds on the cleared ground. They are free, dear. The soil remembers.', hud: ['build'], point: 'beds',
    done: s => (s.counts.bed ?? 0) >= 6 },
  { id: 'plant', text: '<b>Tap</b> a bed, <b>choose</b> wheat, then <b>drag</b> across the others to plant them all. Ellis could sow a straight row with his eyes shut.', hud: ['build'], point: 'bed',
    done: s => Object.keys(s.beds).length >= 6 || s.stats.harvested > 0 },
  { id: 'harvest', text: 'The first wheat always grows fast. When it turns golden, <b>tap</b> a bed and <b>harvest</b>.', hud: ['build', 'barn'], point: 'bed',
    done: s => s.stats.harvested > 0 },
  { id: 'order', text: 'I have an order for you. <b>Open</b> the order board and <b>deliver</b> my six wheat. My oven has been cold too long.', hud: ['build', 'barn', 'orders'], point: 'orders',
    done: s => s.stats.ordersFilled > 0 },
  { id: 'mill', text: 'Our first project: a feed mill and a coop. <b>Open</b> the projects and <b>follow</b> the steps. Ellis built our first coop from an old boat.', hud: ['build', 'barn', 'orders', 'projects'], point: 'projects',
    done: s => s.projects.step > 2 },
  { id: 'hens', text: '<b>Put</b> a fence with a gate around the coop, then <b>tap</b> the coop for your first hens. Mai from Lotus Farm next door is giving you two!', hud: ALL.filter(h => h !== 'today'), point: 'coop',
    done: s => Object.values(s.animals).some(list => list.length > 0) },
  { id: 'feed', text: 'Hens eat chicken feed. <b>Make</b> some at the feed mill, then <b>tap</b> the coop to feed them. Pip will want to help.', hud: ALL.filter(h => h !== 'today'), point: 'mill',
    done: s => Object.values(s.animals).flat().some(a => a.doneAt != null) || (s.barn.items.egg ?? 0) > 0 },
  { id: 'cottage', text: 'A family is looking for a home. <b>Build</b> the first cottage in the village, with a path to its door. Hollowbrook has waited a long time for this.', hud: ALL, point: 'projects',
    done: s => (s.counts.cottage ?? 0) > 0 },
  { id: 'free', text: 'You are doing wonderfully, dear. The <b>Today</b> board shows what is ready each day. Hollowbrook is yours to grow now.', hud: ALL, point: 'today',
    done: () => false, last: true },
];
