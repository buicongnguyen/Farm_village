// The weekly cart (DESIGN 8, core/cart.mjs): six crates at the farm gate, each asking for some of one good. Fill a crate
// from the barn, send the cart when all six are full, and it pays coins, XP and a decoration. Neighbours on a visit fill
// a crate now and then (their portrait sits on it). CartView draws the cart at CART_SPOT while it is here, with a crate
// on its bed for each filled one; tapping it opens this panel (radial.mjs).
import { t, num } from '../kit/i18n.mjs';
import { GOODS } from '../content/goods.mjs';
import { BUILDINGS } from '../content/buildings.mjs';
import { CELL } from '../content/world.mjs';
import { cartHere, cratesLeft, CART_SPOT } from '../core/cart.mjs';
import * as barn from '../core/barn.mjs';
import { loadKitLater, tiers } from '../view/models.mjs';
import { goodIcon, iconHtml, faceHtml, glyph, coinMark, xpMark } from './icon.mjs';
import { nameOf } from './bonds-panels.mjs';

export function renderCart(s) {
  if (!cartHere(s)) return `<div class="cart-empty">${glyph('cart', 'g huge')}<p class="hint">${s.cart?.sent ? t('The cart has gone to market. The next one comes tomorrow.') : t('The weekly cart starts coming once the school is open.')}</p></div>`;
  const c = s.cart, left = cratesLeft(s);
  const crates = c.crates.map((cr, i) => {
    const have = barn.free(s, cr.good), ok = have >= cr.n;
    return `<div class="crate ${cr.filled ? 'filled' : ok ? 'can' : ''}">${goodIcon(cr.good)}<b>×${cr.n}</b><small>${t(GOODS[cr.good].name)}</small>
      ${cr.filled ? (cr.by && cr.by !== 'you' ? `<span class="by">${faceHtml(cr.by, 'mini-face')}${nameOf(cr.by)}</span>` : `<span class="by">${glyph('check', 'g')}${t('Filled')}</span>`)
        : `<span class="have ${ok ? 'ok' : 'short'}">${Math.min(have, cr.n)}/${cr.n}</span><button class="btn small ${ok ? 'primary' : ''}" data-do="fillCrate" data-crate="${i}" ${ok ? '' : 'disabled'}>${t('Fill')}</button>`}</div>`;
  }).join('');
  return `<p class="hint">${t('Fill all six crates and send the cart to market. It waits as long as you need.')}</p>
    <div class="crates">${crates}</div>
    <div class="cart-reward"><span>${t('Reward')}</span><span>${coinMark()} <b>${num(c.coins)}</b></span><span>${xpMark()} <b>${num(c.xp)}</b></span>
      ${BUILDINGS[c.decor] ? `<span>${iconHtml(c.decor, '', 'mini')} <b>${t(BUILDINGS[c.decor].name)}</b></span>` : ''}</div>
    <button class="btn primary wide" data-do="sendCart" ${left ? 'disabled' : ''}>${left ? t('{count} crates to fill', { count: left }) : t('Send the cart')}</button>`;
}

/** Draws the weekly cart by the farm gate while it waits (the props kit's cart and crates, loaded after the first scene). */
export class CartView {
  constructor(world, game) {
    Object.assign(this, { world, game, ready: null, ids: [] });
    game.on(r => { if (r.events?.some(e => /^(cart|crate|loaded)/.test(e.type))) this.sync(); });
    this.sync();
  }
  async models() {
    const kit = await loadKitLater('props'), b = this.world.batches;
    if (kit.cart && !b.has('weekly_cart')) { const m = tiers(kit, 'cart', { width: 3.4 }, 'static'); b.register('weekly_cart', { geo: m.geo, kind: 'static', color: m.color }); }
    if (kit.crate && !b.has('cart_crate')) { const m = tiers(kit, 'crate', { width: 0.8 }, 'static'); b.register('cart_crate', { geo: m.geo, kind: 'static', color: m.color }); }
  }
  async sync() {
    const s = this.game.s, b = this.world.batches;
    for (const id of this.ids) b.remove(id); this.ids = [];
    if (!cartHere(s)) return;
    try { await (this.ready ??= this.models()); } catch { return; }
    for (const id of this.ids) b.remove(id); this.ids = [];
    if (!cartHere(this.game.s) || !b.has('weekly_cart')) return;
    const x = (CART_SPOT.x + CART_SPOT.w / 2) * CELL, z = (CART_SPOT.z + CART_SPOT.d / 2) * CELL, rot = Math.PI / 2;
    b.set('cart', { model: 'weekly_cart', x, z, rot }); this.ids.push('cart');
    if (!b.has('cart_crate')) return;
    // filled crates stand on the cart's bed: two rows of three along its long side (from the model's own box)
    const box = b.models.get('weekly_cart').geo.boundingBox, long = box.max.x - box.min.x > box.max.z - box.min.z;
    const L = long ? box.max.x - box.min.x : box.max.z - box.min.z, W = long ? box.max.z - box.min.z : box.max.x - box.min.x, top = box.max.y * 0.5;
    const c = Math.cos(rot), sn = Math.sin(rot);
    this.game.s.cart.crates.forEach((cr, i) => {
      if (!cr.filled) return;
      const u = (i % 3 - 1) * L * 0.2, v = (Math.floor(i / 3) - 0.5) * W * 0.36, lx = long ? u : v, lz = long ? v : u;
      const id = `cart-crate:${i}`;
      b.set(id, { model: 'cart_crate', x: x + lx * c + lz * sn, z: z - lx * sn + lz * c, y: top, rot: rot + (i % 2) * 0.15 }); this.ids.push(id);
    });
  }
}
