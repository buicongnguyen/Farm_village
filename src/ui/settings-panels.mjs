// Settings and the album (DESIGN 13, 17), drawn into the shared sheet.
import { t, getLanguage } from '../kit/i18n.mjs';
import { CHAPTERS } from '../content/story.mjs';
import { STEPS } from '../content/projects.mjs';

const choice = (key, value, current, label) => `<button class="tab${current === value ? ' on' : ''}" data-do="setting" data-key="${key}" data-value="${value}">${label}</button>`;
export function renderSettings(s, profile) {
  const st = s.settings;
  return `<div class="settings">
    <div class="set-row"><b>${t('Language')}</b><div class="tabs">${choice('lang', 'en', getLanguage(), 'English')}${choice('lang', 'vi', getLanguage(), 'Tiếng Việt')}</div></div>
    <div class="set-row"><b>${t('Sound')}</b><input type="range" min="0" max="100" value="${Math.round(st.sound * 100)}" data-range="sound" aria-label="${t('Sound')}"></div>
    <div class="set-row"><b>${t('Music')}</b><input type="range" min="0" max="100" value="${Math.round(st.music * 100)}" data-range="music" aria-label="${t('Music')}"></div>
    <div class="set-row"><b>${t('Day and night')}</b><div class="tabs">${choice('daylight', 'real', st.daylight, t('Follow my clock'))}${choice('daylight', 'always', st.daylight, t('Always daytime'))}</div></div>
    <div class="set-row"><b>${t('Text size')}</b><div class="tabs">${[1, 1.15, 1.3].map(v => choice('textSize', String(v), String(st.textSize), `${Math.round(v * 100)}%`)).join('')}</div></div>
    <div class="set-row"><b>${t('Motion')}</b><div class="tabs">${choice('reducedMotion', 'false', String(st.reducedMotion), t('Normal'))}${choice('reducedMotion', 'true', String(st.reducedMotion), t('Reduced'))}</div></div>
    <div class="set-row"><b>${t('Graphics')}</b><div class="tabs">${['auto', 'low', 'high'].map(v => choice('quality', v, st.quality, t({ auto: 'Automatic', low: 'Light', high: 'Sharp' }[v]))).join('')}</div></div>
    <h3>${t('Saves')}</h3>
    <div class="set-row"><b>${t('Farm')}</b><div class="tabs">${[1, 2, 3].map(n => `<button class="tab${n === profile ? ' on' : ''}" data-do="profile" data-n="${n}">${t('Farm {n}', { n })}</button>`).join('')}</div></div>
    <div class="row"><button class="btn" data-do="export">⬇ ${t('Export save')}</button><label class="btn">⬆ ${t('Import save')}<input type="file" accept=".json,application/json" data-file hidden></label>
      <button class="btn ghost" data-do="newGame">🌱 ${t('Start over')}</button></div>
  </div>`;
}
export function renderAlbum(s) {
  const when = at => new Date(at).toLocaleDateString(getLanguage() === 'vi' ? 'vi-VN' : 'en-GB', { day: 'numeric', month: 'short' });
  const firsts = [['harvest', '🌾', 'First harvest'], ['order', '📋', 'First order filled'], ['product', '🍞', 'First thing made'], ['egg', '🥚', 'First egg'],
    ['family', '🏡', 'First family moved in'], ['trade', '🤝', 'First trade with a neighbour']].filter(([k]) => s.firsts?.[k]);
  const projects = STEPS.filter(st => s.firsts?.[`project:${st.id}`]);
  return `<div class="album">
    <h3>${t('Chapters')}</h3><div class="chapters">${CHAPTERS.map(ch => ch.id <= (s.story.chapter ?? 0) ? `<div class="chapter-tile"><span>${ch.icon}</span><b>${t(ch.title)}</b><small>${t(ch.subtitle)}</small></div>` : `<div class="chapter-tile locked"><span>🔒</span><b>${t('Chapter {n}', { n: ch.id })}</b></div>`).join('')}</div>
    <h3>${t('First times')}</h3><ul>${firsts.map(([k, icon, label]) => `<li>${icon} ${t(label)} · <small>${when(s.firsts[k])}</small></li>`).join('') || `<li>${t('Your first harvest is waiting.')}</li>`}</ul>
    ${projects.length ? `<h3>${t('Projects')}</h3><ul>${projects.map(st => `<li>🏛 ${t(st.name)} · <small>${when(s.firsts[`project:${st.id}`])}</small></li>`).join('')}</ul>` : ''}
  </div>`;
}
