// The restored start (PLAN-v0.3): a new game opens on Hollowbrook as it stands (content/start.mjs), not on an empty field.
import { RESTORE } from '../content/start.mjs';
import { START_RESTORE, WEAR } from '../content/economy.mjs';
import { ROAD_SEGMENTS, N } from '../content/world.mjs';

const GRASS = 0, PATH = 3, TILLED = 4;
export function applyRestore(s, now) {
  s.mode = 'restore';
  s.coins = START_RESTORE.coins; s.barn.cap = START_RESTORE.barnCap; s.barn.items = { ...START_RESTORE.stock };
  s.level = RESTORE.level; s.house = { level: 1 };
  // the farm's corner is tidy; weeds and rocks stay in the outer rows
  for (let z = 56; z <= 67; z++) for (let x = 32; x <= 47; x++) s.cells[z * N + x] = GRASS;
  const count = (kind, d = 1) => { s.counts[kind] = (s.counts[kind] ?? 0) + d; };
  for (const p of RESTORE.placed) {
    const id = `p${s.nextId++}`; s.placed[id] = { kind: p.kind, x: p.x, z: p.z, rot: p.rot ?? 0 }; count(p.kind);
    if (p.kind === 'bed') { s.cells[p.z * N + p.x] = TILLED; s.beds[id] = { crop: RESTORE.plant, doneAt: now + 30_000 }; }
    if (p.cond === 'broken') s.cond[id] = { level: 3, ms: 0 };
    if (p.kind === 'cottage') s.homes[id] = { level: 0, family: null, arrivesAt: 0, rentFrom: now };   // a family moves in once it is repaired
  }
  for (const [x, z] of RESTORE.paths) { s.cells[z * N + x] = PATH; count('path'); s.stats.paths++; }
  const f = RESTORE.fenceRect, put = (x, z, side, kind = 'fence') => { const key = `${x},${z},${side}`; if (!f.missing.includes(key)) { s.fences[key] = kind; count(kind); } };
  for (let x = f.x0; x <= f.x1; x++) { put(x, f.z0, 'n', x === f.gateX ? 'gate' : 'fence'); put(x, f.z1 + 1, 'n'); }
  for (let z = f.z0; z <= f.z1; z++) { put(f.x0, z, 'w'); put(f.x1 + 1, z, 'w'); }
  for (const [id, level] of Object.entries(RESTORE.roads)) if (ROAD_SEGMENTS.some(r => r.id === id)) s.cond[id] = { level: level === 'broken' ? 3 : 1, ms: 0 };
  if (RESTORE.farmhouse === 'worn') s.cond.house = { level: 1, ms: WEAR.ms[0] };
  // the first two build steps (clear the land, the farm plot) are already behind the player; the guide starts at the harvest
  s.projects.step = 2; s.firsts['project:clear'] = now; s.firsts['project:plot'] = now;
  s.stats.cleared = 3; s.stats.built = { ...s.counts }; s.story.tutorial = 0;   // the restored village has its own first session (content/story.mjs RESTORE_TUTORIAL)
  return s;
}
