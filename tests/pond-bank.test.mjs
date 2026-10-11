// Fishing on foot from the bank (core/pond-bank.mjs) and the public bank round the village pond (core/walk.mjs).
import './tz.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/core/state.mjs';
import { tick } from '../src/core/act.mjs';
import { stepCost, findRoute } from '../src/core/walk.mjs';
import { BANK, pondsOf, waterDistance, nearestPond, pondAt, castPlan, shorePoint, bankSlot, bankSpots } from '../src/core/pond-bank.mjs';
import { POND, POND_BANK, POND_DOCK, isPondWater } from '../src/content/world.mjs';
import { SHOP_SITES } from '../src/content/shops.mjs';

const T0 = 1_800_000_000_000, fresh = () => { const s = newGame(T0, 4242, { restore: true }); tick(s, T0); return s; };

test('the bank is public ground all the way round the pond: every side is reached on foot; only the water and the four kiosks block', () => {
  const s = fresh(), kiosks = new Set(SHOP_SITES.filter(k => k.id.startsWith('lake-')).map(k => `${Math.floor(k.x)},${Math.floor(k.z)}`));
  assert.equal(kiosks.size, 4);
  for (let z = POND_BANK.z0; z <= POND_BANK.z1; z++) for (let x = POND_BANK.x0; x <= POND_BANK.x1; x++) {
    const blocked = isPondWater(x, z) || kiosks.has(`${x},${z}`);
    assert.equal(stepCost(s, x, z) > 0, !blocked, `bank cell ${x},${z}`);
  }
  for (const to of [[POND.x0 - 2, 42], [14, POND.z0 - 2], [14, POND.z1 + 2], [POND.x0, POND.z0], [POND.x1, POND.z1]]) {   // west, north, south, and two grassy corners of the pond's box
    const r = findRoute(s, [POND_DOCK.x, POND_DOCK.z], to); assert.deepEqual(r.at(-1), to, `no way to ${to}`);
    for (const c of r) assert.ok(!isPondWater(...c), `the route to ${to} wades through ${c}`);
  }
});

test('the water is measured as it is drawn; the rod comes out within reach and a little hysteresis keeps it out', () => {
  const s = fresh(), pond = pondsOf(s)[0];
  assert.ok(waterDistance(pond, pond.x, pond.z) < 0); assert.equal(pondAt(s, pond.x, pond.z)?.id, null);
  assert.ok(Math.abs(waterDistance(pond, pond.x + pond.rx + 2, pond.z) - 2 * Math.min(pond.rx, pond.rz) / pond.rx) < 0.05);
  assert.equal(pondAt(s, pond.x + pond.rx + 1, pond.z), null);
  assert.ok(BANK.leave > BANK.reach);
  const near = nearestPond(s, pond.x + pond.rx + 1, pond.z); assert.equal(near.pond.id, null); assert.ok(near.d > 0 && near.d < BANK.reach);
});

test('a cast lands where you tapped, inside the rim and within the rod\'s range; with no tap it goes straight out', () => {
  const s = fresh(), pond = pondsOf(s)[0], from = shorePoint(pond, [pond.x - 20, pond.z]);
  assert.ok(waterDistance(pond, ...from) > 0.5 && waterDistance(pond, ...from) < 1.5, 'the shore point is not just off the water');
  const tap = [pond.x - 1, pond.z + 1], to = castPlan(pond, from, tap);
  assert.ok(Math.hypot(to[0] - tap[0], to[1] - tap[1]) < 0.01, `the float missed the tap: ${to}`);
  for (const t of [[pond.x + 40, pond.z], [from[0] + 0.2, from[1]], [pond.x, pond.z - 30], null]) {
    const p = castPlan(pond, from, t), d = Math.hypot(p[0] - from[0], p[1] - from[1]);
    assert.ok(waterDistance(pond, ...p) <= -BANK.edge + 0.01, `cast ${t} landed ${waterDistance(pond, ...p).toFixed(2)} m from the rim`);
    assert.ok(d <= waterDistance(pond, ...from) + BANK.max + 0.01, `cast ${t} flew ${d.toFixed(1)} m`);
  }
  const straight = castPlan(pond, from, null);
  assert.ok(Math.abs(Math.hypot(straight[0] - from[0], straight[1] - from[1]) - (waterDistance(pond, ...from) + BANK.straight)) < 0.01);
});

test('the catch is spread out on dry open grass, each fish in its own place; they only pile when there is no room left', () => {
  const s = fresh();
  for (const pond of [pondsOf(s)[0], { id: 'p1', x: 100, z: 100, rx: 2, rz: 2, surface: 0.24 }]) for (const angle of [0, 1.2, 2.7, 4.4]) {
    const anchor = shorePoint(pond, [pond.x + Math.cos(angle) * 30, pond.z + Math.sin(angle) * 30]), spots = bankSpots(pond, anchor);
    assert.ok(spots.length >= 10, `only ${spots.length} places round the angler`);
    for (const [i, a] of spots.entries()) {
      assert.ok(waterDistance(pond, a.x, a.z) >= 1.0, `place ${i} is ${waterDistance(pond, a.x, a.z).toFixed(2)} m from the water`);
      const d = Math.hypot(a.x - anchor[0], a.z - anchor[1]); assert.ok(d >= 1.5 && d <= 4.2, `place ${i} is ${d.toFixed(1)} m from the angler`);
      for (const b of spots.slice(0, i)) assert.ok(Math.hypot(a.x - b.x, a.z - b.z) >= 0.9, `places ${i} overlap`);
    }
    for (let n = 0; n < spots.length; n++) assert.equal(bankSlot(pond, anchor, n).level, 0, `fish ${n} piled although there was room`);
    assert.equal(bankSlot(pond, anchor, spots.length).level, 1, 'with every place taken the next fish goes on top');
    // blocked ground (a kiosk, a building) is skipped
    const blocked = spots[0], open = bankSpots(pond, anchor, (x, z) => Math.hypot(x - blocked.x, z - blocked.z) > 0.5);
    assert.equal(open.length, spots.length - 1); assert.ok(open.every(o => Math.hypot(o.x - blocked.x, o.z - blocked.z) > 0.5));
  }
});
