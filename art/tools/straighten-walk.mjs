// The villagers' Walk clip (Starline rigs) was authored as a deep crouch: the hips ride 14 cm lower than standing and the
// knee never opens past 142 degrees, so the leading leg lands bent. This rewrites the clip's legs in place with two-bone
// IK: the hips ride near standing height and rise over the standing leg, the step is shortened to what the leg can
// reach, and the leading leg lands almost straight. Feet keep their old angle to the ground; arms and spine are untouched.
//   node art/tools/straighten-walk.mjs public/assets/models/rigged/villager-man.glb [--dry]
// Prints the step scale: multiply the rig's `walk` speed in src/view/skinned.mjs by it so the feet do not slide.
import fs from 'node:fs';
import * as THREE from 'three';

const REACH = 0.985, STEP = 0.39;   // the standing leg's hip-to-ankle reach, and half a step, as shares of the leg's length
const [file, flag] = process.argv.slice(2), buf = fs.readFileSync(file);
const jlen = buf.readUInt32LE(12), json = JSON.parse(buf.subarray(20, 20 + jlen).toString()), bin = Buffer.from(buf.subarray(20 + jlen + 8));
if (json.asset.extras?.walkStraightened) { console.log(`${file}: already done`); process.exit(0); }
const view = i => {
  const a = json.accessors[i], v = json.bufferViews[a.bufferView], n = { SCALAR: 1, VEC3: 3, VEC4: 4 }[a.type];
  if (a.componentType !== 5126 || v.byteStride) throw Error('expected packed floats');
  return new Float32Array(bin.buffer, bin.byteOffset + (v.byteOffset ?? 0) + (a.byteOffset ?? 0), a.count * n);
};
const objs = json.nodes.map(n => { const o = new THREE.Object3D(); o.name = n.name; if (n.translation) o.position.fromArray(n.translation); if (n.rotation) o.quaternion.fromArray(n.rotation); if (n.scale) o.scale.fromArray(n.scale); return o; });
json.nodes.forEach((n, i) => (n.children ?? []).forEach(c => objs[i].add(objs[c])));
const root = new THREE.Object3D(); json.scenes[0].nodes.forEach(i => root.add(objs[i]));
const clip = json.animations.find(a => a.name === 'Walk');
const used = new Map(); for (const a of json.animations) for (const s of a.samplers) used.set(s.output, (used.get(s.output) ?? 0) + 1);
const chans = clip.channels.map(ch => { const s = clip.samplers[ch.sampler]; return { o: objs[ch.target.node], path: ch.target.path, t: view(s.input), v: view(s.output), out: s.output }; });
const chan = (name, path) => {
  const c = chans.find(c => c.o.name === name && c.path === path);
  if (!c) throw Error(`Walk has no ${path} track for ${name}`);
  if (used.get(c.out) !== 1) throw Error(`${name} ${path} shares its data with another track`);
  return c;
};
const hipsT = chan('hips', 'translation'), legs = ['L', 'R'].map(s => ({ thigh: chan(`thigh_${s}`, 'rotation'), shin: chan(`shin_${s}`, 'rotation'), foot: chan(`foot_${s}`, 'rotation') }));
const keys = hipsT.t.length; for (const l of legs) for (const c of Object.values(l)) if (c.t.length !== keys) throw Error('tracks are not sampled alike');
const pose = k => {
  for (const c of chans) { const i = Math.min(k, c.t.length - 1); if (c.path === 'rotation') c.o.quaternion.fromArray(c.v, i * 4); else if (c.path === 'translation') c.o.position.fromArray(c.v, i * 3); else c.o.scale.fromArray(c.v, i * 3); }
  root.updateMatrixWorld(true);
};
const world = o => o.getWorldPosition(new THREE.Vector3()), worldQ = o => o.getWorldQuaternion(new THREE.Quaternion());
const kneeOf = l => { const h = world(l.thigh.o), k = world(l.shin.o), a = world(l.foot.o); return h.sub(k).angleTo(a.sub(k)) * 180 / Math.PI; };

// measure the old cycle
const old = [];
for (let k = 0; k < keys; k++) { pose(k); old.push({ legs: legs.map(l => ({ hip: world(l.thigh.o), ankle: world(l.foot.o), footQ: worldQ(l.foot.o), knee: kneeOf(l) })) }); }
pose(0);
const L1 = world(legs[0].thigh.o).distanceTo(world(legs[0].shin.o)), L2 = world(legs[0].shin.o).distanceTo(world(legs[0].foot.o)), L = L1 + L2;
const all = old.flatMap(o => o.legs), ground = Math.min(...all.map(l => l.ankle.y)), zs = all.filter(l => l.ankle.y < ground + 0.03).map(l => l.ankle.z);
const zMax = Math.max(...zs), zMin = Math.min(...zs), half = (zMax - zMin) / 2, centre = (zMax + zMin) / 2;
const hipYs = all.map(l => l.hip.y), yLo = Math.min(...hipYs), yHi = Math.max(...hipYs);
const A = Math.min(half, STEP * L), scale = A / half, footAt = a => new THREE.Vector3(a.x, ground + (a.y - ground) * Math.min(1, scale + 0.1), (centre + (a.z - centre)) * scale);
const hipMid = ground + REACH * L, hipStrike = ground + Math.sqrt((REACH * L) ** 2 - A * A);
const report = [`leg ${L.toFixed(3)}  step ${(2 * half).toFixed(2)} -> ${(2 * A).toFixed(2)}  hips ${yLo.toFixed(2)}..${yHi.toFixed(2)} -> ${hipStrike.toFixed(2)}..${hipMid.toFixed(2)}`,
  `knee before: ${old.map(o => o.legs[0].knee.toFixed(0)).join(' ')}`];

// rewrite: hips first, then each leg reaches for its (shortened) footfall
const v = new THREE.Vector3(), q = new THREE.Quaternion();
const aim = (bone, child, to) => {   // turn `bone` (least rotation) so `child` lies toward `to`
  const from = world(child).sub(world(bone)).normalize(), want = to.clone().sub(world(bone)).normalize();
  q.setFromUnitVectors(from, want).multiply(worldQ(bone)); bone.quaternion.copy(worldQ(bone.parent).invert().multiply(q)); root.updateMatrixWorld(true);
};
const after = [];
for (let k = 0; k < keys; k++) {
  pose(k); const o = old[k];
  const stand = o.legs[0].ankle.y <= o.legs[1].ankle.y ? 0 : 1, under = Math.min(A, Math.abs(footAt(o.legs[stand].ankle).z - o.legs[stand].hip.z));   // the hips vault over the standing leg
  const rise = ground + Math.sqrt((REACH * L) ** 2 - under * under) - o.legs[stand].hip.y;
  hipsT.o.position.add(v.set(0, rise, 0).applyQuaternion(worldQ(hipsT.o.parent).invert()).divide(hipsT.o.parent.getWorldScale(new THREE.Vector3())));
  root.updateMatrixWorld(true); hipsT.o.position.toArray(hipsT.v, k * 3);
  for (const [i, l] of legs.entries()) {
    const was = o.legs[i], hip = world(l.thigh.o);
    const target = footAt(was.ankle);
    const to = target.clone().sub(hip), d = Math.min(to.length(), L * 0.995); to.setLength(d);
    const along = (L1 * L1 - L2 * L2 + d * d) / (2 * d), out = Math.sqrt(Math.max(0, L1 * L1 - along * along));
    const dir = to.clone().normalize(), fwd = new THREE.Vector3(0, 0, 1).addScaledVector(dir, -dir.z).normalize();   // the knee points forward
    const knee = hip.clone().addScaledVector(dir, along).addScaledVector(fwd, out);
    aim(l.thigh.o, l.shin.o, knee); aim(l.shin.o, l.foot.o, hip.clone().add(to));
    l.foot.o.quaternion.copy(worldQ(l.shin.o).invert().multiply(was.footQ)); root.updateMatrixWorld(true);
    for (const c of [l.thigh, l.shin, l.foot]) {
      const now = c.o.quaternion, prev = k ? new THREE.Quaternion().fromArray(c.v, (k - 1) * 4) : null;
      if (prev && prev.dot(now) < 0) now.set(-now.x, -now.y, -now.z, -now.w);   // keep the short way round between keys
      now.toArray(c.v, k * 4);
    }
  }
  after.push({ knee: kneeOf(legs[0]), ankle: world(legs[0].foot.o) });
}
report.push(`knee after:  ${after.map(a => a.knee.toFixed(0)).join(' ')}`, `ankle z,y:   ${after.filter((_, i) => i % 3 === 0).map(a => `${a.ankle.z.toFixed(2)},${a.ankle.y.toFixed(2)}`).join('  ')}`, `walk speed x ${scale.toFixed(3)}`);
console.log(`${file}\n  ${report.join('\n  ')}`);
if (flag === '--dry') process.exit(0);
json.asset.extras = { ...json.asset.extras, walkStraightened: true };
let text = Buffer.from(JSON.stringify(json)); text = Buffer.concat([text, Buffer.alloc((4 - text.length % 4) % 4, 0x20)]);
const head = Buffer.alloc(20), binHead = Buffer.alloc(8);
head.writeUInt32LE(0x46546C67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(28 + text.length + bin.length, 8); head.writeUInt32LE(text.length, 12); head.writeUInt32LE(0x4E4F534A, 16);
binHead.writeUInt32LE(bin.length, 0); binHead.writeUInt32LE(0x004E4942, 4);
fs.writeFileSync(file, Buffer.concat([head, text, binHead, bin]));
