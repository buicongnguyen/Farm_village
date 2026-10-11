// Lazy classroom sheet: existing item pictures provide counting objects; no world renderer or new art load.
import { SCHOOL_ACTIVITY, SCHOOL_MEMORY } from '../content/school-activity.mjs';
import { GOODS } from '../content/goods.mjs';
import { allPeople } from '../content/people.mjs';
import { schoolStatus } from '../core/school-activity.mjs';
import { t, num } from '../kit/i18n.mjs';
import { goodIcon, faceHtml, iconHtml } from './icon.mjs';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const names = Object.fromEntries(allPeople().map(person => [person.id, person.name]));
const back = () => `<button class="btn wide" data-do="schoolBack">${t('Back to the village')}</button>`;
const memoryButton = () => `<button class="btn wide" data-do="schoolMemory">${t(SCHOOL_MEMORY.title)}</button>`;

export function renderSchoolEntry(s, now, { album = false } = {}) {
  const school = schoolStatus(s, now);
  if (album) return school.memoryAt === null ? '' : `<button class="next-project" data-do="schoolMemory">${iconHtml('ui:album', '', 'mini')}<span><b>${t(SCHOOL_MEMORY.title)}</b><small>${t(school.memoryRead ? 'In your album' : 'A new classroom memory')}</small></span></button>`;
  if (!school.available && !school.active && school.memoryAt === null) return '';
  return `<button class="next-project" data-do="schoolActivity">${iconHtml('school', '', 'mini')}<span><b>${t(SCHOOL_ACTIVITY.title)}</b><small>${t(school.active ? 'Your baskets are waiting where you left them.' : 'Three little puzzles, as much time as you like.')}</small></span></button>`;
}

export function renderSchool(s, now) {
  const school = schoolStatus(s, now);
  let body = `<h3>${t(SCHOOL_ACTIVITY.title)}</h3><p>${t('Three little puzzles, as much time as you like.')}</p><p class="hint">${t('Use picture baskets, not your barn goods. Play together, leave whenever you like, and come back to the same puzzle.')}</p>`;
  if (!school.available) return `<section class="school-activity settings">${body}<p>${t(school.reason)}</p>${school.memoryAt !== null ? memoryButton() : ''}${back()}</section>`;
  const q = school.question;
  if (q) {
    const def = SCHOOL_ACTIVITY.questions[q.type];
    body += `<article data-school-question="${q.id}"><p>${t('Basket {count} of 3', { count: school.active.step + 1 })} · ${t(SCHOOL_ACTIVITY.difficulties[school.active.difficulty])}</p>
      <h4>${t(def.text, q.params)}</h4>${q.type === 'match' ? `<p class="school-target">${goodIcon(q.good)} ${t(GOODS[q.good].name)}</p>` : ''}
      ${q.rows.map((row, i) => `<div class="school-basket"><p class="hint">${t('Picture basket {count}', { count: i + 1 })}</p><div class="row school-pictures" role="group" aria-label="${esc(t('Picture basket {count}', { count: i + 1 }))}">${row.map(good => `<span role="img" aria-label="${esc(t(GOODS[good].name))}">${goodIcon(good, 'mini')}</span>`).join('')}</div></div>`).join('')}
      ${school.active.missed[school.active.step] ? `<p class="hint" role="status">${t('Let’s have another look. There is plenty of time.')} ${t(def.hint, q.params)}</p>` : ''}
      <div class="row">${q.choices.map(choice => `<button class="btn primary" data-do="schoolAnswer" data-question="${q.id}" data-choice="${choice}">${num(choice)}</button>`).join('')}</div></article>
      <p class="hint">${t('Closing this page saves your place.')}</p><details data-school-detail="new-round"><summary class="btn wide">${t('Try a different set of baskets')}</summary><p>${t('A fresh set replaces these unfinished baskets. Your completed memories stay.')}</p>`;
  } else if (school.completed) {
    body += `<p role="status">${t('All three baskets are ready. There is a place for your drawing in the album!')}</p>${memoryButton()}
      <details data-school-detail="notebook"><summary>${t('Our counting notebook')}</summary><p>${t('Rounds finished: {count}. Best first-try answers: {score} out of 3.', { count: num(school.completed), score: school.best })}</p><p class="hint">${t('Retries count toward finishing too. This notebook is just for fun.')}</p></details>`;
  }
  body += Object.entries(SCHOOL_ACTIVITY.difficulties).map(([difficulty, label]) => `<button class="btn wide" data-do="schoolStart" data-difficulty="${difficulty}">${t(label)}</button>`).join('');
  if (q) body += '</details>';
  return `<section class="school-activity settings">${body}${back()}</section>`;
}

export function renderSchoolMemory(s) {
  if (schoolStatus(s).memoryAt === null) return `<p>${t('Finish a basket game to keep this memory')}</p>${back()}`;
  return `<article class="scene school-memory"><h3>${t(SCHOOL_MEMORY.title)}</h3>${SCHOOL_MEMORY.lines.map(line => `<div class="scene-line">${faceHtml(line.who)}<div><b>${esc(t(names[line.who]))}</b><p>${esc(t(line.text))}</p></div></div>`).join('')}
    <button class="btn wide" data-do="schoolActivity">${t('Back to the basket game')}</button>${back()}</article>`;
}
