// window.farm: the browser-test hook. Only in builds made with --test-mode (TEST_MODE is false in public builds, so
// esbuild leaves this file out of them entirely).
export function installTestHook(parts) {
  const { world } = parts;
  window.farm = {
    ready: true,
    ...parts,
    info: () => world.info(),
    view: (span, x, z) => world.cam.lookAt(x ?? world.cam.x, z ?? world.cam.z, span),
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
