// Goals (v0.3d): three live quests at a time, a weekly village goal and the school celebration. Every quest is a
// counter on a statistic (`stat`: s.stats[stat] since the quest began) or a favour (bring goods to a villager). Numbers grow with the level.
export const QUESTS = {
  harvest: { text: 'Harvest {n} crops', stat: 'harvested', icon: 'wheat', n: L => 12 + 4 * L },
  orders:  { text: 'Fill {n} orders', stat: 'ordersFilled', icon: 'ui:orders', n: L => 2 + Math.floor(L / 3) },
  fish:    { text: 'Catch {n} fish', stat: 'fished', icon: 'perch', n: L => 2 + Math.floor(L / 3), needs: 'pond' },
  make:    { text: 'Make {n} goods', stat: 'produced', icon: 'bread', n: L => 3 + Math.floor(L / 2), needs: 'production' },
  fruit:   { text: 'Pick {n} fruit', stat: 'picked', icon: 'apple', n: L => 6 + 2 * Math.floor(L / 2), needs: 'fruit_tree' },
  coins:   { text: 'Earn {n} coins', stat: 'coinsEarned', icon: 'ui:coin', n: L => 100 + 60 * L },
  truck:   { text: 'Send the truck {n} times', stat: 'trips', icon: 'truck', n: L => 1 + Math.floor(L / 5), needs: 'market' },
};
export const QUEST_REWARD = L => ({ coins: 20 + 10 * L, xp: 5 + 2 * L });
/** Favours: a villager would love some goods from you. */
export const FAVOURS = [
  { person: 'gus', good: 'perch', n: k => 2 + k, needs: 'pond' }, { person: 'ada', good: 'bread', n: k => 2 + k, needs: 'bakery' },
  { person: 'mai', good: 'egg', n: k => 3 + k, needs: 'coop' }, { person: 'sam', good: 'apple', n: k => 3 + k, needs: 'apple_tree' },
  { person: 'lan', good: 'wheat', n: k => 12 + 4 * k, needs: null },
];
/** The weekly village goal rotates with the week. */
export const WEEKLY = [
  { text: 'This week: harvest {n} crops', stat: 'harvested', n: 150, icon: 'wheat' },
  { text: 'This week: fill {n} orders', stat: 'ordersFilled', n: 25, icon: 'ui:orders' },
  { text: 'This week: finish {n} goals', stat: 'questsDone', n: 8, icon: 'ui:xp' },
];
export const WEEKLY_REWARD = { coins: 800, xp: 60, hurry: 1 };
/** The school celebration: once the school is open and this many goals are done. */
export const FESTIVAL = { goals: 12, coins: 1500, xp: 150, hearts: 1 };
