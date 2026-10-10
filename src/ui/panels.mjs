// Farm panels in a bottom sheet (DESIGN 8, 13, 7): the order board, the barn, a production building, the stall, the
// weekly cart, the mailbox, friends and gifts. One sheet at a time; it re-draws itself after every action while open.
// Opening a panel turns a page (sfx 'page'); its buttons click.
import { t, setLanguage } from '../kit/i18n.mjs';
import { sfx } from '../kit/sound.mjs';
import { GOODS } from '../content/goods.mjs';
import { FRUIT_STAND } from '../content/economy.mjs';
import * as barn from '../core/barn.mjs';
import { STACK } from '../core/stall.mjs';
import { goodHelpTarget } from '../core/good-help.mjs';
import { showDiscovery } from './discovery-panels.mjs';
import { showExplorationMemory } from './exploration-panels.mjs';
// Advice cards load with the panel renderers (this.renderer), which also carries their three actions: an advice card
// can only be on screen once that chunk is in, so its buttons act at once.
import { showLetter } from './bonds-panels.mjs';
import { showLandMemory } from './land-panel.mjs';
import { goodIcon, glyph, iconHtml } from './icon.mjs';
import { onModal } from './modal.mjs';

export { goodIcon };
/** Panels with nothing to count down. */
const STILL = new Set(['exploration', 'profiles', 'settings', 'album', 'friends', 'gift', 'mail', 'advice', 'learningMemory', 'schoolActivity', 'schoolMemory']);
export class Panels {
  constructor(root, game, hud, { onBuild, onShowWay, onSave, onBuildKind, onAdviceTarget, onExplorePlace, onGoodHelpSource, onGoodHelpReturn, onLandVisit, onLearningVisit, onTest, onPhoto } = {}) {
    Object.assign(this, { game, hud, open: null, onBuild, onShowWay, onSave, onBuildKind, onAdviceTarget, onExplorePlace, onGoodHelpSource, onGoodHelpReturn, onLandVisit, onLearningVisit, onTest, onPhoto });
    this.el = document.createElement('div'); this.el.className = 'sheet panel'; this.el.hidden = true;
    root.appendChild(this.el);
    this.returnEl = document.createElement('button'); this.returnEl.className = 'btn help-return'; this.returnEl.hidden = true;
    this.returnEl.addEventListener('click', () => this.returnFromHelp()); root.appendChild(this.returnEl);
    this.el.addEventListener('click', e => this.click(e));
    this.el.addEventListener('change', e => { if (e.target.matches('[data-range]')) this.game.do('setting', { key: e.target.dataset.range, value: e.target.value / 100 }); if (e.target.matches('[data-name]')) this.game.do('setting', { key: 'playerName', value: e.target.value }); if (e.target.matches('[data-file]')) this.onSave?.('import', e.target.files[0]); });
    game.on(() => { if (this.open && !this.holding()) this.render(); });
    onModal(open => { if (!open && this.open && !this.holding()) this.render(); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden && this.open && !this.holding()) this.render(); });
    // timers count down: only the panels that show a countdown redraw on the clock (a redraw replaces every control, which
    // would cut off a slider being dragged in Settings)
    // A deferred language refresh also finishes after editing ends, even when Settings has no game events.
    setInterval(() => { if (this.open && !document.hidden && (this.languageRefresh || !STILL.has(this.open.kind)) && !this.holding()) this.render(); }, 1000);
  }
  show(kind, arg) {
    const fresh = this.open?.kind !== kind || this.open?.arg !== arg;
    this.open = { kind, arg }; this.el.hidden = false; this.el.dataset.kind = kind; this.render();
    if (fresh) { sfx('page'); this.el.scrollTop = 0; this.el.classList.remove('pop'); void this.el.offsetWidth; this.el.classList.add('pop'); }
  }
  /** Preserve a held slider or an active name/IME composition when background farm events arrive. */
  holding() { return !!this.el.querySelector('input:active, input[data-name]:focus'); }
  close() { this.open = null; this.el.hidden = true; this.lift(); }
  /** Keep the HUD buttons above the sheet while it is open. */
  lift() {
    document.body.classList.toggle('panel-open', !!this.open); document.body.style.setProperty('--sheet-h', `${this.open ? this.el.offsetHeight : 0}px`);
    this.returnEl.hidden = !this.helpReturn || !!this.open;
    this.returnEl.textContent = t('Back to my request');
  }
  openGoodHelp(d, button) {
    if (!GOODS[d.good]) return;
    if (!this.helpReturn) this.helpReturn = { ...this.open, scroll: this.el.scrollTop, order: button?.closest('[data-order-id]')?.dataset.orderId };
    if (this.open?.kind === 'goodHelp') (this.helpTrail ??= []).push(this.open.arg);
    this.show('goodHelp', { good: d.good, needed: Math.max(1, Number(d.needed) || 1) });
  }
  returnFromHelp() {
    const origin = this.helpReturn; this.helpReturn = null; this.helpTrail = [];
    this.onGoodHelpReturn?.();
    this.show(origin?.kind ?? 'orders', origin?.arg);
    this.el.scrollTop = origin?.scroll ?? 0;
    if (origin?.order) [...this.el.querySelectorAll('[data-order-id]')].find(el => el.dataset.orderId === origin.order)?.scrollIntoView({ block: 'nearest' });
  }
  toggle(kind, arg) { this.open?.kind === kind && this.open.arg === arg ? this.close() : this.show(kind, arg); }
  click(e) {
    const b = e.target.closest('[data-do]'); if (!b || b.disabled) return;
    const d = b.dataset, g = this.game;
    sfx('click');
    if (d.do === 'close') this.close();
    else if (d.do === 'retryPanel') this.onSave?.('reload');
    else if (d.do === 'learning') this.show('learning');
    else if (d.do === 'learningVisit') { this.close(); this.onLearningVisit?.(); }
    else if (d.do === 'inspectLearning') g.do('inspectLearning');
    else if (d.do === 'answerRepairLesson') g.do('answerRepairLesson', { question: d.question, choice: d.choice });
    else if (d.do === 'workGardenProject') g.do('workGardenProject', { step: d.step });
    else if (d.do === 'restForProject') g.do('restForProject');
    else if (d.do === 'learningMemory') this.show('learningMemory', d.id);
    else if (d.do === 'schoolActivity') this.show('schoolActivity');
    else if (d.do === 'schoolBack') this.close();
    else if (d.do === 'schoolStart') g.do('startSchoolActivity', { difficulty: d.difficulty });
    else if (d.do === 'schoolAnswer') g.do('answerSchoolActivity', { question: d.question, choice: +d.choice });
    else if (d.do === 'schoolMemory') this.show('schoolMemory');
    else if (d.do === 'goodHelp') this.openGoodHelp(d, b);
    else if (d.do === 'goodHelpBack') { const previous = this.helpTrail?.pop(); previous ? this.show('goodHelp', previous) : this.returnFromHelp(); }
    else if (d.do === 'goodHelpReturn') this.returnFromHelp();
    else if (d.do === 'landVisit') { this.close(); this.onLandVisit?.(d.parcel); }
    else if (d.do === 'landBuy') { if (g.do('buyParcel', { parcel: d.parcel }).ok) this.onLandVisit?.(d.parcel); }
    else if (d.do === 'inspectLandDiscovery') { if (g.do('inspectLandDiscovery', { parcel: d.parcel }).ok) showLandMemory(g); }
    else if (d.do === 'landMemory') showLandMemory(g);
    else if (d.do === 'contracts') this.show('contracts');
    else if (d.do === 'shops') this.show('shops', d.shop);
    else if (d.do === 'villageGrowth') this.show('villageGrowth');
    else if (d.do === 'growthSite') this.onGrowthSite?.(d.kind);
    else if (d.do === 'growthPath') this.onGrowthPath?.(d.kind);
    else if (d.do === 'growthBuild') { this.close(); this.onBuild?.(d.kind); }
    else if (d.do === 'growthMemory') this.show('growthMemory', d.id);
    else if (d.do === 'growthMarket') this.show('market');
    else if (d.do === 'upgradeHospital') { if (g.do('upgradeHospital').ok) this.show('growthMemory', 'hospital'); }
    else if (d.do === 'chooseCompanyBrand') g.do(d.do, { brand: d.brand });
    else if (d.do === 'hireCompanyStaff') g.do(d.do, { role: d.role, person: d.person, building: d.building });
    else if (d.do === 'releaseCompanyStaff') g.do(d.do, { role: d.role });
    else if (d.do === 'companyBatch') g.do(d.do, { building: d.building, recipe: d.recipe, count: +d.count });
    else if (d.do === 'sendCompanyDelivery') g.do(d.do, { id: d.id });
    else if (d.do === 'shopVisit') this.onShopVisit?.(d.shop);
    else if (d.do === 'sellToShop' || d.do === 'changeShopRequest') g.do(d.do, { shop: d.shop, offer: d.offer });
    else if (d.do === 'acceptContract') g.do('acceptContract', { id: d.id });
    else if (d.do === 'deliverContract') { if (g.do('deliverContract', { id: d.id }).ok) { this.show('contractMemory', d.id); g.do('readContract', { id: d.id }); } }
    else if (d.do === 'contractMemory') { this.show('contractMemory', d.id); g.do('readContract', { id: d.id }); }
    else if (d.do === 'goodHelpSource') {
      const arg = this.open?.kind === 'goodHelp' ? this.open.arg : null;
      const target = arg && goodHelpTarget(g.s, arg.good, g.now, arg);
      if (target) { this.close(); this.onGoodHelpSource?.(target); }
      else this.render();
    }
    else if (d.do === 'back') this.show(this.back?.kind ?? 'friends', this.back?.arg);
    else if (d.do === 'deliver') g.do('deliverOrder', { id: d.id });
    else if (d.do === 'discard') g.do('discardOrder', { id: d.id });
    else if (d.do === 'upgradeBarn') g.do('upgradeBarn');
    else if (d.do === 'produce' || d.do === 'produceAll') g.do(d.do, { building: this.open.arg, recipe: d.recipe });
    else if (d.do === 'collectProducts') g.do('collectProducts', { building: this.open.arg });
    else if (d.do === 'buySlot') g.do('buySlot', { building: this.open.arg });
    else if (d.do === 'fruitList') g.do('fruitList', { good: d.good, n: Math.min(FRUIT_STAND.stack, barn.free(g.s, d.good)) });
    else if (d.do === 'fruitCollect') g.do('fruitCollect');
    else if (d.do === 'roadmap') this.show('roadmap');
    else if (d.do === 'notice') { const n = this.hud?.feed?.[+d.i]; if (n?.to) { if (typeof n.to === 'string') this.show(n.to); else { this.close(); n.to(); } } }
    else if (d.do === 'profiles') this.show('profiles');
    else if (d.do === 'adviceToday') this.show('today');
    else if (d.do === 'readAdvice') this.renderer?.openAdvice(this, d);
    else if (d.do === 'deferAdvice' || d.do === 'restoreAdvice') this.renderer?.changeAdvice(this, d.do, d);
    else if (d.do === 'showAdvice') this.renderer?.followAdvice(this, d);
    else if (d.do === 'stallList') g.do('stallList', { good: d.good, n: Math.min(STACK, barn.free(g.s, d.good)) });
    else if (d.do === 'stallCollect') g.do('stallCollect');
    else if (d.do === 'loadTruck') g.do('loadTruck', { good: d.good, n: Math.min(10, barn.free(g.s, d.good)) });
    else if (d.do === 'album') this.show('album');
    else if (d.do === 'claimQuest') g.do('claimQuest', { id: d.id });
    else if (d.do === 'claimWeekly') g.do('claimWeekly');
    else if (d.do === 'hurry') g.do('hurry', { id: this.open.arg });
    else if (d.do === 'sellGood') g.do('sellGood', { good: d.good, n: d.all ? undefined : Number(d.n) || 1 });
    else if (d.do === 'castLine') { if (this.onFishCast) { this.onFishCast(d.bait === '1'); this.render(); } else g.do('castLine', { bait: d.bait === '1' }); }
    else if (d.do === 'reelIn') {
      const r = g.do(d.start === '1' ? 'startReeling' : 'reelIn', { steady: d.steady === '1' });
      const feedback = this.el.querySelector('[data-reel-feedback]'); if (feedback) feedback.textContent = r.ok ? '' : t(r.reason);
      if (r.ok && d.start === '1') this.el.querySelector('[data-do="reelIn"]:not([data-steady]):not([data-start])')?.focus();
    }
    else if (d.do === 'hireHand' || d.do === 'releaseHand') g.do(d.do, { role: d.role });
    else if (d.do === 'collectFees') g.do('collectFees');
    else if (d.do === 'sendTruck') g.do('sendTruck');
    else if (d.do === 'fillTruck') g.do('fillTruck');
    else if (d.do === 'buyTruck') g.do('buyTruck');
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
    else if (d.do === 'readThanks') g.do('readThanks');
    else if (d.do === 'discovery') showDiscovery(g, d.id);
    else if (d.do === 'explorationPlace') { this.close(); this.onExplorePlace?.(d.place); }
    else if (d.do === 'inspectExploration') { if (g.do('inspectExploration', { step: d.step }).ok) showExplorationMemory(g, d.step); }
    else if (d.do === 'explorationRead') showExplorationMemory(g, d.step);
    else if (d.do === 'gift') { this.back = { ...this.open }; this.show('gift', d.person); }
    else if (d.do === 'giveGood') { const r = g.do('gift', { person: d.person, good: d.good }); if (r.ok) this.show(this.back?.kind ?? 'friends', this.back?.arg); }
    else if (d.do === 'wishBuild') { this.close(); this.onBuildKind?.(d.kind); }
    else if (d.do === 'test') this.onTest?.(d.test);
    else if (d.do === 'photo') { this.close(); this.onPhoto?.(); }
    else if (d.do === 'setting') { if (d.key === 'lang') { setLanguage(d.value).then(() => { if (this.holding()) this.languageRefresh = true; else this.render(); }, () => this.hud?.toast(t('Could not load this language. Check your connection.'), 'warn')); this.render(); } else g.do('setting', { key: d.key, value: d.value }); }
    else if (d.do === 'export' || d.do === 'newGame' || d.do === 'profile' || d.do === 'resetProfile') this.onSave?.(d.do, d.n);
  }
  /** The sheet's header: the panel's icon on a ribbon, its title and a close button (and Back for the gift picker). */
  head(title, icon) {
    const back = this.open?.kind === 'gift' ? `<button class="round small" data-do="back" aria-label="${t('Back')}">${glyph('undo', 'g')}</button>` : this.helpReturn && this.open?.kind !== 'goodHelp' ? `<button class="round small" data-do="goodHelpReturn" aria-label="${t('Back to my request')}">${glyph('undo', 'g')}</button>` : '';
    return `<div class="panel-head">${back}${iconHtml(icon, '', 'head-icon')}<h2>${title}</h2><button class="round small close" data-do="close" aria-label="${t('Close')}">${glyph('close', 'g')}</button></div>`;
  }
  render() {
    if (!this.open) return;
    this.languageRefresh = false;
    if (this.renderer) { this.renderer.renderPanel.call(this); return; }
    this.el.innerHTML = this.head(t('Opening…'), 'projects') + `<div class="panel-body"><p class="hint">${t(this.renderError ? 'Could not open this panel. Save your farm and reopen the game to try again.' : 'Opening…')}</p>${this.renderError ? `<button class="btn wide" data-do="retryPanel">${t('Save and reopen')}</button>` : ''}</div>`;
    this.lift();
    if (this.renderLoading || this.renderError) return;
    this.renderLoading = import('./panel-renderers.mjs').then(module => {
      this.renderLoading = null;
      this.renderer = module; module.holdToSell(this.el); this.render();
    }, () => {
      // A fresh document clears failed entry and dependency module records. Reopening is explicit and saves first.
      this.renderLoading = null;
      this.renderError = true; this.render();
    });
  }

}
/** How many orders can be filled right now (for the HUD badge). */
export const fillable = s => s.orders.cards.filter(c => barn.hasAll(s, c.need)).length;
