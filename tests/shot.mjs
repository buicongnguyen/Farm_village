import { chromium } from 'playwright';
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const dev = process.argv[2] === 'pc' ? { viewport: { width: 1280, height: 800 } } : { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const p = await (await b.newContext(dev)).newPage(); const errs = []; p.on('console', m => m.type() === 'error' && errs.push(m.text()));
await p.goto((process.env.GAME_URL ?? 'http://127.0.0.1:5241/') + (process.argv[4] ?? '')); await p.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
if (process.argv[5]) await p.evaluate(process.argv[5]);
await p.waitForTimeout(1500); await p.screenshot({ path: process.argv[3] }); console.log(errs.join('\n') || 'no errors'); await b.close();
