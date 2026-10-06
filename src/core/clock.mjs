// Real time. Timers store absolute `doneAt` times, so nothing needs to tick while the game is closed (TECH-PLAN 4).
import { DAILY_RESET_HOUR } from '../content/economy.mjs';

/** The game day a moment belongs to: days turn over at 04:00 local time. Returns "YYYY-MM-DD". */
export function dayKey(now) {
  const d = new Date(now - DAILY_RESET_HOUR * 3_600_000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
/** If the device clock went backward, a timer must never become longer than its full duration. */
export const clampDone = (doneAt, now, fullMs) => Math.min(doneAt, now + fullMs);
/** "4m 05s", "1h 20m": a short duration for the interface (language-neutral units). */
export function shortTime(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ${String(s % 60).padStart(2, '0')}s`;
  const h = Math.floor(m / 60); return `${h}h ${String(m % 60).padStart(2, '0')}m`;
}
