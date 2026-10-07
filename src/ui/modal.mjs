// One card at a time (story chapters, level-up, heart scenes, letters): later cards wait until the open one is closed.
// A card closes with its [data-close] button; a tap outside closes it too unless it is `modal` (story cards, level-up),
// where only the card's own buttons answer. The card pops in with a spring; buttons click.
import { sfx } from '../kit/sound.mjs';

const queue = [], listeners = new Set();
let root = null, open = false;
export function initModals(el) { root = el; }
/** Show a card. html is the card's inside. Options: onClose, onOpen(el), modal (no tap-outside close), cls (extra class). */
export function showModal(html, { onClose, onOpen, modal = false, cls = '' } = {}) {
  queue.push({ html, onClose, onOpen, modal, cls });
  if (!modalOpen()) next();
}
function next() {
  const item = queue.shift(); if (!item || !root) { open = false; for (const f of listeners) f(false); return; }
  open = true;
  const el = document.createElement('div'); el.className = `modal${item.modal ? ' strict' : ''}${item.cls ? ` ${item.cls}` : ''}`;
  el.innerHTML = `<div class="card-modal">${item.html}</div>`;
  const close = () => { el.remove(); item.onClose?.(); next(); };
  el.addEventListener('click', e => {
    if (e.target.closest('[data-close]')) { sfx('click'); close(); return; }
    if (e.target === el && !item.modal) close();
  });
  root.appendChild(el);
  for (const f of listeners) f(true);
  item.onOpen?.(el);
}
/** Is a card on screen? (A card removed from the page some other way counts as closed.) */
export const modalOpen = () => open && !!root?.querySelector(':scope > .modal');
/** Hear when a card opens or the last one closes (the guide waits for the chapter card). */
export const onModal = f => (listeners.add(f), () => listeners.delete(f));
