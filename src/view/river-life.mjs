// Life on the river and by the hotel (2026-10-14). Scenery only: no rules, nothing saved, nothing to bump into.
//   on the water   a rowing boat from the start; once the quay is paved, a ferry that shuttles along it and a barge
//                  that comes down the river and goes out of sight
//   by the hotel   (once it stands) a small tennis court with two people at a rally and a playground with children,
//                  on the strand between the quay and the towpath, and guests strolling along the quay
// A handful of meshes moved each frame and a few people for the cast; loaded after the village dressing (dress.mjs).
import * as THREE from 'three';
import { CELL, QUAY } from '../content/world.mjs';
import { loadKit, bake } from './models.mjs';
import { decorMaterial } from './backdrop.mjs';
import { brookCentre } from './brook.mjs';
import { castOf } from './skinned.mjs';

/** The strand is four cells deep here (the brook swings south): room for a court and a playground. Cells. */
export const COURT = { x: 68.5, z: 9.5 }, PLAYGROUND = { x: 74.5, z: 9.5 };
const WEST = (QUAY.x0 + 2) * CELL, EAST = (QUAY.x1 + 10) * CELL;   // the ferry's two ends, metres (east of the old mill)
/** A boat on the river at x metres, `side` metres off the centre line, heading east (dir 1) or west (-1): [x, z, yaw]. */
export function afloat(x, side, dir) {
  const k = (brookCentre(x + 1) - brookCentre(x - 1)) / 2, len = Math.hypot(1, k);
  return [x - k / len * side, brookCentre(x) + side / len, Math.atan2(dir, dir * k)];
}
/** The ferry's place t seconds into its round: along to the east end, a wait, back, a wait. { x, dir, moored } */
export function ferryAt(t, speed = 3, wait = 7) {
  const run = (EAST - WEST) / speed, round = 2 * (run + wait), u = ((t % round) + round) % round;
  if (u < run) return { x: WEST + u * speed, dir: 1, moored: false };
  if (u < run + wait) return { x: EAST, dir: 1, moored: true };
  if (u < 2 * run + wait) return { x: EAST - (u - run - wait) * speed, dir: -1, moored: false };
  return { x: WEST, dir: -1, moored: true };
}
export class RiverLife {
  constructor(world, game) {
    Object.assign(this, { world, game, t: 0, ready: false, again: 0, state: {} });
    this.load().catch(e => console.warn('river life', e));
  }
  async load() {
    const kit = await loadKit('decor'), mat = decorMaterial(), world = this.world;
    const mesh = node => { if (!kit[node]) return null; const m = new THREE.Mesh(bake(kit[node], { center: false }), mat); m.visible = false; world.scene.add(m); return m; };
    Object.assign(this, { row: mesh('boat_row'), ferry: mesh('boat_ferry'), barge: mesh('boat_barge'), court: mesh('tennis_court'), play: mesh('playground') });
    this.ball = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshBasicMaterial({ color: '#e8ff5a' })); this.ball.visible = false; world.scene.add(this.ball);
    if (this.court) this.court.position.set(COURT.x * CELL, 0.02, COURT.z * CELL);
    if (this.play) this.play.position.set(PLAYGROUND.x * CELL, 0.02, PLAYGROUND.z * CELL);
    const cast = castOf(world), who = (rig, top, bottom, x, z, rot, clip = 'Idle') => cast.add({ rig, x, z, rot, clip, hidden: true, farHide: true, tint: { top, bottom, hair: '#3a2419' } });
    const cx = COURT.x * CELL, cz = COURT.z * CELL, px = PLAYGROUND.x * CELL, pz = PLAYGROUND.z * CELL;
    this.players = [who('woman', '#ffffff', '#e0496b', cx - 3.6, cz, Math.PI / 2), who('man', '#3d7bd0', '#ffffff', cx + 3.6, cz, -Math.PI / 2)];
    this.children = [who('kid', '#ffcf3f', '#2f4f8a', px - 1.6, pz + 1.9, 2.4, 'Jump'), who('girl', '#ff8fb0', '#4a6fd0', px + 1.9, pz + 1.6, -2.2, 'Cheer')];
    this.guests = [who('man', '#6b7280', '#374151', 0, 0, 0, 'Walk'), who('woman', '#9b5de5', '#fff4e2', 0, 0, 0, 'Walk')];
    world.onFrame(dt => this.frame(dt)); this.ready = true;
  }
  /** What stands, read from the save now and then: is the quay paved, where the hotel is, where the halt is. */
  look() {
    const s = this.game.s, placed = Object.values(s.placed ?? {}), mid = kind => { const p = placed.find(q => q.kind === kind); return p ? (p.x + 3) * CELL : null; };
    this.state = { quay: !!s.firsts?.quay, hotel: mid('hotel'), halt: mid('halt') };
  }
  frame(dt) {
    if (!this.ready) return; this.t += dt; const t = this.t;
    if ((this.again -= dt) <= 0) { this.look(); this.again = 2; }
    const { quay, hotel, halt } = this.state, bob = a => 0.05 + 0.04 * Math.sin(t * 1.3 + a);
    const put = (m, x, side, dir, a, roll = 0) => { if (!m) return; const [bx, bz, yaw] = afloat(x, side, dir); m.position.set(bx, bob(a), bz); m.rotation.set(0, yaw, roll * Math.sin(t * 1.1 + a)); };
    if (this.row) { this.row.visible = true; const u = Math.sin(t * 0.07) * 26; put(this.row, 150 + u, 1.7, Math.cos(t * 0.07) >= 0 ? 1 : -1, 1, 0.05); }
    if (this.ferry) { this.ferry.visible = quay; if (quay) { const f = ferryAt(t); put(this.ferry, f.x, -1.1, f.dir, 2, 0.02); } }
    if (this.barge) { this.barge.visible = quay; if (quay) { const lap = 190, u = (t % lap) / lap; put(this.barge, 100 + u * 330, 1.3, 1, 3, 0.012); } }   // down the river and out of sight, then the next one
    const on = hotel != null;
    for (const m of [this.court, this.play]) if (m) m.visible = on;
    for (const p of [...this.players, ...this.children, ...this.guests]) p.hidden = !on;
    this.ball.visible = on; if (!on) return;
    // the rally: the ball crosses the net every 1.3 s, and whoever it comes to swings
    const beat = t / 1.3, k = beat % 1, east = Math.floor(beat) % 2 === 0, cx = COURT.x * CELL, cz = COURT.z * CELL, from = east ? -3.2 : 3.2;
    this.ball.position.set(cx + from + (-2 * from) * k, 0.9 + 1.5 * Math.sin(Math.PI * k), cz + 0.5 * Math.sin(beat * 0.7));
    this.players[0].clip = !east && k > 0.75 || east && k < 0.2 ? 'Wave' : 'Idle'; this.players[1].clip = east && k > 0.75 || !east && k < 0.2 ? 'Wave' : 'Idle';
    // guests stroll the quay between the hotel and the halt (or a short way along it), one each way
    const a = hotel, b = halt ?? hotel + (hotel > 150 ? -24 : 24), z = (QUAY.z0 + 1) * CELL;
    this.guests.forEach((g, i) => { const span = Math.abs(b - a) || 1, lap = span / 1.2, u = ((t + i * lap) % (2 * lap)) / lap, f = u < 1 ? u : 2 - u, dir = (u < 1 ? 1 : -1) * Math.sign(b - a || 1);
      Object.assign(g, { x: a + (b - a) * f, z: z + (i ? 0.9 : -0.9), rot: dir > 0 ? Math.PI / 2 : -Math.PI / 2, clip: 'Walk' }); });
  }
}
