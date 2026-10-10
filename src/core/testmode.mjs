// Test-mode helpers for the Settings "Test" section (shown only in test builds) and for browser tests. They run through
// act() like any action, so the views and the save hear about them.
import { LEVELS } from '../content/economy.mjs';
import { CROPS, RECIPES, ANIMALS, FRUITS } from '../content/goods.mjs';
import { BUILDINGS } from '../content/buildings.mjs';
import { STEPS } from '../content/projects.mjs';
import { CELL_TYPES } from './state.mjs';
import { N } from '../content/world.mjs';
import * as grid from './grid.mjs';
import { xpFor } from './levels.mjs';
import { nextFamily, arriveNext, tickHomes } from './homes.mjs';

/** The highest level any content needs (everything is open from here). */
export const TOP_LEVEL = Math.max(8, ...[CROPS, RECIPES, ANIMALS, FRUITS, BUILDINGS].flatMap(o => Object.values(o).map(v => v.level ?? 0)));

export const actions = {
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
