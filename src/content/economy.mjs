// Every tuning number (ECONOMY.md). Change a number here and in ECONOMY.md, then run `npm run sim`.
export const MIN = 60_000, HOUR = 3_600_000, DAY = 86_400_000;

export const START = { coins: 50, barnCap: 50, stock: { wheat: 6 } };
export const LEVELS = {
  xpFor: L => Math.round(10 * (L - 1) ** 2.6),       // total XP needed to reach level L
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
  cost: n => n <= 6 ? 0 : Math.round(10 * 1.15 ** (n - 6)),   // the nth bed
};
export const CLEAR = { weeds: 2, rock: 10 };
export const BARN = { start: 50, step: 25, upgradeCost: k => 100 * 2 ** k };
export const SLOTS = { start: 2, max: 6, cost: [0, 0, 60, 200, 600, 1500] };   // cost of the nth slot (index = slot count before buying)
export const RENT = {
  perHour: [3, 6, 10], upgradeCost: [0, 400, 1500], capHours: 8,
  charmBonus: charm => Math.min(0.4, charm * 0.02), unmetNeed: 0.25,
};
export const PARCELS = { cost: n => [0, 500, 2000, 4000, 7000, 11000][n - 1] ?? Math.round(11000 * 1.4 ** (n - 6)), maxV01: 2 };
export const NEIGHBOURS = { visitsPerDay: 2, helpBeds: 3, helpMs: 30 * MIN, tradesPerDay: 1 };
export const STALL = { slots: 4, sellEveryMs: [3 * MIN, 5 * MIN] };
export const DAILY_RESET_HOUR = 4;
export const FAMILY_ARRIVAL_MS = 2 * MIN;
