// The game camera: a fixed tilted orthographic view (DESIGN 3.2), pan, zoom and 90° turns, on phone and PC.
// Proven in prototypes/big-farm. `span` is the visible ground along the longer side of the screen, in metres.
// Feel (juice package): a drag that is let go keeps gliding and slows down (fling); dragging or zooming past the edges
// gives way softly and springs back (rubber band); flyTo() eases the view to a place (the guide, notifications).
// panPixels(), zoom() and lookAt() stay immediate and hard-clamped, so scripts and tests land exactly where they ask.
import * as THREE from 'three';

export const PITCH = 0.95;               // about 54° down
export const SPAN = { min: 24, max: 260, mid: 55, far: 110 };
const RUBBER = 0.35;                     // how far past an edge a drag may go, as a share of the view
const easeInOut = k => k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;

export class GameCamera {
  constructor({ x = 0, z = 0, span = 60, bounds = { x0: 0, z0: 0, x1: 256, z1: 256 } } = {}) {
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 1000);
    Object.assign(this, { x, z, span, yaw: Math.PI / 4, bounds, listeners: new Set(), vx: 0, vz: 0, flight: null, soft: false, raf: 0, dragging: false });
    this.update();
  }
  /** 0 = full models, 1 = simplified models, 2 = stand-ins (TECH-PLAN 6). */
  get lod() { return this.span > SPAN.far ? 2 : this.span > SPAN.mid ? 1 : 0; }
  onChange(f) { this.listeners.add(f); return () => this.listeners.delete(f); }
  /** Apply the view. While a finger drags (soft), the edges give way with resistance instead of stopping hard. */
  update() {
    const b = this.bounds;
    if (this.soft) {
      const room = this.span * RUBBER, give = (val, lo, hi) => val < lo ? lo - room * (1 - 1 / (1 + (lo - val) / room)) : val > hi ? hi + room * (1 - 1 / (1 + (val - hi) / room)) : val;
      this.shown = { x: give(this.x, b.x0, b.x1), z: give(this.z, b.z0, b.z1), span: this.span < SPAN.min ? SPAN.min * (1 - 0.15 * (1 - 1 / (1 + (SPAN.min - this.span) / SPAN.min * 4))) : this.span > SPAN.max ? SPAN.max * (1 + 0.15 * (1 - 1 / (1 + (this.span - SPAN.max) / SPAN.max * 4))) : this.span };
    } else {
      this.span = Math.min(SPAN.max, Math.max(SPAN.min, this.span));
      this.x = Math.min(b.x1, Math.max(b.x0, this.x)); this.z = Math.min(b.z1, Math.max(b.z0, this.z));
      this.shown = { x: this.x, z: this.z, span: this.span };
    }
    const { x, z, span } = this.shown;
    const w = globalThis.innerWidth ?? 1280, h = globalThis.innerHeight ?? 800, aspect = w / h;
    const vw = aspect >= 1 ? span : span * aspect, vh = vw / aspect, c = this.camera, d = 300;
    Object.assign(c, { left: -vw / 2, right: vw / 2, top: vh / 2, bottom: -vh / 2 }); c.updateProjectionMatrix();
    c.position.set(x + Math.sin(this.yaw) * Math.cos(PITCH) * d, Math.sin(PITCH) * d, z + Math.cos(this.yaw) * Math.cos(PITCH) * d);
    c.lookAt(x, 0, z);
    for (const f of this.listeners) f(this);
  }
  /** Ground metres moved by a screen drag of (dx, dy) pixels. */
  pixelsToGround(dx, dy) {
    const mpp = (this.camera.right - this.camera.left) / (globalThis.innerWidth ?? 1280), s = Math.sin(this.yaw), c = Math.cos(this.yaw), k = 1 / Math.sin(PITCH);
    return [-(dx * c + dy * s * k) * mpp, -(-dx * s + dy * c * k) * mpp];
  }
  panPixels(dx, dy) { const [gx, gz] = this.pixelsToGround(dx, dy); this.stop(); this.soft = false; this.x += gx; this.z += gz; this.update(); }
  zoom(factor) { this.stop(); this.soft = false; this.span *= factor; this.update(); }
  turn(steps = 1) { this.stop(); this.yaw += steps * Math.PI / 2; this.update(); }
  lookAt(x, z, span = this.span) { this.stop(); this.soft = false; Object.assign(this, { x, z, span }); this.update(); }
  /** Ease the view to (x, z) and a span over ms (the guide and notifications). Resolves when it arrives or is cut short. */
  flyTo(x, z, span = this.span, ms = 900) {
    this.stop();
    const reduced = globalThis.document?.body?.classList.contains('reduced-motion');
    if (reduced || ms <= 0) { this.lookAt(x, z, span); return Promise.resolve(true); }
    return new Promise(done => { this.flight = { from: { x: this.x, z: this.z, span: this.span }, to: { x, z, span }, t0: performance.now(), ms, done }; this.kick(); });
  }
  /** Stop gliding and flying (a new touch, a script). */
  stop() {
    this.vx = this.vz = 0;
    if (this.flight) { const f = this.flight; this.flight = null; f.done(false); }
  }
  get moving() { return !!this.flight || Math.hypot(this.vx, this.vz) > this.span * 0.01 || this.outside(); }
  outside() { const b = this.bounds; return this.x < b.x0 || this.x > b.x1 || this.z < b.z0 || this.z > b.z1 || this.span < SPAN.min || this.span > SPAN.max; }
  /** Run the glide, the spring back and flights on their own frames, only while something moves. */
  kick() {
    if (this.raf || typeof requestAnimationFrame !== 'function') return;
    let last = performance.now();
    const step = now => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      this.raf = 0;
      if (this.dragging) return;
      this.step(dt, now);
      if (this.moving) this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }
  step(dt, now = performance.now()) {
    if (this.flight) {
      const f = this.flight, k = Math.min(1, (now - f.t0) / f.ms), e = easeInOut(k);
      // zoom out a little in the middle of a long flight, so the player sees where they go
      const far = Math.hypot(f.to.x - f.from.x, f.to.z - f.from.z), lift = Math.min(0.35, far / Math.max(f.from.span, 1) * 0.12) * Math.sin(Math.PI * e);
      this.x = f.from.x + (f.to.x - f.from.x) * e; this.z = f.from.z + (f.to.z - f.from.z) * e;
      this.span = (f.from.span + (f.to.span - f.from.span) * e) * (1 + lift);
      this.soft = false; this.update();
      if (k >= 1) { this.flight = null; f.done(true); }
      return;
    }
    const b = this.bounds;
    this.x += this.vx * dt; this.z += this.vz * dt;
    const damp = Math.exp(-dt * 4.2); this.vx *= damp; this.vz *= damp;
    // spring back inside the edges, snapping the last few centimetres
    const back = (val, lo, hi, eps) => {
      if (val >= lo && val <= hi) return val;
      const edge = val < lo ? lo : hi, next = edge + (val - edge) * Math.exp(-dt * 12);
      return Math.abs(next - edge) < eps ? edge : next;
    };
    const nx = back(this.x, b.x0, b.x1, 0.02), nz = back(this.z, b.z0, b.z1, 0.02);
    if (nx !== this.x) { this.vx = 0; this.x = nx; }
    if (nz !== this.z) { this.vz = 0; this.z = nz; }
    this.span = back(this.span, SPAN.min, SPAN.max, 0.05);
    this.soft = this.outside(); this.update();
    if (!this.moving) { this.vx = this.vz = 0; this.soft = false; this.update(); }
  }
  /** Pointer, wheel and key controls on an element. Taps (little movement) are passed to onTap(clientX, clientY). */
  attach(el, { onTap } = {}) {
    // dragHook (optional): { start(x, y) → true to take the drag (e.g. sweeping across beds), move(x, y), end() }
    const pointers = new Map(); let pinch = 0, moved = 0, hooked = false, track = [];
    const reduced = () => globalThis.document?.body?.classList.contains('reduced-motion');
    // A touch tap is followed by the browser's compatibility click at the same spot, after onTap has already opened a menu
    // or panel under the finger: that click would press whatever sprang up there (plant the dearest crop, harvest, buy).
    // Swallow the one click that follows a recognised touch tap; the next real press (its own pointerdown) is never touched.
    let ghostUntil = 0;
    globalThis.document?.addEventListener('pointerdown', () => { ghostUntil = 0; }, true);
    globalThis.document?.addEventListener('click', e => { if (performance.now() < ghostUntil) { ghostUntil = 0; e.preventDefault(); e.stopPropagation(); } }, true);
    el.addEventListener('pointerdown', e => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0; el.setPointerCapture?.(e.pointerId);
      this.stop(); this.dragging = true; track = [];
      hooked = pointers.size === 1 && !!this.dragHook?.start(e.clientX, e.clientY);
    });
    el.addEventListener('pointermove', e => {
      const p = pointers.get(e.pointerId); if (!p) return;
      if (hooked) { this.dragHook.move(e.clientX, e.clientY); p.x = e.clientX; p.y = e.clientY; return; }
      const dx = e.clientX - p.x, dy = e.clientY - p.y; moved += Math.abs(dx) + Math.abs(dy);
      if (pointers.size === 1 && moved > 6) {
        const [gx, gz] = this.pixelsToGround(dx, dy);
        this.x += gx; this.z += gz; this.soft = true; this.update();
        const now = performance.now(); track.push({ t: now, gx, gz }); while (track.length && now - track[0].t > 90) track.shift();
      }
      p.x = e.clientX; p.y = e.clientY;
      if (pointers.size === 2) { const [a, b] = [...pointers.values()], dist = Math.hypot(a.x - b.x, a.y - b.y); if (pinch) { this.span *= pinch / dist; this.soft = true; this.update(); } pinch = dist; track = []; }
    });
    const up = e => {
      if (hooked) { hooked = false; pointers.delete(e.pointerId); this.dragging = false; this.dragHook.end(); return; }
      const tap = pointers.size === 1 && moved <= 6; pointers.delete(e.pointerId); pinch = 0;
      if (tap && e.type === 'pointerup') { if (e.pointerType !== 'mouse') ghostUntil = performance.now() + 700; onTap?.(e.clientX, e.clientY); }
      if (pointers.size) return;
      this.dragging = false;
      // fling: the speed of the last ~90 ms of the drag carries on and slows down
      const now = performance.now(), recent = track.filter(s => now - s.t < 90);
      if (!tap && recent.length >= 2 && !reduced()) {
        const span = Math.max(16, now - recent[0].t) / 1000; let gx = 0, gz = 0; for (const s of recent) { gx += s.gx; gz += s.gz; }
        const vx = gx / span, vz = gz / span, sp = Math.hypot(vx, vz), max = this.span * 1.6;
        if (sp > this.span * 0.15) { const k = Math.min(1, max / sp); this.vx = vx * k; this.vz = vz * k; }
      }
      track = [];
      if (this.moving) this.kick(); else if (this.soft) { this.soft = false; this.update(); }
    };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', e => {
      e.preventDefault(); this.stop();
      const f = e.deltaY > 0 ? 1.12 : 1 / 1.12, next = this.span * f;
      // past the zoom limits the wheel meets a soft wall and springs back
      if (next > SPAN.max || next < SPAN.min) { this.span = next > SPAN.max ? Math.min(next, SPAN.max * 1.12) : Math.max(next, SPAN.min / 1.12); this.soft = true; this.update(); this.kick(); }
      else this.zoom(f);
    }, { passive: false });
    addEventListener('keydown', e => {
      if (e.target?.closest?.('input, textarea')) return;
      const step = 40, k = e.key.toLowerCase();
      if (k === 'w' || k === 'arrowup') this.panPixels(0, step); else if (k === 's' || k === 'arrowdown') this.panPixels(0, -step);
      else if (k === 'a' || k === 'arrowleft') this.panPixels(step, 0); else if (k === 'd' || k === 'arrowright') this.panPixels(-step, 0);
      else if (k === 'q') this.turn(-1); else if (k === 'e') this.turn(1);
      else if (k === '+' || k === '=') this.zoom(1 / 1.25); else if (k === '-') this.zoom(1.25);
    });
    addEventListener('resize', () => this.update());
  }
}
