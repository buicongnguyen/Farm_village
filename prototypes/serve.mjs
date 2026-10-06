// A tiny static server for the prototypes, rooted at the repository (so /node_modules/three resolves).
// Usage: node prototypes/serve.mjs [port]   then open http://127.0.0.1:<port>/prototypes/big-farm/
// HOST=0.0.0.0 node prototypes/serve.mjs   lets a phone on the same Wi-Fi open http://<this PC's IP>:<port>/prototypes/big-farm/
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const port = +(process.argv[2] ?? 5240);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.glb': 'model/gltf-binary', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css' };
createServer(async (req, res) => {
  let path = normalize(join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
  if (!path.startsWith(root)) { res.writeHead(403).end(); return; }
  try { if ((await stat(path)).isDirectory()) path = join(path, 'index.html'); res.writeHead(200, { 'content-type': types[extname(path)] ?? 'application/octet-stream', 'cache-control': 'no-store' }).end(await readFile(path)); }
  catch { res.writeHead(404).end('not found'); }
}).listen(port, process.env.HOST ?? '127.0.0.1', () => console.log(`http://${process.env.HOST ?? '127.0.0.1'}:${port}/prototypes/big-farm/`));
