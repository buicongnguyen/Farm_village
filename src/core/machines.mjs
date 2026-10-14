import { HELP } from '../content/economy.mjs';
import { START_PARCEL, parcelOf } from '../content/world.mjs';
// Machines (2026-10-14): a tractor shed and a drone pad are placed like any building, and owning one is its whole rule.
//   a working tractor shed (two at most): the family's round can harvest MACHINES.beds more expansion beds
//   the earlier family routine replants; finite work-board assignments never replant or select additional targets
//   a working drone pad: the orchard is sprayed, and fruit comes back in MACHINES.spray of the time
//   a working buffalo pen (the first help, long before machines): MACHINES.ox more beds a round
// view/machines-view.mjs walks the buffalo and drives the tractors round the beds and flies the drone over the trees.
import { isWorking } from './working.mjs';
export const MACHINES = { beds: 8, spray: 0.75, ox: 4 };   // ox: the beds a buffalo adds to a round, before there are tractors
const working = (s, kind) => Object.entries(s.placed ?? {}).filter(([id, p]) => p.kind === kind && isWorking(s, id)).length;
export const tractors = s => Math.min(2, working(s, 'tractor_shed'));
export const buffalo = s => working(s, 'buffalo_pen') ? 1 : 0;
export const sprayFactor = s => working(s, 'drone_pad') ? MACHINES.spray : 1;

/** Tractor help belongs to purchased expansion fields; a buffalo can help on the opening farm too. */
export function machineField(s, id) {
  const p = s.placed?.[id], parcel = p && parcelOf(p.x, p.z);
  return !!parcel && parcel !== START_PARCEL && s.parcels.includes(parcel);
}
/** Preserve the chosen order, then add eligible new-field beds beyond the ordinary family round. */
export function familyBeds(s, ids) {
  const base = HELP.beds + MACHINES.ox * buffalo(s);
  return [...ids.slice(0, base), ...ids.slice(base).filter(id => machineField(s, id)).slice(0, MACHINES.beds * tractors(s))];
}
