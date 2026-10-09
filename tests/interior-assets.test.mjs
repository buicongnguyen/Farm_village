import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const base = new URL('../public/assets/models/', import.meta.url);
export const room = JSON.parse(readFileSync(new URL('interior-farmhouse.json', base)));
test('AR-015 packed room, transforms, anchors and full/mid budgets match its contract', async () => {
  const b = readFileSync(new URL('interior-farmhouse.glb', base));
  const json = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)));
  assert.ok(json.extensionsUsed.includes('EXT_meshopt_compression'));
  assert.equal(json.textures?.length ?? 0, 0);
  assert.ok(b.length < 120_000);
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '');
  assert.equal(gltf.scene.children.length, 22);
  for (const mid of [false, true]) {
    let triangles = 0;
    const placed = new THREE.Group();
    for (const item of room.meshes) {
      const name = mid ? item.midNode : item.node;
      const root = gltf.scene.getObjectByName(name)?.clone(); assert.ok(root, name);
      assert.ok(root.position.length() < .001, name);
      root.position.fromArray(item.position); root.rotation.y = item.yaw; placed.add(root);
      root.traverse(o => { if (o.isMesh) triangles += (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3; });
    }
    assert.ok(triangles <= (mid ? 1600 : 7000), `triangles ${triangles}`);
    placed.updateMatrixWorld(true);
    for (const item of room.meshes.filter(m => !m.node.startsWith('farmhouse_interior_'))) {
      const collider = room.colliders.find(c => c.id === item.node);
      const bounds = new THREE.Box3().setFromObject(placed.getObjectByName(mid ? item.midNode : item.node));
      assert.ok(bounds.min.x >= collider.min[0] - .02 && bounds.max.x <= collider.max[0] + .02 && bounds.min.z >= collider.min[1] - .02 && bounds.max.z <= collider.max[1] + .02, item.node);
    }
    for (const item of room.interactions) {
      const name = mid ? item.anchor.replace('.interact', '_mid.interact').replace('.exit', '_mid.exit') : item.anchor;
      const anchor = placed.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name)); assert.ok(anchor, name);
      const p = anchor.getWorldPosition(new THREE.Vector3());
      assert.ok(p.distanceTo(new THREE.Vector3(...item.stand)) < .015, `${name}: ${p.toArray()}`);
    }
    const seat = placed.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(mid ? room.seats[0].midNode : room.seats[0].node));
    assert.ok(seat.getWorldPosition(new THREE.Vector3()).distanceTo(new THREE.Vector3(...room.seats[0].position)) < .015);
  }
});
