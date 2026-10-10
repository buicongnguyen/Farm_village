// Settings and the album (DESIGN 13, 17), drawn into the shared sheet. Test builds add a Test section with the play
// package's helpers; the public game shows it too when it was opened with ?tester (docs/plan/00-tester-tools.md).
import { t, getLanguage, getLocale, LANGUAGES } from '../kit/i18n.mjs';
import { CHAPTERS } from '../content/story.mjs';
import { STEPS } from '../content/projects.mjs';
import { FAMILIES } from '../content/people.mjs';
import { iconHtml, glyph, faceHtml } from './icon.mjs';
import { nameOf } from './bonds-panels.mjs';
import { renderDiscoveries } from './discovery-panels.mjs';
import { PLAYER_COLORS } from '../core/today.mjs';
import { FISH_TABLE, FRUITS } from '../content/goods.mjs';
import { JUMP_CHAPTERS } from '../core/testmode.mjs';

const choice = (key, value, current, label) => `<button class="tab${current === value ? ' on' : ''}" data-do="setting" data-key="${key}" data-value="${value}" aria-pressed="${current === value}"${key === 'lang' ? ` lang="${value}"` : ''}>${label}</button>`;
const esc = value => String(value ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// `build`: only in test builds (the clock and the tutorial are theirs to move; a public farm keeps its real clock)
const TESTS = [['unlock', 'Unlock everything'], ['coins', '+10,000 coins'], ['levels', '+5 levels'], ['timers', 'Finish every timer'], ['family', 'Move a family in'], ['marketday', 'Start a market day'], ['finish', 'Finish this chapter'],
  ['step', 'Next tutorial step', 'build'], ['hour', 'Clock +1 hour', 'build'], ['day', 'Clock +1 day', 'build']];
function renderTests(s) {
  const seen = s.story.chapter ?? 0;
  return `<h3 class="test-head">${t('Test')}</h3><p class="hint">${TEST_MODE ? t('Only in test builds.') : t('Tester tools: this farm is for testing.')}</p>
    <div class="row test-row">${TESTS.filter(([, , only]) => TEST_MODE || !only).map(([id, label]) => `<button class="btn small" data-do="test" data-test="${id}">${t(label)}</button>`).join('')}</div>
    <div class="set-row"><b>${t('Jump to chapter')}</b><div class="tabs test-jump">${JUMP_CHAPTERS.map(n => `<button class="tab${seen >= n - 1 ? ' on' : ''}" data-do="test" data-test="jump:${n}"${seen >= n - 1 ? ' disabled' : ''} aria-label="${t('Chapter {n}', { n })}">${n}</button>`).join('')}</div></div>`;
}
export function renderSettings(s, profile, { tester = false } = {}) {
  const st = s.settings;
  return `<div class="settings">
    <button class="btn wide" data-do="album">${glyph('album', 'g')} ${t('Family album')}</button>
    <div class="set-row"><b>${t('Language')}</b><div class="tabs">${LANGUAGES.map(lang => choice('lang', lang.id, getLanguage(), lang.label)).join('')}</div></div>
    <div class="set-row"><b>${t('You')}</b><input class="name-input" data-name maxlength="12" value="${esc(st.playerName)}" placeholder="${t('Your name')}" aria-label="${t('Your name')}"><div class="tabs">${choice('playerBody', 'man', st.playerBody ?? 'man', t('Man'))}${choice('playerBody', 'woman', st.playerBody ?? 'man', t('Woman'))}</div></div>
    <div class="set-row"><b>${t('Shirt')}</b><div class="tabs">${PLAYER_COLORS.map(c => `<button class="tab swatch${(st.playerColor ?? '#e63946') === c ? ' on' : ''}" style="background:${c}" data-do="setting" data-key="playerColor" data-value="${c}" aria-label="${c}"></button>`).join('')}</div></div>
    <div class="set-row"><b>${t('Sound')}</b><input type="range" min="0" max="100" value="${Math.round(st.sound * 100)}" data-range="sound" aria-label="${t('Sound')}"></div>
    <div class="set-row"><b>${t('Music')}</b><input type="range" min="0" max="100" value="${Math.round(st.music * 100)}" data-range="music" aria-label="${t('Music')}"></div>
    <div class="set-row"><b>${t('Day and night')}</b><div class="tabs">${choice('daylight', 'real', st.daylight, t('Follow my clock'))}${choice('daylight', 'always', st.daylight, t('Always daytime'))}</div></div>
    <div class="set-row"><b>${t('Text size')}</b><div class="tabs">${[1, 1.15, 1.3].map(v => choice('textSize', String(v), String(st.textSize), `${Math.round(v * 100)}%`)).join('')}</div></div>
    <div class="set-row"><b>${t('Motion')}</b><div class="tabs">${choice('reducedMotion', 'false', String(st.reducedMotion), t('Normal'))}${choice('reducedMotion', 'true', String(st.reducedMotion), t('Reduced'))}</div></div>
    <div class="set-row"><b>${t('Graphics')}</b><div class="tabs">${['auto', 'low', 'high'].map(v => choice('quality', v, st.quality, t({ auto: 'Automatic', low: 'Light', high: 'Sharp' }[v]))).join('')}</div></div>
    <button class="btn orange wide" data-do="photo">${glyph('camera', 'g')} ${t('Photo mode')}</button>
    <h3>${t('Manage Profile {n}', { n: profile })}</h3>
    <p class="hint">${t('These controls affect only Profile {n}.', { n: profile })}</p>
    <div class="row"><button class="btn" data-do="export">${glyph('down', 'g')} ${t('Export save')}</button><label class="btn">${glyph('open', 'g')} ${t('Import save')}<input type="file" accept=".json,application/json" data-file hidden></label>
      <button class="btn ghost" data-do="newGame">${glyph('sprout', 'g')} ${t('Start over')}</button></div>
    ${TEST_MODE || tester ? renderTests(s) : ''}
  </div>`;
}
/** A chapter's picture for the album: its first story panel, or its symbol while the picture loads or is missing. */
const chapterArt = ch => ch.panels?.[0] ? `<img class="chapter-art" src="${ch.panels[0].img}" alt="" loading="lazy" onerror="this.remove()">` : '';
export function renderAlbum(s) {
  const when = at => new Date(at).toLocaleDateString(getLocale(), { day: 'numeric', month: 'short' });
  const firsts = [['harvest', 'wheat', 'First harvest'], ['order', 'ui:orders', 'First order filled'], ['product', 'bread', 'First thing made'], ['egg', 'egg', 'First egg'],
    ['fruit', 'apple', 'First fruit picked'], ['family', 'cottage', 'First family moved in'], ['trade', 'gift', 'First trade with a neighbour'], ['gift', 'ui:heart', 'First gift given'],
    ['wish', 'charm', 'First wish granted'], ['letter', 'mail', 'First letter'], ['cart', 'cart', 'First market cart sent']].filter(([k]) => s.firsts?.[k]);
  const projects = STEPS.filter(st => s.firsts?.[`project:${st.id}`]);
  const hearts = Object.keys(s.firsts ?? {}).filter(k => k.startsWith('heart:')).map(k => { const [, person, at] = k.split(':'); return { person, at, time: s.firsts[k] }; }).sort((a, b) => a.time - b.time);
  const families = FAMILIES.filter(f => Object.values(s.homes ?? {}).some(h => h.family === f.id && h.arrived));
  const seen = s.story.chapter ?? 0;
  return `<div class="album">
    ${renderDiscoveries(s)}
    <h3>${t('Chapters')}</h3><div class="chapters">${CHAPTERS.map(ch => ch.id <= seen
      ? `<div class="chapter-tile">${chapterArt(ch)}<b>${t(ch.title)}</b><small>${t(ch.subtitle)}</small></div>`
      : ch.teaser && seen >= ch.id - 1 ? `<div class="chapter-tile teaser">${chapterArt(ch)}<b>${t(ch.title)}</b><small>${t('Coming soon')}</small></div>`
      : `<div class="chapter-tile locked">${glyph('lock', 'g big')}<b>${t('Chapter {n}', { n: ch.id })}</b></div>`).join('')}</div>
    ${families.length ? `<h3>${t('Families of Hollowbrook')}</h3><div class="portraits">${families.map(f => `<div class="portrait-tile">${iconHtml(`family:${f.id}`, '', 'family-art')}<b>${t(f.name)}</b></div>`).join('')}</div>` : ''}
    <h3>${t('Fish album')}</h3><div class="portraits">${FISH_TABLE.map(f => { const n = s.album?.fish?.[f.id] ?? 0; return `<div class="portrait-tile${n ? '' : ' locked'}">${iconHtml(f.id, '', 'family-art')}<b>${n ? t(f.name) : '?'}</b><small>${n ? `×${n}` : t('Not caught yet')}</small></div>`; }).join('')}</div>
    <h3>${t('Fruit album')}</h3><div class="portraits">${Object.entries(FRUITS).map(([id, f]) => { const n = s.album?.fruit?.[id] ?? 0; return `<div class="portrait-tile${n ? '' : ' locked'}">${iconHtml(id, '', 'family-art')}<b>${n ? t(f.name) : '?'}</b><small>${n ? `×${n}` : t('Not picked yet')}</small></div>`; }).join('')}</div>
    <h3>${t('First times')}</h3><ul>${firsts.map(([k, icon, label]) => `<li>${iconHtml(icon, '', 'mini')} ${t(label)} · <small>${when(s.firsts[k])}</small></li>`).join('') || `<li>${t('Your first harvest is waiting.')}</li>`}</ul>
    ${hearts.length ? `<h3>${t('Heart scenes')}</h3><ul>${hearts.map(h => `<li>${faceHtml(h.person, 'mini-face')} ${t('{name} and you: {count} hearts', { name: nameOf(h.person), count: h.at })} · <small>${when(h.time)}</small></li>`).join('')}</ul>` : ''}
    ${projects.length ? `<h3>${t('Projects')}</h3><ul>${projects.map(st => `<li>${glyph('projects', 'g')} ${t(st.name)} · <small>${when(s.firsts[`project:${st.id}`])}</small></li>`).join('')}</ul>` : ''}
    <button class="btn orange wide" data-do="photo">${glyph('camera', 'g')} ${t('Photo mode')}</button>
  </div>`;
}
