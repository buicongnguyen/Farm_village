// Bonds with the villagers (DESIGN 9.2): hearts 0–10 with heart scenes at 3, 6 and 9, gifts they like, one small wish a
// day per household, letters in the mailbox, and the village charm milestones (DESIGN 12).
// The words (scene lines, wish texts, letters) are story data in content/hearts.mjs and content/letters.mjs:
//   HEART_SCENES[personId][3|6|9] = { lines: [{ who, text }], reward: { decor | recipe | coins | goods } }
//   WISHES[personId] = [{ text, need: { kind, near: 'home' } }]
//   LETTERS = [{ id, from, when: { type: 'chapter' | 'hearts' | 'level', value, person? }, text, reward? }]
// useBondsData() swaps in fixtures (tests run before the story data lands).
import { HEART_SCENES, WISHES } from '../content/hearts.mjs';
import { LETTERS } from '../content/letters.mjs';
import { CHAPTERS } from '../content/story.mjs';
import { VILLAGERS, FAMILIES, allPeople } from '../content/people.mjs';
import { BUILDINGS } from '../content/buildings.mjs';
import { GOODS, RECIPES } from '../content/goods.mjs';
import { BONDS, CHARM_MILESTONES } from '../content/economy.mjs';
import { dayKey } from './clock.mjs';
import { rng, hash } from './rng.mjs';
import * as barn from './barn.mjs';
import { gainXp } from './levels.mjs';
import { charmOf, charmPreview } from './homes.mjs';
import { mayBuild } from './projects.mjs';

let fixtures = null;
const data = () => ({ scenes: fixtures?.scenes ?? HEART_SCENES, wishes: fixtures?.wishes ?? WISHES, letters: fixtures?.letters ?? LETTERS });
/** Tests: use these scenes, wishes and letters instead of the story data (null goes back to the story data). */
export function useBondsData(d = null) { fixtures = d; }

/** Decorations a household may wish for when the story gives no wishes of its own. */
export const DEFAULT_WISHES = ['flowers', 'flowerpot', 'bush', 'hay_bale', 'picket', 'scarecrow', 'bench', 'tree', 'lamp', 'fountain', 'street_lamp'];
/** The wish line when the story has none for that person (the interface fills {item} with the decoration's name). */
export const WISH_FALLBACK = 'I would love a {item} near our home.';

// ── People and hearts ──
export const personOf = id => allPeople().find(p => p.id === id) ?? null;
/** Visible hearts (whole hearts, 0–10). */
export const heartsOf = (s, id) => Math.floor(s.people[id]?.hearts ?? 0);
const bondOf = (s, id) => { const b = (s.people[id] ??= { hearts: 0 }); b.scenes ??= []; return b; };
/** Family members whose family has moved in: [{ id, home, family }]. */
export function residents(s, now = Infinity) {
  const out = [];
  for (const [home, h] of Object.entries(s.homes)) {
    if (!h.family || h.arrivesAt > now) continue;
    const fam = FAMILIES.find(f => f.id === h.family);
    for (const p of fam?.people ?? []) out.push({ id: p.id, home, family: fam.id });
  }
  return out;
}
/** Who can receive a gift now: villagers who are in the village (not your own family) and residents. */
export function giftable(s, now = Infinity) {
  const villagers = VILLAGERS.filter(v => !v.family && !v.noGifts && (!v.arrives || (s.counts[v.arrives] ?? 0) > 0)).map(v => v.id);
  return [...villagers, ...residents(s, now).map(r => r.id)];
}
/** The story's scene for a person at 3, 6 or 9 hearts, or null. */
export const sceneFor = (id, at) => data().scenes[id]?.[at] ?? null;

/** Give a reward: { coins } | { decor: kind } | { recipe: id } | { goods: { id: n } }. Returns what was really given. */
export function grant(ctx, reward = {}) {
  const { s } = ctx, out = {};
  if (reward.coins > 0) { s.coins += reward.coins; s.stats.coinsEarned += reward.coins; out.coins = reward.coins; }
  if (reward.decor && BUILDINGS[reward.decor]) { s.stored[reward.decor] = (s.stored[reward.decor] ?? 0) + 1; out.decor = reward.decor; }
  if (reward.recipe && RECIPES[reward.recipe]) { (s.known ??= {})[reward.recipe] = true; out.recipe = reward.recipe; }
  if (reward.goods) for (const [g, n] of Object.entries(reward.goods)) if (GOODS[g]) { const got = barn.add(s, g, n); if (got) (out.goods ??= {})[g] = got; }
  return out;
}
/** Raise a person's hearts (never above 10, never down). Plays every heart scene whose threshold is reached and not yet seen. */
export function addHearts(ctx, id, amount, why) {
  const { s } = ctx, b = bondOf(s, id), from = b.hearts;
  b.hearts = Math.min(BONDS.max, from + Math.max(0, amount));
  if (b.hearts !== from) ctx.emit('hearts', { person: id, hearts: b.hearts, from, why });
  for (const at of BONDS.scenes) {
    if (b.hearts < at || b.scenes.includes(at)) continue;
    b.scenes.push(at);
    const scene = sceneFor(id, at), reward = grant(ctx, scene?.reward ?? BONDS.rewards[at]);
    ctx.emit('heartScene', { person: id, at, reward, scripted: !!scene });
  }
}

// ── Wishes: one a day for each household that has moved in ──
const canWish = (s, kind) => BUILDINGS[kind] && BUILDINGS[kind].charm > 0 && BUILDINGS[kind].level <= s.level && mayBuild(s, kind).ok;
function wishFor(s, home, members, day) {
  const r = rng(hash(s.createdAt, 'wish', home, day)), person = members[r.int(members.length)];
  const own = (data().wishes[person.id] ?? []).filter(w => canWish(s, w.need?.kind)).map(w => ({ kind: w.need.kind, text: w.text ?? null }));
  const pool = own.length ? own : DEFAULT_WISHES.filter(k => canWish(s, k)).map(kind => ({ kind, text: null }));
  if (!pool.length) return null;
  const w = pool[r.int(pool.length)];
  return { home, person: person.id, kind: w.kind, text: w.text, done: false };
}
/** Today's wishes: a new set each game day; a household that moves in during the day gets its wish at once. */
export function refreshWishes(ctx) {
  const { s, now } = ctx, day = dayKey(now), w = (s.wishes ??= { day: '', list: [] });
  if (w.day !== day) { w.day = day; w.list = []; }
  const byHome = new Map();
  for (const r of residents(s, now)) { if (!byHome.has(r.home)) byHome.set(r.home, []); byHome.get(r.home).push(r); }
  for (const [home, members] of byHome) {
    if (w.list.some(x => x.home === home)) continue;
    const wish = wishFor(s, home, members, day); if (!wish) continue;
    w.list.push(wish); ctx.emit('wish', { home, person: wish.person, kind: wish.kind });
  }
}
/** A placed or moved decoration grants every open wish for that kind whose home it is near (the charm radius). */
function checkWishes(ctx, events) {
  const { s } = ctx, open = s.wishes?.list?.filter(w => !w.done); if (!open?.length) return;
  for (const e of events) {
    if (e.type !== 'placed' && e.type !== 'moved') continue;
    const p = s.placed[e.id]; if (!p) continue;
    for (const w of open) {
      if (w.done || w.kind !== p.kind || !s.placed[w.home]) continue;
      if (!charmPreview(s, p.kind, p.x, p.z, p.rot)?.homes.includes(w.home)) continue;
      w.done = true;
      ctx.emit('wishGranted', { home: w.home, person: w.person, kind: w.kind, id: e.id });
      addHearts(ctx, w.person, BONDS.wish, 'wish'); gainXp(ctx, BONDS.wishXp);
    }
  }
}

// ── Letters ──
/** The highest chapter reached: the cards already seen, or any whose test now passes. */
export function chapterReached(s) {
  let c = s.story?.chapter ?? 0;
  for (const ch of CHAPTERS) { try { if (ch.id > c && ch.when?.(s)) c = ch.id; } catch { /* a chapter test that needs more state */ } }
  return c;
}
export function letterDue(s, letter) {
  const w = letter.when ?? {};
  if (w.type === 'level') return s.level >= w.value;
  if (w.type === 'chapter') return chapterReached(s) >= w.value;
  if (w.type === 'hearts') return heartsOf(s, w.person ?? letter.from) >= w.value;
  return false;
}
/** Post every letter that is due and not sent yet (newest first in s.mail). */
export function postLetters(ctx) {
  const { s, now } = ctx, mail = (s.mail ??= []);
  for (const letter of data().letters) {
    if (!letter?.id || mail.some(m => m.id === letter.id) || !letterDue(s, letter)) continue;
    mail.unshift({ id: letter.id, from: letter.from, at: now, read: false });
    ctx.emit('letter', { id: letter.id, from: letter.from });
  }
}
export const letterOf = id => data().letters.find(l => l.id === id) ?? null;
export const unread = s => (s.mail ?? []).filter(m => !m.read).length;

// ── Village charm ──
/** Village charm: every cottage's charm added up (DESIGN 12). */
export const villageCharm = s => Object.keys(s.homes).filter(id => s.placed[id]).reduce((a, id) => a + charmOf(s, id), 0);
export function checkCharm(ctx) {
  const { s } = ctx, v = (s.village ??= { milestones: [], decor: [] });
  const next = CHARM_MILESTONES.filter(m => !v.milestones.includes(m.at)); if (!next.length) return;
  const charm = villageCharm(s);
  for (const m of next) if (charm >= m.at) { v.milestones.push(m.at); v.decor.push(m.decor); ctx.emit('charmMilestone', { at: m.at, decor: m.decor, charm }); }
}

// ── Hooks for act() and tick() ──
const CHARM_EVENTS = new Set(['placed', 'moved', 'stored', 'cellChanged', 'familyArrived', 'homeUpgraded']);
/** After every accepted action: wishes granted by what was placed, charm milestones, letters that came due. */
export function afterAction(ctx) {
  const events = [...ctx.events];
  checkWishes(ctx, events);
  if (events.some(e => CHARM_EVENTS.has(e.type))) checkCharm(ctx);
  postLetters(ctx);
}
export function tickBonds(ctx) {
  const events = [...ctx.events];
  refreshWishes(ctx);
  if (events.some(e => CHARM_EVENTS.has(e.type)) || !ctx.s.village) checkCharm(ctx);
  postLetters(ctx);
}

export const actions = {
  /** Give a villager one good from the barn: { person, good }. One gift per person a day; liked goods count four times. */
  gift(ctx, { person, good }) {
    const { s, now } = ctx, p = personOf(person);
    if (!p || !giftable(s, now).includes(person)) return ctx.fail('They are not in the village yet');
    if (!GOODS[good]) return ctx.fail('Unknown good');
    if (s.people[person]?.giftDay === dayKey(now)) return ctx.fail('One gift a day is plenty');
    if (!barn.take(s, { [good]: 1 })) return ctx.fail('Missing goods');
    const liked = (p.likes ?? []).includes(good);
    bondOf(s, person).giftDay = dayKey(now); s.stats.gifts = (s.stats.gifts ?? 0) + 1;
    ctx.emit('gifted', { person, good, liked });
    addHearts(ctx, person, liked ? BONDS.giftLiked : BONDS.gift, 'gift');
    return { liked };
  },
  /** Open a letter: { id }. A letter with a gift gives it the first time it is read. */
  readLetter(ctx, { id }) {
    const { s } = ctx, m = (s.mail ?? []).find(x => x.id === id);
    if (!m) return ctx.fail('That letter is gone');
    if (m.read) return { reward: {} };
    m.read = true;
    const reward = grant(ctx, letterOf(id)?.reward);
    ctx.emit('letterRead', { id, from: m.from, reward });
    return { reward };
  },
};
