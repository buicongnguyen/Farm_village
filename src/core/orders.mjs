// The order board (DESIGN 8, ECONOMY 3): cards from villagers and neighbours, delivered from the barn.
import { ORDERS, XP, BONDS } from '../content/economy.mjs';
import { GOODS, CROPS, RECIPES, ANIMALS, FRUITS } from '../content/goods.mjs';
import { VILLAGERS, NEIGHBOURS, ORDER_LINES, FIRST_ORDER, allPeople } from '../content/people.mjs';
import * as barn from './barn.mjs';
import { draw } from './rng.mjs';
import { gainXp } from './levels.mjs';
import { familiesIn } from './projects.mjs';
import { animalCount } from './animals.mjs';
import { addHearts } from './bonds.mjs';

export const slots = s => ORDERS.slots(s.level);
/** Goods an order may ask for: things the player can make right now (fruit only once a tree of that kind is planted). */
export function orderable(s) {
  const has = kind => (s.counts[kind] ?? 0) > 0, fruitOk = id => has(FRUITS[id].tree);
  return Object.keys(GOODS).filter(id => {
    if (CROPS[id]) return CROPS[id].level <= s.level;
    if (FRUITS[id]) return fruitOk(id);
    if (RECIPES[id]) return !id.endsWith('_feed') && RECIPES[id].level <= s.level && has(RECIPES[id].at) && Object.keys(RECIPES[id].needs).every(g => !FRUITS[g] || fruitOk(g));
    const animal = Object.entries(ANIMALS).find(([, a]) => a.gives === id);
    return animal ? animalCount(s, animal[0]) > 0 : false;
  });
}
/** People who can post orders now: villagers who are here (not noOrders ones such as your own family), neighbours, and
 * families who have moved in. */
export function posters(s, now) {
  return [...VILLAGERS.filter(v => !v.noOrders && (!v.arrives || (s.counts[v.arrives] ?? 0) > 0)).map(v => v.id), ...NEIGHBOURS.map(n => n.id),
    ...familiesIn(s, now).flatMap(f => f.people.map(p => p.id))];
}
export const canFill = (s, card) => barn.hasAll(s, card.need);
/** Make a new card. easy: only goods the player already has (keeps one card always fillable, ECONOMY 3). */
export function makeCard(s, now, { easy = false } = {}) {
  return draw(s, r => {
    const id = `o${s.nextId++}`;
    if (!s.stats.ordersFilled && !s.orders.cards.length) // the tutorial's first order (DESIGN 15)
      return { id, ...FIRST_ORDER, need: { ...FIRST_ORDER.need }, readyAt: now, story: true };
    let pool = orderable(s);
    if (easy) { const inStock = pool.filter(g => barn.free(s, g) > 0); pool = inStock.length ? inStock : ['wheat']; }
    const kinds = 1 + r.int(Math.min(3, pool.length)), target = ORDERS.size(s.level), need = {};
    // No good may ask for more than a quarter of the barn, so cheap goods drop out as orders grow (ECONOMY 3).
    const cap = Math.max(3, Math.floor(s.barn.cap / 4));
    const fits = pool.filter(g => target / kinds / GOODS[g].value <= cap);
    if (!easy && fits.length) pool = fits;
    for (let i = 0; i < kinds; i++) {
      const g = r.pick(pool), n = Math.min(cap, Math.max(1, Math.round(target / kinds / GOODS[g].value)));
      need[g] = Math.min(cap, (need[g] ?? 0) + (easy ? Math.max(1, Math.min(n, barn.free(s, g) || n)) : n));
    }
    const worth = Object.entries(need).reduce((a, [g, n]) => a + GOODS[g].value * n, 0);
    // the poster first, then a line in their own voice (the story's `orders` lines), with the same two draws as before
    const from = r.pick(posters(s, now)), lines = allPeople().find(p => p.id === from)?.orders;
    return { id, from, need, coins: Math.round(worth * ORDERS.pay), xp: Math.max(1, Math.round(worth * XP.order)), line: r.pick(lines?.length ? lines : ORDER_LINES), readyAt: now };
  });
}
/** Fill empty slots whose wait is over. Called by tick(). */
export function tickOrders(ctx) {
  const { s, now } = ctx, o = s.orders;
  o.pending = (o.pending ?? []).filter(at => at > now);
  while (o.cards.length + o.pending.length < slots(s)) {
    const easy = o.cards.length > 0 && !o.cards.some(c => canFill(s, c));
    o.cards.push(makeCard(s, now, { easy })); ctx.emit('newOrder', {});
  }
}

export const actions = {
  deliverOrder(ctx, { id }) {
    const { s, now } = ctx, i = s.orders.cards.findIndex(c => c.id === id);
    if (i < 0) return ctx.fail('That order is gone');
    const card = s.orders.cards[i];
    if (!barn.take(s, card.need)) {
      const held = Object.keys(card.need).some(g => barn.free(s, g) < card.need[g] && barn.stock(s, g) >= card.need[g]);
      return ctx.fail(held ? 'Held for the project' : 'Missing goods');
    }
    s.orders.cards.splice(i, 1); (s.orders.pending ??= []).push(now + ORDERS.refillMs);
    s.coins += card.coins; s.stats.coinsEarned += card.coins; s.stats.orderCoins += card.coins; s.stats.ordersFilled++;
    gainXp(ctx, card.xp);
    ctx.emit('orderFilled', { id, from: card.from, coins: card.coins, xp: card.xp });
    addHearts(ctx, card.from, BONDS.order, 'order');
    return { coins: card.coins, xp: card.xp };
  },
  discardOrder(ctx, { id }) {
    const { s, now } = ctx, i = s.orders.cards.findIndex(c => c.id === id);
    if (i < 0) return ctx.fail('That order is gone');
    if (s.orders.cards[i].story) return ctx.fail('This one is part of the story');
    s.orders.cards.splice(i, 1); (s.orders.pending ??= []).push(now + ORDERS.discardMs);
    return {};
  },
};
