// Slim Starline's rigged GLBs for the web: drop clips the game never plays, drop animation tracks that only hold the
// rest pose (three.js puts an unanimated bone back to its rest pose), keep one key of tracks that hold another constant
// pose, and repack the binary chunk with only what is still used. Geometry and materials are untouched.
//   node scripts/pack-rigs.mjs <src dir> <out dir> name[:Drop,Clips] ...
// The cast's rigs (docs/assets/cast-provenance.md): node scripts/pack-rigs.mjs <Starline public/models> public/assets/models/rigged
//   chicken cow pig duck goat sheep dog cat crow rabbit villager-man:Kick,Throw,Bow,Run,Interact
//   villager-woman:Kick,Throw,Bow,Run,Interact villager-kid:Kick,Throw,Bow,Run,Interact hana:Bow
import fs from 'node:fs';
import path from 'node:path';
const [src, out, ...items] = process.argv.slice(2);
const SIZES = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }, COMP = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
for (const item of items) {
  const [name, drop = ''] = item.split(':'), dropSet = new Set(drop.split(',').filter(Boolean));
  const buf = fs.readFileSync(path.join(src, `${name}.glb`)), jsonLen = buf.readUInt32LE(12), j = JSON.parse(buf.subarray(20, 20 + jsonLen).toString());
  const binStart = 20 + jsonLen + 8, bin = buf.subarray(binStart, binStart + buf.readUInt32LE(20 + jsonLen));
  const read = i => { const a = j.accessors[i], bv = j.bufferViews[a.bufferView], T = COMP[a.componentType], n = a.count * SIZES[a.type]; return new T(bin.buffer.slice(bin.byteOffset + (bv.byteOffset ?? 0) + (a.byteOffset ?? 0), bin.byteOffset + (bv.byteOffset ?? 0) + (a.byteOffset ?? 0) + n * T.BYTES_PER_ELEMENT)); };
  const rest = (node, p) => (j.nodes[node][p] ?? (p === 'rotation' ? [0, 0, 0, 1] : p === 'scale' ? [1, 1, 1] : [0, 0, 0]));
  let before = 0, after = 0;
  const newAcc = [], extra = [];   // accessors to add: [data typed array, type]
  j.animations = j.animations.filter(a => !dropSet.has(a.name));
  for (const a of j.animations) {
    const keep = [];
    for (const c of a.channels) {
      const s = a.samplers[c.sampler], out_ = read(s.output), w = SIZES[j.accessors[s.output].type], n = out_.length / w; before++;
      let constant = true; for (let k = 1; k < n && constant; k++) for (let q = 0; q < w; q++) if (Math.abs(out_[k * w + q] - out_[q]) > 1e-5) { constant = false; break; }
      const r = rest(c.target.node, c.target.path);
      const atRest = constant && (c.target.path === 'rotation' ? Math.abs(r.reduce((d, v, q) => d + v * out_[q], 0)) > 1 - 1e-6 : r.every((v, q) => Math.abs(v - out_[q]) < 1e-4));
      if (atRest) continue;
      if (constant) {
        const t0 = read(s.input)[0];
        s.input = j.accessors.length + extra.length; extra.push([new Float32Array([t0]), 'SCALAR', [t0], [t0]]);
        s.output = j.accessors.length + extra.length; extra.push([new Float32Array(out_.slice(0, w)), w === 4 ? 'VEC4' : 'VEC3']);
        s.interpolation = 'STEP';
      }
      keep.push(c); after++;
    }
    // renumber samplers to the kept channels
    const samplers = [], map = new Map();
    for (const c of keep) { if (!map.has(c.sampler)) { map.set(c.sampler, samplers.length); samplers.push(a.samplers[c.sampler]); } c.sampler = map.get(c.sampler); }
    a.channels = keep; a.samplers = samplers;
  }
  // collect used accessors and rebuild the buffer
  const used = new Set();
  for (const m of j.meshes) for (const p of m.primitives) { Object.values(p.attributes).forEach(i => used.add(i)); if (p.indices != null) used.add(p.indices); }
  for (const s of j.skins ?? []) if (s.inverseBindMatrices != null) used.add(s.inverseBindMatrices);
  for (const a of j.animations) for (const s of a.samplers) { used.add(s.input); used.add(s.output); }
  const chunks = [], accessors = [], remap = new Map(); let offset = 0;
  const all = [...j.accessors.map((a, i) => ({ a, i })), ...extra.map(([data, type, min, max], k) => ({ a: { componentType: 5126, count: data.length / SIZES[type], type, ...(min ? { min, max } : {}) }, i: j.accessors.length + k, data }))];
  for (const { a, i, data } of all) {
    if (!used.has(i)) continue;
    let bytes;
    if (data) bytes = Buffer.from(data.buffer);
    else { const t = read(i); bytes = Buffer.from(t.buffer, t.byteOffset, t.byteLength); }
    const pad = (4 - (offset % 4)) % 4; if (pad) { chunks.push(Buffer.alloc(pad)); offset += pad; }
    const bv = { buffer: 0, byteOffset: offset, byteLength: bytes.length }; const old = data ? null : j.bufferViews[a.bufferView];
    if (old?.target) bv.target = old.target;
    j.bufferViews.push(bv); chunks.push(bytes); offset += bytes.length;
    remap.set(i, accessors.length); accessors.push({ ...a, bufferView: -1, byteOffset: undefined, _bv: bv });
  }
  const views = accessors.map(a => a._bv); accessors.forEach((a, k) => { a.bufferView = k; delete a._bv; delete a.byteOffset; });
  j.bufferViews = views; j.accessors = accessors;
  const r = i => remap.get(i);
  for (const m of j.meshes) for (const p of m.primitives) { for (const k of Object.keys(p.attributes)) p.attributes[k] = r(p.attributes[k]); if (p.indices != null) p.indices = r(p.indices); }
  for (const s of j.skins ?? []) if (s.inverseBindMatrices != null) s.inverseBindMatrices = r(s.inverseBindMatrices);
  for (const a of j.animations) for (const s of a.samplers) { s.input = r(s.input); s.output = r(s.output); }
  const binOut = Buffer.concat(chunks); j.buffers = [{ byteLength: binOut.length }];
  let json = Buffer.from(JSON.stringify(j)); json = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 0x20)]);
  const binPadded = Buffer.concat([binOut, Buffer.alloc((4 - binOut.length % 4) % 4)]);
  const head = Buffer.alloc(12); head.write('glTF', 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + json.length + 8 + binPadded.length, 8);
  const jh = Buffer.alloc(8); jh.writeUInt32LE(json.length, 0); jh.write('JSON', 4); const bh = Buffer.alloc(8); bh.writeUInt32LE(binPadded.length, 0); bh.write('BIN\0', 4);
  const file = Buffer.concat([head, jh, json, bh, binPadded]); fs.writeFileSync(path.join(out, `${name}.glb`), file);
  console.log(`${name}: ${buf.length >> 10} KB -> ${file.length >> 10} KB, tracks ${before} -> ${after}, clips ${j.animations.map(a => a.name).join(' ')}`);
}
