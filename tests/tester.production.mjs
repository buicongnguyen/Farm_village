// Public-build acceptance for the tester's tools (docs/plan/00-tester-tools.md): a normal visit never sees them; with
// ?tester the tag and the Test section are there, coins and a chapter jump work through the real buttons, and the
// tools stay for the tab after the reload. No farm hook: the public build has none.
//   npm run build && node scripts/serve-dist.mjs 5244   then   GAME_URL=http://127.0.0.1:5244/ node tests/tester.production.mjs
import { chromium } from 'playwright';
import { newGame } from '../src/core/state.mjs';
import { tick } from '../src/core/act.mjs';
import { pack, unpack } from '../src/kit/save.mjs';
import { BEATS } from '../src/content/story.mjs';
const URL_ = process.env.GAME_URL ?? 'http://127.0.0.1:5241/';
const expect = (ok, why) => { if (!ok) throw Error(why); };
function fixture() {
  const now = Date.now(), s = newGame(now, 4242, { restore: true });
  tick(s, now);
  s.story.chapter = 1; s.story.tutorial = 999; s.story.beats = BEATS.filter(b => b.chapter <= 1).map(b => b.id);
  s.settings.daylight = 'always'; s.settings.reducedMotion = true; s.today.seen = true; s.today.claimed = true;
  return s;
}
const browser = await chromium.launch({ channel: 'chrome', headless: true,
  args: process.env.GPU === '0' ? ['--enable-unsafe-swiftshader'] : ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
let failures = 0;
async function visit(query, body) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  try {
    await context.addInitScript(save => {
      if (sessionStorage.getItem('tester-acceptance-seeded')) return;
      sessionStorage.setItem('tester-acceptance-seeded', '1'); localStorage.setItem('farm-village.language', 'en');
      localStorage.setItem('farm-village:profile', '1'); localStorage.setItem('farm-village:save:1', save);
    }, pack(fixture()));
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const enter = async () => {
      await page.locator('.main-menu [data-do="profile"][data-n="1"]').click();
      await page.locator('.hud [data-act="orders"]').waitFor({ state: 'visible', timeout: 60000 });
      expect(await page.evaluate(() => !window.farm), 'the public build exposes the debug hook');
    };
    const settings = async () => { await page.locator('.hud [data-act="settings"]').click(); await page.locator('.settings').waitFor({ state: 'visible' }); };
    const saved = async () => unpack(await page.evaluate(() => localStorage.getItem('farm-village:save:1')));
    await page.goto(URL_ + query); await enter();
    await body({ page, enter, settings, saved });
    expect(!errors.length, errors.join('\n'));
    console.log(`ok   ${query || '(no flag)'}`);
  } catch (e) { failures++; console.log(`FAIL ${query || '(no flag)'}\n     ${e.message}`); }
  finally { await context.close(); }
}
await visit('', async ({ page, settings }) => {
  expect(await page.locator('.tester-tag').count() === 0, 'a normal visit shows the tester tag');
  await settings();
  expect(await page.locator('.test-head, [data-do="test"]').count() === 0, 'a normal visit shows the Test section');
});
await visit('?tester', async ({ page, enter, settings, saved }) => {
  expect(await page.locator('.tester-tag').count() === 1, 'no tester tag');
  await settings();
  expect(await page.locator('.test-head').count() === 1, 'no Test section');
  expect(await page.locator('[data-test="hour"], [data-test="day"], [data-test="step"]').count() === 0, 'the clock tools are for test builds only');
  const jumps = await page.locator('.test-jump [data-test^="jump:"]').evaluateAll(list => list.map(b => [b.dataset.test, b.disabled]));
  expect(jumps.length >= 5 && jumps[0][0] === 'jump:2' && jumps[0][1] === true, `jump buttons: ${JSON.stringify(jumps)}`);   // the fixture has seen chapter 1
  const before = (await saved()).coins;
  await page.locator('[data-test="coins"]').click();
  // the jump saves the farm and opens it again
  await Promise.all([page.waitForEvent('load'), page.locator('[data-test="jump:6"]').click()]);
  await enter();
  const s = await saved();
  expect(s.story.chapter === 5, `chapter ${s.story.chapter} after the jump`); expect(s.coins >= before + 10000, `coins ${before} -> ${s.coins}`);
  expect((s.counts.school ?? 0) >= 1 && (s.counts.clinic ?? 0) >= 1, 'no school or clinic after the jump');
  expect(await page.locator('.tester-tag').count() === 1, 'the tools did not stay for the tab');
  await settings();
  expect(await page.locator('.test-jump [data-test="jump:6"]').isDisabled(), 'chapter 6 can still be jumped to');
});
await browser.close();
console.log(failures ? `\n${failures} failed` : '\nall passed');
process.exit(failures ? 1 : 0);
