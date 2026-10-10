// The walk upriver (core/upriver.mjs, chapter 16): three stops in order. A stop that is behind shows its picture, what
// was found there and its keepsake; the next one shows the small deed it asks for and a button to walk there; the ones
// after wait. Opened from Village projects, the roadmap or a tap on Grandpa Oak.
import { t } from '../kit/i18n.mjs';
import { GOODS } from '../content/goods.mjs';
import { UPRIVER } from '../content/exploration.mjs';
import { upriverOf } from '../core/upriver.mjs';
import { faceHtml, glyph, goodIcon, iconHtml } from './icon.mjs';

function need(row) {
  const mark = glyph(row.ok ? 'check' : 'dot', 'g');
  if (row.kind === 'good') return `<div class="req ${row.ok ? 'ok' : ''}">${mark} ${goodIcon(row.good, 'mini')} ${t(GOODS[row.good].name)} <b>${row.have}/${row.need}</b></div>`;
  if (row.kind === 'fish') return `<div class="req ${row.ok ? 'ok' : ''}">${mark} ${iconHtml('dock', '', 'mini')} ${t('Fish landed at the boat dock')} <b>${row.have}/${row.need}</b></div>`;
  return `<div class="req ${row.ok ? 'ok' : ''}">${mark} ${iconHtml('round_tree', '', 'mini')} ${t('Trees planted since the walk began')} <b>${row.have}/${row.need}</b></div>`;
}
function stopCard(stop, i) {
  if (stop.done) return `<div class="stop done"><img src="assets/story/ch16-${i + 1}.webp" alt="" onerror="this.remove()"><div><h3>${glyph('check', 'g')} ${t(stop.title)}</h3><p>${t(stop.story)}</p>
    <p class="keepsake">${iconHtml(stop.keepsake.id, '', 'mini')} <b>${t(stop.keepsake.name)}</b></p></div></div>`;
  if (!stop.next) return `<div class="stop later"><h3>${glyph('lock', 'g')} ${t(stop.title)}</h3><p class="hint">${t('Further up the path.')}</p></div>`;
  const ready = stop.needs.every(r => r.ok);
  return `<div class="stop next"><h3>${glyph('play', 'g')} ${t(stop.title)}</h3><p>${t(stop.text)}</p>${stop.needs.map(need).join('')}
    <button class="btn primary wide" data-do="visitStop" data-stop="${stop.id}" ${ready ? '' : 'disabled'}>${t(stop.label)}</button></div>`;
}
export function renderUpriver(s) {
  const u = upriverOf(s);
  if (!u.open) return `<p>${t('Nobody is ready for the walk yet')}</p>`;
  return `<div class="upriver"><p class="upriver-who">${faceHtml('ellis', 'mini-face')}${faceHtml('pip', 'mini-face')}<span>${t(UPRIVER.text)}</span></p>
    ${u.stops.map(stopCard).join('')}
    ${u.complete ? `<p class="hint">${glyph('check', 'g')} ${t('The spring is kept: the valley is the more beautiful for it.')}</p>` : ''}</div>`;
}
