// Measures the big-farm prototype at phone and PC sizes, three zoom levels and four set-ups.
// Usage: node prototypes/big-farm/measure.mjs   (server: npm run proto; URL override: PROTO_URL)
// GPU=0 uses the software renderer instead of the real GPU.
// The phone runs slow the CPU down 4× to stand in for a mid-range phone; the GPU cannot be slowed, so draw calls and
// triangles are reported against the phone budgets (TECH-PLAN section 6) instead.
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const base = process.env.PROTO_URL ?? 'http://127.0.0.1:5240/prototypes/big-farm/';
const gpu = process.env.GPU !== '0';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: gpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] : ['--enable-unsafe-swiftshader'] });
const devices = {
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, cpu: 4 },
  pc: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, cpu: 1 },
};
const setups = { fields: '', dense: '?dense', 'dense, chunks 32': '?dense&chunk=32', 'dense, no LOD': '?dense&nolod', 'dense, no chunks': '?dense&nochunk' };
if (process.env.SETUPS) for (const k of Object.keys(setups)) delete setups[k], Object.assign(setups, JSON.parse(process.env.SETUPS));
if (process.env.DEVICES) for (const k of Object.keys(devices)) if (!process.env.DEVICES.split(',').includes(k)) delete devices[k];
const zooms = { near: 40, mid: 90, far: 200 };
const out = new URL('./shots/', import.meta.url);
await mkdir(out, { recursive: true });
const rows = [];
for (const [dname, d] of Object.entries(devices)) for (const [sname, q] of Object.entries(setups)) {
  const ctx = await browser.newContext(d), page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  if (d.cpu > 1) { const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: d.cpu }); }
  const t0 = Date.now();
  await page.goto(base + q); await page.waitForFunction(() => window.bench?.ready, null, { timeout: 120000 });
  const load = Date.now() - t0, info = await page.evaluate(() => ({ crops: bench.crops, objects: bench.objects, batches: bench.batches }));
  for (const [zname, span] of Object.entries(zooms)) {
    await page.evaluate(([s, far]) => far ? bench.setView(s, 128, 128) : bench.setView(s, bench.farm.x, bench.farm.z), [span, zname === 'far']);
    const r = await page.evaluate(() => bench.measure(3000));
    rows.push({ device: dname, setup: sname, zoom: `${zname} (${span} m)`, ...info, loadMs: load, ...r });
    if (sname === 'fields' || sname === 'dense') await page.screenshot({ path: fileURLToPath(new URL(`${dname}-${sname}-${zname}.png`, out)) });
    console.log(dname.padEnd(6), sname.padEnd(20), zname.padEnd(5), `${String(r.fps).padStart(3)} fps  p95 ${String(r.p95ms).padStart(5)} ms  cpu ${String(r.cpuMs).padStart(5)} ms  ${String(r.draws).padStart(4)} draws  ${String(Math.round(r.tris / 1000)).padStart(5)}k tris`);
  }
  if (errors.length) console.log('  errors:', errors.slice(0, 3));
  await ctx.close();
}
await browser.close();
await writeFile(new URL('./results.json', import.meta.url), JSON.stringify({ when: new Date().toISOString(), gpu, rows }, null, 1));
