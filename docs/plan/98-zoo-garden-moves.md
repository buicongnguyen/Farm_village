# Zoo Garden's moves in Hollowbrook (plan, 2026-10-15)

The owner asked to bring over from Zoo Garden (`cute_game`, the owner's own game): the disguise characters' skills, the
shape chosen at the mirror, the normal attack, the control buttons on phone and desktop, walking into water, and skills
that touch fish. This plan says what each becomes here, in what order, and how we know it is done.

## Ground rules

- **Hollowbrook stays peaceful.** Zoo Garden's skills are almost all damage and crowd control against monsters; here
  there are no monsters, HP or damage numbers. Every move gets a farm meaning instead: crows are shooed, weeds and
  stones are knocked about, water splashes, fish leap, crops and trees get a small, capped help. Nothing that fights.
- **It all lives in Explore** (walking your character with the stick or the keys), which is already fetched with
  `import()`. The first load is at 1,298,991 of 1,300,000 bytes: none of this may go in it. Rules go in
  `core/moves*.mjs` installed with Explore (like `installExplore`), views and UI in the Explore chunk.
- **Phones first.** Every button is a 44 px touch target; the layout is checked at 390 x 844 and 844 x 390 as well as
  1280 x 800. No new draw calls per frame beyond a few instanced effects.
- **One step, one pull request**, each with unit tests, the affected browser suites, screenshots, CI, then merge and
  deploy. A step is not started until the one before is live.

## What Zoo Garden has, and what it becomes here

| Zoo Garden | Hollowbrook |
|---|---|
| Four skill buttons + attack pad, Space / Q W E R (or J K L ;), cooldown rings, a keyboard guide that folds away, `touch-buttons.ts` for second fingers | The same layout in Explore: an action pad and up to four skill buttons beside the stick, the same keys (both layouts), cooldown rings, the folding guide |
| Normal attack: auto-targets the nearest creature; sword arc, fist combo, gun shot; chops breakable trees and stones when nothing is near | **A swing** (the Hammer clip, the rod or the costume's look): shoos crows within reach, shakes bushes and flowers, knocks a weed or stone tuft loose (a free clear of a 1-cell weed patch, at most a few a day), splashes water and makes fish leap |
| Swim rules: shore is solid, push 0.5 s to step in, wading 0.7x and swimming 0.55x, stamina 18 s, back to shore when tired, no attacks while swimming | **The same rules** for the village pond, built ponds and the brook: a wading band and a deep middle, a sink depth, ripple rings, a stamina ring, pulled back to the bank when tired; no swings or skills in the water |
| 17 disguises with 4 skills each (`DISGUISE_KITS`, `DZ` numbers, `skill-visuals.ts` effect shapes) | **Our costumes that are disguise kits get 4 skills each**, each mapped to one of a small set of peaceful effects (below), with Zoo Garden's names, cooldowns and look |
| Pond splash: an area skill touching water throws up a column, rings and 1-2 leaping fish (looks only) | **The same**, and a leaping fish now and then lands on the bank as a small catch (once per pond every few minutes) |
| Looks at the mirror: body x height (tiny, chibi, teen, tall, grown) x ears x animal hood | We already have the body (man, woman, boy, girl) and hats; **add the height row** (smaller to taller, cosmetic) and the ears/hood picks as hats |
| Monsters, bosses, HP, damage numbers, dungeons, PvP | **Not brought over** |

### The peaceful effects every disguise skill maps to

| Effect | What it does here | Zoo Garden skills that use it |
|---|---|---|
| `dash` | a quick dash a few metres the way you face | Blink, Shadow strike, Knight's charge, Grappling hook, Bamboo vault, Sparkle step |
| `float` | a slow hop-and-glide | Take flight, Butterfly float, Kite glide, Silk ribbon glide, Wave ride, Bat form |
| `shoo` | crows within the radius fly off; flowers and bushes shake | Smoke bomb, Terrifying roar, Bosun's whistle, Challenge, Paper fan breeze, Bronze drum |
| `splash` | a burst of water or light at a point: fish leap, a bed in it is watered (its crop a little sooner, capped) | Great fireball, Meteor dive, Lotus petals, Rolling snowball, Deck cannon, Golden star burst |
| `bloom` | a ring of flowers: beds and trees inside grow a little sooner (capped, long cooldown) | Healing flower ring, Morning glow, Binding tree, Lantern festival |
| `decoy` | a helper stands a while: a scarecrow-like double that keeps crows off | Shadow clones, Snow decoy, Scout parrot, Tesla turret, Sandbag wall |
| `light` | a glow that follows you a while (lovely at night) | Vanish, Star shield, Liberty torch, Lighthouse beam, Blood moon |
| `show` | a firework or confetti show over you (looks only) | Fireworks finale, Dragon dance, Star shower, Ice age, Black hole, Giant form |

The help to crops is small and capped (a bed or tree can be helped once per growth), so skills are fun, not a way
around the farm's pacing.

## Steps

1. **Controls.** Explore gets the action pad, four skill slots (empty until a disguise is worn), cooldown rings, Space and
   Q W E R / J K L ; keys, a folding keyboard guide, and a second-finger fix on phones. Done when: every button works
   by touch and by key, nothing overlaps at the three sizes, and the existing Explore suites pass.
2. **The swing (normal attack).** Space or the pad swings: crows shoo, weeds and stones get knocked, water splashes and
   fish leap. Done when: unit tests for reach, cooldown and the daily cap; a browser check that a swing shoos a crow.
3. **Into the water.** Wading and swimming in ponds and the brook, with stamina and the way back to the bank. Done when:
   you can wade and swim, cannot swing or cast in the water, and are always brought back to land.
4. **Disguise skills.** The table of skills for every disguise costume we ship (Zoo Garden's names and cooldowns, our
   effects), the effects themselves with light visuals, and the skill card in the wardrobe. Done when: every disguise
   has four working skills, cooldowns save, and the caps hold.
5. **Skills and fish.** Area skills and swings that touch water make fish leap; now and then one lands as a catch.
   Done when: the leap shows, the catch is capped and saved.
6. **Shape at the mirror.** A height row (cosmetic) next to the body row; ears and hoods as hats. Done when: the four
   bodies at every height look right indoors and out, with hats and costumes.

## Status

| Step | State |
|---|---|
| 1 Controls | the swing pad and Space (skill buttons come with step 4, when there are skills to put on them) |
| 2 The swing | done with step 1 (one pull request: a pad with nothing to do would be no use) |
| 3 Into the water | done: the brook and the village pond (built ponds are buildings and stay solid) |
| 4 Disguise skills | |
| 5 Skills and fish | |
| 6 Shape at the mirror | |
