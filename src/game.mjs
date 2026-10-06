// The game controller: owns the state, runs act()/tick(), and tells the view and interface what happened.
// The interface calls game.do(action, payload); everything else listens with game.on(listener).
import { newGame } from './core/state.mjs';
import { act, tick } from './core/act.mjs';

export class Game {
  constructor(s = null, clock = () => Date.now()) {
    Object.assign(this, { clock, listeners: new Set(), timer: 0 });
    this.s = s ?? newGame(clock());
  }
  get now() { return this.clock(); }
  on(f) { this.listeners.add(f); return () => this.listeners.delete(f); }
  emit(result, action) { for (const f of this.listeners) f(result, action); }
  /** Run an action. Returns act()'s result ({ ok, reason, params, events, ... }). */
  do(action, payload = {}) {
    const r = act(this.s, action, payload, this.now);
    this.emit(r, action);
    return r;
  }
  tick() { const r = tick(this.s, this.now); if (r.events.length) this.emit({ ok: true, events: r.events }, 'tick'); return r; }
  start(everyMs = 1000) { this.tick(); this.timer = setInterval(() => this.tick(), everyMs); }
  replace(s) { this.s = s; this.tick(); this.emit({ ok: true, events: [{ type: 'loaded' }] }, 'load'); }
}
