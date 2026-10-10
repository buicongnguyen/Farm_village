// Select a real rendered character, tap the public pond, and follow the actual actor state machine to the dock.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
const URL_ = process.env.GAME_URL ?? 'http://127.0.0.1:5241/', shots = process.env.SHOTS;
if (shots) mkdirSync(shots, { recursive: true });
const expect = (ok, why) => { if (!ok) throw Error(why); };
const browser = await chromium.launch({ channel: 'chrome', headless: true,
  args: process.env.GPU === '0' ? ['--enable-unsafe-swiftshader'] : ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
let failures = 0;
try {
  for (const [lang, width] of [['en', 390], ['vi', 390], ['ko', 1280], ['ja', 1280]]) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: width < 500, hasTouch: width < 500 });
    try {
      await context.addInitScript(lang => localStorage.setItem('farm-village.language', lang), lang);
      const page = await context.newPage(), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push(m.text()); });
      await page.goto(`${URL_}?new&restore`);
      await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
      await page.evaluate(() => { farm.skipIntro(); farm.game.s.settings.daylight = 'always'; });
      await page.waitForFunction(() => ['you', 'june', 'ada'].every(id => farm.people.walkers.has(id)), null, { timeout: 15000 });
      const publicPath = await page.evaluate(() => {
        const before = JSON.stringify({ coins: farm.state().coins, parcels: farm.state().parcels, placed: farm.state().placed, cells: farm.state().cells });
        const path = []; for (let x = 18; x <= 27; x++) for (let z = 42; z <= 43; z++) path.push(farm.world.fixedLook(x, z));
        return { before, path, reference: farm.world.fixedLook(27, 63).color };
      });
      expect(publicPath.path.every(v => v.color === publicPath.reference), 'public footpath does not use the existing path surface');
      const click = async point => width < 500 ? page.touchscreen.tap(point.x, point.y) : page.mouse.click(point.x, point.y);
      for (const id of ['you', 'june', 'ada']) {
        await page.evaluate(id => {
          farm.closeCards(); farm.panels.close(); const p = farm.people;
          for (const other of p.walkers.values()) {
            p.cancelTrip(other); other.once = 'Idle'; other.onceUntil = p.time + 10000; other.indoors = false;
            other.x = 59; other.z = 130; other.subject.x = other.x; other.subject.z = other.z;
          }
          const w = p.walkers.get(id); w.x = 57; w.z = 117; w.subject.x = w.x; w.subject.z = w.z;
          w.wait = 9999; w.clipFor = null; farm.focus(28, 58, 28); p.selected = null;
        }, id);
        await page.waitForFunction(id => {
          const w = farm.people.walkers.get(id), actor = w?.subject.actor;
          return actor?.root.visible && actor.mesh.visible && actor.mesh.geometry.attributes.position.count > 0
            && Math.hypot(actor.root.position.x - w.x, actor.root.position.z - w.z) < .05;
        }, id, { timeout: 60000 });
        const person = await page.evaluate(id => farm.people.screenOf(farm.people.walkers.get(id), 1), id);
        await click(person);
        expect(await page.evaluate(id => farm.people.selected?.id === id, id), `${id}: actual person tap did not select actor`);
        const pond = await page.evaluate(() => { farm.focus(15, 42, 28); return farm.cellToScreen(15, 42); });
        await click(pond);
        const start = await page.evaluate(id => {
          const w = farm.people.walkers.get(id); w.once = null;
          return { route: w.route.length, end: w.route.at(-1), spot: w.fishSpot, selected: farm.people.selected?.id, line: !!farm.state().fishing.line };
        }, id);
        expect(start.route > 1 && start.spot?.[0] === 18 && [40, 42, 44].includes(start.spot[1]) && JSON.stringify(start.end) === JSON.stringify(start.spot), `${id}: did not receive an exact route to its fishing place: ${JSON.stringify(start)}`);
        expect(id === 'you' ? start.spot[1] === 42 : start.spot[1] !== 42, `${id}: the player's central fishing place was not reserved`);
        expect(!start.selected, 'the pond tap did not consume the selected actor');
        if (id === 'you') expect(!start.line, 'player cast while still on the road');
        const arrived = await page.evaluate(id => {
          const p = farm.people, w = p.walkers.get(id), method = w.player ? 'livePlayer' : w.family ? 'liveFamily' : 'liveVillager';
          let jumps = 0, steps = 0;
          for (; steps < 2400; steps++) {
            const old = [w.x, w.z]; p.time += .1; p[method](w, .1, false);
            if (Math.hypot(w.x - old[0], w.z - old[1]) > .4) jumps++;
            p.greet();
            if (w.clipFor === 'Sit' && !w.goal && !w.target && !w.todo && !w.route.length) break;
          }
          w.subject.x = w.x; w.subject.z = w.z; w.subject.rot = w.rot; w.subject.clip = 'Sit'; w.clip = 'Sit'; w.wait = 9999;
          return { x: w.x, z: w.z, spot: w.fishSpot, clip: w.clipFor, steps, jumps, line: !!farm.state().fishing.line };
        }, id);
        expect(arrived.steps < 2400 && arrived.clip === 'Sit' && Math.hypot(arrived.x - (start.spot[0] + .5) * 2, arrived.z - (start.spot[1] + .5) * 2) < .05 && !arrived.jumps, `${id}: failed arrival ${JSON.stringify(arrived)}`);
        expect(arrived.line, `${id}: expected player's line after arriving at dock`);
        await page.waitForFunction(id => {
          const w = farm.people.walkers.get(id), actor = w.subject.actor;
          return actor?.root.visible && actor.mesh.visible && actor.mesh.geometry.attributes.position.count > 0
            // Hana has no authored Sit clip; verify the rig's real fallback while logical fishing remains Sit.
            && w.clipFor === 'Sit' && actor.clip === actor.rig.clipFor('Sit') && w.fishSpot && Math.hypot(actor.root.position.x - (w.fishSpot[0] + .5) * 2, actor.root.position.z - (w.fishSpot[1] + .5) * 2) < .05;
        }, id, { timeout: 15000 }).catch(async error => {
          const state = await page.evaluate(id => {
            const w = farm.people.walkers.get(id), a = w.subject.actor;
            return { id, time: farm.people.time, cam: { x: farm.world.cam.x, z: farm.world.cam.z, span: farm.world.cam.span },
              walker: { x: w.x, z: w.z, clip: w.clip, clipFor: w.clipFor, once: w.once, onceUntil: w.onceUntil, wait: w.wait, indoors: w.indoors },
              subject: { x: w.subject.x, z: w.subject.z, clip: w.subject.clip, hidden: w.subject.hidden },
              actor: a && { x: a.root.position.x, z: a.root.position.z, visible: a.root.visible, mesh: a.mesh.visible, clip: a.clip, once: a.onceClip, count: a.mesh.geometry.attributes.position.count },
              cast: farm.people.cast.stats() };
          }, id);
          throw Error(`${error.message}\nDock render state: ${JSON.stringify(state)}`);
        });
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        if (shots) await page.screenshot({ path: join(shots, `pond-${lang}-${width}-${id}.png`) });
      }
      expect(await page.evaluate(before => JSON.stringify({ coins: farm.state().coins, parcels: farm.state().parcels, placed: farm.state().placed, cells: farm.state().cells }) === before, publicPath.before), 'fishing trips purchased land, charged coins, or changed structures');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'phone viewport overflow');
      expect(!errors.length, errors.join('\n'));
      console.log(`ok   actual character taps reach the public fishing dock ${lang} ${width}`);
    } catch (error) { failures++; console.log(`FAIL pond walk ${lang} ${width}\n${error.stack}`); }
    finally { await context.close(); }
  }
} finally { await browser.close(); }
process.exitCode = failures ? 1 : 0;
