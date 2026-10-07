// Art package browser checks (AAA pass). Run after `npm run build:test` with dist served (GAME_URL, default
// http://127.0.0.1:5241/). Screenshots go to ART_SHOTS (default test-results/art/): art-crops-10/50/100.png.
//   - the late kits (town, nature, props, decor) load after the first frame with no errors
//   - crop close-ups on a phone: a 6-bed row per crop at 10 %, 50 % and 100 % growth, drawn with cropLook()
//   - a fully planted farm drawn with cropLook() stays within the phone budgets at every zoom
//   - fences get joint posts, the feed mill gets sails, beds get rims, cottages get dressing
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { cropLook, ANCHORS } from '../src/view/kinds.mjs';

const URL_ = process.env.GAME_URL ?? 'http://127.0.0.1:5241/', SHOTS = process.env.ART_SHOTS ?? 'test-results/art';
mkdirSync(SHOTS, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: process.env.GPU === '0' ? ['--enable-unsafe-swiftshader'] : ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true };
let failed = 0;
async function check(name, f) {
  try { await f(); console.log(`ok   ${name}`); } catch (e) { failed++; console.log(`FAIL ${name}\n     ${e.message}`); }
}
const expect = (c, m) => { if (!c) throw new Error(m); };
async function open(query = '?new') {
  const ctx = await browser.newContext(PHONE), page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/favicon|GPU stall|ReadPixels/.test(m.text())) errors.push(m.text()); });
  await page.goto(URL_ + query); await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
  await page.evaluate(() => farm.skipIntro());
  return { ctx, page, errors };
}
const lateLoaded = page => page.waitForFunction(() => ['cottage_house_gable', 'tree', 'scarecrow', 'scaffold', 'apple_tree'].every(m => farm.world.batches.has(m)), null, { timeout: 30000 });
const closeModals = page => page.evaluate(() => { for (let i = 0; i < 8; i++) document.querySelector('.modal [data-close]')?.click(); });
/** Draw every planted bed with cropLook (the cast package's hook does this in life-view). */
const applyLooks = (page, looks) => page.evaluate(looks => {
  const s = farm.game.s, b = farm.world.batches, grow = { wheat: 120e3, carrot: 300e3, corn: 900e3, pumpkin: 3600e3 }, now = farm.game.now;
  farm.radial.life.update = () => {};   // keep life-view from redrawing with its v0.1 stages during the check
  for (const [id, q] of Object.entries(s.placed)) if (q.kind === 'bed' && s.beds[id]) {
    const bd = s.beds[id], pr = Math.min(1, Math.max(0, 1 - (bd.doneAt - now) / grow[bd.crop])), [model, scale] = looks[bd.crop][Math.round(pr * 20)];
    b.set(`crop:${id}`, { model, x: (q.x + .5) * 2, z: (q.z + .5) * 2, rot: ((q.x * 7 + q.z * 13) % 4) * Math.PI / 2, scale });
  }
}, looks);
const LOOKS = Object.fromEntries(['wheat', 'carrot', 'corn', 'pumpkin'].map(c => [c, Array.from({ length: 21 }, (_, k) => cropLook(c, k / 20))]));

await check('late kits load after the first frame with no errors', async () => {
  const { ctx, page, errors } = await open();
  await lateLoaded(page);
  expect(!errors.length, errors.join(' | '));
  await ctx.close();
});

await check('crop close-ups: seedlings, leafy plants and ripe crops stay inside their beds (art-crops-*.png)', async () => {
  const { ctx, page, errors } = await open();
  await page.evaluate(() => {
    const g = farm.game, s = g.s; s.coins = 99999; s.level = 8;
    for (let z = 55; z <= 62; z++) for (let x = 32; x <= 40; x++) g.do('clear', { x, z });
    ['wheat', 'carrot', 'corn', 'pumpkin'].forEach((crop, r) => {
      for (let i = 0; i < 6; i++) g.do('place', { kind: 'bed', x: 33 + i, z: 56 + r });
      const ids = Object.entries(s.placed).filter(([, q]) => q.kind === 'bed' && q.z === 56 + r).map(([id]) => id);
      g.do('plant', { ids, crop });
    });
  });
  for (const pct of [10, 50, 100]) {
    await page.evaluate(pct => { const s = farm.game.s, grow = { wheat: 120e3, carrot: 300e3, corn: 900e3, pumpkin: 3600e3 }; for (const bd of Object.values(s.beds)) bd.doneAt = farm.game.now + grow[bd.crop] * (1 - pct / 100); }, pct);
    await applyLooks(page, LOOKS);
    const models = await page.evaluate(() => [...farm.world.batches.items].filter(([id]) => id.startsWith('crop:')).map(([, it]) => it.model));
    const stage = pct === 10 ? 'sprout' : pct === 50 ? 'mid' : 'ripe';
    expect(models.length === 24 && models.every(m => m.endsWith(`:${stage}`)), `${pct} %: ${[...new Set(models)]}`);
    // every crop model stays inside a 2 m bed (its footprint radius at most 1 m from the bed centre, corners included)
    const wide = await page.evaluate(() => [...new Set([...farm.world.batches.items.values()].filter(it => it.model.startsWith('crop:')).map(it => it.model))]
      .map(m => [m, farm.world.batches.models.get(m).geo.boundingBox]).filter(([, b]) => Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) > 0.95).map(([m]) => m));
    expect(!wide.length, `crops wider than their bed: ${wide}`);
    await page.evaluate(() => farm.focus(35.5, 57.5, 26)); await closeModals(page); await page.waitForTimeout(700);
    await page.screenshot({ path: `${SHOTS}/art-crops-${pct}.png` });
  }
  const rims = await page.evaluate(() => farm.world.scene.children.filter(o => o.userData.batch?.startsWith('rims|')).reduce((n, m) => n + (m.visible ? m.count : 0), 0));
  expect(rims >= 24, `${rims} bed rims drawn`);
  expect(!errors.length, errors.join(' | '));
  await ctx.close();
});

await check('a fully planted farm drawn with cropLook stays within the phone budgets at every zoom', async () => {
  const { ctx, page } = await open();
  const n = await page.evaluate(() => farm.fillFarm());
  expect(n > 2500, `${n} crops`);
  await page.waitForTimeout(1500);
  await applyLooks(page, LOOKS);
  for (const span of [40, 90, 220]) {
    const info = await page.evaluate(s => { farm.view(s, 128, 112); return new Promise(r => setTimeout(r, 1200)).then(() => farm.measure(800)); }, span);
    console.log(`     span ${span}: ${info.draws} draws, ${Math.round(info.triangles / 1000)}k triangles, ${info.fps} fps`);
    expect(info.draws <= 120 && info.triangles <= 300000, `span ${span}: ${info.draws} draws, ${info.triangles} triangles`);
  }
  await ctx.close();
});

await check('dressing: fence joints, mill sails, cottage dressing, scaffold on the project ruin', async () => {
  const { ctx, page, errors } = await open();
  await lateLoaded(page);
  const r = await page.evaluate(() => {
    const s = farm.game.s, put = (kind, x, z, rot = 0) => { const id = `p${s.nextId++}`; s.placed[id] = { kind, x, z, rot }; s.counts[kind] = (s.counts[kind] ?? 0) + 1; return id; };
    for (let x = 40; x <= 42; x++) s.fences[`${x},70,n`] = 'fence';
    for (let z = 70; z <= 71; z++) s.fences[`43,${z},w`] = 'fence';
    const mill = put('feed_mill', 34, 64), home = put('cottage', 40, 96); s.homes[home] = { level: 2, family: null, arrivesAt: 0, rentFrom: 0 };
    s.projects.step = 5;
    farm.game.emit({ ok: true, events: [{ type: 'loaded' }] }, 'test');
    const items = farm.world.batches.items;
    return { corner: items.get('j43,70')?.model, end: items.get('j40,70')?.model, sails: items.get(`sails:${mill}`), dress: [...items.keys()].filter(k => k.startsWith(`dress:${home}:`)).length, scaffold: items.get('scaffold:school')?.model };
  });
  expect(r.corner === 'fence:corner', `corner joint: ${r.corner}`);
  expect(r.end === 'fence:post', `end post: ${r.end}`);
  expect(r.sails && Math.abs(r.sails.y - ANCHORS.feed_mill.sails[0][1]) < 0.01, `sails: ${JSON.stringify(r.sails)}`);
  expect(r.dress >= 3, `${r.dress} dressing pieces on a furnished cottage`);
  expect(r.scaffold === 'scaffold', 'no scaffold on the school ruin');
  expect(!errors.length, errors.join(' | '));
  await ctx.close();
});

await browser.close();
console.log(failed ? `${failed} art check(s) failed` : 'all art checks passed');
process.exit(failed ? 1 : 0);
