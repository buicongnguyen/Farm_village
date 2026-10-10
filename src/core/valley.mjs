// The valley (chapter 11, docs/plan/ch11-the-man-from-the-city.md): how beautiful it is, and the one real choice of the
// story. Mr Albright offers to build a cannery on the meadow by the brook (fast money, the meadow gone); the player may
// take it or keep the meadow (wildflowers, bees and honey). The answer is given once and stands: s.story.albright.
// Beauty is counted from what stands in the valley; it pays a little on every order now and brings guests later.
import { BEAUTY } from '../content/economy.mjs';
import { BUILDINGS } from '../content/buildings.mjs';
import { SITES } from '../content/world.mjs';
import { isWorking } from './working.mjs';
import * as grid from './grid.mjs';

const TREES = new Set(['round_tree', 'willow', 'pine_tree', 'tree', 'bush']);
/** The valley's beauty: { score, rank, parts: { trees, flowers, water, care, industry, meadow } }. Pure and cheap (a count). */
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
