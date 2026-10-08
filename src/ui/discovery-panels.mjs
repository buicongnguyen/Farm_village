// Earned discoveries stay in the album. Opening a memory acknowledges it; the core already paid its reward.
import { discoveryRecords } from '../core/discoveries.mjs';
import { discoveryOf } from '../content/discoveries.mjs';
import { t, num } from '../kit/i18n.mjs';
import { iconHtml, faceHtml, coinMark } from './icon.mjs';
import { nameOf } from './bonds-panels.mjs';
import { showModal } from './modal.mjs';

export function renderDiscoveries(s) {
  const records = discoveryRecords(s);
  if (!records.length) return '';
  return `<section class="discoveries"><h3>${t('Lucky discoveries')}</h3>${records.map(d =>
    `<button class="next-project discovery-memory" data-do="discovery" data-id="${d.id}">${iconHtml(d.icon, '', 'mini')}<span><b>${t(d.title)}</b><small>${d.read ? t('In your album') : t('New discovery')} · ${t('{coins} coins found', { coins: num(d.coins) })}</small></span></button>`).join('')}</section>`;
}

export function showDiscovery(game, id) {
  const found = discoveryRecords(game.s).find(d => d.id === id);
  if (!found) return false;
  const result = game.do('readDiscovery', { id }); if (!result.ok) return false;
  showModal(`<div class="scene discovery-detail">${iconHtml(found.icon, '', 'family-art')}<h2>${t(found.title)}</h2><p>${t(found.text)}</p>
    <div class="scene-line">${faceHtml(found.person)}<div><b>${nameOf(found.person)}</b><p>${t(found.line)}</p></div></div>
    <p class="reward">${coinMark()} +${num(found.coins)} · ${t('Already added to your coins')}</p>
    <button class="btn primary wide" data-close>${t('Keep exploring')}</button></div>`, { cls: 'discovery-modal' });
  return true;
}

export function watchDiscoveries(game, hud) {
  return game.on(r => {
    for (const event of r.events ?? []) {
      if (event.type !== 'discovery') continue;
      const found = discoveryOf(event.id); if (!found) continue;
      const toast = hud.toast(t('Lucky find! {name} · +{coins} coins', { name: t(found.title), coins: num(event.coins) }), 'good', { icon: found.icon, group: `discovery:${found.id}` });
      toast.setAttribute('role', 'button'); toast.tabIndex = 0;
      toast.setAttribute('aria-label', t('Read about {name}', { name: t(found.title) }));
      toast.addEventListener('click', () => showDiscovery(game, found.id));
      toast.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showDiscovery(game, found.id); } });
    }
  });
}
