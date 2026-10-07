// One card at a time (story chapters, welcome cards): later cards wait until the open one is closed.
const queue = [];
let root = null, open = false;
export function initModals(el) { root = el; }
/** Show a card. html is the card's inside; the [data-close] button (or a tap outside) closes it. */
export function showModal(html, { onClose } = {}) {
  queue.push({ html, onClose });
  if (!open) next();
}
function next() {
  const item = queue.shift(); if (!item || !root) { open = false; return; }
  open = true;
  const el = document.createElement('div'); el.className = 'modal';
  el.innerHTML = `<div class="card-modal">${item.html}</div>`;
  el.addEventListener('click', e => { if (e.target === el || e.target.closest('[data-close]')) { el.remove(); item.onClose?.(); next(); } });
  root.appendChild(el);
}
export const modalOpen = () => open;
