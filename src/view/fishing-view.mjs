// Fishing tackle follows reserved shore seats. Three shared draws, regardless of how many people fish.
// This view never awards fish or advances the catch clock; those rules belong to core/fishing.
import * as THREE from 'three';
import { CELL } from '../content/world.mjs';
import { POND_SHAPE } from './brook.mjs';
import { loadKitLater } from './models.mjs';

const MAX = 24, SEGMENTS = 8;
const up = new THREE.Vector3(0, 1, 0), a = new THREE.Vector3(), b = new THREE.Vector3();
const direction = new THREE.Vector3(), scale = new THREE.Vector3(), rotation = new THREE.Quaternion(), matrix = new THREE.Matrix4();

export class FishingView {
  constructor(world, game, people) {
    Object.assign(this, { world, game, people, time: 0, entries: [], casts: new Map() });
    const instance = (name, geometry, material) => {
      const mesh = new THREE.InstancedMesh(geometry, material, MAX);
      mesh.name = name; mesh.count = 0; mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); world.scene.add(mesh); return mesh;
    };
    this.rods = instance('fishing-rods', new THREE.CylinderGeometry(.026, .045, 1, 5), new THREE.MeshLambertMaterial({ color: '#8a5230' }));
    const float = new THREE.SphereGeometry(.17, 8, 6), colors = [], red = new THREE.Color('#e63946'), white = new THREE.Color('#fff4e2');
    for (let i = 0; i < float.attributes.position.count; i++) {
      const c = float.attributes.position.getY(i) > 0 ? red : white; colors.push(c.r, c.g, c.b);
    }
    float.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    this.floats = instance('fishing-floats', float, new THREE.MeshBasicMaterial({ vertexColors: true }));
    this.positions = new Float32Array(MAX * SEGMENTS * 6);
    const line = new THREE.BufferGeometry();
    line.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    line.setDrawRange(0, 0);
    // per-vertex colour: your own line warms from cream to red as its tension rises (view/fishing-play.mjs)
    this.lineColors = new Float32Array(MAX * SEGMENTS * 6).fill(1);
    line.setAttribute('color', new THREE.BufferAttribute(this.lineColors, 3).setUsage(THREE.DynamicDrawUsage));
    this.lines = new THREE.LineSegments(line, new THREE.LineBasicMaterial({ vertexColors: true }));
    this.lines.name = 'fishing-lines'; this.lines.frustumCulled = false; world.scene.add(this.lines);
    game.on((result, action) => {
      if (action === 'load') this.casts.clear();
      if (result.events?.some(e => e.type === 'lineCast')) this.casts.delete('you');
    });
    // the fish that comes to your float: a soft shadow under the water (one draw, only while a bite plays out)
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(.5, 12), new THREE.MeshBasicMaterial({ color: '#10303e', transparent: true, opacity: .55, depthWrite: false, depthTest: false }));
    this.shadow.rotation.order = 'YXZ'; this.shadow.scale.set(.42, 1, 1); this.shadow.visible = false; this.shadow.renderOrder = 4; this.shadow.name = 'fishing-shadow'; world.scene.add(this.shadow);   // seen through the water, like the pond fish
    this.leaps = [];
    world.onFrame(dt => this.frame(dt));
  }
  /** Water bursts from the shared effect pools (Juice), so a splash costs no new draws. */
  splash(x, y, z, n = 8, big = false) {
    const p = this.world.juice?.particles, g = this.world.juice?.ground; if (!p) return;
    g?.spawn({ x, y: y + .02, z, shape: 2, flat: true, size: .25, size1: big ? 1.6 : 1.0, life: .7, color: '#e8fbff', alpha: .8 });
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2;
      p.spawn({ x, y: y + .05, z, vx: Math.cos(a) * (big ? 1.4 : .9), vy: (big ? 3.2 : 2.2) + Math.random(), vz: Math.sin(a) * (big ? 1.4 : .9), gravity: 9, size: .14, size1: .05, life: .55, color: '#bfefff' });
    }
  }
  /** The caught fish leaps from the float into your arms (0.65 s, spinning), then the catch toast takes over. */
  leap(fish) {
    const from = this.playerFloat, me = this.people.walkers.get('you'); if (!from || !me) return;
    this.splash(from.x, from.y, from.z, 20, true);
    const id = fish === 'goldfish' ? 'golden' : fish;
    loadKitLater('fish').then(kit => {
      const src = kit[`fish_${id}`]; if (!src) return;
      const o = src.clone(true), box = new THREE.Box3().setFromObject(o), len = Math.max(.01, box.max.z - box.min.z);
      o.scale.setScalar(.7 / len); this.world.scene.add(o);
      this.leaps.push({ o, t: 0, from: { ...from }, to: { x: me.x, y: 1.3, z: me.z } });
    }).catch(() => {});
  }
  get count() { return this.entries.length; }
  frame(dt) {
    this.time += dt;
    const quiet = document.body.classList.contains('reduced-motion'), line = this.game.s.fishing?.line;
    const next = [], active = new Set();
    for (const w of this.people.walkers.values()) {
      if (next.length === MAX) break;
      if (!w.fishSpot || w.indoors || w.goal || w.target || w.route.length || w.todo || w.clipFor !== 'Sit' || w.player && !line) continue;
      const pondId = w.fishPond?.[0] ?? null, pond = pondId && this.game.s.placed[pondId];
      if (pondId && pond?.kind !== 'pond') continue;
      const cx = pond ? (pond.x + 2) * CELL - .3 : POND_SHAPE.x, cz = pond ? (pond.z + 2) * CELL : POND_SHAPE.z;
      const dx = w.fishFace ? (w.fishFace[0] + .5) * CELL - w.x : cx - w.x;
      const dz = w.fishFace ? (w.fishFace[1] + .5) * CELL - w.z : cz - w.z;
      const distance = Math.hypot(dx, dz), ux = dx / distance, uz = dz / distance;
      if (!distance) continue;
      active.add(w.id);
      const key = `${pondId}:${w.fishSpot}`;
      let cast = this.casts.get(w.id);
      if (!cast || cast.key !== key) { cast = { key, at: this.time }; this.casts.set(w.id, cast); }
      const progress = quiet ? 1 : Math.min(1, (this.time - cast.at) / .8);
      const reach = Math.min(distance * .7, 4), water = pond ? .24 : .06;
      const play = w.player ? this.play?.state ?? {} : {};
      const ready = w.player && line.doneAt <= this.game.now && !this.play;
      let bob = quiet ? 0 : Math.sin(this.time * (ready ? 5 : 2) + next.length) * (ready ? .07 : .025);
      if (!quiet && play.phase === 'nibble') bob = -.07 * (play.dart ?? 0);
      if (!quiet && play.phase === 'bite') bob = -.22 + Math.sin(this.time * 40) * .04;
      const tip = { x: w.x + ux * 2.1, y: 2.1 + (1 - progress) * .65, z: w.z + uz * 2.1 };
      const point = {
        x: tip.x + (w.x + ux * reach - tip.x) * progress,
        y: tip.y + (water + .14 + bob - tip.y) * progress + Math.sin(progress * Math.PI) * 1.2,
        z: tip.z + (w.z + uz * reach - tip.z) * progress,
      };
      if (w.player && progress >= 1 && !cast.landed) { cast.landed = true; this.splash(point.x, water, point.z, 8); }
      if (w.player && play.phase === 'fight') {   // the fish drags the float about as you reel it toward the bank
        const pull = play.progress * .75, side = Math.sin(this.time * (play.surge ? 9 : 4)) * (play.surge ? .55 : .2) * (1 - play.progress * .6);
        point.x += (w.x + ux * .9 - point.x) * pull - uz * side; point.z += (w.z + uz * .9 - point.z) * pull + ux * side;
        point.y = water + .02 + (play.surge ? Math.abs(Math.sin(this.time * 9)) * .15 : 0);
        if (play.surge && Math.random() < dt * 6) this.splash(point.x, water, point.z, 3);
      }
      if (w.player) this.playerFloat = { x: point.x, y: water, z: point.z, ux, uz };
      const index = next.length;
      a.set(w.x + ux * .35, .9, w.z + uz * .35); b.set(tip.x, tip.y, tip.z);
      direction.subVectors(b, a); const length = direction.length(); rotation.setFromUnitVectors(up, direction.normalize());
      matrix.compose(a.add(b).multiplyScalar(.5), rotation, scale.set(1, length, 1)); this.rods.setMatrixAt(index, matrix);
      matrix.makeScale(1, ready ? 1.3 : 1, 1).setPosition(point.x, point.y, point.z); this.floats.setMatrixAt(index, matrix);
      // slack while waiting, taut and trembling in a fight (cute_game's line), warming to red with the tension
      const tension = play.phase === 'fight' ? play.tension : 0, sag = play.phase === 'fight' ? .04 : progress >= 1 ? .35 : .12;
      const tremble = quiet ? 0 : Math.sin(this.time * 60) * tension * .06;
      for (let s = 0; s < SEGMENTS; s++) for (let end = 0; end < 2; end++) {
        const f = (s + end) / SEGMENTS, offset = (index * SEGMENTS * 2 + s * 2 + end) * 3, mid = Math.sin(f * Math.PI);
        this.positions[offset] = tip.x + (point.x - tip.x) * f;
        this.positions[offset + 1] = tip.y + (point.y - tip.y) * f - mid * sag + mid * tremble;
        this.positions[offset + 2] = tip.z + (point.z - tip.z) * f;
        this.lineColors[offset] = 1; this.lineColors[offset + 1] = .96 - .7 * tension; this.lineColors[offset + 2] = .89 - .7 * tension;
      }
      next.push({ id: w.id, pond: pondId, ...point });
    }
    for (const id of this.casts.keys()) if (!active.has(id)) this.casts.delete(id);
    const rods = next.length;
    // The line remains safe while the player is away or walking back after a reload. Its float stays tappable.
    if (line && !active.has('you') && next.length < MAX) {
      const placed = line.pond && this.game.s.placed[line.pond], pond = placed?.kind === 'pond' ? placed : null;
      const point = { id: 'you', pond: pond ? line.pond : null, x: pond ? (pond.x + 2) * CELL + 1.2 : POND_SHAPE.x + 3, y: (pond ? .24 : .06) + .14, z: pond ? (pond.z + 2) * CELL : POND_SHAPE.z };
      matrix.makeTranslation(point.x, point.y, point.z); this.floats.setMatrixAt(next.length, matrix); next.push(point);
    }
    this.entries = next; this.rods.count = rods; this.floats.count = next.length;
    this.rods.instanceMatrix.needsUpdate = this.floats.instanceMatrix.needsUpdate = true;
    this.lines.geometry.setDrawRange(0, rods * SEGMENTS * 2);
    this.lines.geometry.attributes.position.needsUpdate = true; this.lines.geometry.attributes.color.needsUpdate = true;
    if (!active.has('you')) this.playerFloat = null;
    this.play?.frame(dt);
    this.drawShadow();
    this.drawLeaps(dt);
    this.lines.visible = this.rods.visible = rods > 0; this.floats.visible = next.length > 0;
  }
  /** The fish's shadow: swims in from the far side, darts at each nibble, holds at the float while it bites or fights. */
  drawShadow() {
    const st = this.play?.state, f = this.playerFloat, show = f && st && ['approach', 'nibble', 'bite', 'fight'].includes(st.phase);
    this.shadow.visible = !!show; if (!show) return;
    const away = st.phase === 'fight' || st.phase === 'bite' ? .1 : (1 - (st.approach ?? 0)) * 2.4 + .55 - (st.dart ?? 0) * .32;
    this.shadow.position.set(f.x + f.ux * away, f.y - .03, f.z + f.uz * away);
    this.shadow.rotation.set(-Math.PI / 2, Math.atan2(f.ux, f.uz), 0);
  }
  drawLeaps(dt) {
    for (const l of this.leaps) {
      l.t += dt / .65; const k = Math.min(1, l.t);
      l.o.position.set(l.from.x + (l.to.x - l.from.x) * k, l.from.y + (l.to.y - l.from.y) * k + Math.sin(k * Math.PI) * 2.2, l.from.z + (l.to.z - l.from.z) * k);
      l.o.rotation.set(Math.sin(k * 12) * .4, Math.atan2(l.to.x - l.from.x, l.to.z - l.from.z), k * Math.PI * 2);
      if (k >= 1) this.world.scene.remove(l.o);
    }
    this.leaps = this.leaps.filter(l => l.t < 1);
  }
  /** A generous phone tap target around each visible float. Selecting one only opens the controls. */
  pick(x, y) {
    let best = null, closest = 24;
    for (const point of this.entries) {
      a.set(point.x, point.y, point.z).project(this.world.cam.camera);
      if (a.z < -1 || a.z > 1) continue;
      const distance = Math.hypot((a.x + 1) * innerWidth / 2 - x, (1 - a.y) * innerHeight / 2 - y);
      if (distance < closest) { closest = distance; best = { pond: point.pond }; }
    }
    return best;
  }
}
