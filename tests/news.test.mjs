import './tz.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { act, tick } from '../src/core/act.mjs';
import { newGame } from '../src/core/state.mjs';
import { pack, unpack } from '../src/kit/save.mjs';
import { setLanguage, t } from '../src/kit/i18n.mjs';
import { CHARM_MILESTONES } from '../src/content/economy.mjs';
import { personName } from '../src/content/character-names.mjs';
import { game, must, T0 } from './helpers.mjs';

// These renderers return HTML strings; their sound import only registers a visibility listener.
const previousDocument = globalThis.document;
globalThis.document = { documentElement: {}, addEventListener() {} };
const { NEWS, renderToday } = await import('../src/ui/village-panels.mjs');
if (previousDocument === undefined) delete globalThis.document;
else globalThis.document = previousDocument;
const text = html => html.replace(/<[^>]*>/g, '').trim();

function heartNews() {
  const s = game();
  s.homes.lanHome = { family: 'tran', arrived: true, arrivesAt: T0 };
  s.people.lan = { hearts: 5, scenes: [] }; s.barn.items.egg = 2;
  const result = must(s, 'gift', { person: 'lan', good: 'egg' });
  return { s, result, news: s.news.filter(e => e.type === 'heartScene') };
}

test('heart news saves each earned threshold separately from its date without changing live scenes or replaying gifts', () => {
  const { s, result, news } = heartNews();
  assert.deepEqual(result.events.filter(e => e.type === 'heartScene').map(e => e.at), [3, 6]);
  assert.deepEqual(news.map(e => [e.threshold, e.at]), [[6, T0], [3, T0]]);
  assert.equal(s.firsts['heart:lan:3'], T0); assert.equal(s.firsts['heart:lan:6'], T0);
  assert.ok(news.every(e => !Object.hasOwn(e, 'lines')), 'dialogue must stay outside the saved event');
  const loaded = unpack(pack(s));
  assert.deepEqual(loaded.news.filter(e => e.type === 'heartScene'), news);
  const before = structuredClone(loaded);
  assert.equal(act(loaded, 'gift', { person: 'lan', good: 'egg' }, T0).ok, false);
  assert.deepEqual(loaded, before, 'a repeated gift must neither pay nor change news');
});

test('charm news keeps milestone thresholds and dates through save reload while live events retain at', () => {
  const s = newGame(T0, 12345);
  s.placed.home = { kind: 'cottage', x: 35, z: 94, rot: 0 };
  s.homes.home = { family: null, level: 0 };
  for (let i = 0; i < 21; i++) s.placed['flower' + i] = { kind: 'flowers', x: 32 + i % 3, z: 91 + Math.floor(i / 3), rot: 0 };
  const result = tick(s, T0), live = result.events.filter(e => e.type === 'charmMilestone');
  assert.deepEqual(live.map(e => e.at), [8, 20]);
  const news = s.news.filter(e => e.type === 'charmMilestone');
  assert.deepEqual(news.map(e => [e.threshold, e.at]), [[20, T0], [8, T0]]);
  const loaded = unpack(pack(s));
  assert.deepEqual(loaded.news.filter(e => e.type === 'charmMilestone'), news);
  assert.ok(!tick(loaded, T0).events.some(e => e.type === 'charmMilestone'), 'reload must not award milestones again');
});

test('Today renders earned heart and charm thresholds in both languages, including legacy news', async () => {
  const { s, news } = heartNews();
  const charm = { type: 'charmMilestone', at: T0, threshold: 20, charm: 23, decor: 'banner' };
  s.news = [news[0], news[1], charm];
  const savedNews = structuredClone(s.news);
  for (const lang of ['en', 'vi']) {
    await setLanguage(lang);
    const name = personName('lan', lang);
    const html = text(renderToday(s, T0));
    for (const count of [3, 6]) assert.ok(html.includes(t('{name} and you: {count} hearts', { name, count })));
    assert.ok(html.includes(t('Village charm {charm}: {name} goes up', { charm: 20, name: t('Village banner') })));
    assert.ok(!html.includes(String(T0)), 'a saved date must never appear as a heart/charm count');
    assert.equal(text(NEWS.heartScene({ type: 'heartScene', person: 'lan', at: 3 })), t('{name} and you: {count} hearts', { name, count: 3 }));
    const legacy = { type: 'heartScene', person: 'lan', at: T0 };
    // Two thresholds earned at once cannot be recovered from the same date: keep their old news readable.
    assert.equal(text(NEWS.heartScene(legacy, s)), `${t('Heart scene')} · ${name}`);
    const distinct = { ...s, firsts: { ...s.firsts, 'heart:lan:3': T0 - 1 } };
    assert.equal(text(NEWS.heartScene(legacy, distinct)), t('{name} and you: {count} hearts', { name, count: 6 }));
    assert.equal(text(NEWS.heartScene(legacy, { firsts: {} })), `${t('Heart scene')} · ${name}`);
    for (const m of CHARM_MILESTONES) {
      assert.equal(text(NEWS.charmMilestone({ type: 'charmMilestone', at: T0, decor: m.decor, charm: 47 })), t('Village charm {charm}: {name} goes up', { charm: m.at, name: t(m.name) }));
    }
  }
  assert.deepEqual(s.news, savedNews, 'rendering old or new news cannot rewrite its saved history');
  await setLanguage('en');
});
