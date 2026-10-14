// Farm know-how (content/knowhow.mjs): six growing techniques the farmer finds out by trying them. Each is tried once
// from the farm notebook, when the farm has what it takes; from then on it changes one rule.
//   s.knowhow = { known: { [trick]: when }, saplings: { [tree kind]: grafted saplings waiting in storage } }
//   s.trees[id].graft: true for a grafted tree · .graftAt: its `picked` count at the last branch cut · .cross: bears Mango apples
import { TRICKS, KNOWHOW, COMPANIONS, trickOf } from '../content/knowhow.mjs';
import { CROPS, FRUITS } from '../content/goods.mjs';
import { BUILDINGS } from '../content/buildings.mjs';
import * as barn from './barn.mjs';

const stamp = n => Number.isSafeInteger(n) && n >= 0;
/** A clean copy of the saved know-how: only tricks that exist, only whole sapling counts of fruit trees. */
export function normalizeKnowhow(s) {
  const raw = s.knowhow && typeof s.knowhow === 'object' && !Array.isArray(s.knowhow) ? s.knowhow : {}, known = {}, saplings = {};
  for (const t of TRICKS) if (stamp(raw.known?.[t.id])) known[t.id] = raw.known[t.id];
  for (const [kind, n] of Object.entries(raw.saplings && typeof raw.saplings === 'object' ? raw.saplings : {})) if (BUILDINGS[kind]?.fruit && Number.isSafeInteger(n) && n > 0) saplings[kind] = Math.min(n, 99);
  // `told`: the tricks whose "you can try this now" notice was shown (once each)
  const told = TRICKS.filter(t => raw.told?.[t.id] === true || known[t.id] != null).map(t => t.id);
  return { known, saplings, ...(told.length ? { told: Object.fromEntries(told.map(id => [id, true])) } : {}) };
}
export const knows = (s, id) => stamp(s.knowhow?.known?.[id]);
const picked = s => s.stats?.picked ?? 0;
const treesPicked = (s, kind, n) => Object.entries(s.trees ?? {}).filter(([id, t]) => s.placed[id] && (!kind || s.placed[id].kind === kind) && (t.picked ?? 0) >= n);
/** The crop the barn can best spare for soaking, or null. */
export const soakCrop = s => Object.keys(CROPS).filter(c => barn.free(s, c) >= KNOWHOW.soak.need).sort((a, b) => barn.free(s, b) - barn.free(s, a) || (a < b ? -1 : 1))[0] ?? null;
/** Is what a trick needs there? (Its level is judged apart: a trick below the farm's level is not shown at all.) */
const READY = {
  soak: s => !!soakCrop(s),
  stone: s => picked(s) >= KNOWHOW.stone.picked && s.coins >= KNOWHOW.stone.coins,
  companions: s => (s.stats?.grown?.corn ?? 0) >= KNOWHOW.pair.grown * 2 && (s.stats?.grown?.pumpkin ?? 0) >= KNOWHOW.pair.grown * 2,   // a harvest counts two
  graft: s => treesPicked(s, null, KNOWHOW.graft.picks).length > 0,
  thin: s => picked(s) >= KNOWHOW.thin.picked,
  cross: s => knows(s, 'graft') && treesPicked(s, 'mango_tree', KNOWHOW.cross.mango).length > 0,
};
/** The notebook's rows: [{ trick, state: 'known' | 'ready' | 'waiting' | 'later', at }]. 'later': the farm's level is too low. */
export function knowhowRows(s) {
  return TRICKS.map(trick => ({ trick, at: s.knowhow?.known?.[trick.id] ?? null,
    state: knows(s, trick.id) ? 'known' : s.level < trick.level ? 'later' : READY[trick.id](s) ? 'ready' : 'waiting' }));
}
/** How many tricks can be tried right now (the HUD's pill). */
export const knowhowReady = s => knowhowRows(s).filter(r => r.state === 'ready').length;

// ── What the tricks change ──
/** How long a crop sown in this bed takes, as a factor of its time: soaked seed, and a partner crop in a bed beside it. */
export function sowFactor(s, crop, bed, bedAt) {
  let f = knows(s, 'soak') ? KNOWHOW.soak.grow : 1;
  const mate = COMPANIONS[crop];
  if (mate && knows(s, 'companions') && bed && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => bedAt(bed.x + dx, bed.z + dz) === mate)) f *= KNOWHOW.pair.grow;
  return f;
}
/** A fruit tree's waits as factors of its fruit's times, and what one pick gives. */
export const treeFactor = t => (t?.graft ? KNOWHOW.graft.regrow : 1);
export const firstFactor = graft => (graft ? KNOWHOW.graft.first : 1);
export const pickExtra = s => (knows(s, 'thin') ? KNOWHOW.thin.extra : 0);
/** Can a branch be cut from this tree now? { ok, reason, left } (left: picks still to go). */
export function graftPlan(s, id) {
  const t = s.trees?.[id], kind = s.placed[id]?.kind; if (!t || !BUILDINGS[kind]?.fruit) return { ok: false, reason: 'This is not a fruit tree' };
  if (!knows(s, 'graft')) return { ok: false, reason: 'Find out about grafting in your farm notebook first' };
  const left = KNOWHOW.graft.picks - ((t.picked ?? 0) - (t.graftAt ?? 0));
  return left > 0 ? { ok: false, reason: 'Pick this tree {n} more times first', params: { n: left }, left } : { ok: true, left: 0, kind };
}
/** Can this apple tree take a mango branch now? */
export function crossPlan(s, id) {
  const t = s.trees?.[id]; if (!t || s.placed[id]?.kind !== 'apple_tree') return { ok: false, reason: 'A mango branch takes on an apple tree' };
  if (!knows(s, 'cross')) return { ok: false, reason: 'Find out about two trees in one in your farm notebook first' };
  if (t.cross) return { ok: false, reason: 'This tree bears Mango apples already' };
  if ((t.picked ?? 0) < KNOWHOW.cross.picks) return { ok: false, reason: 'Pick this tree {n} more times first', params: { n: KNOWHOW.cross.picks - (t.picked ?? 0) } };
  if (!treesPicked(s, 'mango_tree', KNOWHOW.cross.mango).length) return { ok: false, reason: 'A mango tree picked twice gives the branch' };
  return s.coins < KNOWHOW.cross.coins ? { ok: false, reason: 'Not enough coins' } : { ok: true, price: KNOWHOW.cross.coins };
}
/** Placing a tree from storage: a grafted sapling of that kind is used first. Returns true when this tree is a graft. */
export function takeSapling(s, kind) {
  const n = s.knowhow?.saplings?.[kind] ?? 0; if (n < 1) return false;
  if (n === 1) delete s.knowhow.saplings[kind]; else s.knowhow.saplings[kind] = n - 1;
  return true;
}

/** Called by tick(): the first time a trick can be tried, a notice says so (once for each; no pill in the status row). */
export function tickKnowhow(ctx) {
  const { s } = ctx; if (!TRICKS.some(t => s.level >= t.level && !knows(s, t.id) && !s.knowhow?.told?.[t.id])) return;
  for (const { trick, state } of knowhowRows(s)) {
    if (state !== 'ready' || s.knowhow?.told?.[trick.id]) continue;
    const k = (s.knowhow = normalizeKnowhow(s)); (k.told ??= {})[trick.id] = true;
    ctx.emit('trickReady', { id: trick.id, name: trick.name });
  }
}

export const actions = {
  /** Try a trick from the notebook: { id }. */
  tryTrick(ctx, { id } = {}) {
    const { s, now } = ctx, trick = trickOf(id); if (!trick) return ctx.fail('That is not in your farm notebook');
    if (knows(s, id)) return ctx.fail('You know this already');
    if (s.level < trick.level) return ctx.fail('Reach level {level} first', { level: trick.level });
    if (!READY[id](s)) return ctx.fail(trick.need);
    const k = (s.knowhow = normalizeKnowhow(s));
    if (id === 'soak') barn.take(s, { [soakCrop(s)]: KNOWHOW.soak.cost });
    if (id === 'stone') { s.coins -= KNOWHOW.stone.coins; s.stored = s.stored ?? {}; s.stored.mango_tree = (s.stored.mango_tree ?? 0) + 1; k.saplings.mango_tree = (k.saplings.mango_tree ?? 0) + 1; }
    k.known[id] = now; (k.told ??= {})[id] = true;
    ctx.emit('trickFound', { id, name: trick.name });
    return { id };
  },
  /** Cut a branch from a tree that has been picked often enough: a grafted sapling of its kind goes into storage. { id } */
  graftBranch(ctx, { id } = {}) {
    const { s } = ctx, plan = graftPlan(s, id); if (!plan.ok) return ctx.fail(plan.reason, plan.params);
    const k = (s.knowhow = normalizeKnowhow(s)), t = s.trees[id];
    t.graftAt = t.picked ?? 0; s.stored = s.stored ?? {}; s.stored[plan.kind] = (s.stored[plan.kind] ?? 0) + 1; k.saplings[plan.kind] = (k.saplings[plan.kind] ?? 0) + 1;
    ctx.emit('grafted', { id, kind: plan.kind });
    return { kind: plan.kind };
  },
  /** Graft a mango branch onto an apple tree: it bears Mango apples from its next crop on. { id } */
  crossBranch(ctx, { id } = {}) {
    const { s, now } = ctx, plan = crossPlan(s, id); if (!plan.ok) return ctx.fail(plan.reason, plan.params);
    const t = s.trees[id]; s.coins -= plan.price; t.cross = true; t.doneAt = Math.max(t.doneAt, now + Math.round(FRUITS.mango_apple.regrowMs * treeFactor(t))); t.waitMs = t.doneAt - now;
    ctx.emit('crossed', { id });
    return { id };
  },
};
