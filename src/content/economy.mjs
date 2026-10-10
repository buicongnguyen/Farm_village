// Every tuning number (ECONOMY.md). Change a number here and in ECONOMY.md, then run `npm run sim`.
export const MIN = 60_000, HOUR = 3_600_000, DAY = 86_400_000;

// ── The pace switch (docs/plan/00-tester-tools.md B) ──
// Every waiting time in the game goes through paced(). 'testing' is what ships now, so the owner can play a chapter in
// minutes; the release pass (docs/plan/90-release-pass.md) sets mode to 'release' and tunes `time`.
// `FV_PACE=release npm run sim` tries the release pace without editing this file.
// Numbers that were eased for testing and want a second look then:
//   crop grow times (goods.mjs; PR #66), tray count and tray costs (SLOTS; #59, #61), truck sizes (TRUCK; #66, #70),
//   the barn limit (BARN.max; #57), parcel prices (PARCELS.cost; #70), bites on foot (FISH.footMs; #61),
//   farmhouse costs (HOUSE; #68), hand fees and wages (HANDS; #62), the goodwill a deed adds (VALLEY.step; chapter 19).
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
export const NEIGHBOURS = { visitsPerDay: 2, helpBeds: 3, helpMs: 30 * MIN, tradesPerDay: 1, firstCallMs: 20_000 };   // firstCallMs: a newcomer's first call, soon after they arrive (the second newcomer a little later)
/** The riverside (core/riverside.mjs, Act IV). `quay`: what paving the old quay takes. `house`: a quay house (chapter 13)
 *  pays `rent` for every rentMs since it was last collected, and holds at most `cap` payments. */
export const RIVERSIDE = { quay: { level: 14, cost: 2500 }, house: { rent: 220, rentMs: paced(10 * MIN), cap: 8 } };
/** The hotel (core/hotel.mjs, chapter 14). `rooms` by level, and what each further floor costs. While a room is free a
 *  guest arrives every arriveMs / (1 + beauty rank), stays stayMs, and pays `room` plus `tip` x (1 + rank), the tip
 *  doubled if their breakfast wish (one of `wishes` the farm can make) was served. The desk holds at most `cap` coins. */
export const HOTEL = { rooms: [6, 9, 12], upgradeCost: [0, 8000, 15000], stayMs: paced(8 * MIN), arriveMs: paced(2 * MIN), room: 120, tip: 40, cap: 4000,
  wishes: ['bread', 'corn_bread', 'butter', 'cheese', 'apple_juice', 'carrot_juice', 'orange_juice', 'noodles', 'apple_pie', 'carrot_cake', 'honey_cake'] };
/** The valley company (core/valley.mjs, chapter 17). Founding takes `found` coins. The valley's value is its assets (coins,
 *  the barn at market price, buildings, land and works at cost, the herd, beauty at `beauty` coins a point) times its
 *  goodwill: x `step` for every deed done together (a market day sold on, a shared order, a train sent with a full
 *  wagon, a festival or fair held, every `guests` hotel guests), `deeds` of them at most. Every dividendMs a dividend
 *  of `dividend` of the assets is set aside; at most `cap` payments wait to be collected. `marks`: the value chapter 19
 *  asks for (with a picture-postcard valley) and the value that ends the story (chapter 20). `step` is the dial for how
 *  long those take: at testing pace a deed adds a fifth to the valley's name, at release pace a twelfth. */
export const VALLEY = { found: 20000, beauty: 200, step: PACE.mode === 'release' ? 1.08 : 1.2, deeds: 400, guests: 5, dividend: 0.002, dividendMs: paced(10 * MIN), cap: 6,
  marks: { green: 100_000_000, lights: 1_000_000_000 } };
/** The valley fair (core/fair.mjs, chapter 18). Holding one takes `fee` coins and `each` of every good entered; it lasts
 *  lastsMs, and the valleys rest everyMs from its opening. A score is `base` (from the plainest good of its class to the
 *  finest) plus up to `know` for how much of the good the farm has grown, made, picked or caught (full marks at the
 *  class's knowAt) plus `taste` if the judge likes it, give or take `wobble`. The three rivals score
 *  from + step x fairs held (steps at most) + spread x 0, 1 and 2, plus up to their own wobble. A ribbon pays its prize;
 *  a class's first gold pays firstGold more, and the judge grows `hearts` fonder for any ribbon. */
export const FAIR = { fee: 1500, each: 3, lastsMs: paced(3 * MIN), everyMs: paced(40 * MIN), base: [30, 60], know: 25, taste: 15, wobble: 4,
  rivals: { from: 36, step: 5, steps: 6, spread: 8, wobble: 10 }, prizes: { gold: 900, silver: 500, bronze: 300 }, firstGold: 600, xp: 80, hearts: 1,
  valleys: ['Pine Ridge', 'Stonewater', 'Larkfield'],
  classes: {
    field: { judge: 'grace', kinds: ['crop', 'fruit'], likes: ['pumpkin', 'peach'], knowAt: 400 },
    kitchen: { judge: 'lan', kinds: ['product'], likes: ['bread', 'apple_pie'], knowAt: 120 },
    pond: { judge: 'olaf', kinds: ['fish'], likes: ['carp', 'eel'], knowAt: 12 },
  } };
/** The evening train (core/train.mjs, chapter 15). It stops at the halt every everyMs for stopMs; the first comes firstMs
 *  after the halt opens. A wagon holds about wagon(level) coins' worth of its good, between `min` and `max` of it. A
 *  full wagon pays its goods x `pay`, a part-loaded one what is in it; `wagons` full ones add `bonus`. */
export const TRAIN = { everyMs: paced(25 * MIN), stopMs: paced(8 * MIN), firstMs: paced(1 * MIN), wagons: 3, wagon: level => 300 + 40 * level, min: 6, max: 200, pay: 1.6, bonus: 500, xp: 0.3 };
/** The co-operative (core/cooperative.mjs, chapter 12). Founding takes `gift` from the barn. An order has `lines` goods;
 *  a line asks for about line(level) coins' worth of its good, between `min` and `max` of it; a neighbour brings
 *  `pledge` of every line. Filled, it pays what the player sent x `pay` plus `coins`, and xp x its worth; the neighbours
 *  who brought a share (`friends` of them) grow fonder. The next order is posted everyMs later. */
export const COOPERATIVE = { gift: { bread: 12, cheese: 6, apple_juice: 6 }, lines: 3, line: level => 150 + 25 * level, min: 6, max: 200, pledge: 1 / 3, pay: 1.4, coins: 200, xp: 0.3,
  friends: 2, everyMs: paced(15 * MIN) };
/** The delivery trucks (core/market.mjs): a trip takes tripMs, pays the goods' value x pay; capacity in goods per trip
 *  (upgradeCost and level per size, every truck the same size); fleet: how many trucks a farm can own, and what the
 *  2nd and 3rd cost and at which level. */
export const TRUCK = { tripMs: paced(50_000), pay: 1.2, capacity: [20, 40, 70, 110, 150, 200, 260, 330, 410, 500], upgradeCost: [0, 300, 700, 1100, 1600, 2200, 2900, 3700, 4600, 5600], level: [1, 3, 5, 6, 7, 8, 9, 10, 11, 12],   // ten truck sizes
  fleet: { max: 3, cost: [0, 400, 900], level: [1, 4, 6] } };
/** The valley's beauty (core/valley.mjs, chapter 11). Points: a tree, a garden flower, a pond (two count), the dock, the
 *  open sluice, the kept meadow, a beehive; a decoration gives its own charm. Minus: a worn thing, a working factory
 *  (`quiet` kinds do not count), the cannery until it is made green (greenCost). `goal`: a green goal reached (chapter 19). `cap`: the most each part can give or
 *  take. `ranks`: the scores at which Pleasant, Pretty, Lovely and Postcard begin. `order`: what an order pays extra per rank. */
export const BEAUTY = { tree: 2, garden: 0.5, pond: 6, dock: 6, sluice: 20, spring: 10, meadow: 30, hive: 2, goal: 4, worn: 2, works: 3, cannery: 20, greenCost: 6000,
  quiet: ['feed_mill', 'bakery', 'stall', 'fruit_stand', 'pond', 'beehive'], cap: { trees: 60, flowers: 50, care: 20, industry: 15, hives: 10 },
  ranks: [0, 25, 50, 80, 110], order: 0.02 };
/** The Harvest Festival (core/festival.mjs, chapter 9): the feast is `kinds` different foods, `each` of each, from the barn.
 *  The evening lasts lastsMs; the village rests everyMs between two. The hat brings feast value x pay plus `coins`;
 *  everyone you can give gifts to gains `hearts`. */
export const FESTIVAL_DAY = { kinds: 6, each: 3, lastsMs: paced(3 * MIN), everyMs: paced(20 * MIN), pay: 1.5, coins: 300, xp: 60, hearts: 1 };
/** Chapter 8: once the sluice is open (s.firsts.sluice) the brook runs full, the old mill's wheel turns, and every batch a
 *  workshop starts takes `work` of its usual time. */
export const SLUICE = { work: 0.9 };
/** A crop bed within `reach` cells of a fish pond you built is watered: its crop takes `grow` of the usual time (chapter 7). */
export const WATERED = { reach: 3, grow: 0.8 };
/** Fishing in the brook from the boat dock: rare fish bite this many times as often (as bait does at a pond; both together multiply). */
export const RIVER = { rare: 2 };
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
// `who`: the villager who takes the job once their family lives in the village (chapter 10); until then it is done by
// a hand from the next valley, exactly the same.
export const HANDS = { everyMs: paced(60_000), wage: 1, roles: { field: { fee: 300, who: 'minh' }, animals: { fee: 300, who: 'grace' }, workshop: { fee: 500, who: 'lan' },
  orchard: { fee: 400, who: 'elin' }, driver: { fee: 600, who: 'sam' }, fisher: { fee: 400, who: 'olaf' } } };
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
