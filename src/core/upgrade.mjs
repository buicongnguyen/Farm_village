// Bringing a v0.1 save into the AAA pass (save version 1 → 2). migrate() in state.mjs fills the new fields with their
// defaults; this settles the story so a farm that is already weeks old does not replay its opening:
//   1. letters that were already due are filed as sent and read, except the newest two (the mailbox is not a flood);
//   2. story beats whose moment has already passed are marked seen (v0.1 had no beats, so they never played);
//   3. order cards get a line in their poster's own voice (v0.1 cards carry generic lines);
//   4. items on the cells the AAA pass keeps for the streak garden and the cart go into storage, paths there go back to grass.
import { LETTERS } from '../content/letters.mjs';
import { BEATS } from '../content/story.mjs';
import { allPeople } from '../content/people.mjs';
import { BUILDINGS } from '../content/buildings.mjs';
import { N } from '../content/world.mjs';
import { letterDue, chapterReached } from './bonds.mjs';
import { reservedReason } from './reserved.mjs';
import { cellsOf, touch, findSpot } from './grid.mjs';
import { hash, rng } from './rng.mjs';
import { CELL_TYPES } from './state.mjs';

/** Letters a migrated mailbox keeps unread (the newest ones that were due). */
export const KEEP_UNREAD = 2;
const CONTENTS = ['beds', 'animals', 'production', 'homes', 'trees'];

export function upgradeV1(s, now = s.lastSeen ?? Date.now()) {
  // 1. the mailbox
  const mail = (s.mail ??= []), sent = new Set(mail.map(m => m.id)), chapter = chapterReached(s);
  const due = LETTERS.filter(l => !sent.has(l.id) && letterDue(s, l, chapter));
  due.forEach((l, i) => mail.unshift({ id: l.id, from: l.from, at: now, read: i < due.length - KEEP_UNREAD }));
  // 2. story beats already behind the player (in order: a later beat may wait on an earlier one)
  const st = (s.story ??= {}), seen = (st.beats ??= []);
  for (const b of BEATS) { let past = false; try { past = !!b.when(s); } catch { /* needs more state */ } if (past && !seen.includes(b.id)) seen.push(b.id); }
  // 3. order cards in their poster's voice
  for (const c of s.orders?.cards ?? []) {
    const lines = allPeople().find(p => p.id === c.from)?.orders;
    if (lines?.length && !lines.includes(c.line)) c.line = lines[rng(hash(s.createdAt, 'line', c.id)).int(lines.length)];
  }
  // 4. the reserved cells
  for (const [id, p] of Object.entries(s.placed ?? {})) {
    const def = BUILDINGS[p.kind]; if (!def || def.garden) continue;
    if (!cellsOf(p.kind, p.x, p.z, p.rot).some(([x, z]) => reservedReason(x, z))) continue;
    if (def.tills) s.cells[p.z * N + p.x] = CELL_TYPES.grass;
    delete s.placed[id]; touch(s);
    // something that holds a crop, animals, a queue, a family or fruit moves to the nearest free spot; the rest is stored
    if (CONTENTS.some(k => s[k]?.[id])) {
      const to = findSpot(s, p.kind, p.x, p.z, { rot: p.rot, filter: (x, z) => !cellsOf(p.kind, x, z, p.rot).some(([cx, cz]) => reservedReason(cx, cz)) });
      s.placed[id] = to ? { ...p, x: to.x, z: to.z } : p;
      if (def.tills) s.cells[s.placed[id].z * N + s.placed[id].x] = CELL_TYPES.tilled;
      touch(s); continue;
    }
    s.counts[p.kind] = Math.max(0, (s.counts[p.kind] ?? 0) - 1);
    s.stored[p.kind] = (s.stored[p.kind] ?? 0) + 1;
  }
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
    const k = z * N + x;
    if (s.cells[k] === CELL_TYPES.path && reservedReason(x, z)) { s.cells[k] = CELL_TYPES.grass; s.counts.path = Math.max(0, (s.counts.path ?? 0) - 1); }
  }
  touch(s);
  return s;
}
