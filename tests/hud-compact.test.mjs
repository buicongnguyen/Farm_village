import './tz.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/core/state.mjs';
import { hudStatus } from '../src/ui/hud-status.mjs';

test('compact HUD counts only visible goals and never creates a fleet while reading an old save', () => {
  const s = newGame(5000, 123);
  s.quests.list = [{ id: 'harvest', t: 'harvest', n: 2, base: 0 }, { id: 'early-favour', favour: true, person: 'lan', good: 'wheat', n: 1 }];
  s.stats.harvested = 2; s.truck = { level: 1, away: false, coins: 0 };
  const before = structuredClone(s), rows = hudStatus(s, 5000);
  const letters = (s.mail ?? []).filter(m => !m.read).length;
  assert.deepEqual(rows.filter(r => r.act !== 'mail'), [{ act: 'quests', icon: 'ui:xp', label: 'Goals', count: 1, ready: 1 }]);
  // unread letters and a ready project step are notice pills beside Goals (they replaced two round buttons)
  assert.deepEqual(rows.filter(r => r.act === 'mail'), letters ? [{ act: 'mail', icon: 'ui:mail', label: 'Letters', count: letters, hot: true }] : []);
  assert.deepEqual(hudStatus(s, 5000, { project: true, canWork: true }).find(r => r.act === 'projects'), { act: 'projects', icon: 'ui:projects', label: 'Project', text: 'ready', hot: true });
  assert.deepEqual(hudStatus(s, 5000, { project: true }).find(r => r.act === 'projects'), { act: 'projects', icon: 'ui:projects', label: 'Project', text: '', hot: false });
  assert.deepEqual(s, before);
});

test('one truck chip prioritizes collectable money and otherwise shows the nearest fleet arrival', () => {
  const s = newGame(5000, 123);
  s.truck = { coins: 20, away: false, fleet: [{ coins: 40 }, { away: true, backAt: 10000 }] };
  let row = hudStatus(s, 5000).find(r => r.act === 'market');
  assert.deepEqual(row, { act: 'market', icon: 'truck', label: 'Trucks', coins: 60, hot: true });
  s.truck.coins = 0; s.truck.fleet[0] = { coins: 0, away: true, backAt: 7000 };
  row = hudStatus(s, 5000).find(r => r.act === 'market');
  assert.equal(row.ms, 2000); assert.equal(row.count, 2);
  assert.equal(hudStatus(s, 12000).find(r => r.act === 'market').ms, 0);
});

test('the pond chip switches at the bite time and disappears after collection without granting anything', () => {
  const s = newGame(5000, 123); s.fishing = { line: { doneAt: 7000 } };
  const before = structuredClone(s);
  assert.deepEqual(hudStatus(s, 6000).find(r => r.act === 'pond'), { act: 'pond', icon: 'pond', label: 'Fishing', ms: 1000, hot: false });
  assert.equal(hudStatus(s, 7000).find(r => r.act === 'pond').hot, true);
  assert.deepEqual(s, before);
  s.fishing.line = null;
  assert.ok(!hudStatus(s, 8000).some(r => r.act === 'pond'));
});
