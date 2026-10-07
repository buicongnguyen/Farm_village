// The HUD (DESIGN 16): level ring and coins top left, tools bottom right, short messages (toasts) at the top.
import { t, num, getLanguage, setLanguage, onLanguageChange } from '../kit/i18n.mjs';
import { progress } from '../core/levels.mjs';
import { fillable } from './panels.mjs';
import { used as barnUsed } from '../core/barn.mjs';
import * as barn from '../core/barn.mjs';
import { currentStep, stepReady, deliveredAll, mayBuild } from '../core/projects.mjs';
import { NEIGHBOURS } from '../content/people.mjs';
const NAMES = Object.fromEntries(NEIGHBOURS.map(n => [n.id, n.name]));

export class Hud {
  constructor(root, game, { onBuild, onTurn, onPanel } = {}) {
    Object.assign(this, { game, onBuild, onTurn, onPanel, buttons: new Map() });
    this.el = document.createElement('div'); this.el.className = 'hud';
    this.el.innerHTML = `
      <div class="hud-top"><div class="level" data-hud="level"><svg viewBox="0 0 36 36"><circle class="ring-bg" cx="18" cy="18" r="15"/><circle class="ring" cx="18" cy="18" r="15" pathLength="100"/></svg><b></b></div>
        <div class="pill coins" data-hud="coins">🪙 <b></b></div></div>
      <div class="hud-right"><button class="round" data-act="today">📅<i class="badge dot"></i></button><button class="round" data-act="projects">🏛<i class="badge dot"></i></button><button class="round" data-act="album">📖</button><button class="round" data-act="settings">⚙</button></div>
      <div class="toasts" aria-live="polite"></div>
      <div class="hud-tools">
        <button class="round" data-act="turn">⟳</button>
        <button class="round" data-act="lang"></button>
        <button class="round" data-act="barn">🏚<i class="badge cap"></i></button>
        <button class="round" data-act="orders">📋<i class="badge"></i></button>
        <button class="round big" data-act="build">🔨</button>
      </div>`;
    this.el.addEventListener('click', e => {
      const act = e.target.closest('button')?.dataset.act; if (!act) return;
      if (act === 'turn') onTurn?.();
      if (act === 'lang') setLanguage(getLanguage() === 'vi' ? 'en' : 'vi');
      if (act === 'build') onBuild?.();
      if (['orders', 'barn', 'today', 'projects', 'album', 'settings'].includes(act)) onPanel?.(act);
    });
    root.appendChild(this.el);
    game.on(r => { this.update(); if (!r.ok && r.reason) this.toast(t(r.reason, r.params), 'warn'); for (const e of r.events ?? []) this.event(e); });
    onLanguageChange(() => this.update());
    this.update();
  }
  update() {
    const s = this.game.s, p = progress(s);
    this.el.querySelector('[data-hud="level"] b').textContent = s.level;
    this.el.querySelector('.ring').style.strokeDasharray = `${Math.round(p.ratio * 100)} 100`;
    this.el.querySelector('[data-hud="coins"] b').textContent = num(s.coins);
    this.el.querySelector('[data-act="lang"]').textContent = getLanguage() === 'vi' ? 'EN' : 'VI';
    this.el.querySelector('[data-act="turn"]').setAttribute('aria-label', t('Turn the view'));
    this.el.querySelector('[data-act="lang"]').setAttribute('aria-label', t('Language'));
    this.el.querySelector('[data-act="build"]').setAttribute('aria-label', t('Build'));
    this.el.querySelector('[data-act="orders"]').setAttribute('aria-label', t('Order board'));
    this.el.querySelector('[data-act="barn"]').setAttribute('aria-label', t('Barn'));
    const can = fillable(s), badge = this.el.querySelector('[data-act="orders"] .badge');
    badge.textContent = can || ''; badge.hidden = !can;
    this.el.querySelector('[data-act="today"]').setAttribute('aria-label', t('Today'));
    this.el.querySelector('[data-act="album"]').setAttribute('aria-label', t('Family album'));
    this.el.querySelector('[data-act="settings"]').setAttribute('aria-label', t('Settings'));
    this.el.querySelector('[data-act="projects"]').setAttribute('aria-label', t('Village projects'));
    this.el.querySelector('[data-act="today"] .badge').hidden = !!s.today.claimed;
    const step = currentStep(s), canWork = step && stepReady(s, this.game.now).ok && (step.deliver ? !deliveredAll(s, step) && barn.hasAll(s, step.deliver, false) : step.builds.some(k => !['path', 'bed', 'fence', 'gate'].includes(k) && mayBuild(s, k).ok));
    this.el.querySelector('[data-act="projects"] .badge').hidden = !canWork;
    const used = barnUsed(s), cap = this.el.querySelector('[data-act="barn"] .badge');
    cap.textContent = `${used}/${s.barn.cap}`; cap.classList.toggle('full', used >= s.barn.cap * 0.9);
  }
  event(e) {
    if (e.type === 'levelUp') this.toast(t('Level {level}!', { level: e.level }), 'good');
    if (e.type === 'projectDone') this.toast(t('Project done: {name}', { name: t(e.name) }), 'good');
    if (e.type === 'barnFull') this.toast(t('The barn is full: fill orders or upgrade it'), 'warn');
    if (e.type === 'neighbourVisit') this.toast(`${t(NAMES[e.id] ?? e.id)}: ${t(e.comment)}`, 'info');
  }
  toast(text, kind = 'info') {
    const box = this.el.querySelector('.toasts'), el = document.createElement('div');
    el.className = `toast ${kind}`; el.textContent = text; box.appendChild(el);
    while (box.children.length > 3) box.firstChild.remove();
    setTimeout(() => el.classList.add('gone'), 2200); setTimeout(() => el.remove(), 2700);
  }
  setMode(mode) { this.el.dataset.mode = mode; }
  /** Show only these HUD buttons (the tutorial unlocks them one by one); turn, language and settings always show. */
  show(list) { for (const act of ['build', 'orders', 'barn', 'projects', 'today']) { const b = this.el.querySelector(`[data-act="${act}"]`); if (b) b.hidden = !list.includes(act); } }
}
