// The valley (chapter 11, docs/plan/ch11-the-man-from-the-city.md): how beautiful it is, and the one real choice of the
// story. Mr Albright offers to build a cannery on the meadow by the brook (fast money, the meadow gone); the player may
// take it or keep the meadow (wildflowers, bees and honey). The answer is given once and stands: s.story.albright.
// Beauty is counted from what stands in the valley; it pays a little on every order now and brings guests later.
import { BEAUTY, VALLEY, HOTEL, RIVERSIDE, RENT, PARCELS } from '../content/economy.mjs';
import { GOODS, ANIMALS } from '../content/goods.mjs';
import { VALUE_TITLES } from '../content/journey.mjs';
import { GREEN_GOALS } from '../content/valley.mjs';
import { FAMILIES, VILLAGERS, NEIGHBOURS, hasArrived } from '../content/people.mjs';
import { BUILDINGS } from '../content/buildings.mjs';
import { SITES } from '../content/world.mjs';
import { isWorking } from './working.mjs';
import * as grid from './grid.mjs';

const TREES = new Set(['round_tree', 'willow', 'pine_tree', 'tree', 'bush']);
/** The valley's beauty: { score, rank, parts: { trees, flowers, water, care, industry, meadow, goals } }. Pure and cheap (a count). */
export function beautyOf(s) {
  let trees = 0, flowers = 0, garden = 0, ponds = 0, worn = 0, works = 0, hives = 0, cannery = false, dock = false;
  for (const [id, p] of Object.entries(s.placed ?? {})) {
    const def = BUILDINGS[p.kind]; if (!def) continue;
    if (def.fruit || TREES.has(p.kind)) trees += BEAUTY.tree;
    else if (def.garden) garden += BEAUTY.garden;
    else if (def.cat === 'charm') flowers += def.charm ?? 1;
    if (p.kind === 'pond') ponds++; else if (p.kind === 'dock') dock = true; else if (p.kind === 'beehive') hives++; else if (p.kind === 'cannery') cannery = true;
    if ((s.cond?.[id]?.level ?? 0) >= 1) worn++;
    if (def.produces && !BEAUTY.quiet.includes(p.kind) && p.kind !== 'cannery' && isWorking(s, id)) works++;
  }
  const parts = {
    trees: Math.min(BEAUTY.cap.trees, trees),
    flowers: Math.min(BEAUTY.cap.flowers, Math.round(flowers + garden)),
    water: Math.min(2, ponds) * BEAUTY.pond + (dock ? BEAUTY.dock : 0) + (s.firsts?.sluice ? BEAUTY.sluice : 0) + (s.upriver?.stops?.includes('spring') ? BEAUTY.spring : 0),   // the spring, once it has been walked to (chapter 16)
    care: -Math.min(BEAUTY.cap.care, worn * BEAUTY.worn),
    industry: -Math.min(BEAUTY.cap.industry, works * BEAUTY.works) - (cannery && !s.valley?.green ? BEAUTY.cannery : 0),
    meadow: (s.story?.albright === 'meadow' ? BEAUTY.meadow : 0) + Math.min(BEAUTY.cap.hives, hives * BEAUTY.hive),
    goals: Object.keys(s.valley?.goals ?? {}).filter(id => GREEN_GOALS.some(g => g.id === id)).length * BEAUTY.goal,   // green goals reached (chapter 19): for good
  };
  const score = Math.max(0, Object.values(parts).reduce((a, b) => a + b, 0));
  return { score, rank: beautyRank(score), parts };
}
/** 0..4: Bare, Pleasant, Pretty, Lovely, Postcard (BEAUTY.ranks holds the scores they start at). */
export const beautyRank = score => BEAUTY.ranks.reduce((rank, at, i) => score >= at ? i : rank, 0);
export const RANK_NAMES = ['Bare', 'Pleasant', 'Pretty', 'Lovely', 'A picture postcard'];
/** What an order pays extra for the valley's beauty: BEAUTY.order per rank (0.02 = 2 %). */
export const beautyBonus = s => beautyOf(s).rank * BEAUTY.order;
/** What would raise the beauty most, as an id for the Valley panel: 'care' | 'trees' | 'flowers' | 'water' | 'green' | null. */
export function beautyTip(s) {
  const { parts } = beautyOf(s);
  if (parts.care < 0) return 'care';
  if (s.story?.albright === 'factory' && !s.valley?.green && Object.values(s.placed).some(p => p.kind === 'cannery')) return 'green';
  if (parts.trees < BEAUTY.cap.trees) return 'trees';
  if (parts.flowers < BEAUTY.cap.flowers) return 'flowers';
  if (parts.water < 2 * BEAUTY.pond + BEAUTY.dock + BEAUTY.sluice) return 'water';
  return null;
}

// ── The valley's value and the valley company (chapter 17, docs/plan/ch17-a-share-for-everyone.md) ──
//   s.valley.founded        when the company was founded;  s.valley.dividendFrom   since when dividends have been waiting
const sum = (list, f) => list.reduce((a, x, i) => a + f(x, i), 0);
/** What the things of one kind cost to build: a price that rises with each one (beds, cottages) is added up one by one. */
const builtCost = (kind, n) => { const c = BUILDINGS[kind]?.cost; return typeof c === 'function' ? sum(Array.from({ length: n }), (_, i) => Number(c(i)) || 0) : (Number(c) || 0) * n; };
/** What stands in the valley, in coins: { coins, barn, buildings, land, works, herd, beauty, total }. Spending coins on a
 *  building, land, an animal or an upgrade moves worth from one part to another: it never makes the total fall. */
export function assetsOf(s) {
  const placed = Object.values(s.placed ?? {});
  const parts = {
    coins: Math.max(0, s.coins ?? 0),
    barn: sum(Object.entries(s.barn?.items ?? {}), ([g, n]) => (GOODS[g]?.value ?? 0) * n),
    buildings: sum(Object.entries(placed.reduce((by, p) => { by[p.kind] = (by[p.kind] ?? 0) + 1; return by; }, {})), ([kind, n]) => builtCost(kind, n)),
    land: sum(s.parcels ?? [], (_, i) => PARCELS.cost(i + 1)),
    works: (s.firsts?.quay ? RIVERSIDE.quay.cost : 0) + (s.valley?.green ? BEAUTY.greenCost : 0) + (s.valley?.founded ? VALLEY.found : 0)
      + sum(HOTEL.upgradeCost.slice(0, (s.hotel?.level ?? 0) + 1), c => c) + sum(Object.values(s.homes ?? {}), h => sum(RENT.upgradeCost.slice(0, (h.level ?? 0) + 1), c => c)),
    herd: sum(Object.values(s.animals ?? {}).flat(), a => ANIMALS[a.kind]?.price ?? 0),
    beauty: beautyOf(s).score * VALLEY.beauty,
  };
  return { ...parts, total: Math.round(Object.values(parts).reduce((a, b) => a + b, 0)) };
}
/** Deeds done together, which make the valley's name: market days, shared orders, trains, festivals, fairs, hotel guests by the handful. */
export const deedsOf = s => Math.min(VALLEY.deeds, (s.stats?.marketDays ?? 0) + (s.stats?.cooperativeOrders ?? 0) + (s.stats?.trains ?? 0) + (s.stats?.harvestFestivals ?? 0) + (s.stats?.fairs ?? 0)
  + Math.floor((s.stats?.guests ?? 0) / VALLEY.guests));
/** How many times its assets the valley is worth for its name. */
export const goodwillOf = s => VALLEY.step ** deedsOf(s);
/** The valley's value: its assets times its goodwill. */
export const valueOf = s => Math.round(assetsOf(s).total * goodwillOf(s));
/** The title a value has earned (content/journey.mjs VALUE_TITLES), and the next one: { title, next }. */
export function titleOf(value) {
  const i = VALUE_TITLES.reduce((at, x, k) => value >= x.at ? k : at, -1);
  return { title: VALUE_TITLES[i] ?? null, next: VALUE_TITLES[i + 1] ?? null };
}
/** Who holds a share: your own household, every family that has moved in, every villager and neighbour who has come;
 *  and the families who came home to the quay, as a number. { people: [ids], returned } */
export function shareholders(s, now = Infinity) {
  const families = Object.values(s.homes ?? {}).filter(h => h.family && h.arrivesAt <= now).map(h => FAMILIES.find(f => f.id === h.family)?.people?.[0]?.id).filter(Boolean);
  const people = ['ada', ...families, ...VILLAGERS.filter(v => !v.family && v.id !== 'ada' && v.id !== 'albright' && hasArrived(s, v)).map(v => v.id), ...NEIGHBOURS.filter(n => hasArrived(s, n)).map(n => n.id)];
  return { people: [...new Set(people)], returned: s.stats?.returned ?? 0 };
}
/** What founding the valley company takes. Pure: { ok, reason?, price, needs: [{ id, ok }] }. */
export function companyPlan(s) {
  const price = VALLEY.found, founded = !!s.valley?.founded;
  const needs = [
    { id: 'chapter', ok: (s.story?.chapter ?? 0) >= 16 }, { id: 'cooperative', ok: !!s.cooperative?.founded },
    { id: 'office', ok: Object.keys(s.placed ?? {}).some(id => s.placed[id].kind === 'company' && isWorking(s, id)) },
    { id: 'quay', ok: (s.counts?.apartment ?? 0) > 0 }, { id: 'coins', ok: (s.coins ?? 0) >= price },
  ];
  if (founded) return { ok: false, reason: 'The valley company is founded already', price, needs, founded };
  const missing = needs.find(n => !n.ok);
  return missing ? { ok: false, reason: missing.id === 'coins' ? 'Not enough coins' : 'The valley is not ready for a company yet', price, needs, founded } : { ok: true, price, needs, founded };
}
/** The dividend: { each, payments, waiting, nextAt } (payments waiting, at most VALLEY.cap). */
export function dividendOf(s, now) {
  if (!s.valley?.founded) return { each: 0, payments: 0, waiting: 0, nextAt: null };
  const from = s.valley.dividendFrom ?? s.valley.founded, each = Math.round(assetsOf(s).total * VALLEY.dividend);
  const due = Math.floor(Math.max(0, now - from) / VALLEY.dividendMs), payments = Math.min(VALLEY.cap, due);
  return { each, payments, waiting: payments * each, nextAt: payments >= VALLEY.cap ? null : from + (due + 1) * VALLEY.dividendMs };
}

// ── The green valley (chapter 19, docs/plan/ch19-the-green-valley.md) ──
//   s.valley.goals = { [goal id]: when it was first reached }     s.firsts['title:<mark>']: when the valley got that title
const GOAL_TREES = new Set(['round_tree', 'willow', 'pine_tree', 'tree']), GOAL_FLOWERS = new Set(['flowers', 'flowerpot', 'garden_flower']), GOAL_LANES = new Set(['bench', 'lamp', 'street_lamp']);
/** The green goals open when chapter 18 is behind. */
export const greenOpen = s => (s.story?.chapter ?? 0) >= 18;
const goalOf = (s, g) => s.story?.albright === 'factory' && g.factory ? { ...g, ...g.factory } : g;
function greenCounts(s) {
  let trees = 0, flowers = 0, ponds = 0, lanes = 0, worn = 0, hives = 0;
  for (const [id, p] of Object.entries(s.placed ?? {})) {
    const def = BUILDINGS[p.kind]; if (!def) continue;
    if (def.fruit || GOAL_TREES.has(p.kind)) trees++; else if (GOAL_FLOWERS.has(p.kind)) flowers++; else if (GOAL_LANES.has(p.kind)) lanes++;
    if (p.kind === 'pond') ponds++; else if (p.kind === 'beehive') hives++;
    if ((s.cond?.[id]?.level ?? 0) >= 1) worn++;
  }
  return { trees, flowers, ponds, lanes, care: worn ? 0 : 1, choice: s.story?.albright === 'factory' ? (s.valley?.green ? 1 : 0) : hives };
}
/** The green goals as they stand: [{ id, name, icon, have, need, coins, done, at }]. A goal reached once stays reached. */
export function greenProgress(s) {
  const counts = greenCounts(s);
  return GREEN_GOALS.map(g => { const d = goalOf(s, g), at = s.valley?.goals?.[g.id] ?? null; return { id: g.id, name: d.name, icon: d.icon, need: d.need, coins: g.coins, have: at ? d.need : Math.min(d.need, counts[g.id]), done: !!at, at }; });
}
/** What chapter 19 asks: a picture-postcard valley, worth the green mark. { rank, rankNeed, value, valueNeed, ok } */
export function greenAward(s) {
  const rank = beautyOf(s).rank, value = s.valley?.founded ? valueOf(s) : 0, rankNeed = BEAUTY.ranks.length - 1, valueNeed = VALLEY.marks.green;
  return { rank, rankNeed, value, valueNeed, ok: rank >= rankNeed && value >= valueNeed };
}
/** Called by tick(): a green goal reached is stamped and paid, once; a value mark passed gives the valley its next
 *  title, one at a time and in order; and chapter 19's deed is stamped when it first holds. */
export function tickValley(ctx) {
  const { s, now } = ctx; if (!greenOpen(s)) return;
  const counts = greenCounts(s);
  for (const g of GREEN_GOALS) {
    if (s.valley?.goals?.[g.id] || counts[g.id] < goalOf(s, g).need) continue;
    ((s.valley ??= {}).goals ??= {})[g.id] = now; s.coins += g.coins; s.stats.coinsEarned += g.coins;
    ctx.emit('greenGoal', { id: g.id, name: goalOf(s, g).name, coins: g.coins });
  }
  if (!s.valley?.founded) return;
  const next = VALUE_TITLES.find(x => !s.firsts?.[`title:${x.at}`]);
  if (next && valueOf(s) >= next.at) { (s.firsts ??= {})[`title:${next.at}`] = now; ctx.emit('valleyTitle', { at: next.at, name: next.name }); }
  // chapter 19's deed: the first time the valley is a picture postcard and worth the green mark at once
  if (!s.firsts?.greenValley && greenAward(s).ok) { (s.firsts ??= {}).greenValley = now; ctx.emit('greenValleyReached'); }
}

/** Mr Albright's offer: open from the end of chapter 10 until it is answered. */
export const albrightOffer = s => ({ open: (s.story?.chapter ?? 0) >= 10 && !s.story?.albright, answered: s.story?.albright ?? null });
export const actions = {
  /** Answer Mr Albright: { choice: 'factory' | 'meadow' }. Once. The cannery is built on the meadow at his cost. */
  answerAlbright(ctx, { choice } = {}) {
    const { s, now } = ctx;
    if (choice !== 'factory' && choice !== 'meadow') return ctx.fail('Unknown choice');
    if (!albrightOffer(s).open) return ctx.fail(s.story?.albright ? 'You have given your answer' : 'Nobody has asked yet');
    s.story.albright = choice; (s.firsts ??= {}).albright = now;
    if (choice === 'factory') {
      const site = SITES.find(x => x.kind === 'cannery'), id = `p${s.nextId++}`;
      s.placed[id] = { kind: 'cannery', x: site.x, z: site.z, rot: site.rot }; s.counts.cannery = (s.counts.cannery ?? 0) + 1; grid.touch(s);
      ctx.emit('placed', { id, kind: 'cannery', x: site.x, z: site.z, rot: site.rot, site: true });
    }
    ctx.emit('albrightAnswered', { choice });
    return { choice };
  },
  /** Found the valley company: the co-operative, the office and the quay become one thing that belongs to everyone. */
  foundValley(ctx) {
    const { s, now } = ctx, plan = companyPlan(s);
    if (!plan.ok) return ctx.fail(plan.reason);
    s.coins -= plan.price; (s.valley ??= {}).founded = now; s.valley.dividendFrom = now;
    ctx.emit('valleyFounded', { shares: shareholders(s, now).people.length });
    return { founded: now };
  },
  /** Collect the dividends that are waiting. */
  collectDividend(ctx) {
    const { s, now } = ctx, d = dividendOf(s, now);
    if (!s.valley?.founded) return ctx.fail('The valley company is not founded yet');
    if (d.waiting <= 0) return ctx.fail('No dividend is waiting yet');
    const from = s.valley.dividendFrom ?? s.valley.founded, waited = Math.max(0, now - from);
    s.valley.dividendFrom = d.payments >= VALLEY.cap ? now : now - waited % VALLEY.dividendMs;   // the part of a payment already waited for is kept
    s.coins += d.waiting; s.stats.coinsEarned += d.waiting; (s.firsts ??= {}).dividend ??= now;
    ctx.emit('coins', { coins: d.waiting, source: 'dividend' });
    return { coins: d.waiting };
  },
  /** Make the cannery a clean one (trees round it, a filter on the chimney): its beauty penalty goes for good. */
  greenCannery(ctx) {
    const { s } = ctx;
    if (!Object.values(s.placed).some(p => p.kind === 'cannery')) return ctx.fail('There is no cannery');
    if (s.valley?.green) return ctx.fail('The cannery is green already');
    if (s.coins < BEAUTY.greenCost) return ctx.fail('Not enough coins');
    s.coins -= BEAUTY.greenCost; (s.valley ??= {}).green = true;
    ctx.emit('canneryGreened', {});
    return { green: true };
  },
};
