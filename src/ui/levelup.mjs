// The level-up card (DESIGN 16, rewards): a full-screen card with the new level on a gold badge in a burst of rays, a
// tile for each thing that opens at this level (the levelUp event's `unlocks.list`, from core/levels.mjs; computed from
// the content when an event has none), a tile for a new order slot, "Show me" for the first new building or recipe, and
// Continue. Several levels gained in one go make one card with everything they opened. The card waits while the player
// is busy (build mode, a planting or harvesting sweep) and comes as soon as they stop.
import { t } from '../kit/i18n.mjs';
import { CROPS, FRUITS, RECIPES, ANIMALS, GOODS } from '../content/goods.mjs';
import { BUILDINGS } from '../content/buildings.mjs';
import { unlocksAt } from '../core/levels.mjs';
import { showModal } from './modal.mjs';
import { iconHtml, glyph } from './icon.mjs';

const TYPE = { crop: 'New crop', fruit: 'New fruit', recipe: 'New recipe', animal: 'New animal', building: 'New building' };
const nameOf = u => t((u.type === 'crop' ? CROPS : u.type === 'fruit' ? FRUITS : u.type === 'recipe' ? RECIPES : u.type === 'animal' ? ANIMALS : BUILDINGS)[u.id]?.name ?? u.id);
const iconOf = u => u.type === 'animal' ? iconHtml(ANIMALS[u.id]?.home ?? (u.id === 'hen' ? 'coop' : 'cow_barn'), '', 'tile-icon') : iconHtml(u.id, GOODS[u.id]?.icon ?? '', 'tile-icon');

export class LevelUp {
  /** onShow({ type, id }): open the place where an unlock is used (the build catalogue, a production building). */
  constructor({ game, onShow, busy = () => false }) {
    Object.assign(this, { game, onShow, busy, pending: null });
    game.on(r => {
      const ups = (r.events ?? []).filter(e => e.type === 'levelUp'); if (!ups.length) return;
      const level = Math.max(...ups.map(e => e.level)), list = [], seen = new Set(); let slots = 0;
      for (const e of ups) {
        const u = e.unlocks?.list ? e.unlocks : unlocksAt(e.level);
        for (const x of u.list ?? []) { const k = `${x.type}:${x.id}`; if (!seen.has(k)) { seen.add(k); list.push(x); } }
        slots = Math.max(slots, u.orderSlots ?? 0);
      }
      if (this.pending) { list.unshift(...this.pending.list.filter(u => !seen.has(`${u.type}:${u.id}`))); slots = Math.max(slots, this.pending.slots); }
      this.pending = { level, list, slots };
      this.flush();
    });
  }
  /** Show the waiting card now, or check again shortly while the player is busy. */
  flush() {
    clearTimeout(this.timer);
    if (!this.pending) return;
    if (this.busy()) { this.timer = setTimeout(() => this.flush(), 400); return; }
    const { level, list, slots } = this.pending; this.pending = null;
    this.show(level, list, slots);
  }
  show(level, list, slots) {
    const tiles = list.map(u => `<div class="unlock-tile" data-type="${u.type}">${iconOf(u)}<b>${nameOf(u)}</b><small>${t(TYPE[u.type] ?? 'New')}</small></div>`);
    if (slots) tiles.push(`<div class="unlock-tile" data-type="slots">${iconHtml('ui:orders', '', 'tile-icon')}<b>${t('{count} order slots', { count: slots })}</b><small>${t('More orders')}</small></div>`);
    const show = list.find(u => u.type === 'building') ?? list.find(u => u.type === 'recipe') ?? list.find(u => u.type === 'crop');
    showModal(`<div class="levelup"><div class="burst"><i class="rays"></i><div class="level-badge">${glyph('star', 'star')}<b>${level}</b></div></div>
      <h2>${t('Level {level}!', { level })}</h2><p class="sub">${tiles.length ? t('New on your farm') : t('Your farm grows. Keep going!')}</p>
      ${tiles.length ? `<div class="unlock-tiles">${tiles.join('')}</div>` : ''}
      <div class="row">${show ? `<button class="btn orange" data-close data-show="${show.type}:${show.id}">${t('Show me')}</button>` : ''}<button class="btn primary big" data-close>${t('Continue')}</button></div></div>`,
    { modal: true, cls: 'levelup-modal', onOpen: el => {
      el.querySelector('[data-show]')?.addEventListener('click', e => { const [type, id] = e.currentTarget.dataset.show.split(':'); setTimeout(() => this.onShow?.({ type, id }), 0); });
    } });
  }
}
