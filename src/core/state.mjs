// The game state: its shape, a new game, and save migrations (TECH-PLAN 4). Plain JSON, so saving is JSON.stringify.
import { START } from '../content/economy.mjs';
import { N, START_PARCEL, parcelOrigin, PARCEL } from '../content/world.mjs';
import { rng } from './rng.mjs';

export const SAVE_VERSION = 1;
export const CELL_TYPES = { grass: 0, weeds: 1, rock: 2, path: 3, tilled: 4 };

export function newGame(now = Date.now(), seed = (now % 2147483647) | 1) {
  const s = {
    version: SAVE_VERSION, createdAt: now, lastSeen: now, seed,
    coins: START.coins, xp: 0, level: 1,
    parcels: [START_PARCEL],
    cells: new Array(N * N).fill(0),       // CELL_TYPES per cell (saved compactly by save.mjs)
    placed: {},                             // id → { kind, x, z, rot }
    fences: {},                             // "x,z,n" | "x,z,w" → 'fence' | 'gate'
    nextId: 1,
    beds: {},                               // bed id → { crop, doneAt } (empty bed: no entry)
    animals: {},                            // home id → [{ kind, doneAt | null }]  (doneAt null = hungry, <= now = ready)
    production: {},                         // building id → { slots, queue: [{ recipe, doneAt }] }
    barn: { cap: START.barnCap, upgrades: 0, items: { ...START.stock } },
    orders: { cards: [], nextAt: now },
    projects: { step: 0, delivered: {} },
    homes: {},                              // cottage id → { level, family, arrivesAt, rentFrom }
    people: {},                             // person id → { hearts }
    neighbours: {},                         // id → { friendship, day, visits: [ms], visited: 0, trade: {...} | null }
    stall: { items: [], nextSaleAt: 0 },
    today: { day: '', giftDay: 0, seen: true, away: null },
    story: { chapter: 1, tutorial: 0, firstWheat: true },
    stats: { cleared: 0, paths: 0, harvested: 0, produced: 0, ordersFilled: 0, orderCoins: 0, coinsEarned: 0 },
    counts: {},                             // kind → how many are placed (kept in step by place/store)
    stored: {},                             // kind → how many are in the storage shed (placing them again is free)
    undo: [],                               // the last build actions, for undo (DESIGN 4.4)
    news: [],                               // the latest notable events for the Today board
    settings: { daylight: 'real', textSize: 1, reducedMotion: false, quality: 'auto', sound: 0.8, music: 0.6 },
  };
  overgrow(s, START_PARCEL);
  return s;
}
/** Scatter weeds and a few rocks over a parcel (new land arrives overgrown; clearing it is the first tutorial). */
export function overgrow(s, parcel) {
  const o = parcelOrigin(parcel), r = rng(s.seed ^ parcel.split(',').reduce((a, b) => a * 31 + +b, 7));
  for (let z = o.z; z < o.z + PARCEL; z++) for (let x = o.x; x < o.x + PARCEL; x++) {
    const roll = r();
    s.cells[z * N + x] = roll < 0.28 ? CELL_TYPES.weeds : roll < 0.33 ? CELL_TYPES.rock : CELL_TYPES.grass;
  }
  // The start parcel: a clear corner by the farmhouse, with the three tutorial weeds (DESIGN 15).
  if (parcel === START_PARCEL) {
    for (let z = o.z; z < o.z + 8; z++) for (let x = o.x; x < o.x + 8; x++) s.cells[z * N + x] = CELL_TYPES.grass;
    for (const [dx, dz] of TUTORIAL_WEEDS) s.cells[(o.z + dz) * N + o.x + dx] = CELL_TYPES.weeds;
  }
}
export const TUTORIAL_WEEDS = [[2, 3], [3, 4], [2, 5]];
/** Bring an older save up to SAVE_VERSION. Throws on saves from a newer game. */
export function migrate(save) {
  if (!save || typeof save !== 'object') throw new Error('not a save');
  if (save.version > SAVE_VERSION) throw new Error(`save version ${save.version} is newer than this game`);
  // (v1 is the first version: nothing to migrate yet.)
  return save;
}
