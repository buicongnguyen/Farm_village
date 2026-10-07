// Places added after a save was made (v0.3), found a spot for when the old save loads.
import { canPlace, touch } from './grid.mjs';

/** An older save gets the places v0.3 added: a fish pond on the farm and the market square in the village, where there is room
 * (both already work: only the restored start has them run down). Returns the kinds that found a spot. */
export function addNewPlaces(s) {
  const probe = Object.create(s); probe.level = 99;   // the level gate is for building, not for a gift
  const out = [], put = (kind, x, z, rot) => {
    const id = `p${s.nextId++}`; s.placed[id] = { kind, x, z, rot }; s.counts[kind] = (s.counts[kind] ?? 0) + 1; touch(s); out.push(kind); return id;
  };
  const fits = (kind, x, z, rot) => { const r = canPlace(probe, kind, x, z, rot); return r.ok; };
  if (!(s.counts.pond > 0)) {
    find: for (let z = 50; z <= 80; z++) for (let x = 36; x <= 70; x++) if (fits('pond', x, z, 0)) { put('pond', x, z, 0); break find; }
  }
  if (!(s.counts.market > 0)) {
    find: for (let x = 60; x <= 92; x++) for (const z of [93, 94, 95]) if (fits('market', x, z, 2)) { put('market', x, z, 2); break find; }
  }
  return out;
}
