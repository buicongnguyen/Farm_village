// Sheet contents load on first use; the input/controller stays available at startup.
import { t, num } from '../kit/i18n.mjs';
import { GOODS, RECIPES } from '../content/goods.mjs';
import { BUILDINGS } from '../content/buildings.mjs';
import { BARN, SLOTS, TRUCK } from '../content/economy.mjs';
import * as barn from '../core/barn.mjs';
import { recipesAt, productionOf, productionDuration } from '../core/production.mjs';
import { shortTime } from '../core/clock.mjs';
import { renderJourney } from './journey-panel.mjs';
import { FRUIT_STAND } from '../content/economy.mjs';
import { fruitPrice } from '../core/orchard.mjs';
import { planFor, STEP_TEXT } from '../core/plan.mjs';
import { questsOf, progressOf, ready as questReady, weeklyProgress, hurryLeft, hurryable } from '../core/quests.mjs';
import { QUESTS, WEEKLY, WEEKLY_REWARD } from '../content/quests.mjs';
import { truckOf, trucksOf, loadUnits, capacity, roomIn, truckCoins, nextTruck, spareForTrucks, truckPays, blocked as blockedWhy } from '../core/market.mjs';
import { marketDayOf } from '../core/market-day.mjs';
import { renderSite } from './site-panel.mjs';
import { renderFestival } from './festival-panel.mjs';
/** Market day in one line, for the barn and the market square: the good of the day and the time left, or when the next one is. */
const marketDayLine = (day, now) => !day.open || !day.good ? '' : day.active
  ? `<p class="market-day on">${goodIcon(day.good, 'mini')}<span><b>${t('Market day')}</b> · ${t('Double coins for {good}', { good: t(GOODS[day.good].name) })}</span><small>${glyph('clock', 'g')} ${shortTime(Math.max(0, day.endsAt - now))}</small></p>`
  : `<p class="market-day">${day.nextGood ? goodIcon(day.nextGood, 'mini') : iconHtml('market', '', 'mini')}<span>${t('Next market day in {time}', { time: shortTime(Math.max(0, day.nextAt - now)) })}${day.nextGood ? ` · ${t('Double coins for {good}', { good: t(GOODS[day.nextGood].name) })}` : ''}</span></p>`;
import { renderToday, renderProjects, renderCottage } from './village-panels.mjs';
import { renderSettings, renderAlbum } from './settings-panels.mjs';
import { renderProfiles } from './profiles-panel.mjs';
import { renderExploration, renderExplorationEntry } from './exploration-panels.mjs';
import { renderAdviceList, renderAdviceMemories, renderAdviceDetail } from './advice-panels.mjs';
export { openAdvice, changeAdvice, followAdvice } from './advice-panels.mjs';   // panels.mjs calls these through this.renderer
import { renderFriends, renderGift, renderMail, heartBar, PEOPLE, nameOf } from './bonds-panels.mjs';
import { renderCart } from './cart-panel.mjs';
import { goodIcon, faceHtml, glyph, coinMark, xpMark, iconHtml } from './icon.mjs';
import { handsOpen, handHired, handWho } from '../core/helpers.mjs';
import { renderReport } from './report-panel.mjs';
import { renderValley } from './valley-panel.mjs';
import { renderCooperative } from './cooperative-panel.mjs';
import { renderQuay } from './quay-panel.mjs';
import { renderHotel } from './hotel-panel.mjs';
import { renderTrain } from './train-panel.mjs';
import { renderUpriver } from './upriver-panel.mjs';
import { renderFair } from './fair-panel.mjs';
import { HANDS } from '../content/economy.mjs';
import { renderGoodHelp, goodHelpButton } from './good-help-panel.mjs';
import { renderLandPanel, renderLandEntry } from './land-panel.mjs';
import { renderContracts, renderContractMemories, renderContractMemory } from './contracts-panel.mjs';
import { contractStatus } from '../core/contracts.mjs';
import { renderShops, shopsEntry } from './shops-panel.mjs';
import { normalizeGrowth } from '../core/growth-state.mjs';
import { renderCivicSite } from './civic-site-panel.mjs';
import { renderLearning, renderLearningMemory, renderLearningEntry } from './learning-panel.mjs';
import { learningStatus } from '../core/learning.mjs';
import { LEARNING } from '../content/learning.mjs';
import { renderSchool, renderSchoolMemory, renderSchoolEntry } from './school-activity-panel.mjs';
import { schoolStatus } from '../core/school-activity.mjs';
import { SCHOOL_ACTIVITY } from '../content/school-activity.mjs';
import { modalOpen } from './modal.mjs';
import { renderPond, refreshPond, mountPond } from './pond-panel.mjs';

const goodsLine = (s, need, honour = true, help = true) => Object.entries(need).map(([g, n]) => {
  const have = barn.free(s, g, honour), ok = have >= n;
  return help ? `<button class="good ${ok ? 'ok' : 'short'}" data-do="goodHelp" data-good="${g}" data-needed="${n}" aria-label="${t('About {good}', { good: t(GOODS[g].name) })}"><span class="item-token token ${ok ? 'ok' : 'short'}">${goodIcon(g, 'mini')}</span><span>${num(have)}/${n} ›</span></button>`
    : `<span class="good ${ok ? 'ok' : 'short'}">${goodIcon(g, 'mini')} ${Math.min(have, n)}/${n}</span>`;
}).join('');
const TITLES = { exploration: 'Picnic trail', advice: 'Village ideas', profiles: 'Farm profiles', roadmap: 'Roadmap', fruit_stand: 'Fruit stand', clinic: 'Clinic', settings: 'Settings', album: 'Family album', today: 'Today', projects: 'Village projects', cottage: 'Rental cottage', orders: 'Order board', barn: 'Barn',
  stall: 'Roadside stall', market: 'Market square', pond: 'Fish pond', quests: 'Goals', cart: 'Market cart', mail: 'Mailbox', friends: 'Friends', gift: 'Give a gift' };
const HEAD_ICONS = { exploration: 'lucky_box', advice: 'ui:heart', profiles: 'cottage', roadmap: 'projects', fruit_stand: 'fruit_stand', clinic: 'clinic', settings: 'settings', album: 'album', today: 'today', projects: 'projects', cottage: 'cottage', orders: 'ui:orders', barn: 'ui:barn', stall: 'stall',
  cart: 'cart', mail: 'mail', friends: 'ui:heart', gift: 'gift' };

export function renderPanel() {
    const s = this.game.s, o = this.open; if (!o) return;
    queueMicrotask(() => this.lift());
    if (o.kind === 'pond' && refreshPond(this)) return;
    // Fees or inventory can change mid-reel. A required redraw must keep the same keyboard control focused.
    const focused = document.activeElement;
    const pondFocus = o.kind === 'pond' && this.el.querySelector('[data-pond]') && this.el.contains(focused)
      && focused.matches('button[data-do]') ? { ...focused.dataset } : null;
    const now = this.game.now;
    const contract = contractStatus(s, now);
    const growthRecord = normalizeGrowth(s);
    const growthEntry = s.level >= 10 || growthRecord.hospitalAt !== null || Object.keys(growthRecord.memories).length ? `<button class="btn ghost wide" data-do="villageGrowth">${iconHtml('projects', '', 'mini')} ${t('Village growth')}</button>` : '';
    const contractEntry = contract.introduced && (s.level >= 6 || contract.canAccept || contract.active || contract.completedCount)
      ? `<button class="next-project" data-do="contracts">${iconHtml('carrot_juice', '', 'mini')}<b>${t('A picnic menu')}</b><small>${t(contract.complete ? 'A memory to keep' : 'Optional food requests')}</small></button>` : '';
    let body = '', title = t(TITLES[o.kind] ?? ''), icon = HEAD_ICONS[o.kind];
    if (o.kind === 'goodHelp') { title = t(GOODS[o.arg.good]?.name ?? ''); icon = o.arg.good; body = renderGoodHelp(s, o.arg.good, now, o.arg); }
    else if (o.kind === 'learning') { title = t(LEARNING.project); icon = 'bench'; body = renderLearning(s, now); }
    else if (o.kind === 'learningMemory') {
      title = t(LEARNING.project); icon = 'strawberry'; body = renderLearningMemory(s, o.arg, now);
      const earned = learningStatus(s, now).earned.find(memory => memory.id === o.arg);
      if (earned && !earned.read) queueMicrotask(() => {
        if (this.open === o && !this.el.hidden && !document.hidden && !modalOpen() && this.el.querySelector('[data-learning-memory]') && learningStatus(this.game.s, this.game.now).earned.some(memory => memory.id === o.arg && !memory.read)) this.game.do('readLearningMemory', { id: o.arg });
      });
    }
    else if (o.kind === 'schoolActivity') { title = t(SCHOOL_ACTIVITY.title); icon = 'school'; body = renderSchool(s, now); }
    else if (o.kind === 'schoolMemory') {
      title = t(SCHOOL_ACTIVITY.title); icon = 'school'; body = renderSchoolMemory(s);
      const school = schoolStatus(s, now);
      if (school.memoryAt !== null && !school.memoryRead) queueMicrotask(() => {
        if (this.open === o && !this.el.hidden && !document.hidden && !modalOpen() && this.el.querySelector('.school-memory') && !schoolStatus(this.game.s, this.game.now).memoryRead) this.game.do('readSchoolMemory');
      });
    }
    else if (o.kind === 'contracts') { title = t('A picnic menu'); icon = 'carrot_juice'; body = renderContracts(s, now); }
    else if (o.kind === 'shops') { title = t('Village shops'); icon = 'stall'; body = renderShops(s, now, o.arg); }
    else if (o.kind === 'report') {
      title = t('Today on the farm'); icon = 'ui:coin'; body = renderReport(s, now);
      if (!s.today.reportSeen) queueMicrotask(() => { if (this.open === o && !this.game.s.today.reportSeen) this.game.do('seeReport'); });
    }
    else if (o.kind === 'festival') { title = t('The Harvest Festival'); icon = 'stage'; body = renderFestival(s, now); }
    else if (o.kind === 'valley') { title = t('The valley'); icon = 'round_tree'; body = renderValley(s, now); }
    else if (o.kind === 'valleyValue') { title = t('The valley'); icon = 'company'; body = renderValley(s, now, 'value'); }
    else if (o.kind === 'fair') { title = t('The valley fair'); icon = 'ribbon_board'; body = renderFair(s, now); }
    else if (o.kind === 'upriver') { title = t('Where the brook begins'); icon = 'spring_water'; body = renderUpriver(s); }
    else if (o.kind === 'train') { title = t('The railway halt'); icon = 'halt'; body = renderTrain(s, now); }
    else if (o.kind === 'hotel') { title = t('The hotel'); icon = 'hotel'; body = renderHotel(s, now); }
    else if (o.kind === 'quay') { title = t('The quay'); icon = 'quay'; body = renderQuay(s, now, o.arg); }
    else if (o.kind === 'cooperative') { title = t('The co-operative'); icon = 'cooperative_board'; body = renderCooperative(s, now); }
    else if (o.kind === 'site') { title = t(BUILDINGS[o.arg]?.name ?? ''); icon = o.arg; body = renderSite(s, o.arg); }
    else if (o.kind === 'civicSite') { title = t(BUILDINGS[o.arg]?.name ?? 'Village growth'); icon = o.arg; body = renderCivicSite(s, o.arg); }
    else if (o.kind === 'villageGrowth' || o.kind === 'growthMemory') {
      title = t('Village growth'); icon = 'projects';
      if (this.growthUI) {
        body = o.kind === 'growthMemory' ? this.growthUI.renderGrowthMemory(s, o.arg) : this.growthUI.renderVillageGrowth(s, now);
        const progress = normalizeGrowth(s), earned = o.arg === 'hospital' ? progress.hospitalAt !== null : progress.memories[o.arg] != null;
        if (o.kind === 'growthMemory' && earned && !progress.read.includes(o.arg)) queueMicrotask(() => {
          if (this.open === o && !document.hidden && !modalOpen() && !normalizeGrowth(this.game.s).read.includes(o.arg)) this.game.do('readGrowthMemory', { id: o.arg });
        });
      } else {
        body = `<p>${t('Opening the village board…')}</p>`;
        if (!this.growthLoading) this.growthLoading = import('./village-growth-panel.mjs').then(module => { this.growthUI = module; this.render(); }).catch(() => {
          if (this.open === o) this.el.querySelector('.panel-body').innerHTML = `<p>${t('Could not open the village board. Try again.')}</p><button class="btn wide" data-do="villageGrowth">${t('Try again')}</button>`;
        }).finally(() => { this.growthLoading = null; });
      }
    }
    else if (o.kind === 'contractMemory') { title = t('A picnic menu'); icon = 'noodles'; body = renderContractMemory(s, o.arg); }
    else if (o.kind === 'land') { title = t('Sunlit clearing'); icon = 'sale_sign'; body = renderLandPanel(s, o.arg); }
    else if (o.kind === 'exploration') body = renderExploration(s, o.arg);
    else if (o.kind === 'roadmap') body = renderJourney(s);
    else if (o.kind === 'clinic') {
      if (growthRecord.hospitalAt !== null) { title = t('Our little hospital'); icon = 'hospital'; }
      body = `<div class="clinic-staff">${iconHtml(growthRecord.hospitalAt !== null ? 'hospital' : 'clinic', '', 'family-art')}<h3>${growthRecord.hospitalAt !== null ? t('Our little hospital') : t('The clinic is open!')}</h3><p>${t('{person:hazel:display} is the doctor, {person:marisol:short} is the nurse, and {person:grace:short} cares for animals in the back room.')}</p><p class="hint">${t('Four families brought the clinic home. The waiting room always has a chair for {person:ellis:short}.')}</p><button class="hint-link" data-do="roadmap"><span class="hint-q" aria-hidden="true">?</span>${t('Roadmap')}</button></div>`;
    }
    else if (o.kind === 'fruit_stand') {
      const st = s.fruitStand, spare = Object.entries(s.barn.items).filter(([g]) => GOODS[g]?.kind === 'fruit' && barn.free(s, g) > 0);
      body = `<p class="hint">${t('Orchard fruit sells for a little more here. A visitor buys one every thirty seconds.')}</p><div class="stall-slots">${st.items.map(it => `<div class="slot">${goodIcon(it.good)}<b>×${it.n}</b><small>${coinMark()} ${fruitPrice(it.good)}</small></div>`).join('')}</div>
        ${st.coins ? `<button class="btn primary wide" data-do="fruitCollect">${t('Collect {coins} coins', { coins: num(st.coins) })}</button>` : ''}
        <div class="goods-grid">${spare.map(([g]) => `<button class="good-tile" data-do="fruitList" data-good="${g}" ${st.items.length >= FRUIT_STAND.slots ? 'disabled' : ''}>${goodIcon(g)}<b>×${Math.min(FRUIT_STAND.stack, barn.free(s, g))}</b><small>${t(GOODS[g].name)} · ${coinMark()} ${fruitPrice(g)}</small></button>`).join('') || `<p class="empty">${t('Pick fruit from your orchard to stock the stand.')}</p>`}</div>`;
    }
    else if (o.kind === 'settings') body = renderSettings(s, this.profile ?? 1, { tester: !!this.onTest });
    else if (o.kind === 'profiles') body = renderProfiles(s, this.profile ?? 1);
    else if (o.kind === 'album') body = renderContractMemories(s) + renderLandEntry(s, { album: true }) + renderExplorationEntry(s, { album: true }) + renderAdviceMemories(s) + renderAlbum(s);
    else if (o.kind === 'today') body = renderRecent(this.hud) + contractEntry + shopsEntry(s) + renderLandEntry(s) + renderExplorationEntry(s) + renderAdviceList(s, now) + renderToday(s, now);
    else if (o.kind === 'advice') body = renderAdviceDetail(s, o.arg, now);
    else if (o.kind === 'projects') body = growthEntry + renderLandEntry(s) + renderProjects(s, now);
    else if (o.kind === 'cottage') body = renderCottage(s, o.arg, now);
    else if (o.kind === 'cart') body = renderCart(s);
    else if (o.kind === 'mail') body = renderMail(s, now);
    else if (o.kind === 'friends') body = renderHands(s) + renderFriends(s, now);
    else if (o.kind === 'gift') body = renderGift(s, o.arg, now);
    else if (o.kind === 'orders') body = contractEntry + `<div class="order-list">${readyFirst(s, s.orders.cards).map(c => renderOrderCard.call(this, c)).join('') || `<p class="empty">${t('New orders are on their way.')}</p>`}</div>`;
    else if (o.kind === 'barn') {
      const used = barn.used(s), items = Object.entries(s.barn.items).filter(([, n]) => n > 0).sort((a, b) => GOODS[a[0]].level - GOODS[b[0]].level), held = barn.held(s);
      const day = marketDayOf(s, now), k = g => day.active && day.good === g ? day.bonus : 1, badge = g => k(g) > 1 ? `<i class="day-badge">×${k(g)}</i>` : '';
      body = `<div class="cap"><div class="cap-bar ${used >= s.barn.cap * 0.9 ? 'full' : ''}"><i style="width:${Math.min(100, used / s.barn.cap * 100)}%"></i><b>${num(used)}/${num(s.barn.cap)}</b></div>
        ${s.barn.cap >= BARN.max ? '' : `<button class="btn orange" data-do="upgradeBarn">${glyph('up', 'g')} ${t('Upgrade (+{step})', { step: Math.min(BARN.step, BARN.max - s.barn.cap) })} · ${coinMark()} ${num(BARN.upgradeCost(s.barn.upgrades))}</button>`}</div>
        ${marketDayLine(day, now)}
        <div class="goods-grid">${items.map(([g, n]) => `<div class="good-cell"><button class="good-tile${k(g) > 1 ? ' day' : ''}" data-do="sellGood" data-good="${g}" ${barn.free(s, g) ? '' : 'disabled'}>${badge(g)}${goodIcon(g)}<b>${num(n)}</b><small>${t('Sell')} · ${coinMark()} ${GOODS[g].value * k(g)}${held[g] ? ` · ${t('{count} held', { count: held[g] })}` : ''}</small></button>${barn.free(s, g) >= 10 ? `<button class="sell-ten" data-do="sellGood" data-good="${g}" data-n="10" aria-label="${t('Sell')} ×10">×10 · ${coinMark()} ${num(GOODS[g].value * 10 * k(g))}</button>` : ''}</div>`).join('') || `<p class="empty">${t('The barn is empty.')}</p>`}</div>`;
    } else if (o.kind === 'production') {
      const p = s.placed[o.arg]; if (!p) { this.close(); return; }
      title = t(BUILDINGS[p.kind].name); icon = p.kind;
      const q = productionOf(s, o.arg), ready = q.queue.filter(j => j.doneAt <= now).length, slotCost = SLOTS.cost[q.slots];
      const recipes = recipesAt(s, p.kind).map(r => { const def = RECIPES[r], can = barn.hasAll(s, def.needs);
        return `<div class="recipe-group"><button class="recipe ${can ? 'can' : ''}" data-do="produce" data-recipe="${r}">${goodIcon(r)}<b>${t(def.name)}${def.makes > 1 ? ` ×${def.makes}` : ''}</b><span class="needs">${goodsLine(s, def.needs, true, false)}</span><small>${glyph('clock', 'g')} ${shortTime(productionDuration(s, o.arg, r, now))}</small></button>
          ${can && q.slots - q.queue.length > 1 ? `<button class="sell-ten recipe-all" data-do="produceAll" data-recipe="${r}">${t('All')} ×${Math.min(q.slots - q.queue.length, ...Object.entries(def.needs).map(([g, n]) => Math.floor(barn.free(s, g) / n)))}</button>` : ''}
          <div class="recipe-help">${goodHelpButton(r, def.makes)}</div></div>`; }).join('');
      const queue = Array.from({ length: q.slots }, (_, i) => { const j = q.queue.find(job => job.slot === i); if (!j) return `<div class="slot empty" data-tray="${i}" aria-label="${t('Empty tray')}"></div>`;
        const def = RECIPES[j.recipe], left = j.doneAt - now, k = left <= 0 ? 1 : Math.max(0, 1 - left / (j.durationMs ?? def.timeMs));
        return `<div class="slot ${left <= 0 ? 'ready' : ''}" data-tray="${i}" style="--k:${k.toFixed(3)}">${goodIcon(j.recipe)}<small>${left <= 0 ? t('Ready') : j.startedAt > now ? t('Starts in {time}', { time: shortTime(j.startedAt - now) }) : shortTime(left)}</small></div>`; }).join('');
      const hurry = hurryLeft(s) > 0 && hurryable(s, o.arg, now) ? `<button class="btn ghost wide" data-do="hurry">${glyph('clock', 'g')} ${t('Hurry')}</button>` : '';
      body = `<p class="hint">${t('Each tray starts its own batch immediately. Finished goods wait here until collected.')}</p>${q.queue.some(j => j.startedAt > now) ? `<p class="hint">${t('Earlier saved batches keep their original schedule. New batches start immediately.')}</p>` : ''}<div class="queue">${queue}${slotCost != null && q.slots < SLOTS.max ? `<button class="slot buy" data-do="buySlot" aria-label="${t('Buy a parallel tray')}">${glyph('plus', 'g')}<small>${coinMark()} ${num(slotCost)}</small></button>` : ''}</div>
        ${ready ? `<button class="btn primary wide" data-do="collectProducts">${t('Collect {count}', { count: ready })}</button>` : ''}${hurry}<div class="recipes">${recipes}</div>`;
    } else if (o.kind === 'quests') {
      const qs = questsOf(s), w = WEEKLY[s.weekly?.i ?? 0], wp = weeklyProgress(s), left = hurryLeft(s);
      const card = q => { const def = q.favour ? null : QUESTS[q.t], pr = progressOf(s, q), ok = questReady(s, q);
        const text = q.favour ? t('{name} would love {n} {good}', { name: nameOf(q.person), n: q.n, good: t(GOODS[q.good].name) }) : t(def.text, { n: q.n });
        return `<div class="goal ${ok ? 'ok' : ''}">${q.favour ? faceHtml(q.person) : iconHtml(def.icon, '', 'goal-icon')}<div class="goal-main"><b>${text}</b><i class="progress"><i style="width:${Math.round(pr / q.n * 100)}%"></i></i><small>${num(pr)}/${num(q.n)} · ${coinMark()} ${num(q.coins)} ${xpMark()} ${num(q.xp)}</small></div>
          <button class="btn primary small-btn" data-do="claimQuest" data-id="${q.id}" ${ok ? '' : 'disabled'}>${t('Claim')}</button></div>`; };
      body = `<p class="hint">${glyph('clock', 'g')} ${t('Free hurry today')}: <b>${left}</b> · ${t('tap a growing crop, tree or repair, then Hurry')}</p>
        ${qs.list.map(card).join('')}
        <div class="goal weekly ${s.weekly?.claimed ? 'done' : wp >= w.n ? 'ok' : ''}">${iconHtml(w.icon, '', 'goal-icon')}<div class="goal-main"><b>${t(w.text, { n: w.n })}</b><i class="progress"><i style="width:${Math.round(wp / w.n * 100)}%"></i></i><small>${num(wp)}/${num(w.n)} · ${coinMark()} ${num(WEEKLY_REWARD.coins)} · +1 ${t('hurry')}</small></div>
          <button class="btn orange small-btn" data-do="claimWeekly" ${!s.weekly?.claimed && wp >= w.n ? '' : 'disabled'}>${s.weekly?.claimed ? t('Done') : t('Claim')}</button></div>
        <p class="hint">${t('Goals finished')}: ${num(qs.done)}</p>`;
    } else if (o.kind === 'pond') {
      if (s.placed[o.arg]?.kind === 'dock') { title = t(BUILDINGS.dock.name); icon = 'dock'; }   // fishing in the brook from the boat dock
      body = renderPond(s, now, { walking: !!this.fishingWalk?.(), river: s.placed[o.arg]?.kind === 'dock' });
    } else if (o.kind === 'market') {
      // The trucks (core/market.mjs): one row each, then fill / send / collect for all of them at once. A tapped good
      // goes on the first truck at the market with room.
      const tr = truckOf(s), units = trucksOf(s), why = blockedWhy(s), many = units.length > 1, cap = capacity(tr);
      const spare = Object.entries(s.barn.items).filter(([g, n]) => n > 0 && barn.free(s, g) > 0), next = tr.level < TRUCK.capacity.length;
      const home = units.filter(u => !u.away), takings = truckCoins(s), buy = nextTruck(s), day = marketDayOf(s, now);
      const loaded = home.filter(u => u.load.length).length, canFill = !why && home.some(u => roomIn(s, u) > 0) && spareForTrucks(s).length > 0;
      const rowOf = (u, i) => {
        const name = many ? t('Truck {n}', { n: i + 1 }) : t('Truck');
        const state = u.away ? `${t('The truck is on its way')} · ${shortTime(Math.max(0, u.backAt - now))}`
          : u.coins ? t('Back with {coins} coins', { coins: num(u.coins) })
          : `${t('Load')}: ${num(loadUnits(u))}/${num(cap)}${u.load.length ? ` · ${coinMark()} ${num(truckPays(s, u, now))}` : ''}`;
        // one tidy row for each truck: its name and state, and what it carries as small chips on the same card
        return `<div class="truck-row${u.away ? ' away' : ''}">${iconHtml('truck', '', 'mini')}<b>${name}</b><span>${state}</span>${u.load.length && !u.away ? `<div class="truck-load">${u.load.map(l => `<i>${goodIcon(l.good, 'mini')}×${l.n}</i>`).join('')}</div>` : ''}</div>`;
      };
      body = `${why ? `<p class="hint"><b>${t(why)}</b></p>` : ''}${marketDayLine(day, now)}
        <div class="trucks">${units.map(rowOf).join('')}</div>
        ${takings ? `<button class="btn primary wide" data-do="collectTruck">${t('Collect {coins} coins', { coins: num(takings) })}</button>` : ''}
        ${canFill || (!why && loaded) ? `<div class="market-actions">${canFill ? `<button class="btn ghost" data-do="fillTruck">${glyph('plus', 'g')} ${t(home.length > 1 ? 'Fill the trucks with spare goods' : 'Fill the truck with spare goods')}</button>` : ''}
          ${!why && loaded ? `<button class="btn orange" data-do="sendTruck">${loaded > 1 ? t('Send {n} trucks', { n: loaded }) : t('Send the truck')}</button>` : ''}</div>` : ''}
        ${home.length && !why && spare.length ? `<div class="goods-grid">${spare.map(([g, n]) => { const twice = day.active && day.good === g; return `<button class="good-tile${twice ? ' day' : ''}" data-do="loadTruck" data-good="${g}">${twice ? `<i class="day-badge">×${day.bonus}</i>` : ''}${goodIcon(g)}<b>${num(n)}</b><small>${t(GOODS[g].name)} · ${coinMark()} ${GOODS[g].value * (twice ? day.bonus : 1)}</small></button>`; }).join('')}</div>` : ''}
        ${buy || next ? `<div class="market-actions upgrades">${buy ? `<button class="btn ghost" data-do="buyTruck" ${s.level < buy.level || why ? 'disabled' : ''}><b>${iconHtml('truck', '', 'mini')} ${t('Buy another truck')}</b><small>${coinMark()} ${num(buy.cost)} · ${t('level {level}', { level: buy.level })}</small></button>` : ''}
          ${next ? `<button class="btn ghost" data-do="upgradeTruck" ${s.level < TRUCK.level[tr.level] ? 'disabled' : ''}><b>${glyph('up', 'g')} ${t(many ? 'Bigger trucks' : 'Bigger truck')}</b><small>${coinMark()} ${num(TRUCK.upgradeCost[tr.level])} · ${t('level {level}', { level: TRUCK.level[tr.level] })}</small></button>` : ''}</div>` : ''}
        <p class="hint small">${t('The truck drives goods to the market in town and comes back with more coins than they are worth.')}</p>`;
    } else if (o.kind === 'stall') {
      const st = s.stall, spare = Object.entries(s.barn.items).filter(([g, n]) => n > 0 && barn.free(s, g) > 0);
      body = `<p class="hint">${t('Passers-by buy one thing every few minutes, at its base price.')}</p>
        <div class="queue">${st.items.map(i => `<div class="slot">${goodIcon(i.good)}<small>×${i.n}</small></div>`).join('')}</div>
        ${st.coins ? `<button class="btn primary wide" data-do="stallCollect">${t('Collect {coins} coins', { coins: num(st.coins) })}</button>` : ''}
        <div class="goods-grid">${spare.map(([g, n]) => `<button class="good-tile" data-do="stallList" data-good="${g}">${goodIcon(g)}<b>${num(n)}</b><small>${t(GOODS[g].name)} · ${coinMark()} ${GOODS[g].value}</small></button>`).join('')}</div>`;
    }
    const scroll = this.el.scrollTop;
    const postponedOpen = this.el.querySelector('.advice-deferred')?.open;
    const futureOpen = this.el.querySelector('.contract-future')?.open;
    const growthOpen = [...this.el.querySelectorAll('details[data-growth-detail][open]')].map(el => el.dataset.growthDetail);
    const schoolOpen = [...this.el.querySelectorAll('details[data-school-detail][open]')].map(el => el.dataset.schoolDetail);
    if (['today', 'clinic', 'album'].includes(o.kind)) body = growthEntry + body;
    if (['today', 'projects', 'album'].includes(o.kind)) body = renderLearningEntry(s, now, { album: o.kind === 'album' }) + renderSchoolEntry(s, now, { album: o.kind === 'album' }) + body;
    this.el.innerHTML = this.head(title, icon) + `<div class="panel-body">${body}</div>`;
    if (o.kind === 'pond') mountPond(this);
    if (pondFocus) [...this.el.querySelectorAll('button[data-do]')].find(button => !button.disabled
      && Object.keys(button.dataset).length === Object.keys(pondFocus).length
      && Object.entries(pondFocus).every(([key, value]) => button.dataset[key] === value))?.focus({ preventScroll: true });
    if (postponedOpen && o.kind === 'today') { const details = this.el.querySelector('.advice-deferred'); if (details) details.open = true; }
    if (futureOpen && o.kind === 'contracts') { const details = this.el.querySelector('.contract-future'); if (details) details.open = true; }
    for (const id of growthOpen) { const details = this.el.querySelector(`[data-growth-detail="${id}"]`); if (details) details.open = true; }
    for (const id of schoolOpen) { const details = this.el.querySelector(`[data-school-detail="${id}"]`); if (details) details.open = true; }
    this.el.scrollTop = scroll;
  }

/** Orders you can sell right now come first, so they are done without scrolling; otherwise the board keeps its order. */
function readyFirst(s, cards) {
  return cards.map((c, i) => ({ c, i, can: barn.hasAll(s, c.need) })).sort((a, b) => (b.can - a.can) || (a.i - b.i)).map(x => x.c);
}
/** Today's Recent list: the last notices, newest first; a tap opens the same place the notice pointed to. */
function renderRecent(hud) {
  const feed = hud?.feed ?? []; if (!feed.length) return '';
  const ago = at => { const m = Math.max(0, Math.round((Date.now() - at) / 60000)); return m < 1 ? t('just now') : t('{count} min ago', { count: m }); };
  const esc = v => String(v).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  return `<details class="recent" ${feed.length <= 4 ? 'open' : ''}><summary>${t('Recent')} · ${feed.length}</summary><div class="letters">${feed.map((n, i) =>
    `<button class="letter-row recent-row ${n.kind}" data-do="notice" data-i="${i}" ${n.to ? '' : 'disabled'}>${n.icon ? iconHtml(n.icon, '', 'mini') : ''}<span class="lr-text"><b>${esc(n.text)}</b><small>${ago(n.at)}</small></span>${n.to ? '<b class="go">›</b>' : ''}</button>`).join('')}</div></details>`;
}
function renderOrderCard(c) {
    const s = this.game.s, who = PEOPLE[c.from], can = barn.hasAll(s, c.need);
    const id = String(c.id).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    return `<div data-order-id="${id}" class="order ${can ? 'can' : ''}${c.story ? ' story' : ''}"><div class="who">${faceHtml(c.from)}<div class="who-name"><b>${who ? nameOf(c.from) : ''}</b>${who ? heartBar(s, c.from) : ''}</div>
      <div class="reward">${coinMark()} <b>${num(c.coins)}</b> ${xpMark()} <b>${num(c.xp)}</b></div></div>
      <p class="line">${c.line ? t(c.line) : ''}</p>
      ${can ? '' : `<div class="order-plan">${planFor(s, c.need).map(st => `<button class="link plan-step" data-do="goodHelp" data-good="${st.good}" data-needed="${st.n + barn.free(s, st.good)}">${goodIcon(st.good)} ${t(STEP_TEXT[st.how], { n: st.n, good: t(GOODS[st.good].name) })} ›</button>`).join('')}</div>`}
      <div class="order-row"><div class="needs">${goodsLine(s, c.need)}</div>
      <div class="order-buttons"><button class="btn primary small-btn" data-do="deliver" data-id="${c.id}" ${can ? '' : 'disabled'}>${t('Sell')}</button>${c.story ? '' : `<button class="btn ghost icon-only" data-do="discard" data-id="${c.id}" aria-label="${t('Discard')}">${glyph('trash', 'g')}</button>`}</div></div></div>`;
  }

/** Barn: keep the button held and it goes on selling (after 0.4 s, eight a second) until you let go or run out. */
export function holdToSell(el) {
  let wait = 0, tick = 0, held = false;
  const stop = () => { clearTimeout(wait); clearInterval(tick); wait = tick = 0; };
  el.addEventListener('pointerdown', e => {
    stop(); held = false;
    const b = e.target.closest?.('[data-do="sellGood"]'); if (!b || e.button > 0) return;
    const pick = `[data-do="sellGood"][data-good="${b.dataset.good}"]${b.dataset.n ? `[data-n="${b.dataset.n}"]` : ':not([data-n])'}`;
    wait = setTimeout(() => { tick = setInterval(() => { const live = el.querySelector(pick); if (!live || live.disabled) stop(); else { held = true; live.click(); } }, 125); }, 400);
  });
  for (const type of ['pointerup', 'pointercancel', 'blur']) addEventListener(type, stop);
  el.addEventListener('click', e => { if (held && e.isTrusted) { held = false; e.stopPropagation(); e.preventDefault(); } }, true);   // letting go is not one more sale
}

/** Hired hands, at the top of Friends: each does half of the waiting work; the other half is yours. */
const HAND_ROLES = { field: ['Field hand', 'Harvests half of the ripe beds and sows them again', 'wheat'], animals: ['Animal hand', 'Collects half of the eggs and milk and feeds half of the hungry animals', 'egg'],
  workshop: ['Workshop hand', 'Collects half of the finished goods and starts the same again', 'bread'],
  orchard: ['Orchard hand', 'Picks half of the ripe fruit trees', 'cherry'], driver: ['Truck driver', 'Collects the takings, loads idle trucks with spare goods and sends them', 'truck'],
  fisher: ['Fisher', 'Lands one fish a minute for the barn', 'perch'] };
function renderHands(s) {
  if (!handsOpen(s)) return `<section class="hands"><h3>${t('Farm hands')}</h3><p class="hint">${t('Build the school to hire farm hands.')}</p></section>`;
  return `<section class="hands"><h3>${t('Farm hands')}</h3><p class="hint">${t('Hired neighbours do half of the work, a coin a task. Do the other half yourself to get more done.')}</p>${Object.entries(HAND_ROLES).map(([role, [name, what, icon]]) => { const who = handWho(s, role), done = s.today?.hands?.[role] ?? 0;   // the villager who has the job, once hired (chapter 10)
    return `<div class="hand${handHired(s, role) ? ' on' : ''}">${who ? faceHtml(who, 'hand-face') : goodIcon(icon)}<div><b>${who ? `${nameOf(who)} · ${t(name)}` : t(name)}</b><small>${t(what)}${done ? ` · ${t('{count} tasks today', { count: done })}` : ''}</small></div>${handHired(s, role)
    ? `<button class="btn" data-do="releaseHand" data-role="${role}">${t('Let go')}</button>` : `<button class="btn orange" data-do="hireHand" data-role="${role}" ${s.coins >= HANDS.roles[role].fee ? '' : 'disabled'}>${t('Hire')} · ${coinMark()} ${num(HANDS.roles[role].fee)}</button>`}</div>`; }).join('')}
    <button class="btn wide" data-do="report">${glyph('clock', 'g')} ${t('Today on the farm')}</button></section>`;
}
