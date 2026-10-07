// Village panels (DESIGN 10, 11, 14): the Today board, the projects with "show the way", a cottage, and the welcome card
// for a family that has just moved in. They draw into the shared sheet from panels.mjs.
import { t, num } from '../kit/i18n.mjs';
import { STEPS } from '../content/projects.mjs';
import { FAMILIES, NEIGHBOURS } from '../content/people.mjs';
import { GOODS } from '../content/goods.mjs';
import { BUILDINGS, COTTAGE_LEVELS } from '../content/buildings.mjs';
import { RENT } from '../content/economy.mjs';
import { currentStep, stepReady, deliveredAll, mayBuild, madeAt } from '../core/projects.mjs';
import { charmOf, rentPerHour, rentWaiting, needsOf } from '../core/homes.mjs';
import { board } from '../core/today.mjs';
import * as barn from '../core/barn.mjs';
import { FACES, goodIcon } from './panels.mjs';
import { ICONS } from './build-view.mjs';

const giftText = g => g.coins ? `🪙 ${num(g.coins)}` : g.goods ? Object.entries(g.goods).map(([id, n]) => `${goodIcon(id)} ×${n}`).join(' ') : Object.entries(g.stored).map(([k, n]) => `${ICONS[k] ?? '🎁'} ${t(BUILDINGS[k].name)} ×${n}`).join(' ');
const NEWS = {
  projectDone: e => `🏛 ${t('Project done: {name}', { name: t(e.name) })}`,
  familyArrived: e => `🏡 ${t('{family} moved in', { family: t(FAMILIES.find(f => f.id === e.family)?.name ?? '') })}`,
  neighbourVisit: e => `👋 ${t('{name} visited and helped your crops', { name: t(NEIGHBOURS.find(n => n.id === e.id)?.name ?? '') })}`,
  traded: e => `🤝 ${t('You traded with {name}', { name: t(NEIGHBOURS.find(n => n.id === e.id)?.name ?? '') })}`,
  levelUp: e => `⭐ ${t('Level {level}!', { level: e.level })}`,
};

export function renderToday(s, now) {
  const b = board(s, now), w = b.waiting;
  const ready = [w.beds && `🌱 ${t('{count} crops ready', { count: w.beds })}`, w.animals && `🥚 ${t('{count} animal goods ready', { count: w.animals })}`,
    w.products && `🍞 ${t('{count} products ready', { count: w.products })}`, w.rent && `📬 ${t('{coins} coins of rent in the mailbox', { coins: num(w.rent) })}`].filter(Boolean);
  const trades = Object.entries(s.neighbours).filter(([, n]) => n.trade?.state === 'open').map(([id, n]) => {
    const who = NEIGHBOURS.find(x => x.id === id), give = Object.entries(n.trade.gives)[0], want = Object.entries(n.trade.wants)[0];
    return `<div class="trade"><span class="face">${FACES[id]}</span><span>${t('{name} offers {give} for {want}', { name: t(who.name), give: `${goodIcon(give[0])} ×${give[1]}`, want: `${goodIcon(want[0])} ×${want[1]}` })}</span>
      <button class="btn primary" data-do="trade" data-id="${id}" ${barn.hasAll(s, n.trade.wants) ? '' : 'disabled'}>${t('Accept')}</button><button class="btn ghost" data-do="decline" data-id="${id}">${t('No thanks')}</button></div>`;
  }).join('');
  const step = currentStep(s);
  return `<div class="today">
    <div class="gift"><span class="icon">🎁</span><div><b>${t("Today's gift")}</b><small>${giftText(b.gift)}</small></div>
      ${b.claimed ? `<span class="done">✔ ${t('Claimed')}</span>` : `<button class="btn primary" data-do="claimGift">${t('Claim')}</button>`}</div>
    ${ready.length ? `<h3>${t('While you were away')}</h3><ul>${ready.map(r => `<li>${r}</li>`).join('')}</ul>` : ''}
    ${step ? `<h3>${t('Next project')}</h3><button class="next-project" data-do="projects">🏛 ${t(step.name)} <small>${stepReady(s, now).ok ? t('Ready to start') : t('Not open yet')}</small></button>` : ''}
    ${trades ? `<h3>${t('Trades')}</h3>${trades}` : ''}
    ${s.news?.length ? `<h3>${t('Village news')}</h3><ul class="news">${s.news.slice(0, 5).map(e => `<li>${NEWS[e.type]?.(e) ?? ''}</li>`).join('')}</ul>` : ''}
  </div>`;
}

export function renderProjects(s, now) {
  const step = currentStep(s);
  const list = STEPS.map((st, i) => `<li class="${i < s.projects.step ? 'done' : i === s.projects.step ? 'now' : ''}">${i < s.projects.step ? '✔' : i === s.projects.step ? '▶' : '·'} ${t(st.name)}</li>`).join('');
  if (!step) return `<p class="hint">${t('Every project of this version is done. More are coming!')}</p><ul class="steps">${list}</ul>`;
  const ready = stepReady(s, now), reqs = [];
  if (step.needs.level) reqs.push([s.level >= step.needs.level, t('Reach level {level}', { level: step.needs.level })]);
  if (step.needs.kidsFamilies) { const miss = ready.missing.find(m => m.need === 'kidsFamilies'); reqs.push([!miss, t('{count} families with children ({have} so far)', { count: step.needs.kidsFamilies, have: miss ? miss.have : step.needs.kidsFamilies })]); }
  const goods = Object.entries(step.deliver ?? {}).map(([g, n]) => {
    const given = s.projects.delivered[g] ?? 0, have = barn.stock(s, g), left = n - given, at = madeAt(g);
    const way = left > 0 && have < left ? `<button class="link" data-do="showWay" data-at="${at}">${t('Made at: {place}', { place: at === 'farm' ? t('Farm') : t(BUILDINGS[at].name) })} →</button>` : '';
    return `<div class="need-row"><span class="good ${given >= n ? 'ok' : have >= left ? 'ok' : 'short'}">${goodIcon(g)} ${given}/${n}</span><small>${t(GOODS[g].name)} · ${t('{count} in the barn', { count: have })}</small>${way}</div>`;
  }).join('');
  const kind = step.builds.find(k => !['path', 'bed', 'fence', 'gate'].includes(k)), may = kind && mayBuild(s, kind);
  return `<div class="project"><h3>▶ ${t(step.name)}</h3><p>${t(step.text)}</p>
    ${reqs.map(([ok, text]) => `<div class="req ${ok ? 'ok' : ''}">${ok ? '✔' : '○'} ${text}</div>`).join('')}
    ${goods ? `<div class="needs-list">${goods}</div>${ready.ok && !deliveredAll(s, step) ? `<button class="btn primary" data-do="projectDeliver">${t('Deliver goods')}</button>` : ''}` : ''}
    ${kind ? `<button class="btn primary" data-do="buildProject" data-kind="${kind}" ${may?.ok && ready.ok ? '' : 'disabled'}>${ICONS[kind] ?? '🔨'} ${t('Build: {name}', { name: t(BUILDINGS[kind].name) })}</button>${may && !may.ok ? `<p class="hint">${t(may.reason, may.params)}</p>` : ''}` : `<p class="hint">${t('Use build mode to finish this step.')}</p>`}
  </div><ul class="steps">${list}</ul>`;
}

export function renderCottage(s, id, now) {
  const h = s.homes[id]; if (!h) return '';
  const fam = FAMILIES.find(f => f.id === h.family), arrived = h.arrivesAt <= now, charm = charmOf(s, id), needs = needsOf(s, id), next = COTTAGE_LEVELS[h.level + 1];
  return `<div class="cottage">
    <p>${fam ? (arrived ? `${t(fam.name)}` : t('{family} are on their way', { family: t(fam.name) })) : t('Waiting for a family')}</p>
    ${fam ? `<div class="family">${fam.people.map(p => `<div class="person"><span class="face">${FACES[p.id] ?? '🙂'}</span><b>${t(p.name)}</b><small>${t(p.role)}</small></div>`).join('')}</div>` : ''}
    <div class="stats"><span>🏠 ${t(COTTAGE_LEVELS[h.level].name)}</span><span>✨ ${t('Charm {charm}', { charm })}</span><span>🪙 ${t('{coins} an hour', { coins: rentPerHour(s, id).toFixed(1) })}</span></div>
    ${needs.includes('path') ? `<p class="hint warn">${t('This family needs a path at their door. Rent is lower until then.')}</p>` : ''}
    <div class="row">${rentWaiting(s, now) ? `<button class="btn primary" data-do="collectRent">📬 ${t('Collect rent ({coins})', { coins: num(rentWaiting(s, now)) })}</button>` : ''}
    ${next ? `<button class="btn" data-do="upgradeHome" data-id="${id}">⬆ ${t('Furnish: {level}', { level: t(next.name) })} · 🪙 ${num(RENT.upgradeCost[h.level + 1])}</button>` : ''}</div>
    <p class="hint">${t('Flowers, trees, benches and lamps near a cottage raise its charm and its rent.')}</p>
  </div>`;
}

/** The welcome card when a family moves in (DESIGN 10, step 3). Cards wait their turn if several families arrive. */
const waiting = [];
export function showWelcome(root, familyId) {
  const fam = FAMILIES.find(f => f.id === familyId); if (!fam) return;
  if (root.querySelector('.modal')) { waiting.push(familyId); return; }
  const el = document.createElement('div'); el.className = 'modal';
  el.innerHTML = `<div class="card-modal"><h2>🏡 ${t('{family} moved in!', { family: t(fam.name) })}</h2>
    ${fam.people.map(p => `<div class="person-line"><span class="face">${FACES[p.id] ?? '🙂'}</span><div><b>${t(p.name)}</b> · <small>${t(p.role)}</small><p>“${t(p.line)}”</p></div></div>`).join('')}
    <button class="btn primary" data-close>${t('Welcome!')}</button></div>`;
  el.addEventListener('click', e => { if (e.target === el || e.target.closest('[data-close]')) { el.remove(); if (waiting.length) showWelcome(root, waiting.shift()); } });
  root.appendChild(el);
}
