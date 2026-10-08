import { isWorking } from './working.mjs';
import { normalizeSchool, schoolDifficulty, schoolQuestions, schoolSignature, schoolNextRound, schoolCompletedCount } from './school-state.mjs';

const stamp = v => Number.isSafeInteger(v) && v >= 0;
const reason = s => (s.story?.chapter ?? 0) < 4 ? 'Meet Cora in the school-opening story first'
  : !Object.keys(s.placed ?? {}).some(id => s.placed[id]?.kind === 'school' && isWorking(s, id)) ? 'Restore the school before playing the basket game' : null;

export function schoolStatus(s, now) {
  const school = normalizeSchool(s), why = reason(s);
  return { ...school, available: !why, reason: why,
    question: school.active ? schoolQuestions(school.active.round, school.active.difficulty)[school.active.step] : null };
}
export const unreadSchool = s => { const school = normalizeSchool(s); return school.memoryAt !== null && !school.memoryRead ? 1 : 0; };

export const actions = {
  startSchoolActivity(ctx, { difficulty }) {
    const why = reason(ctx.s); if (why) return ctx.fail(why);
    if (!schoolDifficulty(difficulty)) return ctx.fail('Choose a basket game first');
    if (!stamp(ctx.now)) return ctx.fail('Cannot save the classroom game yet');
    const school = normalizeSchool(ctx.s), round = schoolNextRound(school.rounds);
    school.rounds = round;
    school.active = { round, difficulty, step: 0, answers: [], missed: [false, false, false], signature: schoolSignature(round, difficulty) };
    ctx.s.schoolActivity = school;
    ctx.emit('schoolGameStarted', { round, difficulty });
    return { round };
  },
  answerSchoolActivity(ctx, { question, choice }) {
    const why = reason(ctx.s); if (why) return ctx.fail(why);
    const school = normalizeSchool(ctx.s), active = school.active;
    if (!active) return ctx.fail('Start a basket game first');
    const current = schoolQuestions(active.round, active.difficulty)[active.step];
    if (question !== current.id) return ctx.fail('That basket has changed; try the one on screen');
    if (!Number.isInteger(choice) || !current.choices.includes(choice)) return ctx.fail('Choose one of the numbers on the board');
    if (!stamp(ctx.now)) return ctx.fail('Cannot save the classroom game yet');
    if (choice !== current.answer) {
      active.missed[active.step] = true; ctx.s.schoolActivity = school;
      ctx.emit('schoolAnswer', { correct: false });
      return { correct: false, complete: false };
    }
    active.answers.push(choice); active.step++;
    const complete = active.step === 3;
    if (complete) {
      const score = active.missed.filter(missed => !missed).length, first = school.memoryAt === null;
      school.active = null; school.completed = schoolCompletedCount(school.completed);
      school.lastScore = score; school.best = Math.max(score, school.best);
      if (first) {
        school.memoryAt = ctx.now;
        ctx.s.firsts = { ...(ctx.s.firsts ?? {}), 'school:memory': ctx.now };
      }
      ctx.s.schoolActivity = school;
      ctx.emit('schoolRoundCompleted', { first, score });
      return { correct: true, complete, first, score };
    }
    ctx.s.schoolActivity = school; ctx.emit('schoolAnswer', { correct: true });
    return { correct: true, complete };
  },
  readSchoolMemory(ctx) {
    const school = normalizeSchool(ctx.s);
    if (school.memoryAt === null) return ctx.fail('Finish a basket game to keep this memory');
    if (!stamp(ctx.now)) return ctx.fail('Cannot save the classroom game yet');
    if (!school.memoryRead) {
      school.memoryRead = true; ctx.s.schoolActivity = school;
      ctx.s.firsts = { ...(ctx.s.firsts ?? {}), 'school:memoryRead': ctx.now };
    }
    return { read: true };
  },
};
