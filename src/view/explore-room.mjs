import * as THREE from 'three';
import { loadKit, bake } from './models.mjs';
import { Cast, loadRig, RIGS, wornRig, releaseRig } from './skinned.mjs';
import { wearOf } from '../content/wardrobe.mjs';
import { ROOM_PEOPLE } from '../content/room-people.mjs';
import { HOME_FAMILY } from '../content/explore.mjs';
import { roomRoute, roomClear } from '../core/explore-navigation.mjs';
import { toonRamp } from '../kit/toon.mjs';
import { outfitOf } from './people-view.mjs';
import { buildCottage } from './cottage-view.mjs';

const wearOfPerson = w => [w.kit && `kit:${w.kit}`, w.hat].filter(Boolean).join('+');   // a person's work clothes, as a rig's wear list
export async function loadHomeRoom(body, kind = null) {
  const file = kind ?? 'cottage';
  if (kind && !['hospital', 'police', 'company', 'school', 'barn', 'bakery', 'supermarket', 'feed_mill', 'dairy'].includes(kind)) throw Error('unknown interior');
  const [kit, response, , extraKit, keepsakes] = await Promise.all([loadKit('cottage-furniture'), fetch(`./assets/models/interior-${file}.json`), loadRig(body),
    kind ? loadKit('facility-props') : loadKit('interior-extras'), kind ? null : loadKit('interior-farmhouse'),
    ...(kind ? [] : HOME_FAMILY.map(f => loadRig(f.body).catch(() => null))),
    ...(ROOM_PEOPLE[kind] ?? []).map(w => loadRig(wornRig(w.body, wearOfPerson(w))).catch(() => null))]);
  if (!response.ok) throw Error('room metadata');
  const data = await response.json();
  if (data.schemaVersion !== 2 || data.roomId !== (kind ? `${kind}_interior` : 'farmhouse_main')) throw Error('room schema');
  return { kit: { ...kit, ...(kind ? extraKit : keepsakes) }, data, extras: kind ? null : extraKit };
}
export class ExploreRoom {
  constructor({ kit, data, extras }, settings) {
    this.data = data; this.scene = new THREE.Scene(); this.scene.background = new THREE.Color('#3b2a24');
    this.camera = new THREE.OrthographicCamera(-8, 8, 8, -8, .1, 100);
    this.camera.position.fromArray(data.camera.position); this.camera.lookAt(...data.camera.target); this.camera.updateMatrixWorld();
    const hemi = new THREE.HemisphereLight('#fff3df', '#b07a52', 1.55), sun = new THREE.DirectionalLight('#ffe9c8', 1.7);
    sun.position.set(4, 14, 9); this.scene.add(hemi, sun);
    this.material = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonRamp() });
    this.meshes = buildCottage(kit, data, this.material); this.scene.add(...this.meshes);
    for (const c of data.comforts ?? []) if (extras?.[c.node]) {
      const mesh = new THREE.Mesh(bake(extras[c.node], { center: false }), this.material); mesh.position.fromArray(c.position);
      this.scene.add(mesh); this.meshes.push(mesh);
    }
    this.body = settings.playerBody === 'woman' ? 'woman' : 'man';
    this.cast = new Cast({ scene: this.scene, cam: { lod: 0, x: 0, z: 0, camera: this.camera }, onFrame: f => { this.actorFrame = f; } }, { max: 1 + (data.people?.length ?? 0) + (data.site === 'farmhouse' ? HOME_FAMILY.length : 0) });
    this.player = this.cast.add({ rig: wornRig(this.body, wearOf({ settings })), x: data.entry.position[0], z: data.entry.position[2], rot: Math.PI, clip: 'Idle', scale: 1.8 / RIGS[this.body].height,
      tint: outfitOf('you', { settings }), priority: 10 });
    // the people of the building (content/room-people.mjs): in their work clothes, turned to the spot you walk up to
    this.people = (data.people ?? []).map(w => this.cast.add({ who: w.id, rig: wornRig(w.body, wearOfPerson(w)), x: w.position[0], z: w.position[1], rot: Math.atan2(w.stand[0] - w.position[0], w.stand[1] - w.position[1]),
      clip: 'Idle', scale: (w.body === 'kid' ? 1.3 : 1.8) / RIGS[w.body].height, tint: { ...outfitOf(`room_${w.id}`, { settings }), top: w.top, bottom: w.bottom }, priority: 5, near: 0 }));
    // the family at home (content/explore.mjs HOME_FAMILY): each starts at one of their things, a quarter turn apart
    this.family = data.site !== 'farmhouse' ? [] : HOME_FAMILY.map((f, i) => {
      const at = this.spotFor(f.rounds[0][0], i);
      return { ...f, turn: 0, route: [], wait: 3 + i * 2.5, say: null, sayFor: 0, near: 0,
        subject: this.cast.add({ rig: f.body, x: at[0], z: at[1], rot: Math.PI, clip: f.rounds[0][1], scale: f.height / RIGS[f.body].height, tint: outfitOf(f.id, { settings }), priority: 4 }) };
    });
    this.cast.select(); this.ray = new THREE.Raycaster(); this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.view = innerWidth < 600 ? 'follow' : 'whole'; this.followWidth = innerWidth < 600 ? 12 : 18;
    this.focus = new THREE.Vector3(...data.entry.position); this.quiet = !!settings.reducedMotion;
    this.resize();
  }
  /** Where a family member stands at a thing: beside the place you stand at it yourself, if there is floor. */
  spotFor(id, i = 0) {
    const o = this.data.interactions.find(x => x.id === id); if (!o) return [this.data.entry.position[0], this.data.entry.position[2] - 1];
    const s = [o.stand[0], o.stand[2]], side = [[.7, 0], [-.7, 0], [0, .7], [0, -.7]];
    for (let k = 0; k < 4; k++) { const [dx, dz] = side[(k + i) % 4], p = [s[0] + dx, s[1] + dz]; if (roomClear(this.data, p)) return p; }
    return s;
  }
  /** The family's rounds: walk to the next thing, hold its pose a while, say its line on arriving; wave when you come near. */
  familyFrame(dt, you) {
    for (const f of this.family) {
      const s = f.subject, goal = f.route[0]; f.sayFor = Math.max(0, f.sayFor - dt); if (!f.sayFor) f.say = null;
      if (goal) {
        const dx = goal[0] - s.x, dz = goal[1] - s.z, d = Math.hypot(dx, dz), step = Math.min(d, 1.5 * dt);
        if (d < 0.05) { f.route.shift(); if (!f.route.length) { const [id, , line] = f.rounds[f.turn]; f.wait = 7 + (f.turn * 3 + f.rounds.length) % 5; f.say = line; f.sayFor = 4.5; const o = this.data.interactions.find(x => x.id === id); if (o) s.rot = Math.atan2(o.focus[0] - s.x, o.focus[2] - s.z); } continue; }
        s.x += dx / d * step; s.z += dz / d * step; s.rot = Math.atan2(dx, dz); s.clip = 'Walk'; continue;
      }
      const close = Math.hypot(you[0] - s.x, you[1] - s.z) < 2.2; f.near = close ? f.near + dt : 0;
      if (close) s.rot = Math.atan2(you[0] - s.x, you[1] - s.z);
      s.clip = close && f.near < 1.7 ? 'Wave' : f.rounds[f.turn][1];
      if ((f.wait -= dt) > 0 || close) continue;
      for (let tries = 0; tries < f.rounds.length && !f.route.length; tries++) {   // the next thing they can walk to
        f.turn = (f.turn + 1) % f.rounds.length;
        f.route = roomRoute(this.data, [s.x, s.z], this.spotFor(f.rounds[f.turn][0], this.family.indexOf(f)));
      }
      if (!f.route.length) f.wait = 5;
    }
  }
  /** Dress your character again (the wardrobe): a new hat is a new rig, shown once it has loaded; colours change at once. */
  async dress(settings) {
    const rig = wornRig(this.body, wearOf({ settings })), tint = outfitOf('you', { settings });
    if (rig !== this.player.rig) {
      await loadRig(rig); if (this.gone || wornRig(this.body, wearOf({ settings })) !== rig) return;
      const { actor, ...old } = this.player; this.cast.remove(this.player); this.player = this.cast.add({ ...old, rig }); this.cast.select();
      releaseRig(old.rig);   // the hat you took off (kept while your character outdoors still wears it)
    }
    this.player.tint = tint;
    const u = this.player.actor?.uniforms; if (u) { u.uTop.value.set(tint.top); u.uBottom.value.set(tint.bottom); }
  }
  get movementYaw() { return Math.atan2(this.data.camera.position[0] - this.data.camera.target[0], this.data.camera.position[2] - this.data.camera.target[2]); }
  resize() {
    const points = [], b = this.data.bounds.room;
    for (const x of [b.min[0] - .4, b.max[0] + .4]) for (const y of [0, this.data.bounds.wallHeight + .1]) for (const z of [b.min[1] - .4, b.max[1] + .4]) points.push(new THREE.Vector3(x, y, z).applyMatrix4(this.camera.matrixWorldInverse));
    this.projectedBounds = new THREE.Box3().setFromPoints(points); this.layoutCamera();
  }
  layoutCamera() {
    const size = this.projectedBounds.getSize(new THREE.Vector3()), centre = this.projectedBounds.getCenter(new THREE.Vector3());
    // what the interface covers: the tool row at the top; at the foot the stick and buttons on a narrow window, one pill
    // and its hint on a wide one (the room was drawn in barely half of a desktop window)
    const wide = innerWidth >= 900, top = Math.min(wide ? 112 : 130, innerHeight * .24), bottom = Math.min(wide ? 96 : 180, innerHeight * .3), usable = Math.max(160, innerHeight - top - bottom);
    this.fullWidth = Math.max(size.x * (wide ? 1.03 : 1.08), size.y * (wide ? 1.03 : 1.08) * innerWidth / usable);
    const w = this.view === 'whole' ? this.fullWidth : Math.min(this.fullWidth, this.followWidth), h = w * innerHeight / innerWidth;
    const p = this.focus.clone().applyMatrix4(this.camera.matrixWorldInverse);
    const clampCentre = (value, lo, hi, span) => span >= hi - lo ? (lo + hi) / 2 : THREE.MathUtils.clamp(value, lo + span / 2, hi - span / 2);
    const cx = this.view === 'whole' ? centre.x : clampCentre(p.x, this.projectedBounds.min.x, this.projectedBounds.max.x, w * .9);
    const cy = (this.view === 'whole' ? centre.y : clampCentre(p.y, this.projectedBounds.min.y, this.projectedBounds.max.y, h * usable / innerHeight)) + (top - bottom) / 2 / innerHeight * h;
    Object.assign(this.camera, { left: cx - w / 2, right: cx + w / 2, top: cy + h / 2, bottom: cy - h / 2 }); this.camera.updateProjectionMatrix();
  }
  toggleView() { this.view = this.view === 'whole' ? 'follow' : 'whole'; this.layoutCamera(); }
  zoom(factor) {
    if (!Number.isFinite(factor) || factor <= 0) return;
    this.followWidth = THREE.MathUtils.clamp((this.view === 'whole' ? this.fullWidth : this.followWidth) * factor, 8, this.fullWidth);
    this.view = this.followWidth >= this.fullWidth ? 'whole' : 'follow'; this.layoutCamera();
  }
  frame(session, moving, dt, state) {
    for (const mesh of this.meshes) if (mesh.userData.memory) mesh.visible = state?.supermarket?.memories?.[mesh.userData.memory] != null;
    const seat = this.data.seats?.[0], p = session.seated ? [seat.position[0], seat.position[2]] : session.p;
    const y = session.seated ? seat.cushionTop - seat.measured[this.body].hipHeight : 0;
    Object.assign(this.player, { x: p[0], y, z: p[1], rot: session.seated ? Math.atan2(seat.facing[0], seat.facing[2]) : session.yaw, clip: session.seated ? 'Sit' : moving ? 'Walk' : 'Idle', speed: 1 });
    if (!this.quiet || this.family.some(f => f.route.length)) this.familyFrame(dt, p);
    for (const w of this.people) {   // they turn to you as you come near, wave once, and talk while you talk
      const dx = p[0] - w.x, dz = p[1] - w.z, close = Math.hypot(dx, dz) < 2.8;
      w.near = close ? w.near + dt : 0;
      if (close) { let turn = Math.atan2(dx, dz) - w.rot; turn = Math.atan2(Math.sin(turn), Math.cos(turn)); w.rot += turn * (this.quiet ? 1 : 1 - Math.exp(-6 * dt)); }
      w.clip = this.talking === w.who ? 'Talk' : close && w.near < 1.7 ? 'Wave' : 'Idle';
    }
    this.focus.lerp(new THREE.Vector3(p[0], .8, p[1]), this.quiet ? 1 : 1 - Math.exp(-9 * dt)); this.layoutCamera(); this.actorFrame(dt);
  }
  project(position) {
    const v = new THREE.Vector3(...position).project(this.camera);
    return { x: (v.x + 1) * innerWidth / 2, y: (1 - v.y) * innerHeight / 2, visible: v.z >= -1 && v.z <= 1 };
  }
  pick(x, y) {
    this.ray.setFromCamera(new THREE.Vector2(x / innerWidth * 2 - 1, 1 - y / innerHeight * 2), this.camera);
    for (const w of this.people) {   // (people are skinned actors: found by where they stand on the screen)
      const feet = this.project([w.x, 0, w.z]), head = this.project([w.x, 1.9, w.z]);
      if (Math.abs(x - feet.x) < 26 && y > head.y - 10 && y < feet.y + 8) return { id: `person_${w.who}` };
    }
    const hit = this.ray.intersectObjects(this.meshes.filter(m => m.visible))[0];
    if (hit?.object.userData.interaction) return { id: hit.object.userData.interaction };
    const p = this.ray.ray.intersectPlane(this.plane, new THREE.Vector3()); return p ? { point: [p.x, p.z] } : null;
  }
  dispose() {
    this.gone = true;
    for (const m of this.meshes) m.geometry.dispose(); this.material.dispose();
    this.family = []; const worn = [this.player, ...this.people].map(s => s.rig); this.cast.retire(); for (const name of worn) releaseRig(name);
    this.scene.clear();
  }
}
