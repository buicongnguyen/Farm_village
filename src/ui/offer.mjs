// Mr Albright's offer (core/valley.mjs, chapter 11): the one real choice of the story, on one card. Two big answers,
// three plain lines under each (what you get, what it costs the valley, what it opens), and "Let me think". An answer
// asks once more before it is given: it cannot be changed. Loaded when first opened.
import { t, num } from '../kit/i18n.mjs';
import { BEAUTY } from '../content/economy.mjs';
import { albrightOffer } from '../core/valley.mjs';
import { showModal } from './modal.mjs';
import { faceHtml, glyph, iconHtml } from './icon.mjs';

const CHOICES = {
  factory: { icon: 'cannery', name: 'Build the cannery', yes: 'Yes, build the cannery', ask: 'Build the cannery on the brook meadow?',
    lines: [['plus', 'A cannery, built at his cost: tins of corn and tomatoes sell dear'], ['minus', 'The meadow is gone, and the valley is less beautiful'], ['lock', 'Later you can make it a green one, for {coins} coins']] },
  meadow: { icon: 'beehive', name: 'Keep the meadow', yes: 'Yes, keep the meadow', ask: 'Send him home and keep the brook meadow?',
    lines: [['plus', 'Wildflowers along the brook: a more beautiful valley, for good'], ['minus', 'No cannery here, and none of its money'], ['lock', 'Opens beehives and honey, and honey cake at the bakery']] },
};
const MARKS = { plus: 'check', minus: 'dot', lock: 'play' };
const choiceCard = id => {
  const c = CHOICES[id];
  return `<button class="offer-choice" data-pick="${id}">${iconHtml(c.icon, '', 'tile-icon')}<b>${t(c.name)}</b>
    <ul>${c.lines.map(([kind, text]) => `<li class="${kind}">${glyph(MARKS[kind], 'g')} <span>${t(text, { coins: num(BEAUTY.greenCost) })}</span></li>`).join('')}</ul></button>`;
};
const askHtml = () => `<div class="offer">
  <p class="offer-says">${faceHtml('albright', 'face')}<span><b>${t('{person:albright:display}')}</b>“${t('That meadow along your brook. I would build a cannery on it, and pay for every brick. What do you say?')}”</span></p>
  <div class="offer-choices">${choiceCard('factory')}${choiceCard('meadow')}</div>
  <button class="btn big offer-think" data-close>${t('Let me think')}</button></div>`;
const sureHtml = id => `<div class="offer sure">${iconHtml(CHOICES[id].icon, '', 'family-art')}<h2>${t(CHOICES[id].ask)}</h2>
  <p class="hint">${glyph('lock', 'g')} ${t('This cannot be changed.')}</p>
  <button class="btn primary big" data-answer="${id}">${t(CHOICES[id].yes)}</button><button class="btn big" data-back>${t('Back')}</button></div>`;

/** Open the offer card. onAnswer(choice) runs after the answer was taken. False if nobody is asking. */
export function showOffer(game, { onAnswer } = {}) {
  if (!albrightOffer(game.s).open) return false;
  let answered = null;
  showModal(askHtml(), { cls: 'offer-modal', onClose: () => { if (answered) onAnswer?.(answered); },
    onOpen: el => {
      const card = el.querySelector('.card-modal');
      card.addEventListener('click', e => {
        const pick = e.target.closest('[data-pick]')?.dataset.pick, answer = e.target.closest('[data-answer]')?.dataset.answer;
        if (pick) card.innerHTML = sureHtml(pick);
        else if (e.target.closest('[data-back]')) card.innerHTML = askHtml();
        else if (answer && game.do('answerAlbright', { choice: answer }).ok) { answered = answer; card.innerHTML = '<span data-close hidden></span>'; card.querySelector('[data-close]').click(); }
      });
    } });
  return true;
}
