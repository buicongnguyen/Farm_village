// Browser suite. Builds nothing itself: run `npm run build:test`, serve dist (node scripts/serve-dist.mjs 5241),
// then `npm run test:browser`. GAME_URL overrides the address; GPU=0 uses the software renderer.
// Each check is a function; the suite grows with the milestones.
import { chromium } from 'playwright';
const URL_ = process.env.GAME_URL ?? 'http://127.0.0.1:5241/';
const gpu = process.env.GPU !== '0';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: gpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] : ['--enable-unsafe-swiftshader'] });
const DEVICES = {
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  landscape: { viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  pc: { viewport: { width: 1280, height: 800 } },
};
const results = [];
async function open(device = 'pc', query = '') {
  const ctx = await browser.newContext(DEVICES[device]), page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push(m.text()); });
  await page.goto(URL_ + query);
  await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
  return { ctx, page, errors };
}
async function check(name, f) {
  const t0 = Date.now();
  try { await f(); results.push([name, 'ok', Date.now() - t0]); console.log(`ok   ${name}`); }
  catch (e) { results.push([name, 'FAIL', Date.now() - t0, e.message]); console.log(`FAIL ${name}\n     ${e.message}`); }
}
const expect = (cond, msg) => { if (!cond) throw new Error(msg); };

// ── Checks ──
for (const device of Object.keys(DEVICES)) await check(`boots on ${device} with no errors`, async () => {
  const { ctx, page, errors } = await open(device);
  expect(await page.locator('canvas').count() === 1, 'no canvas');
  const info = await page.evaluate(() => farm.measure(1000));
  expect(info.draws > 0 && info.triangles > 0, `nothing drawn: ${JSON.stringify(info)}`);
  expect(!errors.length, errors.join('\n'));
  await ctx.close();
});
await check('stays within the phone budgets at every zoom', async () => {
  const { ctx, page } = await open('phone');
  for (const span of [40, 90, 220]) {
    const info = await page.evaluate(s => { farm.view(s); return farm.measure(800); }, span);
    expect(info.draws <= 120 && info.triangles <= 300000, `span ${span}: ${info.draws} draws, ${info.triangles} triangles`);
  }
  await ctx.close();
});
await check('Vietnamese switch changes the HUD', async () => {
  const { ctx, page } = await open('pc');
  await page.click('[data-act="lang"]');
  const title = await page.textContent('.hud-title');
  expect(title.includes('Làng'), `title is "${title}"`);
  await ctx.close();
});

await browser.close();
const failed = results.filter(r => r[1] !== 'ok');
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
