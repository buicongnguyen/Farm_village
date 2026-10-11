// Keep real villager speech readable when the player enlarges text or pans a speaker off screen.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { allPeople, VILLAGERS } from '../src/content/people.mjs';
import { CHATTER } from '../src/content/chatter.mjs';
import { ADVICE_TOPICS } from '../src/content/advice.mjs';
import { LANGUAGES, loadLanguage, tIn } from '../src/kit/i18n.mjs';

await Promise.all(LANGUAGES.map(({ id }) => loadLanguage(id)));
const URL_ = process.env.GAME_URL ?? 'http://127.0.0.1:5241/';
const shots = join(tmpdir(), 'hollowbrook-speech-bounds'); mkdirSync(shots, { recursive: true });
const sources = [...allPeople().flatMap(p => [p.line, ...(p.idle ?? []), ...(p.contextLines ?? []).map(c => c.text)]),
  ...Object.values(CHATTER).flatMap(period => Object.values(period).flat())].filter(text => typeof text === 'string');
const intro = VILLAGERS.find(person => person.id === 'june').line;
function spokenLines(language) {
  const lines = sources.map(source => tIn(language, source));
  for (const topic of Object.values(ADVICE_TOPICS)) {
    const params = Object.fromEntries([...topic.line.matchAll(/\{(\w+)\}/g)].map(([, key]) => [key,
      ['cost', 'coins', 'short', 'energy', 'level'].includes(key) ? 1000 : tIn(language, key === 'building' ? 'Noodle factory' : key === 'step' ? 'Brace the frame' : 'Instant noodles')]));
    const line = tIn(language, topic.line, params);
    lines.push(line, `${tIn(language, intro)} ${line}`);
  }
  return [...new Set(lines)];
}
const browser = await chromium.launch({ channel: 'chrome', headless: true });
let checks = 0, failures = 0;
try {
  for (const { id: language } of LANGUAGES) for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
    checks++;
    const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    try {
      await context.addInitScript(language => localStorage.setItem('farm-village.language', language), language);
      await page.goto(URL_); await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => { farm.skipIntro(); farm.game.do('setting', { key: 'daylight', value: 'always' }); farm.game.do('setting', { key: 'reducedMotion', value: true }); farm.panels.close(); });
      await page.waitForFunction(() => !!farm.people.walkers.get('ada'));
      for (const textSize of [1, 1.15, 1.3]) {
        await page.evaluate(textSize => { farm.closeCards(); farm.panels.close(); farm.game.do('setting', { key: 'textSize', value: textSize }); }, textSize);
        const result = await page.evaluate(async lines => {
          const people = farm.people, walker = people.walkers.get('ada');
          const frame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          // Measure authored speech in the real font, including the introduction + advice used by juneTip().
          // Pick by rendered height, because the longest English string need not be the tallest CJK bubble.
          let longest = lines[0], height = 0;
          for (const line of lines) {
            people.say(walker, line, 60000);
            const measured = walker.bubble.getBoundingClientRect().height;
            if (measured > height) { height = measured; longest = line; }
          }
          const edges = [];
          for (const [edge, x, y] of [['left', -30, innerHeight / 2], ['right', innerWidth + 30, innerHeight / 2], ['top', innerWidth / 2, -30], ['bottom', innerWidth / 2, innerHeight + 30]]) {
            farm.view(30, walker.x, walker.z); await frame();
            const here = people.screenOf(walker);
            farm.world.cam.panPixels(x - here.x, y - here.y); await frame();
            people.say(walker, longest, 60000); await frame(); people.placeBubbles();
            const el = walker.bubble, r = el.getBoundingClientRect(), projected = people.screenOf(walker);
            const range = document.createRange(); range.selectNodeContents(el); const text = range.getBoundingClientRect();
            edges.push({ edge, projected, rect: r.toJSON(), readable: el.checkVisibility() && el.textContent.endsWith(longest),
              overflow: text.left < r.left - 1 || text.right > r.right + 1 || text.top < r.top - 1 || text.bottom > r.bottom + 1 });
          }
          return { height, edges };
        }, spokenLines(language));
        for (const { edge, projected, rect, readable, overflow } of result.edges) {
          if (!readable || overflow || rect.left < -1 || rect.right > viewport.width + 1 || rect.top < -1 || rect.bottom > viewport.height + 1)
            throw Error(`${language} ${textSize} ${edge}: unreadable/clipped speech ${JSON.stringify({ rect, readable, overflow, height: result.height })}`);
          const reached = edge === 'left' ? projected.x < 0 : edge === 'right' ? projected.x > viewport.width : edge === 'top' ? projected.y < 0 : projected.y > viewport.height;
          if (!reached) throw Error(`camera did not exercise the ${edge} edge: ${JSON.stringify(projected)}`);
        }
        await page.screenshot({ path: join(shots, `${language}-${viewport.width}-${textSize}.png`) });
      }
      if (errors.length) throw Error(errors.join('\n'));
      console.log(`ok   longest authored speech fits four screen edges at 100/115/130% (${language}, ${viewport.width}x${viewport.height})`);
    } catch (error) {
      failures++; await page.screenshot({ path: join(shots, `failure-${language}-${viewport.width}.png`) });
      console.log(`FAIL speech bounds (${language}, ${viewport.width})\n${error.stack}`);
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
console.log(`${checks - failures}/${checks} multilingual speech bounds checks passed.`);
process.exitCode = failures ? 1 : 0;
