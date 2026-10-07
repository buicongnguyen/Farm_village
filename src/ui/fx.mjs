// Feedback (DESIGN 16): each collected thing flies from where it was to the barn button; coins fly to the coin counter.
import { CELL } from '../content/world.mjs';
import { GOODS } from '../content/goods.mjs';

export class Fx {
  constructor(root, { game, world }) {
    Object.assign(this, { game, world, root });
    game.on(r => { for (const e of r.events ?? []) this.event(e); });
  }
  screenOf(id) {
    const p = this.game.s.placed[id]; if (!p) return null;
    const v = new this.world.cam.camera.position.constructor((p.x + 0.5) * CELL, 1, (p.z + 0.5) * CELL).project(this.world.cam.camera);
    return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight };
  }
  event(e) {
    if (document.body.classList.contains('reduced-motion')) return;
    if (e.type === 'harvested') this.fly(GOODS[e.crop]?.icon, this.screenOf(e.id), '[data-act="barn"]');
    else if (e.type === 'collected') this.fly(GOODS[e.good]?.icon, this.screenOf(e.home), '[data-act="barn"]');
    else if (e.type === 'produced') this.fly(GOODS[e.good]?.icon, this.screenOf(e.building), '[data-act="barn"]');
    else if (e.type === 'orderFilled' || e.type === 'rent') this.fly('🪙', { x: innerWidth / 2, y: innerHeight / 2 }, '[data-hud="coins"]');
    else if (e.type === 'levelUp' || e.type === 'projectDone' || e.type === 'familyArrived') this.confetti(e.type === 'levelUp' ? 26 : 40);
  }
  /** A burst of confetti from the top of the screen (DESIGN 16: celebrations). */
  confetti(n = 30) {
    const colours = ['#ff5c8a', '#ffc83a', '#5fae3e', '#35b6f2', '#9b6bff', '#ff8a2a'];
    for (let i = 0; i < n; i++) {
      const el = document.createElement('i'); el.className = 'confetti';
      el.style.left = `${10 + Math.random() * 80}vw`; el.style.background = colours[i % colours.length];
      el.style.setProperty('--dx', `${(Math.random() - 0.5) * 200}px`); el.style.setProperty('--rot', `${Math.random() * 720 - 360}deg`); el.style.animationDelay = `${Math.random() * 0.25}s`;
      this.root.appendChild(el); setTimeout(() => el.remove(), 1800);
    }
  }
  fly(icon, from, toSelector) {
    const to = document.querySelector(toSelector)?.getBoundingClientRect(); if (!icon || !from || !to) return;
    if (this.root.querySelectorAll('.fly').length > 12) return;    // a big sweep sends a few, not hundreds
    const el = document.createElement('div'); el.className = 'fly'; el.textContent = icon;
    el.style.left = `${from.x}px`; el.style.top = `${from.y}px`; this.root.appendChild(el);
    requestAnimationFrame(() => { el.style.transform = `translate(${to.left + to.width / 2 - from.x}px, ${to.top + to.height / 2 - from.y}px) scale(.6)`; el.style.opacity = '0.2'; });
    setTimeout(() => el.remove(), 750);
  }
}
