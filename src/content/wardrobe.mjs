// The farmhouse wardrobe: hats and costumes. The hats are head pieces from the owner's own Willowmere and Zoo Garden
// (art/tools/build-wear.mjs cuts them into assets/models/rigged/wear.glb); a costume is a hat with a shirt and
// trousers to match. A new one is yours at each farm level, so there is something to try on all the way up.
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
/** A costume: a hat with its own shirt (top) and trousers (bottom). It is yours when its hat is. */
export const COSTUMES = {
  farmhand: { name: 'Farmhand', hat: 'hat_straw', top: '#4f9a4a', bottom: '#8a5a2c' },
  cowboy: { name: 'Cowboy', hat: 'hat_cowboy', top: '#c9763a', bottom: '#3f5f9a' },
  aodai: { name: 'White áo dài', hat: 'hat_conical', top: '#f6f2ea', bottom: '#f6f2ea' },
  chef: { name: 'Chef', hat: 'hat_chef', top: '#fff4e2', bottom: '#3a3f55' },
  sailor: { name: 'Sailor', hat: 'hat_navy', top: '#f5f7fb', bottom: '#1f3a6b' },
  winter: { name: 'Winter red', hat: 'hat_santa', top: '#c8232c', bottom: '#c8232c' },
  pirate: { name: 'Pirate', hat: 'hat_pirate', top: '#b3262e', bottom: '#2a2530' },
  graduate: { name: 'Graduate', hat: 'hat_graduate', top: '#1f2330', bottom: '#1f2330' },
  scholar: { name: 'Festival gown', hat: 'hat_turban', top: '#2c4fa3', bottom: '#f2f0ea' },
  wizard: { name: 'Wizard', hat: 'hat_wizard', top: '#5a3d9a', bottom: '#3a2a66' },
  viking: { name: 'Viking', hat: 'hat_viking', top: '#7a5a3a', bottom: '#4a3a2a' },
  samurai: { name: 'Samurai', hat: 'hat_samurai', top: '#8a1f2a', bottom: '#22242e' },
  fairy: { name: 'Flower fairy', hat: 'hat_fairy', top: '#ff9ecb', bottom: '#9ad48a' },
  soldier: { name: 'Field uniform', hat: 'hat_army', top: '#5d6b3a', bottom: '#4a5530' },
  knight: { name: 'Knight', hat: 'hat_knight', top: '#aeb7c4', bottom: '#5a6272' },
  astronaut: { name: 'Astronaut', hat: 'hat_space', top: '#eef1f5', bottom: '#c9d0da' },
  royal: { name: 'Royal robes', hat: 'crown', top: '#7a2a8a', bottom: '#f2c21a' },
};
for (const [id, o] of [...Object.entries(HATS), ...Object.entries(COSTUMES)]) o.id = id;
for (const c of Object.values(COSTUMES)) c.level = HATS[c.hat].level;
/** The costume you have on, or null. */
export const costumeOf = s => COSTUMES[s?.settings?.playerLook] ?? null;
/** The hat on your head: the costume's, else the one you picked ('' = none). */
export const hatOf = s => costumeOf(s)?.hat ?? (HATS[s?.settings?.playerHat] ? s.settings.playerHat : '');
/** Hats and costumes in the order they are earned, each with `open` for this farm. */
export const wardrobe = s => ({
  hats: Object.values(HATS).sort((a, b) => a.level - b.level).map(h => ({ ...h, open: (s.level ?? 1) >= h.level })),
  costumes: Object.values(COSTUMES).sort((a, b) => a.level - b.level).map(c => ({ ...c, open: (s.level ?? 1) >= c.level })),
});
/** What a level brings to the wardrobe (for the level-up card). */
export const wardrobeAt = level => Object.values(HATS).filter(h => h.level === level);
