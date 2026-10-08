// Optional late-village board, suitable for lazy loading. All spending stays behind explicit action buttons.
import { GROWTH, COMPANY_BRANDS, BULK_REQUESTS, HOSPITAL_MEMORY } from '../content/village-growth.mjs';
import { BUILDINGS } from '../content/buildings.mjs';
import { GOODS, RECIPES } from '../content/goods.mjs';
import { allPeople } from '../content/people.mjs';
import { growthStatus } from '../core/village-growth.mjs';
import { recipeOpen, productionOf } from '../core/production.mjs';
import * as barn from '../core/barn.mjs';
import { t, num } from '../kit/i18n.mjs';
import { goodIcon, faceHtml } from './icon.mjs';
import { goodHelpButton } from './good-help-panel.mjs';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const names = Object.fromEntries(allPeople().map(person => [person.id, person.name]));
const nameOf = id => t(names[id] ?? id);
const button = (action, label, data = '', disabled = false) => `<button class="btn wide" data-do="${action}" ${data} ${disabled ? 'disabled' : ''}>${label}</button>`;
const needs = (s, goods) => Object.entries(goods).map(([good, n]) => `<div class="set-row">${goodIcon(good, 'mini')} <span>${t(GOODS[good].name)} ${num(Math.min(n, barn.free(s, good)))}/${num(n)}</span>${goodHelpButton(good, n)}</div>`).join('');

export function renderVillageGrowth(s, now) {
  const g = growthStatus(s, now);
  let body = `<section class="village-growth"><h3>${t('Room for the village to grow')}</h3><p>${t('Optional projects, familiar neighbours, and useful things made here.')}</p>
    <h3>${goodIcon('hospital', 'mini')} ${t('Our little hospital')}</h3>`;
  if (g.hospitalAt !== null) body += `<p>${t('The hospital pantry can now place company requests.')}</p>${button('growthMemory', t(HOSPITAL_MEMORY.title), 'data-id="hospital"')}`;
  else body += `<p>${t('Upgrade the existing clinic: level {level}, {coins} coins, and these supplies.', { level: GROWTH.hospital.level, coins: num(GROWTH.hospital.coins) })}</p>${needs(s, GROWTH.hospital.need)}
    <p class="hint">${t('Opens hospital supply requests. The clinic keeps its place in the village.')}</p>
    ${g.hospitalReason ? `<p>${t(g.hospitalReason, { level: GROWTH.hospital.level })}</p>` : ''}${button('upgradeHospital', t('Confirm the hospital upgrade'), '', !g.canUpgradeHospital)}`;
  body += `<h3>${t('Police post')}</h3><p>${t('A working post adds 5% to company delivery payments. The price is fixed when the truck leaves.')}</p>
    <p>${t('Level {level} · {coins} coins', { level: GROWTH.police.level, coins: num(GROWTH.police.coins) })}</p>${button('growthSite', t(g.police ? 'Visit the police post' : 'Preview the old police post'), 'data-kind="police"')}
    <h3>${t('Company office')}</h3><p>${t('Level {level} · {coins} coins · two different working food factories', { level: GROWTH.company.level, coins: num(GROWTH.company.coins) })}</p>
    ${button('growthSite', t('Visit the old company office'), 'data-kind="company"')}`;
  const earned = BULK_REQUESTS.filter(request => g.memories[request.id] != null);
  if (earned.length) body += `<h3>${t('Company memories')}</h3>${earned.map(request => button('growthMemory', t(request.title), `data-id="${request.id}"`)).join('')}`;
  if (!g.ready) return `${body}<p class="hint">${t('Open the company with two working food factories first')}</p></section>`;
  body += `<h3>${t(COMPANY_BRANDS[g.active?.brand ?? g.brand])} · ${t(g.next.title)}</h3><p>${t(g.next.text)}</p>${needs(s, g.next.need)}
    <p>${t('Whole request: {units} goods · payment {coins} coins', { units: g.units, coins: num(g.payment) })}</p>
    <p>${t('Uses one empty truck from your market fleet. Goods leave now; collect the payment when it returns.')}</p>
    ${g.reason ? `<p class="hint">${t(g.reason)}</p>` : ''}${button('sendCompanyDelivery', t('Confirm goods and send the truck'), `data-id="${g.next.id}"`, !g.canSend)}
    ${g.active && !g.active.away ? button('growthMarket', t('Collect at the market')) : ''}
    <p class="hint">${t('The three requests come around again after each payment. There is no deadline or penalty for waiting.')}</p>`;
  body += `<h3>${t('Choose our label')}</h3><p>${t('The label belongs to your deliveries. Recipes and goods stay the same.')}</p>
    ${Object.entries(COMPANY_BRANDS).map(([id, name]) => button('chooseCompanyBrand', `${g.brand === id ? '✓ ' : ''}${t(name)}`, `data-brand="${id}"`, g.brand === id)).join('')}
    <details class="growth-staff" data-growth-detail="staff"><summary class="btn wide">${t('Neighbours at work')}</summary><p>${t('One worker and one manager. The invitation fee is paid once per hire; there are no daily wages.')}</p>
    <p>${t('The worker makes new batches at one assigned factory 10% faster. A manager helps you confirm up to three batches at once.')}</p>`;
  for (const role of ['worker', 'manager']) {
    body += `<h4>${t(role === 'worker' ? 'Factory worker' : 'Company manager')} · ${num(GROWTH.hiring[role])}</h4>`;
    if (g.staff[role]) body += `<p>${esc(nameOf(g.staff[role].person))}${role === 'worker' ? ` · ${t(BUILDINGS[s.placed[g.staff[role].building]?.kind]?.name ?? 'Factory unavailable')}` : ''}</p>${button('releaseCompanyStaff', t('Let this neighbour rest'), `data-role="${role}"`)}`;
    else for (const person of g.staffOptions.filter(p => !Object.values(g.staff).some(staff => staff?.person === p.id))) {
      if (role === 'manager') body += button('hireCompanyStaff', t('Invite {name} · {coins} coins', { name: nameOf(person.id), coins: num(GROWTH.hiring[role]) }), `data-role="manager" data-person="${person.id}"`, s.coins < GROWTH.hiring[role]);
      else for (const factory of g.factories) body += button('hireCompanyStaff', t('{name} at {building} · {coins} coins', { name: nameOf(person.id), building: t(BUILDINGS[factory.kind].name), coins: num(GROWTH.hiring[role]) }), `data-role="worker" data-person="${person.id}" data-building="${factory.id}"`, s.coins < GROWTH.hiring[role]);
    }
  }
  body += '</details>';
  if (g.staff.manager) {
    body += `<details class="growth-batches" data-growth-detail="batches"><summary class="btn wide">${t('A batch plan you approve')}</summary><p>${t('Choose one or three batches. The displayed ingredients are used immediately; the plan never repeats itself.')}</p>`;
    for (const factory of g.factories) for (const [recipe, r] of Object.entries(RECIPES).filter(([id, r]) => r.at === factory.kind && recipeOpen(s, id))) {
      const q = productionOf(s, factory.id);
      body += `<h4>${t(r.name)} · ${t(BUILDINGS[factory.kind].name)}</h4>`;
      for (const n of [1, 3]) {
        const inputs = Object.fromEntries(Object.entries(r.needs).map(([id, count]) => [id, count * n]));
        body += `<p>${n === 1 ? t('One batch makes {goods}.', { goods: r.makes }) : t('{batches} batches make {goods}.', { batches: n, goods: r.makes * n })}</p>${needs(s, inputs)}
          ${button('companyBatch', n === 1 ? t('Confirm one batch') : t('Confirm {count} batches', { count: n }), `data-building="${factory.id}" data-recipe="${recipe}" data-count="${n}"`, q.queue.length + n > q.slots || !barn.hasAll(s, inputs))}`;
      }
    }
  }
  if (g.staff.manager) body += '</details>';
  return `${body}</section>`;
}

export function renderGrowthMemory(s, id) {
  const g = growthStatus(s), request = BULK_REQUESTS.find(r => r.id === id);
  const memory = id === 'hospital' && g.hospitalAt !== null ? HOSPITAL_MEMORY
    : request && g.memories[id] != null ? { title: request.title, lines: request.memory } : null;
  if (!memory) return `<p>${t('This village memory has not happened yet')}</p>`;
  return `<article class="scene discovery-detail"><h3>${t(memory.title)}</h3>${memory.lines.map(line => `<div class="scene-line">${faceHtml(line.who)}<div><b>${esc(nameOf(line.who))}</b><p>${t(line.text)}</p></div></div>`).join('')}
    ${button('villageGrowth', t('Back to the village board'))}</article>`;
}
