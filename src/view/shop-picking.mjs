// Picking only: Claude's existing kiosk/stall placement and models remain unchanged.
import { Matrix4, Vector3 } from 'three';
import { SHOP_SITES } from '../content/shops.mjs';
const matrix = new Matrix4(), point = new Vector3();
export function pickShop(world, x, y) {
  const rect = world.renderer.domElement.getBoundingClientRect(), camera = world.cam.camera;
  if (!rect.width || !rect.height || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return null;
  camera.updateMatrixWorld(); let best = null, distance = Infinity;
  for (const site of SHOP_SITES) {
    const item = world.batches.items.get(site.id), model = item && world.batches.models.get(item.model), bounds = model?.geo.boundingBox;
    if (!bounds) continue;
    world.batches.compose(item, 'static', matrix);
    point.copy(bounds.min).add(bounds.max).multiplyScalar(.5).applyMatrix4(matrix).project(camera);
    if (point.z < -1 || point.z > 1) continue;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const px of [bounds.min.x, bounds.max.x]) for (const py of [bounds.min.y, bounds.max.y]) for (const pz of [bounds.min.z, bounds.max.z]) {
      point.set(px, py, pz).applyMatrix4(matrix).project(camera);
      const sx = rect.left + (point.x + 1) * rect.width / 2, sy = rect.top + (1 - point.y) * rect.height / 2;
      minX = Math.min(minX, sx); maxX = Math.max(maxX, sx); minY = Math.min(minY, sy); maxY = Math.max(maxY, sy);
    }
    if (maxX < rect.left || minX > rect.right || maxY < rect.top || minY > rect.bottom) continue;
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, pad = world.cam.span <= 40 ? 22 : 0;
    if (Math.abs(x - cx) > Math.max(pad, (maxX - minX) / 2) || Math.abs(y - cy) > Math.max(pad, (maxY - minY) / 2)) continue;
    const d = Math.hypot(x - cx, y - cy); if (d < distance) { distance = d; best = site.shop; }
  }
  return best;
}
