// The village square's fixed things keep off each other, posts are solid, and every field has its own sale panel.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SITES, PLAZA, WELL, POST_CELLS, SOLID_CELLS, COOPERATIVE_BOARD, FAIR_BOARD } from '../src/content/world.mjs';
import { SHOP_SITES } from '../src/content/shops.mjs';
import { footprint } from '../src/content/buildings.mjs';

test('nothing on the square stands on the festival stage: stalls, lamps, boards and the well keep off it', () => {
  const st = SITES.find(x => x.kind === 'stage'), [w, d] = footprint('stage', st.rot);
  const on = (x, z, pad = 0) => x >= st.x - pad && x <= st.x + w + pad && z >= st.z - pad && z <= st.z + d + pad;
  for (const site of SHOP_SITES.filter(x => x.shop === 'plaza')) assert.ok(!on(site.x, site.z, 1), `${site.id} stands on the stage`);
  for (const key of [...POST_CELLS, ...SOLID_CELLS]) { const [x, z] = key.split(',').map(Number); if (x >= PLAZA.x0 && x <= PLAZA.x1 && z >= PLAZA.z0 && z <= PLAZA.z1) assert.ok(!on(x + 0.5, z + 0.5), `${key} is under the stage`); }
  for (const b of [COOPERATIVE_BOARD, FAIR_BOARD, WELL]) assert.ok(!on(b.x + 0.5, b.z + 0.5), 'a board or the well is under the stage');
});

test('one feed lasts ten collections: the animal goes on giving and is hungry after the tenth; an older save is hungry after one', async () => {
  const { actions, FEED_MEALS, animalState } = await import('../src/core/animals.mjs'), { newGame } = await import('../src/core/state.mjs'), { ANIMALS } = await import('../src/content/goods.mjs');
  const s = newGame(1_700_000_000_000, 7, { restore: true }); let now = 1_700_000_000_000;
  const ctx = () => ({ s, now, events: [], emit() {}, fail: reason => ({ ok: false, reason }) });
  s.placed.cp = { kind: 'coop', x: 40, z: 60, rot: 0 }; s.cond = {}; s.animals = { cp: [{ kind: 'hen', doneAt: null }] }; s.barn.cap = 500; s.barn.items = { chicken_feed: 3 };
  assert.equal(FEED_MEALS, 10); assert.equal(actions.feed(ctx(), { home: 'cp' }).fed, 1); assert.equal(s.barn.items.chicken_feed, 2);
  for (let i = 1; i <= 10; i++) {
    now += ANIMALS.hen.everyMs; assert.equal(actions.collect(ctx(), { home: 'cp' }).collected, 1, `egg ${i}`);
    assert.equal(animalState(s.animals.cp[0], now), i < 10 ? 'busy' : 'hungry', `after egg ${i}`);
  }
  assert.equal(s.barn.items.egg, 10); assert.equal(s.barn.items.chicken_feed, 2, 'ten eggs from one feed');
  s.animals.cp[0] = { kind: 'hen', doneAt: now };   // fed under the old rule
  assert.equal(actions.collect(ctx(), { home: 'cp' }).collected, 1); assert.equal(animalState(s.animals.cp[0], now), 'hungry');
});

test('output upgrades: each doubles what an animal home or a workshop gives, four at most, and they survive a save', async () => {
  const { act } = await import('../src/core/act.mjs'), { newGame, pack, unpack } = await import('../src/core/state.mjs'), { ANIMALS, RECIPES } = await import('../src/content/goods.mjs');
  const { outputPlan, outputTimes } = await import('../src/core/output.mjs'), { OUTPUT_UP } = await import('../src/content/economy.mjs');
  const T = 1_700_000_000_000, s = newGame(T, 7, { restore: true }); let now = T; s.cond = {}; s.level = 20; s.coins = 10_000_000; s.barn.cap = 100_000; s.orders.cards = [];
  s.placed.cp = { kind: 'coop', x: 40, z: 60, rot: 0 }; s.animals.cp = [{ kind: 'hen', doneAt: null }]; s.barn.items = { chicken_feed: 5, wheat: 500 };
  s.placed.fm = { kind: 'feed_mill', x: 44, z: 60, rot: 0 }; s.production.fm = { slots: 2, queue: [] };
  const must = (name, arg) => { const r = act(s, name, arg, now); assert.equal(r.ok, true, `${name}: ${r.reason}`); return r; };
  assert.equal(act(s, 'upgradeOutput', { building: 'nothing' }, now).ok, false);
  for (let n = 1; n <= OUTPUT_UP.max; n++) { const coins = s.coins, plan = outputPlan(s, 'cp'); must('upgradeOutput', { building: 'cp' }); assert.equal(s.coins, coins - plan.price); assert.equal(outputTimes(s, 'cp'), 2 ** n); }
  assert.equal(act(s, 'upgradeOutput', { building: 'cp' }, now).ok, false, 'a fifth upgrade');
  must('feed', { home: 'cp' }); now += ANIMALS.hen.everyMs; must('collect', { home: 'cp' }); assert.equal(s.barn.items.egg, 16);
  must('upgradeOutput', { building: 'fm' }); const feed = s.barn.items.chicken_feed ?? 0; must('produce', { building: 'fm', recipe: 'chicken_feed' }); now += RECIPES.chicken_feed.timeMs + 1;
  must('collectProducts', { building: 'fm' }); assert.equal(s.barn.items.chicken_feed - feed, RECIPES.chicken_feed.makes * 2);
  if (pack && unpack) assert.deepEqual(unpack(pack(s)).outputUp, { cp: 4, fm: 1 });
  s.level = 1; s.outputUp.fm = 0; assert.match(outputPlan(s, 'fm').reason, /level/);
});

test('camera tilt: the setting is kept within its range and saved; the camera follows it and a drag still tracks the ground', async () => {
  const { GameCamera, TILT, PITCH, clampTilt } = await import('../src/view/camera.mjs'), { act } = await import('../src/core/act.mjs'), { newGame } = await import('../src/core/state.mjs');
  const s = newGame(1_800_000_000_000, 3, { restore: true }), T = 1_800_000_000_000;
  assert.equal(act(s, 'setting', { key: 'cameraTilt', value: 0.4 }, T).ok, true); assert.equal(s.settings.cameraTilt, 40);
  for (const bad of [0.1, 0.9, 'x', null]) assert.equal(act(s, 'setting', { key: 'cameraTilt', value: bad }, T).ok, false, String(bad)); assert.equal(s.settings.cameraTilt, 40);
  assert.equal(clampTilt(5), TILT.min); assert.equal(clampTilt(90), TILT.max); assert.equal(clampTilt('x'), TILT.default);
  const cam = new GameCamera({ x: 50, z: 50, span: 40, bounds: { x0: 0, x1: 200, z0: 0, z1: 200 } });
  assert.equal(cam.pitch, PITCH); const flat = cam.pixelsToGround(0, 10), y0 = cam.camera.position.y;
  cam.tilt(30); assert.ok(Math.abs(cam.pitch - 30 * Math.PI / 180) < 1e-9); assert.ok(cam.camera.position.y < y0, 'a lower look');
  const low = cam.pixelsToGround(0, 10); assert.ok(Math.hypot(...low) > Math.hypot(...flat), 'the same drag covers more ground when the view is low');
  assert.deepEqual([cam.x, cam.z], [50, 50], 'what is looked at stays in the middle');
  cam.tilt(999); assert.ok(Math.abs(cam.pitch - TILT.max * Math.PI / 180) < 1e-9); cam.tilt(); assert.equal(cam.pitch, PITCH); cam.tilt(TILT.default); assert.equal(cam.pitch, PITCH);
});
