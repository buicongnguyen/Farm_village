// Serves dist/ for browser tests: node scripts/serve-dist.mjs [port]   (default 5241; HOST=0.0.0.0 for a phone on Wi-Fi)
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
const root = resolve('dist'), port = +(process.argv[2] ?? 5241), host = process.env.HOST ?? '127.0.0.1';
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
createServer(async (req, res) => {
  let path = normalize(join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
  if (!path.startsWith(root)) { res.writeHead(403).end(); return; }
  try { if ((await stat(path)).isDirectory()) path = join(path, 'index.html'); res.writeHead(200, { 'content-type': types[extname(path)] ?? 'application/octet-stream' }).end(await readFile(path)); }
  catch { res.writeHead(404).end('not found'); }
}).listen(port, host, () => console.log(`dist at http://${host}:${port}/`));
