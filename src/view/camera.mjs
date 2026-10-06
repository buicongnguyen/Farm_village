// The game camera: a fixed tilted orthographic view (DESIGN 3.2), pan, zoom and 90° turns, on phone and PC.
// Proven in prototypes/big-farm. `span` is the visible ground along the longer side of the screen, in metres.
import * as THREE from 'three';

export const PITCH = 0.95;               // about 54° down
export const SPAN = { min: 24, max: 260, mid: 55, far: 110 };

export class GameCamera {
  constructor({ x = 0, z = 0, span = 60, bounds = { x0: 0, z0: 0, x1: 256, z1: 256 } } = {}) {
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 1000);
    Object.assign(this, { x, z, span, yaw: Math.PI / 4, bounds, listeners: new Set() });
    this.update();
  }
  /** 0 = full models, 1 = simplified models, 2 = stand-ins (TECH-PLAN 6). */
  get lod() { return this.span > SPAN.far ? 2 : this.span > SPAN.mid ? 1 : 0; }
  onChange(f) { this.listeners.add(f); return () => this.listeners.delete(f); }
  update() {
    const b = this.bounds;
    this.span = Math.min(SPAN.max, Math.max(SPAN.min, this.span));
    this.x = Math.min(b.x1, Math.max(b.x0, this.x)); this.z = Math.min(b.z1, Math.max(b.z0, this.z));
    const w = globalThis.innerWidth ?? 1280, h = globalThis.innerHeight ?? 800, aspect = w / h;
    const vw = aspect >= 1 ? this.span : this.span * aspect, vh = vw / aspect, c = this.camera, d = 300;
    Object.assign(c, { left: -vw / 2, right: vw / 2, top: vh / 2, bottom: -vh / 2 }); c.updateProjectionMatrix();
    c.position.set(this.x + Math.sin(this.yaw) * Math.cos(PITCH) * d, Math.sin(PITCH) * d, this.z + Math.cos(this.yaw) * Math.cos(PITCH) * d);
    c.lookAt(this.x, 0, this.z);
    for (const f of this.listeners) f(this);
  }
  panPixels(dx, dy) {
    const mpp = (this.camera.right - this.camera.left) / (globalThis.innerWidth ?? 1280), s = Math.sin(this.yaw), c = Math.cos(this.yaw), k = 1 / Math.sin(PITCH);
    this.x -= (dx * c + dy * s * k) * mpp; this.z -= (-dx * s + dy * c * k) * mpp; this.update();
  }
  zoom(factor) { this.span *= factor; this.update(); }
  turn(steps = 1) { this.yaw += steps * Math.PI / 2; this.update(); }
  lookAt(x, z, span = this.span) { Object.assign(this, { x, z, span }); this.update(); }
  /** Pointer, wheel and key controls on an element. Taps (little movement) are passed to onTap(clientX, clientY). */
  attach(el, { onTap } = {}) {
    const pointers = new Map(); let pinch = 0, moved = 0;
    el.addEventListener('pointerdown', e => { pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0; el.setPointerCapture?.(e.pointerId); });
    el.addEventListener('pointermove', e => {
      const p = pointers.get(e.pointerId); if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y; moved += Math.abs(dx) + Math.abs(dy);
      if (pointers.size === 1 && moved > 6) this.panPixels(dx, dy);
      p.x = e.clientX; p.y = e.clientY;
      if (pointers.size === 2) { const [a, b] = [...pointers.values()], dist = Math.hypot(a.x - b.x, a.y - b.y); if (pinch) this.zoom(pinch / dist); pinch = dist; }
    });
    const up = e => { const tap = pointers.size === 1 && moved <= 6; pointers.delete(e.pointerId); pinch = 0; if (tap && e.type === 'pointerup') onTap?.(e.clientX, e.clientY); };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', e => { e.preventDefault(); this.zoom(e.deltaY > 0 ? 1.12 : 1 / 1.12); }, { passive: false });
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
