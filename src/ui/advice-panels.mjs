// Optional village ideas. Current facts and stable read/defer history come from core/advice.mjs.
// Every preview is revalidated; UI actions acknowledge a card or open existing controls, never spend resources.
import { adviceCards, adviceOf, earnedCelebrations } from '../core/advice.mjs';
import { BUILDINGS } from '../content/buildings.mjs';
import { isWorking } from '../core/working.mjs';
import { explorationStep } from '../content/exploration.mjs';
import { t, tParams } from '../kit/i18n.mjs';
import { iconHtml, faceHtml } from './icon.mjs';
import { nameOf } from './bonds-panels.mjs';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const labels = { opportunity: 'Opportunity', blocker: 'What is blocking it?', activity: 'Something to enjoy', celebration: 'A village milestone' };
const attrs = card => `data-advice-id="${esc(card.id)}" data-id="${esc(card.id)}" data-context="${esc(card.context)}"`;
const text = (card, key) => esc(t(card[key], tParams(card.params)));
const category = card => esc(t(labels[card.type]));
const stateLabel = card => t(card.read ? 'Already read' : 'New idea');
const cardHtml = card => `<button class="next-project advice-card" data-do="readAdvice" ${attrs(card)}>
  ${iconHtml(card.icon, '', 'mini')}<b>${text(card, 'title')}</b><small>${category(card)} · ${esc(nameOf(card.person))} · ${esc(stateLabel(card))}</small></button>`;

/** Current opportunities and saved celebrations share one optional entry point with postponed ideas below. */
export function renderAdviceList(s, now) {
  const cards = adviceCards(s, now, { includeDeferred: true }), current = cards.filter(card => !card.deferred), deferred = cards.filter(card => card.deferred);
  return `<section class="today advice-list"><h3>${t('Village ideas')}</h3>
    ${current.map(cardHtml).join('') || `<p class="hint">${t('No new ideas just now. Try something you enjoy.')}</p>`}
    ${deferred.length ? `<details class="advice-deferred"><summary class="btn wide">${t('Postponed ideas')}</summary><div class="today">${deferred.map(cardHtml).join('')}</div></details>` : ''}
    </section>`;
}

/** Earned moments remain in the album even when their Today reminder was postponed. */
export function renderAdviceMemories(s) {
  const memories = earnedCelebrations(s);
  return memories.length ? `<section class="today advice-memories"><h3>${t('Village milestones')}</h3>${memories.map(cardHtml).join('')}</section>` : '';
}

/** May render a stale notice, because inventory or availability can change while the detail is open. */
export function renderAdviceDetail(s, ref, now) {
  const card = adviceOf(s, ref?.id, ref?.context, now, { includeDeferred: true });
  if (!card) return `<div class="advice-stale"><p class="hint">${t('This idea has changed. Here are your current options.')}</p><button class="btn wide" data-do="adviceToday">${t('Back to Today')}</button></div>`;
  return `<article class="discovery-detail advice-detail" ${attrs(card)}>
    <p class="hint">${category(card)} · ${esc(stateLabel(card))}</p>
    <h3>${iconHtml(card.icon, '', 'mini')} ${text(card, 'title')}</h3>
    <div class="scene-line">${faceHtml(card.person)}<div><b>${esc(nameOf(card.person))}</b><p>${text(card, 'line')}</p></div></div>
    <h3>${t('Why this helps')}</h3><p>${text(card, 'reason')}</p>
    <div class="today"><button class="btn go wide" data-do="showAdvice" ${attrs(card)}>${t('Show me')}</button>
      <button class="btn wide" data-do="${card.deferred ? 'restoreAdvice' : 'deferAdvice'}" ${attrs(card)}>${t(card.deferred ? 'Bring this idea back' : 'Maybe later')}</button>
      <button class="btn ghost wide" data-do="adviceToday">${t('Back to Today')}</button></div>
    </article>`;
}

const currentCard = (panels, ref) => adviceOf(panels.game.s, ref.id, ref.context, panels.game.now, { includeDeferred: true });
function stale(panels) {
  panels.hud?.toast(t('This idea has changed. Here are your current options.'), 'info');
  panels.show('today'); return false;
}

export function openAdvice(panels, ref) {
  const card = currentCard(panels, ref); if (!card) return stale(panels);
  // A deferred card was already acknowledged when postponed. Inspecting it must not restore it implicitly.
  if (!card.read && !card.deferred && !panels.game.do('readAdvice', { id: card.id, context: card.context }).ok) return stale(panels);
  panels.show('advice', { id: card.id, context: card.context }); return true;
}

export function changeAdvice(panels, action, ref) {
  if (!currentCard(panels, ref)) return stale(panels);
  if (!panels.game.do(action, { id: ref.id, context: ref.context }).ok) return stale(panels);
  panels.show('today'); return true;
}

/** Show me opens the actual target's existing controls. Placement and repair still require their own confirmation. */
export function followAdvice(panels, ref) {
  const card = currentCard(panels, ref); if (!card) return stale(panels);
  const s = panels.game.s, target = card.target;
  if (target.kind === 'order') {
    if (!s.orders.cards.some(order => order.id === target.id)) return stale(panels);
    panels.show('orders');
    [...panels.el.querySelectorAll('[data-order-id]')].find(el => el.dataset.orderId === target.id)?.scrollIntoView({ block: 'nearest' });
  } else if (target.kind === 'building') {
    const placed = s.placed[target.id], def = placed && BUILDINGS[placed.kind]; if (!def) return stale(panels);
    if (def.produces && isWorking(s, target.id)) panels.show('production', target.id);
    else if (def.fruitStand && isWorking(s, target.id)) panels.show('fruit_stand', target.id);
    else if (placed.kind === 'clinic' && isWorking(s, target.id)) panels.show('clinic', target.id);
    else { panels.close(); panels.onAdviceTarget?.(target); }
  } else if (target.kind === 'catalogue') {
    if (!BUILDINGS[target.buildingKind]) return stale(panels);
    panels.close(); panels.onBuildKind?.(target.buildingKind);
  } else if (target.kind === 'pond') {
    if (panels.onShowWay) { panels.close(); panels.onShowWay('pond'); } else panels.show('pond');
  } else if (target.kind === 'exploration') {
    const step = explorationStep(target.step); if (!step) return stale(panels);
    if (panels.onExplorePlace) { panels.close(); panels.onExplorePlace(step.location); }
    else panels.show('exploration', step.location);
  } else if (target.kind === 'land') {
    if (panels.onLandVisit) { panels.close(); panels.onLandVisit(target.parcel); }
    else panels.show('land', target.parcel);
  } else if (target.kind === 'learning') {
    if (panels.onLearningVisit) { panels.close(); panels.onLearningVisit(); }
    else panels.show('learning');
  } else if (target.kind === 'school-activity') panels.show('schoolActivity');
  else if (target.kind === 'repair' || target.kind === 'cell') {
    if (!panels.onAdviceTarget) return stale(panels);
    panels.close(); panels.onAdviceTarget(target);
  } else if (target.kind === 'fruit-stand') panels.show('fruit_stand');
  else if (target.kind === 'album') panels.show('album');
  else return stale(panels);
  return true;
}
