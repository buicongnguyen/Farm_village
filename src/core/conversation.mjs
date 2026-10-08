// Read-only dialogue choices. Views own session chatter history; only act()/tick() may change saved game state.
import { allPeople, VILLAGERS, JUNE_TIPS } from '../content/people.mjs';
import { PIP_LINES } from '../content/chatter.mjs';
import { ANIMALS, RECIPES } from '../content/goods.mjs';
import { SLOTS } from '../content/economy.mjs';
import { isWorking, workingCount } from './working.mjs';
import { currentStep } from './projects.mjs';
import { recipeOpen } from './production.mjs';
import { canFill } from './orders.mjs';
import * as barn from './barn.mjs';

/** A person's introduction appropriate to the village they can actually see. */
export function conversationLine(s, id) {
  const person = allPeople().find(p => p.id === id);
  if (!person) return null;
  const context = person.contextLines?.find(c => workingCount(s, c.when) > 0);
  return { key: context?.when ?? 'intro', text: context?.text ?? person.line };
}

/** Useful things that can be done now, in priority order. Never initializes queues or spends reserved goods. */
export function juneTopics(s, now) {
  const topics = [], add = key => topics.push({ key, text: JUNE_TIPS[key] });
  const available = (id, kind) => !!s.placed[id] && s.placed[id].kind === kind && isWorking(s, id);
  const animals = Object.entries(s.animals).flatMap(([home, list]) => list.filter(animal => available(home, ANIMALS[animal.kind]?.home)).map(animal => ({ home, animal })));
  const hungry = animals.filter(({ animal }) => animal.doneAt == null);
  if (Object.entries(s.beds).some(([id, b]) => available(id, 'bed') && b.doneAt <= now)) add('harvest');
  if (animals.some(({ animal }) => animal.doneAt != null && animal.doneAt <= now)) add('collect');
  if (Object.entries(s.production).some(([id, q]) => {
    const job = q.queue[0], recipe = RECIPES[job?.recipe];
    return recipe && available(id, recipe.at) && job.doneAt <= now && barn.space(s) >= recipe.makes;
  })) add('products');
  if (hungry.some(({ animal }) => barn.stock(s, ANIMALS[animal.kind].eats) > 0)) add('feed');
  const feedKinds = [...new Set(hungry.map(({ animal }) => ANIMALS[animal.kind].eats))].filter(id => !barn.stock(s, id));
  const canMakeFeed = feedKinds.some(id => {
    const recipe = RECIPES[id];
    if (!recipeOpen(s, id) || !barn.hasAll(s, recipe.needs)) return false;
    // Feed already in a queue is on its way; suggest collecting it when ready instead of making more.
    if (Object.entries(s.production).some(([building, q]) => available(building, recipe.at) && q.queue.some(j => j.recipe === id))) return false;
    return Object.entries(s.placed).some(([building, p]) => {
      const q = s.production[building];
      return p.kind === recipe.at && isWorking(s, building) && (q?.queue.length ?? 0) < (q?.slots ?? SLOTS.start);
    });
  });
  if (canMakeFeed) add('makeFeed');
  if (Object.keys(s.placed).some(id => available(id, 'bed') && !s.beds[id])) add('plant');
  if (s.orders.cards.some(card => canFill(s, card))) add('orders');
  if (currentStep(s)) add('project');
  return topics;
}

/** Avoid the last session topic where another true one is available. A quiet village also permits a quiet moment. */
export function juneAdvice(s, now, previousKey = null) {
  const topics = juneTopics(s, now);
  return topics.find(topic => topic.key !== previousKey) ?? topics[0] ?? { key: 'rest', text: VILLAGERS.find(p => p.id === 'june').tip };
}

/** Match Pip's reactions to the actual animal/good; Cloud and Drizzle belong to the first two hens even after reload. */
export function pipReactionLines(s, event, first = false) {
  const says = VILLAGERS.find(p => p.id === 'pip').says[event.type];
  if (event.type === 'animalArrived') {
    if (event.kind !== 'hen') return PIP_LINES.animalArrived;
    const hens = Object.values(s.animals).flat().filter(a => a.kind === 'hen').length;
    return [hens === 1 ? says.first : hens === 2 ? says.lines[0] : says.lines[1]];
  }
  if (event.type === 'collected' && event.good !== 'egg') return PIP_LINES.collected;
  if (first && says?.first) return [says.first];
  return says?.lines ?? PIP_LINES[event.type] ?? [];
}
