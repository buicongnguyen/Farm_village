// Three independent farms. The same renderer also serves boot recovery, before a Game exists.
import { t, num, getLanguage } from '../kit/i18n.mjs';
import { listProfiles } from '../kit/save.mjs';
import { START_RESTORE } from '../content/economy.mjs';
import { iconHtml, coinMark } from './icon.mjs';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dateOf = value => {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && value > 0
    ? date.toLocaleDateString(getLanguage() === 'vi' ? 'vi-VN' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
};

export function renderProfiles(s = null, profile = 1) {
  return `<div class="profiles-panel" data-profile-picker>
    <p class="hint">${t('Each profile keeps its own farm and progress.')}</p>
    <div class="profile-list">${listProfiles(s, profile).map(row => {
      const playing = !!s && row.active;
      const available = row.status === 'saved' || row.status === 'backup';
      const empty = row.status === 'empty', corrupt = row.status === 'corrupt';
      const status = playing ? t('Playing now') : empty ? t('Empty profile') : corrupt ? t('Needs recovery')
        : row.status === 'backup' ? t('Backup available') : available ? t('Saved farm') : t('Storage unavailable');
      const date = dateOf(row.lastSeen);
      const details = available || playing
        ? `${row.playerName ? `<b class="profile-player">${esc(row.playerName)}</b>` : ''}<div class="profile-progress"><span>${t('Level {level}', { level: row.level })}</span><span>${coinMark()} ${num(row.coins ?? 0)}</span>${row.chapter > 0 ? `<span>${t('Chapter {n}', { n: row.chapter })}</span>` : ''}</div>${date ? `<small>${t('Last played: {date}', { date })}</small>` : ''}`
        : `<p class="hint">${empty ? t('A new farm with {coins} coins.', { coins: num(START_RESTORE.coins) }) : corrupt
          ? t('This save needs recovery. Choose another farm, or start over in this profile.')
          : t('Your saves could not be read. Browser storage must be available to continue.')}</p>`;
      const action = corrupt
        ? `<button class="btn ghost wide" data-do="resetProfile" data-n="${row.id}">${t('Start over in Profile {n}', { n: row.id })}</button>`
        : `<button class="btn${playing ? ' ghost' : ' primary'} wide" data-do="profile" data-n="${row.id}" ${playing || !available && !empty ? 'disabled' : ''}>${playing ? t('Playing now') : empty ? t('Start Farm {n}', { n: row.id }) : available ? t('Continue Farm {n}', { n: row.id }) : t('Unavailable')}</button>`;
      return `<section class="order profile-card${playing ? ' can' : ''}" data-profile-id="${row.id}" data-profile-status="${row.status}" ${playing ? 'aria-current="true"' : ''}>
        <div class="profile-heading">${iconHtml('cottage', '', 'mini')}<h3>${t('Profile {n}', { n: row.id })}</h3><small>${status}</small></div>
        <div class="profile-details">${details}</div>${action}</section>`;
    }).join('')}</div>
  </div>`;
}
