// Animals live in their home (coop, cow barn) inside a closed fence; fed animals give produce after their time (DESIGN 6).
import { ANIMALS } from '../content/goods.mjs';
import { XP } from '../content/economy.mjs';
import { BUILDINGS } from '../content/buildings.mjs';
import * as barn from './barn.mjs';
import { gainXp } from './levels.mjs';
import { penOf } from './grid.mjs';
import { isWorking } from './working.mjs';

const homesOf = (s, kind) => Object.entries(s.placed).filter(([, p]) => BUILDINGS[p.kind].animals === kind).map(([id]) => id);
export const animalCount = (s, kind) => homesOf(s, kind).reduce((n, id) => n + (s.animals[id]?.length ?? 0), 0);
export const animalPrice = (s, kind) => (animalCount(s, kind) < ANIMALS[kind].freeFirst ? 0 : ANIMALS[kind].price);
export const animalState = (a, now) => (a.doneAt == null ? 'hungry' : a.doneAt <= now ? 'ready' : 'busy');

export const actions = {
  /** Buy an animal into a home: { home }. */
  buyAnimal(ctx, { home }) {
    const { s } = ctx, p = s.placed[home], kind = p && BUILDINGS[p.kind].animals;
    if (!kind) return ctx.fail('Animals need their own home');
    if (!isWorking(s, home)) return ctx.fail('It needs repairs first');
    const a = ANIMALS[kind];
    if (s.level < a.level) return ctx.fail('Reach level {level} first', { level: a.level, animal: kind, lock: 'level' });
    const list = s.animals[home] ?? [];   // not stored until the animal is bought
    if (list.length >= a.perHome) return ctx.fail('This home is full');
    const price = animalPrice(s, kind);
    if (s.coins < price) return ctx.fail('Not enough coins');
    s.coins -= price; list.push({ kind, doneAt: null }); s.animals[home] = list;
    ctx.emit('animalArrived', { home, kind });
    return { kind, price };
  },
  /** Feed hungry animals: { home } (one home) or nothing (every home). Uses one feed each. */
  feed(ctx, { home } = {}) {
    const { s, now } = ctx; let fed = 0, noFeed = false;
    for (const id of home ? [home] : Object.keys(s.animals)) for (const an of s.animals[id] ?? []) {
      if (an.doneAt != null || !isWorking(s, id)) continue;
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
    const { s, now } = ctx; let got = 0, sold = 0;
    for (const id of home ? [home] : Object.keys(s.animals)) for (const an of s.animals[id] ?? []) {
      if (an.doneAt == null || an.doneAt > now) continue;
      sold += barn.addOrSell(s, ANIMALS[an.kind].gives, 1);
      an.doneAt = null; got++;
      ctx.emit('collected', { home: id, good: ANIMALS[an.kind].gives });
    }
    if (!got) return ctx.fail('Nothing is ready yet');
    if (sold) ctx.emit('barnSold', { coins: sold });
    gainXp(ctx, XP.collect * got);
    return { collected: got };
  },
};
