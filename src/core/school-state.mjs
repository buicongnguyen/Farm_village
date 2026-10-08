// Save-only helpers: no imports from state or rules, and no generated rewards on load.
import { SCHOOL_ACTIVITY } from '../content/school-activity.mjs';

const LIMIT = 1_000_000_000;
const record = v => v && typeof v === 'object' && !Array.isArray(v) ? v : {};
const integer = (v, max = LIMIT) => Number.isSafeInteger(v) && v >= 0 && v <= max;
const stamp = v => Number.isSafeInteger(v) && v >= 0;
export const schoolDifficulty = v => v === 'simple' || v === 'challenge';
export const schoolNextRound = round => round >= LIMIT ? 1 : round + 1;
export const newSchool = () => ({ rounds: 0, completed: 0, best: 0, lastScore: null, active: null, memoryAt: null, memoryRead: false });

/** All questions come from the saved round ID. Changing language or reloading never rerolls them. */
export function schoolQuestions(round, difficulty) {
  const pick = (offset, n) => {
    let value = (round ^ Math.imul(offset + 1, 0x9e3779b1)) >>> 0;
    value = Math.imul(value ^ (value >>> 16), 0x85ebca6b);
    value = Math.imul(value ^ (value >>> 13), 0xc2b2ae35);
    return ((value ^ (value >>> 16)) >>> 0) % n;
  };
  const good = SCHOOL_ACTIVITY.goods[pick(0, SCHOOL_ACTIVITY.goods.length)];
  const other = SCHOOL_ACTIVITY.goods[(SCHOOL_ACTIVITY.goods.indexOf(good) + 1 + pick(1, 4)) % SCHOOL_ACTIVITY.goods.length];
  const repeat = (id, n) => Array(n).fill(id);
  const a = 2 + pick(2, 4), b = 1 + pick(3, 4), c = 2 + pick(4, 3);
  const definitions = difficulty === 'simple' ? [
    { type: 'count', rows: [repeat(good, a)], answer: a },
    { type: 'match', rows: [[...repeat(good, b), ...repeat(other, c)]], answer: b },
    { type: 'add', rows: [repeat(good, b), repeat(good, c)], answer: b + c },
  ] : [
    { type: 'match', rows: [[...repeat(good, b), ...repeat(other, c)], repeat(good, c)], answer: b + c },
    { type: 'fill', rows: [repeat(good, a)], answer: b + c, params: { total: a + b + c } },
    { type: 'groups', rows: Array.from({ length: c }, () => repeat(good, b + 1)), answer: c * (b + 1), params: { each: b + 1, groups: c } },
  ];
  return definitions.map((q, index) => {
    const choices = [q.answer, q.answer + 1 + pick(index + 6, 2), Math.max(0, q.answer - 1 - pick(index + 9, 2))];
    const rotate = pick(index + 12, 3);
    return { ...q, good, params: q.params ?? {}, id: `basket:${round}:${difficulty}:${index}`,
      choices: [...choices.slice(rotate), ...choices.slice(0, rotate)] };
  });
}

export const schoolSignature = (round, difficulty) => schoolQuestions(round, difficulty)
  .map(q => `${q.type}/${q.answer}/${q.rows.map(row => row.join(',')).join(';')}/${q.choices.join(',')}`).join('|');

/** Malformed/inconsistent in-progress rounds are discarded, never promoted to completed rounds. */
export function normalizeSchool(s) {
  const raw = record(s.schoolActivity), firsts = record(s.firsts);
  const memoryAt = stamp(raw.memoryAt) ? raw.memoryAt : stamp(firsts['school:memory']) ? firsts['school:memory'] : null;
  const rounds = integer(raw.rounds) ? raw.rounds : 0;
  const completed = Math.max(memoryAt !== null ? 1 : 0, integer(raw.completed) ? raw.completed : 0);
  const current = record(raw.active), difficulty = current.difficulty;
  const valid = schoolDifficulty(difficulty) && current.round === rounds && rounds > 0 && integer(current.step, 2)
    && Array.isArray(current.answers) && current.answers.length === current.step
    && current.answers.every((answer, i) => answer === schoolQuestions(rounds, difficulty)[i].answer)
    && Array.isArray(current.missed) && current.missed.length === 3 && current.missed.every(v => typeof v === 'boolean')
    && current.missed.every((v, i) => i <= current.step || v === false)
    && current.signature === schoolSignature(rounds, difficulty);
  return { rounds, completed, best: integer(raw.best, 3) ? raw.best : 0,
    lastScore: integer(raw.lastScore, 3) && completed > 0 ? raw.lastScore : null,
    active: valid ? { round: rounds, difficulty, step: current.step, answers: [...current.answers], missed: [...current.missed], signature: current.signature } : null,
    memoryAt, memoryRead: memoryAt !== null && (raw.memoryRead === true || stamp(firsts['school:memoryRead'])) };
}

export const schoolCompletedCount = count => Math.min(LIMIT, count + 1);
