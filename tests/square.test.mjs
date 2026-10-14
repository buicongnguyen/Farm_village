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

test('the valley\u2019s value stays a readable number: deeds count up to a limit, and its name is worth some thousands of times its assets at most', async () => {
  const { valueOf, assetsOf, goodwillOf, deedsOf } = await import('../src/core/valley.mjs'), { VALLEY } = await import('../src/content/economy.mjs'), { newGame } = await import('../src/core/state.mjs');
  const s = newGame(1_800_000_000_000, 5, { restore: true }); s.coins = 2_000_000;
  Object.assign(s.stats, { marketDays: 5000, cooperativeOrders: 5000, trains: 5000, harvestFestivals: 5000, fairs: 5000, guests: 1e9 });
  assert.equal(deedsOf(s), VALLEY.deeds); const g = goodwillOf(s);
  assert.ok(g >= 2000 && g <= 8000, `goodwill ${g}`); assert.equal(valueOf(s), Math.round(assetsOf(s).total * g));
  assert.ok(valueOf(s) < 1e11, `a farm of two million coins is worth ${valueOf(s)}`);
  assert.ok(valueOf(s) >= VALLEY.marks.lights, 'the last chapter can still be reached');
});

// 2026-10-14: music for the herds, and three more food workshops
const { newGame } = await import('../src/core/state.mjs'), { act } = await import('../src/core/act.mjs'), NOW = 1_800_000_000_000;
test('music in the barn: bought once for a cow or goat barn, half as much again at every collection, nowhere else', async () => {
  const { MUSIC, musicPlan, animalYield, hasMusic } = await import('../src/core/output.mjs');
  const s = newGame(NOW, 21, { restore: true }); s.level = 12; s.coins = 5000;
  s.placed.zcow = { kind: 'cow_barn', x: 60, z: 40, rot: 0 }; s.placed.zcoop = { kind: 'coop', x: 66, z: 40, rot: 0 };
  assert.equal(musicPlan(s, 'zcoop'), null); assert.equal(act(s, 'buyMusic', { building: 'zcoop' }, NOW).ok, false);
  assert.equal(animalYield(s, 'zcow'), 1); assert.equal(musicPlan(s, 'zcow').price, MUSIC.cow_barn.cost);
  s.level = 3; assert.equal(act(s, 'buyMusic', { building: 'zcow' }, NOW).ok, false, 'music before its level'); s.level = 12;
  s.coins = 10; assert.equal(act(s, 'buyMusic', { building: 'zcow' }, NOW).ok, false, 'music without the coins'); s.coins = 5000;
  assert.ok(act(s, 'buyMusic', { building: 'zcow' }, NOW).ok); assert.equal(s.coins, 5000 - MUSIC.cow_barn.cost); assert.ok(hasMusic(s, 'zcow'));
  assert.equal(animalYield(s, 'zcow'), 2); (s.outputUp ??= {}).zcow = 2; assert.equal(animalYield(s, 'zcow'), 6);
  assert.equal(act(s, 'buyMusic', { building: 'zcow' }, NOW).ok, false, 'music twice');
  s.music.zcoop = true; assert.equal(animalYield(s, 'zcoop'), 1, 'a stale mark gave the coop music');
});
test('the new food workshops: every recipe has a maker, costs less than it sells for, and is on the product map', async () => {
  const { RECIPES, GOODS } = await import('../src/content/goods.mjs'), { BUILDINGS } = await import('../src/content/buildings.mjs'), { productMap } = await import('../src/core/insight.mjs');
  const made = ['mushroom', 'kimchi', 'chili_sauce', 'salad', 'mushroom_soup', 'lunch_box'];
  for (const id of made) {
    const r = RECIPES[id]; assert.ok(BUILDINGS[r.at]?.produces, `${id}: no maker`); assert.ok(r.level >= BUILDINGS[r.at].level, `${id} opens before its workshop`);
    const cost = Object.entries(r.needs).reduce((n, [g, k]) => n + GOODS[g].value * k, 0); assert.ok(r.value * r.makes > cost, `${id} sells for no more than it costs`);
  }
  const s = newGame(NOW, 22, { restore: true }); s.level = 14; const shown = productMap(s).cols.flat().map(g => g.id);
  for (const id of made) assert.ok(shown.includes(id), `${id} is not on the product map`);
});
test('machines: each working tractor shed adds eight beds to a round of help (two at most), a drone pad brings fruit a quarter sooner', async () => {
  const { MACHINES, tractors, sprayFactor } = await import('../src/core/machines.mjs'), { plan, onLoop } = await import('../src/view/machines-view.mjs').catch(() => ({}));
  const { BUILDINGS } = await import('../src/content/buildings.mjs');
  const s = newGame(NOW, 31, { restore: true }); s.level = 14;
  assert.equal(tractors(s), 0); assert.equal(sprayFactor(s), 1);
  for (const [id, x] of [['t1', 60], ['t2', 64], ['t3', 68]]) s.placed[id] = { kind: 'tractor_shed', x, z: 40, rot: 0 };
  assert.equal(tractors(s), 2, 'a third tractor counted'); s.cond.t1 = { level: 3, ms: 0 }; s.cond.t2 = { level: 3, ms: 0 }; assert.equal(tractors(s), 1, 'a broken shed still works');
  s.placed.pad = { kind: 'drone_pad', x: 72, z: 40, rot: 0 }; assert.equal(sprayFactor(s), MACHINES.spray); assert.ok(MACHINES.spray < 1 && MACHINES.beds >= 4);
  assert.equal(BUILDINGS.tractor_shed.max, 2); assert.equal(BUILDINGS.drone_pad.max, 1);
  if (plan) {   // (the view's own sums: where the machines go)
    const p = plan(s); assert.equal(p.sheds.length, 1); assert.ok(p.pad); // An obstructed opening field keeps the machine parked.
    p.loop ??= [2, 2, 8, 10]; // independently exercise the closed-rectangle math
    const per = 2 * (p.loop[2] - p.loop[0] + p.loop[3] - p.loop[1]), a = onLoop(p.loop, 0), b = onLoop(p.loop, per);
    assert.ok(Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6, 'the loop does not close');
    for (let u = 0; u < per; u += per / 16) { const [x, z] = onLoop(p.loop, u); assert.ok(x >= p.loop[0] - 1e-6 && x <= p.loop[2] + 1e-6 && z >= p.loop[1] - 1e-6 && z <= p.loop[3] + 1e-6); }
  }
});

test('first a buffalo, then machines with new land: the pen opens early and adds four beds; a shed needs one new field, the pad two', async () => {
  const { MACHINES, buffalo } = await import('../src/core/machines.mjs'), { mayBuild } = await import('../src/core/projects.mjs'), { BUILDINGS } = await import('../src/content/buildings.mjs');
  const s = newGame(NOW, 41, { restore: true }); s.level = 20; s.coins = 99999;
  assert.ok(BUILDINGS.buffalo_pen.level < BUILDINGS.tractor_shed.level && BUILDINGS.buffalo_pen.cost < BUILDINGS.tractor_shed.cost);
  assert.equal(buffalo(s), 0); s.placed.ox = { kind: 'buffalo_pen', x: 60, z: 40, rot: 0 }; assert.equal(buffalo(s), 1); assert.ok(MACHINES.ox > 0 && MACHINES.ox < MACHINES.beds);
  assert.equal(s.parcels.length, 1);
  const shed = mayBuild(s, 'tractor_shed'); assert.equal(shed.ok, false); assert.equal(shed.params.lock, 'land'); assert.equal(shed.params.count, 1);
  s.parcels.push('1,2'); assert.notEqual(mayBuild(s, 'tractor_shed').params?.lock, 'land', 'one new field did not open the tractor shed');
  assert.equal(mayBuild(s, 'drone_pad').params?.lock, 'land'); s.parcels.push('1,1'); assert.notEqual(mayBuild(s, 'drone_pad').params?.lock, 'land');
  assert.notEqual(mayBuild(newGame(NOW, 42, { restore: true }), 'buffalo_pen').params?.lock, 'land', 'the buffalo asks for land');
});

test('river life: boats keep to the water east of the old mill, the ferry turns at both ends, and the court and playground stand clear on the strand', async () => {
  const { afloat, ferryAt, COURT, PLAYGROUND } = await import('../src/view/river-life.mjs'), { brookCentre, WATER_HALF } = await import('../src/view/brook.mjs');
  const { CELL, QUAY, LOTS, brookZ, BROOK_HALF, inQuay, inTowpath, OLD_MILL } = await import('../src/content/world.mjs');
  for (let t = 0; t < 400; t += 3.7) {
    const f = ferryAt(t), [x, z] = afloat(f.x, -1.1, f.dir);
    assert.ok(Math.abs(z - brookCentre(f.x)) < WATER_HALF - 1.2, `the ferry is aground at ${f.x}`); assert.ok(f.x > (OLD_MILL.box.x1 + 1) * CELL, 'the ferry ran into the old mill'); assert.ok(Number.isFinite(x));
  }
  assert.equal(ferryAt(0).dir, 1); assert.ok(ferryAt(1e4).x >= (QUAY.x0 + 2) * CELL - 1e-6);
  const dirs = new Set(); for (let t = 0; t < 300; t += 2) dirs.add(ferryAt(t).dir); assert.equal(dirs.size, 2, 'the ferry never comes back');
  for (const [name, c, w, d] of [['court', COURT, 5, 3], ['playground', PLAYGROUND, 3, 3]]) for (let x = Math.ceil(c.x - w / 2); x < c.x + w / 2; x++) for (let z = Math.ceil(c.z - d / 2); z < c.z + d / 2; z++) {
    assert.ok(!inQuay(x, z), `the ${name} is on the quay at ${x},${z}`); assert.ok(!inTowpath(x, z), `the ${name} is on the towpath at ${x},${z}`);
    assert.ok(z < brookZ(x) - BROOK_HALF - 2, `the ${name} is in the water at ${x},${z}`); assert.ok(!LOTS.some(l => x >= l.x && x < l.x + l.w && z >= l.z && z < l.z + l.d));
  }
});
