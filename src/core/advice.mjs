// Suggestions are derived from current facts. Only acknowledgements and earned celebrations are saved.
// No advice action delivers goods, spends money, or awards a second payment for an achievement.
import { ADVICE_TOPICS } from '../content/advice.mjs';
import { GOODS, RECIPES, FRUITS } from '../content/goods.mjs';
import { BUILDINGS } from '../content/buildings.mjs';
import { STEPS } from '../content/projects.mjs';
import { SLOTS, FRUIT_STAND, DEMOLISH } from '../content/economy.mjs';
import { N } from '../content/world.mjs';
import { tutorialOf } from '../content/story.mjs';
import { mayBuild, projectCost } from './projects.mjs';
import { recipeOpen, collectableJobs } from './production.mjs';
import { isWorking } from './working.mjs';
import { canPlace, doorCell, roadReach } from './grid.mjs';

import { newAdvice, normalizeAdvice, ADVICE_CELEBRATIONS as celebrations } from './advice-state.mjs';
export { newAdvice, normalizeAdvice };
const amount = value => Number.isFinite(value) && value > 0 ? value : 0;
const keyOf = card => `${card.id}:${card.context}`;
const own = (o, k) => Object.hasOwn(o, k);
const stock = (s, good) => amount(s.barn?.items?.[good]);
const queue = (s, building) => s.production?.[building]?.queue ?? [];
const makers = (s, kind) => Object.entries(s.placed ?? {}).filter(([, p]) => p.kind === kind);
const topic = (id, context, params, target) => ({ id, context, ...ADVICE_TOPICS[id], params, target });

/** Remaining current-project goods are protected even before its level/family gate opens. */
function projectNeeds(s) {
  const out = {}, step = STEPS[s.projects?.step];
  for (const [good, count] of Object.entries(step?.deliver ?? {})) out[good] = Math.max(0, count - amount(s.projects?.delivered?.[good]));
  return out;
}
function queued(s, good, now = Infinity) {
  let n = 0;
  for (const [id, q] of Object.entries(s.production ?? {})) if (s.placed?.[id]) {
    for (const job of q.queue ?? []) if (job.recipe === good && job.doneAt <= now) n += RECIPES[good]?.makes ?? 0;
  }
  return n;
}
const available = (s, good, held) => Math.max(0, stock(s, good) - (held[good] ?? 0));
const incoming = (s, good, held, now = Infinity) => Math.max(0, queued(s, good, now) - Math.max(0, (held[good] ?? 0) - stock(s, good)));

/** Direct commitments plus ingredients still needed for requested products. Queued jobs already paid their inputs. */
function commitments(s, held) {
  const need = { ...held };
  for (const order of s.orders?.cards ?? []) for (const [g, n] of Object.entries(order.need ?? {})) need[g] = (need[g] ?? 0) + amount(n);
  // Current recipes form a two-level acyclic graph (finished products, feeds, raw goods).
  const expand = (good, desired, depth = 0) => {
    const r = RECIPES[good]; if (!r || depth > 4) return;
    const missing = Math.max(0, desired - stock(s, good) - queued(s, good)), batches = Math.ceil(missing / r.makes);
    if (!batches) return;
    for (const [input, n] of Object.entries(r.needs)) { need[input] = (need[input] ?? 0) + n * batches; expand(input, n * batches, depth + 1); }
  };
  for (const [good, n] of Object.entries({ ...need })) expand(good, n);
  return need;
}

function orderSuggestion(s, now, held, reserved, order) {
  const orders = [order].filter(o => o && typeof o.id === 'string' && Object.keys(o.need ?? {}).length);
  const ready = orders.filter(o => Object.entries(o.need).every(([g, n]) => amount(n) > 0 && available(s, g, held) >= n))
    .sort((a, b) => amount(b.coins) - amount(a.coins) || a.id.localeCompare(b.id))[0];
  if (ready) return topic('order-ready', `order/${ready.id}`, { coins: ready.coins }, { kind: 'order', id: ready.id });
  const breadSpare = stock(s, 'bread') + queued(s, 'bread') - (reserved.bread ?? 0) >= 3;
  const candidates = [];
  for (const o of orders) for (const [good, count] of Object.entries(o.need)) {
    const missing = count - available(s, good, held); if (missing <= 0) continue;
    candidates.push({ o, good, count: missing, priority: breadSpare && good !== 'bread' && RECIPES[good] ? 0 : RECIPES[good] ? 1 : 2 });
  }
  candidates.sort((a, b) => a.priority - b.priority || a.count - b.count || a.o.id.localeCompare(b.o.id));
  // If one requested product is already queued, first show a different actual blocker for the same request.
  const unqueued = candidates.filter(c => incoming(s, c.good, held) < c.count);
  const candidate = unqueued[0] ?? candidates[0]; if (!candidate) return null;
  const { o, good, count } = candidate, r = RECIPES[good], context = `order/${o.id}/${good}`;
  const params = { good: GOODS[good]?.name ?? good, count }, target = { kind: 'order', id: o.id, good };
  if (r && incoming(s, good, held) >= count) {
    const readyAt = makers(s, r.at).find(([id]) => collectableJobs(s, id, now).some(j => j.recipe === good));
    const room = Math.max(0, amount(s.barn?.cap) - Object.values(s.barn?.items ?? {}).reduce((a, n) => a + amount(n), 0));
    if (readyAt && incoming(s, good, held, now) > 0 && room >= r.makes)
      return topic('order-collect', context, params, { kind: 'building', id: readyAt[0], good });
    return topic('order-queued', context, params, target);
  }
  if (!r) return topic('order-gather', context, params, target);
  if (!recipeOpen(s, good)) return topic('order-unlock', context, { ...params, level: r.level }, target);
  const places = makers(s, r.at), working = places.filter(([id]) => isWorking(s, id));
  if (!working.length) {
    if (places.length) return topic('maker-broken', `${context}/${places[0][0]}`, { ...params, building: BUILDINGS[r.at].name }, { kind: 'building', id: places[0][0], good });
    // The order can remain after its maker was stored. Its real missing requirement is the building, not a fictional repair.
    return topic('maker-missing', `${context}/${r.at}`, { ...params, building: BUILDINGS[r.at].name }, { kind: 'catalogue', buildingKind: r.at, good });
  }
  const missingInput = Object.entries(r.needs).find(([g, n]) => available(s, g, held) < n);
  if (missingInput) return topic('order-ingredient', `${context}/${missingInput[0]}`, { ...params, ingredient: GOODS[missingInput[0]].name }, target);
  const open = working.find(([id]) => queue(s, id).length < (s.production?.[id]?.slots ?? SLOTS.start));
  if (!open) {
    const expandable = working.find(([id]) => { const slots = s.production?.[id]?.slots ?? SLOTS.start; return slots < SLOTS.max && SLOTS.cost[slots] != null && s.coins >= SLOTS.cost[slots]; });
    if (expandable) { const id = expandable[0], slots = s.production?.[id]?.slots ?? SLOTS.start;
      return topic('queue-full', `${context}/${id}/${slots}`, { ...params, building: BUILDINGS[r.at].name, cost: SLOTS.cost[slots] }, { kind: 'building', id, good }); }
    return null; // A full queue without an affordable extra slot is not an available investment.
  }
  return topic(breadSpare && good !== 'bread' ? 'order-bread-surplus' : 'order-make', context, params, { kind: 'building', id: open[0], good });
}

function standSpot(s) {
  // Every legal stand must have a road-connected door. Search those cells, not the whole map.
  for (const cell of roadReach(s)) for (let rot = 0; rot < 4; rot++) {
    const [dx, dz] = doorCell('fruit_stand', 0, 0, rot), x = cell % N - dx, z = Math.floor(cell / N) - dz;
    if (canPlace(s, 'fruit_stand', x, z, rot).ok) return { x, z, rot };
  }
  return null;
}
function candidates(s, now) {
  if (!(s.stats?.harvested > 0) && (s.story?.tutorial ?? 0) < tutorialOf(s).length) return [];
  const held = projectNeeds(s), reserved = commitments(s, held), result = [];
  // Keep every still-eligible order available for restoring a deferral or revalidating an open card.
  // The public list groups these into one best current order, so the board does not crowd out other activities.
  const rank = { 'order-ready': 0, 'order-collect': 1, 'order-bread-surplus': 2, 'order-make': 3, 'order-queued': 5 };
  const orders = (s.orders?.cards ?? []).map(o => orderSuggestion(s, now, held, reserved, o)).filter(Boolean)
    .sort((a, b) => (rank[a.id] ?? 4) - (rank[b.id] ?? 4) || amount(b.params.coins) - amount(a.params.coins)
      || amount(a.params.count) - amount(b.params.count) || a.context.localeCompare(b.context));
  result.push(...orders);
  const stand = makers(s, 'fruit_stand').find(([id]) => isWorking(s, id));
  const takings = amount(s.fruitStand?.coins);
  if (takings) result.push(topic('stand-collect', stand ? `building/${stand[0]}` : 'fruit-stand', { coins: takings }, { kind: stand ? 'building' : 'fruit-stand', id: stand?.[0] }));
  const fruit = Object.keys(FRUITS).find(g => stock(s, g) - (reserved[g] ?? 0) >= 3);
  if (stand && fruit && !(s.fruitStand?.items?.length)) result.push(topic('stand-empty', `building/${stand[0]}/${fruit}`, { good: GOODS[fruit].name }, { kind: 'building', id: stand[0], good: fruit }));
  if (!stand && !makers(s, 'fruit_stand').length && fruit && s.level >= BUILDINGS.fruit_stand.level && mayBuild(s, 'fruit_stand', { now }).ok) {
    const base = BUILDINGS.fruit_stand.cost + projectCost(s, 'fruit_stand');
    const cost = (s.stored?.fruit_stand ?? 0) > 0 ? 0 : (s.rebuild?.fruit_stand ?? 0) > 0 ? Math.round(base * DEMOLISH.rebuild) : base;
    if (s.coins >= cost) {
      const spot = standSpot(s);
      if (spot) { const extra = Math.round(FRUITS[fruit].value * FRUIT_STAND.bonus) - FRUITS[fruit].value;
        result.push(topic('stand-invest', 'fruit-stand', { cost, good: GOODS[fruit].name, extra, sales: Math.ceil(cost / extra) }, { kind: 'catalogue', buildingKind: 'fruit_stand', ...spot })); }
    }
  }
  // The village pond is always accessible, and an unbaited cast is free even with a full barn (fish sell overflow).
  if (!s.fishing?.line) result.push(topic('fishing-break', 'pond', {}, { kind: 'pond' }));
  return result;
}

/** Earned memories remain available after a building is moved/stored; never invent a live target. */
export function earnedCelebrations(s) {
  const saved = normalizeAdvice(s), present = [];
  for (const id of celebrations) if (own(saved.celebrated, id)) {
    if (id === 'school-open' && (s.story?.chapter ?? 0) < 4) continue;
    if (id === 'clinic-open' && (s.story?.chapter ?? 0) < 5) continue;
    const idAt = id === 'first-bread' ? null : makers(s, id === 'school-open' ? 'school' : 'clinic').find(([id]) => isWorking(s, id))?.[0];
    present.push({ ...topic(id, 'earned', {}, idAt ? { kind: 'building', id: idAt } : { kind: 'album' }), at: saved.celebrated[id],
      read: saved.read.includes(`${id}:earned`), deferred: saved.deferred.includes(`${id}:earned`) });
  }
  return present;
}
/** Up to three current suggestions plus bounded celebration memories. Deferred cards are extra only when requested. */
export function adviceCards(s, now = s.lastSeen ?? Date.now(), { includeDeferred = false } = {}) {
  const saved = normalizeAdvice(s), current = candidates(s, now).map(card => ({ ...card,
    read: saved.read.includes(keyOf(card)), deferred: saved.deferred.includes(keyOf(card)) }));
  const visible = [], groups = new Set();
  for (const card of current) {
    const group = card.context.startsWith('order/') ? 'order' : card.id;
    if (card.deferred || groups.has(group)) continue;
    visible.push(card); groups.add(group); if (visible.length === 3) break;
  }
  return [...visible, ...(includeDeferred ? current.filter(card => card.deferred) : []),
    ...earnedCelebrations(s).filter(card => includeDeferred || !card.deferred)];
}
export const unreadAdvice = (s, now) => adviceCards(s, now).filter(card => !card.read).length;
/** Full current lookup, including a deferred card that sits outside the three visible suggestions. */
export function adviceOf(s, id, context, now = s.lastSeen ?? Date.now(), { includeDeferred = false } = {}) {
  const saved = normalizeAdvice(s), card = [...candidates(s, now), ...earnedCelebrations(s)].find(c => c.id === id && c.context === context);
  if (!card) return null;
  const deferred = saved.deferred.includes(keyOf(card));
  return deferred && !includeDeferred ? null : { ...card, read: saved.read.includes(keyOf(card)), deferred };
}

/** Run after successful actions/ticks and their normal memory stamps. The pre-action baseline distinguishes legacy saves. */
export function afterAdvice(ctx) {
  const saved = ctx.s.advice ? normalizeAdvice(ctx.s) : ctx.adviceBefore ?? normalizeAdvice(ctx.s);
  for (const id of celebrations) {
    const earned = id === 'first-bread' ? ctx.events.some(e => e.type === 'produced' && e.good === 'bread')
      : ctx.events.some(e => e.type === 'projectDone' && e.id === (id === 'school-open' ? 'school' : 'clinic'));
    if (!earned || own(saved.celebrated, id) || saved.retired.includes(id)) continue;
    saved.celebrated[id] = ctx.now;
    (ctx.s.firsts ??= {})[`advice:${id}`] ??= ctx.now;
    ctx.emit('adviceEarned', { id });
  }
  ctx.s.advice = saved;
}

export const actions = {
  readAdvice(ctx, { id, context }) {
    const card = adviceOf(ctx.s, id, context, ctx.now);
    if (!card) return ctx.fail('This suggestion has changed');
    const saved = ctx.adviceBefore ?? normalizeAdvice(ctx.s), key = keyOf(card);
    if (!saved.read.includes(key)) saved.read.push(key);
    ctx.s.advice = saved; return { id, context, read: true, card: { ...card, read: true } };
  },
  deferAdvice(ctx, { id, context }) {
    const card = adviceOf(ctx.s, id, context, ctx.now);
    if (!card) return ctx.fail('This suggestion has changed');
    const saved = ctx.adviceBefore ?? normalizeAdvice(ctx.s), key = keyOf(card);
    if (!saved.deferred.includes(key)) saved.deferred.push(key);
    if (!saved.read.includes(key)) saved.read.push(key);
    ctx.s.advice = saved; return { id, context, deferred: true };
  },
  restoreAdvice(ctx, { id, context }) {
    const card = adviceOf(ctx.s, id, context, ctx.now, { includeDeferred: true });
    if (!card?.deferred) return ctx.fail('This suggestion has changed');
    const saved = ctx.adviceBefore ?? normalizeAdvice(ctx.s), key = keyOf(card);
    saved.deferred = saved.deferred.filter(k => k !== key);
    ctx.s.advice = saved; return { id, context, read: saved.read.includes(key), deferred: false };
  },
};

