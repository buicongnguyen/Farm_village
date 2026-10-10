// Locale names are presentation only: stable identities, player text and earned progress must survive the change.
import './tz.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTER_NAMES, PET_NAMES, FAMILY_NAMES, personName, petName, familyName, resolveNames } from '../src/content/character-names.mjs';
import { allPeople, FAMILIES, VILLAGERS } from '../src/content/people.mjs';
import { CHAPTERS } from '../src/content/story.mjs';
import { LETTERS } from '../src/content/letters.mjs';
import { HEART_SCENES, WISHES } from '../src/content/hearts.mjs';
import { newGame } from '../src/core/state.mjs';
import { pack, unpack } from '../src/kit/save.mjs';
import { t, tIn, setLanguage, getLanguage, loadVietnamese } from '../src/kit/i18n.mjs';
import { VI } from '../src/i18n/vi.mjs';

// These are string renderers; sound registers one visibility listener during import, as in news.test.mjs.
const previousDocument = globalThis.document;
globalThis.document = { documentElement: {}, addEventListener() {} };
const { nameOf, wishLine, familyRows } = await import('../src/ui/bonds-panels.mjs');
const { NEWS } = await import('../src/ui/village-panels.mjs');
const { renderSettings } = await import('../src/ui/settings-panels.mjs');
if (previousDocument === undefined) delete globalThis.document;
else globalThis.document = previousDocument;

const LOCALES = ['en', 'vi', 'ko', 'ja'];
const PERSON_IDS = ['ada', 'ellis', 'june', 'pip', 'minh', 'lan', 'bo', 'grace', 'sam', 'zara', 'elin', 'olaf', 'marisol', 'tomas', 'pia', 'cora', 'hazel', 'hugo', 'pearl', 'bea', 'albright', 'mai', 'gus', 'priya', 'twins'];   // newcomers: hugo the baker (chapter 6), pearl the constable (7), bea the office manager (8)
const PET_IDS = ['dog', 'hen_cloud', 'hen_drizzle', 'frog_captain', 'cat'];
const FAMILY_IDS = ['tran', 'okafor', 'lindqvist', 'reyes'];
const NOW = 1_800_000_000_000;

test('all existing identities have distinct short names and explicit display forms in four locales', () => {
  assert.deepEqual(Object.keys(CHARACTER_NAMES).sort(), [...PERSON_IDS].sort());
  assert.deepEqual(allPeople().map(p => p.id).sort(), [...PERSON_IDS].sort(), 'renaming must not create or replace a person');
  assert.deepEqual(Object.keys(PET_NAMES).sort(), [...PET_IDS].sort());
  assert.deepEqual(Object.keys(FAMILY_NAMES).sort(), [...FAMILY_IDS].sort());
  assert.deepEqual(FAMILIES.map(f => [f.id, f.people.map(p => p.id)]), [
    ['tran', ['minh', 'lan', 'bo']], ['okafor', ['grace', 'sam', 'zara']], ['lindqvist', ['elin', 'olaf']], ['reyes', ['marisol', 'tomas', 'pia']],
  ], 'a translated household label cannot invent a different family');
  for (const lang of LOCALES) {
    const short = [];
    for (const [table, ids, name] of [[CHARACTER_NAMES, PERSON_IDS, personName], [PET_NAMES, PET_IDS, petName]]) {
      for (const id of ids) {
        assert.ok(Object.hasOwn(table[id], lang), `${id}: missing ${lang}`);
        for (const form of ['short', 'display']) {
          const text = name(id, lang, form);
          assert.equal(typeof text, 'string'); assert.ok(text.trim() && !/[{}<>]/.test(text), `${lang}/${id}/${form}: invalid name`);
        }
        short.push(name(id, lang, 'short'));
      }
    }
    assert.equal(new Set(short).size, short.length, `${lang}: two established identities share a short name`);
    for (const id of FAMILY_IDS) assert.ok(Object.hasOwn(FAMILY_NAMES[id], lang) && familyName(id, lang).trim(), `${id}/${lang}`);
  }
  assert.equal(personName('pip', 'en', 'short'), 'Sunny');
  assert.equal(personName('pip', 'vi', 'short'), 'Bắp');
  assert.equal(personName('pip', 'ko', 'short'), '하루');
  assert.equal(personName('pip', 'ja', 'short'), 'ひなた');
  assert.equal(personName('june', 'vi', 'short'), 'Mơ');
  assert.equal(personName('ada', 'vi', 'display'), 'Bà Mận');
  assert.equal(personName('ellis', 'vi', 'display'), 'Ông Quế');
  assert.equal(petName('dog', 'vi', 'short'), 'Đậu');
  assert.equal(petName('hen_cloud', 'vi', 'short'), 'Mây');
  assert.equal(petName('hen_drizzle', 'vi', 'short'), 'Mưa');
});

test('name fallbacks are safe for unknown locales, identities and token forms', () => {
  for (const name of [personName, petName, familyName]) for (const id of ['missing', '__proto__', 'constructor', 'toString'])
    assert.equal(name(id, 'vi'), id);
  assert.equal(personName('ada', 'xx'), personName('ada', 'en'));
  assert.equal(petName('dog', 'xx'), petName('dog', 'en'));
  assert.equal(familyName('tran', 'xx'), familyName('tran', 'en'));
  assert.equal(personName('ada', 'vi', 'made-up'), personName('ada', 'vi', 'display'));
  assert.equal(petName('dog', 'vi', 'made-up'), petName('dog', 'vi', 'display'));
  for (const text of ['{person:missing:short}', '{pet:missing:display}', '{family:missing}', '{person:ada:unknown}', '{person:__proto__:short}'])
    assert.equal(resolveNames(text, 'vi'), text, text);
});

test('only explicit authored tokens resolve; ordinary Mai words, names and free prose stay literal', () => {
  const free = 'Mai trời mưa. Tôi tên Mai, thích mây và bánh. Pip, June and Ada are words I wrote.';
  for (const lang of LOCALES) {
    assert.equal(resolveNames(free, lang), free);
    const text = '{person:pip:short} · {person:ada:display} · {pet:dog:display} · {family:tran}';
    assert.equal(resolveNames(text, lang), [personName('pip', lang, 'short'), personName('ada', lang), petName('dog', lang), familyName('tran', lang)].join(' · '));
  }
});

test('translation expands authored identities before parameters so player-supplied tokens never execute', async () => {
  await loadVietnamese();
  const player = 'Mai {person:ada:display} {pet:dog:short}';
  try {
    for (const lang of ['en', 'vi']) {
      await setLanguage(lang);
      assert.equal(t('From {name}', { name: player }), (lang === 'vi' ? VI['From {name}'] : 'From {name}').replace('{name}', player));
      const template = '{person:pip:short}: {name}';
      assert.equal(t(template, { name: player }), `${personName('pip', lang, 'short')}: ${player}`);
      assert.equal(tIn(lang, template, { name: player }), `${personName('pip', lang, 'short')}: ${player}`);
      assert.equal(t('Mai wrote a completely new private sentence about Pip.'), 'Mai wrote a completely new private sentence about Pip.');
    }
    await setLanguage('vi');
    await setLanguage('fr'); assert.equal(getLanguage(), 'vi', 'unsupported language changed the current edition');
  } finally { await setLanguage('en'); }
});

test('known legacy saved order and wish phrases translate without changing their saved facts or player name', async () => {
  const oldOrder = 'Bo grew three centimetres this month. He eats like a horse.';
  const oldWish = 'A bush by our house for hide-and-seek! Pip always finds me.';
  const s = newGame(NOW, 81427, { restore: true });
  s.settings.playerName = 'Mai {person:pip:short}';
  s.orders.cards = [{ id: 'old-order', from: 'lan', need: { wheat: 3 }, coins: 24, xp: 2, line: oldOrder, readyAt: NOW }];
  s.wishes.list = [{ home: 'old-home', person: 'bo', kind: 'bush', text: oldWish, done: true }];
  s.news = [{ type: 'familyArrived', family: 'tran', at: NOW - 1 }, { type: 'projectDone', name: 'The school', at: NOW }];
  s.mail = [{ id: 'ellis-1', from: 'ellis', at: NOW - 5, read: true }];
  s.people.ada = { hearts: 3, scenes: [3] };
  s.firsts['heart:ada:3'] = NOW - 2;
  const restored = unpack(pack(s)), before = structuredClone(restored);
  assert.equal(restored.orders.cards[0].line, oldOrder);
  assert.equal(restored.wishes.list[0].text, oldWish);
  const order = FAMILIES.find(f => f.id === 'tran').people.find(p => p.id === 'lan').orders.find(line => line.includes('three centimetres'));
  const wish = WISHES.bo.find(w => w.need.kind === 'bush').text;
  assert.ok(order && wish);
  try {
    for (const lang of ['vi', 'en', 'vi', 'en']) {
      await setLanguage(lang);
      assert.equal(t(restored.orders.cards[0].line), t(order));
      assert.equal(t(restored.wishes.list[0].text), t(wish));
      assert.ok(t(oldOrder).includes(personName('bo', lang, 'short')));
      assert.ok(wishLine(restored, 'old-home').includes(personName('pip', lang, 'short')));
      assert.ok(NEWS.familyArrived(restored.news[0]).includes(familyName('tran', lang)));
      assert.ok(NEWS.projectDone(restored.news[1]).includes(t('The school')));
      assert.equal(nameOf('ada'), personName('ada', lang));
      assert.ok(familyRows(restored, FAMILIES[0], NOW, true).includes(personName('minh', lang)));
      assert.deepEqual(restored, before, 'rendering names changed balances, pending orders, wishes, progress, news or player input');
    }
    assert.deepEqual(unpack(pack(restored)), before, 'repeated reload changed the renamed farm');
  } finally { await setLanguage('en'); }
});

test('Settings preserves accepted imported name entities literally and raw markup remains rejected on import', async () => {
  const importedName = `Mai &amp; &quot; &#34; ' {person:pip:short}`;
  const saved = newGame(NOW, 81428, { restore: true });
  saved.settings.playerName = importedName;
  const s = unpack(pack(saved)), before = structuredClone(s);
  const invalid = structuredClone(saved);
  invalid.settings.playerName = `Mai " data-untrusted="yes"><img src=x onerror="alert(1)">`;
  assert.throws(() => unpack(pack(invalid)), /not a Farm Village save/, 'name rendering must not weaken imported markup rejection');
  const hadTestMode = Object.hasOwn(globalThis, 'TEST_MODE'), previousTestMode = globalThis.TEST_MODE;
  globalThis.TEST_MODE = false;
  try {
    for (const lang of ['en', 'vi']) {
      await setLanguage(lang);
      const html = renderSettings(s, 1);
      const input = html.match(/<input\b[^>]*\bdata-name\b[^>]*>/)?.[0];
      assert.ok(input, 'the player name field must still be present');
      const value = input.match(/\bvalue="([^"]*)"/)?.[1];
      assert.notEqual(value, undefined, 'the imported name broke the quoted value attribute');
      const entities = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"' };
      assert.equal(value.replace(/&(?:amp|lt|gt|quot);/g, entity => entities[entity]), importedName,
        'display escaping must preserve the full name, literal entity text and identity-like tokens');
      assert.doesNotMatch(input, /<img|"\s+(?:data-untrusted|onerror)=/i, 'name data became an element or attribute');
      assert.ok(input.includes('aria-label='), 'the name must not swallow the following field attributes');
      assert.deepEqual(s, before, 'rendering Settings must not rewrite imported names or farm progress');
    }
  } finally {
    if (hadTestMode) globalThis.TEST_MODE = previousTestMode; else delete globalThis.TEST_MODE;
    await setLanguage('en');
  }
});

test('letters, the spelling joke and child relationships are authored for their localized identities', () => {
  const boScene = HEART_SCENES.bo[3].lines.find(line => line.who === 'bo');
  assert.ok(boScene, 'missing school desk scene');
  for (const lang of ['en', 'vi']) {
    const desk = resolveNames(lang === 'vi' ? VI[boScene.text] : boScene.text, lang);
    assert.doesNotMatch(desk, /B-O|Two letters|hai chữ/i, 'desk joke still counts the old name');
    const letters = LETTERS.map(letter => resolveNames(lang === 'vi' ? VI[letter.text] : letter.text, lang)).join('\n');
    assert.doesNotMatch(letters, /(?:^|\s)-E(?:\s|$)|Marisol Reyes|Look: Zara|Nhìn này: Zara/, 'legacy signature or handwriting remains');
    const zara = LETTERS.find(letter => letter.id === 'zara-1');
    assert.ok(resolveNames(lang === 'vi' ? VI[zara.text] : zara.text, lang).includes(personName('zara', lang, 'short')));
    assert.ok(resolveNames(lang === 'vi' ? VI[CHAPTERS[0].text] : CHAPTERS[0].text, lang).includes(personName('pip', lang, 'short')));
  }
  const pip = VILLAGERS.find(person => person.id === 'pip');
  const grandparents = [...pip.idle, pip.says.harvested.first].filter(text => /\{person:(ada|ellis):/.test(text));
  assert.ok(grandparents.length >= 2);
  for (const text of grandparents) {
    const vi = resolveNames(VI[text], 'vi');
    assert.match(vi, /cụ/iu, 'the child lost the great-grandparent relationship');
    assert.doesNotMatch(vi, /cụ (?:Bà|Ông)/iu, 'short-name token was replaced by an inappropriate display title');
  }
});
