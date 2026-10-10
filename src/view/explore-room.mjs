import * as THREE from 'three';
import { loadKit, bake } from './models.mjs';
import { Cast, loadRig, RIGS } from './skinned.mjs';
import { addLights, toonRamp } from '../kit/toon.mjs';
import { HOME_OBJECTS, HOME_COMFORT } from '../content/explore.mjs';

export async function loadHomeRoom(body) {
  const [kit, response, , extras] = await Promise.all([loadKit('interior-farmhouse'), fetch('./assets/models/interior-farmhouse.json'), loadRig(body), loadKit('interior-extras').catch(() => null)]);   // the extras are a nicety: the room works without them
  if (!response.ok) throw Error('room metadata');
  const data = await response.json();
  if (data.schemaVersion !== 1 || data.roomId !== 'farmhouse_main') throw Error('room schema');
  return { kit, data, extras };
}
export class ExploreRoom {
  constructor({ kit, data, extras }, settings, level = 1) {
    this.data = data; this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-8, 8, 8, -8, .1, 100);
    this.camera.position.fromArray(data.camera.position); this.camera.lookAt(...data.camera.target); this.camera.updateMatrixWorld();
    addLights(this.scene);
    this.material = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonRamp() });
    this.meshes = [];
    for (const item of data.meshes) {
      if (data.hiddenWalls.full.includes(item.node)) continue;
      const geometry = bake(kit[item.node], { center: false });
      const mesh = new THREE.Mesh(geometry, this.material); mesh.position.fromArray(item.position); mesh.rotation.y = item.yaw;
      mesh.userData.interaction = HOME_OBJECTS[item.node] ? item.node : null;
      this.scene.add(mesh); this.meshes.push(mesh);
    }
    // what the house's level has added to the room (content/explore.mjs HOME_COMFORT): authored in room coordinates
    for (const c of HOME_COMFORT) if (level >= c.level && extras?.[c.node]) { const mesh = new THREE.Mesh(bake(extras[c.node], { center: false }), this.material); mesh.userData.interaction = null; this.scene.add(mesh); this.meshes.push(mesh); }
    const body = settings.playerBody === 'woman' ? 'woman' : 'man';
    this.cast = new Cast({ scene: this.scene, cam: { lod: 0, x: 0, z: 0, camera: this.camera }, onFrame: f => { this.actorFrame = f; } }, { max: 1 });
    this.player = this.cast.add({ rig: body, x: 0, z: 2.15, rot: Math.PI, clip: 'Idle', scale: 1.8 / RIGS[body].height,
      tint: { top: settings.playerColor, bottom: '#2f5aa8', hair: '#2a1a12' }, priority: 10 });
    this.cast.select(); this.ray = new THREE.Raycaster(); this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.resize();
  }
  resize() {
    const points = [];
    for (const x of [-4, 4]) for (const y of [0, 2.8]) for (const z of [-3, 3]) points.push(new THREE.Vector3(x, y, z).applyMatrix4(this.camera.matrixWorldInverse));
    const box = new THREE.Box3().setFromPoints(points), size = box.getSize(new THREE.Vector3()), centre = box.getCenter(new THREE.Vector3());
    const top = 80, bottom = Math.min(210, innerHeight * .32), usable = Math.max(.4, (innerHeight - top - bottom) / innerHeight);
    const h = Math.max(size.y * 1.1 / usable, size.x * 1.15 * innerHeight / innerWidth), w = h * innerWidth / innerHeight;
    const cy = centre.y + (top - bottom) / 2 / innerHeight * h;
    Object.assign(this.camera, { left: centre.x - w / 2, right: centre.x + w / 2, top: cy + h / 2, bottom: cy - h / 2 });
    this.camera.updateProjectionMatrix();
  }
  frame(session, moving, dt) {
    const seat = this.data.seats[0], p = session.seated ? [seat.position[0], seat.position[2]] : session.p;
    Object.assign(this.player, { x: p[0], z: p[1], rot: session.seated ? Math.PI / 2 : session.yaw, clip: session.seated ? 'Sit' : moving ? 'Walk' : 'Idle', speed: 1 });
    this.actorFrame(dt);
  }
  pick(x, y) {
    this.ray.setFromCamera(new THREE.Vector2(x / innerWidth * 2 - 1, 1 - y / innerHeight * 2), this.camera);
    const hit = this.ray.intersectObjects(this.meshes)[0];
    if (hit?.object.userData.interaction) return { id: hit.object.userData.interaction };
    const p = this.ray.ray.intersectPlane(this.plane, new THREE.Vector3());
    return p ? { point: [p.x, p.z] } : null;
  }
  dispose() {
    for (const m of this.meshes) m.geometry.dispose(); this.material.dispose();
    for (const a of this.cast.actors) { a.mixer.stopAllAction(); a.mesh.material.dispose(); a.mesh.skeleton.dispose(); }
    this.scene.clear();
  }
}
