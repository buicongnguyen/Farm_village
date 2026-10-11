import * as THREE from 'three';
import { loadKit, bake } from './models.mjs';
import { Cast, loadRig, RIGS } from './skinned.mjs';
import { toonRamp } from '../kit/toon.mjs';
import { outfitOf } from './people-view.mjs';
import { buildCottage } from './cottage-view.mjs';

export async function loadHomeRoom(body, kind = null) {
  const file = kind ?? 'cottage';
  if (kind && !['hospital', 'police', 'company', 'school', 'barn', 'bakery', 'supermarket'].includes(kind)) throw Error('unknown interior');
  const [kit, response, , extraKit, keepsakes] = await Promise.all([loadKit('cottage-furniture'), fetch(`./assets/models/interior-${file}.json`), loadRig(body),
    kind ? loadKit('facility-props') : loadKit('interior-extras'), kind ? null : loadKit('interior-farmhouse')]);
  if (!response.ok) throw Error('room metadata');
  const data = await response.json();
  if (data.schemaVersion !== 2 || data.roomId !== (kind ? `${kind}_interior` : 'farmhouse_main')) throw Error('room schema');
  return { kit: { ...kit, ...(kind ? extraKit : keepsakes) }, data, extras: kind ? null : extraKit };
}
export class ExploreRoom {
  constructor({ kit, data, extras }, settings) {
    this.data = data; this.scene = new THREE.Scene(); this.scene.background = new THREE.Color('#2a1d1a');
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
    this.cast = new Cast({ scene: this.scene, cam: { lod: 0, x: 0, z: 0, camera: this.camera }, onFrame: f => { this.actorFrame = f; } }, { max: 1 });
    this.player = this.cast.add({ rig: this.body, x: data.entry.position[0], z: data.entry.position[2], rot: Math.PI, clip: 'Idle', scale: 1.8 / RIGS[this.body].height,
      tint: outfitOf('you', { settings }), priority: 10 });
    this.cast.select(); this.ray = new THREE.Raycaster(); this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.view = innerWidth < 600 ? 'follow' : 'whole'; this.followWidth = innerWidth < 600 ? 12 : 18;
    this.focus = new THREE.Vector3(...data.entry.position); this.quiet = !!settings.reducedMotion;
    this.resize();
  }
  get movementYaw() { return Math.atan2(this.data.camera.position[0] - this.data.camera.target[0], this.data.camera.position[2] - this.data.camera.target[2]); }
  resize() {
    const points = [], b = this.data.bounds.room;
    for (const x of [b.min[0] - .4, b.max[0] + .4]) for (const y of [0, this.data.bounds.wallHeight + .1]) for (const z of [b.min[1] - .4, b.max[1] + .4]) points.push(new THREE.Vector3(x, y, z).applyMatrix4(this.camera.matrixWorldInverse));
    this.projectedBounds = new THREE.Box3().setFromPoints(points); this.layoutCamera();
  }
  layoutCamera() {
    const size = this.projectedBounds.getSize(new THREE.Vector3()), centre = this.projectedBounds.getCenter(new THREE.Vector3());
    const top = Math.min(130, innerHeight * .24), bottom = Math.min(180, innerHeight * .3), usable = Math.max(160, innerHeight - top - bottom);
    this.fullWidth = Math.max(size.x * 1.08, size.y * 1.08 * innerWidth / usable);
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
  frame(session, moving, dt) {
    const seat = this.data.seats?.[0], p = session.seated ? [seat.position[0], seat.position[2]] : session.p;
    const y = session.seated ? seat.cushionTop - seat.measured[this.body].hipHeight : 0;
    Object.assign(this.player, { x: p[0], y, z: p[1], rot: session.seated ? Math.atan2(seat.facing[0], seat.facing[2]) : session.yaw, clip: session.seated ? 'Sit' : moving ? 'Walk' : 'Idle', speed: 1 });
    this.focus.lerp(new THREE.Vector3(p[0], .8, p[1]), this.quiet ? 1 : 1 - Math.exp(-9 * dt)); this.layoutCamera(); this.actorFrame(dt);
  }
  project(position) {
    const v = new THREE.Vector3(...position).project(this.camera);
    return { x: (v.x + 1) * innerWidth / 2, y: (1 - v.y) * innerHeight / 2, visible: v.z >= -1 && v.z <= 1 };
  }
  pick(x, y) {
    this.ray.setFromCamera(new THREE.Vector2(x / innerWidth * 2 - 1, 1 - y / innerHeight * 2), this.camera);
    const hit = this.ray.intersectObjects(this.meshes)[0];
    if (hit?.object.userData.interaction) return { id: hit.object.userData.interaction };
    const p = this.ray.ray.intersectPlane(this.plane, new THREE.Vector3()); return p ? { point: [p.x, p.z] } : null;
  }
  dispose() {
    for (const m of this.meshes) m.geometry.dispose(); this.material.dispose();
    for (const a of this.cast.actors) { a.mixer.stopAllAction(); a.mesh.material.dispose(); a.mesh.skeleton.dispose(); }
    this.scene.clear();
  }
}
