// Village panels (DESIGN 10, 11, 14): the Today board, the projects with "show the way" and a cottage with its family's
// hearts, gifts and today's wish. They draw into the shared sheet from panels.mjs. (The welcome card for a family that
// moves in is in bonds-panels.mjs.)
import { t, tParams, num } from '../kit/i18n.mjs';
import { STEPS } from '../content/projects.mjs';
import { FAMILIES, NEIGHBOURS } from '../content/people.mjs';
import { GOODS } from '../content/goods.mjs';
import { BUILDINGS, COTTAGE_LEVELS } from '../content/buildings.mjs';
import { RENT, BONDS, CHARM_MILESTONES } from '../content/economy.mjs';
import { currentStep, stepReady, deliveredAll, mayBuild, madeAt } from '../core/projects.mjs';
import { charmOf, rentPerHour, rentWaiting, needsOf } from '../core/homes.mjs';
import { levelOf, isRepairing } from '../core/working.mjs';
import { board } from '../core/today.mjs';
import { cartHere, cratesLeft } from '../core/cart.mjs';
import { unread } from '../core/bonds.mjs';
import * as barn from '../core/barn.mjs';
import { goodIcon, iconHtml, faceHtml, glyph, coinMark } from './icon.mjs';
import { thingName } from './repair-ui.mjs';
import { familyRows, wishLine, nameOf } from './bonds-panels.mjs';
import { renderDiscoveries } from './discovery-panels.mjs';
import { discoveryOf } from '../content/discoveries.mjs';

const neighbour = id => t(NEIGHBOURS.find(n => n.id === id)?.name ?? '');
const giftText = g => g.coins ? `${coinMark()} ${num(g.coins)}` : g.goods ? Object.entries(g.goods).map(([id, n]) => `${goodIcon(id, 'mini')} ×${n}`).join(' ')
  : Object.entries(g.stored).map(([k, n]) => `${iconHtml(k, '', 'mini')} ${t(BUILDINGS[k].name)} ×${n}`).join(' ');
const milestone = at => CHARM_MILESTONES.find(m => m.at === at);
/** Old news overwrote the scene threshold with its date. Recover only an unambiguous album match. */
function heartThreshold(e, s) {
  if (BONDS.scenes.includes(e.threshold)) return e.threshold;
  if (BONDS.scenes.includes(e.at)) return e.at;   // a live event passed directly by a caller
  const matches = BONDS.scenes.filter(at => s?.firsts?.[`heart:${e.person}:${at}`] === e.at);
  return matches.length === 1 ? matches[0] : null;
}
/** One line of village news for each kind of event (act.mjs NEWS). */
export const NEWS = {
  discovery: e => `${glyph('gift', 'g')} ${t('Lucky find: {name}', { name: t(discoveryOf(e.id)?.title ?? 'Lucky discovery') })}`,
  repaired: e => `${glyph('wrench', 'g')} ${t('Repaired: {name}', { name: thingName(null, e.id) ?? t(BUILDINGS[e.kind]?.name ?? '') })}`,
  neighbourRepair: e => `${glyph('wrench', 'g')} ${t('{name} mended the {thing}!', { name: t(NEIGHBOURS.find(n => n.id === e.id)?.name ?? ''), thing: thingName(null, e.target) ?? t(BUILDINGS[e.kind]?.name ?? '') })}`,
  houseUpgraded: e => `${glyph('home', 'g')} ${t('The farmhouse is now level {level}', { level: e.level })}`,
  projectDone: e => `${glyph('projects', 'g')} ${t('Project done: {name}', { name: t(e.name) })}`,
  familyArrived: e => `${iconHtml('cottage', '', 'mini')} ${t('{family} moved in', { family: t(FAMILIES.find(f => f.id === e.family)?.name ?? '') })}`,
  neighbourVisit: e => `${faceHtml(e.id, 'mini-face')} ${t('{name} visited and helped your crops', { name: neighbour(e.id) })}`,
  traded: e => `${faceHtml(e.id, 'mini-face')} ${t('You traded with {name}', { name: neighbour(e.id) })}`,
  levelUp: e => `${glyph('star', 'g')} ${t('Level {level}!', { level: e.level })}`,
  heartScene: (e, s) => {
    const count = heartThreshold(e, s), name = nameOf(e.person);
    return `${glyph('heart', 'g')} ${count == null ? `${t('Heart scene')} · ${name}` : t('{name} and you: {count} hearts', { name, count })}`;
  },
  wishGranted: e => `${glyph('charm', 'g')} ${t('You granted {name}\'s wish: {item}', { name: nameOf(e.person), item: t(BUILDINGS[e.kind]?.name ?? e.kind) })}`,
  cartSent: e => `${glyph('cart', 'g')} ${t('Market cart takings: {coins} coins', { coins: num(e.coins ?? 0) })}${e.decor && BUILDINGS[e.decor] ? ` · ${iconHtml(e.decor, '', 'mini')}` : ''}`,
  charmMilestone: e => {
    // Legacy news still identifies the milestone by its decoration even though at is a timestamp.
    const reached = milestone(e.threshold ?? e.at) ?? CHARM_MILESTONES.find(m => m.decor === e.decor);
    return `${glyph('charm', 'g')} ${t('Village charm {charm}: {name} goes up', { charm: reached?.at ?? e.charm, name: t(reached?.name ?? e.decor) })}`;
  },
  letter: e => `${glyph('mail', 'g')} ${t('A letter came from {name}', { name: nameOf(e.from) })}`,
};

export function renderToday(s, now) {
  const b = board(s, now), w = b.waiting;
  const ready = [w.beds && [goodIcon('wheat', 'mini'), t('{count} crops ready', { count: w.beds })], w.fruit && [goodIcon('apple', 'mini'), t('{count} fruit trees ready to pick', { count: w.fruit })],
    w.animals && [goodIcon('egg', 'mini'), t('{count} animal goods ready', { count: w.animals })], w.products && [goodIcon('bread', 'mini'), t('{count} products ready', { count: w.products })],
    w.rent && [glyph('mail', 'g'), t('{coins} coins of rent in the mailbox', { coins: num(w.rent) })]].filter(Boolean);
  const trades = Object.entries(s.neighbours).filter(([, n]) => n.trade?.state === 'open').map(([id, n]) => {
    const give = Object.entries(n.trade.gives)[0], want = Object.entries(n.trade.wants)[0];
    return `<div class="trade">${faceHtml(id)}<span class="trade-text">${t('{name} offers {give} for {want}', { name: neighbour(id), give: `${goodIcon(give[0], 'mini')} ×${give[1]}`, want: `${goodIcon(want[0], 'mini')} ×${want[1]}` })}</span>
      <button class="btn primary small" data-do="trade" data-id="${id}" ${barn.hasAll(s, n.trade.wants) ? '' : 'disabled'}>${t('Accept')}</button><button class="btn ghost small" data-do="decline" data-id="${id}">${t('No thanks')}</button></div>`;
  }).join('');
  const step = currentStep(s), mail = unread(s), days = s.today.days ?? 0;
  const wishes = (s.wishes?.list ?? []).filter(x => !x.done && s.placed[x.home]);
  return `<div class="today">
    ${renderDiscoveries(s)}
    <div class="gift">${glyph('gift', 'g big')}<div><b>${t("Today's gift")}</b><small>${giftText(b.gift)}</small></div>
      ${b.claimed ? `<span class="done">${glyph('check', 'g')} ${t('Claimed')}</span>` : `<button class="btn primary" data-do="claimGift">${t('Claim')}</button>`}</div>
    ${days ? `<div class="streak">${iconHtml('garden_flower', '', 'mini')}<span>${t('Streak garden: day {count}', { count: days })}</span></div>` : ''}
    ${cartHere(s) ? `<button class="next-project" data-do="cart">${glyph('cart', 'g')} ${t('The market cart is at the gate')} <small>${t('{count} crates to fill', { count: cratesLeft(s) })}</small></button>` : ''}
    ${mail ? `<button class="next-project" data-do="mail">${glyph('mail', 'g')} ${t('{count} new letters', { count: mail })}</button>` : ''}
    ${ready.length ? `<h3>${t('While you were away')}</h3><ul class="ready">${ready.map(([i, r]) => `<li>${i}<span>${r}</span></li>`).join('')}</ul>` : ''}
    ${wishes.length ? `<h3>${t("Today's wishes")}</h3>${wishes.map(x => wishLine(s, x.home)).join('')}` : ''}
    ${step ? `<h3>${t('Next project')}</h3><button class="next-project" data-do="projects">${glyph('projects', 'g')} ${t(step.name)} <small>${stepReady(s, now).ok ? t('Ready to start') : t('Not open yet')}</small></button>` : ''}
    ${trades ? `<h3>${t('Trades')}</h3>${trades}` : ''}
    ${s.news?.length ? `<h3>${t('Village news')}</h3><ul class="news">${s.news.slice(0, 5).map(e => NEWS[e.type] ? `<li>${NEWS[e.type](e, s)}</li>` : '').join('')}</ul>` : ''}
  </div>`;
}

export function renderProjects(s, now) {
  const step = currentStep(s);
  const list = STEPS.map((st, i) => `<li class="${i < s.projects.step ? 'done' : i === s.projects.step ? 'now' : ''}">${glyph(i < s.projects.step ? 'check' : i === s.projects.step ? 'play' : 'dot', 'g')} ${t(st.name)}</li>`).join('');
  if (!step) return `<p class="hint">${t('Every project of this version is done. More are coming!')}</p><ul class="steps">${list}</ul>`;
  const ready = stepReady(s, now), reqs = [];
  if (step.needs.level) reqs.push([s.level >= step.needs.level, t('Reach level {level}', { level: step.needs.level })]);
  if (step.needs.families) { const miss = ready.missing.find(m => m.need === 'families'); reqs.push([!miss, t('{count} settled families ({have} so far)', { count: step.needs.families, have: miss ? miss.have : step.needs.families })]); }
  if (step.needs.kidsFamilies) { const miss = ready.missing.find(m => m.need === 'kidsFamilies'); reqs.push([!miss, t('{count} families with children ({have} so far)', { count: step.needs.kidsFamilies, have: miss ? miss.have : step.needs.kidsFamilies })]); }
  const goods = Object.entries(step.deliver ?? {}).map(([g, n]) => {
    const given = s.projects.delivered[g] ?? 0, have = barn.stock(s, g), left = n - given, at = madeAt(g);
    const way = left > 0 && have < left ? `<button class="link" data-do="showWay" data-at="${at}">${t('Made at: {place}', { place: at === 'farm' ? t('Farm') : t(BUILDINGS[at].name) })}</button>` : '';
    return `<div class="need-row"><span class="good ${given >= n ? 'ok' : have >= left ? 'ok' : 'short'}">${goodIcon(g, 'mini')} ${given}/${n}</span><small>${t(GOODS[g].name)} · ${t('{count} in the barn', { count: have })}</small>${way}</div>`;
  }).join('');
  const kind = step.builds.find(k => !['path', 'bed', 'fence', 'gate'].includes(k)), may = kind && mayBuild(s, kind);
  // in the restored village the work is repairing what stands: the button takes you to the run-down thing
  const run = s.mode === 'restore' ? step.builds.find(k => Object.keys(s.placed).some(id => s.placed[id].kind === k && levelOf(s, id) >= 3 && !isRepairing(s, id))) : null, runMay = run && mayBuild(s, run, { repair: true });
  return `<button class="btn wide" data-do="roadmap">${t('Roadmap')}</button><div class="project"><h3>${glyph('play', 'g')} ${t(step.name)}</h3><p>${t(s.mode === 'restore' && step.restore ? step.restore : step.text)}</p>
    ${reqs.map(([ok, text]) => `<div class="req ${ok ? 'ok' : ''}">${glyph(ok ? 'check' : 'lock', 'g')} ${text}</div>`).join('')}
    ${goods ? `<div class="needs-list">${goods}</div>${ready.ok && !deliveredAll(s, step) ? `<button class="btn primary wide" data-do="projectDeliver">${t('Deliver goods')}</button>` : ''}` : ''}
    ${run ? `<button class="btn primary wide" data-do="goRepair" data-kind="${run}" ${runMay?.ok && ready.ok ? '' : 'disabled'}>${glyph('wrench', 'g')} ${t('Repair: {name}', { name: t(BUILDINGS[run].name) })}</button>${runMay && !runMay.ok ? `<p class="hint">${glyph('lock', 'g')} ${t(runMay.reason, tParams(runMay.params))}</p>` : ''}` : kind ? `<button class="btn primary wide" data-do="buildProject" data-kind="${kind}" ${may?.ok && ready.ok ? '' : 'disabled'}>${iconHtml(kind, '', 'mini')} ${t('Build: {name}', { name: t(BUILDINGS[kind].name) })}</button>${may && !may.ok ? `<p class="hint">${glyph('lock', 'g')} ${t(may.reason, tParams(may.params))}</p>` : ''}` : `<p class="hint">${t('Use build mode to finish this step.')}</p>`}
  </div><ul class="steps">${list}</ul>`;
}

export function renderCottage(s, id, now) {
  const h = s.homes[id]; if (!h) return '';
  const fam = FAMILIES.find(f => f.id === h.family), arrived = h.arrivesAt <= now, charm = charmOf(s, id), needs = needsOf(s, id), next = COTTAGE_LEVELS[h.level + 1];
  return `<div class="cottage">
    <div class="cottage-top">${fam ? iconHtml(`family:${fam.id}`, '', 'family-art') : glyph('home', 'g huge')}<div><b>${fam ? (arrived ? t(fam.name) : t('{family} are on their way', { family: t(fam.name) })) : t('Waiting for a family')}</b>
      <div class="stats"><span>${glyph('home', 'g')} ${t(COTTAGE_LEVELS[h.level].name)}</span><span>${glyph('charm', 'g')} ${t('Charm {charm}', { charm })}</span><span>${coinMark()} ${t('{coins} an hour', { coins: num(rentPerHour(s, id), 1) })}</span></div></div></div>
    ${fam ? familyRows(s, fam, now, arrived) : ''}
    ${arrived ? wishLine(s, id) : ''}
    ${needs.includes('path') ? `<p class="hint warn">${t('This family needs a path at their door. Rent is lower until then.')}</p>` : ''}
    <div class="row">${rentWaiting(s, now) ? `<button class="btn primary" data-do="collectRent">${glyph('mail', 'g')} ${t('Collect rent ({coins})', { coins: num(rentWaiting(s, now)) })}</button>` : ''}
    ${next ? `<button class="btn orange" data-do="upgradeHome" data-id="${id}">${glyph('up', 'g')} ${t('Furnish: {level}', { level: t(next.name) })} · ${coinMark()} ${num(RENT.upgradeCost[h.level + 1])}</button>` : ''}</div>
    <p class="hint">${t('Flowers, trees, benches and lamps near a cottage raise its charm and its rent.')}</p>
  </div>`;
}
