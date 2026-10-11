// Optional practical learning. Browsing is free; only the named project buttons spend anything.
import { LEARNING, REPAIR_LESSON, GARDEN_STEPS } from '../content/learning.mjs';
import { learningStatus } from '../core/learning.mjs';
import { t, num } from '../kit/i18n.mjs';
import { shortTime } from '../core/clock.mjs';
import { iconHtml, faceHtml, coinMark } from './icon.mjs';
import { nameOf } from './bonds-panels.mjs';
import { goodHelpButton } from './good-help-panel.mjs';

const button = (action, text, attrs = '', disabled = false, primary = false) => `<button class="btn ${primary ? 'primary ' : action === 'learningVisit' ? 'go ' : ''}wide" data-do="${action}" ${attrs} ${disabled ? 'disabled' : ''}>${text}</button>`;
const memories = status => status.earned.length ? `<section class="learning-memories"><h3>${t('Repair memories')}</h3>${status.earned.map(memory =>
  `<button class="next-project" data-do="learningMemory" data-id="${memory.id}">${iconHtml(memory.id === 'seed-label' ? 'strawberry' : 'bench', '', 'mini')}<span><b>${t(memory.title)}</b><small>${t(memory.read ? 'In your album' : 'New discovery')}</small></span></button>`).join('')}</section>` : '';

export function renderLearningEntry(s, now, { album = false } = {}) {
  const status = learningStatus(s, now);
  if (album) return memories(status);
  if (!status.eligible && !status.introduced && !status.learned) return '';
  return `<button class="next-project" data-do="learning">${iconHtml(status.complete ? 'strawberry' : 'bench', '', 'mini')}<span><b>${t(LEARNING.project)}</b><small>${t(status.complete ? 'A new crop to try' : 'A lesson and a hidden seed label')}</small></span></button>`;
}

export function renderLearning(s, now) {
  const status = learningStatus(s, now);
  let body = `<section class="learning-project"><h3>${t('Learn a little, make something useful')}</h3><p>${t('An optional lesson and a small repair beside the farmhouse.')}</p>`;
  if (!status.eligible && !status.learned) return `${body}<p class="hint">${t('Meet the carpenter after the first family arrives to learn garden repairs.')}</p></section>`;
  if (!status.introduced) return `${body}<p>${t(LEARNING.intro)}</p><p class="hint">${t('Looking and learning cost no coins or energy.')}</p>
    ${button('inspectLearning', t('Inspect the old bench — free'), '', false, true)}${button('learningVisit', t('Visit the old potting bench'))}</section>`;
  if (!status.learned) {
    const question = status.question;
    body += `<div class="scene-line">${faceHtml('minh')}<div><b>${nameOf('minh')}</b><p>${t('Two practical questions, with as many tries as you like.')}</p></div></div>
      <p class="hint">${t('Question {n} of {total}', { n: status.lessonIndex + 1, total: REPAIR_LESSON.length })}</p><h3>${t(question.prompt)}</h3>
      <div class="lesson-answers">${question.choices.map(choice => button('answerRepairLesson', t(choice.text), `data-question="${question.id}" data-choice="${choice.id}"`)).join('')}</div>`;
    return `${body}</section>`;
  }
  body += `<p><b>${t('Garden repairs learned')}</b></p><p>${t('The restored bench unlocks strawberries for ordinary crop beds from level 4.')}</p>`;
  if (!status.complete) {
    body += `<p class="hint">${t('Project total: {coins} coins and {energy} energy, across three steps.', {
      coins: GARDEN_STEPS.reduce((sum, step) => sum + step.coins, 0), energy: GARDEN_STEPS.reduce((sum, step) => sum + step.energy, 0) })}</p>
      <p class="hint">${t('Each button pays only for its named step. There is no deadline.')}</p>`;
    body += `<div class="project-energy"><b>${t('Project energy')}</b><div class="cap-bar" role="progressbar" aria-label="${t('Project energy')}" aria-valuemin="0" aria-valuemax="${status.cap}" aria-valuenow="${status.energy}"><i style="width:${status.energy / status.cap * 100}%"></i><b>${num(status.energy)}/${status.cap}</b></div></div>
      <p class="hint">${t('Only optional projects use energy. Farm, cook, fish and sell whenever you like.')}</p><p class="hint">${t('Energy returns by one point per minute, even while away.')}</p>
      ${status.resting ? `<p role="status">${t('Resting · {time} left', { time: shortTime(status.restLeftMs) })}</p>` : button('restForProject', t('Rest for {time}: +{energy} energy, free', { time: shortTime(LEARNING.restMs), energy: LEARNING.restGain }), '', !status.canRest)}`;
    body += `<ol class="garden-steps">${GARDEN_STEPS.map(step => `<li class="${status.steps.includes(step.id) ? 'done' : ''}" data-garden-step="${step.id}"><b>${status.steps.includes(step.id) ? '✓ ' : ''}${t(step.name)}</b><small>${coinMark()} ${t('{coins} coins · {energy} energy', { coins: step.coins, energy: step.energy })}</small></li>`).join('')}</ol>`;
    if (status.coinsNeeded) body += `<p class="hint">${t('Need {coins} more coins for this step.', { coins: num(status.coinsNeeded) })}</p>`;
    if (status.energyNeeded) body += `<p class="hint">${t('Need {energy} more energy. Rest here for free or come back later.', { energy: status.energyNeeded })}</p>`;
    body += button('workGardenProject', `${t('Confirm: {step}', { step: t(status.nextStep.name) })} · ${t('{coins} coins · {energy} energy', status.nextStep)}`, `data-step="${status.nextStep.id}"`, !status.canWork, true);
  } else body += `<p>${t('The bench is ready. From level 4, plant strawberries with the usual seeds and no energy.')}</p>${goodHelpButton('strawberry')}`;
  return `${body}${memories(status)}${button('learningVisit', t('Visit the old potting bench'))}</section>`;
}

export function renderLearningMemory(s, id, now) {
  const memory = learningStatus(s, now).earned.find(entry => entry.id === id);
  if (!memory) return `<p>${t('This memory is waiting to be discovered.')}</p>${button('learning', t('Back to the potting bench'))}`;
  return `<article class="scene learning-memory" data-learning-memory="${memory.id}"><h3>${t(memory.title)}</h3>${memory.lines.map(line =>
    `<div class="scene-line">${faceHtml(line.who)}<div><b>${nameOf(line.who)}</b><p>${t(line.text)}</p></div></div>`).join('')}${button('learning', t('Back to the potting bench'))}</article>`;
}
