# Hollowbrook — consolidated implementation plan

Implementation update, 2026-10-09: [guidance, land and the food story](GUIDANCE-LAND-FOOD-DELIVERY.md) are live through PR #24, following the picnic trail/AR-010 release in PR #18. The [production and village growth slice](PRODUCTION-AND-VILLAGE-GROWTH.md) is implemented and validated, starting from `4377129` and integrating main `1add9a4`: independent trays, source-aware orders, explicit lake/plaza shop sales and the first optional hospital/police/company tier. **355/355 native tests, all pace targets, all 23 component browser suites, 28/28 smoke checks and eight production contexts pass.** The component result includes the corrected old cast fixture (9/9) after the initial 22/23 run and affected final-build reruns. All 20 new checks pass; production contexts cover four new growth and four existing optional flows in English/Vietnamese at 390/1280 px. Steady school/clinic remain day 3; production first-load code is **1,094,983 bytes**. The release PR records CI, Pages deployment and live verification.

Historical “covered land planned” paragraphs below describe earlier releases. One covered plot and ingredient/use cards now exist; broader regions, selective scenery clearing, skills/project-only energy, later civic tiers and later story chapters remain planned. AR-011 tracks dedicated civic art. AR-012 tracks menu pictures, real small icon files and the later compact HUD/status-stack integration; current round order tokens and full-size icon URLs do not complete that work.

Date: 2026-10-08 (Asia/Seoul)

Historical release baseline: **profiles and four discoveries shipped through PR #4 at `ab6b230`; adaptive advice and AR-009 icon integration are implemented and validated for [PR #6](https://github.com/buicongnguyen/Farm_village/pull/6).** The baseline [Pages deployment 37728932775](https://github.com/buicongnguyen/Farm_village/actions/runs/37728932775) passed. Merging into main triggers deployment; the [Pages workflow history](https://github.com/buicongnguyen/Farm_village/actions/workflows/pages.yml) records the production result. PRs #1 and #2 shipped the orchard logic and AR-001 look/feedback; PR #3 (`a1607de`) closes AR-001. The opening keeps 500 coins, three farm profiles and four one-time finds capped at 110 coins per save, with earned/read memories. The advice implementation adds 18 topic types and persistent acknowledgment/deferral; covered land, skills/project energy, vehicles and later regions remain planned. See [PROFILES-AND-DISCOVERIES.md](PROFILES-AND-DISCOVERIES.md) and [CODEX-TASKS.md](CODEX-TASKS.md) for scope and validation.

Previous release, PR #18: **the picnic trail and AR-010 integration are complete and validated for [PR #18](https://github.com/buicongnguyen/Farm_village/pull/18)**. Staged box/tin world taps, three bilingual memories, one stored flowerpot, earned/read progress and arrival-gated favours were implemented. That release preserved updated icons, lower truck prices, herb/ginseng, orange/coconut/willow, the juice press/noodle factory and growth/company plans. Validation: 261 native tests, pace targets, 19 component suites, 28 smoke checks, 8 final discovery checks and four local production acceptance contexts. [DISCOVERY-TRAIL.md](DISCOVERY-TRAIL.md) gives its scope; the PR records deployment/live acceptance. Covered-area progression was still planned at that point; the current update above implements its first bounded branch. Selective scenery clearing, skills/project energy, major vehicle restoration and later chapters remain planned. Earlier branch/status paragraphs below are historical.

Repository: `Farm_village`, Three.js and plain JavaScript ESM. The original review used `codex/v0.4-orchard` at `f0d8886`; the completed orchard, roadmap, kennel, clinic and first contextual-dialogue pass are now live. Visitor/saved-news review fixes (`b03c38c`) and profiles/discoveries shipped in PR #4. The advice delivery used `codex/village-advice`, based on main at `ab6b230`. Current work is isolated on `codex/production-village-growth`; unrelated mobile changes in the original checkout remain untouched.

Coordination update, 2026-10-08: the user asked to continue implementation and deploy ready changes; the PR #4 baseline is live. The next bounded delivery implements adaptive business/blocker/activity advice and three earned celebration memories, with 72 bilingual content/control strings and save version 7. Validation: 229 native tests on the combined advice/art tree and all pace targets pass, steady school and clinic day 3; all 17 component browser suites and 28/28 smoke checks passed on the advice build. Final first-load code: 1,005,608 bytes test / 1,004,534 bytes production. Advice/discovery suites were rerun in both languages after icon integration; a dedicated AR-009 check passed all 12 cards across phone/desktop and English/Vietnamese, including fit, 256 px icons, no payment on reading, no GLB loading and no errors. Claude Code owns art and visual treatment, and Codex owns logic, UI behavior, story and Vietnamese under [AGENTS.md](../AGENTS.md). AR-001 is closed; the [AR-009](CLAUDE-DISCOVERY-HANDOFF.md) WebP icons are integrated for PR #6, while its GLB remains available for future 3D presentation. The [reference-game comparison](REFERENCE-GAME-COMPARISON.md) separates observed reference behavior from recommended future work.

This is the single starting document for the next implementation work. It combines the research and subsequent design discussion. **Latest explicit user decisions take precedence, followed by this plan, then the older research notes.** Existing implementation status remains in [JOURNEY.md](JOURNEY.md); character and language rules remain in [STORY.md](STORY.md).

It also incorporates the user-supplied Claude research after checking its major code claims and evaluating its evidence. The detailed adopt/adapt/defer review is in [CLAUDE-RESEARCH-REVIEW.md](CLAUDE-RESEARCH-REVIEW.md). New story and interaction proposals from that review are recommendations, not newly confirmed user requirements.

## 1. The experience we are building

Hollowbrook should welcome a broad audience like Hay Day: adults, children, and families who may enjoy the same game at different levels of depth. Solo play should feel rewarding because the player chooses useful work, changes familiar places, learns capabilities, and sees villagers respond.

Start with a small, understandable farm. The surrounding valley is partly covered, with a few intriguing landmarks. Ordinary play earns enough to continue; small discoveries help the player explore another interest. New land reveals useful places gradually. Skills and optional larger projects add depth as the player becomes comfortable.

The central loop is:

> Farm, help, or explore → notice an opportunity → make a clear choice → gain a useful result → see the village respond → discover another possibility.

The game should support several kinds of satisfying day: farming and decorating, earning through thoughtful business, fishing and exploring, or helping people and learning. These are flexible interests, not permanent classes. All can contribute to the shared village story.

More objects and a larger download do not automatically create depth. Prioritize objects with several connected uses and places worth revisiting. A cherry can become a sale, a recipe ingredient, a gift, or part of a family picnic; each use offers a different reason to care about the same tree.

### Why solo play should feel worthwhile

Design for choice, competence, and connection: let the player choose a manageable goal, understand what their action accomplished, and see people remember it. Research on motivation supports these as useful lenses, but does not prove that NPCs replace human relationships or that a particular feature causes greater well-being. [Original motivation research](https://selfdeterminationtheory.org/SDT/documents/2006_RyanRigbyPrzybylski_MandE.pdf), [Animal Crossing telemetry and survey study](https://pmc.ncbi.nlm.nih.gov/articles/PMC8074794/).

Provide comfortable stopping points: an optional porch moment, a short account of what changed, and one saved idea for next time. A welcome-back message should express affection without guilt about time away. These moments are dismissible and do not delay leaving or resume a missed-chores checklist.

Let care add pleasant responses without introducing animal suffering, crop damage, or punitive absence mechanics to justify a new feature. Visible gifts, a planted tree label, a repaired bench people use, and a before/after album page can make progress personal. Collection and discovery remain optional; essential recipes and route requirements must be explained directly.

## 2. Decision register

| Topic | Current direction | Status |
|---|---|---|
| Audience | Broad adult/family appeal, approachable for children and less experienced players | Accepted direction |
| Opening money | **500 coins** in the normal restored-village start | Confirmed; already matches current rules |
| Lucky discoveries | Small surprises connected to actual effort and exploration | First four live through PR #4; broader discovery systems remain planned |
| Introductory treasure budget | Four one-time finds totaling at most **110 coins per save**, plus unchanged 500 start | Live; release rules, pace and browser checks passed |
| Story tone | Hopeful, happy, personal; villagers notice progress and help with real opportunities | Confirmed direction |
| Color | Richer greens, terracotta, turquoise, deep shadows, vivid produce, selective gold | AR-001 delivered and production-checked; retain the art lane's treatment |
| Guidance | Useful opportunity or blocker, enjoyable activity, and achievement recognition | Confirmed direction |
| Notification treatment | Small vivid badge on an existing entry point | Discovery unread count shipped in PR #4; combined unread advice/discoveries and saved deferral are implemented and validated for PR #6 |
| Land | Cover unbought or undiscovered areas; buying or exploring reveals useful content gradually | Confirmed direction |
| Vehicles | Consider bicycle, tractor, motorbike, car, and truck activities | Requested direction; roles and sequence proposed |
| Skills | Learn new planting, cooking, product-making, and repair capabilities | Requested direction; progression model proposed |
| Energy | **Larger exploration and repair projects only; everyday play remains available** | Explicitly confirmed by the user |
| Energy numbers | Capacity, costs, recovery rate, and rest duration | Unset; tune with actual project content |
| Story theme | “Where the Brook Begins”: family, the brook, and a village remembering its past | Recommended synthesis of Claude's research; detailed canon below is proposed |
| Lantern festival | Develop the planned restored Harvest Festival into a visible gathering, with a possible Mid-Autumn-inspired lantern activity | Recommended later scope, not a confirmed calendar event |
| Housing | Farm-focused opening; consider substantial later housing investments | Evaluation needed; no approved blanket price increase |
| School | Existing route, eventual entry, optional learning activities and contests | Requested direction; one classroom activity recommended first |

Superseded ideas: a 1,000-coin start, a zero-coin start funded by an introductory jackpot, a 1,000-coin opening treasure, the pale primary palette, and energy costs for all everyday actions. Do not reintroduce them from older notes.

The earlier 500-versus-1,000 simulation was a historical, single-seed experiment. It does not validate discoveries, new housing prices, skills, energy, or the proposed land system.

## 3. Baseline to preserve

| Area | Foundation, with unreleased branch work explicitly marked | Implication for new work |
|---|---|---|
| Core architecture | Rules in `src/core` behind `act()`/`tick()`; data in `src/content`; views/UI separate | Extend the same boundaries |
| Main progression | Sequential farm projects, families, school, then clinic | Add optional branches without new mandatory gates |
| Roadmap | Current stage goal and next three unlocks already implemented | Extend it with truthful context; do not rebuild a second roadmap |
| Farm profiles and finds | Three isolated local farms; four one-time discoveries; earned/retired/read state and optional memories, all live | Keep profile state and payments independent |
| Orchard and Biscuit | Cherry tree, fruit stand, kennel and crow protection implemented | Give these existing objects more contextual meaning |
| Land | 4 × 4 parcel grid; at most two owned parcels; second parcel costs 500 at level 4; PR #24 adds useful clear ground and one optional planting-marker memory | Preserve old parcel choices; more purchasable land and broader reveals need explicit progression work |
| Existing cover | Unowned parcels have tall grass, saplings, rocks, fences and signs | Replace abrupt purchase dressing changes with deliberate reveals |
| Clearing | Owned/buildable weeds and rocks, including batches | Wild scenery trees are not presently harvestable obstacles |
| Vehicles | Working animated truck fleet; current branch adds optional company requests using those same trucks | Preserve ordinary deliveries; tractor gameplay and other vehicle systems remain new work |
| Buildings | Cottage/farmhouse repairs, school and clinic are live; current branch adds hospital upgrade and fixed-site police/company reopening | Complete branch verification; later visual tiers and playable interiors remain future work |
| Production and customers | Juice press (level 6), noodle factory (8) and Lan's picnic menu are live; current branch adds parallel trays and explicit kiosk/plaza basket sales | Keep saved batch schedules, held goods and quotes accurate; avoid a simultaneous global rebalance |
| Fishing | Permanent village pond available from the opening | Do not put existing fishing behind new land, skill, or energy gates |
| Experience | General XP and level unlocks already exist | Dedicated skill tracks and energy are new |
| School | Level 6, two families with children, 24 bread, 10 corn bread and 4,000 coins after prior projects | Protect its timing and ingredient availability |
| Clinic | Later project with four settled families, 12 bread, nine cherries, and clinic construction | Preserve its relationship to housing and the orchard |

### Baseline issues and current ownership

The following findings were recorded against pre-pass `f0d8886`. The live first logic pass fixed clue ordering, the false Ellis-homecoming letter, and the unused-neighbour-remarks path; it also added fruit/rare-catch sound cues and truthful collection metadata. AR-001 subsequently delivered collection effects and truthful stall-wallet presentation. A visible festival remains future story work. The list preserves the reasons for those tasks rather than reporting them all as current defects.

- **Clue ordering:** several letters depend only on catch, trip, or quest counts. They can reveal the sluice or its supposed solution before earlier facts; mailbox insertion can also put simultaneously eligible letters in reverse narrative order.
- **Story/world mismatch:** Ellis remains absent from the playable village even when his final festival letter says he has returned. The present festival grants rewards and records progress, but lacks a visible gathering or playable payoff.
- **Unused content:** Mai and Gus have ten authored contextual remarks between them that the current selection path does not use.
- **Stall feedback:** a sale animates coins toward the wallet while the actual proceeds are still waiting in the stall. The accounting is correct; the presentation implies collection too early.
- **Fruit feedback:** fruit picking changes the tree and saved state, but lacks dedicated collection flyout/sound/juice handling. Rare fish also lack differentiated celebration.

These findings are narrower than some of Claude's original claims. Biscuit's chase behavior, existing world-space gold, the player's name in some UI, and faded building variants already exist. Fish already support sales, gifts, goals, favours, and the album; their gaps are regular order generation and recipes. Chapter cards ending at 5 are the current release boundary, not evidence that all later writing is absent. See the linked review for code references.

The starter parcel `0,2` is on the farm's west edge. An east farm branch and a north/public-path branch fit the existing arrangement better than promising purchasable farmland literally on both sides. Exact new placement must be checked against roads, buildings, and paths.

## 4. Opening and longer progression

### Opening experience

1. Arrive with 500 coins and a clear home area. Introduce one successful farm action and its result before presenting multiple investment choices.
2. Keep essential routes and the village pond available. Partly cover neighboring areas, leaving two understandable invitations at the edge of attention.
3. Let a successful action reveal a modest surprise or a clue. The player can experience this before buying a second parcel.
4. Show one relevant next option: fill a real order, continue a repair, try fishing, or inspect a nearby clue. The player can ignore it comfortably.
5. A villager acknowledges what actually happened. The previous hint retires or changes.
6. When land purchase becomes eligible, preview its purpose and price. Purchasing provides useful space immediately, followed by smaller discoveries and optional projects over time.

This is an experience sequence, not a claim that every player should reach level 4 within a fixed number of minutes.

### Development structure

```text
Home farm and family — 500 coins
│
├─ Existing village story: repairs → families → school → clinic
│
├─ Growing/business interest
│  useful batches and sales → current orchard
│  → eligible east parcel purchase → usable space + local discovery
│  → later new planting skill / workshop / tractor project
│
└─ Exploration/leisure interest
   existing pond + accessible clue → authorized entrance clearing
   → brook or old-house pocket → memory / activity / skill lead
   → later route, dock, outing, or different region

Later learning and transport connect branches without permanently locking choices.
```

Only show a small number of actionable opportunities at once. Keep farther places as silhouettes or named promises, and label content that is still planned. Build the valley's content and connections in advance while revealing activities at an understandable pace.

## 5. Story, character memory, and both languages

### Story direction

Keep the existing premise: the player returns with June and Pip to Ada's fading mill village and helps it become a home again. Let prosperity appear as active places, family routines, useful work, and gatherings.

Use a gentle chain of discoveries: an old object recalls a person; a person explains a place; restoring the place enables an activity; that activity leads toward another part of the valley. The old mill, brook, family memories, and machines already provide connections. Do not replace the current story with unrelated treasure chests everywhere.

Happy does not require constant cheering. Preserve quiet memories, small jokes, Gus's grumbling affection, and distinct personalities. A celebration should describe a consequence: a person uses the new place, a family has moved in, or the first useful delivery is complete.

Resolve the existing Ellis timeline before extending later chapters: the proposed continuity is a short school-celebration visit followed by his later permanent return around the restored Harvest Festival. Check the actual scenes and letters together; do not imply that he has permanently returned twice.

### Proposed unified story: Where the Brook Begins

Use the theme of remembering the source of the village's life, with a small question resolved in each episode. Keep the main water mystery and Gus's personal history distinct:

- **Water thread:** the city flour company's land and water control explain the closed sluice. The village learns the facts, agrees a cooperative solution, settles access/rights, repairs the mechanism, and opens it through an actual player action.
- **Gus's thread:** his shame concerns the lantern-stage fire; later evidence reveals that he saved children. Gratitude and the rebuilt festival resolve that story.
- **Baseline revision, now completed in the first logic pass:** the current letters no longer attribute a decades-old sluice closure or a complete key solution to Gus. Do not invent extra locks or incidents merely to preserve older contradictory lines. Later chapters must follow the same chronology in both languages.

The report's twenty- and thirty-year references concern different incidents; they are not a verified direct date contradiction. Use an explicit story fact sheet for event, order, participants, dates if necessary, and what each character knows. A new-looking padlock can be a maintenance detail once explained; its appearance alone must not imply a second unresolved mystery.

The eight stages are progression groups, not the same numbering as the existing chapter cards:

| Journey stage | Episode question / contribution | Visible payoff |
|---|---|---|
| 1. Homecoming | How can this place feel lived in again? | Working farm corner, a first family, a lit window |
| 2. Orchard | Who will share the fruit and shade? | Tree, useful harvest, family keepsake or planting label |
| 3. Meadow | What lies beyond our boundary, and who owns the land upriver? | Useful purchased land and an ownership clue |
| 4. River | Where does the path lead, and what blocks the channel? | Accessible bank/dock and an observed closed sluice; local tidying only |
| 5. Village | What can the restored village do together? | Classroom activity, visible care at the clinic, festival preparations |
| 6. Company/community work | How can shared work restore the water and the gathering place? | Rights and repairs resolved before water flows; mill movement; rebuilt festival and Gus's recognition |
| 7. Pine Ridge | Who lives farther up the valley, and what matters to them? | A distinct community and useful new routes |
| 8. Valley of plenty | Where does the brook begin, and what have we built together? | A spring walk, family gathering, and a thriving valley that gives back |

Do not show the whole river recovering at stage 4 if resolving the sluice remains a stage 6 objective. Keep current fishing available throughout; later ecology changes add scenes or opportunities without removing existing catches.

### Clue dependencies and visible endings

```text
Brook introduced and first concern acknowledged
  → ownership evidence available and encountered
  → relevant river route reached; closed sluice inspected
  → cooperative resolution plan introduced
  → rights/access settled + mechanism repaired
  → player opens gate → water/mill change + acknowledgment

Festival poster encountered
  → Hazel's account → Ada's preserved letter → Gus acknowledges the past
  → rebuilt stage → public gratitude at a visible lantern gathering
```

Catch or quest totals may make a hint eligible, but cannot independently reveal later facts. Record prerequisite facts, region access, and relevant chapter state. Skipping a presentation acknowledges the beat and keeps its text in the notebook; players should not have to reread mandatory dialogue to continue core farming. A notebook shows discovered facts and the next known question, not a list of every hidden answer.

Give Ellis a real presence for an authored visit or change the letter so it does not falsely claim one. His permanent return later requires a home routine and dialogue state. Update tests that intentionally enforce his current absence when that supported story stage is implemented.

Lantern-making is a strong candidate for the restored festival. If the event explicitly uses Tết Trung Thu, establish who brings that tradition to this multicultural village, such as Lan's family inviting neighbors. Keep the earlier school celebration distinct. A later Tết gathering is optional future content, not required for the main ending.

Defer literal aging of Pip, adding the player's absent parent, and a four-generation finale. Let Pip grow in confidence and participation first. Defer a mandatory *Ăn khế trả vàng* scene before a business choice; if used as optional family storytelling, it should not predetermine which economic choice the game considers virtuous. Meaningful business alternatives need understandable benefits without punishing the player through lost friendships.

### Dialogue work

The table records the original review targets. The live first logic pass fixed order-first chatter, June's branch, actionable advice, school/clinic context, unsupported watering reminders and the silent player's tap. Persistent earned/read records for four discoveries shipped in PR #4. The current advice branch implements saved topic/context acknowledgment and deferral; broader object discovery states and more character-specific dialogue remain planned.

| Situation to review | Required behavior |
|---|---|
| Repeated order-first chatter | Allow ordinary conversation and an explicit request for advice; do not make every tap a repeated order reminder |
| June's advice branch | Completed: route taps deliberately to advice selected from available actions |
| Empty-bed advice | Invite planting without treating leisure as failure |
| Claim that an order is always completable | Check the order; otherwise explain an achievable ingredient or offer another activity |
| Bo asking if school will open | Select a post-opening line after the school opens |
| Marisol's clinic friendship scenes | Provide coherent pre/post-clinic variants across the whole sequence |
| Generic watering reminder | Remove advice for a watering chore that does not exist |
| Gus's standards line | Keep personality while making the request friendly and relevant |
| Hidden-object hint after discovery | Acknowledge inspection, restoration, and use instead of repeating the original clue |
| Generic speech when the player figure is tapped | Completed: respond silently with a wave under STORY.md's player rule |

Use authored lines selected by game facts. Save a bounded topic history across sessions. Changing words alone is insufficient if the same subject keeps returning.

### Language requirements

Every shipped screen string, `t()` key, refusal from `ctx.fail()`, and content line needs Vietnamese coverage. Preserve complete meanings before shortening text for a phone. Use the established glossary and interpolate translated names correctly.

**English must be equally adaptive.** Select a stable topic/scene ID from the farm's state, then render its authored English or natural Vietnamese version. Both languages use the same prerequisites, useful-action ranking, blockers, clue order, achievement state, reward eligibility and repetition policy. Vietnamese may change sentence structure and forms of address; neither locale may invent a missing building, reward or relationship.

Changing language must preserve progress, reward markers and conversation/news history. Store stable IDs and context versions, not rendered sentences; unread state, cooldowns and dismissal must remain unchanged by language switches. The current advice branch implements persisted read/postponed IDs for its 18 topic types; ordinary conversation bags and previous-topic variation remain session-only. Wider conversation history and any future cooldown system remain planned. Existing news remains bounded event data, with compatibility handling for older payloads.

Acceptance: exercise each new condition before/after completion in **both** languages, including unavailable ingredients, a removed/broken building, a completed clue, an already claimed reward and a repeated visit. Test the selected topic as well as its rendered sentence. A changed greeting must not masquerade as new advice. Verify phone fit and that switching locale cannot repeat a reward.

The first logic pass supplies shared selectors for English/Vietnamese advice, school/clinic context and ordered clues. The shipped follow-up review covers visitors whose farm facts change while they walk. The current advice branch adds the first persistent advice-card lifecycle and retained first-bread/school/clinic memories. Broader scene systems and story chapters beyond the existing chapter 5 remain future work.

See [CHARACTER-NAMING-PLAN.md](CHARACTER-NAMING-PLAN.md) for the full cast proposal, including replacing Pip. Names there are proposed display text, not yet applied. Stable IDs, family relationships, pronouns and the player's chosen name must survive the eventual change.

Key relationships: Ada **bà–cháu**, Ellis **ông–cháu**, Gus **bác–cháu**, June refers to herself as **June** and addresses the player as **mình**, Pip uses **con**, and Bo uses **cháu**. Ellis and Gus never use **tôi** for themselves. Hollowbrook is **Thung Suối**; Biscuit keeps his name. Follow the full cast table in STORY.md.

Draft contextual example after a tractor becomes visible:

- EN: “It is a tractor! Can it help in our field?”
- VI, Pip: “Máy cày kìa! Nó giúp nhà mình làm ruộng được không?”

No character may refer to someone not yet introduced, except the existing Ellis exception. The player remains silent under STORY.md's rule; the first logic pass removed the generic on-tap speech. Final story scenes follow the existing scene format; isolated sample lines are not finished scenes.

## 6. Rich orchard art direction

The user rejected the pale direction. Use stronger local colors and deeper shadows, with cream mainly in UI. These are proposed starting colors, not final rendered material values.

| Role | Color |
|---|---|
| Grass midtone | `#67AA3D` |
| Foliage midtone / shadow / sunlit leaves | `#438448` / `#285C3B` / `#A2C954` |
| Water main / deep | `#299EAD` / `#216778` |
| Terracotta roofs | `#C6533B` |
| Warm wood / earthy shadows | `#C89152` / `#765034` |
| Path test candidate | `#DFBD87`, with darker edging; compare in the rendered scene |
| Cherries and selected flowers | `#CE3F59` |
| Gold main / highlight / shadow | `#E8AA24` / `#FFE18A` / `#956020` |
| Panel background / text | `#FFF0CF` / `#392919` |

Keep broad ground quieter than fruit, characters, and useful objects. Retain color and detail in bright surfaces; avoid a white haze or orange wash over the whole active scene. Distinguish glossy fruit, matte wood and cloth, and deeper water with a few bright reflections.

Gold should mark a meaningful clue or milestone. Pair a brief glint with a clear object and optional hint; do not depend on a fleeting sparkle to make something findable. Stop the discovery glint after inspection. Support reduced motion and use labels/shapes alongside color.

Review matching phone screenshots at the home farm, orchard/covered boundary, and clinic, including dusk and several zooms. Check recognizable colors, grayscale silhouettes, readable text, and comfortable emphasis. Lighting and material treatment need review in the rendered game; a palette swatch alone cannot establish the result.

### Improvements from the color review

Claude correctly identifies a value-separation concern, but its ratios measure flat color swatches rather than the rendered game. Our previous proposed grass `#67AA3D` and path `#C89152` also have similar swatch luminance, about 1.03:1. Keep that ochre for wood and test a brighter warm path such as `#DFBD87` (about 1.59:1 against that grass), plus darker edges and geometry. These are comparative art measurements, not accessibility pass/fail ratios for terrain.

Test a cooler daytime fill against the warm sun without bleaching greenery or skin tones. Compare selective dark backing, outlines, and rim highlights for important markers. Preserve the stylized renderer initially; a new metallic/PBR pipeline is not necessary for the first color pass. Gold particles, glints, and markers already exist and should be refined rather than described as missing.

Ruins already have faded/dusty variants. Improve recognizable before/after changes in selected places; do not turn the whole starting valley grey or withhold a pleasant blue sky until the finale. Gold may mark currency, useful attention, selection, clues, and celebration, including the agreed Village news badge. Red may communicate an error when paired with clear text, an icon, and a recovery action. Neither color has one universal cultural meaning.

### Celebration ladder

| Moment | Recommended response |
|---|---|
| Ordinary touch | Small local response where appropriate; no reward implication |
| Harvest or collection | Brief object motion, readable goods transfer, restrained sound |
| Completed order or rare first discovery | Distinct short success effect and, when relevant, a character response |
| Restored place, new family, or useful learned ability | Visible change, grouped news/memory, brief optional scene |
| Major chapter or festival | Authored gathering or tableau that can be skipped and revisited |

Match feedback to actual accounting: a stall sale marks proceeds waiting at the stall; collecting them sends coins to the wallet. Give fruit picking a proper collection response and distinguish a notable first rare catch from an ordinary repeated catch.

Coalesce simultaneous celebrations. Keep permanent records for meaningful milestones and first discoveries, while grouping routine repeat successes in bounded news history. Do not enforce arbitrary quotas such as exactly two celebrations per session or a universal five-percent gold limit. Avoid automatic full-screen flashes or world-light changes until comfort testing supports them. Feedback should make success easier to understand, without obscuring the next action. The cited effects studies support testing that connection, not one universal particle count or duration. [Kao 2020](https://www.sciencedirect.com/science/article/pii/S1875952118300879), [Kao and colleagues 2024](https://people.csail.mit.edu/dkao/pdf/3613904.3642656.pdf).

## 7. Advice, customer demand, and Village news

Implementation status: the first 18-topic subset is implemented and validated for [PR #6](https://github.com/buicongnguyen/Farm_village/pull/6); the Pages workflow records its production delivery. It covers current order opportunities and blockers, actual bread surplus, queued output, fruit stands, queue capacity, optional fishing, and three one-time milestone memories. Reading/postponing is saved per farm; “Show me” rechecks the current target and opens a preview without spending resources. This does not complete the later item-use cards or all proposed interactions below.

### Message categories

| Category | What the player learns | Appropriate action |
|---|---|---|
| Opportunity | A useful investment, sale, or production choice available now | Inspect the option and its benefit |
| Blocker | The specific missing requirement for the selected goal | View the ingredient, prerequisite, or place |
| Activity/discovery | Something enjoyable and accessible | Show the place or clue |
| Celebration | A meaningful result that has happened | Revisit the memory or see the changed place |

Begin with one useful suggestion. Let the player ask for more, choose a different interest, or dismiss it. Keep the active stage goal visible separately from the news badge.

### Truthful recommendation inputs

Evaluate inventory, goods already queued, explicit reservations, project requirements, real pending requests, recipe access, working buildings, land/access rules, coins, placement, and relevant skill/energy requirements. Explain what kind of benefit is being offered: money sooner, additional income over time, less repeated input, progress toward the village, or an enjoyable activity.

For bread oversupply, first subtract real commitments and consider queued bread. Find an actual unmet request for another currently feasible product. Suggest its missing input or production step. Once the right batch is queued, acknowledge it and offer another topic. Bread remains useful for families, school, clinic, and sales.

Use bread versus corn bread for an early example. Carrot cake is level 7 and needs milk as well as carrots and eggs; it is not an opening recipe. Do not invent customers, spoiled stock, falling market prices, or partial delivery mechanics to make the advice sound intelligent.

Economic advice must state assumptions. Current fruit-stand example: 80 coins to build; a cherry sells for 7 directly or 9 at the stand; one sale per 30 seconds. The incremental 2 coins covers construction after 40 cherries, about 20 minutes continuously stocked. Its 30-fruit capacity requires refilling, and this comparison excludes orchard setup and other orders/channels. It is not a universal best investment. A queue slot adds unattended capacity, not baking speed.

### Advice lifecycle

```text
Eligible topic → shown → read or deferred
    → underlying condition changes
    → acknowledge progress, update the blocker, or retire the topic
```

Use stable topic identifiers and revalidate before showing or acting on a suggestion. Group repeated symptoms, suppress stale topics, and remember deferrals across sessions. A visible advice action opens a preview; it does not silently spend the player's resources.

### Notification contract

- Extend the existing Today/Village news entry point. Use a compact, vivid badge and a comfortable touch target.
- The number means **new unread messages**, not incomplete jobs or unlearned skills.
- Reading clears the unread contribution; the optional project can remain in the panel.
- One underlying achievement creates one grouped news item even if several characters react.
- Retire obsolete advice; retain important celebrations in bounded history or the album.
- Offer actions such as viewing the reason, showing the place, and leaving it for later; localize their final labels.
- Use brief attention on arrival, not continuous flashing. Verify zero, one, and many-message states on a phone.

## 8. Small discoveries and the opening economy

Keep the normal 500-coin opening. Introductory discoveries should be designed milestones with a surprising presentation; they are not advertised as extraordinarily rare random events.

The following bounded subset is live through PR #4 (`ab6b230`). These are deterministic successful-action milestones, not random drops.

| Implemented discovery | Trigger | One-time reward |
|---|---|---:|
| Pond tin | Second successful catch | 20 coins |
| Pond keepsake | Tenth successful catch | 40 coins and a local fish-shaped brass button |
| Keepsake under a stone | Second actual owned-rock clearance observed by this system | 30 coins |
| Village thank-you | First completed restoration of Village Street (`road_south`) | 20 coins and dialogue |
| **Total additional introductory coins** | **Once per save** | **110** |

This narrow balance is selected for the current slice; future finds still need their own design and tests. Nothing repeats every ten catches or each day. The tenth-catch keepsake does not reveal a sluice clue, acknowledge an unread Ellis letter, or advance the ordered story. For old saves, the mixed clearing statistic cannot identify past rocks: count new rock clearances from zero.

Clearing two rocks currently costs 20 coins; road repair costs 40. The finds are small help alongside the useful action, not large profit engines. School Lane already exists and is not initially broken; this road reward refers to the damaged Village Street. A different school-route event needs its own design and budget.

Budget discoveries alongside the existing first daily gift of 50 coins, level-scaled goal rewards, doubled favours, 800-coin weekly rewards, 1,500-coin school festival reward, and Tomas's existing 50-coin tractor-seat scene. Do not duplicate that tractor reward through a new vehicle inspection.

Other finds can offer a memory, clue, decoration, recovered tool, or useful place. Do not give every cleared object a cash box. Required progression and recovery from poor spending must remain possible without treasure.

Implemented grants save each earned ID and its coins together. Successful batch threshold crossings and repair completion (including a helper finishing an underway restoration) pay once; starting repairs, refused actions, card reads, animations and reloads do not. Old saves retire known passed fishing milestones and previously restored Village Street without payout or earned album entries. Missing historical rock counts start at zero new observations. Earned, retired and read IDs are separate, so migration never invents a keepsake or loses an actual claimed record. Optional Today/Album cards acknowledge the find without another payment. The current advice branch extends that entry point with the initial persistent advice-card flow described in section 7.

## 9. Covered land and gradual discovery

### Presentation

Use cover that fits each place: grass and saplings on unbought parcels; brambles and fallen branches at an orchard entrance; reeds along a brook bend; ivy, a tarp, or boards at a workshop; overgrowth around an old porch. Reserve light mist and simplified tree bands for distant edges.

Leave a clue: a roofline, wheel, faded sign, water sound, or child pointing at something. An entirely blank cloud gives little reason to choose one branch over another.

### Purchase and access rules

```text
Covered purchasable parcel
  → inspect price, size, purpose, restrictions
  → eligible purchase
  → reveal usable land and one or two points of interest
  → local clearing / inspection
  → optional restoration or activity

Covered public/story area
  → accessible clue
  → clear an authorized entrance / repair a route
  → explore the pocket
  → use or restore a place
  → later connection
```

Discovery, access, ownership, and restoration are separate facts. Seeing public land does not grant build rights. Purchasing a parcel does not require uncovering every keepsake first. Do not let cutting a scenery tree silently grant land ownership.

A paid parcel must provide an immediate use. Reveal its shape and usable patch; disclose major restrictions and later costs before purchase. Additional objects may remain locally covered, but avoid charging for a parcel whose entire purpose remains behind undisclosed payments.

Use a few meaningful entrances and objects rather than dozens of identical clearing charges. Preserve mature trees and pleasant shade. Selective tree cutting can be introduced as an explicit rule-backed action; current wild trees are only scenery.

Each area needs a practical gain, a character connection, and a reason to return. Early choices should not secretly require each other. Keep a simple route home and clear landmarks.

### Rendering and saved worlds

Authoring the world in advance does not require drawing or downloading every detailed region at startup. Current distance fog is not discovery state and does not itself remove hidden render cost. Stage detailed instances and suitable asset groups explicitly, using existing batching and detail levels. Keep essential silhouettes lightweight.

Hidden content must not leak through interaction picking, income, advice, NPC routes, or building labels. Deliberately available services remain available. Old saves keep owned land, working buildings, fishing, and unlocked routes; new cover must not confiscate progress.

## 10. Interactions, old houses, and vehicles

Prioritize connected uses of existing objects before adding a large catalog.

| Object/place | Useful extension | Meaningful choice or result |
|---|---|---|
| Tree or orchard | Sale, recipe, gift, picnic, later new variety | Decide what the harvest supports |
| Bench | Location-specific rest or invitation scene | Create a quiet garden corner or welcoming public place |
| Fruit stand | Contextual named visitor or requested basket | Choose stock based on real supply and demand |
| Biscuit | Petting or a simple interaction alongside existing crow protection | A relationship with a pet that already has a job |
| Bakery | Clear reservations and actual demand advice | Allocate ingredients across personal, customer, and community goals |
| Old house/porch | Inspect a photograph, tin, sign, or tool | Begin a family memory before a large interior feature |
| Mailbox | Letter with a real accessible lead | Choose another thread to follow |

Not every scenery object needs a menu. Use functional, expressive, social, and ambient interaction where each adds value.

### Item uses and discoverable actions

Add a small “What can I do with this?” view to an item's existing details. List real available uses from the same rules as orders, recipes, gifts, and sales. Separate available, known-but-blocked, and planned content; do not advertise an unimplemented recipe as usable or reveal a secret automatically.

Start with four representative goods instead of requiring four to eight uses for every item:

| Good | Existing foundation to surface | Useful extension to prototype |
|---|---|---|
| Wheat | Plant/harvest, feed and bread recipes, sales and requests | Explain the production chain and reservations clearly |
| Bread | Sales, orders, gifts where appropriate, family/school/clinic needs | Optional crumbs or picnic use when that activity exists |
| Cherries | Sale channels, gifting, clinic donation, album | A preserve or a family sharing scene |
| Fish | Sales, gifts, album, fishing goals and a perch favour | Feasible regular fish requests or one authored fish dish |

Current regular order generation excludes fish and recipes do not consume fish. Any added fish order must remain fulfillable at the player's stage and avoid relying solely on a rare catch or narrow time window. New recipes require content, ingredients, UI, translation, and economy tests, not just a line in an item card.

Do not introduce spoilage to create “stale bread.” A future crumbs recipe can use deliberately selected spare bread. Ingredient experimentation should begin with a few explained recipes and previews. Defer an arbitrary three-item cooking slot: its fallback needs clear value, ingredient, inventory, and reward rules before it can promise that nothing is wasted.

### Small playful interactions

Prototype one repeatable low-cost interaction, such as petting a hen or ringing a repaired bell, with an expressive response that does not require a payout. Follow with tree shaking, a pond toy, or fetch only if it remains enjoyable and fits input/performance constraints.

Tap controls must remain clear. Hold can be an optional shortcut, with the same action available through a visible control. Cancel a hold when the player starts panning; keep drag planting and camera movement distinguishable. Defer flick-only stone skipping until gestures have been tested on phones. No secret gesture should be required for progress.

Visible gifts can be temporary story props near a recipient's home; account for their placement and rendering cost and prevent repeated economic credit. Before/after album pages should capture a restored place's real state. A simple authored keepsake comes before a dynamically generated drawing of the entire farm.

Optional care can produce delight without lowering baseline production when ignored. Biscuit already chases crows and current crows do not damage crop yields; do not add crop losses to make the dog seem useful. Daily limits on a proposed bonus may control payout, but ordinary pet play should remain available without a streak or expiring obligation.

Weather that adds occasional opportunities is a later candidate, after the core loops work. Do not add damaging storms, mandatory drought recovery, or time-exclusive essential fish to support the new story. Seasonal festivals should be replayable through a suitable in-game cadence rather than requiring a real-world date in the first version.

| Vehicle | Intended distinct role | Implementation position |
|---|---|---|
| Bicycle | Small repair lesson followed by a village errand or family activity | Candidate first playable repair project; define its use first |
| Tractor | Optional work on selected newly owned land | Existing model can be an early landmark; practical work follows later |
| Truck | Bulk sales and market deliveries | Keep the existing system; extend only with useful routes/contracts |
| Motorbike | Small courier errands or personal trips | Later, when different tasks justify it |
| Car | Family outings or travel to another region | Later, when a meaningful destination exists |

A tractor must offer something beyond current batch clearing, one-tap collection, and family help. One candidate is an optional work order preparing selected weeds on owned land while the player does something else; its cost and benefit need testing. Preserve crops and decorations.

Use one vehicle project at a time. Do not require buying bicycle → motorbike → car → truck → tractor in a fixed chain. Shared knowledge can open alternative projects. Fuel chores and driving physics are outside the first implementation scope.

Reuse the old tractor-seat story and the children's existing old-mill curiosity. Children provide concrete clues; adult characters explain repairs and costs. Introduce Bo, Tomas, and other residents before using their scenes.

## 11. Skills and project-only energy

### Permanent learning

Keep three compact proposed branches:

| Branch | Earn practice through | Possible new capability |
|---|---|---|
| Growing | Completed crop/fruit work and purposeful lessons | A future tree variety, grafting, or a special garden |
| Cooking/making | Completed useful batches and suitable requests | A new prepared ingredient, preserve, or specialty product |
| Repairing | Genuine repairs and practical restoration lessons | Bicycle restoration, then optional engine/vehicle projects |

General XP measures overall progress and is never spent to buy a lesson. Skill practice and learned abilities are permanent. Energy is temporary capacity for a larger project. Coins and ingredients retain their ordinary roles.

For new optional capabilities, prefer one understandable knowledge requirement plus normal materials and facilities. Avoid stacking farm level, skill level, tokens, tuition, rare treasure, energy, and a new building onto the same simple recipe.

Initially keep existing recipes, trees, starter repairs, and truck use under their current gates. Add skills to new optional content. Credit relevant prior work where reliable records exist; never ask someone to dismantle and rebuild an object simply to prove a lesson. Define migration where historical counters are insufficient.

Practice should not encourage piles of unwanted bread. Reward relevant completed work and purposeful lessons. Menu taps, failed attempts, canceled batches, reloads, or repeated inspection do not award practice. Decide explicitly how family help and batch actions contribute.

### Energy contract — confirmed scope

- **No energy cost:** planting, harvesting, feeding, collecting, normal cooking, selling, orders, basic fishing, conversation, ordinary school activities, decorating, inspecting hints, and returning home.
- **Keep current behavior initially:** small weeds/rocks and ordinary starting repairs.
- **Eligible future costs:** large fallen-tree removal, an overgrown route project, major vehicle restoration, or another clearly labeled optional work phase.
- At zero energy, ordinary play and earning continue. Production already queued and trips already underway continue normally.
- Show a project's complete intended costs before spending. Partial work remains saved; low energy causes no damage or lost materials.

### Generous recovery — proposed tuning direction

Start with a full reserve. Recover while doing ordinary activities and while away, up to a cap. Provide free accessible rest at home from the moment energy is introduced. Optional food can boost recovery later, but must never be the only escape from zero energy or consume reserved goods automatically.

Set capacity, costs, and recovery together after designing the work phases. The introductory project should fit comfortably within one full reserve. Check several optional projects in a long session as well as brief visits. Display the time until enough energy is available for a selected job.

If the meter never creates a useful choice, simplify it. If it repeatedly interrupts exploration, improve recovery or reduce costs. Introduce one compact energy bar when its first relevant project appears, with clear cost previews and calm feedback.

A learned ability produces one news item; using it successfully can produce a later acknowledgment. Do not count all available lessons as unread obligations.

## 12. Housing, school, and community activities

Keep the first required families affordable. Existing cottage repairs cost 90 coins each; new construction follows different prices. Raising every housing cost would delay characters, school, and clinic, rather than simply make the opening more farm-focused.

Use presentation and the first farm success to establish focus. Evaluate later homes and upgrades as substantial investments separately, including rent, family help, story access, and the timing of later households. No new housing prices are approved here.

School Lane and Civic Row already exist. Village Street starts damaged; School Lane does not. A future school-route improvement needs a real visible change and a defined rule, while preserving current access and the existing school pace. Do not treat the present school as inaccessible behind an imaginary broken road.

Learn basic farm capabilities before the school opens. Otherwise school-required bread could depend on attending a school that requires bread to reopen. Cora's teaching begins after her arrival. A simple optional pre-opening family activity can preview the learning interest without pretending the full classroom is available.

First interior scope: one usable classroom, one replayable activity, clear return to the village. Candidate activities include counting/matching produce, a nature collection puzzle, or optional English–Vietnamese words. Use an approachable version with optional harder challenges; do not require real-world homework to advance farming.

The first completion can give a modest keepsake and a specific Cora/child reaction. Repeat contests should be enjoyable without repeatedly paying the existing 1,500-coin school festival reward. Budget any new rewards explicitly.

As a later social test, build a quiet clinic afternoon around people using the restored place, a family interaction, and a visible consequence. This checks whether restored buildings feel inhabited before adding a second town.

## 13. Technical design boundaries

### Responsibilities

| Layer | Responsibility |
|---|---|
| `src/content` | Discovery definitions, region purposes, skill lessons, requirements, rewards, dialogue variants, tuning values |
| `src/core` | Read-only eligibility/calculation helpers; validated actions; resource accounting; progress and save state; timed work and recovery |
| `src/view` | Cover, silhouettes, reveals, vehicles, NPC reactions, particles, rendering activation and detail levels |
| `src/ui` | News badge/panel, reason and cost previews, skill page, energy display, navigation to the selected place |
| `src/i18n` | Complete Vietnamese strings and consistent names/pronouns |

Prefer shared rule calculations over UI estimates that can disagree with the actual action. The same prerequisite logic should serve a preview, recommendation, refusal, and execution where practical. Views and animation completion must not directly grant rewards.

### Saved concepts and later schema work

Live saves already retain per-profile discovery/trail progress, read/deferred advice, one land discovery and the
three picnic deliveries. The current branch's save version 10 adds stable production tray metadata, shared shop
request/cooldown records and bounded civic/company progress/payment ledgers. Existing serial batch deadlines stay
intact and loading grants no new reward. See [PROFILES-AND-DISCOVERIES.md](PROFILES-AND-DISCOVERIES.md) for the original
discovery API and [PRODUCTION-AND-VILLAGE-GROWTH.md](PRODUCTION-AND-VILLAGE-GROWTH.md) for current migration behavior.
The remaining concepts below are additional schema responsibilities, not replacement field names:

- Further discoveries: extend stable IDs and eligibility without reopening already settled rewards.
- Regions: knowledge, access, ownership through existing parcel rules, and optional restoration stages.
- Further news: extend existing stable IDs and unread/read/deferred history without recreating earned rewards.
- Skills: reliable practice totals, completed lessons, learned capabilities.
- Projects: committed resources, completed steps, active work and cancellation policy.
- Energy: current amount, capacity source, recovery timestamp, and versioned migration treatment.

Derive transient eligibility from current facts rather than saving duplicate truth that drifts. Set bounds for history without allowing a forgotten reward ID to become claimable again. Save irreversible discovery/reward markers independently of a removable notification card.

### Migration and failure behavior

Validate IDs, ownership, access, prerequisites, affordability, and placement before mutation. A refused action spends nothing. Handle repeated taps and completion events idempotently. Keep project progress and its resource/reward change coherent across save/load.

Preserve existing abilities and access on migration. The current discovery migration retires known past fishing/road milestones without retroactive grants or invented memories; actual earned records remain independent. Apply the same deliberate policy to future practice and milestones, with recovery from incomplete fields. Future offline energy needs a capped, consistent clock policy, including backward clock changes.

## 14. Implementation phases

Each phase should produce a playable result on a branch, with its own rules tests and browser checks. Assign release numbers when work begins; these phases do not claim that all content fits into one update. Phases 0–1, the profiles/four-find subset of phase 3, and phase 2's adaptive advice are live. PR #18 adds the accessible porch/pond trail; PR #24 adds ingredient/use cards, one useful covered plot and the connected food story. The current production/shop/civic slice extends existing business activities; it does not complete all of a later phase or chapter.

Implementation phases are delivery groupings, independent of Journey stage and chapter numbers. For example, implementation phase 7 includes the later story's stage 6 water resolution.

| Phase | Player-visible outcome | Main work and dependencies | Completion checks |
|---|---|---|---|
| **0. Baseline and content contract** | Existing v0.4 remains a stable starting point | Verify branch/PR state, tests, pace, save fixtures and reward ledger; finalize one story fact sheet and dependency order | Record real baseline; no speculative balance changes |
| **1. Correctness and readable feedback** | Story hints make sense; collection and money effects tell the truth | Correct clue prerequisites and mailbox order; rewrite or temporarily withhold obsolete Gus sluice-closure/key-resolution letters; align Ellis letters with supported presence; stall transfer effect; fruit feedback; rare-find distinction | Unusual progression orders, reloads, account balances, languages and reduced motion pass |
| **2. Useful village and item guidance** | Villagers remember results; players understand what goods can do | Persistent news/topics; wire eligible Mai/Gus remarks; initial demand/blocker advice; four representative item-use cards; one simple playful interaction; optional welcome/porch moment | No false or stale advice, gesture conflicts, repeated unread counts, or pressure to finish optional tasks |
| **3. Focused opening and small discoveries** | 500 coins, a clear farm success, small finds and reactions | Successful-action counters; atomic rewards; four implemented milestones and saved memories; further accessible clues remain future scope | New/old saves, batches, helpers and reloads work; reward ledger and pace pass |
| **4. Covered land and one revealed place** | Purchase opens useful space; exploration opens a small optional pocket | Region state; land preview; controlled cover/reveal; one discovery without buying land; old-house object or tractor landmark; before/after memory | Ownership/access remain distinct; no hidden interactions or blocked old saves; phone budgets pass |
| **5. One skill and one larger project** | Learn an ability, complete a useful repair, recover energy comfortably | Compact skills; one optional lesson/project with a real activity payoff; project-only energy and free recovery | Zero-energy normal play works; knowledge persists; no extra gates on existing story |
| **6. More uses, school, and visible gatherings** | Broader skill choices, classroom activity, inhabited restored places | One fish/product extension at a time; classroom and contest; clinic interaction; small school gathering and consistent Ellis visit | Pace and phone UI pass; no repeat milestone jackpots; appearances match story state |
| **7. Purposeful transport and valley resolution** | Vehicles serve worthwhile destinations; later story threads pay off | Useful tractor work, motorbike/car routes, truck opportunities, land progression, actual sluice restoration and rebuilt lantern festival | Distinct roles; coherent rights→repair→water sequence; visible family/character resolution; developed-world performance passes |

**Art track:** AR-001 established the richer palette, path-value separation, lighting and collection feedback. AR-009 supplies the discovery keepsakes; its WebP icons are integrated for PR #6 and its packed GLB is not loaded by those discovery cards. AR-010 is delivered through PR #13: a separate five-node exploration kit and ribbon icon. Codex integrated stage-dependent box/tin placement and explicit world inspection routes; future objects stay hidden and unpickable, and the pink butterfly-shaped ribbon matches the bilingual story. Combined rendering, loading, save and tap checks passed; the discovery delivery report records the results. Apply the established treatment to cover/reveals in phase 4 and vehicles/interiors as they arrive; review normal phone play after each asset addition.

**Completed live slices:** clue-order and truthful-feedback fixes, the look pass, contextual conversations, three
profiles, four bounded finds, adaptive advice, the truck fleet, the connected picnic trail/AR-010, arrival-gated
favours, ingredient/use guidance, one covered plot and Lan's three-batch food story. **Current slice, implemented and
validated:** parallel trays with legacy-save compatibility, actual shop customers, source-aware orders and the first
hospital/police/company loop. It keeps the current early prices, 500-coin opening and 110-coin discovery cap.

**Separate remaining work:** one learned skill plus one larger repair project with generous project-only energy and
free recovery; AR-011 dedicated civic icons/upgrade art; AR-012 small icons, menu pictures and compact status-stack
layout; meadow/dairy, broader regions, school activities, useful vehicle restoration and later chapters. Pearl/Bea's
introductions, Ellis's permanent return, the water-rights repair sequence and the visible festival are not completed
by optional company contracts. Later rows, especially phase 7, are groups of separate releases, not one PR or a size
estimate.

For every phase, record: accepted scope, content changes, saved-state migration, economy changes, player-visible result, rules/browser checks, and remaining tuning questions. Avoid combining a global rebalance with several new systems in the same first release.

## 15. Acceptance and validation

### Essential scenarios

| Scenario | Expected result |
|---|---|
| Player has spare bread but another feasible request is incomplete | Advice names the actual product/ingredient without consuming reserved bread |
| Needed batch is already queued | Do not request another unnecessary batch |
| School/clinic opens before a friendship scene | Dialogue matches the opened building |
| Three catches or six quests completed before earlier clues | A later confession or solution does not arrive out of order |
| Several letters become eligible together | Narrative dependencies and presentation order remain coherent |
| Stall sells an item before proceeds are collected | Waiting proceeds remain at the stall; wallet animation occurs on collection |
| Read an item-use card at an early stage | Available uses are real; unknown recipes and inaccessible people are not presented as actionable |
| Hold a playful object, then drag to pan | The hold cancels without an unintended resource action |
| News read, suggestion unfinished | Badge clears that unread item; optional suggestion remains accessible |
| Two characters react to one discovery | One grouped discovery notification and one reward |
| Batch clears across the second-rock threshold | Exactly one eligible reward; weeds and prefilled stats do not count as rocks |
| Reload during or after a reveal | Progress remains; no repeated grant |
| Buy covered parcel | Disclosed cost, immediate useful land, optional discoveries afterward |
| Inspect public area or unowned parcel | No accidental ownership, spending, resource taking, or building permission |
| Hidden region at wide zoom | No leaked pick targets or NPC paths; render budget still passes |
| Load a developed old save | Owned land, service access, recipes, truck, and pond remain usable |
| Zero energy and little money | Farm, cook, sell, fish and rest; no dead end |
| Learn a skill or cancel a project | Permanent knowledge and clearly defined resource accounting; no repeat XP exploit |
| Replay school activity | Enjoyable replay; no repeated festival jackpot |
| Reach the later water-restoration story | Water/mill payoff follows access/rights and repair; earlier fishing still works |
| Return after a long break | Warm welcome and saved opportunities; no guilt or new absence penalties |
| Ignore all optional branches | Existing village progression remains possible and satisfying |

### Non-negotiable checks

- School pace remains **casual ≤10 days, steady 3–4 days, keen ≥2 days**, using `npm run sim` and `tests/sim.test.mjs`.
- Measure **≤120 draw calls and ≤300,000 triangles** at every supported zoom, including reveal transitions and a fully developed scene.
- Test both languages, speaker pronouns, complete translation coverage, long dynamic text, reduced motion, and phone touch targets.
- Add a meaningful rules test and browser check for each new feature. Include failed-action no-mutation cases and save compatibility where relevant.
- Test normal core progression as well as different optional interests; a farming-only bot does not establish that energy or exploration feels good.

Run the repository's required checks when implementation begins, not as a claim of verification for these notes:

```powershell
npm test
npm run sim
npm run build:test
```

Serve the test build in a separate terminal:

```powershell
node scripts/serve-dist.mjs 5241
```

Then run the browser checks against that server:

```powershell
$env:GAME_URL = 'http://127.0.0.1:5241/'
node scripts/run-browser-suites.mjs
node tests/browser.mjs
```

### Human playtest questions

Can the player explain what is useful now, what they own, what a nearby clue leads toward, and what the next action costs? Do they notice that people remember their actions? Can they choose leisure without nagging? Does a purchased parcel feel worthwhile? Is there something enjoyable to do at zero energy? Does the richer art stay readable and comfortable on a phone?

Record observed confusion, repeated prompts, abandoned projects, time spent waiting, optional spending, and return visits to revealed places. Use those observations alongside simulations; do not claim that another game's success proves these features will retain Hollowbrook players.

## 16. Delivery rules and remaining tuning

Work on a feature branch and open a PR. **Do not push to main:** it deploys the live site. Check the current repository state and other contributors' commits before editing. Keep each release reviewable and playable.

### Two-lane ownership

| Lane | Checkout / branches | Responsibility |
|---|---|---|
| Claude Code, art | `../Farm_village-art`, `art/*` | Blender, models/icons/story art, palettes, lighting, gold, particle/celebration appearance |
| Codex, logic | Main checkout, `codex/*` | Rules, economy, progression, saves, UI behavior, story, Vietnamese, event semantics and tests |

Follow the exact shared-file boundaries in [AGENTS.md](../AGENTS.md). Codex does not change look values or author binary assets. Use existing models and permitted copied placeholder icons, recording the need in [ASSET-REQUESTS.md](ASSET-REQUESTS.md). The art lane replaces stand-ins in its delivery PR.

For shared effects files, identify the active writer and named functions before overlapping edits. Codex defines when a result happens and what its event means; Claude defines how it looks. A stall sale must show waiting proceeds, and actual collection must show wallet transfer. Preserve reduced motion and performance in both lanes.

The art lane uses `art/blender/build_farm_kit.py`, renders icons through `art/blender/render_icons.py`, packs GLBs with `art/blender/pack.mjs`, and records provenance in [ASSETS.md](ASSETS.md). Include generators, packed outputs, icons and registration together in a coherent PR. Test the delivered asset with its logic before merging to main, then verify the approved deployment.

Use port **5241** for logic checks and **5242** for art. Stop only the server process the lane started. Preserve the shared first-load code budget of **1.1 MB**, alongside draw/triangle limits.

**AR-001 is complete and live**; its old [handoff](CLAUDE-HANDOFF.md) is historical. [AR-009's discovery brief](CLAUDE-DISCOVERY-HANDOFF.md) is delivered and its icons are integrated for PR #6; production acceptance is recorded in the asset queue after verification. AR-002 remains proposed until meadow/dairy is chosen for a release. Narrow AR-003 by actual recipe needs; finalize the story before AR-004; make AR-005 reusable across Ellis appearances; avoid duplicating existing fades in AR-006. AR-007 has no approved release date. AR-008 requires the user's explicit decision; leave crop faces out of this pass. The current scope does not approve the rest of the queue.

After an implemented phase, update [CHANGELOG.md](../CHANGELOG.md) and the status table in [JOURNEY.md](JOURNEY.md) to describe what actually ships. This plan does not mark proposed work complete or authorize a production release during the documentation step.

The current four discovery amounts and triggers are chosen and implemented as a bounded 110-coin subset, with 500 starting coins preserved. This does not settle the remaining tuning: future discoveries, cover density and placement, energy capacity/cost/recovery, a first useful repair activity, skill milestones, later housing prices, and school rewards still need their own prototypes and validation.

## 17. Research and supporting notes

The comparison games provide examples of mechanics, not causal proof of attraction or a target demographic percentage:

- Broad reassurance and appeal across ages: [Supercell's Hay Day design description](https://supercell.com/en/news/nothing-bad-happens-in-hay-day/).
- Development through facilities, residents, and traversal: [Nintendo-hosted Animal Crossing guide, authored by GameWith](https://www.nintendo.com/jp/ichikara/acbaa/02_en.html).
- Clues, new areas, and character stories: [official Stardew Valley 1.5 notes](https://www.stardewvalley.net/stardew-valley-1-5-update-full-changelog/).
- Reactions to events and permanent learning rewards: [official Stardew Valley 1.6 notes](https://www.stardewvalley.net/stardew-valley-1-6-update-full-changelog/).
- Overall level unlocks and production-building experience: [Supercell production-building help](https://support.supercell.com/hay-day/en/articles/production-building.html).
- A separate replenishable energy system as a comparison: [Family Island energy help](https://melsoft-games.helpshift.com/hc/en/11-family-island/faq/1145-how-can-i-get-more-energy/).
- Fog and rendering visibility are separate concerns: [Three.js Fog](https://threejs.org/docs/pages/Fog.html) and [Object3D](https://threejs.org/docs/pages/Object3D.html).
- Illustrative value/color hierarchy and lighting: [Valve's Team Fortress 2 rendering paper](https://steamcdn-a.akamaihd.net/apps/valve/2007/NPAR07_IllustrativeRenderingInTeamFortress2.pdf). Its art choices inform tests, not a required farm-game palette.
- Motivation and feedback evidence is qualified in the linked research review; fixed sadness percentages, broad audience stereotypes, and rigid gold quotas are not implementation requirements.

Detailed background and draft content:

1. [RESEARCH-DIRECTION.md](RESEARCH-DIRECTION.md) — audience, story, art, and interaction research.
2. [DIALOGUE-AND-VILLAGE-NEWS.md](DIALOGUE-AND-VILLAGE-NEWS.md) — evolving advice, discoveries, and news behavior.
3. [OPENING-ECONOMY-AND-SCHOOL.md](OPENING-ECONOMY-AND-SCHOOL.md) — demand, housing, school, and the explicitly superseded 1,000-coin experiment.
4. [LUCK-AND-HAPPY-PROGRESSION.md](LUCK-AND-HAPPY-PROGRESSION.md) — current 500-coin direction, proposed reward budget, and English/Vietnamese dialogue revisions.
5. [EXPLORATION-AND-VEHICLES.md](EXPLORATION-AND-VEHICLES.md) — covered land, ownership, branching places, old houses, and vehicle roles.
6. [SKILLS-AND-ENERGY.md](SKILLS-AND-ENERGY.md) — permanent learning and the confirmed scope of energy.
7. [CLAUDE-RESEARCH-REVIEW.md](CLAUDE-RESEARCH-REVIEW.md) — evidence checks, corrected repository claims, and adoption decisions for the supplied report.

When an older recommendation conflicts with the decision register above, use this consolidated plan and the latest user instruction.
