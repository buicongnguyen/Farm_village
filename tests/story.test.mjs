// The story data hangs together (docs/STORY.md): every speaker exists, every poster has their own order lines, heart
// scenes, wishes, arrivals and letters are complete, and each speaker keeps one set of Vietnamese pronouns.
import './tz.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHAPTERS, BEATS, TUTORIAL, RESTORE_TUTORIAL, VILLAGE_NAME } from '../src/content/story.mjs';
import { FAMILIES, VILLAGERS, NEIGHBOURS, REMARK_FACTS, FIRST_ORDER, JUNE_TIPS } from '../src/content/people.mjs';
import { HEART_SCENES, WISHES, ARRIVALS } from '../src/content/hearts.mjs';
import { CHATTER, PIP_LINES } from '../src/content/chatter.mjs';
import { LETTERS } from '../src/content/letters.mjs';
import { DISCOVERIES } from '../src/content/discoveries.mjs';
import { EXPLORATION_STEPS } from '../src/content/exploration.mjs';
import { ADVICE_TOPICS } from '../src/content/advice.mjs';
import { BUILDINGS } from '../src/content/buildings.mjs';
import { RECIPES } from '../src/content/goods.mjs';
import { VI } from '../src/i18n/vi.mjs';
import { game, tutorial } from './helpers.mjs';

const residents = FAMILIES.flatMap(f => f.people);
const PEOPLE = Object.fromEntries([...VILLAGERS, ...NEIGHBOURS, ...residents].map(p => [p.id, p]));
const sceneLines = Object.values(HEART_SCENES).flatMap(levels => Object.values(levels).flatMap(sc => [...sc.lines, ...(sc.variants ?? []).flatMap(v => v.lines)]));
const spoken = [...EXPLORATION_STEPS.flatMap(step => step.lines), ...BEATS.flatMap(b => b.lines), ...sceneLines, ...Object.values(ARRIVALS).flat()];

test('every speaker in the story, heart scenes, arrivals and letters is a real person', () => {
  const unknown = [...spoken.map(l => l.who), ...LETTERS.map(l => l.from), ...Object.values(ADVICE_TOPICS).map(a => a.person)].filter(id => !PEOPLE[id]);
  assert.deepEqual([...new Set(unknown)], []);
  assert.ok(spoken.every(l => typeof l.text === 'string' && l.text.length > 0));
});

test('your family is on stage but never posts orders, and Ellis only writes letters', () => {
  for (const id of ['june', 'pip', 'ellis']) { const p = PEOPLE[id]; assert.ok(p?.family && p.noOrders, `${id} is not family/noOrders`); }
  assert.ok(!spoken.some(l => l.who === 'ellis'), 'Ellis speaks in a scene, but he is away upriver');
  assert.ok(LETTERS.filter(l => l.from === 'ellis').length >= 3, 'Ellis needs his letters');
  assert.match(PEOPLE.ellis.line, /fishing upriver/);
  const pip = PEOPLE.pip.says;
  for (const e of ['harvested', 'animalArrived', 'familyArrived']) assert.ok(pip[e]?.first, `Pip has no first-time line for ${e}`);
  assert.ok(PEOPLE.june.tip && PEOPLE.june.tips.length >= 2);
});

test('every person who can post an order has 4–6 lines in their own voice', () => {
  const posters = [...VILLAGERS.filter(v => !v.noOrders), ...NEIGHBOURS, ...residents];
  for (const p of posters) assert.ok(p.orders?.length >= 4 && p.orders.length <= 6, `${p.id} has ${p.orders?.length ?? 0} order lines`);
  const all = posters.flatMap(p => p.orders); assert.equal(new Set(all).size, all.length, 'two people share an order line');
  assert.equal(FIRST_ORDER.from, 'ada');
});

// everyone who can gain hearts: residents, order posters (orders.mjs adds hearts to the poster) and gift takers
const heartPeople = [...residents, ...VILLAGERS.filter(v => !v.noOrders || !v.noGifts && !v.family), ...NEIGHBOURS];
test('heart scenes at 3, 6 and 9 for everyone who can earn hearts, with a real reward', () => {
  for (const p of heartPeople) {
    const sc = HEART_SCENES[p.id]; assert.ok(sc, `${p.id} has no heart scenes`);
    assert.deepEqual(Object.keys(sc).map(Number), [3, 6, 9]);
    for (const [at, { lines, reward }] of Object.entries(sc)) {
      assert.equal(lines.length, 3, `${p.id} ${at}: ${lines.length} lines`);
      assert.ok(lines.some(l => l.who === p.id), `${p.id} does not speak in their own ${at}-heart scene`);
      if (reward.decor) assert.equal(BUILDINGS[reward.decor]?.cat, 'charm', `${p.id} ${at}: ${reward.decor} is not a decoration`);
      else if (reward.recipe) assert.ok(RECIPES[reward.recipe], `${p.id} ${at}: no recipe ${reward.recipe}`);
      else assert.ok(reward.coins > 0, `${p.id} ${at}: no reward`);
    }
  }
  assert.deepEqual(Object.keys(HEART_SCENES).filter(id => !heartPeople.some(p => p.id === id)), []);
});

test('wishes ask for decorations near home, and every family has three arrival lines from its own people', () => {
  for (const p of residents) {
    assert.ok(WISHES[p.id]?.length >= 2, `${p.id} has no wishes`);
    for (const w of WISHES[p.id]) { assert.equal(BUILDINGS[w.need.kind]?.cat, 'charm', w.need.kind); assert.equal(w.need.near, 'home'); }
  }
  for (const f of FAMILIES) {
    assert.equal(ARRIVALS[f.id]?.length, 3, `${f.id} arrival`);
    assert.ok(ARRIVALS[f.id].every(l => f.people.some(p => p.id === l.who)), `${f.id}: someone else speaks at their arrival`);
  }
});

test('letters have unique ids and reachable triggers', () => {
  assert.equal(new Set(LETTERS.map(l => l.id)).size, LETTERS.length);
  for (const l of LETTERS) {
    for (const w of [l.when, l.also].filter(Boolean)) assert.ok(['chapter', 'hearts', 'level', 'stat', 'count'].includes(w.type), `${l.id}: ${w.type}`);
    const { type, value } = l.when;
    if (type === 'count') assert.ok(BUILDINGS[l.when.key], `${l.id}: no building ${l.when.key}`);
    if (type === 'chapter') assert.ok(CHAPTERS.some(c => c.id === value && !c.teaser), `${l.id}: chapter ${value}`);
    if (type === 'hearts') { assert.ok(value >= 1 && value <= 10); assert.ok(residents.some(p => p.id === l.from), `${l.id}: hearts letters come from residents`); }
    if (type === 'level') assert.ok(value >= 2 && value <= 10);
  }
});

test('neighbour remarks fill their placeholders from the state, and Gus has his three-visit arc', () => {
  const s = game(); tutorial(s);
  s.animals.c1 = [{ kind: 'hen', doneAt: null }, { kind: 'hen', doneAt: null }, { kind: 'hen', doneAt: null }];
  s.counts.bed = 12; s.counts.cottage = 2; s.counts.bakery = 1;
  s.placed.testBakery = { kind: 'bakery', x: 0, z: 0 };
  s.homes.h1 = { family: 'tran', arrived: true, arrivesAt: 1 }; s.homes.h2 = { family: 'okafor', arrived: true, arrivesAt: 2 };
  const names = t => [...t.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join();
  for (const n of NEIGHBOURS) for (const r of n.remarks) {
    const params = REMARK_FACTS[r.fact]?.(s); assert.ok(params, `${n.id}: ${r.fact} does not apply`);
    assert.equal(Object.keys(params).sort().join(), names(r.text), `${n.id}: ${r.text}`);
  }
  assert.deepEqual(REMARK_FACTS.family(s), { family: 'The Okafor family' });
  assert.equal(REMARK_FACTS.hens(game()), null);
  const arc = NEIGHBOURS.find(n => n.id === 'gus').arc;
  assert.deepEqual(arc.map(a => a.visit), [1, 2, 3]); assert.match(arc[2].text, /Ada taught me to bake/);
});

test('chapters: one opening card, three chapter ends with an Ada beat, then the clinic chapter ending', () => {
  assert.deepEqual(CHAPTERS.map(c => c.id), [1, 2, 3, 4, 5]);
  assert.ok(CHAPTERS.every(c => c.ada && c.panels.length <= 3 && c.text.length <= 340), 'a card is too long for a phone');
  assert.ok(!CHAPTERS.some(c => c.teaser));
  assert.match(CHAPTERS[0].text, /The key is under the seed tin\. Bring Hollowbrook home\./);
  assert.ok(!JSON.stringify(CHAPTERS).includes('by the brook'), 'the cottage is on Brook Lane');
  assert.ok(CHAPTERS[0].when(game()) && !CHAPTERS[1].when(game()));
  assert.equal(new Set(BEATS.map(b => b.id)).size, BEATS.length);
  assert.ok(TUTORIAL.every(st => st.text.length <= 170 && st.text.includes('<b>')), 'tutorial steps keep their bold verbs and fit the guide card');
  assert.equal(VILLAGE_NAME, 'Hollowbrook');
});

// ── Vietnamese voice ──
const words = s => s.toLowerCase().split(/[^\p{L}]+/u).filter(Boolean);
const has = (s, w) => { const ws = words(s), parts = w.split(' '); return ws.some((_, i) => parts.every((p, j) => ws[i + j] === p)); };
// what each speaker must never call themselves or the player (the pronoun pairs in docs/STORY.md). Only unambiguous
// forms are listed: "bạn" is also "friend", "con" a classifier and "mình" "our", so those are checked as address phrases.
const YOU_BAN = ['của bạn', 'cho bạn', 'bạn có', 'bạn ơi', 'bạn đã'];
const NEVER = {
  ada: ['tôi', ...YOU_BAN, 'của em', 'cho em'], ellis: ['tôi', ...YOU_BAN], june: ['tôi', ...YOU_BAN], pip: ['tôi', 'cháu', 'tớ'],
  minh: ['tôi', ...YOU_BAN], lan: ['tôi', ...YOU_BAN], grace: ['tôi', ...YOU_BAN], sam: ['tôi', ...YOU_BAN], marisol: ['tôi', ...YOU_BAN],
  hazel: ['tôi', ...YOU_BAN], tomas: ['tôi', ...YOU_BAN], cora: ['tôi', ...YOU_BAN], olaf: ['tôi', ...YOU_BAN], gus: ['tôi', ...YOU_BAN],
  mai: ['tôi', ...YOU_BAN, 'cháu'], elin: ['tôi', ...YOU_BAN, 'cháu'], bo: ['tôi', ...YOU_BAN], zara: ['tôi', ...YOU_BAN], pia: ['tôi', ...YOU_BAN],
};
const unquoted = s => s.replace(/"[^"]*"|“[^”]*”/g, ' ').replace(/bạn ấy/g, ' ');   // "bạn ấy": he or she
const linesBy = () => {
  const out = Object.fromEntries(Object.keys(NEVER).map(id => [id, []]));
  for (const p of Object.values(PEOPLE)) { const l = out[p.id]; if (!l) continue;
    l.push(p.line, ...(p.orders ?? []), ...(p.tips ?? []), ...(p.tip ? [p.tip] : []), ...(p.idle ?? []), ...(p.arc ?? []).map(a => a.text), ...(p.remarks ?? []).map(r => r.text), ...(p.comments ?? []),
      ...(p.contextLines ?? []).map(l => l.text), ...Object.values(p.says ?? {}).flatMap(e => [e.first, ...e.lines].filter(Boolean))); }
  for (const l of spoken) out[l.who]?.push(l.text);
  for (const l of LETTERS) out[l.from]?.push(l.text);
  for (const d of DISCOVERIES) out[d.person]?.push(d.line);
  for (const a of Object.values(ADVICE_TOPICS)) out[a.person]?.push(a.line);
  for (const [id, list] of Object.entries(WISHES)) out[id].push(...list.map(w => w.text));
  out.june.push(...Object.values(JUNE_TIPS));
  out.ada.push(FIRST_ORDER.line, ...CHAPTERS.map(c => c.ada), ...TUTORIAL.map(st => st.text), ...RESTORE_TUTORIAL.map(st => st.text));
  out.pip.push(...Object.values(PIP_LINES).flat());
  for (const [id, lines] of Object.entries(out)) {
    if (id === 'ellis') continue; // away upriver; no tap-to-chat bubble
    const age = ['pip', 'bo', 'zara', 'pia'].includes(id) ? 'kid' : 'grown';
    lines.push('I have an order for you!', ...Object.values(CHATTER).flatMap(part => part[age]));
  }
  return out;
};

test('each speaker keeps their Vietnamese pronouns', () => {
  const wrong = [];
  for (const [id, lines] of Object.entries(linesBy())) for (const en of lines) {
    const vi = VI[en]; if (!vi) continue;   // coverage is checked in i18n.test.mjs
    for (const w of NEVER[id]) if (has(unquoted(vi), w)) wrong.push(`${id} says "${w}": ${vi}`);
  }
  assert.deepEqual(wrong, []);
  // Ada speaks as bà to cháu: most of her tutorial lines say so (the others use neither pronoun)
  const bc = TUTORIAL.filter(st => has(VI[st.text], 'cháu') || has(VI[st.text], 'bà')).length;
  assert.ok(bc >= TUTORIAL.length / 2, `only ${bc} of Ada's tutorial lines say bà/cháu`);
});

test('one Vietnamese name for Hollowbrook, consistent animal names, and the feed mill is a cối xay cám', () => {
  assert.equal(VI.Hollowbrook, 'Thung Suối');
  for (const [en, vi] of Object.entries(VI)) {
    if (/Hollowbrook/i.test(en)) assert.ok(/Thung Suối/i.test(vi), `Hollowbrook: ${vi}`);
    if (/feed mill/i.test(en)) assert.ok(/cối xay cám/i.test(vi), `feed mill: ${vi}`);
    for (const [name, translated] of [['Biscuit', 'Biscuit'], ['Cloud', 'Mây'], ['Drizzle', 'Mưa Phùn'], ['Captain', 'Thuyền Trưởng']]) {
      if (en.includes(name)) assert.ok(vi.includes(translated), `${name} must be ${translated}: ${vi}`);
    }
    if (/\bBo\b/.test(en)) assert.ok(!/\bBơ\b/u.test(vi) && /\bBo\b/.test(vi), `Bo: ${vi}`);
  }
  assert.equal(VI['Your grandmother'], 'Bà nội');
  assert.equal(VI['I know how'], 'Cháu biết rồi ạ');
});

test('Pip names the first hens Cloud and Drizzle throughout their English and Vietnamese story', () => {
  const hens = PEOPLE.pip.says.animalArrived;
  assert.match(hens.first, /\bCloud\b/);
  assert.match(hens.lines[0], /\bDrizzle\b/);
  const later = [CHAPTERS.find(c => c.id === 2).text, LETTERS.find(l => l.id === 'mai-1').text,
    HEART_SCENES.mai[9].lines.find(l => l.who === 'pip').text];
  for (const en of later) {
    assert.match(en, /Cloud and Drizzle/);
    assert.ok(VI[en].includes('Mây') && VI[en].includes('Mưa Phùn'), en);
    assert.doesNotMatch(en, /Biscuit|Pancake/, 'the dog or an obsolete name replaced the hens');
  }
  assert.ok(!Object.keys(VI).some(en => en.includes('Pancake')), 'obsolete hen dialogue remains in the translation table');
});

test('shared chatter avoids incompatible family pronouns', () => {
  // A single key is spoken by both Pip (con) and village children (cháu), or by adults with different forms of address.
  // Rephrase shared lines naturally without choosing the wrong family relationship for any of their speakers.
  for (const [age, banned] of [['kid', ['tôi', 'em', 'anh chị', 'cháu', 'con']], ['grown', ['tôi', 'anh chị', ...YOU_BAN]]]) {
    for (const en of Object.values(CHATTER).flatMap(part => part[age])) {
      const vi = unquoted(VI[en]);
      for (const word of banned) {
        // con is also the animal classifier: only prohibit it as the subject before a verb.
        if (word === 'con') assert.doesNotMatch(vi, /(?:^|[.!?]\s*)con (?:đã|sẽ|muốn|thấy|nghe|tìm|đếm|đang|có|không)\b/iu, en);
        else assert.ok(!has(vi, word), `${en}: ${word}`);
      }
    }
  }
});
