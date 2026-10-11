// Optional civic visits share Explore's transient navigation, never its saved memories or any new rewards.
import { ACTIONS } from './act.mjs';
import { exploreSession, outdoorClear, safeHome, atObject } from './explore.mjs';
import { BARN } from '../content/world.mjs';
import { doorCell } from './grid.mjs';
import { isWorking } from './working.mjs';
import { roomClear, xz } from './explore-navigation.mjs';
import { facilityKind } from '../content/civic-interiors.mjs';
export { facilityKind };
export function facilityDoor(s, id) {
  if (!facilityKind(s, id)) return null;
  if (id === 'barn') return [BARN.x * 2 + 7, BARN.z * 2 + 1];
  const p = s.placed[id], cell = doorCell(p.kind, p.x, p.z, p.rot);
  return cell?.map(v => v * 2 + 1) ?? null;
}
export const facilityOpen = (s, id) => !!facilityKind(s, id) && isWorking(s, id);
export const civicExploreActions = {
  enterFacility(ctx, { id }) {
    const s = ctx.s, e = exploreSession(s), kind = facilityKind(s, id), door = facilityDoor(s, id);
    if (!e || e.location !== 'outdoors' || !door || e.room.site !== kind || Math.hypot(e.p[0] - door[0], e.p[1] - door[1]) > .35) return ctx.fail('Walk to this building’s door first');
    if (!facilityOpen(s, id)) return ctx.fail('Repair this building before going inside');
    if (!outdoorClear(s, door, e.blocked) || !roomClear(e.room, xz(e.room.entry.position))) return ctx.fail('The way is blocked. Try another spot.');
    e.site = id; e.returnPoint = [...door]; e.location = e.room.roomId; e.p = xz(e.room.entry.position); e.yaw = Math.PI; e.route = []; e.seated = false; return {};
  },
  leaveFacility(ctx, { recover = false }) {
    const s = ctx.s, e = exploreSession(s);
    if (!e?.site || e.location !== e.room.roomId || (!recover && !atObject(s, e.room.exit.id))) return ctx.fail('Walk to the door first');
    let p = null;
    // A repair/removal during a visit may block the old doorstep. Find safe ground nearby, then the farmhouse porch.
    for (let r = 0; r <= 3 && !p; r++) for (let x = -r; x <= r && !p; x++) for (let z = -r; z <= r; z++) {
      const at = [e.returnPoint[0] + x * 2, e.returnPoint[1] + z * 2]; if (outdoorClear(s, at, e.blocked)) { p = at; break; }
    }
    p ??= safeHome(s, e.blocked); if (!p) return ctx.fail('The way is blocked. Try another spot.');
    e.location = 'outdoors'; e.p = p; e.route = []; e.seated = false; return {};
  },
};
export const installCivicExplore = () => Object.assign(ACTIONS, civicExploreActions);
