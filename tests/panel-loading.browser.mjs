// Deferred sheets must survive navigation, network failures and a refused save without dropping current work.
import { chromium } from 'playwright';
import { newGame } from '../src/core/state.mjs';
import { pack } from '../src/kit/save.mjs';
import { VI } from '../src/i18n/vi.mjs';

const URL_ = process.env.GAME_URL ?? 'http://127.0.0.1:5241/';
const expect = (ok, message) => { if (!ok) throw Error(message); };
const tr = (lang, text) => lang === 'vi' ? VI[text] ?? text : text;
const browser = await chromium.launch({ channel: 'chrome', headless: true,
  args: process.env.GPU === '0' ? ['--enable-unsafe-swiftshader'] : ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
let failed = 0, checks = 0;

async function ready(page) {
  await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
  await page.evaluate(() => { clearInterval(farm.game.timer); farm.skipIntro(); farm.closeCards(); farm.panels.close(); });
}
async function run(name, lang, fn) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  checks++;
  try {
    const s = newGame(Date.now(), 90821, { restore: true });
    s.story.chapter = 5; s.story.tutorial = 999; s.today.seen = true; s.today.claimed = true;
    s.settings.reducedMotion = true; s.settings.daylight = 'always';
    await context.addInitScript(({ save, lang }) => {
      localStorage.setItem('farm-village.language', lang);
      if (!sessionStorage.getItem('panel-loading-seeded')) {
        sessionStorage.setItem('panel-loading-seeded', '1');
        localStorage.setItem('farm-village:profile', '1'); localStorage.setItem('farm-village:save:1', save);
      }
    }, { save: pack(s), lang });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(URL_); await ready(page);
    expect(await page.evaluate(() => !farm.panels.renderer), 'fixture loaded sheets before the test');
    await fn(page);
    expect(!errors.length, errors.join('\n'));
    console.log(`ok   ${name} (${lang})`);
  } catch (error) { failed++; console.log(`FAIL ${name} (${lang})\n     ${error.stack}`); }
  finally { await context.close(); }
}

for (const lang of ['en', 'vi']) {
  await run('slow sheet loading respects close and keeps Settings controls stable', lang, async page => {
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    await page.route('**/assets/*.js*', async route => {
      const response = await route.fetch(), body = await response.text();
      if (body.includes('data-tray=')) await gate;
      await route.fulfill({ response, body });
    });
    await page.evaluate(() => farm.panels.show('settings'));
    await page.getByRole('heading', { name: tr(lang, 'Opening…'), exact: true }).waitFor();
    await page.locator('.panel [data-do="close"]').click();
    release();
    await page.waitForFunction(() => !!farm.panels.renderer);
    expect(await page.evaluate(() => !farm.panels.open && farm.panels.el.hidden), 'late sheet download reopened a closed sheet');
    await page.evaluate(() => farm.panels.show('settings'));
    const sound = page.locator('.panel input[data-range="sound"]');
    await sound.waitFor();
    await sound.evaluate(el => { el.dataset.stableControl = 'yes'; });
    await page.waitForTimeout(1200);
    expect(await sound.getAttribute('data-stable-control') === 'yes', 'Settings timer replaced the slider');
    await sound.evaluate(el => { el.value = '35'; el.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(await page.evaluate(() => farm.state().settings.sound === .35), 'Settings slider stopped committing');
    expect(await page.locator('.panel').evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'lazy sheet overflows the phone');
  });

  for (const failure of ['entry', 'dependency']) await run(`failed ${failure} saves before reopening, and refuses a failed save`, lang, async page => {
    let injected = false;
    await page.route('**/assets/*.js*', async route => {
      if (route.request().url().includes('panel-test-dependency.js')) { await route.abort('failed'); return; }
      const response = await route.fetch(), body = await response.text();
      if (!injected && body.includes('data-tray=')) {
        injected = true;
        if (failure === 'entry') { await route.abort('failed'); return; }
        await route.fulfill({ response, body: `import './panel-test-dependency.js';\n${body}` }); return;
      }
      await route.fulfill({ response, body });
    });
    await page.evaluate(() => farm.panels.show('settings'));
    const retry = page.locator('.panel [data-do="retryPanel"]'); await retry.waitFor();
    expect(await retry.innerText() === tr(lang, 'Save and reopen'), 'recovery action is unclear');
    let navigations = 0; page.on('framenavigated', frame => { if (frame === page.mainFrame()) navigations++; });
    await page.evaluate(() => {
      window.panelTestSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (key === 'farm-village:save:1') throw new DOMException('Test quota', 'QuotaExceededError');
        return window.panelTestSetItem.call(this, key, value);
      };
      farm.game.do('setting', { key: 'playerName', value: 'KeepMe' });
    });
    await retry.click();
    await page.waitForTimeout(150);
    expect(navigations === 0, 'recovery navigated after storage refused the current farm');
    expect(await page.evaluate(() => farm.state().settings.playerName === 'KeepMe'), 'failed save discarded the open farm');
    await page.evaluate(() => {
      Storage.prototype.setItem = window.panelTestSetItem;
      // Another tab may have changed the menu selection. Recovery must retain the farm this tab was editing.
      localStorage.setItem('farm-village:profile', '2');
    });
    await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), retry.click()]);
    await ready(page);
    expect(await page.evaluate(() => farm.state().settings.playerName === 'KeepMe'), 'reopen lost the latest change');
    expect(await page.evaluate(() => localStorage.getItem('farm-village:profile') === '1'), 'reopen followed another tab into a different farm');
    await page.evaluate(() => farm.panels.show('settings'));
    await page.locator('.panel input[data-range="sound"]').waitFor();
    expect(navigations === 1, 'recovery navigated more than once');
  });
}
await browser.close();
console.log(`${checks - failed}/${checks} panel loading checks passed.`);
if (failed) process.exitCode = 1;
