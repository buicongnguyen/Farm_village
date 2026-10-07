// In-engine contact sheets of kit pieces: every root of the given kits drawn with the game's own bake (vertex colours,
// baked AO), toon material, lights and camera angle, on grass, with labels. No server needed (Playwright serves the
// repository files through page.route).
//
//   node art/blender/sheet.mjs <out.png> <kit>[:<filter regex>] ... [--cols 8] [--cell 6] [--size 1800x1200] [--compare town:house_gable]
//
// Examples:
//   node art/blender/sheet.mjs sheet.png farm-kit decor
//   node art/blender/sheet.mjs crops.png "farm-kit:^crop_" --cols 6 --cell 2.4
//   node art/blender/sheet.mjs style.png "town:^house_gable$@w5.6" "nature:^tree_apple$@w3.4" --game   (game sizes and camera yaw)
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { resolve, dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2), out = args.shift();
const opt = (k, d) => { const i = args.indexOf(k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const cols = +opt('--cols', 8), cell = +opt('--cell', 6), [W, H] = opt('--size', '1800x1200').split('x').map(Number), night = args.includes('--night');
const game = args.includes('--game');
const kits = args.filter(a => !a.startsWith('--')).map(a => {
  const [spec, size] = a.split('@'), [kit, filter] = spec.split(':');
  const fit = !size ? { scale: 1 } : size[0] === 'w' ? { width: +size.slice(1) } : { height: +size.slice(1) };
  return { kit, filter: filter ?? '', fit };
});
const TYPES = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.glb': 'model/gltf-binary', '.html': 'text/html' };
const page_ = `<!doctype html><html><head><style>body{margin:0;background:#86c55e;font:600 13px system-ui}#l div{position:absolute;transform:translate(-50%,0);
color:#1d2a12;background:#fffbe9cc;border-radius:6px;padding:1px 5px;white-space:nowrap}</style>
<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script></head>
<body><div id="l"></div><script type="module">
import * as THREE from 'three';
import { loadKit, tiers } from '/src/view/models.mjs';
import { toon, addLights } from '/src/kit/toon.mjs';
const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setSize(${W}, ${H}); document.body.appendChild(r.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(${night ? "'#0b1530'" : "'#9fd3f0'"}); addLights(scene);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000).rotateX(-Math.PI / 2), new THREE.MeshToonMaterial({ color: '#7cc95a' })); scene.add(ground);
const items = [];
for (const { kit, filter, fit } of ${JSON.stringify(kits)}) {
  const k = await loadKit(kit), re = new RegExp(filter);
  for (const name of Object.keys(k)) if (re.test(name)) items.push([kit, name, tiers(k, name, fit).geo]);
}
const C = ${cell}, n = ${cols}, rows = Math.ceil(items.length / n);
items.forEach(([kit, name, geo], i) => {
  const gx = (i % n - (n - 1) / 2) * C, gz = (Math.floor(i / n) - (rows - 1) / 2) * C, yw = ${game ? 'Math.PI / 4' : 0};
  const m = new THREE.Mesh(geo, toon()); m.position.set(gx * Math.cos(yw) + gz * Math.sin(yw), 0, -gx * Math.sin(yw) + gz * Math.cos(yw)); scene.add(m);
  m.userData.label = name + ' ' + (geo.index ? geo.index.count : geo.attributes.position.count) / 3;
});
const span = Math.max(n * C * 1.05, rows * C * 1.5), aspect = ${W} / ${H};
const cam = new THREE.OrthographicCamera(-span / 2, span / 2, span / 2 / aspect, -span / 2 / aspect, 1, 2000);
const yaw = ${game ? 'Math.PI / 4' : 0}, pitch = 0.95;
cam.position.set(Math.sin(yaw) * Math.cos(pitch) * 300, Math.sin(pitch) * 300, Math.cos(yaw) * Math.cos(pitch) * 300); cam.lookAt(0, 0, 0); cam.updateProjectionMatrix();
r.render(scene, cam);
const l = document.getElementById('l');
for (const o of scene.children) if (o.userData.label) { const v = o.position.clone().project(cam); const d = document.createElement('div'); d.textContent = o.userData.label;
  d.style.left = ((v.x + 1) / 2 * ${W}) + 'px'; d.style.top = ((1 - v.y) / 2 * ${H} + 4) + 'px'; l.appendChild(d); }
window.done = true;
</script></body></html>`;
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
page.on('pageerror', e => console.error(e.message)); page.on('console', m => m.type() === 'error' && console.error(m.text()));
await page.route('http://sheet.local/**', async route => {
  const path = new URL(route.request().url()).pathname;
  if (path === '/') return route.fulfill({ body: page_, contentType: 'text/html' });
  const file = path.startsWith('/assets/') ? join(ROOT, 'public', path) : join(ROOT, path);
  try { route.fulfill({ body: await readFile(file), contentType: TYPES[extname(file)] ?? 'application/octet-stream' }); } catch { route.fulfill({ status: 404 }); }
});
await page.goto('http://sheet.local/');
await page.waitForFunction(() => window.done, null, { timeout: 60000 });
await page.screenshot({ path: out });
await browser.close();
console.log('sheet', out);
