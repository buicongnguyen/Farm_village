// Chapter 7, safe streets (docs/plan/ch07-safe-streets.md): the boat dock on its fixed site, fishing in the brook from
// it, ponds that water nearby beds, the constable and her letters, the chapter and its scenes.
import './tz.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/core/state.mjs';
import { act, tick } from '../src/core/act.mjs';
import { sitePlan, siteOf, siteAt, siteBuilt } from '../src/core/sites.mjs';
import { SITES, isBrook, isRoad, DOCK_BANK, CELL } from '../src/content/world.mjs';
import { BUILDINGS } from '../src/content/buildings.mjs';
import { CROPS, FISH_TABLE } from '../src/content/goods.mjs';
import { WATERED, RIVER } from '../src/content/economy.mjs';
import * as grid from '../src/core/grid.mjs';
import { stepCost, findRoute } from '../src/core/walk.mjs';
import { pondsOf, waterOf, seatsOf, fishable, waterDistance, BANK } from '../src/core/pond-bank.mjs';
import { pick } from '../src/core/fishing.mjs';
import { mayBuild, stepDone } from '../src/core/projects.mjs';
import { CHAPTERS, BEATS } from '../src/content/story.mjs';
import { VILLAGERS, hasArrived } from '../src/content/people.mjs';
import { LETTERS } from '../src/content/letters.mjs';
import { journeyOf } from '../src/core/journey.mjs';
import { personName } from '../src/content/character-names.mjs';
import { pack, unpack } from '../src/kit/save.mjs';
import { must, T0, MIN } from './helpers.mjs';

/** A farm at the start of chapter 7 (the tester's jump). */
function farm(seed = 4242) { const s = newGame(T0, seed, { restore: true }); tick(s, T0); must(s, 'testJumpChapter', { chapter: 7 }); return s; }
const dockOf = s => Object.keys(s.placed).find(id => s.placed[id].kind === 'dock');
const site = siteOf('dock');

test('the dock has one place: on the south bank of the brook, by the bridge, on dry ground that touches the water', () => {
  assert.ok(SITES.some(x => x.kind === 'dock')); assert.ok(SITES.every(x => BUILDINGS[x.kind].site && BUILDINGS[x.kind].max === 1));
  for (const st of SITES) assert.deepEqual(st.size, BUILDINGS[st.kind].size, 'the site knows the footprint of its building');
  const cells = grid.cellsOf('dock', site.x, site.z, site.rot);
  for (const [x, z] of cells) { assert.ok(!isBrook(x, z) && !isRoad(x, z), `${x},${z} is water or road`); assert.equal(siteAt(x, z)?.kind, 'dock'); }
  // the brook's cells step with its curve: the deck's north edge is on the water or one cell of bank away from it
  assert.ok(isBrook(site.x, site.z - 1) || isBrook(site.x + 1, site.z - 1), 'the north edge touches the water');
  for (let x = site.x; x < site.x + 2; x++) assert.ok(isBrook(x, site.z - 1) || isBrook(x, site.z - 2), `column ${x} is too far from the water`);
  const s = farm();
  for (const [x, z] of cells) assert.equal(grid.landOf(s, x, z), null, 'nobody\'s land: nothing of the player\'s can ever stand in the way');
  assert.equal(siteAt(site.x - 1, site.z), null);
});
test('buildSite builds it there, once, for its price; a refusal leaves no trace; it is never placed, moved, stored or taken down by hand', () => {
  const s = farm(); s.level = BUILDINGS.dock.level - 1; s.coins = 5000;
  assert.equal(sitePlan(s, 'dock').reason, 'Reach level {level} first');
  for (const [lvl, coins, reason] of [[BUILDINGS.dock.level - 1, 5000, 'Reach level {level} first'], [BUILDINGS.dock.level, 10, 'Not enough coins']]) {
    s.level = lvl; s.coins = coins; const before = JSON.stringify(s), r = act(s, 'buildSite', { kind: 'dock' }, T0);
    assert.equal(r.ok, false); assert.equal(r.reason, reason); assert.equal(JSON.stringify(s), before);
  }
  for (const kind of ['bench', 'police', 'nope', undefined, 7]) { const before = JSON.stringify(s); assert.equal(act(s, 'buildSite', { kind }, T0).ok, false, String(kind)); assert.equal(JSON.stringify(s), before); }
  s.coins = 5000; assert.equal(mayBuild(s, 'dock').ok, true);
  const r = must(s, 'buildSite', { kind: 'dock' }), id = r.id;
  assert.equal(r.price, BUILDINGS.dock.cost); assert.equal(s.coins, 5000 - BUILDINGS.dock.cost);
  assert.deepEqual(s.placed[id], { kind: 'dock', x: site.x, z: site.z, rot: site.rot }); assert.equal(s.counts.dock, 1); assert.ok(siteBuilt(s, 'dock'));
  assert.ok(r.events.some(e => e.type === 'placed' && e.kind === 'dock')); assert.ok(stepDone(s, 'dock'));
  assert.equal(act(s, 'buildSite', { kind: 'dock' }, T0).reason, 'It is already built'); assert.equal(mayBuild(s, 'dock').ok, false);
  assert.equal(act(s, 'place', { kind: 'dock', x: 40, z: 60, rot: 0 }, T0).ok, false);
  assert.equal(act(s, 'move', { id, x: 40, z: 60, rot: 0 }, T0).reason, 'It belongs on its own site');
  assert.equal(act(s, 'store', { id }, T0).ok, false); assert.equal(act(s, 'demolish', { id }, T0).ok, false);
  const back = unpack(pack(s)); assert.deepEqual(back.placed[id], s.placed[id]);
});
test('the bank by the dock is public ground, and you can walk onto the deck from the brook road', () => {
  const s = farm();
  for (let z = DOCK_BANK.z0; z <= DOCK_BANK.z1; z++) for (let x = DOCK_BANK.x0; x <= DOCK_BANK.x1; x++) assert.ok(stepCost(s, x, z) > 0, `${x},${z} cannot be stood on`);
  assert.equal(stepCost(s, site.x, site.z - 1), 0, 'the brook itself is not');
  s.coins = 5000; s.level = 12; must(s, 'buildSite', { kind: 'dock' });
  for (const [x, z] of grid.cellsOf('dock', site.x, site.z, site.rot)) assert.equal(stepCost(s, x, z), 1, 'the deck is as easy as a path');
  const route = findRoute(s, [29, 40], [site.x, site.z], { exact: true }); assert.ok(route.length > 0, 'no way from the brook road onto the dock');
  assert.deepEqual(route.at(-1), [site.x, site.z]);
});
test('you fish in the brook from the dock: its water is on the list, the rare fish bite twice as often, and the line remembers the river', () => {
  const s = farm(); assert.equal(pondsOf(s).length, 1 + Object.values(s.placed).filter(p => p.kind === 'pond').length, 'no brook water before the dock');
  s.coins = 5000; s.level = 12; const id = must(s, 'buildSite', { kind: 'dock' }).id, dock = s.placed[id];
  assert.ok(fishable(dock) && fishable({ kind: 'pond' }) && !fishable({ kind: 'bench' }) && !fishable(undefined));
  const water = pondsOf(s).find(p => p.id === id); assert.ok(water?.river); assert.deepEqual({ ...waterOf(dock), id }, water);
  // the water lies on the brook, north of the deck, and the deck is within casting reach of it
  assert.ok(isBrook(Math.floor(water.x / CELL), Math.floor(water.z / CELL))); assert.ok(water.z < site.z * CELL);
  const seats = seatsOf(dock); assert.deepEqual(seats.spots, [[site.x, site.z], [site.x + 1, site.z]]);
  for (const [cx, cz] of seats.spots) { const d = waterDistance(water, (cx + 0.5) * CELL, (cz + 0.5) * CELL); assert.ok(d > 0 && d <= BANK.reach, `the deck is ${d.toFixed(2)} m from the water`); }
  assert.equal(seatsOf({ kind: 'pond', x: 40, z: 60 }).spots.length, 4);
  // the odds: over many seeds, rare fish come about RIVER.rare times as often in weight
  const rare = new Set(FISH_TABLE.filter(f => f.rare).map(f => f.id)); let pond = 0, river = 0, both = 0; const n = 6000;
  for (let i = 0; i < n; i++) { if (rare.has(pick(`s${i}`, false))) pond++; if (rare.has(pick(`s${i}`, false, true))) river++; if (rare.has(pick(`s${i}`, true, true))) both++; }
  const w = FISH_TABLE.reduce((a, f) => a + (f.rare ? 0 : f.weight), 0), r = FISH_TABLE.reduce((a, f) => a + (f.rare ? f.weight : 0), 0);
  const near = (got, k) => Math.abs(got / n - r * k / (w + r * k)) < 0.03;
  assert.ok(near(pond, 1) && near(river, RIVER.rare) && near(both, RIVER.rare * 2), `rare share: pond ${pond}, river ${river}, river with bait ${both} of ${n}`);
  assert.equal(pick('same', false, false), pick('same', false), 'a pond line is unchanged');
  // casting and landing
  assert.equal(act(s, 'castLine', { pond: 'nope' }, T0).ok, false);
  must(s, 'castLine', { pond: id, foot: true }); assert.equal(s.fishing.line.pond, id); assert.equal(s.fishing.line.river, true);
  const back = unpack(pack(s)); assert.equal(back.fishing.line.river, true);
  const at = s.fishing.line.doneAt + 1, want = pick(s.fishing.line.seed, false, true), got = must(s, 'reelIn', { steady: true }, at);
  assert.equal(got.fish, want); assert.equal(s.stats.riverFish, 1);
  const pondId = Object.keys(s.placed).find(k => s.placed[k].kind === 'pond');
  must(s, 'castLine', { pond: pondId ?? null }, at); assert.equal(s.fishing.line.river, undefined, 'a pond line is not a river line');
});
test('a bed within three cells of a pond you built is watered: it grows a fifth faster, and says so', () => {
  const s = farm(); s.coins = 9000; s.level = 12; s.story.firstWheat = false;
  for (const id of Object.keys(s.beds)) delete s.beds[id];
  const pondAt = grid.findSpot(s, 'pond', 40, 62); assert.ok(pondAt, 'room for a pond'); must(s, 'place', { kind: 'pond', ...pondAt });
  const beds = Object.keys(s.placed).filter(id => s.placed[id].kind === 'bed'), [w, d] = BUILDINGS.pond.size;
  const dist = b => Math.max(Math.max(pondAt.x - b.x, 0, b.x - (pondAt.x + w - 1)), Math.max(pondAt.z - b.z, 0, b.z - (pondAt.z + d - 1)));
  // put a bed just inside the reach and one just outside, wherever the pond landed
  const spot = r => { for (let dz = -r; dz <= d - 1 + r; dz++) for (let dx = -r; dx <= w - 1 + r; dx++) { const b = { x: pondAt.x + dx, z: pondAt.z + dz }; if (dist(b) === r && grid.canPlace(s, 'bed', b.x, b.z, 0).ok) return b; } return null; };
  const near = spot(WATERED.reach), far = spot(WATERED.reach + 1); assert.ok(near && far, 'room for the two beds');
  const nearId = must(s, 'place', { kind: 'bed', ...near }).id, farId = must(s, 'place', { kind: 'bed', ...far }).id;
  assert.equal(grid.wateredBed(s, near.x, near.z), true); assert.equal(grid.wateredBed(s, far.x, far.z), false);
  must(s, 'plant', { ids: [nearId, farId], crop: 'wheat' });
  assert.equal(s.beds[nearId].doneAt, T0 + Math.round(CROPS.wheat.growMs * WATERED.grow)); assert.equal(s.beds[nearId].watered, true);
  assert.equal(s.beds[farId].doneAt, T0 + CROPS.wheat.growMs); assert.equal(s.beds[farId].watered, undefined);
  assert.equal(s.stats.watered, 1); assert.ok(BEATS.find(b => b.id === 'pond-water').when(s));
  assert.equal(must(s, 'harvest', { ids: [nearId] }, T0 + Math.round(CROPS.wheat.growMs * WATERED.grow)).harvested, 1);
  assert.ok(beds.length >= 0);
  // the very first wheat of a new farm keeps its own quick time
  const fresh = newGame(T0, 3, { restore: true }); tick(fresh, T0); assert.equal(fresh.story.firstWheat, true);
});
test('the constable comes with the police post and writes three letters, each after the one before is read', () => {
  const pearl = VILLAGERS.find(v => v.id === 'pearl'), s = farm(); assert.ok(pearl?.noOrders && pearl.noGifts);
  assert.equal(hasArrived(s, pearl), false); assert.ok(!s.mail.some(m => m.id.startsWith('pearl-')));
  must(s, 'testJumpChapter', { chapter: 8 }); assert.equal(hasArrived(s, pearl), true);
  tick(s, T0 + MIN); assert.deepEqual(s.mail.filter(m => m.id.startsWith('pearl-')).map(m => m.id), ['pearl-1']);
  for (const [id, next] of [['pearl-1', 'pearl-2'], ['pearl-2', 'pearl-3']]) { must(s, 'readLetter', { id }, T0 + MIN); tick(s, T0 + 2 * MIN); assert.ok(s.mail.some(m => m.id === next), `${next} after ${id}`); }
  const letters = LETTERS.filter(l => l.from === 'pearl'); assert.equal(letters.length, 3);
  assert.ok(letters.every(l => !/\d{4}|years ago/.test(l.text)), 'the water story carries no dates');
  assert.deepEqual(['en', 'vi', 'ko', 'ja'].map(l => personName('pearl', l, 'display')), ['Constable Sage', 'Cô Tre', '반듯 순경', 'きりり巡査']);
});
test('chapter 7 closes when the police post works and the dock stands; the steps, scenes and roadmap follow', () => {
  const ch = CHAPTERS.find(c => c.id === 7), s = farm(); assert.ok(ch && ch.panels.length === 3 && ch.ada);
  assert.equal(ch.when(s), false); s.coins = 99999; s.level = 12;
  // the roadmap's earlier stages, as a farm that came this far has them
  s.house = { level: 5 }; s.hands = { field: { since: T0 } }; s.stats.cheeseMade = 1; s.album.fruit.cherry = 9;
  for (const kind of ['goat_barn', 'dairy', 'fruit_stand', 'kennel']) { s.placed[`x_${kind}`] = { kind, x: 2, z: 2, rot: 0 }; s.counts[kind] = 1; }
  assert.equal(journeyOf(s).stage.id, 'streets'); assert.equal(journeyOf(s).done, 0);
  must(s, 'buildSite', { kind: 'dock' }); assert.equal(ch.when(s), false, 'the dock alone is half of it'); assert.equal(journeyOf(s).done, 1);
  assert.ok(BEATS.find(b => b.id === 'olaf-dock').when(s)); assert.ok(!BEATS.find(b => b.id === 'pearl-arrives').when(s));
  must(s, 'rebuildCivic', { kind: 'police' }); assert.equal(ch.when(s), true);
  assert.ok(BEATS.find(b => b.id === 'pearl-arrives').when(s)); assert.ok(stepDone(s, 'dock') && stepDone(s, 'police'));
  must(s, 'chapterSeen', { id: 7 }); assert.equal(s.story.chapter, 7);
  for (const id of ['pearl-arrives', 'olaf-dock', 'pond-water']) assert.equal(BEATS.find(b => b.id === id).chapter, 7);
  // a broken police post does not count
  const id = Object.keys(s.placed).find(k => s.placed[k].kind === 'police'); s.cond[id] = { level: 3, ms: 0 }; assert.equal(ch.when(s), false);
});
