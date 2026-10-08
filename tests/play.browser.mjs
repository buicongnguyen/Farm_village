// Play package browser checks: the new rules (bonds, the weekly cart, fruit trees, decorations, the streak garden and the
// test-mode helpers) run in the real game without page errors, survive a reload and keep the draw budget.
// npm run build:test; node scripts/serve-dist.mjs 5276; GAME_URL=http://127.0.0.1:5276/ node tests/play.browser.mjs
// SHOTS=<dir> also saves screenshots there.
import { SAVE_VERSION } from '../src/core/state.mjs';
import { chromium } from 'playwright';
const URL_ = process.env.GAME_URL ?? 'http://127.0.0.1:5241/', SHOTS = process.env.SHOTS;
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const results = [];
async function open(query = '') {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }), page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push(m.text()); });
  await page.goto(URL_ + query);
  await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
  await page.evaluate(() => farm.skipIntro());
  return { ctx, page, errors };
}
async function check(name, f) {
  try { await f(); results.push([name, 'ok']); console.log(`ok   ${name}`); }
  catch (e) { results.push([name, 'FAIL', e.message]); console.log(`FAIL ${name}\n     ${e.message}`); }
}
const expect = (cond, msg) => { if (!cond) throw new Error(msg); };
const shot = (page, name) => SHOTS ? page.screenshot({ path: `${SHOTS}/${name}.png` }) : null;

await check('play: test helpers, fruit trees, gifts, wishes, the cart and the streak garden in the real game', async () => {
  const { ctx, page, errors } = await open();
  const out = await page.evaluate(() => {
    const g = farm.game, r = {}, ok = (a, p) => { const x = g.do(a, p); if (!x.ok) throw new Error(`${a}: ${x.reason}`); return x; };
    for (let x = 30; x <= 47; x++) g.do('place', { kind: 'path', x, z: 63 });
    g.s.coins += 5000; const cells = []; for (let z = 56; z <= 71; z++) for (let x = 32; x <= 47; x++) cells.push([x, z]); g.do('clear', { cells });
    ok('testUnlockAll', {}); ok('testAddFamily', {}); ok('testAddFamily', {});
    g.s.firsts['project:school'] = g.now - 86_400_000; g.tick();
    r.cart = !!g.s.cart && g.s.cart.crates.length;
    // fruit trees by the farm and decorations by the cottages
    r.tree = ok('place', { kind: 'apple_tree', x: 40, z: 66 }).id; ok('place', { kind: 'peach_tree', x: 41, z: 66 });
    const home = Object.keys(g.s.homes)[0], p = g.s.placed[home];
    for (const [kind, dx, dz] of [['fountain', 0, 3], ['street_lamp', 2, 3], ['scarecrow', 0, 5], ['hay_bale', 1, 5], ['picket', 2, 5], ['flowerpot', 0, 6]]) ok('place', { kind, x: p.x + dx, z: p.z + dz });
    ok('testFinishTimers', {}); r.picked = ok('pick', {}).picked;
    // a gift, and today's wish granted by placing what they wish for beside their door
    g.s.barn.items.bread = 20; r.gift = ok('gift', { person: 'lan', good: 'bread' }).liked;
    const w = g.s.wishes.list[0];
    if (w) { const q = g.s.placed[w.home]; for (let dz = 5; dz >= 0 && !w.done; dz--) for (let dx = -3; dx <= 5 && !w.done; dx++) g.do('place', { kind: w.kind, x: q.x + dx, z: q.z + dz }); r.wish = w.done; }
    // fill and send the cart
    g.s.barn.cap = 5000; for (const c of g.s.cart.crates) g.s.barn.items[c.good] = (g.s.barn.items[c.good] ?? 0) + c.n;
    g.s.cart.crates.forEach((c, i) => { if (!c.filled) ok('fillCrate', { crate: i }); });
    r.sent = ok('sendCart', {}).coins;
    r.flowers = Object.values(g.s.placed).filter(q => q.kind === 'garden_flower').length;
    r.charm = g.s.village.milestones;
    window.__fvSave?.();
    return r;
  });
  expect(out.cart === 6, `cart: ${out.cart}`); expect(out.picked === 2, `picked ${out.picked}`); expect(out.gift === true, 'Lan likes bread');
  expect(out.wish !== false, 'the wish was not granted'); expect(out.sent > 0, 'cart not sent'); expect(out.flowers >= 1, 'no garden flower');
  await page.evaluate(() => { farm.skipIntro(); farm.focus(36, 96, 30); }); await page.waitForTimeout(500); await shot(page, 'play-village');
  // a day later: one more garden flower, a new cart and new wishes, all kept after a reload
  await page.evaluate(() => farm.setClockOffset(86_400_000)); await page.waitForTimeout(300);
  const day2 = await page.evaluate(() => ({ flowers: Object.values(farm.state().placed).filter(q => q.kind === 'garden_flower').length, cart: farm.state().cart.n }));
  expect(day2.flowers === out.flowers + 1, `garden ${out.flowers} → ${day2.flowers}`); expect(day2.cart === 2, `cart ${day2.cart}`);
  await page.evaluate(() => window.__fvSave?.());
  await page.reload(); await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
  const back = await page.evaluate(() => ({ v: farm.state().version, trees: Object.keys(farm.state().trees).length, cart: farm.state().cart?.n, flowers: Object.values(farm.state().placed).filter(q => q.kind === 'garden_flower').length }));
  expect(back.v === SAVE_VERSION && back.trees === 2 && back.cart === 2 && back.flowers === day2.flowers, `after reload: ${JSON.stringify(back)}`);
  await page.evaluate(() => { farm.skipIntro(); farm.focus(24, 58, 36); }); await page.waitForTimeout(500); await shot(page, 'play-homestead');
  const info = await page.evaluate(() => farm.measure(800));
  expect(info.draws <= 120 && info.triangles <= 300000, `budget: ${info.draws} draws, ${info.triangles} triangles`);
  expect(!errors.length, errors.join('\n'));
  await ctx.close();
});

await browser.close();
const failed = results.filter(r => r[1] !== 'ok');
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
