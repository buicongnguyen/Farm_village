// Which things work. A thing is broken (condition level 3) until it is repaired, and out of order while its repair runs.
// Kept free of imports so the rules, the build order's tests (content/projects.mjs) and the interface can all use it.
export const levelOf = (s, id) => s.cond?.[id]?.level ?? 0;
export const isBroken = (s, id) => levelOf(s, id) >= 3;
export const isRepairing = (s, id) => !!s.repairing?.[id];
export const isWorking = (s, id) => !isBroken(s, id) && !isRepairing(s, id);
/** How many placed things of a kind stand but do not work (broken, or being repaired). */
export const outOfOrder = (s, kind) => Object.keys(s.placed).filter(id => s.placed[id].kind === kind && !isWorking(s, id)).length;
/** Working things plus the ones being repaired: the places already taken among the allowance. */
export const committedCount = (s, kind) => Object.keys(s.placed).filter(id => s.placed[id].kind === kind && (isWorking(s, id) || isRepairing(s, id))).length;
/** How many placed things of a kind work (repaired or never broken). */
export const workingCount = (s, kind) => Object.keys(s.placed).filter(id => s.placed[id].kind === kind && isWorking(s, id)).length;
