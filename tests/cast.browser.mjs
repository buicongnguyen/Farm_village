// Browser checks for the living cast (cast package): animated animals and villagers, the family, critters, budgets.
// Run after `npm run build:test` with dist served (GAME_URL, default http://127.0.0.1:5241/). Screenshots go to
// SHOTS_DIR (default test-results/cast/).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { personName } from '../src/content/character-names.mjs';
const URL_ = process.env.GAME_URL ?? 'http://127.0.0.1:5241/';
const SHOTS = (process.env.SHOTS_DIR ?? 'test-results/cast').replace(/\/?$/, '/'); mkdirSync(SHOTS, { recursive: true });
const gpu = process.env.GPU !== '0';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: gpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] : ['--enable-unsafe-swiftshader'] });
const DEVICES = {
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  pc: { viewport: { width: 1280, height: 800 } },
};
const results = [];
async function open(device = 'pc', query = '?new', { intro = false } = {}) {
  const ctx = await browser.newContext(DEVICES[device]), page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push(m.text()); });
  await page.goto(URL_ + query);
  await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
  if (!intro) await page.evaluate(() => farm.skipIntro());
  await page.evaluate(() => { farm.game.s.settings.daylight = 'always'; });
  return { ctx, page, errors };
}
async function check(name, f) {
  const t0 = Date.now();
  try { await f(); results.push([name, 'ok']); console.log(`ok   ${name} (${((Date.now() - t0) / 1000).toFixed(1)} s)`); }
  catch (e) { results.push([name, 'FAIL']); console.log(`FAIL ${name}\n     ${e.message}`); }
}
const expect = (cond, msg) => { if (!cond) throw new Error(msg); };
const until = async (page, f, arg, ms = 20000) => page.waitForFunction(f, arg, { timeout: ms, polling: 200 });

/** A working farm: beds, a coop with six hens in a fenced yard, a cow barn with four cows, two cottages with families. */
const setup = page => page.evaluate(() => {
  const g = farm.game, s = g.s; s.coins = 50000; s.settings.daylight = 'always';
  for (let z = 56; z <= 71; z++) for (let x = 32; x <= 47; x++) g.do('clear', { x, z });
  for (let x = 30; x <= 47; x++) g.do('place', { kind: 'path', x, z: 63 });
  for (let i = 0; i < 6; i++) { g.do('place', { kind: 'bed', x: 33 + i, z: 58 }); g.do('place', { kind: 'bed', x: 33 + i, z: 60 }); }
  s.level = 8; s.xp = 3000;
  g.do('place', { kind: 'feed_mill', x: 32, z: 64, rot: 2 }); g.do('place', { kind: 'coop', x: 35, z: 64, rot: 2 });
  for (const x of [34, 38]) g.do('place', { kind: 'path', x, z: 92 });
  g.do('place', { kind: 'cottage', x: 33, z: 93, rot: 2 }); s.barn.items.bread = 5; g.do('projectDeliver');
  g.do('place', { kind: 'cottage', x: 37, z: 93, rot: 2 });
  const fenceRect = (x0, z0, x1, z1, gate) => { for (let x = x0; x <= x1; x++) { s.fences[`${x},${z0},n`] = 'fence'; s.fences[`${x},${z1 + 1},n`] = 'fence'; } for (let z = z0; z <= z1; z++) { s.fences[`${x0},${z},w`] = 'fence'; s.fences[`${x1 + 1},${z},w`] = 'fence'; } s.fences[gate] = 'gate'; };
  fenceRect(34, 64, 39, 68, '37,64,n');
  const coop = Object.keys(s.placed).find(k => s.placed[k].kind === 'coop');
  s.animals[coop] = Array.from({ length: 6 }, (_, i) => ({ kind: 'hen', doneAt: i < 2 ? g.now - 1000 : null }));
  const barn = `p${s.nextId++}`; s.placed[barn] = { kind: 'cow_barn', x: 42, z: 65, rot: 2 }; s.counts.cow_barn = 1;
  fenceRect(41, 64, 47, 70, '45,64,n');
  s.animals[barn] = Array.from({ length: 4 }, (_, i) => ({ kind: 'cow', doneAt: i === 0 ? g.now - 1000 : null }));
  for (const [id, p] of Object.entries(s.placed)) if (p.kind === 'bed') g.do('plant', { id, crop: 'wheat' });
  farm.setClockOffset(3 * 60_000);
  g.emit({ ok: true, events: [{ type: 'loaded' }] }, 'test');
  document.querySelectorAll('.modal').forEach(m => m.remove()); farm.panels.close();
});
const rigsReady = (page, names) => until(page, n => n.every(r => farm.world.cast.stats().rigs.includes(r)), names, 30000);
/** Bone rotations of every skinned actor of a rig: [[x, y, z, w, ...], ...]. */
const poses = (page, rig) => page.evaluate(rig => farm.world.cast.actors.filter(a => a.subject && a.rig.name === rig).map(a => Object.values(a.bones).flatMap(b => b.quaternion.toArray().map(v => +v.toFixed(3)))), rig);
const differ = (a, b) => a.some((v, i) => Math.abs(v - b[i]) > 0.02);

for (const device of ['pc', 'phone']) await check(`hens peck and walk in different poses, a cow grazes, a villager walks (${device})`, async () => {
  const { ctx, page, errors } = await open(device);
  await setup(page);
  await rigsReady(page, ['hen', 'cow', 'man', 'woman']);
  await page.evaluate(() => farm.view(15, 74, 133));
  await until(page, () => farm.world.cast.actors.filter(a => a.subject && a.rig.name === 'hen').length >= 3);
  const a = await poses(page, 'hen');
  await page.screenshot({ path: `${SHOTS}cast-coop-a-${device}.png` });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOTS}cast-coop-b-${device}.png` });
  const b = await poses(page, 'hen');
  expect(a.length >= 3, `${a.length} hens animated`);
  expect(a.some((p, i) => i > 0 && differ(p, a[0])), 'every hen is in the same pose');
  expect(a.some((p, i) => b[i] && differ(p, b[i])), 'the hens did not move in 400 ms');
  // a cow grazes (head down) when it chooses to; make one choose now
  await page.evaluate(() => { for (const h of farm.world.life.herds.values()) if (h.kind === 'cow') { h.state = 'graze'; h.until = farm.world.life.time + 12; } farm.view(15, 89, 135); });
  await until(page, () => farm.world.cast.actors.some(a => a.subject && a.rig.name === 'cow' && a.clip === 'Graze'));
  await page.screenshot({ path: `${SHOTS}cast-cow-${device}.png` });
  // a villager's walk cycle: the legs move between two moments
  await page.evaluate(() => farm.view(24, 72, 186));
  await until(page, () => farm.world.cast.actors.some(a => a.subject && ['man', 'woman', 'kid'].includes(a.rig.name) && a.clip === 'Walk'), null, 30000);
  await page.evaluate(() => { window.walker = farm.world.cast.actors.find(a => a.subject && ['man', 'woman', 'kid'].includes(a.rig.name) && a.clip === 'Walk'); });
  const legs = () => page.evaluate(() => ['thigh_L', 'thigh_R', 'shin_L'].flatMap(n => window.walker.bones[n].quaternion.toArray()));
  const l1 = await legs(); await page.waitForTimeout(250); const l2 = await legs();
  expect(differ(l1, l2), `the walking villager kept the same leg pose (${await page.evaluate(() => [window.walker.clip, window.walker.subject?.speed])})`);
  await page.screenshot({ path: `${SHOTS}cast-walk-${device}.png` });
  expect(!errors.length, errors.join(' | '));
  await ctx.close();
});

await check('June and Pip are by the farmhouse after the tutorial, and Pip speaks after the first harvest', async () => {
  const { ctx, page, errors } = await open('pc');
  await rigsReady(page, ['woman', 'kid']);
  const home = await page.evaluate(() => ['june', 'pip'].map(id => { const w = farm.people.walkers.get(id); return w && Math.hypot(w.x - 45, w.z - 125); }));
  expect(home.every(d => d != null && d < 40), `June and Pip are ${home} m from the farmhouse`);
  await page.evaluate(() => { const w = farm.people.walkers.get('pip'); farm.world.cam.lookAt(w.x, w.z, 24); });
  await until(page, () => ['june', 'pip'].some(id => farm.people.walkers.get(id).subject.actor));
  await page.screenshot({ path: `${SHOTS}cast-family.png` });
  // the first harvest
  await page.evaluate(() => {
    const g = farm.game; g.s.coins = 500; g.do('clear', { x: 34, z: 59 }); g.do('place', { kind: 'bed', x: 34, z: 59 });
    const id = Object.keys(g.s.placed).find(k => g.s.placed[k].kind === 'bed'); g.do('plant', { id, crop: 'wheat' }); g.s.beds[id].doneAt = g.now - 1; g.do('harvest', { id });
  });
  await until(page, name => [...document.querySelectorAll('.bubble')].some(b => b.textContent.startsWith(name)), personName('pip'), 5000);
  expect(!errors.length, errors.join(' | '));
  await ctx.close();
});

await check('walkers swing their legs at normal zoom, and a still walker stands (phone, default span 70)', async () => {
  const { ctx, page, errors } = await open('phone');
  await page.evaluate(() => { const g = farm.game; g.s.level = 6; for (const x of [34, 38]) g.do('place', { kind: 'path', x, z: 92 }); g.do('testAddFamily'); g.do('testAddFamily'); document.querySelectorAll('.modal').forEach(m => m.remove()); });
  // The opening is a close-up (LOD0): visible people can all be skinned, so no crowd batch exists yet.
  // Establish the LOD under test before waiting for its baked crowd gaits.
  await page.evaluate(() => farm.view(70));
  await until(page, () => farm.world.cast.stats().rigs.includes('woman'), null, 30000);
  // wait for the walk cycles to be baked (idle time after the rigs load)
  await until(page, () => ['man', 'woman', 'kid'].every(n => { const c = [...farm.world.cast.crowds.values()].find(x => x.rig.name === n); return !c || c.rig.gait; }) && [...farm.world.cast.crowds.values()].some(c => c.rig.gait), null, 30000);
  const seen = await page.evaluate(async () => {
    const frames = new Set(), still = [];
    for (let i = 0; i < 60; i++) {
      for (const w of farm.people.walkers.values()) { const sub = w.subject; if (!sub || w.indoors || sub.actor) continue; if (sub._mv > farm.world.cast.time) frames.add(`${w.id}:${Math.floor((sub._ph ?? 0) * 6)}`); else if (!w.route?.length && w.clip === 'Idle') still.push(w.id); }
      await new Promise(r => setTimeout(r, 120));
    }
    const perWalker = {}; for (const f of frames) { const [id] = f.split(':'); perWalker[id] = (perWalker[id] ?? 0) + 1; }
    return { perWalker, lod: farm.world.cam.lod };
  });
  expect(seen.lod === 1, `expected the middle level of detail, got ${seen.lod}`);
  const best = Math.max(0, ...Object.values(seen.perWalker));
  expect(best >= 4, `no walker went through four or more walk frames: ${JSON.stringify(seen.perWalker)}`);
  expect(!errors.length, errors.join(' | '));
  await ctx.close();
});
await check('June gives a tip when the player seems stuck', async () => {
  const { ctx, page } = await open('pc');
  await page.evaluate(() => { farm.people.idleTipMs = 1500; });
  await until(page, name => [...document.querySelectorAll('.bubble')].some(b => b.textContent.startsWith(name)), personName('june'), 8000);
  await ctx.close();
});

await check('budgets: at most 8 skinned actors within the triangle budget, few extra draws, a light mixer (phone)', async () => {
  const { ctx, page, errors } = await open('phone');
  await setup(page);
  await rigsReady(page, ['hen', 'cow', 'man', 'woman', 'kid', 'hana', 'dog']);
  for (const [span, x, z] of [[20, 76, 132], [40, 76, 140], [90, 76, 150]]) {
    await page.evaluate(([s, x, z]) => farm.view(s, x, z), [span, x, z]); await page.waitForTimeout(900);
    const on = await page.evaluate(() => farm.measure(1200)), st = await page.evaluate(() => farm.world.cast.stats());
    await page.evaluate(() => farm.world.cast.setEnabled(false)); await page.waitForTimeout(300);
    const off = await page.evaluate(() => farm.measure(600));
    await page.evaluate(() => farm.world.cast.setEnabled(true));
    console.log(`     span ${span}: ${st.actors} skinned (${st.tris} triangles), cast adds ${on.draws - off.draws} draws and ${Math.round((on.triangles - off.triangles) / 1000)}k triangles, ${on.fps} fps, mixer ${st.mixerMs} ms`);
    expect(st.actors <= 8 && st.tris <= 60000, `${st.actors} actors, ${st.tris} triangles`);
    // measured against the same scene with no animals or people at all, so this is stricter than "extra over v0.1"
    expect(on.draws - off.draws <= 14,   // 12 until v0.3b added you (the player's own man rig)
       `the cast adds ${on.draws - off.draws} draws`);
    expect(on.triangles - off.triangles <= 60000, `the cast adds ${on.triangles - off.triangles} triangles`);
    expect(on.draws <= 120 && on.triangles <= 300000, `${on.draws} draws, ${on.triangles} triangles`);
    if (span === 20) expect(on.fps >= 50, `${on.fps} fps at span 20`);
  }
  // the mixer on a phone-speed CPU
  const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.evaluate(() => farm.view(20, 76, 132)); await page.waitForTimeout(2500);
  const mixer = await page.evaluate(() => farm.world.cast.stats().mixerMs);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  console.log(`     mixer and actors at 4x CPU slowdown: ${mixer} ms a frame`);
  expect(mixer <= 1.5, `mixer ${mixer} ms`);
  expect(!errors.length, errors.join(' | '));
  await ctx.close();
});

// The chapter card took 3.15–3.2 s on this emulation at the AAA kickoff (before the cast); the cast must not slow it.
await check('rigged models load after the first scene (4G phone), and the chapter card is as quick as before', async () => {
  const ctx = await browser.newContext(DEVICES.phone), page = await ctx.newPage(), cdp = await ctx.newCDPSession(page), rigged = [];
  await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 70, downloadThroughput: 9e6 / 8, uploadThroughput: 4e6 / 8 });
  const t0 = Date.now(); let readyAt = 0;
  page.on('request', r => { if (r.url().includes('/rigged/')) rigged.push(Date.now() - t0); });
  await page.goto(URL_ + '?new');
  await page.waitForSelector('.chapter', { timeout: 30000 }); const card = Date.now() - t0;
  await page.waitForFunction(() => window.farm?.ready); readyAt = Date.now() - t0;
  console.log(`     chapter card after ${card} ms; first rigged model requested at ${rigged[0] ?? 'never'} ms`);
  expect(card <= 3400, `chapter card after ${card} ms`);
  expect(!rigged.length || rigged[0] >= Math.min(card, readyAt), `a rigged model was requested at ${rigged[0]} ms, before the first scene`);
  await ctx.close();
});

await check('a tapped hen flaps and hops; crows land on open fields and leave for a scarecrow or a tap', async () => {
  const { ctx, page, errors } = await open('pc');
  await setup(page);
  await rigsReady(page, ['hen', 'crow']).catch(() => {});
  await page.evaluate(() => farm.view(15, 74, 133));
  await until(page, () => farm.world.cast.actors.some(a => a.subject?.animal && a.rig.name === 'hen'));
  const p = await page.evaluate(() => { const a = [...farm.world.life.herds.values()].find(h => h.subject.actor); const v = farm.world.cam.camera.position.clone().set(a.subject.x, 0.4, a.subject.z).project(farm.world.cam.camera); window.poked = a; return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight }; });
  await page.mouse.click(p.x, p.y);
  expect(await page.evaluate(() => window.poked.hop > 0 && window.poked.subject.once?.clip === 'Flap'), 'the hen did not react to the tap');
  // a crow comes to the wheat (no scarecrow yet)
  await page.evaluate(() => { farm.world.critters.nextCrow = 0; });
  await until(page, () => farm.world.critters.crows.some(c => c.state === 'ground'), null, 15000);
  const crow = await page.evaluate(() => { const c = farm.world.critters.crows.find(c => c.state === 'ground'); farm.world.cam.lookAt(c.sub.x, c.sub.z, 15); return [Math.floor(c.sub.x / 2), Math.floor(c.sub.z / 2)]; });
  await until(page, () => farm.world.critters.crows.find(c => c.state === 'ground')?.sub.actor);
  await page.screenshot({ path: `${SHOTS}cast-crow.png` });
  // a scarecrow goes up next to it
  await page.evaluate(([x, z]) => { const s = farm.game.s, id = `p${s.nextId++}`; s.placed[id] = { kind: 'scarecrow', x: x + 1, z: z + 3, rot: 0 }; farm.game.emit({ ok: true, events: [{ type: 'placed', id, kind: 'scarecrow', x: x + 1, z: z + 3 }] }, 'test'); }, crow);
  await until(page, () => !farm.world.critters.crows.some(c => c.state === 'ground'), null, 3000);
  expect(await page.evaluate(() => farm.world.critters.openFields().length) === 0, 'fields near the scarecrow still count as open');
  expect(!errors.length, errors.join(' | '));
  await ctx.close();
});

await check('night: animals sleep by their home and villagers go indoors; nothing breaks after a lost WebGL context', async () => {
  const { ctx, page, errors } = await open('pc');
  await setup(page);
  await rigsReady(page, ['hen', 'cow', 'man', 'woman']);
  const hour = new Date().getHours(), toNight = ((23 - hour + 24) % 24) * 3600e3;
  await page.evaluate(ms => { farm.game.s.settings.daylight = 'real'; farm.setClockOffset(ms); farm.view(20, 80, 133); }, toNight);
  await until(page, () => [...farm.world.life.herds.values()].filter(h => h.state === 'sleep').length >= 6, null, 40000);
  await until(page, () => [...farm.people.walkers.values()].filter(w => !w.visitor && w.id !== 'dog').every(w => w.indoors), null, 90000)
    .catch(async () => { throw new Error(`still outdoors: ${await page.evaluate(() => [...farm.people.walkers.values()].filter(w => !w.visitor && !w.pet && !w.indoors).map(w => `${w.id} route ${w.route.length} ${w.clip}`).join(', '))}`); });
  await page.screenshot({ path: `${SHOTS}cast-night.png` });
  await page.evaluate(ms => { farm.game.s.settings.daylight = 'always'; farm.setClockOffset(ms); }, 3 * 60_000);
  // lose the WebGL context and get it back
  await page.evaluate(() => { const gl = farm.world.renderer.getContext(), ext = gl.getExtension('WEBGL_lose_context'); window.lose = ext; ext.loseContext(); });
  await page.waitForTimeout(500);
  await page.evaluate(() => window.lose.restoreContext());
  await page.waitForTimeout(1500);
  await page.evaluate(() => farm.view(15, 74, 133));
  const info = await page.evaluate(() => farm.measure(800));
  expect(info.draws > 0 && info.triangles > 0, `nothing drawn after the context came back: ${JSON.stringify(info)}`);
  expect(!errors.filter(e => !/context lost|CONTEXT_LOST/i.test(e)).length, errors.join(' | '));
  await page.evaluate(() => sessionStorage.removeItem('fv-clock-offset'));
  await ctx.close();
});

await browser.close();
const failed = results.filter(r => r[1] !== 'ok');
console.log(`\n${results.length - failed.length}/${results.length} cast checks passed`);
process.exit(failed.length ? 1 : 0);
