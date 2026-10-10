import { t } from '../kit/i18n.mjs';
import { journeyOf } from '../core/journey.mjs';
import { glyph, iconHtml } from './icon.mjs';
export function renderJourney(s) {
  const { stage, milestones, done, total, unlocks } = journeyOf(s);
  return `<div class="journey" data-stage="${stage.id}"><div class="journey-goal"><small>${t('Current stage')}</small><h3>${t(stage.name)}</h3><b>${t(stage.goal)}</b>
    ${total ? `<p>${t('{done} of {total} steps', { done, total })}</p><progress value="${done}" max="${total}" aria-label="${t(stage.goal)}"></progress>` : `<p>${t('Planned for v{version}', { version: stage.version })}</p>`}</div>
    <ul class="journey-milestones">${milestones.map(m => `<li class="${m.done ? 'done' : ''}">${glyph(m.done ? 'check' : 'dot', 'g')} ${t(m.name)}</li>`).join('')}</ul>
    <h3>${t('Next three unlocks')}</h3><div class="journey-unlocks">${unlocks.map(u => `<div class="journey-unlock">${u.kind ? iconHtml(u.kind, '', 'tile-icon') : glyph('lock', 'g')}<div><b>${t(u.name)}</b><small>${t('Level {level}', { level: u.level })} · ${u.planned ? t('Planned for v{version}', { version: u.version }) : u.available ? t('Ready to start') : t('Not open yet')}</small></div>${u.kind ? `<button class="btn small" data-do="${['school', 'clinic'].includes(u.kind) ? 'projects' : 'showWay'}" data-at="${u.kind}">${t('Show me')}</button>` : ''}</div>`).join('')}</div>
    <button class="btn wide" data-do="projects">${t('Village projects')}</button>
    ${(s.story?.chapter ?? 0) >= 15 ? `<button class="btn wide" data-do="upriver">${iconHtml('spring_water', '', 'mini')} ${t('Where the brook begins')}</button>` : ''}
    ${(s.story?.chapter ?? 0) >= 10 ? `<button class="btn wide" data-do="valley">${iconHtml('round_tree', '', 'mini')} ${t('The valley')}</button>` : ''}
    ${(s.story?.chapter ?? 0) >= 16 ? `<button class="btn wide" data-do="valleyValue">${iconHtml('company', '', 'mini')} ${t('The valley company')}</button>` : ''}
    ${s.valley?.founded ? `<button class="btn wide" data-do="fair">${iconHtml('ribbon_board', '', 'mini')} ${t('The valley fair')}</button>` : ''}
    ${s.story?.ended ? `<button class="btn wide" data-do="valleyAlbum">${glyph('album', 'g')} ${t('The valley album')}</button>` : ''}</div>`;
}
