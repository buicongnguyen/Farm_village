// Keeps recently published chunks in the next deploy (run in CI after `npm run build`, before the Pages upload).
// Adapted from Willowmere: a tab opened before a release may still ask for old chunk-<hash>.js files, so every chunk
// published in the last KEEP_DAYS days is carried into the new deploy. The list lives on the site as assets/chunks.json.
// Network trouble never fails a deploy: the build is published as it is, with a warning.
//   SITE_URL=https://<user>.github.io/<repo> node scripts/keep-chunks.mjs
import { readdir, writeFile, stat } from 'node:fs/promises';

const SITE = (process.argv[2] ?? process.env.SITE_URL ?? '').replace(/\/$/, '');
const KEEP_DAYS = 7, DIR = 'dist/assets', CHUNK = /^chunk-[A-Z0-9]+\.js$/;
const now = new Date(), cutoff = now.getTime() - KEEP_DAYS * 864e5;
const built = new Set((await readdir(DIR)).filter(f => CHUNK.test(f)));
const get = async (path, type = 'text') => { const r = await fetch(`${SITE}/${path}`, { cache: 'no-store' }); if (!r.ok) throw new Error(`${r.status} ${path}`); return type === 'text' ? r.text() : Buffer.from(await r.arrayBuffer()); };
let kept = {};
if (!SITE) console.warn('keep-chunks: no SITE_URL; publishing this build only.');
else try { kept = JSON.parse(await get('assets/chunks.json')); } catch (error) { console.warn(`keep-chunks: no chunk list on the site yet (${error.message}).`); }
let added = 0, failed = 0;
const next = {};
for (const [name, since] of Object.entries(kept)) {
  if (!CHUNK.test(name) || !(Date.parse(since) >= cutoff)) continue;
  next[name] = since;
  if (built.has(name)) continue;
  try { await writeFile(`${DIR}/${name}`, await get(`assets/${name}`, 'buffer')); added++; } catch { failed++; delete next[name]; }
}
for (const name of built) next[name] ??= now.toISOString();
await writeFile(`${DIR}/chunks.json`, JSON.stringify(next));
let total = 0; for (const name of Object.keys(next)) total += (await stat(`${DIR}/${name}`)).size;
console.log(`keep-chunks: ${built.size} built, ${added} kept from earlier deploys${failed ? `, ${failed} gone` : ''}; ${Object.keys(next).length} chunks, ${(total / 1e6).toFixed(2)} MB.`);
