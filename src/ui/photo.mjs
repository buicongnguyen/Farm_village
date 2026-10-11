// Photo mode (loaded when first used): the HUD, sheets and guide step aside, the player frames the farm freely (drag,
// pinch, turn), and the shutter saves a picture with a Hollowbrook stamp through canvas.toBlob.
import { t, getLocale } from '../kit/i18n.mjs';
import { sfx } from '../kit/sound.mjs';
import { VILLAGE_NAME } from '../content/story.mjs';
import { glyph } from './icon.mjs';

let el = null;
export function startPhoto({ world, root }) {
  if (el) return;
  document.body.classList.add('photo-mode');
  el = document.createElement('div'); el.className = 'photo';
  el.innerHTML = `<i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>
    <div class="stamp"><b>${t(VILLAGE_NAME)}</b><small>${new Date().toLocaleDateString(getLocale(), { day: 'numeric', month: 'long', year: 'numeric' })}</small></div>
    <div class="photo-bar"><button class="round" data-p="turn" aria-label="${t('Turn the view')}">${glyph('rotate', 'g')}</button>
      <button class="round shutter" data-p="snap" aria-label="${t('Take a photo')}">${glyph('camera', 'g')}</button>
      <button class="round" data-p="close" aria-label="${t('Close')}">${glyph('close', 'g')}</button></div>
    <p class="photo-hint">${t('Drag and pinch to frame your farm')}</p>`;
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-p]'); if (!b) return;
    if (b.dataset.p === 'turn') world.cam.turn(1);
    if (b.dataset.p === 'close') stopPhoto();
    if (b.dataset.p === 'snap') snap(world);
  });
  root.appendChild(el);
}
export function stopPhoto() { el?.remove(); el = null; document.body.classList.remove('photo-mode'); }
/** Draw the next frame into a picture with the stamp, then offer it as a download. */
export function snap(world) {
  const gl = world.renderer.domElement;
  world.renderer.render(world.scene, world.cam.camera);                 // the drawing buffer is only readable right after a render
  const c = document.createElement('canvas'); c.width = gl.width; c.height = gl.height;
  const g = c.getContext('2d'); g.drawImage(gl, 0, 0);
  const k = c.width / innerWidth, pad = 18 * k, name = t(VILLAGE_NAME), date = el?.querySelector('.stamp small')?.textContent ?? '';
  g.font = `900 ${30 * k}px Nunito, sans-serif`; const w = Math.max(g.measureText(name).width, (g.font = `800 ${15 * k}px Nunito, sans-serif`, g.measureText(date).width)) + pad * 2;
  const x = c.width - w - pad, y = c.height - 84 * k - pad;
  g.fillStyle = '#fff6df'; g.strokeStyle = '#8a5a2b'; g.lineWidth = 4 * k;
  g.beginPath(); g.roundRect?.(x, y, w, 84 * k, 16 * k); g.fill(); g.stroke();
  g.fillStyle = '#5b3418'; g.font = `900 ${30 * k}px Nunito, sans-serif`; g.fillText(name, x + pad, y + 40 * k);
  g.font = `800 ${15 * k}px Nunito, sans-serif`; g.fillStyle = '#8a6a48'; g.fillText(date, x + pad, y + 66 * k);
  el?.classList.remove('flash'); void el?.offsetWidth; el?.classList.add('flash'); sfx('place');
  return new Promise(done => c.toBlob(blob => {
    if (!blob) { done(null); return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `hollowbrook-${new Date().toISOString().slice(0, 10)}.png`;
    if (!window.farm?.noDownload) a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000); done(blob);
  }, 'image/png'));
}
