// The farmhouse wardrobe: hats and costumes. The hats are head pieces from the owner's own Willowmere and Zoo Garden
// (art/tools/build-wear.mjs cuts them into assets/models/rigged/wear.glb); a costume is a set of clothes
// (assets/models/rigged/costumes.glb, from the same games), often with a hat. A new one is yours at each farm level, so there is something to try on all the way up.
// Pure data: people-view dresses your character from it, the wardrobe card (ui/explore-mode.mjs) lists it.
export const HATS = {
  hat_straw: { name: 'Straw hat', level: 1 }, hat_band: { name: 'Red headband', level: 1 }, hat_cowboy: { name: 'Cowboy hat', level: 2 },
  hat_conical: { name: 'Conical leaf hat', level: 3 }, hat_chef: { name: 'Chef hat', level: 4 }, hat_party: { name: 'Party hat', level: 5 },
  hat_leather: { name: 'Leather hat', level: 6 }, hat_navy: { name: 'Sailor cap', level: 7 }, hat_bunny: { name: 'Bunny hat', level: 8 },
  hat_cat: { name: 'Cat hat', level: 9 }, hat_frog: { name: 'Frog hat', level: 10 }, hat_bear: { name: 'Bear hat', level: 11 },
  hat_santa: { name: 'Winter hat', level: 12 }, hat_pirate: { name: 'Pirate hat', level: 13 }, hat_graduate: { name: 'Graduation cap', level: 14 },
  hat_turban: { name: 'Festival turban', level: 15 }, hat_wizard: { name: 'Wizard hat', level: 16 }, hat_viking: { name: 'Viking hat', level: 17 },
  hat_samurai: { name: 'Samurai hat', level: 18 }, hat_fairy: { name: 'Flower crown', level: 19 }, hat_army: { name: 'Field helmet', level: 20 },
  hat_stars: { name: 'Stars hat', level: 21 }, hat_knight: { name: 'Knight helmet', level: 22 }, hat_space: { name: 'Space helmet', level: 23 },
  hat_lantern: { name: 'Lantern hat', level: 24 }, hat_halo: { name: 'Halo', level: 25 }, crown: { name: 'Royal crown', level: 26 },
};
/** A costume: a whole outfit. `kit` is its clothes (Zoo Garden's costume shells, re-fitted to our villagers by
 *  view/skinned.mjs), `hat` a hat worn with it; top and bottom colour the shirt and trousers underneath. It is yours at
 *  `level`, or when its hat is. */
export const COSTUMES = {
  farmhand: { name: 'Farmhand', kit: 'armor_leaf', hat: 'hat_straw', top: '#4f9a4a', bottom: '#8a5a2c' },
  redflag: { name: 'Red flag', kit: 'dz_vietnam', top: '#d8232a', bottom: '#f2c21a', level: 2 },
  cowboy: { name: 'Cowboy', kit: 'armor_leather', hat: 'hat_cowboy', top: '#a8683a', bottom: '#3f5f9a' },
  aodai: { name: 'Pink áo dài', kit: 'dz_aodai', top: '#f08bb0', bottom: '#f08bb0', level: 3 },
  island: { name: 'Island shirt', kit: 'armor_hawaii', hat: 'hat_straw', top: '#2fb6c9', bottom: '#f2e2b8', level: 3 },
  chef: { name: 'Chef', kit: 'armor_chef', hat: 'hat_chef', top: '#fff4e2', bottom: '#3a3f55' },
  hoodie: { name: 'Cosy hoodie', kit: 'armor_hoodie', top: '#f08a2a', bottom: '#3a3f55', level: 5 },
  cloud: { name: 'Cloud jumper', kit: 'armor_cloud', top: '#8fd0e8', bottom: '#4a5568', level: 6 },
  sailor: { name: 'Sailor', kit: 'dz_navy', top: '#f5f7fb', bottom: '#1f3a6b', level: 7 },
  ninja: { name: 'Ninja', kit: 'dz_ninja', top: '#1f2a5a', bottom: '#1f2a5a', level: 8 },
  star: { name: 'Star sailor', kit: 'dz_star', top: '#fffdf7', bottom: '#5b4fe0', level: 9 },   // our own (art/blender/build_star_sailor.py)
  dino: { name: 'Dino suit', kit: 'dz_dino', top: '#3fbf3f', bottom: '#3fbf3f', level: 10 },
  winter: { name: 'Winter red', kit: 'armor_santa', hat: 'hat_santa', top: '#c8232c', bottom: '#4a3a3a' },
  hero: { name: 'Superhero', kit: 'dz_superhero', top: '#d8232a', bottom: '#d8232a', level: 12 },
  pirate: { name: 'Pirate', kit: 'dz_pirate', top: '#b3262e', bottom: '#2a2530', level: 13 },
  graduate: { name: 'Graduate', kit: 'armor_tux', hat: 'hat_graduate', top: '#1f2330', bottom: '#1f2330' },
  snowman: { name: 'Snowman', kit: 'dz_snowman', top: '#f5f7fb', bottom: '#f5f7fb', level: 14 },
  scholar: { name: 'Festival gown', kit: 'dz_aodai_man', top: '#2c4fa3', bottom: '#1f2330', level: 15 },
  bones: { name: 'Skeleton jumper', kit: 'armor_bone', top: '#5a3d9a', bottom: '#2a2530', level: 15 },
  wizard: { name: 'Wizard', kit: 'dz_mage', top: '#5a3d9a', bottom: '#3a2a66', level: 16 },
  vampire: { name: 'Vampire', kit: 'dz_vampire', top: '#1a1a22', bottom: '#1a1a22', level: 16 },
  viking: { name: 'Viking', kit: 'armor_wolf', hat: 'hat_viking', top: '#8a94a8', bottom: '#4a3a2a' },
  samurai: { name: 'Samurai', kit: 'armor_kimono', hat: 'hat_samurai', top: '#e0356b', bottom: '#22242e' },
  robot: { name: 'Robot', kit: 'dz_mecha', top: '#2f6fe0', bottom: '#2f6fe0', level: 18 },
  fairy: { name: 'Flower fairy', kit: 'dz_fairy', top: '#3fbf3f', bottom: '#ff9ecb', level: 19 },
  soldier: { name: 'Field uniform', kit: 'dz_army', top: '#5d6b3a', bottom: '#4a5530', level: 20 },
  dragon: { name: 'Dragon wings', kit: 'armor_wings', top: '#b3262e', bottom: '#3a3f55', level: 20 },
  stars: { name: 'Stars and stripes', kit: 'dz_usa', top: '#f5f7fb', bottom: '#c8232c', level: 21 },
  knight: { name: 'Knight', kit: 'dz_knight', top: '#eef1f5', bottom: '#eef1f5', level: 22 },
  astronaut: { name: 'Astronaut', kit: 'armor_space', hat: 'hat_space', top: '#eef1f5', bottom: '#c9d0da' },
  angel: { name: 'Angel', kit: 'armor_angel', hat: 'hat_halo', top: '#fff4e2', bottom: '#2f5aa8' },
  royal: { name: 'Royal robes', hat: 'crown', top: '#7a2a8a', bottom: '#f2c21a' },
};
for (const [id, o] of [...Object.entries(HATS), ...Object.entries(COSTUMES)]) o.id = id;
for (const c of Object.values(COSTUMES)) c.level ??= HATS[c.hat].level;
/** Who you are (the mirror, and Settings): a man, a woman, a boy or a girl. `rig` is the model, `size` its size outdoors
 *  against that model's own (1 for all four now that the girl has a model of her own), `child` gives a child's height indoors. */
export const BODIES = {
  man: { name: 'Man', rig: 'man', size: 1 }, woman: { name: 'Woman', rig: 'woman', size: 1 },
  kid: { name: 'Boy', rig: 'kid', size: 1, child: true }, girl: { name: 'Girl', rig: 'girl', size: 1, child: true },
};
for (const [id, b] of Object.entries(BODIES)) b.id = id;
export const bodyOf = s => BODIES[s?.settings?.playerBody] ?? BODIES.man;
/** The costume you have on, or null. */
export const costumeOf = s => COSTUMES[s?.settings?.playerLook] ?? null;
/** The hat on your head: the costume's, else the one you picked ('' = none). */
export const hatOf = s => { const c = costumeOf(s); return c ? c.hat ?? '' : HATS[s?.settings?.playerHat] ? s.settings.playerHat : ''; };
/** Everything your character has on, as the rig wants it (view/skinned.mjs wornRig): a costume's kit and hat, or your hat. */
export const wearOf = s => { const c = costumeOf(s); return c ? [c.kit && `kit:${c.kit}`, c.hat].filter(Boolean).join('+') : hatOf(s); };
/** Hats and costumes in the order they are earned, each with `open` for this farm. */
export const wardrobe = s => ({
  hats: Object.values(HATS).sort((a, b) => a.level - b.level).map(h => ({ ...h, open: (s.level ?? 1) >= h.level })),
  costumes: Object.values(COSTUMES).sort((a, b) => a.level - b.level).map(c => ({ ...c, open: (s.level ?? 1) >= c.level })),
});
/** What a level brings to the wardrobe (for the level-up card). */
export const wardrobeAt = level => Object.values(HATS).filter(h => h.level === level);
