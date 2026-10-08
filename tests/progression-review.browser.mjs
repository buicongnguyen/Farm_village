// Ordered story progression and modal queue lifecycle, including a family arriving before the first hens.
import { chromium } from 'playwright';
const URL_ = process.env.GAME_URL ?? 'http://127.0.0.1:5241/';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: process.env.GPU === '0' ? ['--enable-unsafe-swiftshader'] : ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const expect = (condition, message) => { if (!condition) throw Error(message); };
let failed = 0;
async function drain(page, seen) {
  for (let i = 0; i < 16; i++) {
    const count = await page.locator('.modal').count();
    expect(count <= 1, 'more than one modal is open');
    if (!count) return;
    if (await page.locator('.modal .chapter').count()) {
      const label = await page.locator('.modal .chapter > small').textContent();
      seen.push(Number(label.match(/\d+/)?.[0]));
    }
    await page.locator('.modal [data-close]').last().click();
    await page.waitForTimeout(40);
  }
  throw Error('modal queue did not finish');
}
for (const lang of ['en', 'vi']) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage(), errors = [], seen = [];
  page.on('pageerror', e => errors.push(e.message));
  try {
    await ctx.addInitScript(lang => localStorage.setItem('farm-village.language', lang), lang);
    await page.goto(URL_ + '?new&restore');
    await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
    await page.waitForSelector('.modal .chapter');
    await page.evaluate(() => {
      window.__progressionMaxModals = document.querySelectorAll('.modal').length;
      new MutationObserver(() => { window.__progressionMaxModals = Math.max(window.__progressionMaxModals, document.querySelectorAll('.modal').length); }).observe(document.querySelector('#app'), { childList: true });
      const s = farm.state(), home = Object.keys(s.homes)[0];
      s.story.tutorial = 99; s.settings.daylight = 'always'; s.settings.reducedMotion = true;
      s.projects.step = 3; s.animals = {};
      s.homes[home] = { level: 0, family: 'tran', arrivesAt: 0, rentFrom: 0, arrived: true };
      delete s.cond[home];
      farm.game.emit({ ok: true, events: [{ type: 'loaded' }] }, 'test');
    });
    await drain(page, seen);
    expect(seen.join(',') === '1', 'the first family skipped the hens chapter: ' + seen);
    expect(await page.evaluate(() => farm.state().story.chapter) === 1, 'chapter three was acknowledged too early');
    await page.evaluate(() => {
      const s = farm.state(), coop = Object.keys(s.placed).find(id => s.placed[id].kind === 'coop');
      if (!coop) throw Error('story fixture has no coop');
      delete s.cond[coop];
      s.animals[coop] = [{ kind: 'hen', doneAt: null }];
      farm.game.emit({ ok: true, events: [] }, 'test');
    });
    await page.waitForSelector('.modal .chapter');
    await drain(page, seen);
    expect(seen.join(',') === '1,2,3', 'chapters two and three were not ordered: ' + seen);
    await page.evaluate(() => {
      const s = farm.state(); s.counts.school = 1;
      s.placed.story_clinic = { kind: 'clinic', x: 62, z: 106, rot: 2 }; s.counts.clinic = 1;
      for (const [i, family] of ['okafor', 'lindqvist', 'reyes'].entries()) s.homes['story_family' + i] = { level: 0, family, arrivesAt: 0, rentFrom: 0, arrived: true };
      farm.game.emit({ ok: true, events: [{ type: 'loaded' }] }, 'test');
    });
    await page.waitForSelector('.modal .chapter');
    await drain(page, seen);
    expect(seen.join(',') === '1,2,3,4,5', 'later chapters were not ordered: ' + seen);
    expect(await page.evaluate(() => farm.state().story.chapter === 5 && farm.state().story.beats?.includes('clinic-home')), 'clinic ending or follow-up did not finish');
    expect(await page.evaluate(() => window.__progressionMaxModals) === 1, 'modal callbacks opened overlapping cards');
    await page.evaluate(() => farm.closeCards());
    expect(await page.locator('.modal').count() === 0, 'an overlay remained after closing all cards');
    expect(!errors.length, errors.join(' | '));
    console.log('ok   ordered chapters and one modal at a time (' + lang + ')');
  } catch (e) { failed++; console.log('FAIL ordered chapters (' + lang + ')\n     ' + e.stack); }
  finally { await ctx.close(); }
}
await browser.close();
process.exit(failed ? 1 : 0);
