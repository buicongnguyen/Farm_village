// The valley album (chapter 20, core/ending.mjs albumOf): the whole story to read again. Every chapter seen, as a tile
// with its first picture (a tap shows its card once more); what the valley chose in chapter 11; the titles the valley
// earned, with their dates; and when the story ended. Opened from the Album, from Settings and from the closing cards.
import { t, getLocale } from '../kit/i18n.mjs';
import { albumOf } from '../core/ending.mjs';
import { glyph, iconHtml } from './icon.mjs';

const day = ms => new Date(ms).toLocaleDateString(getLocale?.() ?? undefined, { year: 'numeric', month: 'short', day: 'numeric' });
/** The button that leads to the album from another panel: shown once a chapter has been seen. */
export function albumEntry(s) {
  const n = s.story?.chapter ?? 0; if (n < 1) return '';
  return `<button class="next-project valley-album-entry" data-do="valleyAlbum">${iconHtml('ui:mail', '', 'mini')}<span><b>${t('The valley album')}</b><small>${t('{count} chapters to read again', { count: n })}</small></span></button>`;
}
export function renderValleyAlbum(s) {
  const a = albumOf(s);
  if (!a.chapters.length) return `<p class="empty">${t('The story has not begun yet.')}</p>`;
  const tiles = a.chapters.map(ch => { const p = ({ ...ch, ...ch.variants?.[a.choice] }).panels?.[0];
    return `<button class="album-chapter" data-do="chapterAgain" data-id="${ch.id}">${p ? `<img src="${p.img}" alt="" loading="lazy" onerror="this.remove()">` : ''}<small>${t('Chapter {n}', { n: ch.id })}</small><b>${t(ch.title)}</b></button>`; }).join('');
  const choice = a.choice ? `<h3>${t('What the valley chose')}</h3><p class="hint">${iconHtml(a.choice === 'meadow' ? 'beehive' : 'cannery', '', 'mini')} ${t(a.choice === 'meadow' ? 'The brook meadow stayed a meadow.' : 'The cannery went up on the brook meadow.')}</p>` : '';
  const titles = a.titles.length ? `<h3>${t('The names of the valley')}</h3><ul class="album-titles">${a.titles.map(x => `<li>${glyph('check', 'g')}<b>${t(x.name)}</b><small>${day(x.when)}</small></li>`).join('')}</ul>` : '';
  return `<div class="valley-album">
    ${a.ended ? `<p class="hint">${glyph('check', 'g')} ${t('The story was told to its end on {date}. The valley goes on.', { date: day(a.ended) })}</p>` : `<p>${t('Every chapter you have seen, to read again.')}</p>`}
    <div class="album-chapters">${tiles}</div>${choice}${titles}</div>`;
}
