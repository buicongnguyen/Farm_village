// Browser checks for notices (ui/hud.mjs toast + feed, Today's Recent list, the Project and Letters pills): notices sit in
// one centred lane and are easy to read; one that leads somewhere opens it on a tap; missed ones wait in Today.
// Run after `npm run build:test` with dist served (GAME_URL, default http://127.0.0.1:5241/). SHOTS=<dir> keeps screenshots.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const URL_ = process.env.GAME_URL ?? 'http://127.0.0.1:5241/', SHOTS = process.env.SHOTS; if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: process.env.GPU === '0' ? ['--enable-unsafe-swiftshader'] : ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const results = [], expect = (ok, msg) => { if (!ok) throw Error(msg); };
async function check(name, f) { try { await f(); results.push(1); console.log(`ok   ${name}`); } catch (e) { results.push(0); console.log(`FAIL ${name}\n     ${e.message}`); } }
async function open(viewport, lang = 'en') {
  const ctx = await browser.newContext({ viewport, ...(viewport.width < 600 ? { deviceScaleFactor: 2, isMobile: true, hasTouch: true } : {}) });
  if (lang !== 'en') await ctx.addInitScript(lang => localStorage.setItem('farm-village.language', lang), lang);
  const page = await ctx.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${URL_}?new&restore`);
  await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
  await page.evaluate(() => { farm.game.s.settings.daylight = 'always'; farm.skipIntro(); farm.closeCards?.(); });
  await page.waitForTimeout(2000);
  await page.evaluate(() => { farm.closeCards?.(); farm.panels.close(); farm.hud.el.querySelector('.toasts').replaceChildren(); farm.hud.feed = []; });
  return { ctx, page, errors };
}
const panel = page => page.evaluate(() => document.querySelector('.panel:not([hidden])')?.dataset.kind ?? null);

for (const [name, viewport, lang] of [['phone', { width: 390, height: 844 }, 'en'], ['desktop', { width: 1280, height: 800 }, 'vi']]) {
  await check(`notices are big, centred and tappable; the Recent list keeps them (${name}, ${lang})`, async () => {
    const { ctx, page, errors } = await open(viewport, lang);
    expect(await page.locator('.hud .round[data-act="projects"], .hud .round[data-act="mail"]').count() === 0, 'the Projects and Mailbox round buttons are still on the HUD');
    // a real event: a letter arrives
    await page.evaluate(() => { const s = farm.state(); s.mail.unshift({ id: 'ada-1', from: 'ada', at: farm.game.now, read: false }); farm.game.emit({ ok: true, events: [{ type: 'letter', id: 'ada-1', from: 'ada' }] }, 'tick'); });
    const toast = page.locator('.hud .toast.tappable').first(); await toast.waitFor({ timeout: 4000 });
    const box = await toast.boundingBox(), size = await toast.evaluate(el => parseFloat(getComputedStyle(el).fontSize));
    expect(size >= 14, `notice text is ${size}px`);
    expect(Math.abs(box.x + box.width / 2 - viewport.width / 2) < 12, `the notice is not centred: ${JSON.stringify(box)}`);
    expect(box.y > viewport.height * .45 && box.y + box.height < viewport.height - 100, `the notice is not in the lower middle: ${JSON.stringify(box)}`);
    expect(await toast.locator('.go').count() === 1, 'a notice that leads somewhere shows no chevron');
    expect(await page.locator('.hud [data-status="mail"]').isVisible(), 'unread letters show no pill beside Goals');
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/notices-${name}.png` });
    await toast.click();
    expect(await panel(page) === 'mail', `tapping the letter notice opened ${await panel(page)}`);
    await page.evaluate(() => farm.panels.close());
    // other notices, then the Recent list in Today
    await page.evaluate(() => { farm.hud.toast('The truck is back with 84 coins', 'good', { icon: 'market', to: 'market' }); farm.hud.toast('Saved', 'info'); });
    await page.evaluate(() => farm.panels.show('today'));
    const rows = page.locator('.panel[data-kind="today"] .recent-row'); await rows.first().waitFor({ timeout: 4000 });
    expect(await rows.count() === 3, `Recent lists ${await rows.count()} notices`);
    expect(await rows.nth(0).isDisabled() && await rows.nth(1).isEnabled(), 'a notice with nowhere to go is tappable, or one with a place is not');
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/notices-today-${name}.png` });
    await rows.nth(1).click();
    expect(await panel(page) === 'market', `tapping a Recent row opened ${await panel(page)}`);
    await page.evaluate(() => farm.panels.close());
    // the pills open their panels
    await page.locator('.hud [data-status="mail"]').click();
    expect(await panel(page) === 'mail', 'the Letters pill did not open the mailbox');
    await page.evaluate(() => farm.panels.close());
    if (await page.locator('.hud [data-status="projects"]').count()) { await page.locator('.hud [data-status="projects"]').click(); expect(await panel(page) === 'projects', 'the Project pill did not open the projects'); }
    expect(!errors.length, errors.join(' | ')); await ctx.close();
  });
}

await check('the feed keeps the last 20 notices and merges repeats', async () => {
  const { ctx, page, errors } = await open({ width: 1280, height: 800 });
  const n = await page.evaluate(() => { for (let i = 0; i < 30; i++) farm.hud.toast(`Notice ${i}`, 'info'); farm.hud.toast('Notice 29', 'info'); return { len: farm.hud.feed.length, top: farm.hud.feed[0].text, shown: document.querySelectorAll('.hud .toast:not(.gone)').length }; });
  expect(n.len === 20 && n.top === 'Notice 29' && n.shown <= 2, JSON.stringify(n));
  expect(!errors.length, errors.join(' | ')); await ctx.close();
});

await browser.close();
const failed = results.filter(r => !r).length;
console.log(`\n${results.length - failed}/${results.length} notice checks passed`);
process.exit(failed ? 1 : 0);
