// A small optional trail through existing places. Stage rules and rewards remain in core/exploration.mjs.
import { PICNIC_TRAIL, explorationStep } from '../content/exploration.mjs';
import { explorationStatus } from '../core/exploration.mjs';
import { t } from '../kit/i18n.mjs';
import { iconHtml, faceHtml } from './icon.mjs';
import { nameOf } from './bonds-panels.mjs';
import { showModal } from './modal.mjs';

const pendingMemories = new WeakMap();
const iconFor = step => step === 'porch' ? 'lucky_box' : step === 'pond' ? 'lucky_tin' : 'trail_picnic_ribbon';
const placeLabel = place => t(place === 'pond' ? 'Visit the pond dock' : 'Visit the farmhouse porch');
const go = place => `<button class="btn wide" data-do="explorationPlace" data-place="${place}">${placeLabel(place)}</button>`;

export function renderExplorationEntry(s, { album = false, location } = {}) {
  const status = explorationStatus(s);
  if ((!status.eligible && !status.earned.length) || (album && !status.earned.length)) return '';
  if (location && status.next?.location !== location) return '';
  const place = status.next?.location ?? 'porch';
  return `<section class="exploration-entry"><button class="next-project" data-do="explorationPlace" data-place="${place}">
    ${iconHtml('lucky_box', '', 'mini')}<span><b>${t(PICNIC_TRAIL.title)}</b><small>${status.complete ? t('A memory to keep') : t('An optional discovery trail')}</small></span></button></section>`;
}

export function renderExploration(s, place) {
  const status = explorationStatus(s), step = status.next;
  if (!status.eligible && !status.earned.length) return `<p class="hint">${t(PICNIC_TRAIL.hint)}</p>`;
  const next = step ? `<h3>${t(step.title)}</h3><p>${t(step.text)}</p>
    ${step.location === place ? `<button class="btn primary wide" data-do="inspectExploration" data-step="${step.id}">${t(step.label)}</button>` : go(step.location)}`
    : status.complete ? `<p>${t('This little family story is yours to keep.')}</p><button class="btn wide" data-do="wishBuild" data-kind="flowerpot">${t('Decorate with a flowerpot')}</button>` : '';
  return `<div class="exploration-trail"><p class="hint">${t(PICNIC_TRAIL.text)}</p><p class="hint">${t('Optional · no coins or materials needed')}</p>
    <p><b>${t('Clues found: {count} of {total}', { count: status.earned.length, total: PICNIC_TRAIL.steps.length })}</b></p>${next}
    ${status.earned.length ? `<h3>${t('Your picnic memories')}</h3>${status.earned.map(e => `<button class="next-project exploration-memory" data-do="explorationRead" data-step="${e.id}">${iconHtml(iconFor(e.id), '', 'mini')}<span><b>${t(e.title)}</b><small>${e.read ? t('In your album') : t('New discovery')}</small></span></button>`).join('')}` : ''}</div>`;
}

export function showExplorationMemory(game, stepId) {
  const step = explorationStep(stepId);
  if (!step || !explorationStatus(game.s).earned.some(e => e.id === stepId)) return false;
  const pending = pendingMemories.get(game) ?? new Set();
  if (pending.has(stepId)) return false;
  pending.add(stepId); pendingMemories.set(game, pending);
  showModal(`<div class="scene exploration-detail">${iconHtml(iconFor(stepId), '', 'family-art')}<h2>${t(step.title)}</h2><p>${t(step.story)}</p>
    ${step.lines.map(line => `<div class="scene-line">${faceHtml(line.who)}<div><b>${nameOf(line.who)}</b><p>${t(line.text)}</p></div></div>`).join('')}
    ${stepId === 'share' ? `<p class="reward">${iconHtml('flowerpot', '', 'mini')} ${t('One flowerpot was added to storage when you finished this memory.')}</p>` : ''}
    <button class="btn primary wide" data-close>${t('Keep exploring')}</button></div>`, { cls: 'exploration-modal',
      onOpen: () => game.do('readExploration', { step: stepId }),
      onClose: () => pending.delete(stepId),
    });
  return true;
}

export function watchExploration(game, hud) {
  return game.on(r => {
    for (const event of r.events ?? []) {
      if (event.type !== 'explorationStep') continue;
      const step = explorationStep(event.step); if (!step) continue;
      const toast = hud.toast(t('A little discovery: {name}', { name: t(step.title) }), 'good', { icon: iconFor(step.id), group: `exploration:${step.id}` });
      toast.setAttribute('role', 'button'); toast.tabIndex = 0;
      toast.setAttribute('aria-label', t('Read about {name}', { name: t(step.title) }));
      toast.addEventListener('click', () => showExplorationMemory(game, step.id));
      toast.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showExplorationMemory(game, step.id); } });
    }
  });
}
