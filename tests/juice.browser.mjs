// Juice suite (game feel): sway, pops and bursts, bounces, smoke, contact shadows, flights, camera feel, the ghost,
// sounds and the draw budget. Run after `npm run build:test` with dist served (GAME_URL, default port 5241).
// SHOTS=<folder> also saves the review frames there (juice-sway-a/b, juice-harvest-*, juice-place-*, juice-shadow, …).
import { chromium } from 'playwright';
import { readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
const URL_ = process.env.GAME_URL ?? 'http://127.0.0.1:5241/';
const SHOTS = process.env.SHOTS ?? '';
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const gpu = process.env.GPU !== '0';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: gpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] : ['--enable-unsafe-swiftshader'] });
const DEVICES = { phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }, pc: { viewport: { width: 1280, height: 800 } } };
const results = [];
async function open(device = 'pc', query = '?new') {
  const ctx = await browser.newContext(DEVICES[device]), page = await ctx.newPage(), errors = [], requests = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push(m.text()); });
  page.on('request', r => requests.push(r.url()));
  await page.goto(URL_ + query);
  await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
  await page.evaluate(() => farm.skipIntro());
  return { ctx, page, errors, requests };
}
async function check(name, f) {
  const t0 = Date.now();
  try { await f(); results.push([name, 'ok']); console.log(`ok   ${name} (${Date.now() - t0} ms)`); }
  catch (e) { results.push([name, 'FAIL']); console.log(`FAIL ${name}\n     ${e.message}`); }
}
const expect = (cond, msg) => { if (!cond) throw new Error(msg); };
const save = (name, dataUrl) => { if (SHOTS && dataUrl) writeFileSync(join(SHOTS, `${name}.png`), Buffer.from(dataUrl.split(',')[1], 'base64')); };
const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: join(SHOTS, `${name}.png`) }); };

// A small farm: cleared land, a path, 24 beds of wheat, carrot and corn, a bakery, a coop with hens and some trees.
const farmSetup = (page, { ripe = true, animals = true } = {}) => page.evaluate(({ ripe, animals }) => {
  const g = farm.game; g.s.coins = 50000; g.s.level = 9; g.s.xp = 900; g.s.barn.cap = 1000; g.s.projects.step = Math.max(g.s.projects.step, 3);
  g.do('clear', { cells: [[34, 59], [35, 60], [34, 61]] });
  for (let z = 54; z <= 75; z++) for (let x = 30; x <= 50; x++) g.do('clear', { x, z });
  for (let x = 30; x <= 50; x++) g.do('place', { kind: 'path', x, z: 63 });
  for (let z = 57; z <= 59; z++) for (let i = 0; i < 8; i++) g.do('place', { kind: 'bed', x: 33 + i, z });
  g.s.barn.items.carrot = 50; g.s.barn.items.corn = 50;
  Object.keys(g.s.placed).filter(k => g.s.placed[k].kind === 'bed').forEach((id, i) => g.do('plant', { id, crop: ['wheat', 'carrot', 'corn'][Math.floor(i / 8) % 3] }));
  g.do('place', { kind: 'feed_mill', x: 32, z: 64, rot: 2 });
  if (animals) { g.do('place', { kind: 'coop', x: 36, z: 64, rot: 2 }); const coop = Object.keys(g.s.placed).find(k => g.s.placed[k].kind === 'coop'); g.s.animals[coop] = [0, 1, 2].map(() => ({ kind: 'hen', doneAt: null })); }
  g.do('place', { kind: 'tree', x: 44, z: 58 }); g.do('place', { kind: 'tree', x: 43, z: 60 }); g.do('place', { kind: 'bush', x: 45, z: 56 }); g.do('place', { kind: 'flowers', x: 42, z: 56 });
  document.querySelectorAll('.modal').forEach(m => m.remove()); farm.panels.close();
  if (ripe) farm.setClockOffset(30 * 60_000);
}, { ripe, animals });
// Render now and copy the canvas (exact timing, unlike a page screenshot).
const grab = page => page.evaluate(() => { const w = farm.world; w.renderer.render(w.scene, w.cam.camera); return w.renderer.domElement.toDataURL('image/png'); });
// The same with the living cast (people, animals, critters: skinned.mjs) and their moving blobs left out of the frame, for checks that are
// about the scenery's own motion (the cast walks about on its own, also with reduced motion).
const grabScenery = page => page.evaluate(() => {
  const w = farm.world, hidden = [], blobs = w.juice?.moving?.layer?.mesh;   // and the soft blobs that follow them
  w.scene.traverse(o => { if (o.visible && (o.userData.cast || o.userData.blob || o === blobs)) { o.visible = false; hidden.push(o); } });
  w.renderer.render(w.scene, w.cam.camera); const url = w.renderer.domElement.toDataURL('image/png');
  for (const o of hidden) o.visible = true;
  return url;
});
// Share of pixels that differ between two frames (computed in the page).
const diff = (page, a, b) => page.evaluate(async ([a, b]) => {
  const load = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = src; });
  const [ia, ib] = await Promise.all([load(a), load(b)]), c = new OffscreenCanvas(ia.width, ia.height), x = c.getContext('2d');
  x.drawImage(ia, 0, 0); const da = x.getImageData(0, 0, c.width, c.height).data; x.clearRect(0, 0, c.width, c.height); x.drawImage(ib, 0, 0); const db = x.getImageData(0, 0, c.width, c.height).data;
  let n = 0; for (let i = 0; i < da.length; i += 4) if (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]) > 24) n++;
  return n / (da.length / 4);
}, [a, b]);

await check('sway: crops and tree crowns move between frames 300 ms apart; reduced motion holds them still (pc)', async () => {
  const { ctx, page, errors } = await open('pc');
  await farmSetup(page, { animals: false });
  await page.evaluate(() => { farm.game.do('setting', { key: 'daylight', value: 'always' }); farm.focus(40, 58, 20); });
  await page.waitForTimeout(1200);
  const a = await grabScenery(page); await page.waitForTimeout(300); const b = await grabScenery(page);
  save('juice-sway-a', a); save('juice-sway-b', b);
  const moving = await diff(page, a, b);
  expect(moving > 0.004, `only ${(moving * 100).toFixed(2)}% of pixels changed`);
  await page.evaluate(() => farm.game.do('setting', { key: 'reducedMotion', value: true }));
  await page.waitForTimeout(1500);
  const c = await grabScenery(page); await page.waitForTimeout(300); const d = await grabScenery(page);
  save('juice-sway-quiet-a', c); save('juice-sway-quiet-b', d);
  const still = await diff(page, c, d);
  console.log(`     sway: ${(moving * 100).toFixed(2)}% of pixels moved; reduced motion: ${(still * 100).toFixed(3)}%`);
  expect(still < 0.0005, `reduced motion still moves ${(still * 100).toFixed(3)}% of pixels`);
  expect(!errors.length, errors.join(' | '));
  await ctx.close();
});

await check('harvest: the crop pops, leaves and soil burst, a floater rises, icons fly to the barn (pc)', async () => {
  const { ctx, page, errors } = await open('pc');
  await farmSetup(page, { animals: false });
  await page.evaluate(() => { farm.game.do('setting', { key: 'daylight', value: 'always' }); farm.focus(36, 58, 20); });
  await page.waitForTimeout(1000);
  const frames = await page.evaluate(async () => {
    const w = farm.world, g = farm.game, id = Object.keys(g.s.beds).find(k => g.s.placed[k].x === 36 && g.s.placed[k].z === 58), out = {};
    const snap = () => { w.batches.flush(); w.renderer.render(w.scene, w.cam.camera); return w.renderer.domElement.toDataURL('image/png'); };
    g.do('harvest', { id });
    const t0 = performance.now(), wait = ms => new Promise(r => setTimeout(r, Math.max(0, t0 + ms - performance.now())));
    out.pop = [...w.batches.items.keys()].some(k => k.startsWith('pop:'));
    out.f0 = snap(); out.p0 = w.juice.alive;
    await wait(120); out.f120 = snap(); out.p120 = w.juice.alive;
    await wait(250); out.f250 = snap();
    out.floater = !!document.querySelector('.jfloat'); out.flights = document.querySelectorAll('.jfly').length;
    return out;
  });
  save('juice-harvest-0', frames.f0); save('juice-harvest-120', frames.f120); save('juice-harvest-250', frames.f250);
  await shot(page, 'juice-harvest-ui');
  expect(frames.pop, 'no pop copy'); expect(frames.p0 >= 8 && frames.p120 >= 4, `particles ${frames.p0} → ${frames.p120}`);
  expect(frames.floater, 'no floating +2'); expect(frames.flights >= 1, 'no icon flies to the barn');
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => ![...farm.world.batches.items.keys()].some(k => k.startsWith('pop:'))), 'the pop copy did not go away');
  expect(!errors.length, errors.join(' | '));
  await ctx.close();
});

await check('placing a bakery bounces it in a ring of dust; a busy bakery smokes and breathes (pc)', async () => {
  const { ctx, page, errors } = await open('pc');
  await farmSetup(page, { ripe: false, animals: false });
  await page.evaluate(() => { farm.game.do('setting', { key: 'daylight', value: 'always' }); farm.focus(43, 65, 26); });
  await page.waitForTimeout(800);
  const r = await page.evaluate(async () => {
    const w = farm.world, g = farm.game, out = {};
    const snap = () => { w.batches.flush(); w.renderer.render(w.scene, w.cam.camera); return w.renderer.domElement.toDataURL('image/png'); };
    const res = g.do('place', { kind: 'bakery', x: 41, z: 64, rot: 2 }); out.ok = res.ok; out.id = res.events?.find(e => e.type === 'placed')?.id;
    const t0 = performance.now(), wait = ms => new Promise(r => setTimeout(r, Math.max(0, t0 + ms - performance.now())));
    out.anim = w.batches.anims.get(out.id)?.type; out.f0 = snap(); out.dust = w.juice.alive;
    await wait(150); out.f150 = snap(); await wait(320); out.f320 = snap();
    g.s.barn.items.wheat = 30; out.queued = g.do('produce', { building: out.id, recipe: 'bread' }).ok;
    return out;
  });
  save('juice-place-0', r.f0); save('juice-place-150', r.f150); save('juice-place-320', r.f320);
  expect(r.ok && r.anim === 'pulse', `bakery placed ${r.ok}, animation ${r.anim}`); expect(r.dust >= 8, `${r.dust} dust particles`);
  expect(r.queued, 'bread was not queued');
  await page.waitForTimeout(2200);
  const smoke = await page.evaluate(id => ({ chimney: !!farm.world.juice.anchorWorld(id, farm.state().placed[id], 'chimney'), alive: farm.world.juice.alive }), r.id);
  save('juice-smoke', await grab(page));
  console.log(`     chimney ${smoke.chimney ? 'found' : 'missing'}, ${smoke.alive} particles alive while baking`);
  if (smoke.chimney) expect(smoke.alive >= 3, `only ${smoke.alive} smoke puffs`);
  expect(!errors.length, errors.join(' | '));
  await ctx.close();
});

await check('contact shadows under buildings, trees, crops and every hen (pc)', async () => {
  const { ctx, page, errors } = await open('pc');
  await farmSetup(page);
  await page.evaluate(() => { farm.game.do('setting', { key: 'daylight', value: 'always' }); farm.focus(38, 61, 24); });
  // the hens are cast subjects (skinned.mjs): their rig loads after the first scene; juice rescans once a second
  await page.waitForFunction(() => farm.world.cast?.stats().rigs.includes('hen'), null, { timeout: 20000 });
  await page.waitForTimeout(1500);
  const s = await page.evaluate(() => {
    const b = farm.world.batches, placed = farm.state().placed, ids = Object.keys(placed), cast = farm.world.cast;
    const has = id => b.shadows.big.slots.has(id) || b.shadows.small.slots.has(id);
    const hens = [...farm.world.life.herds.values()].map(a => a.subject).filter(sub => sub.rig === 'hen');
    const shaded = sub => sub.actor ? sub.actor.root.userData.blob > 0 : [...cast.crowds.values()].some(c => c.rig.name === 'hen' && c.mesh.count > 0 && c.mesh.userData.blobInst > 0);
    return { buildings: ids.filter(id => ['feed_mill', 'coop', 'tree', 'bush'].includes(placed[id].kind)).every(has), crops: Object.keys(farm.state().beds).every(id => has(`crop:${id}`)),
      farmhouse: has('farmhouse'), barn: has('barn'), blobs: farm.world.juice.moving.layer.mesh.count, shaded: hens.filter(shaded).length, herd: Object.values(farm.state().animals).flat().length };
  });
  save('juice-shadow', await grab(page));
  expect(s.buildings && s.crops && s.farmhouse && s.barn, JSON.stringify(s));
  // every hen has a blob (the layer also holds the family and critters walking nearby)
  expect(s.shaded === s.herd && s.herd === 3 && s.blobs >= s.herd, `${s.shaded} shaded hens (${s.blobs} moving blobs) for ${s.herd} animals`);
  expect(!errors.length, errors.join(' | '));
  await ctx.close();
});

await check('coins pour into the counter when an order is delivered; flights fall back when a target is missing (pc)', async () => {
  const { ctx, page, errors } = await open('pc');
  await farmSetup(page, { animals: false });
  await page.evaluate(() => { const g = farm.game; g.do('harvest', { ids: Object.keys(g.s.beds) }); });
  await page.click('[data-act="orders"]');
  await page.waitForTimeout(400);
  // a locator, not a handle: the panel is redrawn on the clock, and a handle taken before a redraw is gone when clicked
  const can = page.locator('.order.can [data-do="deliver"]').first();
  expect(await can.count() > 0, 'no order can be delivered');
  // the setup lifts rocks, and a lucky find under one pays coins of its own: let those land first, so only this order's pour is counted
  await page.waitForFunction(() => document.querySelectorAll('.jcoin').length === 0, null, { timeout: 5000 });
  await can.click(); await page.waitForTimeout(120);
  const coins = await page.evaluate(() => document.querySelectorAll('.jcoin').length);
  await shot(page, 'juice-coins');
  expect(coins >= 8 && coins <= 15, `${coins} coins in the air`);
  // with the barn button gone, collected goods fly to its corner instead of failing
  const fallback = await page.evaluate(async () => {
    const barnBtn = document.querySelector('[data-act="barn"]'); if (barnBtn) barnBtn.style.display = 'none';
    const g = farm.game; farm.setClockOffset(90 * 60_000);
    for (const id of Object.keys(g.s.placed).filter(k => g.s.placed[k].kind === 'bed')) g.do('plant', { id, crop: 'wheat' });
    g.clock = () => Date.now() + 200 * 60_000; g.do('harvest', { ids: Object.keys(g.s.beds) });
    return document.querySelectorAll('.jfly:not(.jcoin)').length;
  });
  expect(fallback >= 1, 'no flight without the barn button');
  expect(!errors.length, errors.join(' | '));
  await ctx.close();
});

await check('camera: a drag flings on, an edge drag springs back, flyTo eases in (pc)', async () => {
  const { ctx, page, errors } = await open('pc');
  await page.evaluate(() => farm.focus(60, 60, 40));
  const c0 = await page.evaluate(() => ({ x: farm.world.cam.x, z: farm.world.cam.z }));
  await page.mouse.move(700, 400); await page.mouse.down();
  for (let i = 1; i <= 8; i++) { await page.mouse.move(700 - i * 30, 400, { steps: 1 }); await page.waitForTimeout(8); }
  await page.mouse.up();
  const c1 = await page.evaluate(() => ({ x: farm.world.cam.x, z: farm.world.cam.z, moving: farm.world.cam.moving }));
  await page.waitForTimeout(500);
  const c2 = await page.evaluate(() => ({ x: farm.world.cam.x, z: farm.world.cam.z, moving: farm.world.cam.moving }));
  const glide = Math.hypot(c2.x - c1.x, c2.z - c1.z);
  expect(c1.moving && glide > 0.5, `no fling: glided ${glide.toFixed(2)} m after release`);
  // past the west edge, then let go
  await page.evaluate(() => farm.world.cam.lookAt(3, 128, 40));
  await page.mouse.move(400, 400); await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(400 + i * 40, 400 + i * 20, { steps: 1 });
  const out = await page.evaluate(() => farm.world.cam.x);
  await page.mouse.up();
  await page.waitForFunction(() => !farm.world.cam.moving, null, { timeout: 4000 }).catch(() => {});
  const back = await page.evaluate(() => ({ x: farm.world.cam.x, moving: farm.world.cam.moving }));
  expect(out < 0 && back.x >= 0 && !back.moving, `edge: dragged to x ${out.toFixed(2)}, settled at ${back.x.toFixed(2)}`);
  const fly = await page.evaluate(async () => { const cam = farm.world.cam, p = cam.flyTo(120, 80, 50, 600); await new Promise(r => setTimeout(r, 250)); const mid = { x: cam.x, z: cam.z }; const done = await p; return { mid, end: { x: cam.x, z: cam.z, span: cam.span }, done }; });
  expect(fly.done && Math.abs(fly.end.x - 120) < 0.01 && Math.abs(fly.end.span - 50) < 0.01, `flyTo ended at ${JSON.stringify(fly.end)}`);
  expect(fly.mid.x > 3 && fly.mid.x < 120, `flyTo jumped: ${JSON.stringify(fly.mid)}`);
  expect(!errors.length, errors.join(' | '));
  await ctx.close();
});

await check('ghost: follows the pointer on a spring and pulses (pc)', async () => {
  const { ctx, page, errors } = await open('pc');
  await farmSetup(page, { ripe: false, animals: false });
  const r = await page.evaluate(async () => {
    const gh = farm.build.ghost, wait = ms => new Promise(r => setTimeout(r, ms));
    farm.focus(44, 68, 30); farm.build.show(); farm.build.select('tree');
    farm.build.hover({ x: 42, z: 68 }); await wait(400);
    const start = gh.at.x;
    farm.build.hover({ x: 47, z: 68 }); await wait(30);
    const early = gh.at.x, goal = gh.goal.x;
    await wait(700);
    // sample the breathing across most of one period (about 1.6 s), so a sample pair near a crest or trough cannot hide it
    const seen = []; for (let i = 0; i < 6; i++) { seen.push(gh.tileMat.opacity); await wait(180); }
    return { start, early, goal, end: gh.at.x, seen: seen.map(o => +o.toFixed(3)), ok: gh.ok, breathing: Math.max(...seen) - Math.min(...seen) > 0.02 };
  });
  expect(r.early > r.start && r.early < r.goal, `the ghost jumped: ${JSON.stringify(r)}`);
  expect(Math.abs(r.end - r.goal) < 0.05, `the ghost did not arrive: ${JSON.stringify(r)}`);
  expect(r.breathing, `the ghost does not pulse: ${JSON.stringify(r)}`);
  expect(!errors.length, errors.join(' | '));
  await ctx.close();
});

await check('budget: a fully planted farm stays within 120 draws and 300k triangles; juice adds at most 6 draws and 300 particles (phone)', async () => {
  const { ctx, page } = await open('phone');
  const n = await page.evaluate(() => farm.fillFarm());
  expect(n > 2500, `${n} crops`);
  for (const span of [40, 90, 220]) {
    const info = await page.evaluate(s => { farm.view(s, 128, 112); return new Promise(r => setTimeout(r, 1200)).then(() => farm.measure(800)); }, span);
    // every juice draw that can ever be on (3 shadow layers and 2 particle pools), whether busy now or not
    const juice = await page.evaluate(() => farm.world.scene.children.filter(o => o.userData.shadows || o.userData.particles).length);
    console.log(`     span ${span}: ${info.draws} draws (juice owns ${juice} possible draws), ${Math.round(info.triangles / 1000)}k triangles, ${info.fps} fps`);
    expect(info.draws <= 120 && info.triangles <= 300000, `span ${span}: ${info.draws} draws, ${info.triangles} triangles`);
    expect(juice <= 6, `${juice} juice draws`);
  }
  await ctx.close();
});

await check('a 40-bed sweep harvest at span 20 keeps 50+ fps on a phone, under 300 particles (phone)', async () => {
  const { ctx, page, errors } = await open('phone');
  const r = await page.evaluate(async () => {
    const g = farm.game; g.s.coins = 50000; g.s.level = 9; g.s.barn.cap = 2000;
    for (let z = 54; z <= 66; z++) for (let x = 30; x <= 46; x++) g.do('clear', { x, z });
    for (let z = 56; z <= 60; z++) for (let i = 0; i < 8; i++) g.do('place', { kind: 'bed', x: 33 + i, z });
    const beds = Object.keys(g.s.placed).filter(k => g.s.placed[k].kind === 'bed');
    g.do('plant', { ids: beds, crop: 'wheat' }); for (const id of beds) g.s.beds[id].doneAt = g.now - 1;
    document.querySelectorAll('.modal').forEach(m => m.remove()); farm.panels.close();
    farm.focus(37, 58, 20);
    await new Promise(r => setTimeout(r, 1200));
    let peak = 0; const watch = farm.world.onFrame(() => { peak = Math.max(peak, farm.world.juice.alive); });
    const measuring = farm.measure(1600);
    for (const id of beds) { const p = g.s.placed[id]; farm.world.juice.pop({ x: p.x, z: p.z }); g.do('harvest', { id }); await new Promise(r => setTimeout(r, 25)); }
    const m = await measuring; watch();
    return { ...m, peak, harvested: beds.length - Object.keys(g.s.beds).length };
  });
  console.log(`     sweep: ${r.fps} fps, ${r.draws} draws, peak ${r.peak} particles, ${r.harvested} beds`);
  expect(r.harvested === 40, `${r.harvested} beds harvested`);
  expect(r.fps >= 50, `${r.fps} fps`); expect(r.peak <= 300, `${r.peak} particles`);
  expect(!errors.length, errors.join(' | '));
  await ctx.close();
});

await check('sound: no audio is fetched before the first tap; the clips load after it; sfx folder under 200 KB', async () => {
  let total = 0; const walk = d => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else total += statSync(p).size; } };
  walk('public/assets/sfx');
  expect(total < 200 * 1024, `sfx folder is ${(total / 1024).toFixed(1)} KB`);
  const { ctx, page, errors, requests } = await open('pc');
  await page.waitForTimeout(800);
  expect(!requests.some(u => u.includes('/sfx/')), 'sound files were fetched before a tap');
  await page.mouse.click(640, 400); await page.waitForTimeout(1500);
  const got = requests.filter(u => u.includes('/sfx/')).length;
  console.log(`     sfx folder ${(total / 1024).toFixed(1)} KB; ${got} clips fetched after the first tap`);
  expect(got >= 10, `${got} clips fetched after the tap`);
  expect(!errors.length, errors.join(' | '));
  await ctx.close();
});

await browser.close();
const failed = results.filter(r => r[1] !== 'ok');
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
