// The farm's machines at work (core/machines.mjs): each working tractor shed sends a tractor round the beds, and the
// drone pad sends a drone over the orchard with a fan of spray under it. Two or three meshes moved each frame: no
// physics, no pathfinding. Loaded with import() the first time a shed or a pad stands on the farm (main.mjs).
import * as THREE from 'three';
import { loadKit, bake } from './models.mjs';
import { toonRamp } from '../kit/toon.mjs';
import { BUILDINGS } from '../content/buildings.mjs';
import { isWorking } from '../core/working.mjs';

const CELL = 2, SPEED = 2.6, LAP = 9;   // metres a cell, the tractor's speed (m/s), seconds for the drone's round
/** Where the machines go, from the save: the tractors' sheds, a loop round the beds, the drone's pad and the orchard. */
export function plan(s) {
  const placed = Object.entries(s.placed ?? {}), mid = ([, p]) => { const [w, d] = BUILDINGS[p.kind]?.size ?? [1, 1]; return [(p.x + w / 2) * CELL, (p.z + d / 2) * CELL]; };
  const sheds = placed.filter(([id, p]) => p.kind === 'tractor_shed' && isWorking(s, id)).map(mid), pad = placed.filter(([id, p]) => p.kind === 'drone_pad' && isWorking(s, id)).map(mid)[0] ?? null;
  const beds = placed.filter(([, p]) => p.kind === 'bed').map(mid), trees = placed.filter(([, p]) => BUILDINGS[p.kind]?.fruit).map(mid);
  let loop = null;
  if (beds.length) { const xs = beds.map(b => b[0]), zs = beds.map(b => b[1]), m = CELL * 0.9; loop = [Math.min(...xs) - m, Math.min(...zs) - m, Math.max(...xs) + m, Math.max(...zs) + m]; }
  let orchard = null;
  if (trees.length) { const cx = trees.reduce((n, t) => n + t[0], 0) / trees.length, cz = trees.reduce((n, t) => n + t[1], 0) / trees.length; orchard = [cx, cz, Math.min(12, Math.max(4, Math.max(...trees.map(t => Math.hypot(t[0] - cx, t[1] - cz))) * 0.75))]; }
  return { sheds: sheds.slice(0, 2), pad, loop, orchard };
}
/** A point and a heading on the rectangle [x0, z0, x1, z1], `u` metres along it. */
export function onLoop([x0, z0, x1, z1], u) {
  const w = x1 - x0, d = z1 - z0, per = 2 * (w + d); u = ((u % per) + per) % per;
  if (u < w) return [x0 + u, z0, Math.PI / 2];
  if (u < w + d) return [x1, z0 + (u - w), 0];
  if (u < 2 * w + d) return [x1 - (u - w - d), z1, -Math.PI / 2];
  return [x0, z1 - (u - 2 * w - d), Math.PI];
}
export async function installMachines(world, game) {
  const kit = await loadKit('decor'), mat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonRamp() });
  const make = node => { const m = new THREE.Mesh(bake(kit[node], { center: false }), mat); m.visible = false; m.userData.blob = 1.3; world.scene.add(m); return m; };
  const tractors = [make('tractor'), make('tractor')], drone = make('spray_drone');
  const spray = new THREE.Mesh(new THREE.ConeGeometry(1.5, 3.2, 10, 1, true), new THREE.MeshBasicMaterial({ color: '#bfefff', transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide }));
  spray.visible = false; world.scene.add(spray);
  let t = 0, p = plan(game.s), again = 0;
  world.onFrame(dt => {
    t += dt; if ((again -= dt) <= 0) { p = plan(game.s); again = 1.5; }
    tractors.forEach((m, i) => {
      const shed = p.sheds[i]; m.visible = !!shed; if (!shed) return;
      if (!p.loop) { m.position.set(shed[0], 0, shed[1] + CELL * 1.2); m.rotation.y = 0; return; }   // no beds to work: parked by its shed
      const per = 2 * (p.loop[2] - p.loop[0] + p.loop[3] - p.loop[1]), [x, z, yaw] = onLoop(p.loop, t * SPEED + i * per / 2);
      m.position.set(x, 0.04 * Math.abs(Math.sin(t * 9 + i)), z); m.rotation.y = yaw;   // a little rattle
    });
    drone.visible = !!p.pad; spray.visible = !!p.pad && !!p.orchard;
    if (p.pad) {
      if (p.orchard) { const a = t / LAP * Math.PI * 2, [cx, cz, r] = p.orchard; drone.position.set(cx + Math.cos(a) * r, 5 + 0.3 * Math.sin(t * 2), cz + Math.sin(a) * r); drone.rotation.y = -a; spray.position.set(drone.position.x, drone.position.y - 1.8, drone.position.z); }
      else drone.position.set(p.pad[0], 2.6 + 0.2 * Math.sin(t * 2), p.pad[1]);
    }
  });
}
