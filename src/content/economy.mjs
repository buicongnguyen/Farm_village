// Every tuning number (ECONOMY.md). Change a number here and in ECONOMY.md, then run `npm run sim`.
export const MIN = 60_000, HOUR = 3_600_000, DAY = 86_400_000;

// ── The pace switch (docs/plan/00-tester-tools.md B) ──
// Every waiting time in the game goes through paced(). 'testing' is what ships now, so the owner can play a chapter in
// minutes; the release pass (docs/plan/90-release-pass.md) sets mode to 'release' and tunes `time`.
// `FV_PACE=release npm run sim` tries the release pace without editing this file.
// Numbers that were eased for testing and want a second look then:
//   crop grow times (goods.mjs; PR #66), tray count and tray costs (SLOTS; #59, #61), truck sizes (TRUCK; #66, #70),
//   the barn limit (BARN.max; #57), parcel prices (PARCELS.cost; #70), bites on foot (FISH.footMs; #61),
//   farmhouse costs (HOUSE; #68), hand fees and wages (HANDS; #62).
const paceEnv = typeof process !== 'undefined' ? process.env?.FV_PACE : null;
export const PACE = { mode: paceEnv === 'release' ? 'release' : 'testing', time: { testing: 1, release: 3 } };
/** A waiting time at the current pace: a number of milliseconds, or a [from, to] pair. */
export const paced = ms => Array.isArray(ms) ? ms.map(paced) : Math.round(ms * PACE.time[PACE.mode]);

export const START = { coins: 50, barnCap: 50, stock: { wheat: 6 } };
// A new game starts in Hollowbrook as it is: things stand, many run down (content/start.mjs). The player gets some money
// and stock to speed up the first repairs (PLAN-v0.3 D9).
export const START_RESTORE = { coins: 500, barnCap: 200, stock: { wheat: 12, bread: 2 } };
// Repairs (D2, D6, D7): a broken building (only at the start) is out of order until repaired: coins and a short wait.
// Wear (D3) is very gentle: it grows only while the game is open, never stops anything and costs a few percent of rent and charm.
export const REPAIR = {
  broken: { share: 0.6, min: 25, ms: paced(30_000), xp: 10 },     // coins = max(min, share × the thing's price); the wait is `ms`
  worn: { share: 0.08, min: 5 },                           // wear level 1; level 2 costs half as much again
  road: 40, house: 400, helpMs: paced(45_000),
};
export const WEAR = { ms: [3 * HOUR, 9 * HOUR], rent: 0.05, charm: 1, tickCapMs: 2 * MIN };   // play time to "worn" and "shabby"; one tick never counts more than tickCapMs
// The farmhouse (D4): a one-floor home that can be upgraded. Each level adds barn room.
// Ten levels of comfort (v0.5). Each adds barn room; the house itself grows at 4 and 7 and the garden gains something
// at every level (content/world.mjs HOME_GARDEN).
export const HOUSE = { levels: 10, upgradeCost: [0, 300, 1100, 1800, 2600, 3600, 4800, 6200, 7800, 9600], level: [1, 4, 7, 8, 9, 10, 11, 12, 13, 14], barn: 100, price: 400 };
// Demolishing gives back this share of the price and leaves a rebuild credit (the same thing again costs half).
export const DEMOLISH = { refund: 0.4, rebuild: 0.5 };
export const LEVELS = {
  xpFor: L => L <= 2 ? (L - 1) * 8 : Math.round(7 * (L - 1) ** 2.6 * L),       // total XP needed to reach level L
  max: 60,
};
export const XP = { harvest: 1, collect: 2, produce: value => Math.ceil(value / 4), order: 0.3, build: 5 };
export const ORDERS = {
  size: level => 16 + 14 * level,                    // value of goods an order asks for
  pay: 1.3,                                          // coins = pay × value
  slots: level => Math.min(6, 3 + [3, 5, 7].filter(l => level >= l).length),
  refillMs: 1 * MIN, discardMs: 5 * MIN,
  feasibleWithinMs: 15 * MIN,
};
export const BEDS = {
  free: 6, max: 30,
  allowance: level => Math.min(30, 6 + 3 * level),
  cost: n => n <= 6 ? 0 : Math.round(5 + 0.5 * (n - 7)),   // the nth bed: a few coins, rising very slowly (v0.3c)
};
export const CLEAR = { weeds: 2, rock: 10 };
export const BARN = { start: 50, step: 100, max: 24000, upgradeCost: () => 100 };   // upgrades stop at max
export const SLOTS = { start: 2, max: 10, cost: [0, 0, 60, 90, 120, 150, 180, 210, 240, 270] };   // cost of the nth slot (index = slot count before buying)
export const RENT = {
  perHour: [12, 24, 40], upgradeCost: [0, 400, 1500], capHours: 8,   // v0.3c: passive income worth having now that everything is quick
  tipMs: [3 * MIN, 6 * MIN], tipCoins: [4, 12],   // a happy family leaves a tip every few minutes
  charmBonus: charm => Math.min(0.4, charm * 0.02), unmetNeed: 0.25,
};
// All sixteen parcels of the farm can be bought, one next to another (the limit of two was the first version's).
export const PARCELS = { cost: n => [0, 500, 2000, 4000, 7000, 11000][n - 1] ?? Math.round(11000 * 1.2 ** (n - 6) / 100) * 100, maxV01: 16, level: 4 };
export const NEIGHBOURS = { visitsPerDay: 2, helpBeds: 3, helpMs: 30 * MIN, tradesPerDay: 1 };
/** The delivery trucks (core/market.mjs): a trip takes tripMs, pays the goods' value x pay; capacity in goods per trip
 *  (upgradeCost and level per size, every truck the same size); fleet: how many trucks a farm can own, and what the
 *  2nd and 3rd cost and at which level. */
export const TRUCK = { tripMs: paced(50_000), pay: 1.2, capacity: [20, 40, 70, 110, 150, 200, 260, 330, 410, 500], upgradeCost: [0, 300, 700, 1100, 1600, 2200, 2900, 3700, 4600, 5600], level: [1, 3, 5, 6, 7, 8, 9, 10, 11, 12],   // ten truck sizes
  fleet: { max: 3, cost: [0, 400, 900], level: [1, 4, 6] } };
/** Market day (core/market-day.mjs): every everyMs the square holds one for lastsMs; the good of the day pays `bonus`
 *  times its price, from the barn and on a truck that leaves meanwhile. From `level`, with a working market square.
 *  minValue: the square asks for a good worth at least this when the farm makes one. */
export const MARKET_DAY = { everyMs: paced(10 * MIN), lastsMs: paced(4 * MIN), bonus: 2, level: 6, minValue: 6 };
/** The fish pond: a cast waits waitMs (baitMs with bait); fishing villagers leave feeCoins each feeMs, up to feeCap. */
export const FISH = { waitMs: paced(25_000), baitMs: paced(12_000), footMs: paced([4500, 9000]),   // footMs: a cast made on foot from the bank bites this soon (Zoo Garden's pace)
  feeMs: 6 * MIN, feeCoins: 5, feeCap: 80 };
/** Family helpers (core/helpers.mjs): from this level, every everyMs while the game is open. */
/** Hired hands (core/helpers.mjs): once the school stands. Every everyMs while the game is open each does HALF of the
 *  waiting work of its kind; the other half is yours. fee: coins to hire; wage: coins per task done. */
export const HANDS = { everyMs: paced(60_000), wage: 1, roles: { field: { fee: 300 }, animals: { fee: 300 }, workshop: { fee: 500 }, orchard: { fee: 400 }, driver: { fee: 600 }, fisher: { fee: 400 } } };
export const HELP = { level: 3, everyMs: paced(2 * MIN), beds: 4, products: 3 };
export const FRUIT_STAND = { slots: 3, stack: 10, everyMs: paced(30_000), bonus: 1.25 };
export const STALL = { slots: 4, sellEveryMs: [3 * MIN, 5 * MIN] };
export const DAILY_RESET_HOUR = 4;
export const FAMILY_ARRIVAL_MS = paced(2 * MIN);
// Hearts (DESIGN 9.2): 0–10 per person. Orders, gifts they like and granted wishes raise them; a heart scene plays at 3, 6
// and 9 with a reward (the story's own reward when it has one, else these). Hearts never go down.
export const BONDS = {
  max: 10, scenes: [3, 6, 9],
  order: 0.25, gift: 0.25, giftLiked: 1, wish: 2, wishXp: 5,
  rewards: { 3: { decor: 'flowerpot' }, 6: { decor: 'bench' }, 9: { decor: 'fountain' } },
};
// The weekly cart (DESIGN 8): 6 crates at the farm gate after the school opens. It waits until every crate is filled (no
// timer), pays more than orders and gives a decoration; the next cart comes the day after it leaves.
export const CART = {
  crates: 6, crateShare: 0.45,                       // each crate holds goods worth about crateShare × ORDERS.size(level)
  pay: 1.4, xp: 0.25,                                // coins = pay × value of all crates, XP = xp × value
  decor: ['hay_bale', 'scarecrow', 'flowerpot', 'picket', 'street_lamp', 'fountain'],
  helpMax: 2,                                        // crates neighbours may fill per cart (one a day, never the last)
};
// Village charm (DESIGN 12): the sum of every cottage's charm. Milestones put up cosmetic village dressing for good.
export const CHARM_MILESTONES = [{ at: 8, decor: 'bunting', name: 'Bunting' }, { at: 20, decor: 'banner', name: 'Village banner' }, { at: 40, decor: 'welcome_sign', name: 'Welcome sign' }];
