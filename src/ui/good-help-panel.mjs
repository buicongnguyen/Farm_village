// Ingredient cards only inspect facts. The enclosing Panels controller owns navigation and the original return context.
import { goodHelp } from '../core/good-help.mjs';
import { GOODS, ANIMALS } from '../content/goods.mjs';
import { BUILDINGS } from '../content/buildings.mjs';
import { t, tParams, num } from '../kit/i18n.mjs';
import { goodIcon } from './icon.mjs';
import { shortTime } from '../core/clock.mjs';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const name = good => t(GOODS[good]?.name ?? 'Unknown good');
export function goodHelpButton(good, needed = 1) {
  if (typeof good !== 'string' || !Object.hasOwn(GOODS, good)) return '';
  const count = Number.isFinite(needed) && needed > 0 ? Math.ceil(needed) : 1;
  return `<button class="btn small-btn good-help-link" data-do="goodHelp" data-good="${esc(good)}" data-needed="${count}">${goodIcon(good, 'mini')} ${esc(t('Find {good}', { good: name(good) }))}</button>`;
}

function sourceText(source) {
  const building = t(BUILDINGS[source.at]?.name ?? 'Crop bed');
  switch (source.status) {
    case 'ready': return t('Ready to collect at the source.');
    case 'waiting': return t('Some supply is already growing or queued. Check the incoming amount before starting more.');
    case 'barn-full': return t('A finished batch is waiting. Make room in the barn before collecting it.');
    case 'level': return t('Reach level {level} first', { level: source.level });
    case 'skill': return t('Restore the potting bench to learn strawberry planting.');
    case 'build': return source.reason ? t(source.reason, tParams(source.params)) : t('Place {building} to get started.', { building });
    case 'repair': return source.reason ? t(source.reason, tParams(source.params)) : t('Repair {building} before starting new work.', { building });
    case 'repairing': return t('{building} is being repaired. New work can start when it is ready.', { building });
    case 'queue-full': return t('The maker queue is full. Collect finished work or wait for a free slot.');
    case 'ingredients': return t('Some ingredients are missing for a new batch. Inspect them below.');
    case 'make': return t('The maker and ingredients are ready for a new batch.');
    case 'beds-full': return t('All crop beds are occupied. Harvest a ready bed or place another one.');
    case 'seed-coins': return t('Keep one harvested crop as seed, or save enough coins to plant it.');
    case 'plant': return t('Choose this crop in an empty bed.');
    case 'feed': return t('Feed a hungry animal; its produce will be ready after a short wait.');
    case 'animal': return t('Add an animal to its home before producing this good.');
    case 'fish-ready': return t('Your line is ready to reel in. The fish species is a surprise.');
    case 'fish-waiting': return t('A line is already in the pond. Wait for the bite; the species is a surprise.');
    default: return t('Fish at the village pond. No bait is required, and each catch can be a different species.');
  }
}

function useText(use) {
  switch (use.kind) {
    case 'sale': return t('Barn sale value: {coins} coins each.', { coins: num(use.price) });
    case 'orders': return t('{count} current orders need {n} in total.', { count: num(use.count), n: num(use.needed) });
    case 'project': return t('The current project, {name}, still needs {n}.', { name: t(use.name), n: num(use.needed) });
    case 'recipe': return `${t('Recipe: {good} · {n} per batch', { good: name(use.good), n: num(use.needed) })} · ${t(use.available ? 'Ready to make' : 'Check its requirements')}`;
    case 'seed': return t('Keep one to plant another crop.');
    case 'gift': return t('A liked gift for {count} villagers here who can receive a gift today.', { count: num(use.count) });
    case 'feed': return t('Feed for {animal}.', { animal: t(ANIMALS[use.animal].name) });
    default: return '';
  }
}

export function renderGoodHelp(s, good, now, { needed = 1 } = {}) {
  const help = goodHelp(s, good, now, { needed });
  const back = `<button class="btn ghost wide" data-do="goodHelpBack">${t('Back to what I was doing')}</button>`;
  if (!help) return `<p class="hint">${t('This good is no longer available.')}</p>${back}`;
  const source = help.source;
  const seed = source.seed ? `<p>${esc(source.seed === 'free' ? t('Seeds are free for this crop.') : source.seed === 'stock'
    ? t('Planting uses one crop from barn stock, including stock held for a project.')
    : t('Without a crop in the barn, planting costs {coins} coins per bed.', { coins: num(source.cost) }))}</p>` : '';
  const price = ['build', 'repair', 'animal'].includes(source.status) ? `<p>${esc(t('Preview cost: {coins} coins. Placement or purchase still needs your confirmation.', { coins: num(source.cost) }))}</p>` : '';
  const rows = (source.ingredients ?? []).map(i => `<li>${esc(t('{good}: {have} available / {need} needed', { good: name(i.good), have: num(i.free), need: num(i.needed) }))} ${goodHelpButton(i.good, i.needed)}</li>`).join('');
  const batch = source.makes ? `<p class="hint">${esc(t('One batch makes {count} in {time}. Queued batches have already used their ingredients.', { count: num(source.makes), time: shortTime(source.duration) }))}</p>` : '';
  return `<article class="good-help"><h3>${goodIcon(good, 'mini')} ${esc(name(good))}</h3>
    <p>${esc(t('{have} in the barn · {free} available · {held} held for the project', { have: num(help.stock), free: num(help.free), held: num(help.held) }))}</p>
    <p>${esc(t('For this request: {need} needed · {missing} still missing', { need: num(help.needed), missing: num(help.missing) }))}</p>
    ${!help.missing ? `<p class="hint">${t('You already have enough available for this request.')}</p>` : ''}
    <h3>${t('Where to get it')}</h3><p>${esc(sourceText(source))}</p>
    ${source.at ? `<p>${esc(t(BUILDINGS[source.at].name))}</p>` : ''}
    ${source.ready || source.queued ? `<p>${esc(t('{ready} ready · {queued} growing or queued', { ready: num(source.ready), queued: num(source.queued) }))}</p>` : ''}
    ${seed}${price}${source.status === 'animal' && source.level > s.level ? `<p>${esc(t('Reach level {level} first', { level: source.level }))}</p>` : ''}
    ${batch}${rows ? `<h3>${t('Ingredients for the next batch')}</h3><ul>${rows}</ul>` : ''}
    <button class="btn primary wide" data-do="goodHelpSource" data-good="${esc(good)}" data-needed="${help.needed}">${t('Show the source')}</button>
    <p class="hint">${t('This opens the controls. Nothing is planted, made or bought automatically.')}</p>
    <h3>${t('Useful ways to use it')}</h3><ul>${help.uses.map(use => `<li>${esc(useText(use))}${use.kind === 'recipe' ? ` ${goodHelpButton(use.good, 1)}` : ''}</li>`).join('')}</ul>${back}</article>`;
}
