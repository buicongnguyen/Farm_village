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
