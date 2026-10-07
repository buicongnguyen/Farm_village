// The story (DESIGN 1) and the first-session tutorial (DESIGN 15), as data.
// Chapter cards show when their `when` test first passes. Tutorial steps run in order; each says what to do (Ada speaks),
// which HUD buttons are shown, what to point at, and when it is done. Every step can be skipped ("I know how").
export const CHAPTERS = [
  { id: 1, title: 'A key and a seed tin', subtitle: 'Every story starts with coming home.', icon: '🗝',
    text: 'Your grandparents Ada and Ellis kept a farm beside a quiet brook. The village around it has emptied over the years. You arrive with June and Pip to take over the farm, and Ada asks one thing: bring the village back to life.',
    when: () => true },
  { id: 2, title: 'Something takes root', subtitle: 'A small harvest. A big beginning.', icon: '🌱',
    text: 'The first loaves in years come out of Ada\'s oven, and the hens settle into their new coop. Pip names every one of them. The farm is waking up.',
    when: s => s.projects.step > 2 },
  { id: 3, title: 'A light in the window', subtitle: 'The first family comes home to Hollowbrook.', icon: '🏡',
    text: 'For the first time in years, a window in the village glows after dark. The Trans have moved into the cottage by the brook, and Bo is already asking about the old school.',
    when: s => Object.values(s.homes).some(h => h.arrived) },
  { id: 4, title: 'A bell for the children', subtitle: 'The school opens its doors again.', icon: '🔔',
    text: 'Cora rings the old bell, and Bo and Zara race each other to the door. Hollowbrook has children again, and a village with children has a future.',
    when: s => (s.counts.school ?? 0) > 0 },
];

// HUD buttons: build, orders, barn, projects, today, settings (turn and language are always there)
const ALL = ['build', 'orders', 'barn', 'projects', 'today'];
export const TUTORIAL = [
  { id: 'clear', text: 'Let\'s clear a patch by the house. Tap the weeds, then the broom.', hud: [], point: 'weeds',
    done: s => s.stats.cleared >= 3 },
  { id: 'path', text: 'A farm needs a path to the road. Open build mode and lay three path tiles to the road.', hud: ['build'], point: 'path',
    done: s => s.stats.paths >= 3 },
  { id: 'beds', text: 'Now six crop beds on the cleared ground. They are free.', hud: ['build'], point: 'beds',
    done: s => (s.counts.bed ?? 0) >= 6 },
  { id: 'plant', text: 'Tap a bed and choose wheat, then drag across the others to plant them all.', hud: ['build'], point: 'bed',
    done: s => Object.keys(s.beds).length >= 6 || s.stats.harvested > 0 },
  { id: 'harvest', text: 'Your first wheat grows fast. When it is golden, tap a bed and harvest.', hud: ['build', 'barn'], point: 'bed',
    done: s => s.stats.harvested > 0 },
  { id: 'order', text: 'I have an order for you. Open the order board and deliver my six wheat.', hud: ['build', 'barn', 'orders'], point: 'orders',
    done: s => s.stats.ordersFilled > 0 },
  { id: 'mill', text: 'Our first project: a feed mill and a coop. Open the projects and follow the steps.', hud: ['build', 'barn', 'orders', 'projects'], point: 'projects',
    done: s => s.projects.step > 2 },
  { id: 'hens', text: 'Put a fence with a gate around the coop, then tap the coop for your first hens. Mai is giving you two!', hud: ALL.filter(h => h !== 'today'), point: 'coop',
    done: s => Object.values(s.animals).some(list => list.length > 0) },
  { id: 'feed', text: 'Hens eat chicken feed. Make some at the feed mill, then tap the coop to feed them.', hud: ALL.filter(h => h !== 'today'), point: 'mill',
    done: s => Object.values(s.animals).flat().some(a => a.doneAt != null) || (s.barn.items.egg ?? 0) > 0 },
  { id: 'cottage', text: 'A family is looking for a home. Build the first cottage in the village, with a path to its door.', hud: ALL, point: 'projects',
    done: s => (s.counts.cottage ?? 0) > 0 },
  { id: 'free', text: 'You are doing wonderfully. The Today board shows what is ready each day. The village is yours to grow!', hud: ALL, point: 'today',
    done: () => false, last: true },
];
