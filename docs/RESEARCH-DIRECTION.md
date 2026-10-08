# Hollowbrook — audience, story, interactions, and art direction

Date: 2026-10-08 (Asia/Seoul)

Status: research and design recommendations, recorded from the discussion with the user. The user accepted a broad audience like Hay Day and requested a richer color direction because the first palette looked too pale. The revised palette below supersedes that first palette as the proposed direction; it still needs visual testing.

This document accompanies [JOURNEY.md](JOURNEY.md), [STORY.md](STORY.md), and [DESIGN.md](DESIGN.md). It records the analysis and proposed next steps. Implementation status remains in JOURNEY.md.

## 1. Audience and central recommendation

Hollowbrook will target a broad audience like Hay Day: welcoming to children and families, with enough choice, personality, and depth to interest adults.

Supercell's June 2026 description supports that direction: Hay Day attracts younger and older players, including people with little gaming experience. Its reassuring world, where animals do not die and trees can recover, is part of its stated identity. That is a useful foundation for Hollowbrook. This source describes broad appeal; it does not provide a current global age or gender breakdown. [Supercell's audience and design description](https://supercell.com/en/news/nothing-bad-happens-in-hay-day/)

**Recommendation: build a beautiful, responsive village where farming changes people's everyday lives. Give players freedom to make it their own, and make prosperity visible throughout the village.**

For children and less experienced players, provide recognizable objects, clear actions, expressive characters, and reassuring consequences. For adults, add choices about production, layout, relationships, and longer projects. These layers can coexist in the same game.

The recommendations below are design judgments informed by research and the current project. They are proposals to test, not guarantees of player retention or evidence that any single feature caused another game's success.

## 2. What comparable games teach us

The strongest relevant examples connect ordinary actions to something players care about.

| Game | Relevant design | Lesson for Hollowbrook |
|---|---|---|
| **Stardew Valley** | Farming, fishing, crafting, relationships, and community restoration offer different pursuits. | Let players choose what kind of day they want: productive, social, creative, or exploratory. [Official overview](https://www.stardewvalley.net/about/) |
| **Animal Crossing** | Personalization gives players ownership. Nintendo's developers describe adding public works ceremonies to make the player's contribution feel recognized. | After rebuilding something, let villagers acknowledge it and visibly use it. [Developer interview](https://iwataasks.nintendo.com/interviews/3ds/animalcrossing-newleaf/0/1/) |
| **Spiritfarer** | Growing, cooking, and crafting support caring for particular characters. | A basket of fruit becomes more meaningful when the player knows who will enjoy it and why. Borrow this connection between care and action for Hollowbrook's family story. [Official description](https://thunderlotusgames.com/games/spiritfarer/) |
| **Cozy Grove** | Helping characters gradually brings color and life back to places. | Show restoration through the environment: reopened windows, flowing water, occupied benches, and evening lights. [Official description](https://cozygrovegame.com/) |
| **Zelda: Tears of the Kingdom** | Objects follow reusable rules that support different player solutions; visual cues help communicate what can be manipulated. | Let familiar objects work together in understandable ways. This principle can fit a small farming game without requiring a huge physics system. [Developer interview](https://www.nintendo.com/us/whatsnew/ask-the-developer-vol-9-the-legend-of-zelda-tears-of-the-kingdom-part-5/) |

Hollowbrook already has quests, letters, gifts, an album, customization, and helpers. The opportunity is to connect these features more closely, so an action changes several parts of the player's experience.

## 3. Why playing alone can remain satisfying

Research on game motivation associates perceived freedom and competence with enjoyment. That supports giving players understandable choices and opportunities to become better at something. It does not establish a universal formula for every audience. The paper's findings about relatedness in multiplayer also do not prove that NPC relationships have the same effects. [Ryan, Rigby, and Przybylski's study](https://selfdeterminationtheory.org/SDT/documents/2006_RyanRigbyPrzybylski_MandE.pdf)

For Hollowbrook, build around five reasons to return:

1. **Ownership: "This is my village."** The orchard layout, favorite picnic spot, flower arrangements, and workshop area reflect the player's choices.
2. **Mastery: "I found a better way."** Players learn how to organize production, reserve ingredients, and direct helpers. Becoming skilled should reduce repetitive work.
3. **Anticipation: "I know what I'm working toward."** Show the current goal and a few appealing upcoming unlocks, with understandable requirements.
4. **Attachment: "I want to see these people again."** Characters remember events, use gifts, develop routines, and sometimes help the player.
5. **Curiosity: "Something here has a story."** An old poster, repaired bell, unusual letter, or newly accessible riverbank invites investigation.

For example, opening the clinic could change the daily scene: Marisol waters its flowers, Ada occasionally sits outside, and Pip brings a drawing. Those visible behaviors make the player's contribution tangible.

Hay Day also has social features. Its broad appeal does not by itself prove that Hollowbrook can reproduce the same experience entirely through solo play. Our proposed solo strengths are personal projects, expressive layouts, discoveries, and responsive villagers; these need playtesting.

### Session rhythm

Protect natural stopping points. A short visit should leave the player satisfied with something completed. Build on the existing batch actions and helpers so a larger farm does not require proportionally more tapping.

Support several overlapping horizons:

- **This visit:** collect a batch, fulfill a request, arrange a small space, or discover a clue.
- **The next few visits:** open a building, develop an orchard, or finish a character episode.
- **The longer journey:** restore the brook, host a festival, grow the company, and see the valley thrive.

Optional depth should give players useful choices while keeping ordinary farming approachable. Repeated maintenance should not expand faster than the player's tools for managing it.

## 4. Story direction: family, place, and visible change

Hollowbrook's strongest story idea is already its family. The player arrives with June and Pip, and has a connection to Ada and Ellis. That gives the game an intergenerational story: children discover the village, adults rebuild their lives, and older characters reconsider its past.

The central emotional promise should be:

> Grow a home your family loves, and help a village become a place people choose to stay.

The wealth ambition can remain. Its rewards should become visible: successful shops, useful jobs, repaired homes, lively public spaces, and a festival the community can finally afford.

### Four principles for chapters

1. **Give each chapter a personal need.** "Marisol wants somewhere comfortable for people to wait" creates a clear emotional purpose for developing the clinic.
2. **Let actions carry some of the storytelling.** Finding a mark on the old sluice while repairing it gives the player a discovery to discuss. Conversations can explain what the player found.
3. **Allow ordinary disagreements.** Gus might want to preserve an old structure while Cora wants safer access for children. Both can have reasonable motives. A gentle world can still contain decisions worth thinking about.
4. **Let the village give back.** After several chapters of helping everyone, neighbors should organize something for the player's family, contribute supplies, or take over a task for an afternoon.

A useful chapter structure is: a person wants something, the player chooses an approach, a place or object changes, and the person's behavior changes afterward.

### Continuity issue to resolve

Early letters bring Ellis back around the school festival, while the roadmap reserves his permanent return for a later festival. Make the early event a **school celebration and brief visit**, followed later by the restored **Harvest Festival and permanent homecoming**. The sluice mystery should unfold alongside actions the player can actually perform.

Review [JOURNEY.md](JOURNEY.md), [STORY.md](STORY.md), and the [current letters](../src/content/letters.mjs) together before implementing that revision.

### Choices and future expansion

The proposed factory-versus-green-contract choice needs care. Losing the meadow and Mai's friendship makes one option heavily punished. If this is intended as a meaningful choice, both approaches should offer respectable benefits and understandable costs. Relationships should not merely grade whether the player chose the preferred economic strategy.

Complete a satisfying early village arc before greatly expanding the cast and map. A later town should introduce a different community and problem, so its restoration feels like a new chapter in the valley's life.

## 5. Revised art direction: rich orchard color

### User feedback and revision

The user found the first proposed palette too pale. That feedback changes the recommendation: use **stronger green midtones, deeper leafy shadows, rich terracotta, turquoise water, vivid fruit, and small honey-gold highlights**.

Keep cream mainly in the interface. The world should feel lush, colorful, and sunlit, with recognizable local colors and substantial light–dark depth.

The first proposal used muted meadow green `#8EAD6B`, soft water `#69A6AD`, and peach-pink `#E7ADAA`. The palette below replaces those as the main proposed color direction. Softer colors can still serve small blossoms or distant details.

### Research and interpretation

There is no established "happiness color" that reliably makes everyone enjoy a game. Research suggests color preferences are influenced by associations with objects and experiences. Fresh leaves, clear water, baked bread, ripe fruit, and lamplight give us useful starting points. The study does not establish that this palette will improve game retention. [Palmer and Schloss's color-preference research](https://palmerlab.berkeley.edu/pdf/Palmer%26Schloss%282010%29.pdf)

The current game already contains vivid lime grass, orange paths, and considerable gold in the interface. The proposed improvement is to organize those strengths: richer local colors, deeper shadows, clearer material differences, and more selective emphasis.

### Proposed working palette

These are starting colors for rendered visual tests, not final material values. Lighting, exposure, surrounding colors, and phone screens will affect their appearance.

| Element and role | Color | Purpose |
|---|---|---|
| Grass: main midtone | `#67AA3D` | Fresh orchard green with more color than the earlier muted proposal |
| Foliage: main midtone | `#438448` | Distinguishes tree masses from open ground |
| Vegetation: shadow | `#285C3B` | Adds depth beneath canopies and between leaves |
| Leaves: sunlit highlight | `#A2C954` | Warm light while preserving visible green |
| Water: main color | `#299EAD` | Clear turquoise that contrasts with warm buildings |
| Water: deeper areas | `#216778` | Gives the brook depth and separates banks from reflections |
| Roofs and warm structures | `#C6533B` | Rich terracotta as a strong village landmark color |
| Paths and light wood | `#C89152` | Warm ochre that connects buildings and fields |
| Soil and wood shadows | `#765034` | Grounding brown for readable beds and material depth |
| Cherries and selected flowers | `#CE3F59` | Juicy focal accents for produce and planting |
| Reward gold: main color | `#E8AA24` | Strong honey gold for valuable objects and milestones |
| Gold: highlight | `#FFE18A` | Small bright glints and reflective edges |
| Gold: shadow | `#956020` | Shape and richness beneath the highlight |
| UI background | `#FFF0CF` | Warm cream reserved mainly for readable panels |
| Main UI text | `#392919` | Strong dark text against cream |

Use quieter broad terrain within this richer palette, with stronger accents on crops, fruit, characters, and selected roofs. Deeper shadows can make bright colors feel more substantial without raising the saturation of every surface.

Avoid a strong white haze or orange wash across the whole scene: either can erase distinctions among green leaves, red fruit, blue-green water, and warm roofs. Bright surfaces should retain their color and detail.

### Making gold feel attractive

Gold should have a clear purpose: a first harvest, a restored landmark, an important album memory, or a chapter celebration.

- Use a pale highlight, honey-gold midtone, and darker amber shadow to suggest a precious material.
- Keep ordinary harvest feedback small and satisfying; give milestones a more noticeable celebration.
- Use brief glints and restrained particles, with enough quiet around them to be visible.
- Keep small text dark on cream; use gold for selected icons, trim, and meaningful highlights.
- Let dusk introduce warm windows against cooler green and blue surroundings.

### Material and lighting direction

The sense of quality also comes from materials and lighting:

- Fruit can have a small glossy highlight.
- Wood and cloth can remain soft and matte.
- Gentle shadows can anchor buildings and characters.
- Water can combine a deeper body color with a few brighter reflections.
- A harvest can combine a short animation, restrained particles, and a satisfying sound.

A Slime Rancher 2 production case study illustrates how lighting and material treatment contribute to its vivid appearance. Hue alone does not explain the result. [Unity and Monomi Park case study](https://unity.com/resources/slime-rancher-2)

Retain strong dark-on-cream text contrast. Use icons and shapes alongside color to communicate readiness, selection, and problems. [Game contrast guidance](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/102)

### Three visual review criteria

1. **Richness:** at normal phone brightness, grass should look green, cherries red, and roofs terracotta. Sunlit surfaces should retain their color and detail.
2. **Clarity:** at the normal gameplay zoom, crops, paths, characters, and ready-to-harvest items should be distinguishable immediately. Check silhouettes and light–dark separation in grayscale too.
3. **Comfort and emphasis:** an ordinary scene should direct attention toward useful objects. Gold celebrations should stand out against the surrounding scene, while routine play remains comfortable to watch.

## 6. Interaction depth and game size

A larger download does not necessarily contain deeper play. Textures, audio, video, and other assets can account for substantial size. [Android's game-size guidance](https://developer.android.com/games/optimize/game-size)

For Hollowbrook, concentrate on several connected uses for familiar objects. The following are proposed extensions; they do not imply that every interaction is already implemented.

| Object | Proposed additional depth | Player decision |
|---|---|---|
| **Cherry tree** | Fruit supports selling, baking, gifts, and a picnic scene. | Which use matters today? |
| **Bench** | Extend existing NPC sitting with player invitations and location-specific scenes. | Create a quiet orchard corner or a welcoming clinic entrance? |
| **Fruit stand** | Featured produce attracts named visitors with preferences. | Sell a large batch or prepare a particular visitor's basket? |
| **Biscuit** | Build on crow chasing with petting, calling, and a simple patrol choice. | Where would his help be useful? |
| **Bakery** | Reserve a batch for trade, a request, or a community meal. | How should limited ingredients be used? |
| **Mailbox** | Some letters point toward an object to inspect or person to consult. | Which lead should the player follow? |

The rules should be discoverable. A character can mention liking orchard shade; placing a bench there then produces an understandable response. Hidden bonuses that require a guide would weaken that pleasure.

Objects can contribute in several ways:

- **Functional:** harvest, craft, store, trade, or help with work.
- **Expressive:** place, arrange, decorate, or personalize.
- **Social:** invite, give, share, remember, or receive help.
- **Ambient:** birds land, cloth moves, lamps illuminate, and flowers attract insects.

An object can help the world feel alive without requiring its own menu or recurring obligation. Additional choices should remain manageable, with useful defaults and a small number of understandable rules.

Preserve the project's phone performance targets: at most 120 draws and 300,000 triangles at every zoom. Richer interaction should build on reusable assets and bounded activity, with performance verified when implemented.

## 7. First episode to test: A quiet afternoon at the clinic

After the clinic opens:

1. Marisol asks for a pleasant place outside where people can sit.
2. The player chooses a bench location and some greenery, with several valid arrangements.
3. The player contributes fruit or a bakery batch.
4. Hazel and Ada use the space; Pip brings a drawing; Biscuit settles nearby.
5. A short conversation introduces a small clue about the brook.
6. An album memory records the occasion, and the seating area continues to appear in villagers' routines.

This episode tests story, decoration, production choices, character behavior, and visual rewards together. It should remain available without an expiry or penalty for taking time.

Its lasting reward is a place that people continue to use. The scene can also demonstrate the revised palette through green foliage, ripe fruit, warm wood, turquoise details, and a brief gold accent when the memory enters the album.

## 8. Recommended order before further implementation

1. **Settle story continuity:** distinguish the early school celebration from the later Harvest Festival and align Ellis's visit, return, and mystery clues.
2. **Create two visual concepts of the same village scene:** both should honor the requested richer color direction. Compare fresh orchard daylight with a warmer late-afternoon treatment, using the same layout and camera.
3. **Storyboard the clinic episode:** show player choices, the physical changes, character reactions, and the behavior that remains afterward.
4. **Run a small exploratory playtest when a prototype is authorized:** include adult casual players and parents with children. Check whether players understand the actions, remember a character, notice consequences, and identify something they want to return for.
5. **Use those findings to choose the next investment:** deepen the successful interactions before greatly expanding the region or item catalog.

An initial small test can reveal confusion and preferences; it cannot establish population-wide retention effects. Compare colors inside a gameplay scene as well as in still images, because readability and comfort matter during play.

This document records research and proposals. No gameplay or art changes are included in this documentation step.
