// Logic review: real mailbox buttons, gift-triggered scenes and conversations, in both phone languages.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LETTERS } from '../src/content/letters.mjs';
import { sceneFor } from '../src/core/bonds.mjs';
import { commentFor } from '../src/core/neighbours.mjs';
import { FAMILIES, NEIGHBOURS, VILLAGERS } from '../src/content/people.mjs';
import { VI } from '../src/i18n/vi.mjs';
import { ADVICE_TOPICS } from '../src/content/advice.mjs';
import { CHATTER } from '../src/content/chatter.mjs';

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
      g.s.barn.items.wheat = 10;
      g.s.orders.cards = [{ id: 'chat-order', from: 'ada', need: { wheat: 1 }, coins: 5, xp: 1 }];
      g.s.orders.pending = Array(4).fill(g.now + 86400000);
      g.s.advice = { read: [], deferred: [], celebrated: {}, retired: [] };
      const before = g.s.coins;
      p.lastAction = performance.now() - p.idleTipMs - 1; p.tipAt = -Infinity;
      farm.panels.show('settings');
      const unread = JSON.stringify(g.s.advice.read);
      p.maybeTip();
      if (JSON.stringify(g.s.advice.read) !== unread) throw Error('idle advice was marked read behind Settings');
      farm.panels.close();
      p.maybeTip(); const advice = june.bubble?.textContent, firstTopic = p.juneTopic;
      if (!g.s.advice.read.includes('order-ready:order/chat-order')) throw Error('June did not acknowledge her advice in the save');
      if (g.s.coins !== before || g.s.orders.cards.length !== 1) throw Error('June delivered or rewarded an order while speaking');
      p.talk(ada); if (farm.panels.open?.kind === 'orders') throw Error('an order replaced conversation');
      if (!ada.bubble?.textContent) throw Error('Ada said nothing');
      const adaLines = [];
      for (let i = 0; i < 6; i++) { p.talk(ada); adaLines.push(ada.bubble?.textContent); }
      p.talk(you); if (you.bubble) throw Error('player spoke when tapped');
      p.sendFishing(you); if (you.bubble) throw Error('player spoke when sent fishing');
      p.talk(june); const next = june.bubble?.textContent, nextTopic = p.juneTopic;
      return { advice, next, firstTopic, nextTopic, adaLines };
    });
    expect(lines.advice.includes(tr(lang, ADVICE_TOPICS['order-ready'].line)), 'June did not offer the actual ready order');
    expect(lines.firstTopic === 'order-ready', 'wrong first advice topic');
    expect(lines.nextTopic === 'chat', 'acknowledged business advice repeated instead of social chatter');
    expect(Object.values(CHATTER).flatMap(part => part.grown).some(text => lines.next?.includes(tr(lang, text))), 'June did not fall back to social conversation');
    const ada = VILLAGERS.find(p => p.id === 'ada');
    expect(new Set(lines.adaLines).size === 6, 'Ada repeated before her own pool was exhausted');
    for (const line of lines.adaLines) expect(ada.idle.some(text => line.includes(tr(lang, text))), 'Ada used generic chatter');
    await page.screenshot({ path: join(shots, 'advice-' + lang + '.png') });
    await page.evaluate(() => window.__fvSave());
    await page.goto(URL_); await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
    await page.waitForFunction(() => farm.people.walkers.has('june'));
    const restored = await page.evaluate(() => {
      clearInterval(farm.game.timer);
      const june = farm.people.walkers.get('june'); june.indoors = false;
      farm.people.talk(june);
      return { topic: farm.people.juneTopic, read: farm.state().advice.read };
    });
    expect(restored.read.includes('order-ready:order/chat-order'), 'June forgot her acknowledged advice after reload');
    expect(restored.topic === 'chat', 'June repeated the same business suggestion after reload');
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
        w.indoors = false; p.talk(w); const bubble = w.bubble?.textContent;
        // A player can tap on the way in. Completing that walk must neither crash nor repeat the observation.
        Object.assign(w, { route: [], wait: 0, once: null });
        p.liveVillager(w, 1, false); const arrived = w.bubble?.textContent;
        p.talk(w); return { ...e, bubble, arrived, conversation: w.bubble?.textContent };
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
      expect(e.arrived === e.bubble, 'arrival repeated or replaced the observation heard on the way in');
      expect(e.conversation.includes(tr(lang, NEIGHBOURS.find(n => n.id === e.id).line)), 'visitor introduction became unavailable');
    }
    expect(!errors.length, errors.join(' | '));
  });
  await check('arriving neighbours recheck a bakery stored while they walk (' + lang + ')', async ctx => {
    const { page, errors } = await open(ctx, lang);
    const state = await page.evaluate(() => {
      const g = farm.game;
      g.s.placed.visitBakery = { kind: 'bakery', x: 32, z: 56, rot: 0 };
      g.s.counts.bakery = (g.s.counts.bakery ?? 0) + 1;
      return farm.state();
    });
    const bakeryLine = NEIGHBOURS.find(n => n.id === 'mai').remarks.find(r => r.fact === 'bakery').text;
    const visit = Array.from({ length: 5 }, (_, i) => i + 1).find(n => commentFor(state, 'mai', n).text === bakeryLine);
    expect(visit != null, 'fixture did not select the bakery observation');
    const result = await page.evaluate(({ visit, bakeryLine }) => {
      const g = farm.game, p = farm.people;
      p.visit('mai', bakeryLine, {}, visit);
      const w = p.walkers.get('visit:mai'); if (!w) throw Error('visitor missing');
      const stored = g.do('store', { id: 'visitBakery' }); if (!stored.ok) throw Error(stored.reason);
      Object.assign(w, { route: [], wait: 0, once: null, indoors: false });
      p.liveVillager(w, 1, false);
      return { bubble: w.bubble?.textContent, state: farm.state() };
    }, { visit, bakeryLine });
    const latest = commentFor(result.state, 'mai', visit);
    expect(latest.text !== bakeryLine, 'fixture still has another working bakery');
    const expected = tr(lang, latest.text).replace(/\{(\w+)\}/g, (_, key) => typeof latest.params[key] === 'string' ? tr(lang, latest.params[key]) : latest.params[key]);
    expect(result.bubble?.includes(expected), 'arrival used an obsolete farm observation');
    expect(!errors.length, errors.join(' | '));
  });
  await check('Today keeps heart and charm counts separate from saved dates (' + lang + ')', async ctx => {
    const { page, errors } = await open(ctx, lang);
    const at = await page.evaluate(() => {
      const g = farm.game;
      // Settle the fixture's chapter mail and offline visits before saving the five news rows.
      g.clock = () => Date.now(); g.tick(); farm.closeCards();
      const at = g.now;
      g.s.firsts['heart:lan:3'] = at - 1;
      g.s.news = [
        { type: 'heartScene', person: 'lan', at, threshold: 6 },
        { type: 'heartScene', person: 'lan', at: at - 1 },
        { type: 'heartScene', person: 'ada', at: at - 2 },
        { type: 'charmMilestone', threshold: 20, at, decor: 'banner', charm: 23 },
        { type: 'charmMilestone', at, decor: 'bunting', charm: 47 },
      ];
      window.__fvSave(); return at;
    });
    await page.goto(URL_); await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
    await page.evaluate(() => { clearInterval(farm.game.timer); farm.closeCards(); farm.panels.show('today'); });
    await page.locator('.panel[data-kind="today"] div.today').waitFor({ state: 'visible' });
    const rows = await page.locator('.today .news li').allTextContents();
    expect(rows.length === 5, 'saved news rows disappeared');
    for (const [index, count] of [[0, 6], [1, 3]]) {
      const expected = tr(lang, '{name} and you: {count} hearts').replace('{name}', 'Lan').replace('{count}', count);
      expect(rows[index].includes(expected), 'heart threshold was replaced by its date: ' + JSON.stringify(rows));
    }
    expect(rows[2].includes(tr(lang, 'Heart scene')) && rows[2].includes('Ada'), 'legacy scene fallback missing');
    for (const [index, charm, name] of [[3, 20, 'Village banner'], [4, 8, 'Bunting']]) {
      const expected = tr(lang, 'Village charm {charm}: {name} goes up').replace('{charm}', charm).replace('{name}', tr(lang, name));
      expect(rows[index].includes(expected), 'wrong charm milestone');
    }
    expect(rows.every(row => !row.includes(String(at))), 'news displays a timestamp as a count');
    await fits(page, '.sheet.panel');
    expect(!errors.length, errors.join(' | '));
  });
}
await browser.close();
console.log(failures ? `${failures} logic story checks failed` : 'logic story checks passed');
process.exitCode = failures ? 1 : 0;
