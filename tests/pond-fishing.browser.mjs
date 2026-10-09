// Fishing is visible and playable through real canvas taps and sheet controls. Clock control makes timing deterministic.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { REEL_TIMING, pick as fishFor } from '../src/core/fishing.mjs';

const URL_ = process.env.GAME_URL ?? 'http://127.0.0.1:5241/', shots = process.env.SHOTS;
if (shots) mkdirSync(shots, { recursive: true });
const expect = (ok, message) => { if (!ok) throw Error(message); };
const sheet = page => page.locator('.panel[data-kind="pond"]:not([hidden])');
const resources = page => page.evaluate(() => JSON.stringify({ coins: farm.state().coins, barn: farm.state().barn,
  caught: farm.state().fishing.caught, album: farm.state().album, discoveries: farm.state().discoveries, fished: farm.state().stats.fished }));
async function arrive(page, id) {
  return page.evaluate(id => {
    const p = farm.people, w = p.walkers.get(id), update = w.player ? 'livePlayer' : w.family ? 'liveFamily' : 'liveVillager';
    w.once = null;
    for (let n = 0; n < 2400; n++) {
      p.time += .1; p[update](w, .1, false);
      if (w.clipFor === 'Sit' && !w.route.length && !w.goal && !w.target && !w.todo) {
        w.wait = 9999; w.subject.x = w.x; w.subject.z = w.z; w.subject.rot = w.rot;
        return { spot: w.fishSpot, x: w.x, z: w.z };
      }
    }
    throw Error(id + ' never reached its fishing place');
  }, id);
}
async function setClock(page, now) {
  await page.evaluate(now => { window.__pondNow = now; farm.game.clock = () => window.__pondNow; farm.game.tick(); farm.panels.render(); }, now);
}
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: process.env.GPU === '0'
  ? ['--enable-unsafe-swiftshader'] : ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
let failed = 0;
try {
  for (const [lang, width] of [['en', 390], ['vi', 390], ['ko', 1280], ['ja', 1280]]) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: width < 500, hasTouch: width < 500 });
    try {
      await context.addInitScript(lang => localStorage.setItem('farm-village.language', lang), lang);
      const page = await context.newPage(), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push(m.text()); });
      const tap = async point => width < 500 ? page.touchscreen.tap(point.x, point.y) : page.mouse.click(point.x, point.y);
      await page.goto(URL_ + '?new&restore');
      await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
      await page.waitForFunction(() => ['you', 'june', 'ada', 'pip'].every(id => farm.people.walkers.has(id)));
      await page.evaluate(() => {
        farm.skipIntro(); farm.closeCards(); const p = farm.people, g = farm.game;
        clearInterval(g.timer); g.timer = 0; window.__pondNow = g.now; g.clock = () => window.__pondNow;
        g.s.settings.daylight = 'always'; g.s.settings.reducedMotion = false; g.do('setting', { key: 'textSize', value: 1.3 });
        for (const w of p.walkers.values()) { p.cancelTrip(w); Object.assign(w, { x: 59, z: 131, indoors: false, once: 'Idle', onceUntil: p.time + 100000 }); }
      });
      const send = async id => {
        await page.evaluate(id => {
          farm.panels.close(); farm.closeCards(); const p = farm.people, w = p.walkers.get(id);
          p.cancelTrip(w); w.x = 57; w.z = 117; w.subject.x = w.x; w.subject.z = w.z;
          p.selected = null; farm.focus(28, 58, 28);
        }, id);
        await page.waitForFunction(id => {
          const w = farm.people.walkers.get(id), a = w.subject.actor;
          return a?.root.visible && Math.hypot(a.root.position.x - w.x, a.root.position.z - w.z) < .05;
        }, id, { timeout: 60000 });
        await tap(await page.evaluate(id => farm.people.screenOf(farm.people.walkers.get(id), 1), id));
        expect(await page.evaluate(id => farm.people.selected?.id === id, id), id + ' was not selected by tap');
        await tap(await page.evaluate(() => { farm.focus(15, 42, 28); return farm.cellToScreen(15, 42); }));
        await sheet(page).locator('[data-pond]').waitFor({ state: 'visible' });
        expect(await page.evaluate(() => !farm.people.selected), 'pond tap retained stale character selection');
      };

      // Both visitors have a reserved place before arriving, while Cast stays available for the player.
      await send('june');
      expect(await sheet(page).locator('[data-do="castLine"]:not([data-bait])').isVisible(), 'sending a family member hid Cast');
      const june = await arrive(page, 'june');
      await send('ada'); const ada = await arrive(page, 'ada');
      expect(june.spot?.[0] === 18 && ada.spot?.[0] === 18 && [40, 44].includes(june.spot[1]) && [40, 44].includes(ada.spot[1]) && june.spot[1] !== ada.spot[1], 'friends overlap or reserve the player’s place');
      await send('pip');
      expect(await page.evaluate(() => !farm.people.walkers.get('pip').fishSpot && !farm.people.walkers.get('pip').route.length), 'a third friend took an occupied fishing place');
      expect(await sheet(page).locator('[data-do="castLine"]:not([data-bait])').isEnabled(), 'full visitor places blocked player fishing');
      await sheet(page).locator('[data-do="castLine"]:not([data-bait])').click();
      await page.waitForFunction(() => !!farm.people.walkers.get('you').goal);
      expect(await page.evaluate(() => !farm.state().fishing.line), 'Cast skipped the player’s journey');
      const player = await arrive(page, 'you');
      expect(JSON.stringify(player.spot) === '[18,42]', 'player did not get the central fishing place');
      expect(await page.evaluate(() => !!farm.state().fishing.line), 'arrival did not cast the line');
      const release = await page.evaluate(() => {
        const p = farm.people, previous = p.walkers.get('ada'), former = [...previous.fishSpot]; p.cancelTrip(previous);
        // A cancelled reservation is available after its previous fisher has physically left the bank.
        Object.assign(previous, { x: 57, z: 113, once: 'Idle', onceUntil: p.time + 10000 });
        const replacement = p.walkers.get('pip'); replacement.once = null;
        return { former, sent: p.sendFishing(replacement), spot: replacement.fishSpot };
      });
      expect(release.sent && JSON.stringify(release.former) === JSON.stringify(release.spot), 'released fishing place stayed unavailable');
      await arrive(page, 'pip');
      await page.evaluate(() => { farm.panels.close(); farm.focus(16, 42, 28); });
      await page.waitForFunction(() => farm.world.fishingView?.count >= 3, null, { timeout: 15000 });
      await page.waitForFunction(() => farm.world.fishingView.entries.every(float => float.y < .5));
      await page.waitForTimeout(2700); // let normal trip speech/toasts clear before reviewing the fishing silhouettes
      const world = await page.evaluate(() => {
        const f = farm.world.fishingView, props = farm.world.scene.getObjectByName('brook-props'), pos = props.geometry.attributes.position;
        let oldPlatform = 0;
        for (let i = 0; i < pos.count; i++) if (pos.getX(i) >= 32.5 && pos.getX(i) <= 37 && pos.getZ(i) >= 84 && pos.getZ(i) <= 86 && Math.abs(pos.getY(i) - .38) < .0001) oldPlatform++;
        return { count: f.count, rods: f.rods.visible, lines: f.lines.visible, floats: f.floats.visible, oldPlatform };
      });
      expect(world.rods && world.lines && world.floats && world.count >= 3, 'fishing rods, lines or floats are invisible');
      expect(!world.oldPlatform, 'the floating plank platform remains on the pond');
      if (shots) await page.screenshot({ path: join(shots, `fishing-world-${lang}-${width}.png`) });

      // A bobber opens fishing controls even if a different person was selected immediately before it.
      const bobber = await page.evaluate(() => {
        const f = farm.world.fishingView, camera = farm.world.cam.camera, matrix = camera.matrixWorld.clone();
        f.floats.getMatrixAt(0, matrix); const v = camera.position.clone().setFromMatrixPosition(matrix); f.floats.localToWorld(v); v.project(camera);
        farm.people.selected = farm.people.walkers.get('ada'); farm.people.selectedUntil = performance.now() + 10000;
        return { x: (v.x + 1) * innerWidth / 2, y: (1 - v.y) * innerHeight / 2 };
      });
      await tap(bobber); await sheet(page).locator('[data-pond]').waitFor({ state: 'visible' });
      expect(await page.evaluate(() => !farm.people.selected && !farm.people.walkers.get('ada').fishSpot), 'bobber tap sent the stale selected character fishing');
      expect(await page.evaluate(() => document.body.classList.contains('panel-open') && parseFloat(document.body.style.getPropertyValue('--sheet-h')) > 0), 'reopened fishing panel did not reserve space in the HUD');

      const line = await page.evaluate(() => structuredClone(farm.state().fishing.line));
      await setClock(page, line.doneAt);
      const before = await resources(page);
      await sheet(page).locator('[data-do="reelIn"][data-start="1"]').click();
      const start = await page.evaluate(() => farm.state().fishing.line.reeling.startedAt);
      const reel = sheet(page).locator('[data-do="reelIn"]:not([data-start]):not([data-steady])');
      await reel.click(); // at position zero: an intentionally mistimed attempt
      expect(await resources(page) === before, 'a missed attempt changed the reward or resources');
      expect(await sheet(page).locator('[data-reel-feedback]').textContent(), 'missed timing gave no retry feedback');
      await reel.focus();
      await page.evaluate(() => { farm.game.tick(); farm.panels.render(); });
      expect(await reel.evaluate(el => el === document.activeElement), 'timer redraw lost the focused timing button');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && [...document.querySelectorAll('.panel:not([hidden])')].every(el => el.scrollWidth <= el.clientWidth + 1)), 'fishing controls overflow the viewport');
      if (shots) await page.screenshot({ path: join(shots, `fishing-timing-${lang}-${width}.png`) });

      // Reload the real save during the challenge, then complete that same line through the primary button.
      await page.evaluate(() => { sessionStorage.setItem('fv-clock-offset', String(farm.game.now - Date.now())); window.__fvSave(); }); await page.goto(URL_);
      await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
      await page.waitForFunction(() => farm.people.walkers.has('you'), null, { timeout: 15000 });
      await page.evaluate(() => { clearInterval(farm.game.timer); farm.game.timer = 0; farm.closeCards(); farm.panels.show('pond'); });
      expect(await page.evaluate(seed => farm.state().fishing.line?.seed === seed, line.seed), 'reload replaced the pending fish');
      expect(await page.evaluate(start => farm.state().fishing.line?.reeling.startedAt === start, start), 'reload reset the timing session');
      await setClock(page, start + REEL_TIMING.periodMs / 4);
      const caughtBefore = await page.evaluate(() => farm.state().fishing.caught);
      await sheet(page).locator('[data-do="reelIn"]:not([data-start]):not([data-steady])').click();
      expect(await page.evaluate(n => !farm.state().fishing.line && farm.state().fishing.caught === n + 1, caughtBefore), 'a centered timing hit did not catch exactly one fish');
      const awarded = await resources(page);
      expect(await page.evaluate(() => !farm.game.do('reelIn').ok), 'the finished line could be collected twice');
      expect(await resources(page) === awarded, 'a second collection attempt repeated the reward');

      // Reduced motion has a direct equal-reward option, with no moving timing meter.
      await page.evaluate(() => {
        farm.closeCards(); const p = farm.people, w = p.walkers.get('you'); p.cancelTrip(w);
        Object.assign(w, { x: 37, z: 85, indoors: false, once: null, stay: 9999 });
        farm.game.do('setting', { key: 'reducedMotion', value: true }); farm.panels.show('pond');
      });
      await sheet(page).locator('[data-do="castLine"]:not([data-bait])').click();
      await page.waitForFunction(() => !!farm.state().fishing.line);
      const calmLine = await page.evaluate(() => structuredClone(farm.state().fishing.line));
      await setClock(page, calmLine.doneAt);
      expect(!await sheet(page).locator('.fishing-marker').count(), 'reduced motion still shows a moving timing marker');
      const expected = fishFor(calmLine.seed, calmLine.bait), stock = await page.evaluate(fish => farm.state().barn.items[fish] ?? 0, expected);
      await sheet(page).locator('[data-do="reelIn"][data-steady="1"]').click();
      expect(await page.evaluate(({ fish, stock, caught }) => (farm.state().barn.items[fish] ?? 0) === stock + 1 && farm.state().fishing.caught === caught + 2, { fish: expected, stock, caught: caughtBefore }), 'gentle fishing changed the seeded fish or granted the wrong count');
      expect(!errors.length, errors.join('\n'));
      console.log(`ok   fishing places, rods/float taps, timing/retry/save and gentle option ${lang} ${width}`);
    } catch (error) { failed++; console.log(`FAIL pond fishing ${lang} ${width}\n${error.stack}`); }
    finally { await context.close(); }
  }
} finally { await browser.close(); }
process.exitCode = failed ? 1 : 0;
