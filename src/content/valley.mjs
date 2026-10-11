// The green valley (chapter 19, docs/plan/ch19-the-green-valley.md): six goals that turn the valley green on purpose,
// whichever answer Mr Albright was given. Each has a count taken from what stands in the valley (core/valley.mjs
// greenProgress). Reaching it once is enough: it pays `coins` and adds BEAUTY.goal to the valley's beauty for good.
// The last depends on the answer of chapter 11: `factory` replaces its name, count and icon for a cannery owner.
export const GREEN_GOALS = [
  { id: 'trees', name: 'Thirty trees standing', need: 30, coins: 800, icon: 'round_tree' },
  { id: 'flowers', name: 'Twenty-five flower beds and flowerpots', need: 25, coins: 500, icon: 'flowers' },
  { id: 'ponds', name: 'Two fish ponds', need: 2, coins: 600, icon: 'pond' },
  { id: 'lanes', name: 'Eight benches and lamps along the lanes', need: 8, coins: 600, icon: 'bench' },
  { id: 'care', name: 'Nothing in the valley left worn', need: 1, coins: 400, icon: 'tool:demolish' },
  { id: 'choice', name: 'Five beehives by the meadow', need: 5, coins: 1000, icon: 'beehive', factory: { name: 'The cannery made a green one', need: 1, icon: 'cannery' } },
];
