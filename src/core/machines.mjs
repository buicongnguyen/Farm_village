// Machines (2026-10-14): a tractor shed and a drone pad are placed like any building, and owning one is its whole rule.
//   a working tractor shed (two at most): the family's round of help harvests and sows MACHINES.beds more beds
//   a working drone pad: the orchard is sprayed, and fruit comes back in MACHINES.spray of the time
// view/machines-view.mjs drives the tractors round the beds and flies the drone over the trees.
import { isWorking } from './working.mjs';
export const MACHINES = { beds: 8, spray: 0.75 };
const working = (s, kind) => Object.entries(s.placed ?? {}).filter(([id, p]) => p.kind === kind && isWorking(s, id)).length;
export const tractors = s => Math.min(2, working(s, 'tractor_shed'));
export const sprayFactor = s => working(s, 'drone_pad') ? MACHINES.spray : 1;
