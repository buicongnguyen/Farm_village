# Hollowbrook compared with Xóm Nông Trại

Reviewed 2026-10-08, Asia/Seoul. Reference: [Xóm Nông Trại](https://nongtrai.jackle.dev/). Our game: [Hollowbrook](https://buicongnguyen.github.io/Farm_village/).

**Conclusion:** Xóm Nông Trại currently presents a more complete, recognisable Vietnamese farm in its opening scene, and explains missing resources particularly well. Hollowbrook already has useful farming controls, order guidance, a restoration story, and a generous economy. Its biggest opportunity is to make those strengths visible together: a convincing home farm, one useful next decision, and people who remember the result. Adding more currencies, reward popups, or map size would not address that gap.

This report supplements the [implementation plan](HOLLOWBROOK-IMPLEMENTATION-PLAN.md). It proposes priorities; it does not approve new art, replace established rules, or claim the later roadmap is implemented.

## What was actually examined

- Played the reference as a fresh guest: selected Đà Nẵng, harvested a ripe rice plot, replanted rice, inspected crop choices and truck orders, delivered a rice order, opened missing-ingredient help, inspected land and machine catalogues, the reward panel, and settings.
- Examined both games at 1440 × 900 and 390 × 844 browser viewports. These are desktop Chrome screenshots at two viewport sizes, **not tests on physical phones**.
- Reference settings displayed version `c953609`. Hollowbrook's production comparison baseline is PR #4, merge `ab6b230`: profiles and four discoveries are live. Persistent advice was in development during the comparison and is evaluated separately from that live baseline.
- Checked Hollowbrook's current rules, content and existing plan to distinguish implemented mechanics from proposals. The current staged advice work does not count as evidence that production already had it.
- This was an opening-session inspection. Later reference content was visible in catalogues but not unlocked or played. No audience analytics, revenue, retention, complete English-language audit, long-term balance, load-size benchmark, or offline-loss experiment was available. A displayed regional player count is not a verified audience statistic.

## Comparison

| Area | Xóm Nông Trại: observed | Hollowbrook: current foundation | Assessment and action |
|---|---|---|---|
| Identity | Vietnamese hometown selection; rice, bamboo fencing, clay jars, a tiled courtyard and Vietnamese house forms. Some catalogue workshops depend on the selected region. | An imagined village, family homecoming, Ellis's letters, and rebuilding civic places; English and Vietnamese share the same world. | The reference communicates its setting immediately through objects. Give Hollowbrook an equally recognisable home and brook identity through its own architecture, keepsakes and inhabitants. |
| First action | Highlighted ripe rice and a short guide prompt; the next prompt changes to planting, then fertiliser. A voice-replay control is available. | Ada's welcome, ripe wheat, a tutorial pointer, and a Next control that can collect ripe crops. | Both have guided first actions. Shorten competing opening messages and connect each instruction to one visible result. |
| Farm composition | House, courtyard, plots, animals and pond form an understandable cluster. | The opening camera emphasises a long row of beds and broad bright grass; much of the village lies outside the frame. | Reference has the stronger sense of a settled place in the inspected opening. Reframe and connect the home area before adding many new objects. |
| Orders and blockers | The board showed 2/9 ready, quantities and coin/XP rewards. Tapping missing corn opened named acquisition sources with navigation. | Three opening orders, readiness counts, customer lines, quantities, rewards, and links such as planting the missing wheat already exist. | Preserve existing strengths. Extend the current missing-good link into a compact source explanation with availability, cost, and a return path to the order. |
| Business decisions | Ready orders and missing quantities are explicit. The opened board alone did not explain opportunity cost or the best use of scarce goods. | Mill, feed, eggs, bakery, fruit stand and village projects already compete for goods. Persistent advice is the current development pass. | This is a good place to differentiate: explain why a specific available action helps, including what it consumes or delays. Do not advertise an unproven “highest profit” choice. |
| Breadth and progression | The seed menu previews many crops; machines include milling, sugar, dairy, baking, weaving and regional workshops with level locks. | Four field crops, three fruit types, feed/bakery recipes, fishing, school and clinic. Meadow/dairy and later systems remain planned. | Reference exposes a broader production ladder. Add one connected chain at a time; visible locked entries are not proof that every late system is polished. |
| Land | A 4 × 4 purchase diagram showed 4/16 opened and an example next parcel requiring level 8, 2,000 gold, a deed, a marker and a hammer, with help on missing materials. | Existing land purchase and map dressing; progressive covered-land discovery remains planned. | Borrow explicit prerequisites and material help. Add a preview of what the parcel makes possible and reveal it in stages. Keep our own economy and pace. |
| Rewards and luck | Daily chest panel displayed probabilities, one free opening and an additional opening costing 5 Xu; a limited-quantity gift-code banner appeared during onboarding. | 500-coin start and four authored effort-linked discoveries paying at most 110 extra coins per farm. Earned memories are saved. | Keep our authored surprises and small rewards. The reference demonstrates reward visibility, not a reason to add repeatable paid rolls or scarcity banners. Real-money purchasing was not examined. |
| People and social play | Public chat was visible; friends and invitation controls were present. The guide reacted to tutorial progress. | Single-player villagers, customer voices, friendship scenes, letters, family restoration and three independent local profiles. | Build a village that notices actions. Public chat is a separate product and moderation commitment, not a shortcut to making solo play feel alive. |
| Interface load | Events, season, rewards, friends, bag, orders, invitations, shop, chat and tips compete around the field. | Several status chips and icon controls; ordinary play is more open, but the opening still repeats related goals and can stack guide/speech with a sheet. | Neither should be treated as the ideal HUD. Retain one main goal, one next action, and one optional news entry with an honest unread count. |
| Accessibility and comfort | Settings offered text sizes, high contrast, tutorial voice, weather/day-night effects and graphics quality choices. Their effectiveness was not fully tested. | Existing text-size controls (100%, 115%, 130%), reduced motion, sound settings, large controls and tested rendering budgets. | Test the existing text scaling for readability/overflow, contrast and overlapping panels as a separate usability pass. Do not infer accessibility compliance from settings alone. |
| Saving | Guest account wording says it is stored on this device and offers account saving for another device. Cross-device recovery was not tested. | Three isolated local profiles with import/export and recovery; not cloud sync or multiplayer. | Keep the three-profile explanation clear. A family can maintain separate farms on one browser; that is different from playing in one shared online farm. |

All reference observations above come from the [live reference UI](https://nongtrai.jackle.dev/) during this session; they may change. Hollowbrook implementation details come from [goods](../src/content/goods.mjs), [world](../src/content/world.mjs), [discovery content](../src/content/discoveries.mjs), and [profile documentation](PROFILES-AND-DISCOVERIES.md).

## Colour and why the reference feels more finished

The reference's appeal is not simply “more saturation” or “more gold.” Its orange-red roof, pale courtyard, darker crop beds and turquoise pond separate useful places. Repeated fencing and connected paths give objects a coherent setting. Detailed illustrated icons also give the menus a strong visual identity. The captured desktop scene uses blurred edges, but we should not assume that effect is necessary or cheap on phones.

Hollowbrook's current AR-001 build is already vivid. The opening has substantial yellow-green grass and golden wheat; increasing saturation everywhere could make it harsher without making it more readable. Broad grass areas currently compete with smaller characters and buildings. Some houses appear muted because they are deliberately unrestored, which is useful storytelling if the restored result is shown clearly.

Ask Claude for a **matched opening-camera composition review**, retaining ownership of colour and lighting:

1. Frame the beds, home entrance and one inviting landmark together at phone width. Keep enough open land to build, but give that space a readable edge and purpose.
2. Make broad background grass quieter relative to fruit, flowers, people and interactive targets. This is relative emphasis, not a request to return to a pale palette.
3. Keep warm roofs/wood and cream panels, cooler water/shadows, and distinct dark soil. Check silhouettes and value differences as well as hue.
4. Use a small gold glint for an actual discovery and a short earned celebration. A gold effect should correspond to something the player can find or has just earned; permanent sparkle everywhere reduces its usefulness.
5. Compare ordinary daytime, dusk, an unrestored building and its restored form. Judge at 390 px and desktop width, with reduced motion and the existing draw/triangle budgets.

These are art-direction recommendations from the inspected scenes, not scientific claims that a particular colour causes happiness or retention. Do not copy the reference's assets, house meshes, icons or exact composition.

## Story, audience and reasons to return alone

The reference's regional choice and familiar farm objects suggest an appeal to players who enjoy Vietnamese rural identity, collecting, production and community. That is an interpretation of its design, not verified demographic evidence. There is no basis here for declaring its users mainly children, adults, men or women.

Keep Hollowbrook's accepted broad adult/family direction, with optional depth. The clearest distinction we can build is **a farm whose success visibly brings people and places back to life**. Existing chapter cards and letters are a foundation, not a substitute for visible payoffs.

Use a repeatable story structure:

> Someone has a small, understandable hope → the player chooses useful work → the place changes → the person responds to the actual result → one new possibility becomes visible.

For example, a first loaf can produce a saved memory from Ada; a repaired public route can show people using it; opening the school can lead to a later optional activity. Only mention the activity as available once implemented. The clinic, meadow, company and later chapters must follow their actual release boundaries.

Do not measure story depth by dialogue count. A short line that remembers a real choice is more useful than ten interchangeable compliments. Keep the same facts, speaker identity and repetition history in English and Vietnamese. The reference's UI also demonstrates why context matters in localisation: one observed tip applied the Vietnamese verb for raising animals to a chicken coop. Hollowbrook should preserve full, authored clauses for crops, buildings and animals rather than mechanically substituting their names into one sentence pattern.

## Your proposed ideas, evaluated against this reference

**Useful advice, blockers, leisure and congratulations:** supported by the reference's source-help flow, changing tutorial steps and explicit reward feedback. Improve on it by keeping these in one optional place and saving read/deferred state. A badge should count unread current advice and earned memories, not everything unfinished on the farm. Opening a message is not permission to spend resources.

**Too much bread while someone wants cake:** a strong example of contextual guidance, provided there is a real unmet order. Check the actual requested product, recipe unlock, working maker, ingredients, queue and project commitments first. Offer a specific next step; if cake is not available, explain the blocker. Do not fabricate customer demand or promise that every processed good is the best investment. The current advice pass covers these rules using existing available recipes.

**Lucky money earned through exploration:** fits our game better as small, authored finds than as the reference's repeatable chest roll. The current second/tenth catch, rock-clearance and street-restoration rewards establish the pattern. Show the keepsake, the exact reward and a remembered response; then suggest a genuinely affordable option. The wider world still needs designed discoveries beyond these first four.

**Covered land and branches:** stronger when a preview says what the player gains. The reference makes purchase requirements explicit; our plan should add a visible purpose and a small reveal sequence. One parcel can give immediate usable space, one keepsake, and a later repair lead. Avoid exposing every future building at once, but do not hide essential requirements behind luck.

**Skills, energy and vehicles:** the reference inspection does not justify accelerating these ahead of readable existing loops. Preserve project-only energy and free recovery. First give one repair and one learned capability a clear use; introduce a vehicle only when it changes a real delivery, access or work decision.

## Recommended implementation order

| Priority | Bounded change | Completion check | Lane |
|---|---|---|---|
| 1 | Finish current saved advice/news pass | Real order and blocker selection, read/defer/restore across reloads and languages; no extra payments; exact target previews | Codex |
| 2 | Resolve competing guidance and clarify missing-good help | An unrelated sheet suppresses the tutorial pointer/incidental speech; item help names an available source or an honest prerequisite; player can return to the order | Codex |
| 3 | Improve the opening composition and discovery presentation | Home, first work and one invitation read together on phone; richer useful accents without louder broad ground; AR-009 integrates with existing discovery accounting | Claude art, Codex behavior |
| 4 | Ship one covered-land branch | Clear cost/purpose preview, immediate usable space, one earned reveal, a discoverable activity without mandatory land purchase; pace preserved | Both lanes |
| 5 | Connect one new production chain to people | Meadow/dairy when selected: obtainable inputs, multiple useful outputs, honest orders and a visible story payoff; no stranded resource chain | Both lanes |

Text scaling, high contrast and optional voice deserve evaluation after the overlapping-interface issue. Multiplayer, extra currencies, timed gift-code scarcity, a complete new vehicle fleet and a much larger map are not recommendations from this comparison.

## Validation and evidence notes

- Ask fresh players to harvest, resolve one missing ingredient, identify the next unlock, find an earned memory and explain why a suggestion helps. Record confusion and assistance needed; do not announce success targets as measured results.
- Compare two opening compositions with the same farm state, camera span and time of day before choosing final art values. The screenshots in this inspection are comparable viewport sizes, but the farms, layouts and progression states differ.
- During the inspected session neither site emitted a captured page-script error. This limited observation is not a full reliability or performance result. UI automation timeouts included targeting offscreen/semantically different controls and blocked overlays; they are not load-time benchmarks or proof of game bugs.
- Local evidence is in `C:/Users/n/AppData/Local/Temp/hollowbrook-reference-comparison/`: `day-farm`, `phone-farm`, `orders`, `ingredient-source`, `delivery-settled`, `shop-suggestions-ready` (land screen), `machines-tab`, `phone-rewards`, `profile-settings`, `hollowbrook-phone-play`, `hollowbrook-desktop-play`, and `hollowbrook-orders`, each with PNG/JSON captures. The folder is temporary and is not committed as game assets. Chat identities are not reproduced in this report.

The useful next step is to make Hollowbrook's current farm feel coherent, understandable and responsive, then add branches that create meaningful new choices.
