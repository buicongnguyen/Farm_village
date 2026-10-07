// The HUD (DESIGN 16): the level disc and the coin counter top left with the village's name under them, the village
// buttons down the right edge, the farm tools bottom right, and short messages (toasts) at the top.
// Toasts: the same message within 3 s bumps the one on screen instead of stacking, at most two show at once, and
// refusals that share a lock (params.lock: level, project, goods, max, garden) merge into one toast with a padlock.
// The coin counter rolls up to its new value with a pulse; the barn badge bounces when goods land.
import { t, num, getLanguage, setLanguage, onLanguageChange } from '../kit/i18n.mjs';
import { progress } from '../core/levels.mjs';
import { fillable } from './panels.mjs';
import { nextTask } from '../core/next.mjs';
import { rentWaiting } from '../core/homes.mjs';
import { questsOf, ready as questReady } from '../core/quests.mjs';
import { shortTime } from '../core/clock.mjs';
import { FISH_TABLE, GOODS } from '../content/goods.mjs';
const FISH_NAMES = Object.fromEntries(FISH_TABLE.map(f => [f.id, f.name]));
import { thingName } from './repair-ui.mjs';
import { BUILDINGS } from '../content/buildings.mjs';
import { used as barnUsed } from '../core/barn.mjs';
import * as barn from '../core/barn.mjs';
import { currentStep, stepReady, deliveredAll, mayBuild } from '../core/projects.mjs';
import { unread } from '../core/bonds.mjs';
import { cartHere } from '../core/cart.mjs';
import { NEIGHBOURS } from '../content/people.mjs';
import { VILLAGE_NAME } from '../content/story.mjs';
import { iconHtml, glyph } from './icon.mjs';
const NAMES = Object.fromEntries(NEIGHBOURS.map(n => [n.id, n.name]));
/** Translate a message's string parameters too (a family's name, a good), then the message. */
export const tParams = params => params && Object.fromEntries(Object.entries(params).map(([k, v]) => [k, typeof v === 'string' ? t(v) : v]));
const TOGGLED = ['orders', 'projects', 'today', 'friends'];   // the tutorial reveals these; build and barn are there from the start

export class Hud {
  constructor(root, game, { onBuild, onTurn, onPanel, onNext } = {}) {
    Object.assign(this, { game, onBuild, onTurn, onPanel, onNext, coins: game.s.coins, shown: game.s.coins, barnUsed: barnUsed(game.s), level: game.s.level });
    this.el = document.createElement('div'); this.el.className = 'hud';
    this.el.innerHTML = `
      <div class="hud-top"><div class="hud-stats"><div class="level" data-hud="level"><svg viewBox="0 0 36 36"><circle class="ring-bg" cx="18" cy="18" r="15"/><circle class="ring" cx="18" cy="18" r="15" pathLength="100"/></svg><b></b></div>
        <div class="pill coins" data-hud="coins">${iconHtml('ui:coin', '', 'pill-icon')}<b></b></div></div>
        <div class="village-name" data-hud="village"></div>
        <div class="hud-status" data-hud="status"></div></div>
      <div class="hud-topright"><button class="round small rim-grey" data-act="turn">${glyph('rotate', 'g')}</button><button class="round small rim-grey" data-act="settings">${glyph('settings', 'g')}</button></div>
      <div class="hud-right">
        <button class="round rim-blue" data-act="today">${glyph('today', 'g')}<i class="badge dot"></i></button>
        <button class="round rim-teal" data-act="projects">${glyph('projects', 'g')}<i class="badge dot"></i></button>
        <button class="round rim-pink" data-act="friends">${iconHtml('ui:heart', '', 'btn-icon')}</button>
        <button class="round rim-red" data-act="mail" hidden>${glyph('mail', 'g')}<i class="badge"></i></button>
      </div>
      <button class="next-chip" data-act="next" hidden></button>
      <div class="toasts" aria-live="polite"></div>
      <div class="hud-tools">
        <button class="round rim-grey lang" data-act="lang" hidden></button>
        <button class="round rim-red" data-act="barn">${iconHtml('ui:barn', '', 'btn-icon')}<i class="badge cap"></i></button>
        <button class="round rim-orange" data-act="orders">${iconHtml('ui:orders', '', 'btn-icon')}<i class="badge"></i></button>
        <button class="round big" data-act="build">${iconHtml('tool:build', '', 'btn-icon')}</button>
      </div>`;
    this.el.addEventListener('click', e => {
      const st = e.target.closest('[data-status]')?.dataset.status;
      if (st) { if (st === 'rent') this.game.do('collectRent'); else this.onPanel?.(st); return; }
      const act = e.target.closest('button')?.dataset.act; if (!act) return;
      if (act === 'next') { const n = this.nextTask; if (n) { if (n.do) this.game.do(...n.do); else if (n.way) this.onShowWay?.(n.way); else if (n.calm) this.toast(t('Everything is busy. Take a breath.'), 'info', { icon: 'ui:heart' }); else if (n.panel) this.onPanel?.(n.panel); else this.onNext?.(n); } return; }
      if (act === 'turn') onTurn?.();
      if (act === 'lang') setLanguage(getLanguage() === 'vi' ? 'en' : 'vi').catch(() => this.toast(t('Could not load Vietnamese. Check your connection.'), 'warn'));
      if (act === 'build') onBuild?.();
      if (['orders', 'barn', 'today', 'projects', 'album', 'settings', 'friends', 'mail'].includes(act)) onPanel?.(act);
    });
    root.appendChild(this.el);
    game.on(r => { this.update(); if (!r.ok && r.reason) this.refuse(r.reason, r.params); for (const e of r.events ?? []) this.event(e); });
    onLanguageChange(() => this.update());
    this.update(); setInterval(() => { this.refreshNext(); this.refreshStatus(); }, 1000);
  }
  update() {
    const s = this.game.s, p = progress(s), q = sel => this.el.querySelector(sel);
    q('[data-hud="level"] b').textContent = s.level;
    q('.ring').style.strokeDasharray = `${Math.round(p.ratio * 100)} 100`;
    if (s.level !== this.level) { this.level = s.level; this.pulse(q('[data-hud="level"]')); }
    this.rollCoins(s.coins);
    q('[data-hud="village"]').textContent = t(VILLAGE_NAME);
    q('[data-act="lang"]').textContent = getLanguage() === 'vi' ? 'EN' : 'VI';
    const label = { turn: 'Turn the view', lang: 'Language', build: 'Build', orders: 'Order board', barn: 'Barn', today: 'Today', album: 'Family album', settings: 'Settings',
      projects: 'Village projects', friends: 'Friends', mail: 'Mailbox' };
    for (const [act, text] of Object.entries(label)) q(`[data-act="${act}"]`)?.setAttribute('aria-label', t(text));
    this.refreshStatus();
    this.refreshNext();
    const can = fillable(s), badge = q('[data-act="orders"] .badge');
    badge.textContent = can || ''; badge.hidden = !can;
    q('[data-act="today"] .badge').hidden = !!s.today.claimed && !cartHere(s);
    const step = currentStep(s), canWork = step && stepReady(s, this.game.now).ok && (step.deliver ? !deliveredAll(s, step) && barn.hasAll(s, step.deliver, false) : step.builds.some(k => !['path', 'bed', 'fence', 'gate'].includes(k) && mayBuild(s, k).ok));
    q('[data-act="projects"] .badge').hidden = !canWork;
    const mail = unread(s), mailBtn = q('[data-act="mail"]');
    mailBtn.hidden = !mail; mailBtn.querySelector('.badge').textContent = mail;
    const used = barnUsed(s), cap = q('[data-act="barn"] .badge');
    cap.textContent = `${used}/${s.barn.cap}`; cap.classList.toggle('full', used >= s.barn.cap * 0.9);
    if (used > this.barnUsed) this.pulse(cap, 'bounce');
    this.barnUsed = used;
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
    if (e.type === 'repairStarted') this.toast(t('Repair started: {name}', { name: thingName(this.game.s, e.id) ?? '' }), 'info', { icon: 'wrench' });
    if (e.type === 'fishCaught') this.toast(t('Caught a {fish}!', { fish: t(FISH_NAMES[e.fish] ?? e.fish) }), 'good', { icon: e.fish });
    if (e.type === 'truckBack') this.toast(t('The truck is back with {coins} coins', { coins: num(e.coins) }), 'good', { icon: 'market' });
    if (e.type === 'repaired') this.toast(t('Repaired: {name}', { name: thingName(this.game.s, e.id) ?? '' }), 'good', { icon: 'wrench' });
    if (e.type === 'neighbourRepair') this.toast(t('{name} mended the {thing}!', { name: t(NAMES[e.id] ?? e.id), thing: thingName(this.game.s, e.target) ?? t(BUILDINGS[e.kind]?.name ?? '') }), 'good', { icon: 'wrench' });
    if (e.type === 'demolished') this.toast(t('Taken down: {name} (+{coins})', { name: t(BUILDINGS[e.kind]?.name ?? ''), coins: e.refund }), 'info', { icon: 'demolish' });
    if (e.type === 'houseUpgraded') this.toast(t('The farmhouse is now level {level}', { level: e.level }), 'good', { icon: 'home' });
    if (e.type === 'projectDone') this.toast(t('Project done: {name}', { name: t(e.name) }), 'good', { icon: 'projects' });
    if (e.type === 'helperDid') this.toast(t(e.who === 'june' ? 'June brought in {count} crops and sowed them again' : 'Pip fetched {count} eggs and milk', { count: e.count }), 'good', { icon: e.who === 'june' ? 'wheat' : 'egg' });
    if (e.type === 'questDone') this.toast(t('Goal done: {coins} coins', { coins: num(e.coins) }), 'good', { icon: 'ui:xp' });
    if (e.type === 'weeklyDone') this.toast(t('The village goal is done: {coins} coins and a hurry', { coins: num(e.coins) }), 'good', { icon: 'ui:xp' });
    if (e.type === 'festival') this.toast(t('The Hollowbrook festival! {coins} coins and a warm night', { coins: num(e.coins) }), 'good', { icon: 'ui:heart' });
    if (e.type === 'familyTip') this.toast(t('A family left a tip: {coins} coins', { coins: num(e.coins) }), 'good', { icon: 'ui:coin' });
    if (e.type === 'barnSold') this.toast(t('The barn is full: sold the extra for {coins} coins', { coins: num(e.coins) }), 'warn', { icon: 'ui:barn' });
    if (e.type === 'barnFull') this.toast(t('The barn is full: fill orders or upgrade it'), 'warn', { icon: 'ui:barn' });
    if (e.type === 'cartArrived') this.toast(t('The weekly cart is at the gate'), 'info', { icon: 'cart' });
    if (e.type === 'crateFilled' && e.by && e.by !== 'you') this.toast(t('{name} filled a crate on the cart', { name: t(NAMES[e.by] ?? e.by) }), 'good', { icon: 'crate' });
    if (e.type === 'cartSent') this.toast(t('The cart is off to market!'), 'good', { icon: 'cart' });
    if (e.type === 'charmMilestone') this.toast(t('Village charm {charm}!', { charm: e.at }), 'good', { icon: 'charm' });
    if (e.type === 'parcelBought') this.toast(t('New land is yours!'), 'good', { icon: 'sale_sign' });
    if (e.type === 'neighbourVisit') {
      // the visitor says it in a speech bubble when on screen; otherwise the line comes as a message (never both)
      const line = `${t(NAMES[e.id] ?? e.id)}: ${t(e.comment, tParams(e.params))}`;
      setTimeout(() => { if (!this.visibleVisitor(e.id)) this.toast(line, 'info', { icon: `person:${e.id}` }); }, 700);
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
    if (help && el) { el.classList.add('tappable'); el.onclick = () => { el.remove(); if (help[0] === 'plan') { const n = this.nextTask; if (n?.way) this.onShowWay?.(n.way); else this.onPanel?.('orders'); } else this.onPanel?.(help[0]); }; }
  }
  /** A short message. Options: icon (an icon id), group (messages of a group replace each other in one toast). */
  toast(text, kind = 'info', { icon = null, group = null } = {}) {
    const box = this.el.querySelector('.toasts'), now = performance.now();
    const same = [...box.children].find(el => !el.classList.contains('gone') && (el.dataset.text === text || (group && el.dataset.group === group)));
    if (same) {                                            // a repeat (or one of its group) refreshes the toast on screen
      same.dataset.text = text; same.querySelector('.msg').textContent = text; same.dataset.until = now + 2600;
      const n = +(same.dataset.n ?? 1) + 1; same.dataset.n = n; const c = same.querySelector('.count'); if (c) { c.textContent = `×${n}`; c.hidden = false; }
      this.pulse(same, 'bump'); return same;
    }
    const el = document.createElement('div');
    el.className = `toast ${kind}`; el.dataset.text = text; if (group) el.dataset.group = group; el.dataset.until = now + 2600;
    el.innerHTML = `${icon ? iconHtml(icon, '', 'toast-icon') : ''}<span class="msg"></span><i class="count" hidden></i>`;
    el.querySelector('.msg').textContent = text;
    box.appendChild(el);
    const live = [...box.children].filter(x => !x.classList.contains('gone'));
    while (live.length > 2) live.shift().remove();
    const check = () => { if (!el.isConnected) return; if (performance.now() < +el.dataset.until) { setTimeout(check, 200); return; } el.classList.add('gone'); setTimeout(() => el.remove(), 450); };
    setTimeout(check, 2600);
    return el;
  }
  setMode(mode) { this.el.dataset.mode = mode; }
  /** The status stack at the top left: the goal, the order board, rent, the truck and the pond, each a tap away. */
  refreshStatus() {
    const s = this.game.s, now = this.game.now, box = this.el.querySelector('[data-hud="status"]'), rows = [];
    const step = currentStep(s);
    if (step) rows.push({ act: 'projects', ic: glyph('projects', 'g'), text: t(s.mode === 'restore' && step.restore ? step.restore.split('.')[0] : step.name) });
    const qs = questsOf(s), qr = qs.list.filter(q => questReady(s, q)).length; rows.push({ act: 'quests', ic: iconHtml('ui:xp', '', 'mini'), text: `${t('Goals')}: ${qs.list.length}${qr ? ` · ${qr} ${t('ready')}` : ''}`, hot: qr > 0 });
    const can = fillable(s); rows.push({ act: 'orders', ic: iconHtml('ui:orders', '', 'mini'), text: `${t('Orders')}: ${s.orders.cards.length}${can ? ` · ${can} ${t('ready')}` : ''}`, hot: can > 0 });
    const rent = rentWaiting(s, now); if (rent >= 5) rows.push({ act: 'rent', ic: iconHtml('ui:coin', '', 'mini'), text: `${t('Rent')}: ${num(rent)}`, hot: true });
    const tr = s.truck; if (tr?.away) rows.push({ act: 'market', ic: iconHtml('truck', '', 'mini'), text: `${t('Truck')}: ${shortTime(Math.max(0, tr.backAt - now))}` });
    else if (tr?.coins) rows.push({ act: 'market', ic: iconHtml('truck', '', 'mini'), text: `${t('Truck')}: +${num(tr.coins)}`, hot: true });
    const line = s.fishing?.line; if (line) rows.push({ act: 'pond', ic: iconHtml('perch', '', 'mini'), text: line.doneAt <= now ? t('A fish is biting!') : `${t('Fishing')}: ${shortTime(line.doneAt - now)}`, hot: line.doneAt <= now });
    const html = rows.map(r => `<button class="status-row${r.hot ? ' hot' : ''}" data-status="${r.act}">${r.ic}<span>${r.text}</span></button>`).join('');
    if (box.dataset.html !== html) { box.innerHTML = html; box.dataset.html = html; }
  }
  /** The chip with the one most useful thing to do now; a tap goes there. */
  refreshNext() {
    const chip = this.el.querySelector('[data-act="next"]'), n = nextTask(this.game.s, this.game.now), s = this.game.s;
    chip.hidden = !n || s.story?.tutorial < 3 && s.mode === 'restore' || document.body.classList.contains('panel-open');
    if (!n) return; this.nextTask = n;
    const ic = ['wrench', 'today'].includes(n.icon) ? glyph(n.icon, 'g') : iconHtml(n.icon, '', 'mini'), html = `${ic} <b>${t('Next')}:</b> ${t(n.key, n.params ? { ...n.params, good: t(GOODS[n.params.good]?.name ?? n.params.good) } : undefined)}`;
    if (chip.dataset.html !== html) { chip.innerHTML = html; chip.dataset.html = html; }
  }
  /** Show only these village buttons (the tutorial unlocks them one by one); build, barn, turn, language, album and settings always show. */
  show(list) { for (const act of TOGGLED) { const b = this.el.querySelector(`[data-act="${act}"]`); if (b) b.hidden = !list.includes(act); } }
}
