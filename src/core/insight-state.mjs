// Optional progress history is never allowed to block ordinary play or inject chart markup.
import { LEVELS } from '../content/economy.mjs';
export function normalizeInsight(s) {
  const levels = [], rows = s.insight?.levels;
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!row || !['l', 'c', 'm', 'o', 'ms'].every(k => Number.isSafeInteger(row[k]) && row[k] >= 0) || row.l < 1 || row.l > LEVELS.max) continue;
    const last = levels.at(-1);
    if (last && (row.l <= last.l || ['c', 'm', 'o', 'ms'].some(k => row[k] < last[k]))) continue;
    levels.push(Object.fromEntries(['l', 'c', 'm', 'o', 'ms'].map(k => [k, row[k]])));
  }
  return { levels: levels.slice(-40) };
}
