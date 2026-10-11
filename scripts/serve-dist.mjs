// Serves dist/ for browser tests: node scripts/serve-dist.mjs [port]   (default 5241; HOST=0.0.0.0 for a phone on Wi-Fi)
// Text files (code, styles, pages, JSON, SVG) are sent gzipped when the browser accepts it, as GitHub Pages sends
// them, so the loading check in tests/browser.mjs measures what players download. GZIP=0 turns it off.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
const root = resolve('dist'), port = +(process.argv[2] ?? 5241), host = process.env.HOST ?? '127.0.0.1';
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const TEXT = new Set(['.html', '.js', '.css', '.json', '.svg']), zipped = new Map();   // path → { mtimeMs, body }
createServer(async (req, res) => {
  let path = normalize(join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
  if (!path.startsWith(root)) { res.writeHead(403).end(); return; }
  try {
    let info = await stat(path); if (info.isDirectory()) { path = join(path, 'index.html'); info = await stat(path); }
    const head = { 'content-type': types[extname(path)] ?? 'application/octet-stream' };
    if (process.env.GZIP !== '0' && TEXT.has(extname(path)) && /\bgzip\b/.test(req.headers['accept-encoding'] ?? '')) {
      let hit = zipped.get(path);
      if (!hit || hit.mtimeMs !== info.mtimeMs) { hit = { mtimeMs: info.mtimeMs, body: gzipSync(await readFile(path)) }; zipped.set(path, hit); }
      res.writeHead(200, { ...head, 'content-encoding': 'gzip', vary: 'Accept-Encoding' }).end(hit.body); return;
    }
    res.writeHead(200, head).end(await readFile(path));
  } catch { res.writeHead(404).end('not found'); }
}).listen(port, host, () => console.log(`dist at http://${host}:${port}/`));
