// Loaded with the existing panel-renderer chunk, never on first paint.
import { t } from '../kit/i18n.mjs';
import { CROPS } from '../content/goods.mjs';
import { HANDS, HELP } from '../content/economy.mjs';
import { FIELD_WORK, workBoardOpen } from '../core/field-work.mjs';
import { goodIcon } from './icon.mjs';

export function renderWorkBoard(s, now, draft) {
  if (!workBoardOpen(s)) return '<p>' + t('Reach level {level} first', { level: HELP.level }) + '</p>';
  const j = s.fieldWork?.job, last = s.fieldWork?.last;
  if (!s.fieldWork?.enabled && !s.hands?.field) return `<p>${t('Family crop help still follows its earlier routine. Set your preferences to keep crops for yourself or choose a one-time assignment.')}</p><button class="btn primary" data-do="protectFieldCrops">${t('Choose how crops are harvested')}</button>`;
  let html = '<p>' + t('Only the beds you choose will be harvested. All other crops stay yours.') + '</p>';
  if (j) return html + `<p><b>${t('Harvested: {done}/{total}', { done: j.done, total: j.total })}</b></p>
    <p>${t('Skipped: {count} · Wages paid: {coins}', { count: j.skipped, coins: j.spent })}</p>
    <p>${t(j.mode === 'pause' ? 'Ripe crops wait at least 45 seconds before help arrives.' : 'Harvest when ready')}</p>
    <p class="hint">${t('You can harvest first. Helpers skip those beds without charging.')}</p>
    <p class="hint">${t('Work pauses when the barn is full or wages are unavailable.')}</p>
    <button class="btn" data-do="cancelFieldWork">${t('Leave the rest for me')}</button>`;
  if (last) html += `<p class="hint">${t('Last assignment: {done} harvested, {skipped} left or collected by you.', last)}</p>`;
  const rows = Object.entries(s.beds).filter(([id, b]) => s.placed[id]?.kind === 'bed' && CROPS[b.crop]);
  draft.ids = draft.ids.filter(id => rows.some(([k]) => k === id));
  if (!s.hands?.field) draft.owner = 'family';
  html += `<p>${t('One harvest, up to {count} beds. Replanting is yours.', { count: FIELD_WORK.max })}</p>
    <div class="actions"><button class="btn" data-do="workOwner" data-value="family" aria-pressed="${draft.owner === 'family'}">${t('Family help')} ${draft.owner === 'family' ? '✓' : ''}</button>
    ${s.hands?.field ? `<button class="btn" data-do="workOwner" data-value="field" aria-pressed="${draft.owner === 'field'}">${t('Field hand')} ${draft.owner === 'field' ? '✓' : ''}</button>` : ''}</div>
    <p class="hint">${t('Family help: up to {count} beds every {seconds}s, with no wages.', { count: HELP.beds, seconds: HELP.everyMs / 1000 })}<br>${t('Field hand: up to {count} beds every {seconds}s.', { count: FIELD_WORK.batch, seconds: HANDS.everyMs / 1000 })}</p>
    <div class="actions"><button class="btn" data-do="workMode" data-value="pause" aria-pressed="${draft.mode === 'pause'}">${t('Help after a pause')} ${draft.mode === 'pause' ? '✓' : ''}</button>
    <button class="btn" data-do="workMode" data-value="ready" aria-pressed="${draft.mode === 'ready'}">${t('Harvest when ready')} ${draft.mode === 'ready' ? '✓' : ''}</button></div>
    <p class="hint">${t('Tap the beds to include. Unselected beds are left for you.')}</p>
    <div class="goods-grid">${rows.map(([id, b]) => `<button class="good-tile" data-do="workBed" data-id="${id}" aria-pressed="${draft.ids.includes(id)}">
      ${goodIcon(b.crop)}<b>${t(CROPS[b.crop].name)} ${draft.ids.includes(id) ? '✓' : ''}</b>
      <small>${t('Bed at {x}, {z}', s.placed[id])}</small></button>`).join('')}</div>
    ${rows.length ? '' : `<p>${t('Plant some beds before making an assignment.')}</p>`}
    <p>${t('Selected: {count} · Maximum wages: {coins}', { count: draft.ids.length, coins: draft.owner === 'field' ? draft.ids.length * HANDS.wage : 0 })}</p>
    <p class="hint">${t('No payment now. Wages are charged only for completed work while you play.')}</p>
    <button class="btn primary" data-do="startFieldWork" ${!draft.ids.length || draft.ids.length > FIELD_WORK.max || draft.owner === 'field' && s.coins < draft.ids.length * HANDS.wage ? 'disabled' : ''}>${t('Start this assignment')}</button>`;
  return html;
}
export function workBoardClick(panel, d) {
  const draft = panel.workDraft ??= { ids: [], owner: 'family', mode: 'pause' };
  if (d.do === 'workBed') draft.ids = draft.ids.includes(d.id) ? draft.ids.filter(id => id !== d.id) : draft.ids.length < FIELD_WORK.max ? [...draft.ids, d.id] : draft.ids;
  else if (d.do === 'workOwner') draft.owner = d.value;
  else if (d.do === 'workMode') draft.mode = d.value;
  else if (d.do === 'startFieldWork') { if (panel.game.do('startFieldWork', draft).ok) draft.ids = []; }
  else if (d.do === 'protectFieldCrops') panel.game.do('protectFieldCrops');
  else if (d.do === 'cancelFieldWork') panel.game.do('cancelFieldWork');
  panel.render();
}
