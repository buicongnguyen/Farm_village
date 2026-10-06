// Builds the game into dist/ (adapted from Willowmere's scripts/build.mjs).
//   node scripts/build.mjs               production build; fails above the first-load budget
//   node scripts/build.mjs --test-mode   includes test mode (window.farm hook, the test panel); never deploy this
//   node scripts/build.mjs --serve       watch and serve on 127.0.0.1:5240 (add --test-mode for the hook)
import { build, context } from 'esbuild';
import { mkdir, cp, copyFile, readFile, writeFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const serve = process.argv.includes('--serve'), testMode = process.argv.includes('--test-mode');
const PORT = +(process.env.PORT ?? 5240);
await rm('dist', { recursive: true, force: true });
await mkdir('dist/assets', { recursive: true });
await cp('public', 'dist', { recursive: true });
await copyFile('index.html', 'dist/index.html');
const options = {
  entryPoints: { game: 'src/main.mjs' }, bundle: true, outdir: 'dist/assets', splitting: true, chunkNames: 'chunk-[hash]',
  metafile: true, format: 'esm', target: 'es2022', charset: 'utf8', minify: !serve, sourcemap: serve, logLevel: 'info',
  loader: { '.woff2': 'file' }, define: { TEST_MODE: String(testMode) },
};
if (serve) {
  const ctx = await context(options); await ctx.watch();
  const server = await ctx.serve({ servedir: 'dist', host: '127.0.0.1', port: PORT });
  console.log(`Farm Village${testMode ? ' (test mode)' : ''} at http://${server.hosts[0]}:${server.port}/`);
} else {
  const { metafile } = await build(options);
  // What is read before the first frame: game.js and every chunk it imports statically. Chunks behind import() are not.
  const first = new Set(), lazy = new Set();
  const walk = file => { if (first.has(file)) return; first.add(file); for (const i of metafile.outputs[file].imports) if (i.kind === 'import-statement') walk(i.path); else if (i.kind === 'dynamic-import') lazy.add(i.path); };
  walk('dist/assets/game.js'); for (const file of first) lazy.delete(file);
  const LIMIT = 1_100_000, sizeOf = files => [...files].reduce((n, f) => n + metafile.outputs[f].bytes, 0), size = sizeOf(first);
  console.log(`first load: ${size.toLocaleString('en-US')} bytes of code (limit ${LIMIT.toLocaleString('en-US')}); ${sizeOf(lazy).toLocaleString('en-US')} bytes loaded later${testMode ? ' — TEST MODE build, do not deploy' : ''}`);
  if (size > LIMIT) { console.error(`The first load is ${(size - LIMIT).toLocaleString('en-US')} bytes over the limit: move code behind import().`); process.exit(1); }
  // The page names the exact bundle it was built with, so a cached old game.js is never paired with new styles.
  const stamp = createHash('sha1').update(await readFile('dist/assets/game.js')).update(await readFile('dist/assets/game.css').catch(() => '')).digest('hex').slice(0, 10);
  const page = await readFile('dist/index.html', 'utf8');
  await writeFile('dist/index.html', page.replace('./assets/game.css"', `./assets/game.css?v=${stamp}"`).replace("'./assets/game.js'", `'./assets/game.js?v=${stamp}'`));
}
