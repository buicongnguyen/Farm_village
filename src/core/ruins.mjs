// The old buildings on the civic row (v0.3e): before they are rebuilt, each can be tidied up once (weeds pulled, windows
// boarded, a sign put up): a few coins for some XP and a little village charm. Rebuilding them is a project (projects.mjs).
import { RUINS, TIDY } from '../content/world.mjs';
import { gainXp } from './levels.mjs';

export const tidied = (s, kind) => !!s.village?.tidied?.[kind];
export const actions = {
  tidyRuin(ctx, { kind }) {
    const { s, now } = ctx; if (!RUINS.some(r => r.kind === kind)) return ctx.fail('Unknown place');
    if ((s.counts[kind] ?? 0) > 0) return ctx.fail('It is already rebuilt');
    if (tidied(s, kind)) return ctx.fail('Already tidied');
    if (s.coins < TIDY.coins) return ctx.fail('Not enough coins');
    s.coins -= TIDY.coins; (s.village.tidied ??= {})[kind] = now; gainXp(ctx, TIDY.xp);
    ctx.emit('ruinTidied', { kind });
    return { ok: true };
  },
};
