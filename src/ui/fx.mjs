// Feedback (DESIGN 16): each collected thing flies from where it was to the barn button; coins fly to the coin counter.
// Flights (juice package): item icons (iconHtml: the art kit's image, else the emoji) arc up and curve into their
// button, a few at a time with a stagger; orders and rent pour 8–15 coins on staggered curves into the coin counter,
// and each target bumps as things land. If a target is not on screen yet, they fly to its HUD corner instead.
import { CELL } from '../content/world.mjs';
import { GOODS } from '../content/goods.mjs';
import { iconHtml } from './icon.mjs';
import { sfx } from '../kit/sound.mjs';

const CORNER = { '[data-act="barn"]': () => ({ x: innerWidth - 64, y: innerHeight - 52 }), '[data-hud="coins"]': () => ({ x: 110, y: 36 }), '[data-hud="level"]': () => ({ x: 36, y: 36 }) };
const COIN = '🪙';
export class Fx {
  constructor(root, { game, world }) {
    Object.assign(this, { game, world, root, tap: null, live: 0, bumpAt: new Map(), tickAt: 0 });
    game.on(r => this.result(r.events ?? []));
    // coins pour from where the player tapped (a Deliver button, the mailbox), if that was just now
    addEventListener('pointerdown', e => { this.tap = { x: e.clientX, y: e.clientY, t: performance.now() }; }, { capture: true, passive: true });
    this.css();
  }
  screenOf(id) {
    const p = this.game.s.placed[id]; if (!p) return null;
    const v = new this.world.cam.camera.position.constructor((p.x + 0.5) * CELL, 1, (p.z + 0.5) * CELL).project(this.world.cam.camera);
    return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight };
  }
  get reduced() { return document.body.classList.contains('reduced-motion'); }
  tapPoint() { return this.tap && performance.now() - this.tap.t < 1500 ? this.tap : { x: innerWidth / 2, y: innerHeight / 2 }; }
  /** One result's events: goods of one kind fly together (a sweep sends a few icons, not hundreds). */
  result(events) {
    const goods = new Map(); let coins = 0;
    for (const e of events) {
      if (e.type === 'harvested') this.add(goods, e.crop, this.screenOf(e.id), e.count);
      else if (e.type === 'collected') this.add(goods, e.good, this.screenOf(e.home), 1);
      else if (e.type === 'produced') this.add(goods, e.good, this.screenOf(e.building), e.count);
      else if (e.type === 'orderFilled' || e.type === 'rent' || e.type === 'stallSold' || e.type === 'coins') coins += e.coins ?? 0;
      else if (e.type === 'giftClaimed' && e.coins) coins += e.coins;
      else if (e.type === 'levelUp' || e.type === 'projectDone' || e.type === 'familyArrived' || (e.type === 'repaired' && e.broken)) this.confetti(e.type === 'levelUp' ? 26 : 40);
    }
    if (this.reduced) return;
    let delay = 0;
    for (const [good, g] of goods) {
      const n = Math.min(4, g.count);
      for (let i = 0; i < n; i++) this.fly(good, GOODS[good]?.icon, g.from, '[data-act="barn"]', { delay: delay + i * 70 });
      delay += 90;
    }
    if (coins > 0) this.coins(coins, this.tapPoint());
    // experience: a couple of stars follow the goods up to the level ring
    const first = goods.values().next().value;
    if (first) for (let i = 0; i < Math.min(3, goods.size + 1); i++) this.fly('xp', '⭐', first.from, '[data-hud="level"]', { delay: 160 + i * 90, spread: 0.5 });
  }
  add(map, good, from, count) {
    if (!good || !from) return;
    const g = map.get(good); if (g) g.count += count; else map.set(good, { from, count });
  }
  /** Pour 8–15 coins (more for bigger sums) from a screen point into the coin counter. */
  coins(amount, from) {
    const n = Math.max(8, Math.min(15, 7 + Math.round(Math.log2(1 + amount))));
    for (let i = 0; i < n; i++) this.fly('coin', COIN, { x: from.x + (Math.random() - 0.5) * 30, y: from.y + (Math.random() - 0.5) * 20 }, '[data-hud="coins"]', { delay: i * 45, spread: 1, coin: true });
  }
  /** A burst of confetti from the top of the screen (DESIGN 16: celebrations). */
  confetti(n = 30) {
    if (this.reduced) return;
    const colours = ['#ff5c8a', '#ffc83a', '#5fae3e', '#35b6f2', '#9b6bff', '#ff8a2a'];
    for (let i = 0; i < n; i++) {
      const el = document.createElement('i'); el.className = 'confetti';
      el.style.left = `${10 + Math.random() * 80}vw`; el.style.background = colours[i % colours.length];
      el.style.setProperty('--dx', `${(Math.random() - 0.5) * 200}px`); el.style.setProperty('--rot', `${Math.random() * 720 - 360}deg`); el.style.animationDelay = `${Math.random() * 0.25}s`;
      this.root.appendChild(el); setTimeout(() => el.remove(), 1800);
    }
  }
  /** Fly one icon along a curve into a HUD target (a selector); falls back to the target's corner when it is missing. */
  fly(id, emoji, from, toSelector, { delay = 0, spread = 0, coin = false } = {}) {
    if (!from || (!id && !emoji)) return;
    if (this.live > 24) return;                                // a big sweep sends a few, not hundreds
    const target = document.querySelector(toSelector), box = target?.getBoundingClientRect();
    const to = box && box.width ? { x: box.left + box.width / 2, y: box.top + box.height / 2 } : CORNER[toSelector]?.() ?? { x: innerWidth - 40, y: 40 };
    const el = document.createElement('div'); el.className = coin ? 'jfly jcoin' : 'jfly';
    el.innerHTML = coin ? '<i></i>' : iconHtml(id, emoji);
    el.style.left = `${from.x}px`; el.style.top = `${from.y}px`;
    this.root.appendChild(el); this.live++;
    // a quadratic curve: up and to the side first, then into the target
    const dx = to.x - from.x, dy = to.y - from.y, side = (Math.random() - 0.5) * (80 + spread * 120);
    const cx = dx * 0.25 + side, cy = Math.min(dy, 0) - 70 - Math.random() * 60 - spread * 30;
    const frames = [], steps = 10, ms = 620 + Math.random() * 160 + spread * 80;
    for (let i = 0; i <= steps; i++) {
      const k = i / steps, u = 1 - k, x = 2 * u * k * cx + k * k * dx, y = 2 * u * k * cy + k * k * dy;
      const s = k < 0.18 ? 0.4 + k / 0.18 * 0.85 : 1.25 - (k - 0.18) / 0.82 * 0.6;
      frames.push({ transform: `translate(${x}px, ${y}px) scale(${s})`, opacity: k > 0.92 ? 0.6 : 1, offset: k });
    }
    const anim = el.animate?.(frames, { duration: ms, delay, easing: 'cubic-bezier(.45,.05,.55,.95)', fill: 'both' });
    const land = () => { el.remove(); this.live--; this.bump(target, coin); };
    if (anim) anim.onfinish = land; else setTimeout(land, ms + delay);
  }
  /** The target swells a little as things land (at most every 90 ms), and coins tick. */
  bump(target, coin) {
    const now = performance.now();
    if (coin && now - this.tickAt > 55) { this.tickAt = now; sfx('tick'); }
    if (!target?.animate || now - (this.bumpAt.get(target) ?? 0) < 90) return;
    this.bumpAt.set(target, now);
    target.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: 220, easing: 'ease-out' });
  }
  css() {
    if (document.getElementById('fx-css')) return;
    const st = document.createElement('style'); st.id = 'fx-css';
    st.textContent = `.jfly { position: fixed; z-index: 8; font-size: 28px; line-height: 1; pointer-events: none; margin: -14px 0 0 -14px; will-change: transform; filter: drop-shadow(0 3px 2px rgba(80,40,10,.35)); }
.jfly img { width: 34px; height: 34px; display: block; }
.jcoin i { display: block; width: 24px; height: 24px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #fff6b8 0 18%, #ffd23f 30%, #f2a81d 70%, #c97a10 100%);
  box-shadow: inset 0 0 0 2px #e39a12, inset 0 -3px 0 rgba(150,80,0,.35); }`;
    document.head.appendChild(st);
  }
}
