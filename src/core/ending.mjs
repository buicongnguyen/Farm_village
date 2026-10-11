// The ending (chapter 20, docs/plan/ch20-the-lights-of-two-villages.md). The deed is the valley's last title: its value
// reaches a billion (stamped by core/valley.mjs tickValley). Seeing the chapter stamps s.story.ended (core/today.mjs).
// Nothing is taken away and no timer stops: the game goes on. This module tells who is named on the closing cards and
// what the valley album has to show.
import { FAMILIES, VILLAGERS, NEIGHBOURS, hasArrived, oakHome } from '../content/people.mjs';
import { VALUE_TITLES } from '../content/journey.mjs';
import { CHAPTERS } from '../content/story.mjs';

const HOME = ['ada', 'ellis', 'june', 'pip'];   // the farmhouse first
/** Everyone the player met who is in the valley now: the farmhouse, the families of the lane in the order they came, the
 *  other villagers, the neighbours; and the families who came home to the quay, as a number. { people: [ids], returned } */
export function castOf(s, now = Infinity) {
  const here = new Set(VILLAGERS.filter(v => hasArrived(s, v) && (v.id !== 'ellis' || oakHome(s))).map(v => v.id));   // Grandpa Oak is away upriver until chapter 9
  const families = Object.values(s.homes ?? {}).filter(h => h.family && h.arrivesAt <= now).sort((a, b) => a.arrivesAt - b.arrivesAt).flatMap(h => FAMILIES.find(f => f.id === h.family)?.people ?? []).map(p => p.id);
  const people = [...HOME.filter(id => here.has(id)), ...families, ...[...here].filter(id => !HOME.includes(id)), ...NEIGHBOURS.filter(n => hasArrived(s, n)).map(n => n.id)];
  return { people: [...new Set(people)], returned: s.stats?.returned ?? 0 };
}
export const storyEnded = s => !!s.story?.ended;
/** The valley album: the chapters seen (to read again), the answer of chapter 11, the titles earned with their dates, and
 *  when the story ended. { chapters: [chapter], choice, titles: [{ at, name, when }], ended } */
export function albumOf(s) {
  const seen = s.story?.chapter ?? 0;
  return { chapters: CHAPTERS.filter(c => c.id <= seen), choice: s.story?.albright ?? null,
    titles: VALUE_TITLES.filter(x => s.firsts?.[`title:${x.at}`]).map(x => ({ ...x, when: s.firsts[`title:${x.at}`] })), ended: s.story?.ended ?? null };
}
