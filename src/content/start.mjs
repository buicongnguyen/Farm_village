// The starting village (PLAN-v0.3 D1–D7): Hollowbrook as the player finds it. Things stand where they should, many of them
// run down. `cond: 'broken'` things must be repaired before they work; roads and the farmhouse can be damaged too.
// Coordinates follow the paths the village always had: the spine path along z = 63 on the farm, the village lane at z = 92.
export const RESTORE = {
  level: 1,
  // placed things: { kind, x, z, rot, cond? }
  placed: [
    ...Array.from({ length: 6 }, (_, i) => ({ kind: 'bed', x: 33 + i, z: 58, rot: 0 })),
    { kind: 'feed_mill', x: 32, z: 64, rot: 2, cond: 'broken' },
    { kind: 'coop', x: 35, z: 64, rot: 2, cond: 'broken' },
    { kind: 'bakery', x: 40, z: 64, rot: 2, cond: 'broken' },
    { kind: 'cottage', x: 33, z: 93, rot: 2, cond: 'broken' },
    { kind: 'cottage', x: 37, z: 93, rot: 2, cond: 'broken' },
    { kind: 'cottage', x: 45, z: 93, rot: 2, cond: 'broken' },
  ],
  // path cells: the spine through the farm and the doors of the village cottages
  paths: [...Array.from({ length: 18 }, (_, i) => [30 + i, 63]), [34, 92], [38, 92], [46, 92]],
  // the coop's yard (x 35–38, z 64–67, gate on the north edge at x 38): two pieces are missing, so the coop cannot hold hens yet
  fenceRect: { x0: 35, z0: 64, x1: 38, z1: 67, gateX: 38, missing: ['36,68,n', '35,66,w'] },
  // road stretches that start damaged
  roads: { road_south: 'broken', road_north: 'broken' },
  farmhouse: 'worn',
  // beds are tilled and sown with wheat (quick the first time)
  plant: 'wheat',
};
