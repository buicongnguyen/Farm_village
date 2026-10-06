// Seeded random numbers (mulberry32). The game keeps its seed in the save, so orders, neighbours and daily picks are
// the same for the same save, and tests are repeatable.
export function rng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.int = n => Math.floor(next() * n);
  next.pick = list => list[Math.floor(next() * list.length)];
  next.state = () => a;
  return next;
}
/** Draw from the state's own seed and store the advanced seed back (keeps saves deterministic). */
export function draw(state, f) {
  const r = rng(state.seed); const out = f(r); state.seed = r.state(); return out;
}
/** A stable hash of strings and numbers, for per-day or per-cell picks that need no stored seed. */
export function hash(...parts) {
  let h = 2166136261;
  for (const ch of parts.join('|')) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
