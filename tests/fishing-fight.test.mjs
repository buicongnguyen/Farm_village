// The fishing feel after cute_game (core/fishing-fight.mjs): nibbles before the bite, then a fair hold-to-reel fight.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bitePlan, FishFight, FIGHT, POWER } from '../src/core/fishing-fight.mjs';

const DT = 1 / 30;
function play(fight, policy, limit = 60) {
  for (let t = 0; t < limit; t += DT) { fight.update(DT, policy(fight)); if (fight.result) return { result: fight.result, t }; }
  return { result: null, t: limit };
}
const careful = f => !f.surge && f.tension < 0.7;   // reel, but let go on a surge or a straining line

test('a bite comes after one to three nibbles, after the fish swims in, the same for the same line', () => {
  for (let i = 0; i < 50; i++) {
    const p = bitePlan(`seed${i}`, i % 3);
    assert.ok(p.nibbles.length >= FIGHT.nibbles[0] && p.nibbles.length <= FIGHT.nibbles[1]);
    assert.ok(p.nibbles[0] >= FIGHT.approachS);
    for (let k = 1; k < p.nibbles.length; k++) assert.ok(p.nibbles[k] > p.nibbles[k - 1] + 0.3, 'nibbles overlap');
    assert.ok(p.bite > p.nibbles.at(-1) && p.bite < 9, `bite at ${p.bite}`);
    assert.deepEqual(bitePlan(`seed${i}`, i % 3), p);
  }
  assert.notDeepEqual(bitePlan('x', 0), bitePlan('x', 1), 'a new cycle is a new rhythm');
});

test('careful reeling lands every fish in good time; the golden carp takes longest', () => {
  const times = {};
  for (const fish of Object.keys(POWER)) {
    times[fish] = 0;
    for (let i = 0; i < 20; i++) {
      const r = play(new FishFight(`s${i}`, fish), careful);
      assert.equal(r.result, 'won', `${fish} seed ${i}: ${r.result}`);
      times[fish] += r.t / 20;
    }
    assert.ok(times[fish] < 25, `${fish} averages ${times[fish].toFixed(1)} s`);
  }
  assert.ok(times.goldfish > times.perch, JSON.stringify(times));
});

test('holding through surges and strain can snap the line; never reeling lets the fish slip off', () => {
  let snapped = 0;
  for (let i = 0; i < 40; i++) if (play(new FishFight(`h${i}`, 'goldfish'), () => true).result === 'snapped') snapped++;
  assert.ok(snapped > 10, `only ${snapped}/40 snapped when holding through everything`);
  const idle = play(new FishFight('idle', 'perch'), () => false);
  assert.equal(idle.result, 'slipped'); assert.ok(Math.abs(idle.t - FIGHT.slackS) < 0.1);
});

test('a fight is deterministic for its line and attempt', () => {
  const a = play(new FishFight('same', 'carp', 2), careful), b = play(new FishFight('same', 'carp', 2), careful);
  assert.deepEqual(a, b);
});
