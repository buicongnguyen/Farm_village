// Read-only ingredient guidance. These facts describe existing actions; navigation never performs them.
import { GOODS, CROPS, FRUITS, RECIPES, ANIMALS } from '../content/goods.mjs';
import { BUILDINGS } from '../content/buildings.mjs';
import { SLOTS } from '../content/economy.mjs';
import { currentStep, mayBuild } from './projects.mjs';
import { recipeOpen } from './production.mjs';
import { isWorking, isRepairing } from './working.mjs';
import { repairCost } from './condition.mjs';
import { placementPrice } from './build.mjs';
import { plantPrice } from './farm.mjs';
import { animalPrice } from './animals.mjs';
import { giftable, personOf } from './bonds.mjs';
import { dayKey } from './clock.mjs';
import * as barn from './barn.mjs';

const own = (table, id) => typeof id === 'string' && Object.hasOwn(table, id);
const makers = (s, kind) => Object.keys(s.placed).filter(id => s.placed[id].kind === kind);
const queue = (s, id) => s.production?.[id]?.queue ?? [];
const stock = (s, good, needed, honourHold = true) => {
  const have = barn.stock(s, good), free = barn.free(s, good, honourHold);
  return { good, needed, stock: have, free, held: Math.max(0, have - free), missing: Math.max(0, needed - free) };
};
const buildingTarget = (id, kind, extra = {}) => ({ kind: 'building', id, buildingKind: kind, ...extra });
function missingMaker(s, kind) {
  const def = BUILDINGS[kind], may = mayBuild(s, kind);
  const locked = s.level < def.level ? { reason: 'Reach level {level} first', params: { level: def.level } } : !may.ok ? may : {};
  return { status: 'build', at: kind, cost: placementPrice(s, kind), ...locked, target: { kind: 'catalogue', buildingKind: kind } };
}
function repair(s, id, kind) {
  const may = mayBuild(s, kind, { repair: true });
  return { status: isRepairing(s, id) ? 'repairing' : 'repair', at: kind, cost: repairCost(s, id),
    ...(!may.ok && !isRepairing(s, id) ? { reason: may.reason, params: may.params } : {}),
    target: buildingTarget(id, kind, { repair: true }) };
}

function recipeSource(s, good, now, missing) {
  const recipe = RECIPES[good], ids = makers(s, recipe.at);
  const jobs = ids.flatMap(id => {
    let spaceNeeded = 0;
    return queue(s, id).map(job => {
      spaceNeeded += RECIPES[job.recipe].makes;
      return { id, ...job, spaceNeeded };
    }).filter(job => job.recipe === good);
  });
  const ready = jobs.filter(j => j.doneAt <= now), waiting = jobs.filter(j => j.doneAt > now);
  const counts = { ready: ready.length * recipe.makes, queued: waiting.length * recipe.makes };
  const ingredients = Object.entries(recipe.needs).map(([g, n]) => stock(s, g, n));
  const base = { type: 'recipe', at: recipe.at, makes: recipe.makes, duration: recipe.timeMs, ingredients, ...counts };
  // Finished output can be collected even if the building subsequently broke or the recipe was learned early.
  if (ready.length) {
    // Collection takes the queue in order, including earlier batches of a different recipe.
    const collectable = ready.find(job => barn.space(s) >= job.spaceNeeded), job = collectable ?? ready[0];
    return { ...base, status: collectable ? 'ready' : 'barn-full', spaceNeeded: job.spaceNeeded,
      target: buildingTarget(job.id, recipe.at, { panel: 'production' }) };
  }
  if (waiting.length && counts.queued >= Math.max(1, missing)) return { ...base, status: 'waiting',
    target: buildingTarget(waiting[0].id, recipe.at, { panel: 'production' }) };
  if (!recipeOpen(s, good)) return { ...base, status: 'level', level: recipe.level,
    target: ids.length ? buildingTarget(ids[0], recipe.at, { panel: 'production' }) : { kind: 'catalogue', buildingKind: recipe.at } };
  if (!ids.length) return { ...base, ...missingMaker(s, recipe.at) };
  const working = ids.filter(id => isWorking(s, id));
  if (!working.length) return { ...base, ...repair(s, ids[0], recipe.at) };
  const id = working.find(id => queue(s, id).length < (s.production?.[id]?.slots ?? SLOTS.start));
  return { ...base, status: !id ? 'queue-full' : ingredients.some(i => i.missing) ? 'ingredients' : 'make',
    target: buildingTarget(id ?? working[0], recipe.at, { panel: 'production' }) };
}

function cropSource(s, good, now, missing) {
  const crop = CROPS[good], beds = makers(s, 'bed'), planted = beds.filter(id => s.beds[id]?.crop === good);
  const ready = planted.filter(id => s.beds[id].doneAt <= now), growing = planted.filter(id => s.beds[id].doneAt > now);
  const empty = beds.filter(id => !s.beds[id]);
  const seed = crop.free ? 'free' : barn.stock(s, good) > 0 ? 'stock' : 'coins', cost = plantPrice(s, good);
  const target = { kind: 'farm', id: ready[0] ?? empty[0] ?? growing[0] ?? beds[0] ?? null };
  const base = { type: 'crop', at: 'bed', seed, cost, ready: ready.length * 2, queued: growing.length * 2, target };
  if (ready.length) return { ...base, status: 'ready' };
  if (crop.level > s.level) return { ...base, status: 'level', level: crop.level };
  if (growing.length * 2 >= Math.max(1, missing)) return { ...base, status: 'waiting', target: { kind: 'farm', id: growing[0] } };
  if (!beds.length) return { ...base, ...missingMaker(s, 'bed') };
  if (!empty.length) return { ...base, status: growing.length ? 'waiting' : 'beds-full' };
  return { ...base, status: cost > s.coins ? 'seed-coins' : 'plant' };
}

function fruitSource(s, good, now) {
  const fruit = FRUITS[good], ids = makers(s, fruit.tree).filter(id => s.trees?.[id]);
  const ready = ids.filter(id => s.trees[id].doneAt <= now);
  const base = { type: 'fruit', at: fruit.tree, ready: ready.length * fruit.yield, queued: (ids.length - ready.length) * fruit.yield };
  // Picking ripe fruit is allowed by the tree rules regardless of condition; do not invent a repair gate.
  if (ids.length) return { ...base, status: ready.length ? 'ready' : 'waiting', target: buildingTarget(ready[0] ?? ids[0], fruit.tree) };
  return { ...base, ...missingMaker(s, fruit.tree) };
}

function animalSource(s, good, now) {
  const [kind, animal] = Object.entries(ANIMALS).find(([, a]) => a.gives === good);
  const ids = makers(s, animal.home), animals = ids.flatMap(id => (s.animals?.[id] ?? []).filter(a => a.kind === kind).map(a => ({ id, ...a })));
  const ready = animals.filter(a => a.doneAt != null && a.doneAt <= now), busy = animals.filter(a => a.doneAt > now);
  const base = { type: 'animal', at: animal.home, animal: kind, feed: animal.eats, ready: ready.length, queued: busy.length };
  if (ready.length) return { ...base, status: 'ready', target: buildingTarget(ready[0].id, animal.home) };
  if (busy.length) return { ...base, status: 'waiting', target: buildingTarget(busy[0].id, animal.home) };
  if (!ids.length) return { ...base, ...missingMaker(s, animal.home) };
  const working = ids.find(id => isWorking(s, id));
  if (!working) return { ...base, ...repair(s, ids[0], animal.home) };
  const hungry = animals.find(a => a.doneAt == null && isWorking(s, a.id));
  if (hungry) return { ...base, status: 'feed', ingredients: [stock(s, animal.eats, 1, false)], target: buildingTarget(hungry.id, animal.home) };
  return { ...base, status: 'animal', cost: animalPrice(s, kind), level: animal.level, target: buildingTarget(working, animal.home) };
}

function usesOf(s, good, now) {
  const uses = [{ kind: 'sale', price: GOODS[good].value, available: barn.free(s, good) > 0 }];
  const orders = (s.orders?.cards ?? []).filter(order => order.need?.[good] > 0);
  if (orders.length) uses.push({ kind: 'orders', count: orders.length, needed: orders.reduce((n, o) => n + o.need[good], 0) });
  const step = currentStep(s), projectNeed = Math.max(0, (step?.deliver?.[good] ?? 0) - (s.projects.delivered[good] ?? 0));
  if (projectNeed) uses.push({ kind: 'project', name: step.name, needed: projectNeed });
  for (const [id, r] of Object.entries(RECIPES)) if (r.needs[good] && recipeOpen(s, id)) uses.push({ kind: 'recipe', good: id,
    needed: r.needs[good], available: makers(s, r.at).some(id => isWorking(s, id) && queue(s, id).length < (s.production?.[id]?.slots ?? SLOTS.start)) && barn.hasAll(s, r.needs) });
  if (CROPS[good] && !CROPS[good].free && CROPS[good].level <= s.level) uses.push({ kind: 'seed' });
  const liked = giftable(s, now).filter(id => personOf(id)?.likes?.includes(good) && s.people[id]?.giftDay !== dayKey(now));
  if (liked.length) uses.push({ kind: 'gift', count: liked.length });
  for (const [id, a] of Object.entries(ANIMALS)) if (a.eats === good && makers(s, a.home).some(home =>
    isWorking(s, home) && (s.animals?.[home] ?? []).some(an => an.kind === id && an.doneAt == null))) uses.push({ kind: 'feed', animal: id });
  return uses;
}

/** No state is initialized or mutated. Counts describe this request and one recipe batch, never speculative future work. */
export function goodHelp(s, good, now = s.lastSeen, { needed = 1 } = {}) {
  if (!own(GOODS, good)) return null;
  needed = Number.isFinite(needed) && needed > 0 ? Math.ceil(needed) : 1;
  const inventory = stock(s, good, needed);
  // Incoming output first fills any current reservation not yet covered by stock.
  const incomingNeed = inventory.missing + Math.max(0, (barn.held(s)[good] ?? 0) - inventory.stock);
  const source = own(RECIPES, good) ? recipeSource(s, good, now, incomingNeed)
    : own(CROPS, good) ? cropSource(s, good, now, incomingNeed) : own(FRUITS, good) ? fruitSource(s, good, now)
      : GOODS[good].kind === 'produce' ? animalSource(s, good, now)
        : { type: 'fish', status: s.fishing?.line ? s.fishing.line.doneAt <= now ? 'fish-ready' : 'fish-waiting' : 'fish',
          ready: 0, queued: 0, target: { kind: 'pond' } };
  return { ...inventory, source, uses: usesOf(s, good, now) };
}

/** Recompute at follow-time so a removed maker never becomes a stale action. These are navigation descriptors only. */
export const goodHelpTarget = (s, good, now = s.lastSeen, options) => goodHelp(s, good, now, options)?.source.target ?? null;
