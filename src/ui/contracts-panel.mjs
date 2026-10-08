// Optional requests and replayable meal scenes use the existing panels and icons.
import { CONTRACTS, PICNIC_MENU } from '../content/contracts.mjs';
import { GOODS } from '../content/goods.mjs';
import { allPeople } from '../content/people.mjs';
import { contractStatus, contractMemories } from '../core/contracts.mjs';
import * as barn from '../core/barn.mjs';
import { t, tParams, num } from '../kit/i18n.mjs';
import { goodIcon, faceHtml, coinMark, iconHtml } from './icon.mjs';
import { goodHelpButton } from './good-help-panel.mjs';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const names = Object.fromEntries(allPeople().map(person => [person.id, person.name]));
const nameOf = id => t(names[id] ?? id);
const say = (who, text) => `<div class="scene-line">${faceHtml(who)}<div><b>${esc(nameOf(who))}</b><p>${esc(t(text))}</p></div></div>`;

export function renderContracts(s, now) {
  const status = contractStatus(s, now), request = status.next;
  let body = `<h3>${t(PICNIC_MENU.title)}</h3><p>${t(PICNIC_MENU.text)}</p>`;
  if (status.complete) return `<section class="contracts" data-contract-complete="true">${body}<p>${t('The picnic menu is complete. Your memories are yours to revisit.')}</p>${renderContractMemories(s)}</section>`;
  if (!status.introduced) return `<section class="contracts" data-contract-locked="true">${body}<p class="hint">${t(PICNIC_MENU.introduction)}</p></section>`;
  body += `<article data-contract-id="${request.id}"><p class="hint">${t('Picnic batch {count} of {total}', { count: status.index + 1, total: CONTRACTS.length })}</p>
    <h3>${iconHtml(request.icon, '', 'mini')} ${t(request.title)}</h3>${say(request.person, status.line)}
    <p>${t(request.method)}</p><p class="hint">${t('Recipes in this batch open by level {level}. Goods you already own can be used sooner.', { level: request.level })}</p>
    <div class="today">${Object.entries(request.need).map(([good, needed]) => `<div class="set-row">${goodIcon(good, 'mini')}<span><b>${t(GOODS[good].name)}</b> ${num(Math.min(needed, barn.free(s, good)))}/${num(needed)}</span>${goodHelpButton(good, needed)}</div>`).join('')}</div>
    <p>${coinMark()} ${t('Payment on delivery: {coins} coins', { coins: num(request.coins) })}</p>
    <p class="hint">${t('Accepting is free. Goods are used only when you deliver the whole batch; there is no deadline.')}</p>
    ${status.blockers.length ? `<h3>${t('Before making this batch')}</h3><ul>${status.blockers.map(blocker => `<li>${esc(t(blocker.text, tParams(blocker.params)))}</li>`).join('')}</ul>` : ''}
    ${status.active ? `<p class="hint">${t('Your request stays here if a maker needs repairs or is put in storage.')}</p>
      <button class="btn primary wide" data-do="deliverContract" data-id="${request.id}" ${status.canDeliver ? '' : 'disabled'}>${t('Deliver this picnic batch')}</button>`
    : `<button class="btn primary wide" data-do="acceptContract" data-id="${request.id}" ${status.canAccept ? '' : 'disabled'}>${t('Plan this batch')}</button>`}
    <p class="hint">${t('Goods held for the village project stay in your barn.')}</p></article>`;
  const later = CONTRACTS.slice(status.index + 1);
  if (later.length) body += `<details class="contract-future"><summary class="btn wide">${t('Later picnic batches')}</summary>${later.map(next => `<p>${iconHtml(next.icon, '', 'mini')} <b>${t(next.title)}</b> · ${t('Recipe level {level}', { level: next.level })}</p>`).join('')}<p class="hint">${t('Finish the current batch before planning the next one.')}</p></details>`;
  return `<section class="contracts">${body}${renderContractMemories(s)}</section>`;
}

export function renderContractMemories(s) {
  const memories = contractMemories(s); if (!memories.length) return '';
  return `<section class="contract-memories"><h3>${t('Our picnic menu memories')}</h3>${memories.map(memory =>
    `<button class="next-project contract-memory" data-do="contractMemory" data-id="${memory.id}">${iconHtml(memory.icon, '', 'mini')}<span><b>${t(memory.memory.title)}</b><small>${t(memory.read ? 'In your album' : 'A new picnic memory')}</small></span></button>`).join('')}</section>`;
}

export function renderContractMemory(s, id) {
  const earned = contractMemories(s).find(memory => memory.id === id);
  if (!earned) return `<p class="hint">${t('This picnic memory has not happened yet')}</p>`;
  return `<article class="scene contract-memory-detail" data-contract-id="${earned.id}">
    <h3>${iconHtml(earned.icon, '', 'mini')} ${t(earned.memory.title)}</h3><p>${t(earned.memory.text)}</p>
    ${earned.memory.lines.map(line => say(line.who, line.text)).join('')}
    <p class="reward">${coinMark()} ${t('{coins} coins were paid when you delivered this batch.', { coins: num(earned.coins) })}</p>
    <button class="btn wide" data-do="contracts">${t('Back to the picnic menu')}</button></article>`;
}
