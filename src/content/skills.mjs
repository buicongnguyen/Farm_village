// The disguise costumes' skills (docs/plan/98-zoo-garden-moves.md step 4): Zoo Garden's names and cooldowns
// (cute_game src/content.ts DISGUISE_FACTS), each turned into one of eight peaceful effects (core/moves.mjs does the
// rules, ui/explore-mode.mjs the movement and the look). Only the costumes with a disguise kit have skills.
// [name, effect, cooldown in seconds]
const S = (name, effect, cd) => ({ name, effect, cd });
export const SKILLS = {
  dz_superhero: [S('Take flight', 'float', 3), S('Meteor dive', 'splash', 6), S('Laser gaze', 'shoo', 7), S('Boulder throw', 'splash', 10)],
  dz_ninja: [S('Shadow clones', 'decoy', 14), S('Vanish', 'light', 12), S('Shadow strike', 'dash', 6), S('Smoke bomb', 'shoo', 12)],
  dz_mage: [S('Great fireball', 'splash', 5), S('Blink', 'dash', 5), S('Sheep spell', 'show', 12), S('Black hole', 'show', 13)],
  dz_knight: [S('Shield block', 'light', 8), S('Knight’s charge', 'dash', 7), S('Challenge', 'shoo', 12), S('Sky sword', 'splash', 12)],
  dz_mecha: [S('Tank mode', 'dash', 12), S('Tesla turret', 'decoy', 14), S('Homing missiles', 'splash', 7), S('Energy shield', 'light', 16)],
  dz_dino: [S('Devour', 'splash', 9), S('Tail sweep', 'shoo', 5), S('Terrifying roar', 'shoo', 12), S('Giant form', 'show', 18)],
  dz_fairy: [S('Healing flower ring', 'bloom', 12), S('Butterfly float', 'float', 10), S('Fairy charm', 'show', 14), S('Binding tree', 'bloom', 14)],
  dz_pirate: [S('Deck cannon', 'splash', 12), S('Grappling hook', 'dash', 6), S('Scout parrot', 'decoy', 10), S('Ship broadside', 'show', 14)],
  dz_vampire: [S('Life drain', 'shoo', 7), S('Bat form', 'float', 9), S('Bat swarm', 'show', 12), S('Blood moon', 'light', 15)],
  dz_snowman: [S('Rolling snowball', 'splash', 7), S('Snow decoy', 'decoy', 12), S('Ice rink', 'dash', 12), S('Ice age', 'show', 16)],
  dz_army: [S('Cork popgun', 'splash', 6), S('Sandbag wall', 'decoy', 10), S('Signal flare', 'light', 12), S('Supply drop', 'show', 16)],
  dz_navy: [S('Anchor swing', 'splash', 7), S('Wave ride', 'float', 7), S('Bosun’s whistle', 'shoo', 12), S('Lighthouse beam', 'light', 15)],
  dz_aodai: [S('Lotus petals', 'splash', 6), S('Silk ribbon glide', 'float', 8), S('Paper fan breeze', 'shoo', 12), S('Lantern festival', 'bloom', 15)],
  dz_aodai_man: [S('Dragon fan', 'shoo', 7), S('Kite glide', 'float', 10), S('Ink circle', 'bloom', 12), S('Dragon dance', 'show', 15)],
  dz_usa: [S('Eagle strike', 'splash', 7), S('Star shield', 'light', 9), S('Liberty torch', 'show', 12), S('Fireworks finale', 'show', 15)],
  dz_vietnam: [S('Golden star burst', 'splash', 7), S('Bamboo vault', 'float', 7), S('Bronze drum', 'shoo', 12), S('Great golden star', 'show', 15)],
  dz_star: [S('Ribbon lasso', 'dash', 6), S('Morning glow', 'bloom', 12), S('Sparkle step', 'float', 7), S('Star shower', 'show', 15)],
};
/** What each effect does, in a line (the skill buttons' titles and the wardrobe's costume card). */
export const EFFECTS = {
  dash: 'A quick dash ahead.',
  float: 'A hop and a glide, a little faster.',
  shoo: 'Crows nearby fly off.',
  splash: 'A splash ahead: a bed there is watered (it grows a little sooner), fish leap from water.',
  bloom: 'A ring of flowers: beds and fruit trees round you grow a little sooner.',
  decoy: 'A double stands a while and keeps the crows off.',
  light: 'A glow goes with you a while.',
  show: 'A little show over your head.',
};
/** The skills of what you have on: a costume's four, or none. */
export const skillsOf = kit => SKILLS[kit] ?? [];
