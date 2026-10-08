// Matching screenshots for look passes (art lane tool). Same camera, same game clock, same state for every run, so a
// before and an after can be compared side by side.
//   node art/shots.mjs <outDir> [url]        (default url http://127.0.0.1:5242/, a test build: npm run build:test)
// Writes <outDir>/<scene>-<day|dusk>-<phone|pc>.png for the home farm, the orchard and the clinic, with the interface
// hidden, plus <scene>-ui-phone.png with it shown.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const out = process.argv[2] ?? 'shots', url = process.argv[3] ?? 'http://127.0.0.1:5242/', only = process.argv[4] ? new RegExp(process.argv[4]) : null;   // e.g. 'home-dusk-phone'
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const DEVICES = { phone: { viewport: { width: 390, height: 760 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, pc: { viewport: { width: 1280, height: 720 } } };
// [scene, x, z, span]
const SCENES = [['home', 38, 62, 26], ['orchard', 44, 70, 22], ['clinic', 63, 106, 24]];
const HOURS = { day: 12, dusk: 18.5 };

for (const [device, opts] of Object.entries(DEVICES)) {
  const ctx = await browser.newContext(opts), page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${url}?new&restore`);
  await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
  await page.evaluate(() => farm.skipIntro());
  // the same state every time: a ripe farm, an orchard of ripe trees and a fruit stand, the clinic open
  await page.evaluate(() => {
    const g = farm.game, s = g.s; s.level = 8; s.coins = 50000; s.settings.daylight = 'real';
    g.do('testUnlockAll'); for (const id of Object.keys(s.cond)) delete s.cond[id];
    for (const id of Object.keys(s.beds)) s.beds[id].doneAt = g.now - 1;
    const put = (kind, x, z, rot = 0) => g.do('place', { kind, x, z, rot });
    for (let z = 69; z <= 71; z++) for (let x = 40; x <= 47; x += 2) put(['cherry_tree', 'apple_tree', 'peach_tree'][(x + z) % 3], x, z);
    put('fruit_stand', 48, 66, 2);
    s.placed.pclinic = { kind: 'clinic', x: 62, z: 106, rot: 2 }; s.counts.clinic = 1;   // the clinic open, without playing its project
    for (const id of Object.keys(s.trees ?? {})) s.trees[id].doneAt = g.now - 1;
    g.tick(); farm.land.sync();
  });
  await page.waitForFunction(() => farm.world.batches.has('cute_cherry') || farm.world.batches.has('cherry_tree') || true, null, { timeout: 5000 });
  await page.waitForTimeout(4000);
  for (const [dayName, hour] of Object.entries(HOURS)) {
    await page.evaluate(h => {
      const d = new Date(), want = h * 3600e3, have = (d.getHours() * 60 + d.getMinutes()) * 60e3;
      farm.setClockOffset(want - have);                                   // the game clock reads `h` o'clock, whatever the real time
      farm.closeCards(); document.querySelectorAll('.toast, .bubble').forEach(e => e.remove());
      farm.people?.walkers.forEach(w => { w.indoors = true; });
      document.body.classList.remove('reduced-motion');
    }, hour);
    for (const [scene, x, z, span] of SCENES) {
      await page.evaluate(([x, z, span]) => { farm.focus(x, z, span); document.querySelectorAll('.hud, .next-chip, .guide, .bubbles').forEach(e => { e.style.visibility = 'hidden'; }); }, [x, z, span]);
      if (only && !only.test(`${scene}-${dayName}-${device}`)) continue;
      await page.waitForTimeout(3500);                                    // the light follows the clock at its next refresh
      await page.screenshot({ path: `${out}/${scene}-${dayName}-${device}.png` });
      if (device === 'phone' && dayName === 'day' && (!only || only.test(`${scene}-ui-phone`))) {
        await page.evaluate(() => document.querySelectorAll('.hud, .next-chip').forEach(e => { e.style.visibility = ''; }));
        await page.waitForTimeout(300);
        await page.screenshot({ path: `${out}/${scene}-ui-phone.png` });
      }
    }
  }
  if (errors.length) console.log(`${device}: page errors`, errors.slice(0, 3));
  await ctx.close();
}
await browser.close();
console.log('shots written to', out);
