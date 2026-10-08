import './tz.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { game, T0 } from './helpers.mjs';
import { act } from '../src/core/act.mjs';
import { commentFor } from '../src/core/neighbours.mjs';
import { NEIGHBOURS } from '../src/content/people.mjs';
import { setLanguage, t, tParams } from '../src/kit/i18n.mjs';

// View imports register the sound visibility listener; the tested methods need no DOM or renderer.
const previousDocument = globalThis.document;
globalThis.document = { documentElement: {}, addEventListener() {} };
const { PeopleView } = await import('../src/view/people-view.mjs');
if (previousDocument === undefined) delete globalThis.document;
else globalThis.document = previousDocument;
await setLanguage('en');
function fixture(s, id = 'mai', visitNumber = 4) {
  const observation = commentFor(s, id, visitNumber), spoken = [];
  const w = { id: `visit:${id}`, person: id, visitor: true, visitNumber,
    comment: observation.text, params: observation.params, stage: 'coming', wait: 0, route: [] };
  const view = Object.assign(Object.create(PeopleView.prototype), {
    game: { s, now: T0 }, world: { cam: { yaw: 0 } }, time: 0,
    say: (_, line) => spoken.push(line), once: () => {}, follow: () => false,
  });
  return { view, w, spoken };
}

test('tapping an incoming neighbour consumes one observation without breaking their later arrival', () => {
  const s = game(), { view, w, spoken } = fixture(s, 'gus', 1), before = JSON.stringify(s);
  const gus = NEIGHBOURS.find(n => n.id === 'gus');
  view.talk(w);
  assert.deepEqual(spoken, [gus.arc[0].text], 'retain the visit arc even if later visits are already saved');
  assert.equal(w.heard, undefined, 'the observation must not consume the introduction');
  assert.doesNotThrow(() => view.liveVillager(w, 1, false));
  assert.equal(w.stage, 'talking');
  assert.equal(spoken.length, 1, 'arrival must not repeat an observation already heard on the way in');
  view.talk(w);
  assert.equal(spoken[1], gus.line, 'ordinary conversation remains available after the visit line');
  assert.equal(JSON.stringify(s), before, 'a conversation cannot grant another visit or reward');
});

test('visitor observations recheck buildings on arrival and counts on tap', () => {
  const s = game(); s.placed.bakery = { kind: 'bakery', x: 32, z: 56 }; s.counts.bakery = 1;
  const arriving = fixture(s);
  assert.match(arriving.w.comment, /bread/i);
  assert.ok(act(s, 'store', { id: 'bakery' }, T0).ok);
  arriving.view.liveVillager(arriving.w, 1, false);
  const latest = commentFor(s, 'mai', 4);
  assert.equal(arriving.spoken[0], t(latest.text, tParams(latest.params)));
  assert.notEqual(arriving.spoken[0], arriving.w.comment, 'do not describe the bakery that was put away');

  s.counts.bed = 8;
  const tapped = fixture(s);
  s.counts.bed = 11;
  tapped.view.talk(tapped.w);
  assert.match(tapped.spoken[0], /11/);
  assert.doesNotMatch(tapped.spoken[0], /\{count\}/);
  assert.equal(tapped.w.visitSpoken, true);
});

test('an automatic arrival consumes its observation before subsequent taps', () => {
  const { view, w, spoken } = fixture(game(), 'gus', 2);
  view.liveVillager(w, 1, false);
  view.talk(w);
  const gus = NEIGHBOURS.find(n => n.id === 'gus');
  assert.deepEqual(spoken, [gus.arc[1].text, gus.line]);
});
