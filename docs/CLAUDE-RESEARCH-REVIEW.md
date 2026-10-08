# Hollowbrook — evaluation of Claude's research and integration decisions

Date: 2026-10-08 (Asia/Seoul)

Input: the Claude research summary supplied by the user in this conversation. Its repository observations were made during unfinished v0.4 work. This review checks the main actionable claims against `codex/v0.4-orchard` at `f0d8886`, evaluates the cited evidence, and incorporates selected ideas into [HOLLOWBROOK-IMPLEMENTATION-PLAN.md](HOLLOWBROOK-IMPLEMENTATION-PLAN.md).

Status: documentation only. This review does not implement or fix the issues it identifies.

## 1. Overall evaluation

The report contributes useful ideas: a connected brook mystery, visible consequences, calmer session endings, richer object uses, a hierarchy of celebrations, and personal keepsakes. Those strengthen the plan because they connect actions to places and people the player already knows.

Several recommendations need adaptation. Current code has moved beyond some of the report's observations. Some psychological findings are associations or results from particular games, while some art and storytelling rules are proposed heuristics. None should become a universal requirement merely because a numerical claim or successful comparison game accompanies it.

The consolidated plan therefore keeps the user's latest decisions: **500 starting coins, small effort-linked discoveries, a richer palette, covered land, optional development branches, skills, and energy for larger projects only**.

## 2. Adopt, adapt, and defer

| Idea from the report | Decision | How it enters the plan |
|---|---|---|
| One coherent brook mystery | Adopt as proposed story direction | Use a story fact sheet, prerequisite clues, and an actual water-restoration payoff |
| Visible thanks and keepsakes | Adopt | Character reactions, selected visible gifts, before/after memories, inhabited restored places |
| Welcome-home and porch moments | Adopt | Dismissible, warm pauses without guilt, streak demands, or delayed exit |
| Value hierarchy and restrained success effects | Adopt | Rich color tests, readable markers, fruit/rare-find feedback, graduated celebrations |
| “Every good has four or more uses” | Adapt | Begin with wheat, bread, cherries, and fish; add useful combinations rather than meeting a universal quota |
| A useful-action card for each good | Adopt in small scope | Derive available uses from current rules and make blocked/planned uses clear |
| Hold-to-play | Adapt | Optional shortcut with a visible tap alternative and safe cancellation during panning |
| “Where the Brook Begins” | Adopt as a thematic proposal | Fit the existing family story and eight-stage journey; retain chapter numbering separately |
| Lantern Night | Adapt | A candidate visible payoff for the planned restored Harvest Festival; school celebration remains separate |
| “Cozy games should never have energy” | Do not adopt as a blanket rule | The user explicitly chose generous energy for larger projects, with ordinary play available at zero |
| Pale sand paths and cooler fill | Test locally | Preserve rich world colors; use brighter path value and cooler fill only where rendered comparisons improve clarity |
| Gold only for earned rewards; never on buttons | Adapt | Gold can also mark useful attention and selection, including the user's Village news badge |
| Never use red for errors | Reject as an absolute | Use context, text, icons, and a recovery action; festive and error treatments can coexist |
| Arbitrary three-ingredient cooking with a fallback | Defer | First define ingredient value, preview, inventory, recipe discovery, and reward accounting |
| Literal aging, absent-parent return, four generations | Defer | Substantial new canon and art; grow Pip's confidence and participation first |
| Weather, all vehicle types, annual festival calendar | Defer to later releases | Each needs a distinct activity, balance, save behavior, and phone-performance budget |
| No blue sky until the finale, full-screen gold | Do not make mandatory | The opening should already look pleasant; comfort and clarity govern large effects |

## 3. Repository fact-check

| Report claim | Finding at the reviewed commit | Implementation consequence |
|---|---|---|
| Fish never enter orders or recipes | Regular order generation excludes fish and no recipe uses them. Fish still have sales, gifts, album entries, catch goals, and a perch favour. | Add feasible fish requests or one recipe; do not describe the entire fishing loop as absent. |
| Golden carp receives the same pop as perch | No rarity-specific celebration was found; names/icons still identify the catch. | Add an appropriately restrained notable-find response. |
| Fruit picking has no feedback | The tree becomes bare and state/markers update, but dedicated sound, collection flyout, and juice handling are missing. | Add collection feedback rather than reimplement harvesting. |
| A stall sale pays before collection | The sale animation points toward the wallet, while real proceeds remain in the stall until collected. | Correct presentation; this is not a duplicate-money accounting bug. |
| Pets and crows do nothing | Biscuit chases crows with a working kennel; critters and scarecrows have reactions. Crows do not damage crop yield. | Extend playfulness without inventing crop losses to justify the dog. |
| Mai and Gus have unused remarks | Ten authored remarks exist; the current runtime selection uses comments and arcs instead. | Wire fact-eligible remarks into the dialogue lifecycle and test reachability. |
| The Settings name is never used | It appears in some player/pond UI, but has little narrative use. | Personalization is an optional extension, not a wholly broken setting. |
| Additional issue found during review | Tapping the player produces generic spoken lines despite STORY.md's silent-player rule. | Replace that speech with non-dialogue status/inspection feedback in the dialogue pass. |
| Ellis never appears | He remains away in playable-world spawning, while the last festival letter claims he is back. | Align letters with supported appearances and later implement an actual visit/homecoming. |
| Festival is only a message | It grants coins, XP and hearts, records a milestone, and triggers feedback; there is no visible gathering/activity. | Add story payoff while preserving one-time reward accounting. |
| Story stops at chapter 5 | Implemented chapter cards stop at 5; later chapters are already planned. | Treat future chapters as scope, not a defect in the completed v0.4 chapter. |
| Unrepaired buildings are full color | Dusty/desaturated condition and ruin variants exist. | Improve selected before/after contrasts rather than claim the system is missing. |
| Gold exists only in the 2D interface | World markers, ready rings, gold particles, glints, and additive glows already exist. | Refine existing effects; metallic/specular materials would be a separate experiment. |

Code references: [orders](../src/core/orders.mjs), [goods and recipes](../src/content/goods.mjs), [quests](../src/content/quests.mjs), [bonds and letters](../src/core/bonds.mjs), [fruit collection](../src/core/trees.mjs), [stall accounting](../src/core/stall.mjs), [collection effects](../src/ui/fx.mjs), [juice](../src/view/juice.mjs), [sound routing](../src/main.mjs), [people](../src/view/people-view.mjs), [neighbor selection](../src/core/neighbours.mjs), [authored remarks](../src/content/people.mjs), [markers](../src/view/marks-view.mjs), and [building appearance](../src/view/land-view.mjs).

## 4. The mystery needs clearer causality and ordering

The strongest story defect is that some letters can arrive from raw counters before prerequisite facts. Ellis's brass-lock letter needs only three catches; the earlier brook concern waits for chapter 3. Gus's confession can arrive after six quests without requiring the earlier clues or the school. The mailbox can also present simultaneously eligible letters in an unsuitable order.

There are conflicting explanations of the sluice: a new-looking lock, Gus's decades-old closure and retained key, and STORY.md's later water-rights purchase. The report's twenty- and thirty-year references are not a direct verified date contradiction: they refer to the undelivered festival letter and the sluice closure respectively. The history still needs one deliberate timeline.

Recommended canon for the next writing pass:

1. The flour company and water-control history explain the closed sluice.
2. Gus's personal secret is the lantern fire and his rescue of children.
3. Rewrite the conflicting early key/confession letters to fit that division; do not add multiple secret locks to preserve every line.
4. Region access and acknowledged story facts gate later revelations. Counts can prompt hints, not reveal a solution independently.
5. At the river stage, reveal the bank, dock, and blocked channel. The main water payoff follows the later rights/access agreement and physical repair.
6. Keep the early school celebration/possible brief Ellis visit separate from the rebuilt Harvest Festival and permanent homecoming.

See [letters](../src/content/letters.mjs), [heart scenes](../src/content/hearts.mjs), and [STORY.md](STORY.md). This is a proposed rewrite direction, not a change already made to canon.

Replace the question about Ada planting trees she will never eat from with “Who will share the fruit and shade?” It preserves intergenerational care without adding an unnecessary mortality premise or contradicting quickly fruiting cherries.

Lantern-making can bring children into a visible event. If specifically framed as Tết Trung Thu, introduce the tradition through a family in this multicultural village. Vietnamese localization alone does not make every resident culturally Vietnamese. A Tết finale, new parent character, aging system, and mandatory folk-tale scene remain optional later decisions.

## 5. Color findings and corrections

The reported contrast calculations are correct for the selected flat sRGB swatches: current gold `#F2B21C` against grass `#74D043` is approximately **1.029:1**, and path `#F0C070` against that grass approximately **1.151:1**. These are not measurements of the rendered scene, which includes multiple ground colors, noise, shading, geometry and lighting.

Our earlier proposed path `#C89152` against grass `#67AA3D` is also approximately **1.032:1**. The merged plan therefore keeps the rich palette but tests a brighter path, `#DFBD87`, at approximately **1.591:1**, together with a darker edge. The values identify a useful art comparison; they are not an accessibility certification for terrain.

Current daytime sun and sky fill are warm. Testing a cooler fill is reasonable, but its effect on shadows, skin, and wood must be checked in the actual game. Most world geometry uses toon materials rather than a specular/metallic surface model; that is different from saying nothing glints.

References: [palette/fog](../src/view/world-view.mjs), [ground coloring](../src/view/ground.mjs), [daylight](../src/view/daylight.mjs), [toon materials](../src/kit/toon.mjs), and [world markers](../src/view/marks-view.mjs).

Valve's rendering paper supports studying visual hierarchy, silhouettes, and cool-shadow/warm-light treatment in an illustrative style. It uses rim highlights rather than prescribing dark outlines for every object. Apply those lessons through comparisons suited to Hollowbrook. [Primary rendering paper](https://steamcdn-a.akamaihd.net/apps/valve/2007/NPAR07_IllustrativeRenderingInTeamFortress2.pdf).

The five-percent gold limit, fixed two-/three-second effects, and one-to-two major celebrations per session are proposed heuristics. They are not established requirements. Group simultaneous effects, keep important milestone records while bounding routine news, preserve reduced motion, and let the requested gold news badge remain vivid.

## 6. How strongly the research supports the recommendations

| Evidence | Appropriate interpretation | What it does not establish |
|---|---|---|
| Ryan, Rigby and Przybylski, 2006 | Autonomy and competence are useful motivation lenses; its relatedness study involved multiplayer. | That NPCs replace human relationships or any particular mechanic guarantees enjoyment. [Original paper](https://selfdeterminationtheory.org/SDT/documents/2006_RyanRigbyPrzybylski_MandE.pdf) |
| Animal Crossing/play telemetry study, 2021 | Adult surveys and telemetry found associations involving play, motivation and well-being. | That pressure causally makes players unhappy, or that the result directly applies to children playing with parents. [Paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC8074794/) |
| Project Horseshoe coziness framework | Safety, abundance and softness form a designer working group's useful framework. | A universal experimental definition, or a ban on the user's optional project-energy design. [Report](https://www.projecthorseshoe.com/reports/featured/ph17r3.htm) |
| Quantic Foundry player segments | Different groups favor different combinations of completion, design, story and discovery. | That most Hollowbrook players dislike exploration or smart combinations. [Researcher slides](https://quanticfoundry.com/wp-content/uploads/2020/08/GDC-2020-Slides-Player-Segments-Quantic-Foundry.pdf) |
| Kao 2020, 3,018 participants | In the tested action RPG, medium/high feedback conditions outperformed none/extreme on measured outcomes. | A universal effects quantity or timing for a farm game. [Primary article](https://www.sciencedirect.com/science/article/pii/S1875952118300879) |
| Kao and colleagues 2024, 1,699 participants | Success-linked feedback supported the measured motives; amplification reduced them in that experiment. | A simple result that louder audio is bad. The authors discuss effects obscuring later outcomes. [Author-hosted paper](https://people.csail.mit.edu/dkao/pdf/3613904.3642656.pdf) |

The report's Spiritfarer drama percentage and Sandrock completion percentage are developer interview statements, not measured optimal writing rules. The Gardenscapes engagement claim is company testimony, not a controlled test showing story caused retention. They can motivate questions, but should not dictate Hollowbrook's chapter count or an exact sadness ratio. [Spiritfarer interview](https://www.pockettactics.com/spiritfarer/interview), [Sandrock interview](https://www.respawnstation.com/2024/10/my-time-series-director-interview/), [Gardenscapes interview](https://gameworldobserver.com/2016/11/23/gardenscapes).

## 7. Resulting implementation priorities

First resolve the verified continuity, clue-order, and truthful-feedback issues. Run a small richer-color and lighting comparison alongside them. Then improve contextual conversation, the news lifecycle, representative item-use cards, and one playful interaction.

Next deliver effort-linked discoveries, covered land, and one useful revealed place. Follow with one learned capability and one optional larger project that introduces generous energy. Only then expand recipes, school activities, vehicles, and the later water/festival story into separate playable releases.

This ordering improves existing play before committing to a much larger world. The full dependencies, confirmed decisions, architecture, migration rules, tests, and delivery constraints are in [the consolidated implementation plan](HOLLOWBROOK-IMPLEMENTATION-PLAN.md).
