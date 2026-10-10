// Test-mode helpers for the Settings "Test" section (test builds, and the public game opened with ?tester) and for
// browser tests. They run through act() like any action, so the views and the save hear about them.
import { LEVELS } from '../content/economy.mjs';
import { CROPS, RECIPES, ANIMALS, FRUITS } from '../content/goods.mjs';
import { BUILDINGS } from '../content/buildings.mjs';
import { STEPS } from '../content/projects.mjs';
import { CELL_TYPES } from './state.mjs';
import { N } from '../content/world.mjs';
import * as grid from './grid.mjs';
import { xpFor, unlocksAt } from './levels.mjs';
import { nextFamily, arriveNext, tickHomes } from './homes.mjs';
import { RUINS, START_PARCEL, parcelOrigin } from '../content/world.mjs';
import { CHAPTERS, BEATS } from '../content/story.mjs';
import { actions as build } from './build.mjs';
import { actions as animals } from './animals.mjs';
import { advance } from './projects.mjs';
import { tickCondition } from './condition.mjs';
import { isWorking } from './working.mjs';

/** The highest level any content needs (everything is open from here). */
export const TOP_LEVEL = Math.max(8, ...[CROPS, RECIPES, ANIMALS, FRUITS, BUILDINGS].flatMap(o => Object.values(o).map(v => v.level ?? 0)));

// ── Jumping to a chapter (docs/plan/00-tester-tools.md A) ──
// JUMPS[n] brings a farm to the START of chapter n: every earlier chapter's deed is done. Each entry only tops the farm
// up (it never takes anything away), uses the real actions where it can, and builds on the entries before it.
// A chapter's pull request adds the entry for the chapter after it.
const upTo = ({ s }, level) => { if (s.level < level) { s.level = level; s.xp = Math.max(s.xp, xpFor(level)); } };
/** The build order stands at this step, at least; with `full`, the step's goods are handed over too. */
function stepTo(ctx, id, full = false) {
  const { s, now } = ctx, i = STEPS.findIndex(st => st.id === id);
  if (s.projects.step < i) { for (const st of STEPS.slice(s.projects.step, i)) (s.firsts ??= {})[`project:${st.id}`] ??= now; s.projects.step = i; s.projects.delivered = {}; }
  if (full && s.projects.step === i) s.projects.delivered = { ...(STEPS[i].deliver ?? {}) };
}
/** One working `kind`, for free: a broken one is mended, a missing one is built on its old site or the nearest free
 *  spot. Returns its id, or null when there is no room for it. */
function give(ctx, kind) {
  const { s, now } = ctx, ids = Object.keys(s.placed).filter(id => s.placed[id].kind === kind);
  const works = ids.find(id => isWorking(s, id)); if (works) return works;
  if (ids.length) { (s.repairing ??= {})[ids[0]] = { doneAt: now }; tickCondition(ctx); return ids[0]; }
  upTo(ctx, BUILDINGS[kind].level ?? 1);
  const coins = s.coins; s.coins += 1e7;
  const site = RUINS.find(r => r.kind === kind), o = parcelOrigin(START_PARCEL);
  let out = null;
  if (site) {
    const door = grid.doorCell(kind, site.x, site.z, site.rot);
    if (door && !grid.reachesRoad(s, door[0], door[1])) build.place(ctx, { kind: 'path', x: door[0], z: door[1] });
    out = build.place(ctx, { kind, x: site.x, z: site.z, rot: site.rot });
  }
  if (!out || out.ok === false) {
    const at = BUILDINGS[kind].area === 'village' ? grid.findSpot(s, kind, 46, 96, { rot: 2 }) : grid.findSpot(s, kind, o.x + 8, o.z + 8, { rot: 2 });
    out = at ? build.place(ctx, { kind, ...at }) : null;
  }
  s.coins = coins;
  return out && out.ok !== false ? out.id : null;
}
/** At least `n` families living in the village. */
function families(ctx, n) {
  const { s, now } = ctx, here = () => Object.values(s.homes).filter(h => h.family && h.arrived).length;
  for (const h of Object.values(s.homes)) if (h.family && h.arrivesAt > now) { h.arrivesAt = now; h.rentFrom = Math.min(h.rentFrom, now); }
  tickHomes(ctx);
  for (let i = 0; i < 8 && here() < n; i++) if (actions.testAddFamily(ctx).ok === false) break;
}
export const JUMPS = {
  2: ctx => upTo(ctx, 2),   // chapter 1 opens the game: nothing to do for it
  3: ctx => { upTo(ctx, 3); stepTo(ctx, 'mill_coop'); give(ctx, 'feed_mill'); const coop = give(ctx, 'coop'); if (coop && !ctx.s.animals[coop]?.length) animals.buyAnimal(ctx, { home: coop }); },
  4: ctx => { upTo(ctx, 4); stepTo(ctx, 'cottage1'); families(ctx, 1); },
  5: ctx => { upTo(ctx, 6); stepTo(ctx, 'cottage2', true); families(ctx, 2); advance(ctx); stepTo(ctx, 'school', true); give(ctx, 'school'); },
  6: ctx => { stepTo(ctx, 'cottages34'); families(ctx, 4); advance(ctx); stepTo(ctx, 'clinic', true); give(ctx, 'clinic'); },
};
/** The chapters a tester can jump to. */
export const JUMP_CHAPTERS = Object.keys(JUMPS).map(Number).sort((a, b) => a - b);

export const actions = {
  /** Coins to try things with: { coins }. */
  testAddCoins(ctx, { coins = 10000 } = {}) {
    if (!Number.isSafeInteger(coins) || coins <= 0 || coins > 1e7) return ctx.fail('Unknown amount');
    ctx.s.coins += coins; ctx.emit('coins', { coins });
    return { coins: ctx.s.coins };
  },
  /** Levels at once: { levels }. Every level on the way is announced as a real level-up. */
  testAddLevels(ctx, { levels = 5 } = {}) {
    const { s } = ctx;
    if (!Number.isSafeInteger(levels) || levels <= 0 || levels > LEVELS.max) return ctx.fail('Unknown amount');
    if (s.level >= LEVELS.max) return ctx.fail('This is the top level');
    const to = Math.min(LEVELS.max, s.level + levels);
    while (s.level < to) { s.level++; ctx.emit('levelUp', { level: s.level, unlocks: unlocksAt(s.level) }); }
    s.xp = Math.max(s.xp, xpFor(s.level));
    return { level: s.level };
  },
  /** Bring the farm to the start of a chapter: { chapter }. Only forward. Returns the deeds it could not arrange, if any. */
  testJumpChapter(ctx, { chapter } = {}) {
    const { s } = ctx;
    if (!Number.isSafeInteger(chapter) || !Object.hasOwn(JUMPS, chapter)) return ctx.fail('Unknown chapter');
    if ((s.story.chapter ?? 0) >= chapter - 1) return ctx.fail('This farm is already there');
    for (const n of JUMP_CHAPTERS) if (n <= chapter) { JUMPS[n](ctx); advance(ctx); }
    // the story so far is behind the player: no stack of old cards, no tutorial, and a purse to start the chapter with
    s.story.chapter = Math.max(s.story.chapter ?? 0, chapter - 1); s.story.tutorial = 99;
    s.story.beats = [...new Set([...(s.story.beats ?? []), ...BEATS.filter(b => b.chapter < chapter).map(b => b.id)])];
    s.coins = Math.max(s.coins, 1000 * chapter); s.undo = [];
    const missing = CHAPTERS.filter(c => c.id < chapter && !c.when(s)).map(c => c.id);
    ctx.emit('testJumped', { chapter, missing });
    return { chapter, missing };
  },
  /** Unlock everything: every level's content, every project step reached, and coins to try it all. */
  testUnlockAll(ctx, { coins = 10000 } = {}) {
    const { s } = ctx, from = s.level;
    if (s.level < TOP_LEVEL) { s.level = TOP_LEVEL; s.xp = Math.max(s.xp, xpFor(TOP_LEVEL)); }
    const clinic = STEPS.findIndex(st => st.id === 'clinic'); s.projects.step = clinic; s.projects.delivered = { ...(STEPS[clinic].deliver ?? {}) };
    s.coins += coins;
    ctx.emit('testUnlocked', { from, level: s.level, coins });
    return { level: s.level };
  },
  /** Finish every timer now: crops, fruit, animals, production and families on their way. */
  testFinishTimers(ctx) {
    const { s, now } = ctx; let n = 0;
    for (const b of Object.values(s.beds)) if (b.doneAt > now) { b.doneAt = now; n++; }
    for (const t of Object.values(s.trees ?? {})) if (t.doneAt > now) { t.doneAt = now; n++; }
    for (const list of Object.values(s.animals)) for (const a of list) if (a.doneAt != null && a.doneAt > now) { a.doneAt = now; n++; }
    for (const q of Object.values(s.production)) for (const j of q.queue) if (j.doneAt > now) { j.doneAt = now; n++; }
    for (const h of Object.values(s.homes)) if (h.family && h.arrivesAt > now) { h.arrivesAt = now; h.rentFrom = Math.min(h.rentFrom, now); n++; }
    tickHomes(ctx);
    ctx.emit('timersFinished', { count: n });
    return { finished: n };
  },
  /** Move the next family in at once: a free cottage plot on the village road, with its path, for free. */
  testAddFamily(ctx) {
    const { s, now } = ctx, fam = nextFamily(s);
    if (!fam) return ctx.fail('Every family has a home');
    // a restored village: mend a run-down cottage (the family moves in at once)
    const broken = Object.keys(s.placed).find(id => s.placed[id].kind === 'cottage' && !s.homes[id]?.family);
    if (broken) { delete s.cond[broken]; delete s.repairing[broken]; arriveNext(ctx, broken); s.homes[broken].arrivesAt = now; s.homes[broken].rentFrom = now; tickHomes(ctx); return { id: broken, family: fam.id }; }
    for (let i = 0; i < 15; i++) {
      const x = 33 + 4 * i, z = 93, door = [x + 1, 92];
      if (grid.cellType(s, ...door) !== 'path' && (grid.occupant(s, ...door) || !['grass', 'weeds', 'rock'].includes(grid.cellType(s, ...door)))) continue;
      const k = door[1] * N + door[0], before = s.cells[k], level = s.level;
      s.cells[k] = CELL_TYPES.path; grid.touch(s); s.level = Math.max(level, BUILDINGS.cottage.level);
      const fits = grid.canPlace(s, 'cottage', x, z, 2).ok; s.level = level;
      if (!fits) { s.cells[k] = before; grid.touch(s); continue; }
      const id = `p${s.nextId++}`;
      s.placed[id] = { kind: 'cottage', x, z, rot: 2 }; s.counts.cottage = (s.counts.cottage ?? 0) + 1; grid.touch(s);
      arriveNext(ctx, id); s.homes[id].arrivesAt = now; s.homes[id].rentFrom = now;
      ctx.emit('cellChanged', { x: door[0], z: door[1] });
      ctx.emit('placed', { id, kind: 'cottage', x, z, rot: 2 });
      tickHomes(ctx);
      return { id, family: fam.id };
    }
    return ctx.fail('No room for another cottage');
  },
};
