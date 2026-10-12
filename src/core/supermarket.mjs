// Optional, explicit shop actions. No tick sales, expiring requests, energy costs, or entry rewards.
import { ACTIONS } from './act.mjs';
import { SUPERMARKET, SHOP_SECTIONS } from '../content/supermarket.mjs';
import { SHOP_LINES, SHOP_MEMORIES } from '../content/supermarket-story.mjs';
import { normalizeSupermarket, supermarketBuildReason, basketPrice } from './supermarket-state.mjs';
import { orderable } from './orders.mjs';
import { companyKeep } from './village-growth.mjs';
import { workingCount } from './working.mjs';
import { recipeOpen } from './production.mjs';
import { hash } from './rng.mjs';
import * as barn from './barn.mjs';
export { normalizeSupermarket };
const clock = now => Number.isSafeInteger(now) && now >= 0 && now <= Number.MAX_SAFE_INTEGER - SUPERMARKET.waitMs;
const working = s => workingCount(s, 'supermarket') > 0;
export function basketPool(s, section) {
  if (!Object.hasOwn(SHOP_SECTIONS, section)) return [];
  // The permanent village pond supplies the three common fish, without any new building or energy gate.
  const sources = new Set([...orderable(s), 'perch', 'carp', 'catfish']);
  return SHOP_SECTIONS[section].goods.filter(g => sources.has(g));
}
export function basketRows(s, r = normalizeSupermarket(s).request) {
  if (!r) return [];
  const held = barn.held(s);
  return Object.entries(r.need).map(([good, n]) => {
    const projects = held[good] ?? 0, company = companyKeep(s, good), orders = (s.orders?.cards ?? []).reduce((sum, c) => sum + (c.need?.[good] ?? 0), 0);
    const reserved = projects + company + orders, stock = barn.stock(s, good), have = Math.max(0, stock - reserved);
    return { good, n, stock, have, reserved, projects, company, orders };
  });
}
export function supermarketStatus(s, now = s.lastSeen) {
  const saved = normalizeSupermarket(s), rows = basketRows(s, saved.request), open = working(s);
  const canDeliver = open && !!saved.request?.accepted && rows.every(r => r.have >= r.n);
  const left = Math.min(SUPERMARKET.waitMs, Math.max(0, saved.nextAt - now));
  const supplied = Object.values(saved.sections).filter(r => r.suppliedAt !== null).length;
  const hint = !open ? SHOP_LINES.idea : saved.introducedAt === null ? SHOP_LINES.idea : !Object.keys(saved.sections).length ? SHOP_LINES.restore
    : saved.request ? canDeliver ? SHOP_LINES.ready : saved.request.need.carrot_cake && recipeOpen(s, 'carrot_cake') && barn.free(s, 'bread') >= 8 ? SHOP_LINES.bread
      : rows.some(r => r.have < r.n) ? SHOP_LINES.missing : saved.request.accepted ? SHOP_LINES.accepted : SHOP_LINES.basket
    : supplied === 3 && saved.memories.thankyou == null ? SHOP_LINES.discover : left ? SHOP_LINES.waiting : supplied === 3 ? SHOP_LINES.complete : SHOP_LINES.basket;
  return { ...saved, rows, open, left, supplied, canDeliver, hint, reason: supermarketBuildReason(s),
    sectionsAvailable: Object.keys(SHOP_SECTIONS).filter(id => basketPool(s, id).length) };
}
function check(ctx) {
  if (!clock(ctx.now)) return ctx.fail('The shop clock is unavailable');
  if (!working(ctx.s)) return ctx.fail('Build or repair the village supermarket first');
  return null;
}
const save = (ctx, value) => { ctx.s.supermarket = value; };
function remember(ctx, st, id) {
  if (st.memories[id] != null) return;
  st.memories[id] = ctx.now; ctx.emit('shopMemory', { id });
}
export const supermarketActions = {
  introduceSupermarket(ctx) {
    const why = check(ctx); if (why) return why; const st = normalizeSupermarket(ctx.s);
    if (st.introducedAt !== null) return ctx.fail('The village shop plan is already in your journal');
    st.introducedAt = ctx.now; save(ctx, st); return {};
  },
  restoreShopSection(ctx, { section } = {}) {
    const why = check(ctx); if (why) return why; const st = normalizeSupermarket(ctx.s);
    if (st.introducedAt === null) return ctx.fail('Read the village shop plan first');
    if (!Object.hasOwn(SHOP_SECTIONS, section) || st.sections[section]) return ctx.fail('Choose a shelf that still needs restoring');
    if (!basketPool(ctx.s, section).length) return ctx.fail('Set up a source for this shelf first');
    if (ctx.s.coins < SUPERMARKET.sectionCost) return ctx.fail('Not enough coins');
    ctx.s.coins -= SUPERMARKET.sectionCost; st.sections[section] = { restoredAt: ctx.now, suppliedAt: null }; save(ctx, st); ctx.emit('shopShelfRestored', { section }); return {};
  },
  prepareShopBasket(ctx, { section } = {}) {
    const why = check(ctx); if (why) return why; const st = normalizeSupermarket(ctx.s);
    if (st.request) return ctx.fail('Finish or release the current shop basket first');
    if (!Object.hasOwn(SHOP_SECTIONS, section) || !st.sections[section]) return ctx.fail('Restore this shelf first');
    if (st.nextAt > ctx.now) return ctx.fail('The next shop basket is not ready yet');
    if (st.serial >= 999_999) return ctx.fail('This shop record cannot accept another basket');
    const pool = basketPool(ctx.s, section); if (!pool.length) return ctx.fail('Set up a source for this shelf first');
    const i = hash(ctx.s.createdAt, section, st.serial) % pool.length, need = { [pool[i]]: SUPERMARKET.units };
    if (pool.length > 1) { need[pool[i]] = SUPERMARKET.units / 2; need[pool[(i + 1) % pool.length]] = SUPERMARKET.units / 2; }
    st.request = { id: `shop:${st.serial}`, section, need, payment: basketPrice(need), accepted: false, offeredAt: ctx.now };
    save(ctx, st); return {};
  },
  acceptShopBasket(ctx, { request } = {}) {
    const why = check(ctx); if (why) return why; const st = normalizeSupermarket(ctx.s), r = st.request;
    if (!r || r.id !== request || r.accepted) return ctx.fail('That shop basket has changed');
    r.accepted = true; save(ctx, st); return {};
  },
  cancelShopBasket(ctx, { request } = {}) {
    // Always accessible: removal or repair of the shop cannot strand reserved goods.
    if (!clock(ctx.now)) return ctx.fail('The shop clock is unavailable');
    const st = normalizeSupermarket(ctx.s); if (!st.request || st.request.id !== request || st.serial >= 999_999) return ctx.fail('That shop basket has changed');
    st.request = null; st.serial++; st.nextAt = ctx.now + SUPERMARKET.waitMs; save(ctx, st); return {};
  },
  deliverShopBasket(ctx, { request } = {}) {
    const why = check(ctx); if (why) return why; const st = normalizeSupermarket(ctx.s), r = st.request;
    if (!r?.accepted || r.id !== request || st.serial >= 999_999 || st.completed >= 999_999) return ctx.fail('That shop basket has changed');
    if (basketRows(ctx.s, r).some(row => row.have < row.n)) return ctx.fail('Keep the other requests’ goods and finish this shop basket');
    if (![ctx.s.coins + r.payment, ctx.s.stats.coinsEarned + r.payment].every(Number.isSafeInteger)) return ctx.fail('This shop payment is too large');
    // The one owner may consume its hold after all checks; other actions use barn.free/take.
    for (const [good, n] of Object.entries(r.need)) { ctx.s.barn.items[good] -= n; if (!ctx.s.barn.items[good]) delete ctx.s.barn.items[good]; }
    ctx.s.coins += r.payment; ctx.s.stats.coinsEarned += r.payment;
    st.completed++; st.serial++; st.request = null; st.nextAt = ctx.now + SUPERMARKET.waitMs;
    st.sections[r.section].suppliedAt ??= ctx.now;
    if (st.openedAt === null) { st.openedAt = ctx.now; remember(ctx, st, 'opening'); }
    if (Object.values(st.sections).filter(v => v.suppliedAt !== null).length >= 2) remember(ctx, st, 'variety');
    save(ctx, st); ctx.emit('shopBasketDelivered', { section: r.section, coins: r.payment }); ctx.emit('coins', { source: 'supermarket', coins: r.payment }); return { coins: r.payment };
  },
  discoverShopCard(ctx) {
    const why = check(ctx); if (why) return why; const st = normalizeSupermarket(ctx.s);
    if (Object.values(st.sections).filter(v => v.suppliedAt !== null).length !== 3 || st.memories.thankyou != null) return ctx.fail('There is no new card behind the shelf yet');
    remember(ctx, st, 'thankyou'); save(ctx, st); return {};
  },
  readShopMemory(ctx, { id } = {}) {
    const st = normalizeSupermarket(ctx.s);
    if (!Object.hasOwn(SHOP_MEMORIES, id) || st.memories[id] == null) return ctx.fail('That shop memory is not in the album yet');
    if (!st.read.includes(id)) st.read.push(id); save(ctx, st); return {};
  },
};
export const installSupermarket = () => Object.assign(ACTIONS, supermarketActions);
