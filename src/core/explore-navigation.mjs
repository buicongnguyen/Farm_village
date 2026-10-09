// Room navigation uses metres, not the outdoor two-metre cells. All moves are swept in small steps.
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
export const xz = p => [p[0], p[2]];
export function roomClear(room, p) {
  if (!p?.every(Number.isFinite)) return false;
  const b = room.bounds.avatarCentre, r = room.bounds.avatar.radius;
  if (p.some((v, i) => v < b.min[i] || v > b.max[i])) return false;
  return !room.colliders.some(c => p[0] > c.min[0] - r && p[0] < c.max[0] + r && p[1] > c.min[1] - r && p[1] < c.max[1] + r);
}
export function segmentClear(a, b, clear, crosses = () => false) {
  const n = Math.max(1, Math.ceil(distance(a, b) / .08)); let previous = a;
  for (let i = 1; i <= n; i++) {
    const next = a.map((v, k) => v + (b[k] - v) * i / n);
    if (!clear(next) || crosses(previous, next)) return false;
    previous = next;
  }
  return true;
}
export function movePoint(p, delta, clear, crosses) {
  const n = Math.max(1, Math.ceil(Math.hypot(...delta) / .08)); let next = [...p];
  for (let i = 0; i < n; i++) for (const axis of [0, 1]) {
    const q = [...next]; q[axis] += delta[axis] / n;
    if (segmentClear(next, q, clear, crosses)) next = q;
  }
  return next;
}
export function roomRoute(room, from, to) {
  const clear = p => roomClear(room, p);
  if (!clear(from) || !clear(to)) return [];
  if (segmentClear(from, to, clear)) return [[...to]];
  // A fine bounded graph joins exact interaction anchors at both ends. No corner cutting.
  const nodes = [from, to], b = room.bounds.avatarCentre;
  for (let x = b.min[0]; x <= b.max[0]; x += .4) for (let z = b.min[1]; z <= b.max[1]; z += .4) if (clear([x, z])) nodes.push([x, z]);
  const queue = [0], prev = new Map([[0, -1]]);
  for (let h = 0; h < queue.length; h++) {
    const i = queue[h];
    for (let j = 1; j < nodes.length; j++) {
      if (prev.has(j) || distance(nodes[i], nodes[j]) > .81 || !segmentClear(nodes[i], nodes[j], clear)) continue;
      prev.set(j, i); queue.push(j);
      if (j === 1) {
        const path = []; for (let k = 1; k; k = prev.get(k)) path.unshift(nodes[k]);
        return path;
      }
    }
  }
  return [];
}
