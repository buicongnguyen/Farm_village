// Farm panels in a bottom sheet (DESIGN 8, 13, 7): the order board, the barn, a production building, the stall.
// One sheet at a time; it re-draws itself after every action while open.
import { t, num } from '../kit/i18n.mjs';
import { GOODS, RECIPES } from '../content/goods.mjs';
import { BUILDINGS } from '../content/buildings.mjs';
import { allPeople } from '../content/people.mjs';
import { BARN, SLOTS } from '../content/economy.mjs';
import * as barn from '../core/barn.mjs';
import { recipesAt, queueOf } from '../core/production.mjs';
import { shortTime } from '../core/clock.mjs';
import { STACK } from '../core/stall.mjs';
import { renderToday, renderProjects, renderCottage } from './village-panels.mjs';
import { renderSettings, renderAlbum } from './settings-panels.mjs';
import { setLanguage } from '../kit/i18n.mjs';

const PEOPLE = Object.fromEntries(allPeople().map(p => [p.id, p]));
export const FACES = { ada: '👵', cora: '👩‍🏫', minh: '👨‍🔧', lan: '👩‍🍳', bo: '👦', grace: '👩‍⚕️', sam: '📮', zara: '👧', elin: '🎨', olaf: '⚓', marisol: '👩‍⚕️', tomas: '🔧', pia: '👧', mai: '🌸', gus: '🧔' };
export const goodIcon = g => GOODS[g]?.icon ?? '📦';
const goodsLine = (s, need, honour = true) => Object.entries(need).map(([g, n]) => {
  const have = barn.free(s, g, honour), ok = have >= n;
  return `<span class="good ${ok ? 'ok' : 'short'}">${goodIcon(g)} ${Math.min(have, n)}/${n}</span>`;
}).join('');

export class Panels {
  constructor(root, game, hud, { onBuild, onShowWay, onSave } = {}) {
    Object.assign(this, { game, hud, open: null, onBuild, onShowWay, onSave });
    this.el = document.createElement('div'); this.el.className = 'sheet panel'; this.el.hidden = true;
    root.appendChild(this.el);
    this.el.addEventListener('click', e => this.click(e));
    this.el.addEventListener('change', e => { if (e.target.matches('[data-range]')) this.game.do('setting', { key: e.target.dataset.range, value: e.target.value / 100 }); if (e.target.matches('[data-file]')) this.onSave?.('import', e.target.files[0]); });
    game.on(() => { if (this.open) this.render(); });
    setInterval(() => { if (this.open && !document.hidden) this.render(); }, 1000);   // timers count down
  }
  show(kind, arg) { this.open = { kind, arg }; this.el.hidden = false; this.el.dataset.kind = kind; this.render(); }
  close() { this.open = null; this.el.hidden = true; this.lift(); }
  /** Keep the HUD buttons above the sheet while it is open. */
  lift() { document.body.classList.toggle('panel-open', !!this.open); document.body.style.setProperty('--sheet-h', `${this.open ? this.el.offsetHeight : 0}px`); }
  toggle(kind, arg) { this.open?.kind === kind && this.open.arg === arg ? this.close() : this.show(kind, arg); }
  click(e) {
    const b = e.target.closest('[data-do]'); if (!b) return;
    const d = b.dataset, g = this.game;
    if (d.do === 'close') this.close();
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
    else if (d.do === 'projects') this.show('projects');
    else if (d.do === 'projectDeliver') g.do('projectDeliver');
    else if (d.do === 'buildProject') { this.close(); this.onBuild?.(d.kind); }
    else if (d.do === 'showWay') { this.close(); this.onShowWay?.(d.at); }
    else if (d.do === 'collectRent') g.do('collectRent');
    else if (d.do === 'upgradeHome') g.do('upgradeHome', { id: d.id });
    else if (d.do === 'setting') { if (d.key === 'lang') { setLanguage(d.value).then(() => this.render()); this.render(); } else g.do('setting', { key: d.key, value: d.value }); }
    else if (d.do === 'export' || d.do === 'newGame' || d.do === 'profile') this.onSave?.(d.do, d.n);
  }
  render() {
    const s = this.game.s, o = this.open; if (!o) return;
    queueMicrotask(() => this.lift());
    const head = title => `<div class="panel-head"><h2>${title}</h2><button class="round small" data-do="close" aria-label="${t('Close')}">✕</button></div>`;
    if (o.kind === 'settings') this.el.innerHTML = head(t('Settings')) + renderSettings(s, this.profile ?? 1);
    else if (o.kind === 'album') this.el.innerHTML = head(t('Family album')) + renderAlbum(s);
    else if (o.kind === 'today') this.el.innerHTML = head(t('Today')) + renderToday(s, this.game.now);
    else if (o.kind === 'projects') this.el.innerHTML = head(t('Village projects')) + renderProjects(s, this.game.now);
    else if (o.kind === 'cottage') this.el.innerHTML = head(t('Rental cottage')) + renderCottage(s, o.arg, this.game.now);
    else if (o.kind === 'orders') this.el.innerHTML = head(t('Order board')) + `<div class="order-list">${s.orders.cards.map(c => this.card(c)).join('') || `<p class="empty">${t('New orders are on their way.')}</p>`}</div>`;
    else if (o.kind === 'barn') {
      const used = barn.used(s), items = Object.entries(s.barn.items).filter(([, n]) => n > 0).sort((a, b) => GOODS[a[0]].level - GOODS[b[0]].level), held = barn.held(s);
      this.el.innerHTML = head(t('Barn')) + `<div class="cap"><div class="cap-bar"><i style="width:${Math.min(100, used / s.barn.cap * 100)}%"></i></div><b>${num(used)}/${num(s.barn.cap)}</b>
        <button class="btn" data-do="upgradeBarn">${t('Upgrade (+{step})', { step: BARN.step })} · 🪙 ${num(BARN.upgradeCost(s.barn.upgrades))}</button></div>
        <div class="goods-grid">${items.map(([g, n]) => `<div class="good-tile"><span class="icon">${goodIcon(g)}</span><b>${num(n)}</b><small>${t(GOODS[g].name)}${held[g] ? ` · ${t('{count} held', { count: held[g] })}` : ''}</small></div>`).join('') || `<p class="empty">${t('The barn is empty.')}</p>`}</div>`;
    } else if (o.kind === 'production') {
      const p = s.placed[o.arg]; if (!p) { this.close(); return; }
      const q = queueOf(s, o.arg), now = this.game.now, ready = q.queue.filter(j => j.doneAt <= now).length, slotCost = SLOTS.cost[q.slots];
      const recipes = recipesAt(s, p.kind).map(r => { const def = RECIPES[r];
        return `<button class="recipe" data-do="produce" data-recipe="${r}"><span class="icon">${def.icon}</span><b>${t(def.name)}${def.makes > 1 ? ` ×${def.makes}` : ''}</b><span class="needs">${goodsLine(s, def.needs)}</span><small>⏱ ${shortTime(def.timeMs)}</small></button>`; }).join('');
      const queue = Array.from({ length: q.slots }, (_, i) => { const j = q.queue[i]; if (!j) return `<div class="slot empty"></div>`;
        const def = RECIPES[j.recipe], left = j.doneAt - now; return `<div class="slot ${left <= 0 ? 'ready' : ''}"><span class="icon">${def.icon}</span><small>${left <= 0 ? t('Ready') : shortTime(left)}</small></div>`; }).join('');
      this.el.innerHTML = head(t(BUILDINGS[p.kind].name)) + `<div class="queue">${queue}${slotCost != null && q.slots < SLOTS.max ? `<button class="slot buy" data-do="buySlot">＋<small>🪙 ${num(slotCost)}</small></button>` : ''}</div>
        ${ready ? `<button class="btn primary" data-do="collectProducts">${t('Collect {count}', { count: ready })}</button>` : ''}<div class="recipes">${recipes}</div>`;
    } else if (o.kind === 'stall') {
      const st = s.stall, spare = Object.entries(s.barn.items).filter(([g, n]) => n > 0 && barn.free(s, g) > 0);
      this.el.innerHTML = head(t('Roadside stall')) + `<p class="hint">${t('Passers-by buy one thing every few minutes, at its base price.')}</p>
        <div class="queue">${st.items.map(i => `<div class="slot"><span class="icon">${goodIcon(i.good)}</span><small>×${i.n}</small></div>`).join('')}</div>
        ${st.coins ? `<button class="btn primary" data-do="stallCollect">${t('Collect {coins} coins', { coins: num(st.coins) })}</button>` : ''}
        <div class="goods-grid">${spare.map(([g, n]) => `<button class="good-tile" data-do="stallList" data-good="${g}"><span class="icon">${goodIcon(g)}</span><b>${num(n)}</b><small>${t(GOODS[g].name)} · 🪙 ${GOODS[g].value}</small></button>`).join('')}</div>`;
    }
  }
  card(c) {
    const s = this.game.s, who = PEOPLE[c.from], can = barn.hasAll(s, c.need), now = this.game.now;
    return `<div class="order ${can ? 'can' : ''}"><div class="who"><span class="face">${FACES[c.from] ?? '🙂'}</span><b>${who ? t(who.name) : ''}</b></div>
      <p class="line">${c.line ? t(c.line) : ''}</p><div class="needs">${goodsLine(s, c.need)}</div>
      <div class="reward">🪙 ${num(c.coins)} · ⭐ ${num(c.xp)}</div>
      <div class="order-buttons"><button class="btn primary" data-do="deliver" data-id="${c.id}" ${can ? '' : 'disabled'}>${t('Deliver')}</button>${c.story ? '' : `<button class="btn ghost" data-do="discard" data-id="${c.id}" aria-label="${t('Discard')}">🗑</button>`}</div></div>`;
  }
}
/** How many orders can be filled right now (for the HUD badge). */
export const fillable = s => s.orders.cards.filter(c => barn.hasAll(s, c.need)).length;
