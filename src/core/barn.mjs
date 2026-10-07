// The barn: every good in one store with a capacity (DESIGN 13), and the goods held for the next project (DESIGN 11).
import { BARN } from '../content/economy.mjs';
import { STEPS } from '../content/projects.mjs';
import { stepReady } from './projects.mjs';

export const stock = (s, id) => s.barn.items[id] ?? 0;
export const used = s => Object.values(s.barn.items).reduce((a, b) => a + b, 0);
export const space = s => Math.max(0, s.barn.cap - used(s));
/** Goods set aside for the current project once its requirements are met (minus what was already delivered). */
export function held(s) {
  const step = STEPS[s.projects.step];
  if (!step?.deliver || !stepReady(s).ok) return {};
  const out = {};
  for (const [id, n] of Object.entries(step.deliver)) { const left = n - (s.projects.delivered[id] ?? 0); if (left > 0) out[id] = left; }
  return out;
}
/** What can be used for orders and recipes without touching held goods. */
export const free = (s, id, honourHold = true) => Math.max(0, stock(s, id) - (honourHold ? held(s)[id] ?? 0 : 0));
export const hasAll = (s, needs, honourHold = true) => Object.entries(needs).every(([id, n]) => Number.isFinite(n) && n > 0 && free(s, id, honourHold) >= n);
export function take(s, needs, honourHold = true) {
  if (!hasAll(s, needs, honourHold)) return false;
  for (const [id, n] of Object.entries(needs)) { s.barn.items[id] -= n; if (!s.barn.items[id]) delete s.barn.items[id]; }
  return true;
}
/** Add up to n of a good; returns how many fitted. */
export function add(s, id, n) {
  const fit = Math.min(n, space(s)); if (fit > 0) s.barn.items[id] = stock(s, id) + fit;
  return fit;
}
export const upgradeCost = s => BARN.upgradeCost(s.barn.upgrades);
