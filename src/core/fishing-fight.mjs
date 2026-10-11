// The fishing feel after Zoo Garden (repo cute_game, src/fishing.ts): a fish swims up and nibbles, then bites; a short
// window to strike; then a hold-to-reel fight against line tension and the fish's surges. Pure and seeded: the view
// (view/fishing-play.mjs) runs it, and the catch itself still comes from core/fishing.mjs (the line's seeded fish).
// Farm Village stays gentle: striking early, missing the bite or losing the fight never costs the fish or the bait;
// the fish swims off and comes back. Numbers follow cute_game with a middle rod (quality 0.5).
import { rng, hash } from './rng.mjs';

export const FIGHT = Object.freeze({
  approachS: 1.6,                 // the fish swims in before the first nibble
  nibbles: [1, 3],                // fake bites before the real one
  firstNibbleS: [0.4, 1.2], nibbleGapS: [0.5, 1.6],
  biteWindowS: 1.7,               // cute_game: 1.4 + 0.6 x quality
  earlyPenaltyS: 1.5,             // striking early spooks it for a moment
  backS: 2.2,                     // after a miss or a lost fight, how soon it comes back
  quality: 0.5,
  strainHold: 0.65,               // the line holds a strain this often (cute_game: 0.4 bamboo .. 0.9 steady)
  slackS: 7,                      // this long without reeling and the fish slips off
});
// How hard each fish fights (cute_game's per-species power).
export const POWER = { perch: 0.25, carp: 0.45, catfish: 0.7, goldfish: 0.85 };

/** One bite cycle, in seconds from its start: when the nibbles come and when the real bite does. */
export function bitePlan(seed, cycle = 0) {
  const r = rng(hash(`${seed}:bite:${cycle}`)), between = (a, b) => a + (b - a) * r();
  const n = FIGHT.nibbles[0] + Math.floor(r() * (FIGHT.nibbles[1] - FIGHT.nibbles[0] + 1)), nibbles = [];
  let t = FIGHT.approachS + between(...FIGHT.firstNibbleS);
  for (let i = 0; i < n; i++) { nibbles.push(t); t += between(...FIGHT.nibbleGapS); }
  return { nibbles, bite: t, window: FIGHT.biteWindowS, length: t + FIGHT.biteWindowS };
}

/** The hold-to-reel fight. update(dt, held) once a frame; it reports tension, progress and how it ends. */
export class FishFight {
  constructor(seed, fish, attempt = 0) {
    this.r = rng(hash(`${seed}:fight:${attempt}`));
    this.p = POWER[fish] ?? 0.4;
    Object.assign(this, { tension: 0.25, progress: 0.05, surge: false, surgeLeft: 0, calm: this.gap(), slack: 0, strained: false, result: null, held: 0 });
  }
  between(a, b) { return a + (b - a) * this.r(); }
  gap() { return this.between(0.8, 2.2) * (1.2 - 0.5 * this.p); }
  /** Returns the events of this step: 'surge', 'strain' (tension near the limit), 'held' (a strain survived), 'won', 'lost'. */
  update(dt, held) {
    if (this.result) return [];
    const ev = [], { p } = this, q = FIGHT.quality;
    if (this.surge) { if ((this.surgeLeft -= dt) <= 0) { this.surge = false; this.calm = this.gap(); } }
    else if ((this.calm -= dt) <= 0) { this.surge = true; this.surgeLeft = this.between(0.4, 0.8 + p); ev.push('surge'); }
    if (held) {
      this.slack = 0;
      this.progress += 0.3 * (1.15 - 0.45 * p) * (this.surge ? 0.4 : 1) * dt;
      this.tension += (1.2 - 0.45 * q) * (0.08 + (this.surge ? 0.6 * p + 0.12 : 0.02)) * dt;
    } else {
      this.tension = Math.max(0, this.tension - 0.9 * dt);
      this.progress = Math.max(0, this.progress - 0.05 * p * (this.surge ? 2.5 : 1) * dt);
      this.slack += dt;
    }
    const strained = this.tension >= 0.8;
    if (strained && !this.strained) ev.push('strain');
    this.strained = strained;
    if (this.tension >= 1) {
      if (this.r() < FIGHT.strainHold) { this.tension = 0.7; this.progress = Math.max(0, this.progress - 0.08); ev.push('held'); }
      else { this.result = 'snapped'; ev.push('lost'); return ev; }
    }
    if (this.slack >= FIGHT.slackS) { this.result = 'slipped'; ev.push('lost'); return ev; }
    if (this.progress >= 1) { this.progress = 1; this.result = 'won'; ev.push('won'); }
    return ev;
  }
}
