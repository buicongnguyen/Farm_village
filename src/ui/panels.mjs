// Farm panels in a bottom sheet (DESIGN 8, 13, 7): the order board, the barn, a production building, the stall, the
// weekly cart, the mailbox, friends and gifts. One sheet at a time; it re-draws itself after every action while open.
// Opening a panel turns a page (sfx 'page'); its buttons click.
import { t, num } from '../kit/i18n.mjs';
import { sfx } from '../kit/sound.mjs';
import { GOODS, RECIPES } from '../content/goods.mjs';
import { BUILDINGS } from '../content/buildings.mjs';
import { BARN, SLOTS } from '../content/economy.mjs';
import * as barn from '../core/barn.mjs';
import { recipesAt, queueOf } from '../core/production.mjs';
import { shortTime } from '../core/clock.mjs';
import { STACK } from '../core/stall.mjs';
import { renderToday, renderProjects, renderCottage } from './village-panels.mjs';
import { renderSettings, renderAlbum } from './settings-panels.mjs';
import { renderFriends, renderGift, renderMail, heartBar, showLetter, PEOPLE, nameOf } from './bonds-panels.mjs';
import { renderCart } from './cart-panel.mjs';
import { goodIcon, faceHtml, glyph, coinMark, xpMark, iconHtml } from './icon.mjs';
import { setLanguage } from '../kit/i18n.mjs';

export { goodIcon };
const goodsLine = (s, need, honour = true) => Object.entries(need).map(([g, n]) => {
  const have = barn.free(s, g, honour), ok = have >= n;
  return `<span class="good ${ok ? 'ok' : 'short'}">${goodIcon(g, 'mini')} ${Math.min(have, n)}/${n}</span>`;
}).join('');
const TITLES = { settings: 'Settings', album: 'Family album', today: 'Today', projects: 'Village projects', cottage: 'Rental cottage', orders: 'Order board', barn: 'Barn',
  stall: 'Roadside stall', cart: 'The weekly cart', mail: 'Mailbox', friends: 'Friends', gift: 'Give a gift' };
const HEAD_ICONS = { settings: 'settings', album: 'album', today: 'today', projects: 'projects', cottage: 'cottage', orders: 'ui:orders', barn: 'ui:barn', stall: 'stall',
  cart: 'cart', mail: 'mail', friends: 'ui:heart', gift: 'gift' };

export class Panels {
  constructor(root, game, hud, { onBuild, onShowWay, onSave, onBuildKind, onTest, onPhoto } = {}) {
    Object.assign(this, { game, hud, open: null, onBuild, onShowWay, onSave, onBuildKind, onTest, onPhoto });
    this.el = document.createElement('div'); this.el.className = 'sheet panel'; this.el.hidden = true;
    root.appendChild(this.el);
    this.el.addEventListener('click', e => this.click(e));
    this.el.addEventListener('change', e => { if (e.target.matches('[data-range]')) this.game.do('setting', { key: e.target.dataset.range, value: e.target.value / 100 }); if (e.target.matches('[data-file]')) this.onSave?.('import', e.target.files[0]); });
    game.on(() => { if (this.open) this.render(); });
    setInterval(() => { if (this.open && !document.hidden) this.render(); }, 1000);   // timers count down
  }
  show(kind, arg) {
    const fresh = this.open?.kind !== kind || this.open?.arg !== arg;
    this.open = { kind, arg }; this.el.hidden = false; this.el.dataset.kind = kind; this.render();
    if (fresh) { sfx('page'); this.el.scrollTop = 0; this.el.classList.remove('pop'); void this.el.offsetWidth; this.el.classList.add('pop'); }
  }
  close() { this.open = null; this.el.hidden = true; this.lift(); }
  /** Keep the HUD buttons above the sheet while it is open. */
  lift() { document.body.classList.toggle('panel-open', !!this.open); document.body.style.setProperty('--sheet-h', `${this.open ? this.el.offsetHeight : 0}px`); }
  toggle(kind, arg) { this.open?.kind === kind && this.open.arg === arg ? this.close() : this.show(kind, arg); }
  click(e) {
    const b = e.target.closest('[data-do]'); if (!b || b.disabled) return;
    const d = b.dataset, g = this.game;
    sfx('click');
    if (d.do === 'close') this.close();
    else if (d.do === 'back') this.show(this.back?.kind ?? 'friends', this.back?.arg);
    else if (d.do === 'deliver') g.do('deliverOrder', { id: d.id });
    else if (d.do === 'discard') g.do('discardOrder', { id: d.id });
    else if (d.do === 'upgradeBarn') g.do('upgradeBarn');
    else if (d.do === 'produce') g.do('produce', { building: this.open.arg, recipe: d.recipe });
    else if (d.do === 'collectProducts') g.do('collectProducts', { building: this.open.arg });
    else if (d.do === 'buySlot') g.do('buySlot', { building: this.open.arg });
    else if (d.do === 'stallList') g.do('stallList', { good: d.good, n: Math.min(STACK, barn.free(g.s, d.good)) });
    else if (d.do === 'stallCollect') g.do('stallCollect');
    else if (d.do === 'claimGift') g.do('claimGift');
    else if (d.do === 'trade') g.do('trade', { id: d.id, accept: true });
    else if (d.do === 'decline') g.do('trade', { id: d.id, accept: false });
    else if (d.do === 'projects' || d.do === 'cart' || d.do === 'mail' || d.do === 'friends') this.show(d.do);
    else if (d.do === 'projectDeliver') g.do('projectDeliver');
    else if (d.do === 'buildProject') { this.close(); this.onBuild?.(d.kind); }
    else if (d.do === 'showWay') { this.close(); this.onShowWay?.(d.at); }
    else if (d.do === 'collectRent') g.do('collectRent');
    else if (d.do === 'upgradeHome') g.do('upgradeHome', { id: d.id });
    else if (d.do === 'fillCrate') g.do('fillCrate', { crate: +d.crate });
    else if (d.do === 'sendCart') { const r = g.do('sendCart'); if (r.ok) setTimeout(() => this.open?.kind === 'cart' && this.close(), 900); }
    else if (d.do === 'readLetter') showLetter(g, d.id);
    else if (d.do === 'gift') { this.back = { ...this.open }; this.show('gift', d.person); }
    else if (d.do === 'giveGood') { const r = g.do('gift', { person: d.person, good: d.good }); if (r.ok) this.show(this.back?.kind ?? 'friends', this.back?.arg); }
    else if (d.do === 'wishBuild') { this.close(); this.onBuildKind?.(d.kind); }
    else if (d.do === 'test') this.onTest?.(d.test);
    else if (d.do === 'photo') { this.close(); this.onPhoto?.(); }
    else if (d.do === 'setting') { if (d.key === 'lang') { setLanguage(d.value).then(() => this.render()); this.render(); } else g.do('setting', { key: d.key, value: d.value }); }
    else if (d.do === 'export' || d.do === 'newGame' || d.do === 'profile') this.onSave?.(d.do, d.n);
  }
  /** The sheet's header: the panel's icon on a ribbon, its title and a close button (and Back for the gift picker). */
  head(title, icon) {
    const back = this.open?.kind === 'gift' ? `<button class="round small" data-do="back" aria-label="${t('Back')}">${glyph('undo', 'g')}</button>` : '';
    return `<div class="panel-head">${back}${iconHtml(icon, '', 'head-icon')}<h2>${title}</h2><button class="round small close" data-do="close" aria-label="${t('Close')}">${glyph('close', 'g')}</button></div>`;
  }
  render() {
    const s = this.game.s, o = this.open; if (!o) return;
    queueMicrotask(() => this.lift());
    const now = this.game.now;
    let body = '', title = t(TITLES[o.kind] ?? ''), icon = HEAD_ICONS[o.kind];
    if (o.kind === 'settings') body = renderSettings(s, this.profile ?? 1);
    else if (o.kind === 'album') body = renderAlbum(s);
    else if (o.kind === 'today') body = renderToday(s, now);
    else if (o.kind === 'projects') body = renderProjects(s, now);
    else if (o.kind === 'cottage') body = renderCottage(s, o.arg, now);
    else if (o.kind === 'cart') body = renderCart(s);
    else if (o.kind === 'mail') body = renderMail(s, now);
    else if (o.kind === 'friends') body = renderFriends(s, now);
    else if (o.kind === 'gift') body = renderGift(s, o.arg, now);
    else if (o.kind === 'orders') body = `<div class="order-list">${s.orders.cards.map(c => this.card(c)).join('') || `<p class="empty">${t('New orders are on their way.')}</p>`}</div>`;
    else if (o.kind === 'barn') {
      const used = barn.used(s), items = Object.entries(s.barn.items).filter(([, n]) => n > 0).sort((a, b) => GOODS[a[0]].level - GOODS[b[0]].level), held = barn.held(s);
      body = `<div class="cap"><div class="cap-bar ${used >= s.barn.cap * 0.9 ? 'full' : ''}"><i style="width:${Math.min(100, used / s.barn.cap * 100)}%"></i><b>${num(used)}/${num(s.barn.cap)}</b></div>
        <button class="btn orange" data-do="upgradeBarn">${glyph('up', 'g')} ${t('Upgrade (+{step})', { step: BARN.step })} · ${coinMark()} ${num(BARN.upgradeCost(s.barn.upgrades))}</button></div>
        <div class="goods-grid">${items.map(([g, n]) => `<div class="good-tile">${goodIcon(g)}<b>${num(n)}</b><small>${t(GOODS[g].name)}${held[g] ? ` · ${t('{count} held', { count: held[g] })}` : ''}</small></div>`).join('') || `<p class="empty">${t('The barn is empty.')}</p>`}</div>`;
    } else if (o.kind === 'production') {
      const p = s.placed[o.arg]; if (!p) { this.close(); return; }
      title = t(BUILDINGS[p.kind].name); icon = p.kind;
      const q = queueOf(s, o.arg), ready = q.queue.filter(j => j.doneAt <= now).length, slotCost = SLOTS.cost[q.slots];
      const recipes = recipesAt(s, p.kind).map(r => { const def = RECIPES[r], can = barn.hasAll(s, def.needs);
        return `<button class="recipe ${can ? 'can' : ''}" data-do="produce" data-recipe="${r}">${goodIcon(r)}<b>${t(def.name)}${def.makes > 1 ? ` ×${def.makes}` : ''}</b><span class="needs">${goodsLine(s, def.needs)}</span><small>${glyph('clock', 'g')} ${shortTime(def.timeMs)}</small></button>`; }).join('');
      const queue = Array.from({ length: q.slots }, (_, i) => { const j = q.queue[i]; if (!j) return `<div class="slot empty"></div>`;
        const def = RECIPES[j.recipe], left = j.doneAt - now, k = left <= 0 ? 1 : Math.max(0, 1 - left / def.timeMs);
        return `<div class="slot ${left <= 0 ? 'ready' : ''}" style="--k:${k.toFixed(3)}">${goodIcon(j.recipe)}<small>${left <= 0 ? t('Ready') : shortTime(left)}</small></div>`; }).join('');
      body = `<div class="queue">${queue}${slotCost != null && q.slots < SLOTS.max ? `<button class="slot buy" data-do="buySlot">${glyph('plus', 'g')}<small>${coinMark()} ${num(slotCost)}</small></button>` : ''}</div>
        ${ready ? `<button class="btn primary wide" data-do="collectProducts">${t('Collect {count}', { count: ready })}</button>` : ''}<div class="recipes">${recipes}</div>`;
    } else if (o.kind === 'stall') {
      const st = s.stall, spare = Object.entries(s.barn.items).filter(([g, n]) => n > 0 && barn.free(s, g) > 0);
      body = `<p class="hint">${t('Passers-by buy one thing every few minutes, at its base price.')}</p>
        <div class="queue">${st.items.map(i => `<div class="slot">${goodIcon(i.good)}<small>×${i.n}</small></div>`).join('')}</div>
        ${st.coins ? `<button class="btn primary wide" data-do="stallCollect">${t('Collect {coins} coins', { coins: num(st.coins) })}</button>` : ''}
        <div class="goods-grid">${spare.map(([g, n]) => `<button class="good-tile" data-do="stallList" data-good="${g}">${goodIcon(g)}<b>${num(n)}</b><small>${t(GOODS[g].name)} · ${coinMark()} ${GOODS[g].value}</small></button>`).join('')}</div>`;
    }
    this.el.innerHTML = this.head(title, icon) + `<div class="panel-body">${body}</div>`;
  }
  card(c) {
    const s = this.game.s, who = PEOPLE[c.from], can = barn.hasAll(s, c.need);
    return `<div class="order ${can ? 'can' : ''}${c.story ? ' story' : ''}"><div class="who">${faceHtml(c.from)}<div class="who-name"><b>${who ? nameOf(c.from) : ''}</b>${who ? heartBar(s, c.from) : ''}</div></div>
      <p class="line">${c.line ? t(c.line) : ''}</p><div class="needs">${goodsLine(s, c.need)}</div>
      <div class="reward">${coinMark()} <b>${num(c.coins)}</b> ${xpMark()} <b>${num(c.xp)}</b></div>
      <div class="order-buttons"><button class="btn primary" data-do="deliver" data-id="${c.id}" ${can ? '' : 'disabled'}>${t('Deliver')}</button>${c.story ? '' : `<button class="btn ghost icon-only" data-do="discard" data-id="${c.id}" aria-label="${t('Discard')}">${glyph('trash', 'g')}</button>`}</div></div>`;
  }
}
/** How many orders can be filled right now (for the HUD badge). */
export const fillable = s => s.orders.cards.filter(c => barn.hasAll(s, c.need)).length;
