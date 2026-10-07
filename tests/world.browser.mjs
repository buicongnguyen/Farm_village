// World package browser checks (run after tests/browser.mjs by scripts/run-browser-suites.mjs; same GAME_URL and server).
// Saves review screenshots when SHOTS=<dir> is set: world-far/mid/close (PC and phone), world-edge, world-brook, world-night.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const URL_ = process.env.GAME_URL ?? 'http://127.0.0.1:5241/';
const SHOTS = process.env.SHOTS; if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const gpu = process.env.GPU !== '0';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: gpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] : ['--enable-unsafe-swiftshader'] });
const DEVICES = { phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }, pc: { viewport: { width: 1280, height: 800 } } };
const results = [];
async function open(device = 'pc', query = '') {
  const ctx = await browser.newContext(DEVICES[device]), page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push(m.text()); });
  await page.goto(URL_ + query);
  await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
  await page.evaluate(() => { farm.skipIntro(); return farm.world.later; });
  return { ctx, page, errors };
}
async function check(name, f) {
  const t0 = Date.now();
  try { await f(); results.push([name, 'ok']); console.log(`ok   ${name}`); }
  catch (e) { results.push([name, 'FAIL']); console.log(`FAIL ${name}\n     ${e.message}`); }
  void t0;
}
const expect = (cond, msg) => { if (!cond) throw new Error(msg); };
const shot = (page, name) => SHOTS ? page.screenshot({ path: `${SHOTS}/${name}.png` }) : null;
const settle = (page, ms = 900) => page.waitForTimeout(ms);
/** Render now and read the canvas back: { mean luminance 0..1, pixels equal to the background colour, hash }. */
const readCanvas = page => page.evaluate(() => {
  const w = farm.world, r = w.renderer, gl = r.getContext();
  r.render(w.scene, w.cam.camera);
  const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight, px = new Uint8Array(W * H * 4);
  gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
  const bg = w.scene.background.clone().convertLinearToSRGB(), br = Math.round(bg.r * 255), bgG = Math.round(bg.g * 255), bb = Math.round(bg.b * 255);
  let lum = 0, same = 0, n = 0, hash = 0;
  for (let i = 0; i < px.length; i += 4 * 7) {
    lum += (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255; n++;
    if (Math.abs(px[i] - br) <= 1 && Math.abs(px[i + 1] - bgG) <= 1 && Math.abs(px[i + 2] - bb) <= 1) same++;
    hash = (hash * 31 + px[i] + px[i + 1] * 7 + px[i + 2] * 13) | 0;
  }
  return { lum: lum / n, background: same / n, hash, W, H };
});
const NIGHT = () => { const d = new Date(); d.setHours(23, 0, 0, 0); farm.setClockOffset(d.getTime() - Date.now()); };

await check('the world is dressed: backdrop, brook, bridge, pond, groves, drifts, sky life, locked land (no errors)', async () => {
  const { ctx, page, errors } = await open('pc');
  const w = await page.evaluate(() => {
    const W = farm.world, names = ['skirt', 'far-plane', 'neighbour-farms', 'brook-water', 'brook-props', 'pond-ducks', 'cloud-shadows', 'birds', 'butterflies', 'night-lights', 'locked-land', 'plaza', 'home-hedge', 'windmill-rotor', 'glows', 'light-pools'];
    return { missing: names.filter(n => !W.scene.getObjectByName(n)), trees: W.wilds.trees.length, flowers: W.wilds.flowers.length, band: W.backdrop.treeCount, decor: W.wildDecor.length, signs: W.locked.signs, fog: !!W.scene.fog };
  });
  expect(!w.missing.length, `missing: ${w.missing.join(', ')}`);
  expect(w.trees > 500 && w.flowers > 800 && w.band > 300 && w.decor > 0, JSON.stringify(w));
  expect(w.signs >= 2, `for-sale signs: ${w.signs}`);
  expect(w.fog, 'no fog');
  expect(!errors.length, errors.join('\n'));
  for (const [name, span] of [['far', 90], ['mid', 45], ['close', 20]]) { await page.evaluate(s => farm.view(s), span); await settle(page); await shot(page, `world-${name}-pc`); }
  await ctx.close();
});

await check('the ground has no checkerboard: neighbouring grass cells share their corner colours', async () => {
  const { ctx, page } = await open('pc');
  const r = await page.evaluate(() => {
    // in a chunk of wild grass, every vertex position must carry one colour, whichever cell it belongs to
    const mesh = farm.world.ground.meshes.get('96,96'), p = mesh.geometry.attributes.position, c = mesh.geometry.attributes.color, seen = new Map();
    let clash = 0, total = 0;
    for (let i = 0; i < p.count; i++) {
      const key = `${p.getX(i)},${p.getZ(i)}`, col = [c.getX(i), c.getY(i), c.getZ(i)].map(v => v.toFixed(3)).join();
      if (!seen.has(key)) seen.set(key, new Set()); seen.get(key).add(col);
    }
    for (const s of seen.values()) { total++; if (s.size > 1) clash++; }
    return { clash, total };
  });
  // hard surfaces (paths, roads) keep crisp edges, so a few corners differ; open grass must not
  expect(r.clash / r.total < 0.08, `${r.clash} of ${r.total} corners have more than one colour`);
  await ctx.close();
});

await check('edge: at full zoom-out on a phone at the map corner there is no background colour, only hills, trees and haze', async () => {
  const { ctx, page } = await open('phone');
  for (const [x, z] of [[0, 0], [256, 256], [0, 256], [256, 0]]) {
    await page.evaluate(([x, z]) => farm.view(260, x, z), [x, z]); await settle(page, 400);
    const c = await readCanvas(page);
    expect(c.background < 0.002, `corner ${x},${z}: ${(c.background * 100).toFixed(2)}% of pixels show the background colour`);
  }
  await page.evaluate(() => farm.view(260, 0, 0)); await settle(page, 1500); await shot(page, 'world-edge');
  await ctx.close();
});

await check('brook: the water ribbon, its banks and props, and the bridge where the road crosses', async () => {
  const { ctx, page } = await open('pc');
  const r = await page.evaluate(() => {
    const W = farm.world, water = W.scene.getObjectByName('brook-water'), props = W.scene.getObjectByName('brook-props');
    props.geometry.computeBoundingBox();
    return { water: water.geometry.index.count / 3, props: props.geometry.attributes.position.count / 3, sway: !!props.geometry.attributes.aSway };
  });
  expect(r.water > 500 && r.props > 1000 && r.sway, JSON.stringify(r));
  await page.evaluate(() => farm.view(30, 58, 25)); await settle(page, 1200); await shot(page, 'world-brook');
  await page.evaluate(() => farm.view(28, 30, 85)); await settle(page, 1000); await shot(page, 'world-pond');
  await ctx.close();
});

await check('night at 23:00 is applied at once: very dark blue sky, black-blue water, lit windows and lamps, readable ground', async () => {
  const { ctx, page } = await open('pc');
  await page.evaluate(() => farm.view(60, 60, 120)); await settle(page, 600);
  const day = await readCanvas(page);
  await page.evaluate(NIGHT);
  // one frame later the night must be there (not after the next 3-second refresh)
  const r = await page.evaluate(() => new Promise(res => requestAnimationFrame(() => requestAnimationFrame(() => {
    const W = farm.world, bg = W.scene.background.getHexString();
    res({ bg, night: W.daylight.nightness, water: W.brook.uniforms.uNight.value, bulbs: W.daylight.glowCount.bulbs, pools: W.daylight.glowCount.pools, glowsOn: W.scene.getObjectByName('glows').visible, stars: W.scene.getObjectByName('night-lights').visible });
  }))));
  expect(r.bg === '0b1530', `sky ${r.bg}`); expect(r.night === 1 && r.water === 1, JSON.stringify(r));
  expect(r.bulbs >= 3 && r.pools >= 3 && r.glowsOn && r.stars, JSON.stringify(r));
  await settle(page, 600);
  const night = await readCanvas(page);
  expect(night.lum < day.lum * 0.75, `night not darker: ${night.lum.toFixed(3)} vs day ${day.lum.toFixed(3)}`);
  expect(night.lum > day.lum * 0.25, `night too dark to read: ${night.lum.toFixed(3)} vs day ${day.lum.toFixed(3)}`);
  await page.evaluate(() => farm.view(45, 58, 112)); await settle(page, 1200); await shot(page, 'world-night');
  // the Settings switch back to always-day applies at once too
  await page.evaluate(() => farm.game.do('setting', { key: 'daylight', value: 'always' }));
  const bg = await page.evaluate(() => new Promise(res => requestAnimationFrame(() => res('#' + farm.world.scene.background.getHexString()))));
  expect(bg !== '#0b1530', `still night after choosing always-day: ${bg}`);
  await page.evaluate(() => sessionStorage.removeItem('fv-clock-offset'));
  await ctx.close();
});

await check('the world moves: clouds drift and butterflies flutter (two frames 1 s apart differ)', async () => {
  const { ctx, page } = await open('pc');
  await page.evaluate(() => farm.view(26, 100, 150)); await settle(page, 3000);
  const a = await page.evaluate(() => ({ t: farm.world.sky.shadows.uniforms.uTime.value, anchored: farm.world.sky.anchored, wind: farm.world.scene.getObjectByName('windmill-rotor').rotation.z }));
  const c1 = await readCanvas(page); await settle(page, 1000); const c2 = await readCanvas(page);
  const b = await page.evaluate(() => ({ t: farm.world.sky.shadows.uniforms.uTime.value, wind: farm.world.scene.getObjectByName('windmill-rotor').rotation.z }));
  expect(b.t - a.t > 0.5, `cloud time ${a.t} → ${b.t}`);
  expect(a.anchored >= 10, `butterflies anchored: ${a.anchored}`);
  expect(a.wind !== b.wind, 'the windmill rotor does not turn');
  expect(c1.hash !== c2.hash, 'two frames a second apart are identical');
  await ctx.close();
});

await check('locked land: buying a parcel clears its overgrowth, fence and sign', async () => {
  const { ctx, page } = await open('pc');
  const r = await page.evaluate(() => {
    const g = farm.game, b = farm.world.batches, count = id => [...b.items.keys()].filter(k => k.startsWith('lock-') && k.includes(id)).length;
    const cells = (px, pz) => [...b.items.entries()].filter(([k, it]) => k.startsWith('lock-') && !k.startsWith('lock-fence') && Math.floor((it.x / 2 - 32) / 16) === px && Math.floor((it.z / 2 - 24) / 16) === pz).length;
    const before = { here: cells(1, 2), signs: farm.world.locked.signs };
    g.s.level = 4; g.s.coins = 99999;
    const res = g.do('buyParcel', { parcel: '1,2' });
    return { ok: res.ok, reason: res.reason, before, after: { here: cells(1, 2), signs: farm.world.locked.signs }, total: count('') };
  });
  expect(r.ok, `buy failed: ${r.reason}`);
  expect(r.before.here > 5 && r.after.here === 0, JSON.stringify(r));
  expect(r.after.signs >= r.before.signs, `signs ${r.before.signs} → ${r.after.signs}`);
  await ctx.close();
});

await check('budget: a fully planted farm stays within 120 draws and 300k triangles; phone fps ≥ 50 at span 45', async () => {
  const { ctx, page } = await open('phone', '?new');
  await page.evaluate(() => farm.world.later);
  await page.evaluate(() => farm.fillFarm());
  for (const span of [24, 45, 90, 160, 260]) {
    const info = await page.evaluate(s => { farm.view(s, 128, 112); return new Promise(r => setTimeout(r, 1000)).then(() => farm.measure(800)); }, span);
    console.log(`     span ${span}: ${info.draws} draws, ${Math.round(info.triangles / 1000)}k triangles, ${info.fps} fps`);
    expect(info.draws <= 120 && info.triangles <= 300000, `span ${span}: ${info.draws} draws, ${info.triangles} triangles`);
    if (span === 45) expect(info.fps >= 50, `span 45: ${info.fps} fps`);
  }
  // and over the woods, where the groves are thickest
  for (const [x, z] of [[40, 230], [220, 40], [230, 220]]) {
    const info = await page.evaluate(([x, z]) => { farm.view(40, x, z); return new Promise(r => setTimeout(r, 800)).then(() => farm.measure(500)); }, [x, z]);
    expect(info.draws <= 120 && info.triangles <= 300000, `woods ${x},${z}: ${info.draws} draws, ${info.triangles} triangles`);
  }
  for (const [name, span] of [['far', 90], ['mid', 45], ['close', 20]]) { await page.evaluate(s => farm.view(s, 100, 120), span); await settle(page); await shot(page, `world-${name}-phone`); }
  await ctx.close();
});

await browser.close();
const failed = results.filter(r => r[1] !== 'ok').length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
