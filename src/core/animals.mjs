// Animals live in their home (coop, cow barn) inside a closed fence; fed animals give produce after their time (DESIGN 6).
import { ANIMALS } from '../content/goods.mjs';
import { XP } from '../content/economy.mjs';
import { BUILDINGS } from '../content/buildings.mjs';
import * as barn from './barn.mjs';
import { gainXp } from './levels.mjs';
import { penOf } from './grid.mjs';

const homesOf = (s, kind) => Object.entries(s.placed).filter(([, p]) => BUILDINGS[p.kind].animals === kind).map(([id]) => id);
export const animalCount = (s, kind) => homesOf(s, kind).reduce((n, id) => n + (s.animals[id]?.length ?? 0), 0);
export const animalPrice = (s, kind) => (animalCount(s, kind) < ANIMALS[kind].freeFirst ? 0 : ANIMALS[kind].price);
export const animalState = (a, now) => (a.doneAt == null ? 'hungry' : a.doneAt <= now ? 'ready' : 'busy');

export const actions = {
  /** Buy an animal into a home: { home }. */
  buyAnimal(ctx, { home }) {
    const { s } = ctx, p = s.placed[home], kind = p && BUILDINGS[p.kind].animals;
    if (!kind) return ctx.fail('Animals need their own home');
    const a = ANIMALS[kind];
    if (s.level < a.level) return ctx.fail('Reach level {level} first', { level: a.level, animal: kind, lock: 'level' });
    const list = (s.animals[home] ??= []);
    if (list.length >= a.perHome) return ctx.fail('This home is full');
    if (!penOf(s, home).closed) return ctx.fail(penOf(s, home).reason ?? 'The fence has a gap');
    const price = animalPrice(s, kind);
    if (s.coins < price) return ctx.fail('Not enough coins');
    s.coins -= price; list.push({ kind, doneAt: null });
    ctx.emit('animalArrived', { home, kind });
    return { kind, price };
  },
  /** Feed hungry animals: { home } (one home) or nothing (every home). Uses one feed each. */
  feed(ctx, { home } = {}) {
    const { s, now } = ctx; let fed = 0, noFeed = false;
    for (const id of home ? [home] : Object.keys(s.animals)) for (const an of s.animals[id] ?? []) {
      if (an.doneAt != null) continue;
      const a = ANIMALS[an.kind];
      if (!barn.take(s, { [a.eats]: 1 }, false)) { noFeed = true; continue; }
      an.doneAt = now + a.everyMs; fed++;
    }
    if (!fed) return ctx.fail(noFeed ? 'No feed in the barn: make some at the feed mill' : 'Nobody is hungry');
    ctx.emit('fed', { count: fed });
    return { fed };
  },
  /** Collect ready produce: { home } or every home. */
  collect(ctx, { home } = {}) {
    const { s, now } = ctx; let got = 0, full = false;
    for (const id of home ? [home] : Object.keys(s.animals)) for (const an of s.animals[id] ?? []) {
      if (an.doneAt == null || an.doneAt > now) continue;
      if (!barn.add(s, ANIMALS[an.kind].gives, 1)) { full = true; break; }
      an.doneAt = null; got++;
      ctx.emit('collected', { home: id, good: ANIMALS[an.kind].gives });
    }
    if (!got) return ctx.fail(full ? 'The barn is full' : 'Nothing is ready yet');
    gainXp(ctx, XP.collect * got);
    return { collected: got };
  },
};
