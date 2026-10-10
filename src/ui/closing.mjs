// The closing sequence (chapter 20, docs/plan/ch20-the-lights-of-two-villages.md): five cards, one after another. The
// porch (the chapter's own words), the old village, the far bank, the names of everyone who came back, and thanks.
// The chapter counts as seen when the last card is closed; "Keep playing" does that, and so do the album and the
// photograph buttons, which go on to the valley album or the photo mode. Loaded only when the ending comes.
import { t } from '../kit/i18n.mjs';
import { showModal } from './modal.mjs';
import { faceHtml } from './icon.mjs';
import { nameOf } from './bonds-panels.mjs';
import { castOf } from '../core/ending.mjs';

const esc = text => String(text).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const picture = p => p ? `<div class="panels" data-n="1"><figure class="on"><img src="${p.img}" alt="${esc(t(p.caption))}" onerror="this.parentNode.remove()"><figcaption>${esc(t(p.caption))}</figcaption></figure></div>` : '';
/** Show the five cards. onSeen: the last one was closed; onAlbum / onPhoto: it was closed with that button. */
export function showClosing(game, ch, { onSeen, onAlbum, onPhoto } = {}) {
  const cast = castOf(game.s, game.now), [porch, village, bank] = ch.panels ?? [];
  const card = (n, body, button = 'Continue') => `<div class="chapter closing" data-step="${n}">${body}
    <div class="closing-dots">${[1, 2, 3, 4, 5].map(i => `<i class="${i === n ? 'on' : ''}"></i>`).join('')}</div><button class="btn primary big" data-close>${t(button)}</button></div>`;
  const cards = [
    card(1, `${picture(porch)}<small>${t('Chapter {n}', { n: ch.id })}</small><h2>${t(ch.title)}</h2><p class="sub">${t(ch.subtitle)}</p><p>${t(ch.text)}</p>`),
    card(2, `${picture(village)}<h2>${t('The old village')}</h2><p>${t('Every window on the lane is lit. Somebody is still baking, and somebody is late with the post, as on every evening since the school bell rang again.')}</p>`),
    card(3, `${picture(bank)}<h2>${t('The far bank')}</h2><p>${t('Across the water the quay lamps come on one by one. The evening train whistles once and goes on to Pine Ridge.')}</p>`),
    card(4, `<h2>${t('Everyone who came back')}</h2><div class="coop-members closing-cast">${cast.people.map(id => `<span>${faceHtml(id, 'mini-face')}<small>${nameOf(id)}</small></span>`).join('')}</div>
      ${cast.returned ? `<p>${t('And {count} families who came home to the quay.', { count: cast.returned })}</p>` : ''}
      <p class="ada">${faceHtml('ada', 'mini-face')}<span><b>${t('{person:ada:display}')}:</b> “${esc(t(ch.ada))}”</span></p>`),
    card(5, `<h2>${t('Thank you for staying')}</h2><p>${t('The valley goes on: the market, the fair, the trains and the brook. Nothing ends here but the story, and that you can read again in the valley album.')}</p>
      <div class="closing-buttons"><button class="btn" data-closing="album">${t('The valley album')}</button><button class="btn" data-closing="photo">${t('Take a photograph')}</button></div>`, 'Keep playing'),
  ];
  let after = null;
  const show = i => showModal(cards[i], { modal: true, cls: i ? 'closing-modal' : 'chapter-modal closing-modal',
    onOpen: el => { for (const b of el.querySelectorAll('[data-closing]')) b.addEventListener('click', () => { after = b.dataset.closing; el.querySelector('[data-close]').click(); }); },
    onClose: () => { if (i + 1 < cards.length) { show(i + 1); return; } onSeen?.(); if (after === 'album') onAlbum?.(); else if (after === 'photo') onPhoto?.(); } });
  show(0);
}
