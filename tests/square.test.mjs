// The village square's fixed things keep off each other, posts are solid, and every field has its own sale panel.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SITES, PLAZA, WELL, POST_CELLS, SOLID_CELLS, COOPERATIVE_BOARD, FAIR_BOARD } from '../src/content/world.mjs';
import { SHOP_SITES } from '../src/content/shops.mjs';
import { footprint } from '../src/content/buildings.mjs';

test('nothing on the square stands on the festival stage: stalls, lamps, boards and the well keep off it', () => {
  const st = SITES.find(x => x.kind === 'stage'), [w, d] = footprint('stage', st.rot);
  const on = (x, z, pad = 0) => x >= st.x - pad && x <= st.x + w + pad && z >= st.z - pad && z <= st.z + d + pad;
  for (const site of SHOP_SITES.filter(x => x.shop === 'plaza')) assert.ok(!on(site.x, site.z, 1), `${site.id} stands on the stage`);
  for (const key of [...POST_CELLS, ...SOLID_CELLS]) { const [x, z] = key.split(',').map(Number); if (x >= PLAZA.x0 && x <= PLAZA.x1 && z >= PLAZA.z0 && z <= PLAZA.z1) assert.ok(!on(x + 0.5, z + 0.5), `${key} is under the stage`); }
  for (const b of [COOPERATIVE_BOARD, FAIR_BOARD, WELL]) assert.ok(!on(b.x + 0.5, b.z + 0.5), 'a board or the well is under the stage');
});

test('one feed lasts ten collections: the animal goes on giving and is hungry after the tenth; an older save is hungry after one', async () => {
  const { actions, FEED_MEALS, animalState } = await import('../src/core/animals.mjs'), { newGame } = await import('../src/core/state.mjs'), { ANIMALS } = await import('../src/content/goods.mjs');
  const s = newGame(1_700_000_000_000, 7, { restore: true }); let now = 1_700_000_000_000;
  const ctx = () => ({ s, now, events: [], emit() {}, fail: reason => ({ ok: false, reason }) });
  s.placed.cp = { kind: 'coop', x: 40, z: 60, rot: 0 }; s.cond = {}; s.animals = { cp: [{ kind: 'hen', doneAt: null }] }; s.barn.cap = 500; s.barn.items = { chicken_feed: 3 };
  assert.equal(FEED_MEALS, 10); assert.equal(actions.feed(ctx(), { home: 'cp' }).fed, 1); assert.equal(s.barn.items.chicken_feed, 2);
  for (let i = 1; i <= 10; i++) {
    now += ANIMALS.hen.everyMs; assert.equal(actions.collect(ctx(), { home: 'cp' }).collected, 1, `egg ${i}`);
    assert.equal(animalState(s.animals.cp[0], now), i < 10 ? 'busy' : 'hungry', `after egg ${i}`);
  }
  assert.equal(s.barn.items.egg, 10); assert.equal(s.barn.items.chicken_feed, 2, 'ten eggs from one feed');
  s.animals.cp[0] = { kind: 'hen', doneAt: now };   // fed under the old rule
  assert.equal(actions.collect(ctx(), { home: 'cp' }).collected, 1); assert.equal(animalState(s.animals.cp[0], now), 'hungry');
});
