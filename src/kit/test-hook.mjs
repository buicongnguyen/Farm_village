// window.farm: the browser-test hook. Only in builds made with --test-mode (TEST_MODE is false in public builds, so
// esbuild leaves this file out of them entirely).
import { touch } from '../core/grid.mjs';
export function installTestHook(parts) {
  const { world } = parts;
  window.farm = {
    ready: true,
    ...parts,
    get pondFish() { return world.pondFish; },
    info: () => world.info(),
    view: (span, x, z) => world.cam.lookAt(x ?? world.cam.x, z ?? world.cam.z, span),
    /** Screen position (CSS pixels) of the middle of cell (x, z), or of a point inside it (fx, fz in 0–1). */
    cellToScreen(x, z, fx = 0.5, fz = 0.5) {
      const v = new world.cam.camera.position.constructor((x + fx) * 2, 0, (z + fz) * 2).project(world.cam.camera);
      return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight };
    },
    /** Centre the camera on a cell. */
    focus(x, z, span = 40) { world.cam.lookAt((x + 0.5) * 2, (z + 0.5) * 2, span); },
    /** Put cell (x, z) in the middle of the part of the screen that menus do not cover. */
    focusVisible(x, z) {
      world.cam.lookAt((x + 0.5) * 2, (z + 0.5) * 2);
      const sheet = document.querySelector('.sheet:not([hidden])')?.getBoundingClientRect(), bar = document.querySelector('.place-bar:not([hidden])')?.getBoundingClientRect();
      let left = 0, right = innerWidth, bottom = innerHeight;
      if (sheet) { if (sheet.left > innerWidth * 0.3) right = sheet.left; else bottom = sheet.top; }
      if (bar && bar.top < bottom && bar.bottom > bottom - 80) bottom = Math.min(bottom, bar.top);
      const target = { x: (left + right) / 2, y: Math.min(bottom * 0.5, bottom - 90) }, here = this.cellToScreen(x, z);
      world.cam.panPixels(target.x - here.x, target.y - here.y);
    },
    state: () => parts.game?.s,
    /** Close the story cards and end the tutorial (for checks that are not about the first session). */
    skipIntro() { parts.game.do('tutorial', { skip: true }); this.closeCards(); },
    /** Close every story, level-up and letter card on screen (with its last button: Continue, never "Show me"). */
    closeCards() { for (let i = 0; i < 12; i++) { const b = [...document.querySelectorAll('.modal [data-close]')].pop(); if (!b) break; b.click(); } },
    /** Run the game clock ahead by ms (kept for this tab across reloads). */
    setClockOffset(ms) { sessionStorage.setItem('fv-clock-offset', String(ms)); parts.game.clock = () => Date.now() + ms; parts.game.tick(); },
    /** The budget test (TECH-PLAN 6): own all 16 parcels and fill them with 4 × 4 fields of crops at mixed stages. */
    fillFarm() {
      const s = parts.game.s, now = parts.game.now, crops = ['wheat', 'carrot', 'corn', 'pumpkin'], grow = { wheat: 120e3, carrot: 300e3, corn: 900e3, pumpkin: 3600e3 };
      s.parcels = []; for (let px = 0; px < 4; px++) for (let pz = 0; pz < 4; pz++) s.parcels.push(`${px},${pz}`);
      let n = 0;
      for (let z = 24; z < 88; z++) for (let x = 32; x < 96; x++) {
        if ((x - 32) % 5 === 4 || (z - 24) % 5 === 4) { s.cells[z * 128 + x] = 3; continue; }   // paths between fields
        const field = Math.floor((x - 32) / 5) * 31 + Math.floor((z - 24) / 5) * 17, crop = crops[field % 4], stage = (field % 7) / 6;
        const id = `p${s.nextId++}`; s.placed[id] = { kind: 'bed', x, z, rot: 0 }; s.cells[z * 128 + x] = 4;
        s.beds[id] = { crop, doneAt: now + grow[crop] * (1 - stage) }; n++;
      }
      s.counts.bed = n; touch(s); parts.game.emit({ ok: true, events: [{ type: 'loaded' }] }, 'test');
      return n;
    },
    /** Average frame time and draw statistics over `ms` of real rendering. */
    async measure(ms = 2000) {
      const dts = []; let last = performance.now();
      const off = world.onFrame(() => { const now = performance.now(); dts.push(now - last); last = now; });
      await new Promise(r => setTimeout(r, ms)); off();
      const avg = dts.reduce((a, b) => a + b, 0) / Math.max(1, dts.length);
      return { fps: Math.round(1000 / avg), ...world.info() };
    },
  };
}
