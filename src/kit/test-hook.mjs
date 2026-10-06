// window.farm: the browser-test hook. Only in builds made with --test-mode (TEST_MODE is false in public builds, so
// esbuild leaves this file out of them entirely).
export function installTestHook(parts) {
  const { world } = parts;
  window.farm = {
    ready: true,
    ...parts,
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
