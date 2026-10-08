// Logic review: real mailbox buttons, gift-triggered scenes and conversations, in both phone languages.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LETTERS } from '../src/content/letters.mjs';
import { sceneFor } from '../src/core/bonds.mjs';
import { JUNE_TIPS, FAMILIES, NEIGHBOURS, VILLAGERS } from '../src/content/people.mjs';
import { VI } from '../src/i18n/vi.mjs';

const URL_ = process.env.GAME_URL ?? 'http://127.0.0.1:5241/';
const shots = join(tmpdir(), 'farm-village-logic'); mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: process.env.GPU === '0'
  ? ['--enable-unsafe-swiftshader'] : ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const expect = (ok, why) => { if (!ok) throw Error(why); };
const tr = (lang, text) => lang === 'vi' ? VI[text] ?? text : text;
let failures = 0;
async function check(name, fn) {
  let ctx;
  try {
    ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    await fn(ctx); console.log('ok   ' + name);
  } catch (e) { failures++; console.log('FAIL ' + name + '\n     ' + e.stack); }
  finally { await ctx?.close(); }
}
async function open(ctx, lang) {
  await ctx.addInitScript(lang => localStorage.setItem('farm-village.language', lang), lang);
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(URL_ + '?new&restore');
  await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
  await page.evaluate(() => {
    farm.skipIntro(); clearInterval(farm.game.timer);
    const now = new Date(2026, 9, 8, 9).getTime(); farm.game.clock = () => now;
    farm.game.s.story.chapter = 5; farm.game.s.settings.reducedMotion = true;
    farm.closeCards(); farm.panels.close();
  });
  return { page, errors };
}
async function fits(page, selector) {
  expect(await page.evaluate(selector => {
    const el = document.querySelector(selector); if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1
      && el.scrollWidth <= el.clientWidth + 1;
  }, selector), selector + ' does not fit the phone');
}

for (const lang of ['en', 'vi']) {
  await check('ordered mail hides legacy later clues and persists reads (' + lang + ')', async ctx => {
    const { page, errors } = await open(ctx, lang);
    await page.evaluate(() => {
      const g = farm.game; g.s.level = 5;
      g.s.mail = [
        { id: 'ellis-2', from: 'ellis', at: g.now, read: false },
        { id: 'ellis-1', from: 'ellis', at: g.now - 1, read: false },
      ];
      farm.panels.show('mail');
    });
    await page.click('[data-do="readLetter"][data-id="ellis-2"]');
    expect(await page.locator('.modal .letter').count() === 0, 'a refused clue revealed its contents');
    expect(await page.evaluate(() => !farm.state().mail.find(m => m.id === 'ellis-2').read), 'refused clue was marked read');
    await page.click('[data-do="readLetter"][data-id="ellis-1"]');
    await page.waitForSelector('.modal .letter'); await page.waitForTimeout(250);
    expect((await page.textContent('.modal .paper')).includes(tr(lang, LETTERS.find(l => l.id === 'ellis-1').text)), 'wrong first letter');
    await fits(page, '.modal .card-modal'); await page.click('.modal [data-close]');
    await page.click('[data-do="readLetter"][data-id="ellis-2"]');
    expect((await page.textContent('.modal .paper')).includes(tr(lang, LETTERS.find(l => l.id === 'ellis-2').text)), 'second letter did not unlock');
    await page.screenshot({ path: join(shots, 'letters-' + lang + '.png') });
    await page.evaluate(() => { farm.closeCards(); window.__fvSave(); });
    await page.goto(URL_); await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
    expect(await page.evaluate(() => ['ellis-1', 'ellis-2'].every(id => farm.state().mail.find(m => m.id === id)?.read)), 'letter progress lost after reload');
    expect(!errors.length, errors.join(' | '));
  });

  await check('friendship scenes reflect the open school and clinic and survive saving (' + lang + ')', async ctx => {
    const { page, errors } = await open(ctx, lang);
    for (const [person, family, good, count] of [['zara', 'okafor', 'carrot_cake', 'school'], ['marisol', 'reyes', 'milk', 'clinic']]) {
      await page.evaluate(({ person, family, good, count }) => {
        const g = farm.game, home = Object.keys(g.s.homes)[0];
        if (!home) throw Error('no fixture cottage');
        g.s.homes[home] = { family, arrivesAt: 0, arrived: true, level: 0, rentFrom: g.now };
        g.s.counts[count] = 1; g.s.people[person] = { hearts: 2.9, scenes: [] }; g.s.barn.items[good] = 1;
        const r = g.do('gift', { person, good }); if (!r.ok) throw Error(r.reason);
      }, { person, family, good, count });
      await page.waitForSelector('.heart-scene'); await page.waitForTimeout(300);
      const expected = sceneFor(person, 3, { counts: { [count]: 1 } }).lines;
      const text = await page.textContent('.heart-scene');
      for (const line of expected) expect(text.includes(tr(lang, line.text)), 'missing state-aware line: ' + line.text);
      await fits(page, '.modal .card-modal');
      await page.screenshot({ path: join(shots, person + '-scene-' + lang + '.png') });
      await page.evaluate(() => farm.closeCards());
    }
    await page.evaluate(() => window.__fvSave());
    await page.goto(URL_); await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
    expect(await page.evaluate(() => ['zara', 'marisol'].every(id => farm.state().people[id]?.scenes.includes(3))), 'scene progress lost after reload');
    expect(!errors.length, errors.join(' | '));
  });

  await check('June gives actionable advice, orders allow chat, and the player stays silent (' + lang + ')', async ctx => {
    const { page, errors } = await open(ctx, lang);
    await page.waitForFunction(() => farm.people.walkers.has('june') && farm.people.walkers.has('you'));
    const lines = await page.evaluate(() => {
      const g = farm.game, p = farm.people, june = p.walkers.get('june'), you = p.walkers.get('you'), ada = p.walkers.get('ada');
      june.indoors = you.indoors = ada.indoors = false;
      const bed = Object.keys(g.s.placed).find(id => g.s.placed[id].kind === 'bed');
      if (!bed) throw Error('no fixture bed');
      g.s.beds[bed] = { crop: 'wheat', doneAt: g.now - 1 };
      p.talk(june); const advice = june.bubble?.textContent;
      g.s.orders.cards = [{ id: 'chat-order', from: 'ada', need: { wheat: 1 }, coins: 5, xp: 1 }];
      p.talk(ada); if (farm.panels.open?.kind === 'orders') throw Error('an order replaced conversation');
      if (!ada.bubble?.textContent) throw Error('Ada said nothing');
      const adaLines = [];
      for (let i = 0; i < 6; i++) { p.talk(ada); adaLines.push(ada.bubble?.textContent); }
      p.talk(you); if (you.bubble) throw Error('player spoke when tapped');
      p.sendFishing(you); if (you.bubble) throw Error('player spoke when sent fishing');
      p.talk(june); const next = june.bubble?.textContent;
      return { advice, next, adaLines };
    });
    expect(lines.advice.includes(tr(lang, JUNE_TIPS.harvest)), 'June did not offer the ready harvest');
    expect(lines.next && lines.next !== lines.advice, 'consecutive taps repeated the same tip');
    const ada = VILLAGERS.find(p => p.id === 'ada');
    expect(new Set(lines.adaLines).size === 6, 'Ada repeated before her own pool was exhausted');
    for (const line of lines.adaLines) expect(ada.idle.some(text => line.includes(tr(lang, text))), 'Ada used generic chatter');
    await page.screenshot({ path: join(shots, 'advice-' + lang + '.png') });
    expect(!errors.length, errors.join(' | '));
  });
  await check('Bo notices the reopened school and visiting neighbours use real farm facts (' + lang + ')', async ctx => {
    const { page, errors } = await open(ctx, lang);
    const result = await page.evaluate(() => {
      const g = farm.game, p = farm.people, home = Object.keys(g.s.homes)[0];
      g.s.homes[home] = { family: 'tran', arrivesAt: 0, arrived: true, level: 0, rentFrom: g.now };
      p.sync(); const bo = p.walkers.get('bo'); if (!bo) throw Error('Bo did not move in'); bo.indoors = false;
      p.talk(bo); const before = bo.bubble?.textContent;
      g.s.placed.testSchool = { kind: 'school', x: 60, z: 105, rot: 0 }; g.s.counts.school = 1;
      p.talk(bo); const after = bo.bubble?.textContent;
      const visits = [], stop = g.on(r => visits.push(...(r.events ?? []).filter(e => e.type === 'neighbourVisit')));
      for (const id of ['mai', 'gus']) g.s.neighbours[id] = {
        friendship: 0, total: 4, day: '2026-10-08', visits: [g.now], visited: 0, trade: null,
      };
      g.tick(); stop(); farm.closeCards();
      const remarks = visits.map(e => {
        const w = p.walkers.get('visit:' + e.id); if (!w) throw Error('visitor did not appear: ' + e.id);
        w.indoors = false; p.talk(w); return { ...e, bubble: w.bubble?.textContent };
      });
      return { before, after, remarks };
    });
    const bo = FAMILIES.flatMap(f => f.people).find(p => p.id === 'bo');
    expect(result.before.includes(tr(lang, bo.line)), 'Bo lost his introduction');
    expect(result.after.includes(tr(lang, bo.contextLines.find(l => l.when === 'school').text)), 'Bo still asks for an unopened school');
    expect(result.remarks.length === 2, 'expected both neighbours');
    for (const e of result.remarks) {
      expect(NEIGHBOURS.find(n => n.id === e.id).remarks.some(r => r.text === e.comment), 'unused neighbour remarks remain disconnected');
      const expected = tr(lang, e.comment).replace(/\{(\w+)\}/g, (_, key) => typeof e.params[key] === 'string' ? tr(lang, e.params[key]) : e.params[key]);
      expect(e.bubble.includes(expected), 'visitor text or Vietnamese placeholders were not rendered');
    }
    expect(!errors.length, errors.join(' | '));
  });
}
await browser.close();
console.log(failures ? `${failures} logic story checks failed` : 'logic story checks passed');
process.exitCode = failures ? 1 : 0;
