// Purchase preview and the optional planting-marker memory. A preview never buys land or earns its keepsake.
import { LAND_BRANCH } from '../content/land.mjs';
import { CLEAR } from '../content/economy.mjs';
import { parcelNote } from '../content/world.mjs';
import { landBranchStatus, unreadLandDiscovery } from '../core/land-discovery.mjs';
import { t, num } from '../kit/i18n.mjs';
import { coinMark, iconHtml, faceHtml } from './icon.mjs';
import { nameOf } from './bonds-panels.mjs';
import { showModal } from './modal.mjs';

const pending = new WeakSet();

export function renderLandEntry(s, { album = false } = {}) {
  const status = landBranchStatus(s);
  if (!status.enabled || album && !status.found || !status.owned && s.level < status.level) return '';
  const label = status.found ? 'A planting memory' : status.owned ? 'A small find on your land' : 'Preview a new plot';
  return `<button class="next-project" data-do="landVisit" data-parcel="${status.parcel}">${iconHtml('sale_sign', '', 'mini')}
    <span><b>${t(LAND_BRANCH.title)}</b><small>${t(label)}${unreadLandDiscovery(s) ? ` · ${t('New discovery')}` : ''}</small></span></button>`;
}

export function renderLandPanel(s, parcel) {
  const status = landBranchStatus(s, parcel);
  if (!status.enabled) return `<p class="hint">${t('This clearing belongs to the restored village')}</p>`;
  const preview = !status.owned ? `<p class="land-note"><b>${t(parcelNote(status.parcel))}</b></p><p>${t(LAND_BRANCH.text)}</p><p>${t(LAND_BRANCH.purpose)}</p>
    <p><b>${t('{size} × {size} cells, with a clear 4 × 4 patch included', { size: status.size })}</b></p>
    <p class="hint">${t('Other weeds and rocks use the usual clearing prices.')}
    ${t('Weeds: {weeds} coins each · Rocks: {rocks} coins each', { weeds: CLEAR.weeds, rocks: CLEAR.rock })}</p>
    <p class="hint">${t('Your current bed limit and recipe unlocks still apply. One extra parcel is available at present.')}</p>
    <p>${t('An optional planting-marker memory and a bench are included. Finding them costs no coins or materials.')}</p>
    <p>${t('Level {level}', { level: status.level })} · ${coinMark()} ${num(status.price)}</p>
    ${status.reason ? `<p class="hint">${t(status.reason, status.params ?? {})}</p>` : ''}
    <button class="btn primary wide" data-do="landBuy" data-parcel="${status.parcel}" ${status.canBuy ? '' : 'disabled'}>${t('Buy this plot for {coins} coins', { coins: num(status.price) })}</button>`
    : status.found ? `<p>${t('There is room for your next idea here. The planting memory is saved in your album.')}</p>
      <button class="btn primary wide" data-do="landMemory">${t('Read the planting memory')}</button>
      <button class="btn wide" data-do="wishBuild" data-kind="bench">${t('Decorate with a bench')}</button>`
      : `<p>${t(LAND_BRANCH.purpose)}</p><p>${t('This plot is yours to use now. The little discovery can wait until you feel like it.')}</p>
      <p>${t(LAND_BRANCH.hint)}</p><p class="hint">${t('A free inspection · one bench for your storage')}</p>
      <button class="btn primary wide" data-do="inspectLandDiscovery" data-parcel="${status.parcel}">${t('Uncover the planting marker')}</button>`;
  return `<div class="land-branch"><h3>${t(LAND_BRANCH.title)}</h3>${preview}
    <button class="btn wide" data-do="landVisit" data-parcel="${status.parcel}">${t('Visit this plot')}</button></div>`;
}

export function showLandMemory(game) {
  if (!landBranchStatus(game.s).found || pending.has(game)) return false;
  pending.add(game);
  const memory = LAND_BRANCH.discovery;
  showModal(`<div class="scene"><h2>${t(memory.title)}</h2>${iconHtml('flowers', '', 'family-art')}<p>${t(memory.story)}</p>
    ${memory.lines.map(line => `<div class="scene-line">${faceHtml(line.who)}<div><b>${nameOf(line.who)}</b><p>${t(line.text)}</p></div></div>`).join('')}
    <p class="reward">${iconHtml('bench', '', 'mini')} ${t('One bench was added to storage when you uncovered the marker.')}</p>
    <button class="btn primary wide" data-close>${t('Back to the farm')}</button></div>`, {
      onOpen: () => game.do('readLandDiscovery'), onClose: () => pending.delete(game),
    });
  return true;
}
