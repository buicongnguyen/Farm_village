// Browser checks for roaming Explore (the HUD's Explore button, ui/explore-mode.mjs): start where you stand, walk with
// the keys, do the nearby thing (talk, sit, harvest, read the board, go inside from a few steps away, fish), come back to
// Farm view, and walk as a family member you tapped first.
// Run after `npm run build:test` with dist served (GAME_URL, default http://127.0.0.1:5241/). SHOTS=<dir> keeps screenshots.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const URL_ = process.env.GAME_URL ?? 'http://127.0.0.1:5241/', SHOTS = process.env.SHOTS; if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: process.env.GPU === '0' ? ['--enable-unsafe-swiftshader'] : ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const results = [], expect = (ok, msg) => { if (!ok) throw Error(msg); };
async function check(name, f) { try { await f(); results.push(1); console.log(`ok   ${name}`); } catch (e) { results.push(0); console.log(`FAIL ${name}\n     ${e.message}`); } }
async function open(device, lang = 'en') {
  const ctx = await browser.newContext(device === 'phone' ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 800 } });
  if (lang !== 'en') await ctx.addInitScript(lang => localStorage.setItem('farm-village.language', lang), lang);
  const page = await ctx.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${URL_}?new&restore`);
  await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
  await page.evaluate(() => { farm.game.s.settings.daylight = 'always'; farm.skipIntro(); farm.closeCards?.(); });
  await page.waitForFunction(() => farm.people?.walkers.has('you') && farm.people.walkers.has('june'), null, { timeout: 20000 });
  await page.waitForTimeout(1500); await page.evaluate(() => farm.closeCards?.());
  return { ctx, page, errors };
}
const mode = page => page.evaluate(() => { const m = farm.world.exploreMode, e = m?.session; return m ? { active: !!m.active, loading: !!m.loading, inside: !!m.inside, p: e?.p, route: e?.route.length, near: m.near?.id ?? null, label: document.querySelector('[data-explore="interact"]')?.textContent ?? null, who: m.walker?.id, seated: !!e?.seated } : null; });
const start = async page => { await page.locator('.hud [data-act="explore"]').click(); await page.waitForFunction(() => farm.world.exploreMode?.active && !farm.world.exploreMode.loading && farm.world.exploreMode.session, null, { timeout: 30000 }); };
const stand = (page, x, z) => page.evaluate(([x, z]) => { const m = farm.world.exploreMode; m.session.p = [x, z]; m.session.route = []; m.scanClock = 0; }, [x, z]);
const settle = page => page.waitForTimeout(450);

await check('the Explore button starts roaming where you stand; keys walk and the camera follows; Farm view returns', async () => {
  const { ctx, page, errors } = await open('phone');
  expect(await page.locator('.hud [data-act="explore"]').isVisible(), 'no Explore button on the HUD');
  expect(await page.locator('.hud [data-act="explore"]').evaluate(el => { const r = el.getBoundingClientRect(); return r.width >= 44 && r.height >= 44; }), 'the Explore button is under 44 px');
  const before = await page.evaluate(() => { const w = farm.people.walkers.get('you'); return [w.x, w.z]; });
  await start(page);
  let m = await mode(page);
  expect(m.active && !m.inside && m.route === 0 && m.who === 'you', `roaming did not start outdoors and still: ${JSON.stringify(m)}`);
  expect(Math.hypot(m.p[0] - before[0], m.p[1] - before[1]) < 14, 'roaming moved the character somewhere else');
  expect(await page.locator('.hud [data-act="explore"]').isHidden() && await page.locator('.hud-tools').isHidden(), 'farm buttons stay up while exploring');
  await stand(page, 57, 131); await settle(page);   // open road by the gate
  const cam0 = await page.evaluate(() => [farm.world.cam.x, farm.world.cam.z]);
  await page.keyboard.down('d'); await page.waitForTimeout(900); await page.keyboard.up('d');
  m = await mode(page);
  expect(Math.hypot(m.p[0] - 57, m.p[1] - 131) > 1, `the key did not walk the character: ${m.p}`);
  const cam1 = await page.evaluate(() => [farm.world.cam.x, farm.world.cam.z]);
  expect(Math.hypot(cam1[0] - cam0[0], cam1[1] - cam0[1]) > .5, 'the camera did not follow');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/roam-phone.png` });
  await page.locator('[data-explore="close"]').click();
  expect(await page.evaluate(() => !farm.world.exploreMode.active && !document.body.classList.contains('explore-active')), 'Farm view did not return');
  expect(await page.locator('.hud [data-act="explore"]').isVisible() && await page.locator('.hud-tools').isVisible(), 'the farm HUD did not come back');
  expect(!errors.length, errors.join(' | ')); await ctx.close();
});

await check('nearby things offer one action: talk, the order board, a bench, a ripe bed; Go inside works from a few steps away', async () => {
  const { ctx, page, errors } = await open('pc');
  const park = () => page.evaluate(() => { const p = farm.people; for (const w of p.walkers.values()) if (!w.player && w.id !== 'june') { p.cancelTrip?.(w); Object.assign(w, { x: 20, z: 20, route: [], target: null, once: 'Idle', onceUntil: p.time + 9999 }); } });   // people and pets wander; keep them out of the staged spots
  await park();
  await start(page);
  // a person
  const june = await page.evaluate(() => { const p = farm.people, w = p.walkers.get('june'); p.cancelTrip(w); Object.assign(w, { x: 61, z: 131, indoors: false, once: 'Idle', onceUntil: p.time + 9999 }); return [w.x, w.z]; });
  await stand(page, june[0] - 1.6, june[1]); await settle(page);
  let m = await mode(page);
  const juneName = await page.evaluate(() => farm.people.nameOf(farm.people.walkers.get('june')));
  expect(m.near === 'person:june' && m.label.includes(juneName), `standing by June offers ${m.near} "${m.label}" (her name is ${juneName})`);
  await page.keyboard.press('e');
  await page.waitForFunction(() => !!farm.people.walkers.get('june').bubble?.isConnected, null, { timeout: 3000 });
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('.bubbles')).display !== 'none'), 'speech is hidden while roaming');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/roam-talk.png` });
  // the order board opens its panel, and exploring waits behind it
  await page.evaluate(() => { const w = farm.people.walkers.get('june'); Object.assign(w, { x: 20, z: 20 }); });
  await park(); await stand(page, 59, 117); await settle(page); m = await mode(page);
  expect(m.near === 'board', `by the order board: ${m.near}`);
  await page.locator('[data-explore="interact"]').click();
  await page.locator('.panel[data-kind="orders"]:not([hidden])').waitFor({ timeout: 3000 });
  await page.evaluate(() => farm.panels.close());
  // a ripe bed is harvested with the farm's own action
  const bed = await page.evaluate(() => { const s = farm.state(), id = Object.keys(s.beds).find(k => s.beds[k]); s.beds[id].doneAt = farm.game.now - 1; const p = s.placed[id]; return { id, x: p.x * 2 + 1, z: p.z * 2 + 1, crop: s.beds[id].crop, stock: s.barn.items[s.beds[id].crop] ?? 0 }; });
  await stand(page, bed.x, bed.z + 2); await settle(page); m = await mode(page);
  expect(m.near === `bed:${bed.id}`, `by a ripe bed: ${m.near}`);
  // one press gathers every ripe bed within a few steps, one after another
  const ripe = await page.evaluate(() => { const s = farm.state(); let n = 0; for (const id of Object.keys(s.beds)) if (s.beds[id]) { s.beds[id].doneAt = farm.game.now - 1; n++; } return n; });
  await page.locator('[data-explore="interact"]').click();
  await page.waitForFunction(b => !farm.state().beds[b.id], bed, { timeout: 3000 });
  await page.waitForTimeout(140 * ripe + 300);
  const left = await page.evaluate(() => { const s = farm.state(), e = farm.world.exploreMode.session; return Object.keys(s.beds).filter(id => s.beds[id]?.doneAt <= farm.game.now && Math.hypot(s.placed[id].x * 2 + 1 - e.p[0], s.placed[id].z * 2 + 1 - e.p[1]) < 7).length; });
  expect(left === 0 && ripe > 1, `one Harvest press left ${left} of ${ripe} ripe beds nearby`);
  expect(await page.evaluate(b => (farm.state().barn.items[b.crop] ?? 0) > b.stock, bed), 'Harvest did not bring the crop in');
  // a bench: sit, then walking stands you up
  const bench = await page.evaluate(() => { const r = (farm.state().level = Math.max(farm.state().level, 6), farm.state().coins += 500, farm.game.do('place', { kind: 'bench', x: 34, z: 60, rot: 0 })); const s = farm.state(), id = Object.keys(s.placed).find(k => s.placed[k].kind === 'bench'); return id ? { id, x: s.placed[id].x * 2 + 1, z: s.placed[id].z * 2 + 1, ok: r?.ok } : null; });
  if (bench) {
    await stand(page, bench.x + 1.6, bench.z); await settle(page); m = await mode(page);
    expect(m.near === `bench:${bench.id}`, `by a bench: ${m.near}`);
    await page.evaluate(() => farm.closeCards?.());   // a level-up card from the harvest pauses Explore input, as it should
    await page.keyboard.press('e'); await settle(page);
    expect(await page.evaluate(() => farm.world.exploreMode.session.seated && farm.people.walkers.get('you').clip === 'Sit'), 'did not sit on the bench');
    await page.keyboard.down('d'); await page.waitForTimeout(300); await page.keyboard.up('d');
    expect(await page.evaluate(() => !farm.world.exploreMode.session.seated), 'walking did not stand up');
  }
  // Go inside from three steps away: walks to the door, then enters
  await stand(page, 53, 125); await settle(page); m = await mode(page);
  expect(m.near === 'door', `near the farmhouse: ${m.near}`);
  await page.locator('[data-explore="interact"]').click();
  expect(await page.evaluate(() => farm.world.exploreMode.enterOnArrival), 'Go inside from a distance did not start the walk to the door');
  await page.keyboard.down('d'); await page.waitForTimeout(200); await page.keyboard.up('d');   // a change of mind
  expect(await page.evaluate(() => !farm.world.exploreMode.enterOnArrival && !farm.world.exploreMode.inside), 'walking away did not cancel Go inside');
  await stand(page, 53, 125); await settle(page);
  await page.locator('[data-explore="interact"]').click();
  await page.waitForFunction(() => farm.world.exploreMode.inside, null, { timeout: 15000 });
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/roam-inside.png` });
  await page.locator('[data-explore="close"]').click();
  expect(await page.evaluate(() => !farm.world.exploreMode.active), 'Farm view did not return from inside');
  expect(!errors.length, errors.join(' | ')); await ctx.close();
});

await check('tap a family member, then Explore: you walk as them; the pond hands over to fishing as yourself', async () => {
  const { ctx, page, errors } = await open('pc', 'vi');
  await page.evaluate(() => { const p = farm.people, w = p.walkers.get('pip'); p.cancelTrip(w); Object.assign(w, { x: 57, z: 131, indoors: false }); p.selected = w; p.selectedUntil = performance.now() + 10000; });
  await start(page);
  let m = await mode(page);
  expect(m.who === 'pip', `walking as ${m.who}, not the selected family member`);
  await page.keyboard.down('d'); await page.waitForTimeout(600); await page.keyboard.up('d');
  expect(await page.evaluate(() => { const w = farm.people.walkers.get('pip'), e = farm.world.exploreMode.session; return w.controlled && Math.hypot(w.x - e.p[0], w.z - e.p[1]) < .01 && Math.hypot(e.p[0] - 57, e.p[1] - 131) > .5; }), 'the family member does not follow your keys');
  await stand(page, 53, 125); await settle(page); m = await mode(page);
  expect(m.near !== 'door', 'a family member is offered the farmhouse room meant for your own character');
  await page.locator('[data-explore="close"]').click();
  expect(await page.evaluate(() => !farm.people.walkers.get('pip').controlled), 'the family member stayed under control after Farm view');
  // as yourself, the pond offers fishing and hands over to the fishing trip
  await start(page);
  await stand(page, 39, 85); await settle(page); m = await mode(page);
  expect(m.who === 'you' && m.near === 'pond', `by the pond as ${m.who}: ${m.near}`);
  await page.locator('[data-explore="interact"]').click();
  expect(await page.evaluate(() => !farm.world.exploreMode.active), 'fishing did not take over from exploring');
  expect(await page.evaluate(() => { const w = farm.people.walkers.get('you'); return !w.controlled && (!!w.goal || !!w.fishSpot || !!farm.state().fishing.line); }), 'the fishing trip did not start');
  expect(!errors.length, errors.join(' | ')); await ctx.close();
});

await check('the Explore button waits until the first tutorial steps are done', async () => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }), page = await ctx.newPage();
  await page.goto(`${URL_}?new&restore`);
  await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
  expect(await page.evaluate(() => farm.state().story.tutorial < 3), 'this fixture is not in the tutorial');
  expect(await page.locator('.hud [data-act="explore"]').isHidden(), 'the Explore button shows during the first tutorial steps');
  await ctx.close();
});

await check('more to do on foot: collect eggs, feed, pick fruit, pet the dog; tapping a thing walks there and does it', async () => {
  const { ctx, page, errors } = await open('pc');
  // a working coop with a hen that has laid, and a ripe fruit tree
  const farmBits = await page.evaluate(() => {
    const s = farm.state(); s.coins = 5000; s.level = 6;
    const coop = Object.keys(s.placed).find(k => s.placed[k].kind === 'coop'); delete s.cond[coop];   // a mended coop for this check
    return { coop };
  });
  const bits = await page.evaluate(({ coop }) => {
    const g = farm.game, s = g.s, now = g.now;
    g.do('buyAnimal', { home: coop }); const hens = s.animals[coop] ?? []; if (hens[0]) hens[0].doneAt = now - 1;
    g.do('place', { kind: 'apple_tree', x: 36, z: 60, rot: 0 });
    const tree = Object.keys(s.placed).find(k => s.trees?.[k]); if (tree) s.trees[tree].doneAt = now - 1;
    const c = s.placed[coop], t = tree && s.placed[tree];
    return { coop, hens: hens.length, eggs: s.barn.items.egg ?? 0, coopAt: [c.x * 2 + 2, c.z * 2 + 2], tree, treeAt: t && [t.x * 2 + 1, t.z * 2 + 1], fruit: tree ? Object.values(s.barn.items).reduce((a, b) => a + b, 0) : 0 };
  }, farmBits);
  await start(page);
  if (bits.hens) {
    await stand(page, bits.coopAt[0] - 3.2, bits.coopAt[1]); await settle(page); let m = await mode(page);
    expect(m.near === `animals:${bits.coop}`, `by a coop with an egg: ${m.near} "${m.label}"`);
    await page.keyboard.press('f');
    expect(await page.evaluate(b => (farm.state().barn.items.egg ?? 0) > b.eggs, bits), 'Collect did not bring the egg in');
    await settle(page); m = await mode(page);
    expect(m.near === `feed:${bits.coop}`, `a hen that has laid is hungry: ${m.near}`);
  }
  if (bits.tree) {
    await stand(page, bits.treeAt[0] + 2, bits.treeAt[1]); await settle(page); const m = await mode(page);
    expect(m.near === `fruit:${bits.tree}`, `by a ripe tree: ${m.near}`);
    await page.keyboard.press('e');
    expect(await page.evaluate(b => farm.state().trees[b.tree].doneAt > farm.game.now, bits), 'Pick fruit did not pick the tree');
  }
  // the dog
  const dog = await page.evaluate(() => {   // the dog keeps moving: stand beside it and look at once
    const p = farm.people, w = [...p.walkers.values()].find(w => w.pet && !w.indoors); if (!w) return null;
    const m = farm.world.exploreMode, pip = p.walkers.get('pip'), was = pip?.indoors; if (pip) pip.indoors = true;   // Pip is always beside his dog
    m.session.p = [w.x + 1.2, w.z]; const near = m.scan(); if (pip) pip.indoors = was;
    return { id: w.id, near: near?.id, label: near?.label };
  });
  if (dog) expect(dog.near === `person:${dog.id}` && dog.label === 'Pet {name}', `by the dog: ${JSON.stringify(dog)}`);
  // tap a person across the yard: walk over, then talk
  await page.evaluate(() => { const p = farm.people; for (const w of p.walkers.values()) if (w.pet) Object.assign(w, { x: 20, z: 20 }); const j = p.walkers.get('june'); p.cancelTrip(j); j.bubble?.remove(); j.bubble = null; Object.assign(j, { x: 65, z: 131, indoors: false, once: 'Idle', onceUntil: p.time + 9999 }); });
  await page.evaluate(() => farm.closeCards?.());
  await stand(page, 55, 131); await settle(page);
  await page.waitForTimeout(700);   // the camera glides to you; tap where June is once it rests
  const at = await page.evaluate(() => farm.cellToScreen(32, 65));
  await page.mouse.click(at.x ?? at[0], at.y ?? at[1]);
  await page.waitForFunction(() => !!farm.people.walkers.get('june').bubble?.isConnected, null, { timeout: 12000 });
  expect(await page.evaluate(() => { const e = farm.world.exploreMode.session; return Math.hypot(e.p[0] - 65, e.p[1] - 131) < 3.2; }), 'did not walk over to the person that was tapped');
  expect(!errors.length, errors.join(' | ')); await ctx.close();
});

await check('phones get a thumb stick: dragging it walks, releasing stops; the action is one pill', async () => {
  const { ctx, page, errors } = await open('phone');
  await start(page);
  await stand(page, 57, 131); await settle(page);
  const joy = page.locator('.explore-joy'); expect(await joy.isVisible(), 'no thumb stick on a touch screen');
  const r = await joy.boundingBox(); expect(r.width >= 120 && r.x < 60 && r.y > 600, `the stick is not bottom-left: ${JSON.stringify(r)}`);
  const from = await page.evaluate(() => [...farm.world.exploreMode.session.p]);
  const cdp = await ctx.newCDPSession(page), cx = r.x + r.width / 2, cy = r.y + r.height / 2;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx + 45, y: cy }] });
  await page.waitForTimeout(700);
  expect(await page.evaluate(() => Math.hypot(...farm.world.exploreMode.stick) > .9), 'the stick does not report a direction');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await cdp.detach();
  const to = await page.evaluate(() => [...farm.world.exploreMode.session.p]);
  expect(Math.hypot(to[0] - from[0], to[1] - from[1]) > 1, `the stick did not walk the character: ${from} → ${to}`);
  expect(await page.evaluate(() => Math.hypot(...farm.world.exploreMode.stick) === 0), 'releasing the stick kept walking');
  expect(await page.evaluate(() => { const c = document.querySelector('.explore-controls'); const j = document.querySelector('.explore-joy').getBoundingClientRect(), b = c.getBoundingClientRect(); return c.classList.contains('compact') && (b.bottom <= j.top + 1 || b.left >= j.right - 1); }), 'the action pill overlaps the thumb stick');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/zoo-phone.png` });
  expect(!errors.length, errors.join(' | ')); await ctx.close();
});

await browser.close();
const failed = results.filter(r => !r).length;
console.log(`\n${results.length - failed}/${results.length} roaming Explore checks passed`);
process.exit(failed ? 1 : 0);
