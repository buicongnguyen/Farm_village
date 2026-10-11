// Finite optional batches. Selectors are pure; accepting or reading never consumes goods or pays rewards.
import { CONTRACTS, PICNIC_MENU, CONTRACT_REQUIREMENTS, contractOf } from '../content/contracts.mjs';
import { BUILDINGS } from '../content/buildings.mjs';
import { CROPS, RECIPES, ANIMALS, GOODS } from '../content/goods.mjs';
import { recipeOpen } from './production.mjs';
import { isWorking } from './working.mjs';
import { normalizeExploration } from './exploration.mjs';
import * as barn from './barn.mjs';

const ids = CONTRACTS.map(request => request.id);
const record = v => v && typeof v === 'object' && !Array.isArray(v) ? v : {};
const stamp = v => Number.isSafeInteger(v) && v >= 0;
const has = (object, id) => Object.hasOwn(object, id);
export const newContracts = () => ({ active: null, completed: {}, retired: [], read: [] });

/** Old farms start at the first optional request. Loading never pays, consumes goods or invents an earned scene.
 * A later surviving completion retires lost earlier records, so importing a partial save cannot repeat their pay. */
export function normalizeContracts(s) {
  const saved = record(s.contracts), completed = {}, rawDone = record(saved.completed);
  for (const id of ids) {
    const at = stamp(rawDone[id]) ? rawDone[id] : s.firsts?.[`contract:${id}`];
    if (stamp(at)) completed[id] = at;
  }
  const retired = new Set(Array.isArray(saved.retired) ? saved.retired.filter(id => ids.includes(id)) : []);
  const lastDone = ids.reduce((last, id, i) => has(completed, id) || retired.has(id) ? i : last, -1);
  for (let i = 0; i <= lastDone; i++) if (!has(completed, ids[i])) retired.add(ids[i]);
  for (const id of Object.keys(completed)) retired.delete(id);
  const next = ids[lastDone + 1], active = record(saved.active);
  return { active: next && active.id === next && stamp(active.at) ? { id: next, at: active.at } : null,
    completed, retired: ids.filter(id => retired.has(id)), read: ids.filter(id => has(completed, id) && Array.isArray(saved.read) && saved.read.includes(id)) };
}

const working = (s, kind) => Object.entries(s.placed ?? {}).filter(([id, p]) => p.kind === kind && isWorking(s, id));
const introduced = (s, now) => (s.story?.chapter ?? 0) >= 3 && Object.values(s.homes ?? {}).some(h => h.family === 'tran' && h.arrived && h.arrivesAt <= now);

/** Account for shared stock once, already-paid queued output, and the real source of every remaining input. */
function requirements(s, need) {
  const pool = Object.fromEntries(Object.keys(GOODS).map(good => [good, barn.free(s, good)])), pending = {}, blockers = [];
  for (const [id, production] of Object.entries(s.production ?? {})) if (s.placed?.[id]) {
    for (const job of production.queue ?? []) if (RECIPES[job.recipe]) pending[job.recipe] = (pending[job.recipe] ?? 0) + RECIPES[job.recipe].makes;
  }
  // Feeding is already paid for. Its produce stays collectible even while the home is broken or being repaired.
  for (const [kind, animal] of Object.entries(ANIMALS)) for (const [id, placed] of Object.entries(s.placed ?? {})) if (placed.kind === animal.home) {
    const fed = (s.animals?.[id] ?? []).filter(a => a.kind === kind && a.doneAt != null).length;
    pending[animal.gives] = (pending[animal.gives] ?? 0) + fed;
  }
  // Incoming output first replaces any of that good still held for the current village project.
  const held = barn.held(s);
  for (const good of Object.keys(pending)) pending[good] = Math.max(0, pending[good] - Math.max(0, (held[good] ?? 0) - barn.stock(s, good)));
  const add = (kind, good, params, extra = {}) => {
    const key = `${kind}:${good}:${extra.building ?? ''}`;
    if (!blockers.some(item => item.key === key)) blockers.push({ key, kind, good, text: CONTRACT_REQUIREMENTS[kind], params, ...extra });
  };
  const want = (good, n, depth = 0) => {
    if (depth > 8) return;
    let use = Math.min(pool[good] ?? 0, n); pool[good] = (pool[good] ?? 0) - use; n -= use;
    use = Math.min(pending[good] ?? 0, n); pending[good] = (pending[good] ?? 0) - use; n -= use;
    if (n <= 0) return;
    const recipe = RECIPES[good];
    if (recipe) {
      if (!recipeOpen(s, good)) add('level', good, { level: recipe.level, good: GOODS[good].name });
      if (!working(s, recipe.at).length) add('maker', good, { building: BUILDINGS[recipe.at].name }, { building: recipe.at });
      const batches = Math.ceil(n / recipe.makes);
      for (const [input, amount] of Object.entries(recipe.needs)) want(input, amount * batches, depth + 1);
      pool[good] = (pool[good] ?? 0) + batches * recipe.makes - n;
      return;
    }
    if (CROPS[good]) {
      if (s.level < CROPS[good].level) add('level', good, { level: CROPS[good].level, good: GOODS[good].name });
      if (!working(s, 'bed').length) add('beds', good, { good: GOODS[good].name });
      return;
    }
    const entry = Object.entries(ANIMALS).find(([, animal]) => animal.gives === good);
    if (entry) {
      const [kind, animal] = entry, animals = working(s, animal.home).flatMap(([id]) => (s.animals?.[id] ?? []).filter(a => a.kind === kind));
      if (!animals.length) add('animal', good, {});
      // Already-fed output was consumed from the shared incoming pool above. Only residual demand needs more feed.
      want(animal.eats, n, depth + 1);
    }
  };
  for (const [good, n] of Object.entries(need)) want(good, n);
  return blockers;
}

/** A single sequential request, with honest prerequisites even when its maker was stored after acceptance. */
export function contractStatus(s, now = s.lastSeen ?? Date.now()) {
  const saved = normalizeContracts(s), index = CONTRACTS.findIndex(request => !has(saved.completed, request.id) && !saved.retired.includes(request.id));
  const next = CONTRACTS[index] ?? null, known = introduced(s, now), active = !!next && saved.active?.id === next.id;
  const blockers = next ? requirements(s, next.need) : [], ready = !!next && barn.hasAll(s, next.need);
  const ribbon = normalizeExploration(s).completedAt !== null;
  return { id: PICNIC_MENU.id, introduced: known, complete: !next, index, next, active,
    acceptedAt: active ? saved.active.at : null, completedCount: index < 0 ? CONTRACTS.length : index,
    blockers, ready, canAccept: known && !!next && !active && !blockers.length,
    canDeliver: known && active && ready, line: next ? ribbon && next.ribbonLine ? next.ribbonLine : next.line : null };
}

export function contractMemories(s) {
  const saved = normalizeContracts(s);
  return CONTRACTS.filter(request => has(saved.completed, request.id))
    .map(request => ({ ...request, at: saved.completed[request.id], read: saved.read.includes(request.id) }));
}
export const unreadContracts = s => contractMemories(s).filter(memory => !memory.read).length;

export const actions = {
  acceptContract(ctx, { id }) {
    const status = contractStatus(ctx.s, ctx.now);
    if (!stamp(ctx.now) || !contractOf(id) || status.next?.id !== id) return ctx.fail('This picnic request is not available');
    if (status.active) return ctx.fail('This picnic request is already accepted');
    if (!status.introduced) return ctx.fail('Meet the first family before planning this picnic');
    if (!status.canAccept) return ctx.fail('Check the picnic ingredients and their sources first');
    const saved = normalizeContracts(ctx.s); saved.active = { id, at: ctx.now }; ctx.s.contracts = saved;
    ctx.emit('contractAccepted', { id }); return { id };
  },
  deliverContract(ctx, { id }) {
    const status = contractStatus(ctx.s, ctx.now), request = contractOf(id);
    if (!stamp(ctx.now) || !request || status.next?.id !== id || !status.active) return ctx.fail('Accept this picnic request before delivering');
    if (!status.introduced) return ctx.fail('Meet the first family before planning this picnic');
    if (!status.ready) return ctx.fail('Keep the village project goods and finish this picnic batch');
    const saved = normalizeContracts(ctx.s);
    // All checks precede the first mutation. Delivery is one transaction, including its durable replay guard.
    barn.take(ctx.s, request.need);
    saved.completed[id] = ctx.now; saved.active = null; ctx.s.contracts = saved;
    if (!stamp((ctx.s.firsts ??= {})[`contract:${id}`])) ctx.s.firsts[`contract:${id}`] = ctx.now;
    ctx.s.coins += request.coins; ctx.s.stats.coinsEarned += request.coins;
    ctx.emit('contractDelivered', { id, coins: request.coins, person: request.person });
    ctx.emit('coins', { coins: request.coins, source: 'contract', id }); return { id, coins: request.coins };
  },
  readContract(ctx, { id }) {
    const saved = normalizeContracts(ctx.s);
    if (!contractOf(id) || !has(saved.completed, id)) return ctx.fail('This picnic memory has not happened yet');
    if (!saved.read.includes(id)) { saved.read.push(id); ctx.s.contracts = saved; }
    return { id, read: true };
  },
};
