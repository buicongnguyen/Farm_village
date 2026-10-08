// Farm panels in a bottom sheet (DESIGN 8, 13, 7): the order board, the barn, a production building, the stall, the
// weekly cart, the mailbox, friends and gifts. One sheet at a time; it re-draws itself after every action while open.
// Opening a panel turns a page (sfx 'page'); its buttons click.
import { t, num } from '../kit/i18n.mjs';
import { sfx } from '../kit/sound.mjs';
import { GOODS, RECIPES } from '../content/goods.mjs';
import { BUILDINGS } from '../content/buildings.mjs';
import { BARN, SLOTS, TRUCK } from '../content/economy.mjs';
import * as barn from '../core/barn.mjs';
import { recipesAt, queueOf } from '../core/production.mjs';
import { shortTime } from '../core/clock.mjs';
import { renderJourney } from './journey-panel.mjs';
import { FRUIT_STAND } from '../content/economy.mjs';
import { fruitPrice } from '../core/orchard.mjs';
import { STACK } from '../core/stall.mjs';
import { fishingOf } from '../core/fishing.mjs';
import { planFor, STEP_TEXT } from '../core/plan.mjs';
import { questsOf, progressOf, ready as questReady, weeklyProgress, hurryLeft, hurryable } from '../core/quests.mjs';
import { QUESTS, WEEKLY, WEEKLY_REWARD } from '../content/quests.mjs';
import { FISH_TABLE } from '../content/goods.mjs';
import { truckOf, loadUnits, loadValue, capacity, blocked as blockedWhy } from '../core/market.mjs';
import { renderToday, renderProjects, renderCottage } from './village-panels.mjs';
import { renderSettings, renderAlbum } from './settings-panels.mjs';
import { renderProfiles } from './profiles-panel.mjs';
import { showDiscovery } from './discovery-panels.mjs';
import { renderFriends, renderGift, renderMail, heartBar, showLetter, PEOPLE, nameOf } from './bonds-panels.mjs';
import { renderCart } from './cart-panel.mjs';
import { goodIcon, faceHtml, glyph, coinMark, xpMark, iconHtml } from './icon.mjs';
import { setLanguage } from '../kit/i18n.mjs';

export { goodIcon };
const goodsLine = (s, need, honour = true) => Object.entries(need).map(([g, n]) => {
  const have = barn.free(s, g, honour), ok = have >= n;
  return `<span class="good ${ok ? 'ok' : 'short'}">${goodIcon(g, 'mini')} ${Math.min(have, n)}/${n}</span>`;
}).join('');
const TITLES = { profiles: 'Farm profiles', roadmap: 'Roadmap', fruit_stand: 'Fruit stand', clinic: 'Clinic', settings: 'Settings', album: 'Family album', today: 'Today', projects: 'Village projects', cottage: 'Rental cottage', orders: 'Order board', barn: 'Barn',
  stall: 'Roadside stall', market: 'Market square', pond: 'Fish pond', quests: 'Goals', cart: 'Market cart', mail: 'Mailbox', friends: 'Friends', gift: 'Give a gift' };
const HEAD_ICONS = { profiles: 'cottage', roadmap: 'projects', fruit_stand: 'fruit_stand', clinic: 'clinic', settings: 'settings', album: 'album', today: 'today', projects: 'projects', cottage: 'cottage', orders: 'ui:orders', barn: 'ui:barn', stall: 'stall',
  cart: 'cart', mail: 'mail', friends: 'ui:heart', gift: 'gift' };

/** Panels with nothing to count down. */
const STILL = new Set(['profiles', 'settings', 'album', 'friends', 'gift', 'mail']);
export class Panels {
  constructor(root, game, hud, { onBuild, onShowWay, onSave, onBuildKind, onTest, onPhoto } = {}) {
    Object.assign(this, { game, hud, open: null, onBuild, onShowWay, onSave, onBuildKind, onTest, onPhoto });
    this.el = document.createElement('div'); this.el.className = 'sheet panel'; this.el.hidden = true;
    root.appendChild(this.el);
    this.el.addEventListener('click', e => this.click(e));
    this.el.addEventListener('change', e => { if (e.target.matches('[data-range]')) this.game.do('setting', { key: e.target.dataset.range, value: e.target.value / 100 }); if (e.target.matches('[data-name]')) this.game.do('setting', { key: 'playerName', value: e.target.value }); if (e.target.matches('[data-file]')) this.onSave?.('import', e.target.files[0]); });
    game.on(() => { if (this.open && !this.holding()) this.render(); });
    // timers count down: only the panels that show a countdown redraw on the clock (a redraw replaces every control, which
    // would cut off a slider being dragged in Settings)
    setInterval(() => { if (this.open && !document.hidden && !STILL.has(this.open.kind) && !this.holding()) this.render(); }, 1000);
  }
  show(kind, arg) {
    const fresh = this.open?.kind !== kind || this.open?.arg !== arg;
    this.open = { kind, arg }; this.el.hidden = false; this.el.dataset.kind = kind; this.render();
    if (fresh) { sfx('page'); this.el.scrollTop = 0; this.el.classList.remove('pop'); void this.el.offsetWidth; this.el.classList.add('pop'); }
  }
  /** Is a control being held (a slider mid-drag)? Redrawing now would drop it. */
  holding() { return !!this.el.querySelector('input:active'); }
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
    else if (d.do === 'fruitList') g.do('fruitList', { good: d.good, n: Math.min(FRUIT_STAND.stack, barn.free(g.s, d.good)) });
    else if (d.do === 'fruitCollect') g.do('fruitCollect');
    else if (d.do === 'roadmap') this.show('roadmap');
    else if (d.do === 'profiles') this.show('profiles');
    else if (d.do === 'stallList') g.do('stallList', { good: d.good, n: Math.min(STACK, barn.free(g.s, d.good)) });
    else if (d.do === 'stallCollect') g.do('stallCollect');
    else if (d.do === 'loadTruck') g.do('loadTruck', { good: d.good, n: Math.min(10, barn.free(g.s, d.good)) });
    else if (d.do === 'album') this.show('album');
    else if (d.do === 'claimQuest') g.do('claimQuest', { id: d.id });
    else if (d.do === 'claimWeekly') g.do('claimWeekly');
    else if (d.do === 'hurry') g.do('hurry', { id: this.open.arg });
    else if (d.do === 'sellGood') g.do('sellGood', { good: d.good, n: d.all ? undefined : 1 });
    else if (d.do === 'castLine') g.do('castLine', { bait: d.bait === '1' });
    else if (d.do === 'reelIn') g.do('reelIn');
    else if (d.do === 'collectFees') g.do('collectFees');
    else if (d.do === 'sendTruck') g.do('sendTruck');
    else if (d.do === 'collectTruck') g.do('collectTruck');
    else if (d.do === 'upgradeTruck') g.do('upgradeTruck');
    else if (d.do === 'claimGift') g.do('claimGift');
    else if (d.do === 'trade') g.do('trade', { id: d.id, accept: true });
    else if (d.do === 'decline') g.do('trade', { id: d.id, accept: false });
    else if (d.do === 'projects' || d.do === 'cart' || d.do === 'mail' || d.do === 'friends') this.show(d.do);
    else if (d.do === 'projectDeliver') g.do('projectDeliver');
    else if (d.do === 'buildProject') { this.close(); this.onBuild?.(d.kind); }
    else if (d.do === 'goRepair') { this.close(); this.onShowWay?.(d.kind); }
    else if (d.do === 'showWay') { this.close(); this.onShowWay?.(d.at); }
    else if (d.do === 'collectRent') g.do('collectRent');
    else if (d.do === 'upgradeHome') g.do('upgradeHome', { id: d.id });
    else if (d.do === 'fillCrate') g.do('fillCrate', { crate: +d.crate });
    else if (d.do === 'sendCart') { const r = g.do('sendCart'); if (r.ok) setTimeout(() => this.open?.kind === 'cart' && this.close(), 900); }
    else if (d.do === 'readLetter') showLetter(g, d.id);
    else if (d.do === 'discovery') showDiscovery(g, d.id);
    else if (d.do === 'gift') { this.back = { ...this.open }; this.show('gift', d.person); }
    else if (d.do === 'giveGood') { const r = g.do('gift', { person: d.person, good: d.good }); if (r.ok) this.show(this.back?.kind ?? 'friends', this.back?.arg); }
    else if (d.do === 'wishBuild') { this.close(); this.onBuildKind?.(d.kind); }
    else if (d.do === 'test') this.onTest?.(d.test);
    else if (d.do === 'photo') { this.close(); this.onPhoto?.(); }
    else if (d.do === 'setting') { if (d.key === 'lang') { setLanguage(d.value).then(() => this.render(), () => this.hud?.toast(t('Could not load Vietnamese. Check your connection.'), 'warn')); this.render(); } else g.do('setting', { key: d.key, value: d.value }); }
    else if (d.do === 'export' || d.do === 'newGame' || d.do === 'profile' || d.do === 'resetProfile') this.onSave?.(d.do, d.n);
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
    if (o.kind === 'roadmap') body = renderJourney(s);
    else if (o.kind === 'clinic') body = `<div class="clinic-staff">${iconHtml('clinic', '', 'family-art')}<h3>${t('The clinic is open!')}</h3><p>${t('Dr Hazel is the doctor, Marisol is the nurse, and Grace cares for animals in the back room.')}</p><p class="hint">${t('Four families brought the clinic home. The waiting room always has a chair for Ellis.')}</p><button class="btn wide" data-do="roadmap">${t('Roadmap')}</button></div>`;
    else if (o.kind === 'fruit_stand') {
      const st = s.fruitStand, spare = Object.entries(s.barn.items).filter(([g]) => GOODS[g]?.kind === 'fruit' && barn.free(s, g) > 0);
      body = `<p class="hint">${t('Orchard fruit sells for a little more here. A visitor buys one every thirty seconds.')}</p><div class="stall-slots">${st.items.map(it => `<div class="slot">${goodIcon(it.good)}<b>×${it.n}</b><small>${coinMark()} ${fruitPrice(it.good)}</small></div>`).join('')}</div>
        ${st.coins ? `<button class="btn primary wide" data-do="fruitCollect">${t('Collect {coins} coins', { coins: num(st.coins) })}</button>` : ''}
        <div class="goods-grid">${spare.map(([g]) => `<button class="good-tile" data-do="fruitList" data-good="${g}" ${st.items.length >= FRUIT_STAND.slots ? 'disabled' : ''}>${goodIcon(g)}<b>×${Math.min(FRUIT_STAND.stack, barn.free(s, g))}</b><small>${t(GOODS[g].name)} · ${coinMark()} ${fruitPrice(g)}</small></button>`).join('') || `<p class="empty">${t('Pick fruit from your orchard to stock the stand.')}</p>`}</div>`;
    }
    else if (o.kind === 'settings') body = renderSettings(s, this.profile ?? 1);
    else if (o.kind === 'profiles') body = renderProfiles(s, this.profile ?? 1);
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
        <div class="goods-grid">${items.map(([g, n]) => `<button class="good-tile" data-do="sellGood" data-good="${g}" ${barn.free(s, g) ? '' : 'disabled'}>${goodIcon(g)}<b>${num(n)}</b><small>${t('Sell')} · ${coinMark()} ${GOODS[g].value}${held[g] ? ` · ${t('{count} held', { count: held[g] })}` : ''}</small></button>`).join('') || `<p class="empty">${t('The barn is empty.')}</p>`}</div>`;
    } else if (o.kind === 'production') {
      const p = s.placed[o.arg]; if (!p) { this.close(); return; }
      title = t(BUILDINGS[p.kind].name); icon = p.kind;
      const q = queueOf(s, o.arg), ready = q.queue.filter(j => j.doneAt <= now).length, slotCost = SLOTS.cost[q.slots];
      const recipes = recipesAt(s, p.kind).map(r => { const def = RECIPES[r], can = barn.hasAll(s, def.needs);
        return `<button class="recipe ${can ? 'can' : ''}" data-do="produce" data-recipe="${r}">${goodIcon(r)}<b>${t(def.name)}${def.makes > 1 ? ` ×${def.makes}` : ''}</b><span class="needs">${goodsLine(s, def.needs)}</span><small>${glyph('clock', 'g')} ${shortTime(def.timeMs)}</small></button>`; }).join('');
      const queue = Array.from({ length: q.slots }, (_, i) => { const j = q.queue[i]; if (!j) return `<div class="slot empty"></div>`;
        const def = RECIPES[j.recipe], left = j.doneAt - now, k = left <= 0 ? 1 : Math.max(0, 1 - left / def.timeMs);
        return `<div class="slot ${left <= 0 ? 'ready' : ''}" style="--k:${k.toFixed(3)}">${goodIcon(j.recipe)}<small>${left <= 0 ? t('Ready') : shortTime(left)}</small></div>`; }).join('');
      const hurry = hurryLeft(s) > 0 && hurryable(s, o.arg, now) ? `<button class="btn ghost wide" data-do="hurry">${glyph('clock', 'g')} ${t('Hurry')}</button>` : '';
      body = `<div class="queue">${queue}${slotCost != null && q.slots < SLOTS.max ? `<button class="slot buy" data-do="buySlot">${glyph('plus', 'g')}<small>${coinMark()} ${num(slotCost)}</small></button>` : ''}</div>
        ${ready ? `<button class="btn primary wide" data-do="collectProducts">${t('Collect {count}', { count: ready })}</button>` : ''}${hurry}<div class="recipes">${recipes}</div>`;
    } else if (o.kind === 'quests') {
      const qs = questsOf(s), w = WEEKLY[s.weekly?.i ?? 0], wp = weeklyProgress(s), left = hurryLeft(s);
      const card = q => { const def = q.favour ? null : QUESTS[q.t], pr = progressOf(s, q), ok = questReady(s, q);
        const text = q.favour ? t('{name} would love {n} {good}', { name: nameOf(q.person), n: q.n, good: t(GOODS[q.good].name) }) : t(def.text, { n: q.n });
        return `<div class="goal ${ok ? 'ok' : ''}">${q.favour ? faceHtml(q.person) : iconHtml(def.icon, '', 'goal-icon')}<div class="goal-main"><b>${text}</b><i class="progress"><i style="width:${Math.round(pr / q.n * 100)}%"></i></i><small>${num(pr)}/${num(q.n)} · ${coinMark()} ${num(q.coins)} ${xpMark()} ${num(q.xp)}</small></div>
          <button class="btn primary small-btn" data-do="claimQuest" data-id="${q.id}" ${ok ? '' : 'disabled'}>${t('Claim')}</button></div>`; };
      body = `<p class="hint">${glyph('clock', 'g')} ${t('Free hurry today')}: <b>${left}</b> · ${t('tap a growing crop, tree or repair, then Hurry')}</p>
        ${qs.list.map(card).join('')}
        <div class="goal weekly ${s.weekly?.claimed ? 'done' : wp >= w.n ? 'ok' : ''}">${iconHtml(w.icon, '', 'goal-icon')}<div class="goal-main"><b>${t(w.text, { n: w.n })}</b><i class="progress"><i style="width:${Math.round(wp / w.n * 100)}%"></i></i><small>${num(wp)}/${num(w.n)} · ${coinMark()} ${num(WEEKLY_REWARD.coins)} · +1 ${t('hurry')}</small></div>
          <button class="btn orange small-btn" data-do="claimWeekly" ${!s.weekly?.claimed && wp >= w.n ? '' : 'disabled'}>${s.weekly?.claimed ? t('Done') : t('Claim')}</button></div>
        <p class="hint">${t('Goals finished')}: ${num(qs.done)}</p>`;
    } else if (o.kind === 'pond') {
      const f = fishingOf(s), line = f.line, left = line ? Math.max(0, line.doneAt - now) : 0, bait = barn.free(s, 'chicken_feed') > 0, fish = FISH_TABLE.filter(x => s.barn.items[x.id] > 0);
      const status = !line ? t('No line in the water') : left > 0 ? `${t('Waiting for a bite')} · ${shortTime(left)}` : t('A fish is biting!');
      body = `<p class="hint">${t('Cast a line and wait. Fishing villagers sit here and leave a little money.')}</p><p class="hint"><b>${status}</b></p>
        ${line && left <= 0 ? `<button class="btn primary wide" data-do="reelIn">${glyph('plus', 'g')} ${t('Reel in')}</button>` : ''}
        ${!line ? `<button class="btn orange wide" data-do="castLine">${t('Cast a line')}</button><button class="btn ghost wide" data-do="castLine" data-bait="1" ${bait ? '' : 'disabled'}>${iconHtml('chicken_feed', '', 'mini')} ${t('Cast with bait')} (${t('chicken feed')})</button>` : ''}
        ${f.coins ? `<button class="btn primary wide" data-do="collectFees">${t('Collect {coins} coins', { coins: num(f.coins) })}</button>` : ''}
        <div class="goods-grid">${fish.map(x => `<div class="good-tile">${goodIcon(x.id)}<b>${num(s.barn.items[x.id])}</b><small>${t(x.name)} · ${coinMark()} ${x.value}</small></div>`).join('')}</div>
        <p class="hint">${t('Sell fish with the market truck, or keep them for friends.')} (${num(f.caught)} ${t('caught')})</p>`;
    } else if (o.kind === 'market') {
      const tr = truckOf(s), why = blockedWhy(s), spare = Object.entries(s.barn.items).filter(([g, n]) => n > 0 && barn.free(s, g) > 0), next = tr.level < TRUCK.capacity.length;
      const status = tr.away ? `${t('The truck is on its way')} · ${shortTime(Math.max(0, tr.backAt - now))}` : why ? t(why) : `${t('Load')}: ${num(loadUnits(tr))}/${num(capacity(tr))} · ${coinMark()} ${num(Math.round(loadValue(tr) * TRUCK.pay))}`;
      body = `<p class="hint">${t('The truck drives goods to the market in town and comes back with more coins than they are worth.')}</p><p class="hint"><b>${status}</b></p>
        <div class="queue">${tr.load.map(i => `<div class="slot">${goodIcon(i.good)}<small>×${i.n}</small></div>`).join('')}</div>
        ${tr.coins ? `<button class="btn primary wide" data-do="collectTruck">${t('Collect {coins} coins', { coins: num(tr.coins) })}</button>` : ''}
        ${!tr.away && !why && tr.load.length ? `<button class="btn orange wide" data-do="sendTruck">${t('Send the truck')}</button>` : ''}
        ${next ? `<button class="btn ghost wide" data-do="upgradeTruck" ${s.level < TRUCK.level[tr.level] ? 'disabled' : ''}>${glyph('up', 'g')} ${t('Bigger truck')} · ${coinMark()} ${num(TRUCK.upgradeCost[tr.level])} · ${t('level {level}', { level: TRUCK.level[tr.level] })}</button>` : ''}
        ${!tr.away && !why ? `<div class="goods-grid">${spare.map(([g, n]) => `<button class="good-tile" data-do="loadTruck" data-good="${g}">${goodIcon(g)}<b>${num(n)}</b><small>${t(GOODS[g].name)} · ${coinMark()} ${GOODS[g].value}</small></button>`).join('')}</div>` : ''}`;
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
    return `<div class="order ${can ? 'can' : ''}${c.story ? ' story' : ''}"><div class="who">${faceHtml(c.from)}<div class="who-name"><b>${who ? nameOf(c.from) : ''}</b>${who ? heartBar(s, c.from) : ''}</div>
      <div class="reward">${coinMark()} <b>${num(c.coins)}</b> ${xpMark()} <b>${num(c.xp)}</b></div></div>
      <p class="line">${c.line ? t(c.line) : ''}</p>
      ${can ? '' : `<div class="order-plan">${planFor(s, c.need).map(st => `<button class="link plan-step" data-do="showWay" data-at="${st.at}">${goodIcon(st.good)} ${t(STEP_TEXT[st.how], { n: st.n, good: t(GOODS[st.good].name) })} ›</button>`).join('')}</div>`}
      <div class="order-row"><div class="needs">${goodsLine(s, c.need)}</div>
      <div class="order-buttons"><button class="btn primary small-btn" data-do="deliver" data-id="${c.id}" ${can ? '' : 'disabled'}>${t('Sell')}</button>${c.story ? '' : `<button class="btn ghost icon-only" data-do="discard" data-id="${c.id}" aria-label="${t('Discard')}">${glyph('trash', 'g')}</button>`}</div></div></div>`;
  }
}
/** How many orders can be filled right now (for the HUD badge). */
export const fillable = s => s.orders.cards.filter(c => barn.hasAll(s, c.need)).length;
