// The weekly cart (DESIGN 8): a horse cart at the farm gate with 6 crates. It comes once the school is open, waits as long
// as it takes (no timer, nothing expires), and leaves when every crate is filled and the player sends it. It pays more than
// orders and brings a decoration. A neighbour's visit can fill a crate. The next cart arrives the day after one leaves.
import { CART, ORDERS } from '../content/economy.mjs';
import { GOODS } from '../content/goods.mjs';
import { BUILDINGS } from '../content/buildings.mjs';
import { dayKey } from './clock.mjs';
import { rng, hash } from './rng.mjs';
import * as barn from './barn.mjs';
import { gainXp } from './levels.mjs';
import { completed } from './projects.mjs';
import { orderable } from './orders.mjs';

export { CART_SPOT, inCartSpot } from './reserved.mjs';   // where the cart stands (kept free of building)
/** The cart service starts the day after the school opens (so it never shortcuts the school or the cottages after it). */
export const cartOpen = (s, now = Infinity) => {
  if (!completed(s, 'school')) return false;
  const at = s.firsts?.['project:school'];
  return at == null || now === Infinity || dayKey(at) !== dayKey(now);
};
export const cartHere = s => !!s.cart && !s.cart.sent;
export const cratesLeft = s => (cartHere(s) ? s.cart.crates.filter(c => !c.filled).length : 0);

/** A new cart: seeded from the save and the cart's number (not from the order seed, so orders stay the same). */
export function makeCart(s, n) {
  const r = rng(hash(s.createdAt, 'cart', n)), cap = Math.max(3, Math.floor(s.barn.cap / 4));
  // at most one crate of animal produce (eggs and milk come slowly)
  const pool = orderable(s).filter(g => GOODS[g].kind !== 'feed');
  let produce = 0;
  const crates = Array.from({ length: CART.crates }, () => {
    const options = produce ? pool.filter(g => GOODS[g].kind !== 'produce') : pool;
    const good = options.length ? options[r.int(options.length)] : 'wheat';
    if (GOODS[good].kind === 'produce') produce++;
    const need = Math.min(cap, Math.max(1, Math.round((ORDERS.size(s.level) * CART.crateShare) / GOODS[good].value)));
    return { good, n: need, filled: false, by: null };
  });
  const value = crates.reduce((a, c) => a + GOODS[c.good].value * c.n, 0);
  return { n, crates, coins: Math.round(value * CART.pay), xp: Math.max(1, Math.round(value * CART.xp)), decor: CART.decor[(n - 1) % CART.decor.length], sent: false, sentDay: null, helped: 0, helpDay: null };
}
export function tickCart(ctx) {
  const { s, now } = ctx;
  if (!cartOpen(s, now)) return;
  // a sent cart is replaced the next game day; a clock moved back does not bring another one at once
  if (s.cart && (!s.cart.sent || (s.cart.sentDay ?? '') >= dayKey(now))) return;
  s.cart = makeCart(s, (s.cart?.n ?? 0) + 1);
  ctx.emit('cartArrived', { n: s.cart.n });
}
/** A neighbour on a visit fills the open crate the player is furthest from filling (one a day, at most CART.helpMax per cart). */
export function neighbourHelp(ctx, id) {
  const { s, now } = ctx, c = s.cart, day = dayKey(now);
  if (!cartHere(s) || c.helpDay === day || c.helped >= CART.helpMax) return null;
  const open = c.crates.map((cr, i) => [cr, i]).filter(([cr]) => !cr.filled);
  if (open.length <= 1) return null;                     // the last crate is always the player's
  const short = ([cr]) => Math.max(0, cr.n - barn.stock(s, cr.good)) * GOODS[cr.good].value;
  const [crate, i] = open.sort((a, b) => short(b) - short(a) || a[1] - b[1])[0];
  crate.filled = true; crate.by = id; c.helped++; c.helpDay = day;
  ctx.emit('crateFilled', { crate: i, by: id, good: crate.good, n: crate.n });
  return i;
}

export const actions = {
  /** Fill one crate from the barn: { crate } (its index). */
  fillCrate(ctx, { crate }) {
    const { s } = ctx; if (!cartHere(s)) return ctx.fail('The cart is not here');
    const c = s.cart.crates[crate]; if (!c) return ctx.fail('Unknown crate');
    if (c.filled) return ctx.fail('This crate is full already');
    if (!barn.take(s, { [c.good]: c.n })) return ctx.fail(barn.stock(s, c.good) >= c.n ? 'Held for the project' : 'Missing goods');
    c.filled = true; c.by = 'you';
    ctx.emit('crateFilled', { crate, by: 'you', good: c.good, n: c.n });
    return { left: cratesLeft(s) };
  },
  /** Send the cart when every crate is full: pays coins and XP and gives a decoration (into storage). */
  sendCart(ctx) {
    const { s, now } = ctx; if (!cartHere(s)) return ctx.fail('The cart is not here');
    if (cratesLeft(s)) return ctx.fail('Fill every crate first');
    const c = s.cart; c.sent = true; c.sentDay = dayKey(now);
    s.coins += c.coins; s.stats.coinsEarned += c.coins; s.stats.carts = (s.stats.carts ?? 0) + 1;
    if (BUILDINGS[c.decor]) s.stored[c.decor] = (s.stored[c.decor] ?? 0) + 1;
    gainXp(ctx, c.xp);
    ctx.emit('cartSent', { n: c.n, coins: c.coins, xp: c.xp, decor: c.decor });
    return { coins: c.coins, xp: c.xp, decor: c.decor };
  },
};
