// The game state: its shape, a new game, and save migrations (TECH-PLAN 4). Plain JSON, so saving is JSON.stringify.
import { START, START_RESTORE } from '../content/economy.mjs';
import { N, START_PARCEL, parcelOrigin, PARCEL } from '../content/world.mjs';
import { rng } from './rng.mjs';
import { applyRestore } from './restore.mjs';
import { normalizeFruitStand } from './orchard.mjs';
import { BUILDINGS } from '../content/buildings.mjs';
import { newDiscoveries, normalizeDiscoveries } from './discoveries.mjs';
import { newAdvice, normalizeAdvice } from './advice-state.mjs';

export const SAVE_VERSION = 7;
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
    fruitStand: { items: [], coins: 0, nextSaleAt: 0 },
    quests: { list: [], done: 0 },           // three live goals (quests.mjs)
    weekly: null,                            // the weekly village goal { week, i, base, claimed }
    hurry: { day: '', left: 0, extra: 0 },   // the daily hurry token
    album: { fish: {}, fruit: {} },          // collections: what has been caught and picked
    discoveries: newDiscoveries(),          // capped effort counters; earned, retired and acknowledged one-time finds
    advice: newAdvice(),                    // stable read/deferred contexts and bounded celebration records, never rendered text
    fishing: { line: null, coins: 0, caught: 0, feeAt: 0 },   // the fish pond (fishing.mjs)
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
    stats: { cleared: 0, paths: 0, harvested: 0, produced: 0, ordersFilled: 0, orderCoins: 0, coinsEarned: 0, picked: 0, fruitSold: 0, gifts: 0, carts: 0 },
    counts: {},                             // kind → how many are placed (kept in step by place/store)
    stored: {},                             // kind → how many are in the storage shed (placing them again is free)
    undo: [],                               // the last build actions, for undo (DESIGN 4.4)
    news: [],                               // the latest notable events for the Today board
    mode: null,                             // 'restore' for the restored village (wear applies), null for an empty start
    cond: {},                               // condition by id: { level 0–3, ms } (condition.mjs)
    repairing: {},                          // broken things being repaired: id → { doneAt }
    house: null,                            // the farmhouse: { level } in a restored village
    rebuild: {},                            // kind → rebuild credits (a demolished thing costs half to build again)
    settings: { daylight: 'real', textSize: 1, reducedMotion: false, quality: 'auto', sound: 0.8, music: 0.6, playerName: '', playerColor: '#e63946', playerBody: 'man' },
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
  // v3 → v4 (goals, fishing, the market): an older farm gets the pond and the market square where there is room
  const old = save.version < 4; if (save.version < 4) save.version = 4;
  // v4 → v5: card 5 used to be a teaser; let the real clinic ending play once for those saves.
  if (save.version < 5) {
    if (save.story?.chapter === 5 && !(save.counts?.clinic > 0)) save.story.chapter = 4;
    save.version = 5;
  }
  // v5 → v6: discoveries keep prior milestones retired; normalization never pays or invents earned album entries.
  if (save.version < 6) save.version = 6;
  // v6 → v7: acknowledge advice across sessions; normalization retires already-passed legacy celebrations.
  if (save.version < 7) save.version = 7;
  const s = withDefaults(save);
  if (old && Object.keys(s.placed ?? {}).length) s.needsPlaces = true;   // core/act.mjs finds the room on the next tick
  return s;
}
/** Fill every field a newer game expects with its default, keeping what the save has. */
export function withDefaults(s) {
  const fresh = newGame(s.createdAt ?? 0, s.seed ?? 1);
  for (const k of ['trees', 'mail', 'wishes', 'cart', 'village', 'known', 'firsts', 'stored', 'undo', 'news', 'counts', 'neighbours', 'people', 'homes', 'cond', 'repairing', 'rebuild', 'truck', 'fishing', 'quests', 'weekly', 'hurry', 'album', 'fruitStand']) if (s[k] === undefined) s[k] = fresh[k];
  s.fruitStand = normalizeFruitStand(s.fruitStand);
  // The first orchard build accidentally let pet homes acquire ordinary building wear.
  for (const [id, p] of Object.entries(s.placed ?? {})) if (BUILDINGS[p.kind]?.pet && [1, 2].includes(s.cond?.[id]?.level) && !s.repairing?.[id]) delete s.cond[id];
  s.today = { ...fresh.today, ...s.today }; s.today.days ??= 0;
  s.stats = { ...fresh.stats, ...s.stats };
  s.stats.built ??= { ...(s.counts ?? {}) };   // build XP high-water marks (core/build.mjs): what a save already built has paid
  s.settings = { ...fresh.settings, ...s.settings };
  if (s.mode === 'restore' && s.barn && s.barn.cap < START_RESTORE.barnCap) s.barn.cap = START_RESTORE.barnCap;   // v0.3e: the restored village's barn starts bigger
  s.village.milestones ??= []; s.village.decor ??= [];
  for (const b of Object.values(s.people)) b.scenes ??= [];
  s.discoveries = normalizeDiscoveries(s);
  s.advice = normalizeAdvice(s);
  return s;
}
