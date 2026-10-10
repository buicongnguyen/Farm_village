// Your own fishing, played the Zoo Garden way (repo cute_game): when you sit at the water with a line out, a fish swims
// up, nibbles and bites; strike on the bite, then HOLD the Reel button to pull it in, letting go when the line strains
// or the fish surges. The rules stay in core: the fish is the line's seeded one and only core/fishing.mjs awards it
// (reelIn with the equal-reward 'steady' path; a won fight is simply the fun way to get there). Missing, striking early
// and losing the fight cost nothing: the fish swims off and comes back. Reduced motion skips the fight.
import { bitePlan, FishFight, FIGHT } from '../core/fishing-fight.mjs';
import { pick } from '../core/fishing.mjs';
import { waterDistance } from '../core/pond-bank.mjs';
import { t } from '../kit/i18n.mjs';
import { sfx } from '../kit/sound.mjs';

// The Reel button's look lives here, loaded with the fishing code, not in the first-load stylesheet. One round button in
// the Next chip's place above the bottom buttons (the chip hides while you fish), a hint above: blue while waiting, orange and pulsing
// on a bite, a progress ring in the fight, red when the line strains. 84 px, in thumb reach on a phone.
const CSS = `.fishing-play { position: absolute; left: 50%; transform: translateX(-50%); bottom: max(112px, calc(env(safe-area-inset-bottom) + 104px)); display: grid; justify-items: center; gap: 8px; z-index: 6; pointer-events: none; }
.fishing-play[hidden] { display: none; }
@media (min-width: 900px) and (min-height: 600px) { .fishing-play { left: auto; right: 36px; bottom: 40px; transform: none; justify-items: end; } body.panel-open .fishing-play { right: calc(min(440px, 36vw) + 36px); } }
.fishing-play > * { pointer-events: auto; }
.fish-hint { margin: 0; padding: 5px 12px; border-radius: 14px; background: var(--panel-bg); border: 2px solid var(--edge); font: 900 14px/1.2 'Nunito', sans-serif; color: var(--ink); box-shadow: 0 3px 0 var(--edge-dark); max-width: min(320px, calc(100vw - 32px)); text-align: center; }
.reel-btn { --progress: 0%; position: relative; width: 84px; height: 84px; border-radius: 50%; border: 4px solid #fff; color: #fff; font: 1000 18px/1 'Nunito', sans-serif; cursor: pointer; touch-action: none; user-select: none; -webkit-user-select: none;
  background: radial-gradient(circle at 50% 35%, #6fc3ff, #2f95ea 70%); box-shadow: 0 5px 0 #134a80, 0 8px 16px #0005; transition: transform .08s; }
.reel-btn::before { content: ''; position: absolute; inset: -9px; border-radius: 50%; background: conic-gradient(#8fe06a var(--progress), transparent 0); -webkit-mask: radial-gradient(circle, transparent 56%, #000 57%); mask: radial-gradient(circle, transparent 56%, #000 57%); }
.reel-btn span { position: relative; text-shadow: 0 2px 0 #0004; }
.reel-btn.held { transform: scale(.92); box-shadow: 0 2px 0 #134a80, 0 4px 10px #0005; }
.reel-btn.bite { background: radial-gradient(circle at 50% 35%, #ffd27a, #ff8a1f 70%); box-shadow: 0 5px 0 #a8530a, 0 0 0 0 #ffb92e; animation: reel-bite .5s ease-in-out infinite alternate; }
.reel-btn.strain { background: radial-gradient(circle at 50% 35%, #ff8f8f, #e63946 70%); box-shadow: 0 5px 0 #8a1f2a; animation: reel-strain .18s steps(2) infinite; }
.reel-btn.wait, .reel-btn.approach, .reel-btn.nibble, .reel-btn.away { filter: saturate(.85); }
@keyframes reel-bite { to { transform: scale(1.1); box-shadow: 0 5px 0 #a8530a, 0 0 0 12px #ffb92e55; } }
@keyframes reel-strain { 50% { filter: brightness(1.25); } }
body.reduced-motion .reel-btn { animation: none; }
body.fishing-active .hud .next-chip { display: none; }
@media (max-height: 520px) { .fishing-play { left: max(12px, env(safe-area-inset-left)); transform: none; bottom: max(12px, env(safe-area-inset-bottom)); justify-items: start; } }`;
const quiet = () => document.body.classList.contains('reduced-motion');
const buzz = ms => { try { navigator.vibrate?.(ms); } catch { /* not on this device */ } };

export class FishingPlay {
  constructor({ game, people, hud, view }) {
    Object.assign(this, { game, people, hud, view, phase: 'idle', held: false, cycle: 0, attempt: 0, cycleAt: null, fight: null,
      lineSeed: null, tick: 0, msg: '', msgUntil: 0, nibbleAt: -9, state: { phase: 'idle' } });
    view.play = this;
    view.onPacked = n => hud.toast(n === 1 ? t('Your fish is packed away in the barn.') : t('Your catch is packed away: {count} fish in the barn.', { count: n }), 'good', { icon: 'ui:barn', to: 'barn' });
    if (!document.getElementById('fishing-play-css')) { const st = document.createElement('style'); st.id = 'fishing-play-css'; st.textContent = CSS; document.head.appendChild(st); }
    const box = document.createElement('div'); box.className = 'fishing-play'; box.hidden = true;
    box.innerHTML = `<p class="fish-hint" role="status" aria-live="polite"></p><button class="reel-btn" type="button"><span></span></button>`;
    hud.el.appendChild(box);
    Object.assign(this, { box, hint: box.querySelector('.fish-hint'), btn: box.querySelector('.reel-btn') });
    const down = e => { if (e.button > 0) return; e.preventDefault(); try { this.btn.setPointerCapture?.(e.pointerId); } catch { /* not an active pointer */ } this.press(); };
    const up = () => { this.held = false; this.btn.classList.remove('held'); };
    this.btn.addEventListener('pointerdown', down);
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) this.btn.addEventListener(ev, up);
    // keyboard and switch access: a click without a pointer toggles holding
    this.btn.addEventListener('click', e => { if (e.detail !== 0) return; if (this.phase === 'fight') { this.held = !this.held; this.btn.classList.toggle('held', this.held); } else this.press(); });
    addEventListener('keydown', e => { if (e.code !== 'Space' || e.repeat || this.box.hidden || /INPUT|TEXTAREA|SELECT|BUTTON/.test(document.activeElement?.tagName ?? '')) return; e.preventDefault(); this.press(); });
    addEventListener('keyup', e => { if (e.code === 'Space') up(); });
  }
  /** Is your character sitting at the water with this line? (The tackle view decides where the float is.) */
  atWater() { const line = this.game.s.fishing?.line, me = this.people.walkers.get('you'); return line && me && !me.indoors && this.view.playerFloat ? line : null; }
  say(text, ms = 1600) { this.msg = text; this.msgUntil = performance.now() + ms; }
  press() {
    const now = this.game.now;
    this.held = true; this.btn.classList.add('held');
    if (this.phase === 'bite') {
      if (quiet()) { this.land(); return; }
      this.fight = new FishFight(this.lineSeed, pick(this.lineSeed, this.game.s.fishing.line.bait), this.attempt++);
      this.phase = 'fight'; this.say(t('Hold Reel!'), 1200); sfx('pop'); buzz(25);
    } else if (this.phase === 'wait' || this.phase === 'approach' || this.phase === 'nibble') {
      // too early: the fish is spooked for a moment (the first bite never comes before the core's own bite time)
      if (this.cycleAt !== null) this.cycleAt += FIGHT.earlyPenaltyS * 1000;
      this.say(t('Too early! Wait for the bite.'));
      // on foot the float jerks 0.7 m toward you (Zoo Garden's earlyPull); pulled to the rim, the line is wound in
      const g = this.view.angler;
      if (g?.cast) {
        const dx = g.x - g.cast[0], dz = g.z - g.cast[1], d = Math.hypot(dx, dz) || 1; g.cast = [g.cast[0] + dx / d * 0.7, g.cast[1] + dz / d * 0.7];
        this.view.splash?.(g.cast[0], g.pond.surface, g.cast[1], 6);
        if (waterDistance(g.pond, ...g.cast) > -0.75) { this.game.do('pullLine'); this.say(t('You reeled the line back in.'), 2000); }
      }
    } else if (this.phase === 'away') this.say(t('It will be back in a moment.'));
    void now;
  }
  land() {
    this.view.beforeCatch?.();
    const r = this.game.do('reelIn', { steady: true, hold: true });   // landed on the grass; it is packed into the barn when you walk off
    this.fight = null; this.held = false; this.phase = 'idle';
    if (r?.ok) { this.view.leap?.(r.fish); sfx('cheer'); buzz(60); }
  }
  frame(dt) {
    const line = this.atWater(), now = this.game.now, panel = document.body.classList.contains('panel-open');
    if (!line) { this.reset(); return; }
    if (line.seed !== this.lineSeed) {   // a new cast: the first bite lines up with the core's own bite time
      Object.assign(this, { lineSeed: line.seed, cycle: 0, attempt: 0, fight: null, held: false });
      // (a line that was already biting when you sat down, after a reload, starts a fresh approach instead)
      this.cycleAt = now >= line.doneAt ? now + 600 : line.doneAt - bitePlan(line.seed, 0).bite * 1000;
    }
    let plan = bitePlan(line.seed, this.cycle), s = (now - this.cycleAt) / 1000, state = { phase: 'wait' };
    if (this.phase === 'fight' && this.fight) {
      for (const ev of this.fight.update(dt, this.held)) {
        if (ev === 'surge') this.say(t('Surge! Let go!'), 900);
        if (ev === 'strain') { this.say(t('The line is straining! Let go!'), 1100); buzz(20); }
        if (ev === 'held') { this.say(t('The line held!'), 1000); buzz(25); }
        if (ev === 'lost') { this.phase = 'away'; this.cycle++; this.cycleAt = now + FIGHT.backS * 1000; sfx('error'); this.say(this.fight.result === 'snapped' ? t('The line slipped! The fish will be back.') : t('It swam off. It will be back.'), 2200); this.fight = null; }
        if (ev === 'won') { this.land(); return; }
      }
      if (this.fight) {
        if (this.held && (this.tick -= dt) <= 0) { this.tick = 0.3; sfx('tick'); }
        state = { phase: 'fight', tension: this.fight.tension, progress: this.fight.progress, surge: this.fight.surge };
      }
    }
    if (this.phase !== 'fight') {
      if (now < line.doneAt && s < 0) this.phase = 'wait';
      else if (s < 0) this.phase = 'away';
      else if (s < plan.bite) {
        const nib = plan.nibbles.find(n => s >= n && s < n + 0.3);
        if (nib !== undefined && this.nibbleAt !== nib) { this.nibbleAt = nib; sfx('tick'); }
        this.phase = nib !== undefined ? 'nibble' : 'approach';
        state = { phase: this.phase, approach: Math.min(1, s / FIGHT.approachS), dart: nib !== undefined ? Math.sin((s - nib) / 0.3 * Math.PI) : 0 };
      } else if (s < plan.bite + plan.window) {
        if (this.phase !== 'bite') { sfx('pop'); buzz(40); this.held = false; }
        this.phase = 'bite'; state = { phase: 'bite', approach: 1, shake: s - plan.bite };
      } else { this.phase = 'away'; this.cycle++; this.cycleAt = now + FIGHT.backS * 1000; this.say(t('Missed it. It will be back.'), 1600); }
      if (this.phase === 'wait') state = { phase: 'wait' };
      if (this.phase === 'away') state = { phase: 'away' };
    }
    this.state = state;
    document.body.classList.add('fishing-active');
    this.box.hidden = panel;
    const tension = state.tension ?? 0;
    this.btn.className = `reel-btn ${this.phase}${this.held ? ' held' : ''}${tension >= 0.8 ? ' strain' : ''}`;
    this.btn.querySelector('span').textContent = this.phase === 'bite' ? t('Reel!') : t('Reel');
    this.btn.setAttribute('aria-label', this.phase === 'fight' ? t('Hold to reel in') : t('Reel'));
    this.btn.style.setProperty('--progress', `${Math.round((state.progress ?? 0) * 100)}%`);
    const base = { wait: t('Wait for a bite…'), approach: t('A fish is coming… wait!'), nibble: t('A nibble… not yet!'), bite: t('Bite! Press Reel!'),
      away: t('The fish swam off…'), fight: state.surge ? t('Surge! Let go!') : tension >= 0.8 ? t('The line is straining! Let go!') : this.held ? t('Reeling…') : t('Hold Reel to pull it in') }[this.phase] ?? '';
    const text = performance.now() < this.msgUntil ? this.msg : base;
    if (this.hint.textContent !== text) this.hint.textContent = text;
  }
  reset() {
    if (this.phase === 'idle' && this.box.hidden) return;
    Object.assign(this, { phase: 'idle', fight: null, held: false, lineSeed: null, state: { phase: 'idle' } });
    this.box.hidden = true; document.body.classList.remove('fishing-active');
  }
}
