// The Today board (DESIGN 14): a daily gift on a 7-day rotation (no streak to lose), and what happened while away.
import { dayKey } from './clock.mjs';
import * as barn from './barn.mjs';
import { rentWaiting } from './homes.mjs';
import { currentStep, stepReady } from './projects.mjs';

export const GIFTS = [
  { coins: 50 }, { goods: { wheat: 10 } }, { stored: { flowers: 2 } }, { goods: { chicken_feed: 6 } },
  { coins: 100 }, { goods: { carrot: 8 } }, { stored: { bench: 1 } },
];
export function tickToday(ctx) {
  const { s, now } = ctx, key = dayKey(now);
  if (s.today.day === key) return;
  const first = !s.today.day;
  s.today.day = key; s.today.giftDay = first ? 0 : (s.today.giftDay + 1) % GIFTS.length; s.today.claimed = false; s.today.seen = false;
  ctx.emit('newDay', { day: key, gift: GIFTS[s.today.giftDay] });
}
/** What is waiting: ready beds, animals and products, and rent. */
export function waiting(s, now) {
  const beds = Object.values(s.beds).filter(b => b.doneAt <= now).length;
  const animals = Object.values(s.animals).flat().filter(a => a.doneAt != null && a.doneAt <= now).length;
  const products = Object.values(s.production).reduce((n, q) => n + q.queue.filter(j => j.doneAt <= now).length, 0);
  return { beds, animals, products, rent: rentWaiting(s, now) };
}
export function board(s, now) {
  const step = currentStep(s);
  return { day: s.today.day, gift: GIFTS[s.today.giftDay], claimed: !!s.today.claimed, waiting: waiting(s, now), next: step && { id: step.id, ready: stepReady(s, now) } };
}
export const actions = {
  /** The Today board was seen today (it opens by itself only once a day). */
  seeToday(ctx) { ctx.s.today.seen = true; return {}; },
  claimGift(ctx) {
    const { s } = ctx; if (s.today.claimed) return ctx.fail('Come back tomorrow for a new gift');
    const g = GIFTS[s.today.giftDay];
    if (g.coins) s.coins += g.coins;
    for (const [id, n] of Object.entries(g.goods ?? {})) barn.add(s, id, n);
    for (const [kind, n] of Object.entries(g.stored ?? {})) s.stored[kind] = (s.stored[kind] ?? 0) + n;
    s.today.claimed = true; s.today.seen = true;
    ctx.emit('giftClaimed', g);
    return g;
  },
};
