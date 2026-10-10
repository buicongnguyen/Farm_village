// The HUD (DESIGN 16): the level disc and the coin counter top left with the village's name under them, the village
// buttons down the right edge, the farm tools bottom right, and short messages (toasts) at the top.
// Toasts: the same message within 3 s bumps the one on screen instead of stacking, at most two show at once, and
// refusals that share a lock (params.lock: level, project, goods, max, garden) merge into one toast with a padlock.
// The coin counter rolls up to its new value with a pulse; the barn badge bounces when goods land.
import { t, tParams, num, getLanguage, setLanguage, onLanguageChange, LANGUAGES } from '../kit/i18n.mjs';
import { progress } from '../core/levels.mjs';
import { fillable } from './panels.mjs';
import { journeyOf } from '../core/journey.mjs';
import { nextTask } from '../core/next.mjs';
import { shortTime } from '../core/clock.mjs';
import { hudStatus } from './hud-status.mjs';
import { FISH_TABLE, GOODS } from '../content/goods.mjs';
const FISH_NAMES = Object.fromEntries(FISH_TABLE.map(f => [f.id, f.name]));
// What a hired hand reports after its round: [words, icon] (the six roles of core/helpers.mjs).
const HAND_SAYS = { field: ['Your field hand brought in {count} crops and sowed them again', 'wheat'], animals: ['Your animal hand looked after {count} animals', 'egg'],
  workshop: ['Your workshop hand finished {count} batches and started them again', 'bread'], orchard: ['Your orchard hand picked {count} trees', 'cherry'],
  driver: ['Your driver did {count} truck jobs', 'truck'], fisher: ['Your fisher landed a fish', 'perch'] };
import { thingName } from './repair-ui.mjs';
import { BUILDINGS } from '../content/buildings.mjs';
import { used as barnUsed } from '../core/barn.mjs';
import * as barn from '../core/barn.mjs';
import { currentStep, stepReady, deliveredAll, mayBuild } from '../core/projects.mjs';
import { unread } from '../core/bonds.mjs';
import { unreadDiscoveries } from '../core/discoveries.mjs';
import { unreadExploration } from '../core/exploration.mjs';
import { unreadLandDiscovery } from '../core/land-discovery.mjs';
import { unreadContracts } from '../core/contracts.mjs';
import { unreadGrowth } from '../core/village-growth.mjs';
import { unreadLearning } from '../core/learning.mjs';
import { unreadSchool } from '../core/school-activity.mjs';
import { unreadAdvice } from '../core/advice.mjs';
import { NEIGHBOURS } from '../content/people.mjs';
import { VILLAGE_NAME } from '../content/story.mjs';
import { RUIN_NAMES } from '../content/world.mjs';
import { iconHtml, glyph } from './icon.mjs';
const NAMES = Object.fromEntries(NEIGHBOURS.map(n => [n.id, n.name]));
// Badge counts stay short on a phone (docs/HUD-STANDARD.md): 1..9, then "9+".
const cap9 = n => !n ? '' : n > 9 ? '9+' : String(n);
// Toast priority and how long each kind stays (docs/HUD-STANDARD.md): a warning outranks a reward, a reward outranks
// news, and a new message never pushes a higher one off screen while a lower one is there to go first.
const TOAST_RANK = { info: 0, good: 1, warn: 2 }, TOAST_MS = { info: 2400, good: 3000, warn: 4500 };
const TOGGLED = ['orders', 'projects', 'today', 'friends'];   // the tutorial reveals these; build and barn are there from the start

export class Hud {
  constructor(root, game, { onBuild, onTurn, onPanel, onNext } = {}) {
    Object.assign(this, { game, onBuild, onTurn, onPanel, onNext, coins: game.s.coins, shown: game.s.coins, barnUsed: barnUsed(game.s), level: game.s.level });
    this.el = document.createElement('div'); this.el.className = 'hud';
    this.el.innerHTML = `
      <div class="hud-top"><div class="hud-stats"><div class="level" data-hud="level"><svg viewBox="0 0 36 36"><circle class="ring-bg" cx="18" cy="18" r="15"/><circle class="ring" cx="18" cy="18" r="15" pathLength="100"/></svg><b></b></div>
        <div class="pill coins" data-hud="coins">${iconHtml('ui:coin', '', 'pill-icon')}<b></b></div></div>
        <button class="village-name hud-tracker" data-act="village" data-hud="village"><span class="tracker-name"></span><span class="tracker-goal"></span></button>
        <div class="hud-status" data-hud="status"></div></div>
      <div class="hud-topright"><button class="round small rim-grey" data-act="explore">${glyph('explore', 'g')}</button><button class="round small rim-grey" data-act="turn">${glyph('rotate', 'g')}</button><button class="round small rim-grey" data-act="settings">${glyph('settings', 'g')}</button></div>
      <div class="hud-right">
        <button class="round rim-blue" data-act="today">${iconHtml('ui:today', '', 'btn-icon')}<i class="badge dot"></i></button>
        <button class="round rim-pink" data-act="friends">${iconHtml('ui:heart', '', 'btn-icon')}</button>
      </div>
      <button class="next-chip" data-act="next" hidden></button>
      <div class="toasts" aria-live="polite"></div>
      <div class="hud-tools">
        <button class="round rim-grey lang" data-act="lang" hidden></button>
        <button class="round rim-red" data-act="barn">${iconHtml('ui:barn', '', 'btn-icon')}<i class="badge cap"></i></button>
        <button class="round rim-orange" data-act="orders">${iconHtml('ui:orders', '', 'btn-icon')}<i class="badge ready"></i></button>
        <button class="round big" data-act="build">${iconHtml('tool:build', '', 'btn-icon')}</button>
      </div>`;
    this.el.addEventListener('click', e => {
      const st = e.target.closest('[data-status]')?.dataset.status;
      if (st) { if (st === 'rent') this.game.do('collectRent'); else this.onPanel?.(st === 'marketday' ? 'barn' : st); return; }
      const act = e.target.closest('button')?.dataset.act; if (!act) return;
      if (act === 'village') { this.onPanel?.('roadmap'); return; }
      if (act === 'next') { const n = this.nextTask; if (n) { if (n.do) this.game.do(...n.do); else if (n.way) this.onShowWay?.(n.way); else if (n.calm) this.toast(t('Everything is busy. Take a breath.'), 'info', { icon: 'ui:heart' }); else if (n.panel) this.onPanel?.(n.panel); else this.onNext?.(n); } return; }
      if (act === 'turn') onTurn?.();
      if (act === 'explore') this.onExplore?.();
      if (act === 'lang') setLanguage(LANGUAGES[(LANGUAGES.findIndex(lang => lang.id === getLanguage()) + 1) % LANGUAGES.length].id).catch(() => this.toast(t('Could not load this language. Check your connection.'), 'warn'));
      if (act === 'build') onBuild?.();
      if (['orders', 'barn', 'today', 'projects', 'album', 'settings', 'profiles', 'friends', 'mail'].includes(act)) onPanel?.(act);
    });
    root.appendChild(this.el);
    game.on(r => { this.update(); if (!r.ok && r.reason) this.refuse(r.reason, r.params); for (const e of r.events ?? []) this.event(e); });
    onLanguageChange(() => { this.el.querySelector('.toasts').replaceChildren(); this.update(); });
    window.addEventListener('resize', () => this.refreshStatus());
    new MutationObserver(() => this.refreshStatus()).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    this.update(); setInterval(() => { this.refreshNext(); this.refreshStatus(); this.refreshTodayMessages(); }, 1000);
  }
  update() {
    const s = this.game.s, p = progress(s), q = sel => this.el.querySelector(sel);
    q('[data-hud="level"] b').textContent = s.level;
    q('.ring').style.strokeDasharray = `${Math.round(p.ratio * 100)} 100`;
    if (s.level !== this.level) { this.level = s.level; this.pulse(q('[data-hud="level"]')); }
    this.rollCoins(s.coins);
    const journey = journeyOf(s);
    const goal = `${t(journey.stage.goal)}${journey.total ? ` · ${journey.done}/${journey.total}` : ''}`;
    q('[data-hud="village"]').setAttribute('aria-label', `${t('Roadmap')}: ${t(journey.stage.name)} · ${goal}`);
    q('[data-hud="village"]').title = `${t(journey.stage.name)} · ${goal}`;
    q('.tracker-name').textContent = t(VILLAGE_NAME);
    q('.tracker-goal').textContent = goal;
    q('[data-hud="coins"]').setAttribute('aria-label', `${t('Coins')}: ${num(s.coins)}`);
    q('[data-hud="coins"]').title = num(s.coins);
    q('[data-act="lang"]').textContent = LANGUAGES[(LANGUAGES.findIndex(lang => lang.id === getLanguage()) + 1) % LANGUAGES.length].id.toUpperCase();
    // farm profiles are chosen on the main menu (main.mjs) only
    const label = { explore: 'Explore', turn: 'Turn the view', lang: 'Language', build: 'Build', orders: 'Order board', barn: 'Barn', today: 'Today', album: 'Family album', settings: 'Settings',
      projects: 'Village projects', friends: 'Friends', mail: 'Mailbox' };
    for (const [act, text] of Object.entries(label)) {
      const button = q(`[data-act="${act}"]`); if (!button) continue;
      button.setAttribute('aria-label', t(text)); button.title = t(text);
      if (button.closest('.hud-right, .hud-tools') && act !== 'lang') {
        let caption = button.querySelector('.hud-label');
        if (!caption) { caption = document.createElement('span'); caption.className = 'hud-label'; caption.setAttribute('aria-hidden', 'true'); button.appendChild(caption); }
        caption.textContent = t(act === 'projects' ? 'Projects' : act === 'orders' ? 'Orders' : text);
      }
    }
    q('[data-act="explore"]').hidden = s.story?.tutorial < 3 && s.mode === 'restore';   // not during the first steps (like the Next chip)
    this.refreshStatus();
    this.refreshNext();
    const can = fillable(s), badge = q('[data-act="orders"] .badge');
    badge.textContent = cap9(can); badge.hidden = !can;
    q('[data-act="orders"]').setAttribute('aria-label', `${t('Order board')}: ${s.orders.cards.length}${can ? ` · ${can} ${t('ready')}` : ''}`);
    this.refreshTodayMessages();
    const step = currentStep(s), canWork = step && stepReady(s, this.game.now).ok && (step.deliver ? !deliveredAll(s, step) && barn.hasAll(s, step.deliver, false) : step.builds.some(k => !['path', 'bed', 'fence', 'gate'].includes(k) && mayBuild(s, k).ok));
    if (!!canWork !== this.canWork) { this.canWork = !!canWork; this.refreshStatus(); }   // Projects is a pill beside Goals, lit when a step is ready
    const used = barnUsed(s), cap = q('[data-act="barn"] .badge');
    cap.textContent = `${used}/${s.barn.cap}`; cap.classList.toggle('full', used >= s.barn.cap * 0.9);
    if (used > this.barnUsed) this.pulse(cap, 'bounce');
    this.barnUsed = used;
  }
  /** A completed timer can change a topic without a resource event; keep the unread count current too. */
  refreshTodayMessages() {
    const messages = unreadLearning(this.game.s) + unreadSchool(this.game.s) + unreadGrowth(this.game.s) + unreadDiscoveries(this.game.s) + unreadExploration(this.game.s) + unreadLandDiscovery(this.game.s) + unreadContracts(this.game.s) + unreadAdvice(this.game.s, this.game.now);
    const button = this.el.querySelector('[data-act="today"]'), badge = button.querySelector('.badge');
    badge.textContent = cap9(messages); badge.classList.remove('dot'); badge.hidden = !messages;
    button.setAttribute('aria-label', messages ? t('Today · {count} unread messages', { count: messages }) : t('Today'));
    if (messages) button.hidden = false;
  }
  /** Roll the coin counter from what it shows to `to` (about 0.9 s), with a pulse. */
  rollCoins(to) {
    const b = this.el.querySelector('[data-hud="coins"] b');
    if (to === this.coins) { if (!this.rolling) b.textContent = num(to); return; }
    this.coins = to;
    const from = this.shown, t0 = performance.now(), ms = Math.abs(to - from) < 3 ? 250 : 900, quiet = document.body.classList.contains('reduced-motion');
    if (quiet) { this.shown = to; b.textContent = num(to); return; }
    this.pulse(this.el.querySelector('[data-hud="coins"]'), to > from ? 'gain' : 'spend');
    const step = now => {
      const k = Math.min(1, (now - t0) / ms), e = 1 - (1 - k) ** 3;
      this.shown = Math.round(from + (to - from) * e); b.textContent = num(this.shown);
      if (k < 1 && this.coins === to) this.rolling = requestAnimationFrame(step); else this.rolling = 0;
    };
    cancelAnimationFrame(this.rolling); this.rolling = requestAnimationFrame(step);
  }
  pulse(el, cls = 'pulse') { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
  event(e) {
    if (e.type === 'repairLearned') this.toast(t('Garden repairs learned'), 'good', { icon: 'wrench' });
    if (e.type === 'gardenProject' && e.complete) this.toast(t('The potting bench is ready! A new crop to try.'), 'good', { icon: 'strawberry', to: 'projects' });
    if (e.type === 'schoolRoundCompleted' && e.first) this.toast(t('Your first basket game: a new memory for the album!'), 'good', { icon: 'school', to: 'album' });
    // repairStarted: no toast (docs/HUD-STANDARD.md): the scaffolding and its timer already show it in the world.
    if (e.type === 'fishCaught') this.toast(t('Caught a {fish}!', { fish: t(FISH_NAMES[e.fish] ?? e.fish) }), 'good', { icon: e.fish, to: 'pond' });
    if (e.type === 'truckBack') this.toast(t('The truck is back with {coins} coins', { coins: num(e.coins) }), 'good', { icon: 'market', to: 'market' });
    if (e.type === 'marketDayStarted') this.toast(t('Market day! {good} pays double', { good: t(GOODS[e.good]?.name ?? e.good) }), 'good', { icon: e.good, to: 'barn' });
    if (e.type === 'marketDaySale' && e.first) this.toast(t('Sold on market day: double coins!'), 'good', { icon: 'ui:coin', to: 'barn' });
    if (e.type === 'truckBought') this.toast(t('A new truck is parked at the market'), 'good', { icon: 'truck', to: 'market' });
    if (e.type === 'repaired') this.toast(t('Repaired: {name}', { name: thingName(this.game.s, e.id) ?? '' }), 'good', { icon: 'wrench' });
    if (e.type === 'neighbourRepair') this.toast(t('{name} mended the {thing}!', { name: t(NAMES[e.id] ?? e.id), thing: thingName(this.game.s, e.target) ?? t(BUILDINGS[e.kind]?.name ?? '') }), 'good', { icon: 'wrench' });
    if (e.type === 'ruinCleared') this.toast(t('{name} is cleared away', { name: t(RUIN_NAMES[e.kind] ?? '') }), 'info', { icon: 'demolish' });
    if (e.type === 'demolished') this.toast(t('Taken down: {name} (+{coins})', { name: t(BUILDINGS[e.kind]?.name ?? ''), coins: e.refund }), 'info', { icon: 'demolish' });
    if (e.type === 'houseUpgraded') this.toast(t('The farmhouse is now level {level}', { level: e.level }), 'good', { icon: 'home' });
    if (e.type === 'projectDone') this.toast(t('Project done: {name}', { name: t(e.name) }), 'good', { icon: 'projects', to: 'projects' });
    if (e.type === 'ruinTidied') this.toast(t('{name} is tidied up. The village looks loved.', { name: t(RUIN_NAMES[e.kind]) }), 'good', { icon: 'ui:heart', to: 'projects' });
    if (e.type === 'handDid') this.toast(t(HAND_SAYS[e.role]?.[0] ?? HAND_SAYS.workshop[0], { count: e.count }), 'good', { icon: HAND_SAYS[e.role]?.[1] ?? 'bread', group: 'hand-' + e.role });
    if (e.type === 'helperDid') this.toast(t(e.who === 'june' ? '{person:june:short} brought in {count} crops and sowed them again' : '{person:pip:short} fetched {count} eggs and milk', { count: e.count }), 'good', { icon: e.who === 'june' ? 'wheat' : 'egg' });
    if (e.type === 'questDone') this.toast(t('Goal done: {coins} coins', { coins: num(e.coins) }), 'good', { icon: 'ui:xp', to: 'quests' });
    if (e.type === 'weeklyDone') this.toast(t('The village goal is done: {coins} coins and a hurry', { coins: num(e.coins) }), 'good', { icon: 'ui:xp', to: 'quests' });
    if (e.type === 'festival') this.toast(t('The Hollowbrook festival! {coins} coins and a warm night', { coins: num(e.coins) }), 'good', { icon: 'ui:heart', to: 'today' });
    if (e.type === 'familyTip') this.toast(t('A family left a tip: {coins} coins', { coins: num(e.coins) }), 'good', { icon: 'ui:coin' });
    if (e.type === 'barnSold') this.toast(t('The barn is full: sold the extra for {coins} coins', { coins: num(e.coins) }), 'warn', { icon: 'ui:barn', to: 'barn' });
    if (e.type === 'barnFull') this.toast(t('The barn is full: fill orders or upgrade it'), 'warn', { icon: 'ui:barn', to: 'barn' });
    if (e.type === 'cartArrived') this.toast(t('The market cart is at the gate'), 'info', { icon: 'cart', to: 'cart' });
    if (e.type === 'crateFilled' && e.by && e.by !== 'you') this.toast(t('{name} filled a crate on the cart', { name: t(NAMES[e.by] ?? e.by) }), 'good', { icon: 'crate', to: 'cart' });
    if (e.type === 'cartSent') this.toast(t('The cart is off to market!'), 'good', { icon: 'cart', to: 'cart' });
    if (e.type === 'charmMilestone') this.toast(t('Village charm {charm}!', { charm: e.at }), 'good', { icon: 'charm', to: 'friends' });
    if (e.type === 'parcelBought') this.toast(t('New land is yours!'), 'good', { icon: 'sale_sign' });
    if (e.type === 'neighbourVisit') {
      // the visitor says it in a speech bubble when on screen; otherwise the line comes as a message (never both)
      setTimeout(() => {
        if (!this.visibleVisitor(e.id)) this.toast(`${t(NAMES[e.id] ?? e.id)}: ${t(e.comment, tParams(e.params))}`, 'info', { icon: `person:${e.id}`, to: 'friends' });
      }, 700);
    }
  }
  /** Is this neighbour walking on screen right now (people-view's visitor)? */
  visibleVisitor(id) {
    const w = this.people?.walkers?.get(`visit:${id}`); if (!w || !this.people.screenOf) return false;
    const p = this.people.screenOf(w); return p.x > 0 && p.y > 0 && p.x < innerWidth && p.y < innerHeight;
  }
  /** A refused action's reason as a toast; refusals that share a lock merge into one. */
  refuse(reason, params) {
    const lock = params?.lock;
    // a refusal says how to get past it: a tap on the toast goes where the missing thing comes from
    const help = reason === 'Not enough coins' ? ['orders', 'Fill orders to earn coins'] : lock === 'level' || /^Reach level/.test(reason) ? ['quests', 'Goals give XP'] :
      /Missing goods|No feed|Nothing to plant/.test(reason) ? ['plan', 'See what to do'] : null;
    const el = this.toast(help ? `${t(reason, tParams(params))} · ${t(help[1])} ›` : t(reason, tParams(params)), 'warn', { icon: lock ? 'lock' : null, group: lock ? `lock:${lock}` : `warn:${reason}` });
    if (help && el) { el.dataset.until = performance.now() + 5000; el.classList.add('tappable'); el.onclick = () => { el.remove(); if (help[0] === 'plan') { const n = this.nextTask; if (n?.way) this.onShowWay?.(n.way); else this.onPanel?.('orders'); } else this.onPanel?.(help[0]); }; }
  }
  /** A short message. Options: icon (an icon id), group (messages of a group replace each other in one toast). */
  /** Open a notice's detail: a panel kind, or a function. */
  go(to) { if (typeof to === 'function') to(); else if (to) this.onPanel?.(to); }
  toast(text, kind = 'info', { icon = null, group = null, to = null } = {}) {
    const feed = (this.feed ??= []), top = feed[0];   // the last notices, for Today's Recent list
    if (top && (top.text === text || (group && top.group === group))) Object.assign(top, { text, at: Date.now() }); else { feed.unshift({ text, kind, icon, group, to, at: Date.now() }); feed.length = Math.min(feed.length, 20); }
    const box = this.el.querySelector('.toasts'), now = performance.now();
    const same = [...box.children].find(el => !el.classList.contains('gone') && (el.dataset.text === text || (group && el.dataset.group === group)));
    if (same) {                                            // a repeat (or one of its group) refreshes the toast on screen
      same.dataset.text = text; same.querySelector('.msg').textContent = text; same.dataset.until = now + (TOAST_MS[kind] ?? 2600);
      const n = +(same.dataset.n ?? 1) + 1; same.dataset.n = n; const c = same.querySelector('.count'); if (c) { c.textContent = `×${n}`; c.hidden = false; }
      this.pulse(same, 'bump'); return same;
    }
    const el = document.createElement('div');
    el.className = `toast ${kind}`; el.dataset.text = text; if (group) el.dataset.group = group; el.dataset.until = now + (TOAST_MS[kind] ?? 2600);
    el.innerHTML = `${icon ? iconHtml(icon, '', 'toast-icon') : ''}<span class="msg"></span><i class="count" hidden></i>${to ? '<b class="go">›</b>' : ''}`;
    if (to) { el.classList.add('tappable'); el.dataset.until = now + 5000; el.onclick = () => { el.remove(); this.go(to); }; }
    el.querySelector('.msg').textContent = text;
    box.appendChild(el);
    const live = [...box.children].filter(x => !x.classList.contains('gone')), rank = x => TOAST_RANK[[...x.classList].find(c => c in TOAST_RANK)] ?? 0;
    while (live.length > 2) {   // two at most: the lowest-priority, oldest one makes room
      const out = live.reduce((low, x) => rank(x) < rank(low) ? x : low, live[0]); live.splice(live.indexOf(out), 1); out.remove();
    }
    const check = () => { if (!el.isConnected) return; if (performance.now() < +el.dataset.until) { setTimeout(check, 200); return; } el.classList.add('gone'); setTimeout(() => el.remove(), 450); };
    setTimeout(check, 2600);
    return el;
  }
  setMode(mode) { this.el.dataset.mode = mode; this.refreshStatus(); }
  /** Compact destinations; updating a timer preserves the focused button instead of rebuilding the whole stack. */
  refreshStatus() {
    const box = this.el.querySelector('[data-hud="status"]'), rows = hudStatus(this.game.s, this.game.now, { project: true, canWork: this.canWork });
    for (const old of [...box.children]) if (!rows.some(r => r.act === old.dataset.status)) old.remove();
    for (const row of rows) {
      let button = box.querySelector(`[data-status="${row.act}"]`);
      if (!button) { button = document.createElement('button'); button.dataset.status = row.act; button.innerHTML = `${iconHtml(row.icon, '', 'mini')}<span class="status-copy"><b></b><small></small></span><i class="badge ready" hidden></i>`; box.appendChild(button); }
      if (row.act === 'projects' || row.act === 'mail') button.dataset.act = row.act;   // the tutorial's hand and old links find them here
      const detail = row.text != null ? t(row.text) : row.coins != null ? `+${num(row.coins)}` : row.ms != null ? row.hot ? t('ready') : `${row.count > 1 ? `${row.count} · ` : ''}${shortTime(row.ms)}` : num(row.count);
      const label = `${t(row.label)}: ${detail}${row.ready ? ` · ${row.ready} ${t('ready')}` : ''}`;
      button.className = `status-row${row.hot || row.ready || row.lit ? ' hot' : ''}`;
      if (row.act === 'marketday' && button.dataset.icon !== row.icon) { button.dataset.icon = row.icon; button.firstElementChild.outerHTML = iconHtml(row.icon, '', 'mini'); }   // the good changes from one market day to the next
      button.querySelector('b').textContent = t(row.label); button.querySelector('small').textContent = detail;
      const badge = button.querySelector('.badge'); badge.textContent = cap9(row.ready); badge.hidden = !row.ready;
      button.setAttribute('aria-label', label); button.title = row.act === 'pond' && row.hot ? t('A fish is biting!') : label;
    }
    this.el.style.setProperty('--hud-stack-bottom', `${Math.ceil(this.el.querySelector('.hud-top').getBoundingClientRect().bottom)}px`);
  }
  /** The chip with the one most useful thing to do now; a tap goes there. */
  refreshNext() {
    const chip = this.el.querySelector('[data-act="next"]'), n = nextTask(this.game.s, this.game.now), s = this.game.s;
    chip.hidden = !n || s.story?.tutorial < 3 && s.mode === 'restore' || document.body.classList.contains('panel-open');
    if (!n) return; this.nextTask = n;
    const ic = n.icon === 'wrench' ? glyph(n.icon, 'g') : iconHtml(n.icon, '', 'mini'), html = `${ic} <b>${t('Next')}:</b><span class="next-copy">${t(n.key, n.params ? { ...n.params, good: t(GOODS[n.params.good]?.name ?? n.params.good) } : undefined)}</span>`;
    if (chip.dataset.html !== html) { chip.innerHTML = html; chip.dataset.html = html; }
  }
  /** Show only these village buttons (the tutorial unlocks them one by one); build, barn, turn, language, album and settings always show. */
  show(list) { for (const act of TOGGLED) { const b = this.el.querySelector(`[data-act="${act}"]`); if (b) b.hidden = !list.includes(act) && !(act === 'today' && (unreadDiscoveries(this.game.s) + unreadExploration(this.game.s) + unreadAdvice(this.game.s, this.game.now))); } }
}
