// The game state: its shape, a new game, and save migrations (TECH-PLAN 4). Plain JSON, so saving is JSON.stringify.
import { START } from '../content/economy.mjs';
import { N, START_PARCEL, parcelOrigin, PARCEL } from '../content/world.mjs';
import { rng } from './rng.mjs';
import { applyRestore } from './restore.mjs';

export const SAVE_VERSION = 3;
export const CELL_TYPES = { grass: 0, weeds: 1, rock: 2, path: 3, tilled: 4 };

/** A new game. `restore: true` opens on the run-down village that is already there (PLAN-v0.3); without it the land is empty (tests, the rules simulation). */
export function newGame(now = Date.now(), seed = (now % 2147483647) | 1, { restore = false } = {}) {
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
    people: {},                             // person id → { hearts (0–10), scenes: [3, 6, 9 seen], giftDay }
    neighbours: {},                         // id → { friendship, day, visits: [ms], visited: 0, trade: {...} | null }
    stall: { items: [], nextSaleAt: 0 },
    truck: { level: 1, away: false, backAt: 0, load: [], coins: 0 },   // the delivery truck (market.mjs)
    today: { day: '', giftDay: 0, seen: true, away: null, days: 0 },   // days: game days visited (the streak garden)
    trees: {},                              // fruit tree id → { doneAt, first? }
    mail: [],                               // letters, newest first: [{ id, from, at, read }]
    wishes: { day: '', list: [] },          // today's wishes: [{ home, person, kind, text, done }]
    cart: null,                             // the weekly cart (cart.mjs), null until the school opens
    village: { milestones: [], decor: [] }, // village charm milestones reached and the dressing they put up
    known: {},                              // recipes learnt early from heart scenes: id → true
    story: { chapter: 0, tutorial: 0, firstWheat: true },
    firsts: {},                             // album: when each first happened
    stats: { cleared: 0, paths: 0, harvested: 0, produced: 0, ordersFilled: 0, orderCoins: 0, coinsEarned: 0, picked: 0, gifts: 0, carts: 0 },
    counts: {},                             // kind → how many are placed (kept in step by place/store)
    stored: {},                             // kind → how many are in the storage shed (placing them again is free)
    undo: [],                               // the last build actions, for undo (DESIGN 4.4)
    news: [],                               // the latest notable events for the Today board
    mode: null,                             // 'restore' for the restored village (wear applies), null for an empty start
    cond: {},                               // condition by id: { level 0–3, ms } (condition.mjs)
    repairing: {},                          // broken things being repaired: id → { doneAt }
    house: null,                            // the farmhouse: { level } in a restored village
    rebuild: {},                            // kind → rebuild credits (a demolished thing costs half to build again)
    settings: { daylight: 'real', textSize: 1, reducedMotion: false, quality: 'auto', sound: 0.8, music: 0.6 },
  };
  overgrow(s, START_PARCEL);
  return restore ? applyRestore(s, now) : s;
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
  // v1 → v2 (the AAA pass): fruit trees, letters, wishes, the weekly cart, village charm, the streak garden and heart scenes.
  // Hearts already earned stay; a heart scene whose threshold was passed before this version plays on the next heart gained.
  if ((save.version ?? 1) < 2) save.version = 2;
  // v2 → v3 (restore the village): condition, repairs, the farmhouse and rebuild credits start empty; a farm built before keeps what it built
  if (save.version < 3) save.version = 3;
  return withDefaults(save);
}
/** Fill every field a newer game expects with its default, keeping what the save has. */
export function withDefaults(s) {
  const fresh = newGame(s.createdAt ?? 0, s.seed ?? 1);
  for (const k of ['trees', 'mail', 'wishes', 'cart', 'village', 'known', 'firsts', 'stored', 'undo', 'news', 'counts', 'neighbours', 'people', 'homes', 'cond', 'repairing', 'rebuild', 'truck']) if (s[k] === undefined) s[k] = fresh[k];
  s.today = { ...fresh.today, ...s.today }; s.today.days ??= 0;
  s.stats = { ...fresh.stats, ...s.stats };
  s.stats.built ??= { ...(s.counts ?? {}) };   // build XP high-water marks (core/build.mjs): what a save already built has paid
  s.settings = { ...fresh.settings, ...s.settings };
  s.village.milestones ??= []; s.village.decor ??= [];
  for (const b of Object.values(s.people)) b.scenes ??= [];
  return s;
}
