// Goals, the weekly village goal, the daily hurry and the school festival (v0.3d).
import { QUESTS, QUEST_REWARD, FAVOURS, WEEKLY, WEEKLY_REWARD, FESTIVAL } from '../content/quests.mjs';
import { BUILDINGS } from '../content/buildings.mjs';
import { DAY } from '../content/economy.mjs';
import * as barn from './barn.mjs';
import { rng, hash } from './rng.mjs';
import { gainXp } from './levels.mjs';
import { addHearts } from './bonds.mjs';
import { workingCount, isRepairing, isWorking } from './working.mjs';
import { treeState } from './trees.mjs';
import { animalState } from './animals.mjs';
import { queueOf } from './production.mjs';

const SLOTS = 3;
const has = (s, needs) => !needs || needs === 'pond' || (needs === 'production' ? workingCount(s, 'feed_mill') + workingCount(s, 'bakery') > 0
  : needs === 'apple_tree' ? (s.counts.apple_tree ?? 0) > 0 : workingCount(s, needs) > 0);
export const questsOf = s => (s.quests ??= { list: [], done: 0 });
export const progressOf = (s, q) => q.favour ? Math.min(q.n, barn.free(s, q.good)) : Math.max(0, Math.min(q.n, (s.stats[QUESTS[q.t].stat] ?? 0) - q.base));
export const ready = (s, q) => progressOf(s, q) >= q.n;
function makeQuest(s, now) {
  const qs = questsOf(s), r = rng(hash(s.seed, qs.done, qs.list.length, Math.floor(now / 60000))), L = s.level, taken = new Set(qs.list.map(q => q.favour ? `f:${q.person}` : q.t));
  const reward = QUEST_REWARD(L), id = `q${qs.done}-${qs.list.length}-${Math.floor(now / 1000)}`;
  if (r() < 0.25) {   // a favour
    const opts = FAVOURS.filter(f => has(s, f.needs) && !taken.has(`f:${f.person}`));
    if (opts.length) { const f = opts[Math.floor(r() * opts.length)]; return { id, favour: true, person: f.person, good: f.good, n: f.n(Math.floor(L / 3)), coins: reward.coins * 2, xp: reward.xp * 2, hearts: 0.5 }; }
  }
  const opts = Object.keys(QUESTS).filter(k => has(s, QUESTS[k].needs) && !taken.has(k));
  const t = opts[Math.floor(r() * opts.length)] ?? 'harvest';
  return { id, t, n: QUESTS[t].n(L), base: s.stats[QUESTS[t].stat] ?? 0, ...reward };
}
export function tickQuests(ctx) {
  const { s, now } = ctx, qs = questsOf(s);
  while (qs.list.length < SLOTS) qs.list.push(makeQuest(s, now));
  // the weekly village goal
  const week = Math.floor(now / (7 * DAY));
  if (!s.weekly || s.weekly.week !== week) { const w = WEEKLY[week % WEEKLY.length]; s.weekly = { week, i: week % WEEKLY.length, base: s.stats[w.stat] ?? 0, claimed: false }; }
  // the festival that ends Ellis's trail
  if (!s.firsts.festival && (s.counts.school ?? 0) > 0 && qs.done >= FESTIVAL.goals) {
    s.firsts.festival = now; s.stats.festival = 1; s.coins += FESTIVAL.coins; s.stats.coinsEarned += FESTIVAL.coins; gainXp(ctx, FESTIVAL.xp);
    for (const id of Object.keys(s.people)) addHearts(ctx, id, FESTIVAL.hearts, 'festival');
    ctx.emit('festival', { coins: FESTIVAL.coins });
  }
}
export const weeklyProgress = s => { const w = WEEKLY[s.weekly?.i ?? 0]; return Math.max(0, Math.min(w.n, (s.stats[w.stat] ?? 0) - (s.weekly?.base ?? 0))); };
const dayKey = s => s.today?.day ?? '';
/** Hurry tokens: one free one each day, plus any the weekly goal gave. */
export const hurryLeft = s => { const h = s.hurry ?? { day: '', left: 0, extra: 0 }; return (h.day === dayKey(s) ? h.left : 1) + (h.extra ?? 0); };
/** Can this placed thing be hurried right now? */
export function hurryable(s, id, now) {
  const p = s.placed[id], b = p && BUILDINGS[p.kind]; if (!p) return false;
  if (isRepairing(s, id)) return true;
  if (p.kind === 'bed') return !!s.beds[id] && s.beds[id].doneAt > now;
  if (b.fruit) return treeState(s, id, now)?.state === 'growing';
  if (b.animals) return (s.animals[id] ?? []).some(a => a.doneAt != null && a.doneAt > now);
  if (b.produces) return isWorking(s, id) && queueOf(s, id).queue.some(j => j.doneAt > now);
  return false;
}
export const actions = {
  claimQuest(ctx, { id }) {
    const { s } = ctx, qs = questsOf(s), i = qs.list.findIndex(q => q.id === id); if (i < 0) return ctx.fail('Unknown goal');
    const q = qs.list[i]; if (!ready(s, q)) return ctx.fail('Not finished yet');
    if (q.favour && !barn.take(s, { [q.good]: q.n })) return ctx.fail('Missing goods');
    s.coins += q.coins; s.stats.coinsEarned += q.coins; gainXp(ctx, q.xp);
    if (q.favour) addHearts(ctx, q.person, q.hearts ?? 0.5, 'favour');
    qs.done++; s.stats.questsDone = qs.done; qs.list.splice(i, 1);
    ctx.emit('questDone', { id, coins: q.coins });
    return { coins: q.coins };
  },
  claimWeekly(ctx) {
    const { s } = ctx, w = WEEKLY[s.weekly?.i ?? 0]; if (!s.weekly || s.weekly.claimed) return ctx.fail('Already claimed');
    if (weeklyProgress(s) < w.n) return ctx.fail('Not finished yet');
    s.weekly.claimed = true; s.coins += WEEKLY_REWARD.coins; s.stats.coinsEarned += WEEKLY_REWARD.coins; gainXp(ctx, WEEKLY_REWARD.xp);
    s.hurry = { ...(s.hurry ?? { day: '', left: 0 }), extra: (s.hurry?.extra ?? 0) + WEEKLY_REWARD.hurry };
    ctx.emit('weeklyDone', { coins: WEEKLY_REWARD.coins });
    return { coins: WEEKLY_REWARD.coins };
  },
  /** Finish one timer now (a free token each day, no store): { id }. */
  hurry(ctx, { id }) {
    const { s, now } = ctx; if (typeof id !== 'string' || !s.placed[id]) return ctx.fail('Nothing to hurry');
    if (hurryLeft(s) < 1) return ctx.fail('No hurry left today');
    if (!hurryable(s, id, now)) return ctx.fail('Nothing to hurry');
    let h = { day: '', left: 0, extra: 0, ...(s.hurry ?? {}) }; if (h.day !== dayKey(s)) { h.day = dayKey(s); h.left = 1; }
    if (h.left > 0) h.left--; else h.extra--;
    s.hurry = h;
    const p = s.placed[id], b = BUILDINGS[p.kind];
    if (s.repairing[id]) s.repairing[id].doneAt = now;
    else if (p.kind === 'bed') s.beds[id].doneAt = now;
    else if (b.fruit) s.trees[id].doneAt = now;
    else if (b.animals) { const a = (s.animals[id] ?? []).find(x => x.doneAt != null && x.doneAt > now); if (a) a.doneAt = now; }
    else if (b.produces) { const j = queueOf(s, id).queue.find(x => x.doneAt > now); if (j) j.doneAt = now; }
    ctx.emit('hurried', { id });
    return { ok: true };
  },
};
