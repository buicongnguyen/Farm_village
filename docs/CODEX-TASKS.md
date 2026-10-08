# Codex task list — logic lane

Prepared: 2026-10-08 (Asia/Seoul).

Status: profiles and four discoveries shipped through PR #4 at `ab6b230`, after [Pages deployment 37728932775](https://github.com/buicongnguyen/Farm_village/actions/runs/37728932775) passed. The first logic pass and AR-001 shipped through PRs #1–3. Persistent adaptive advice and AR-009 icon integration are implemented on `codex/village-advice`; delivery and review are recorded in [PR #6](https://github.com/buicongnguyen/Farm_village/pull/6). Merging into main triggers deployment; check the [Pages workflow history](https://github.com/buicongnguyen/Farm_village/actions/workflows/pages.yml) for the production result. See [PROFILES-AND-DISCOVERIES.md](PROFILES-AND-DISCOVERIES.md), the [AR-009 art brief](CLAUDE-DISCOVERY-HANDOFF.md), the [implementation plan](HOLLOWBROOK-IMPLEMENTATION-PLAN.md), and the observed [reference-game comparison](REFERENCE-GAME-COMPARISON.md). The [first Claude brief](CLAUDE-HANDOFF.md) is historical.

## Preparation completed

- [x] Fetch origin and merge main's rulebook, research and asset queue into `codex/v0.4-orchard` (`0e4ed21`).
- [x] Preserve all existing local planning documents.
- [x] Read the lane boundaries and verify the first collection-event payloads.
- [x] Reconcile the rulebook with the user's confirmed project-only energy scope.
- [x] Prepare Claude's scoped AR-001 brief and this logic checklist.

The checklist below records the completed first pass (`20e5f5b`). PRs #1 and #2 are now live; their historical validation is retained separately from the current branch checks.

## First implementation pass

### 1. Establish the current baseline and shared-file ownership

- [x] Check Git status, latest commits, applicable AGENTS.md instructions, and the current v0.4 PR state. Preserve unrelated edits and integrate current main on the logic branch.
- [x] Run the appropriate baseline rules/simulation checks and record real failures before changing behavior. Baseline: 147 rules tests pass; steady school day 3.
- [x] Check Claude's current AR-001 note. Leave its art values and active visual handlers alone; coordinate any necessary shared-function handoff.
- [x] Keep Blender sources, generated GLBs/icons, lighting, palettes and visual effect tuning with Claude. Use documented stand-ins when new content later needs them.

### 2. Verify and fix the remaining v0.4 logic/content issues

- [x] Make generic fruit-goal eligibility consider suitable available fruit trees, with a cherry-only farm test. Keep Sam's apple-specific favour tied to obtainable apples unless its requested good is deliberately redesigned.
- [x] Check the cherry and kennel beat prerequisites against actual chapter order and character arrival. A `chapter: 3` tag is not automatically wrong; test early and late discovery rather than changing numbers to match release labels.
- [x] Reconcile hen names across letters, Pip lines and Vietnamese. Do not reintroduce stale lines already corrected.
- [x] Make June's intended on-tap advice reachable without letting orders suppress every ordinary conversation. Review unused Pip content for truth and timing; do not activate a pony promise before that activity exists.
- [x] Connect Mai/Gus remarks to their real fact predicates and select them without repetitive chatter or unseen-person references.
- [x] Align player-tap behavior with STORY.md's silent-player rule through non-dialogue feedback.
- [x] Ensure future roadmap text introduces Priya and the twins before referring to them as known characters; this does not implement their future systems.

### 3. Make story order and state truthful

- [x] Write one concise proposed fact timeline before editing related letters: company/water rights for the sluice; Gus's lantern fire/rescue as his personal story.
- [x] Add explicit fact/prerequisite checks for clue letters and coherent ordering when several become eligible together.
- [x] Rewrite or withhold obsolete closure/key-resolution letters so raw fishing or quest counters cannot expose an unsupported solution.
- [x] Match current Ellis letters to actual supported presence; keep a brief school visit distinct from later permanent return. Coordinate a later character asset through AR-005 if needed, rather than assuming it exists now.
- [x] Select pre/post-school and clinic lines consistently. Preserve warm individual voices and truthful activity advice.
- [x] Update Vietnamese, placeholder coverage and speaker tests with every changed line.

### 4. Support the art pass with correct event behavior

- [x] Verify successful fruit harvest, overflow sale, stall sale, actual proceeds collection and catch events in rules tests.
- [x] Preserve `stallSold` as uncollected proceeds; never change balance rules to match a misleading animation.
- [x] Supply source/location or first/rare metadata only where the agreed visual behavior needs it, preserving existing consumers and reward accounting.
- [x] Handle any required `src/main.mjs` sound routing in the logic lane; Claude controls visual parameters and active handlers in `fx.mjs`/`juice.mjs` during AR-001.
- [x] Add browser checks proving the visible result corresponds to the real inventory/money state, coordinating screenshots with Claude's branch when available.

### 5. Verify and deliver one focused logic PR/update

- [x] Run `npm test`, `npm run sim`, and `npm run build:test`.
- [x] Serve on **5241**, run the browser suites and browser smoke test in both languages, and stop only the server process started for this work.
- [x] Check old saves, failed-action no-mutation cases, clue ordering, phone layouts, reduced motion, draw/triangle budgets, and first-load code size.
- [x] Update CHANGELOG.md, the JOURNEY status notes, and the asset queue with only the work actually completed and any agreed event contract.
- [x] Commit and push the reviewed logic branch/update its PR when included in the user's start/delivery scope. Never push or merge main, deploy, rewrite Claude's branch, or change its checkout without the user's instruction.

## Historical validation and handoff — first pass

- `npm test`: **175/175** pass, including old saves, refused actions, duplicate collections, ordered clues, contextual dialogue and Vietnamese voice/coverage.
- `npm run sim`: steady school day **3**; casual/steady/keen and restored-village pace assertions pass.
- `npm run build:test`: **969,043 bytes** first-load code. Production `npm run build`: **967,982 bytes**, below **1,100,000**.
- All component browser suites and **28/28** main smoke checks pass. New collection and story suites cover both English and Vietnamese on a 390 px phone; existing suites cover phone/PC zoom budgets, touch input and reduced motion.
- Screenshot review confirms the translated story cards fit. Independent logic review found no outstanding issue in this pass. The local server was stopped after testing.
- Claude's active visual handlers were left untouched. The additive event contract is in [ASSET-REQUESTS.md](ASSET-REQUESTS.md), with logic handoff commit `20e5f5b`. AR-001 subsequently delivered the look/effects and corrected stall-sale wallet feedback in PR #2; PR #3 records production checks and closes it.

## Completed release — profiles and four discoveries

- [x] Commit visitor-arrival and saved-news fixes (`b03c38c`) and integrate current main through `a1607de`.
- [x] Add three local farm profiles with isolated saves, import/reset, recovery and switching lifecycle.
- [x] Keep the 500-coin opening and implement four deterministic one-time finds totaling at most 110 coins; count successful catches and owned-rock clearances, and completed Village Street restoration.
- [x] Keep the tenth-catch keepsake local to the pond; preserve Ellis's ordered letter trail.
- [x] Save earned/retired/read records separately. Retire known legacy fishing/road milestones without payout or fake album entries; observe new rock clearances from zero when old history is unknown.
- [x] Add optional Today/Album discovery cards, saved read acknowledgment, an unread count, and EN/VI text with shared eligibility.
- [x] Run the current rules, pace and test build: **211 tests pass**, steady **school day 3 / clinic day 3**, **986,313 bytes** first-load test code.
- [x] All component browser suites pass after targeted fixture corrections; **28/28** main smoke checks pass. Both-language profiles/discoveries, import/reset/recovery, legacy saves, phone fit and rendering budgets are covered. Reviewed the phone screenshots in both languages.
- [x] Complete the independent code review and fix malformed imports, stale autosaves and cross-tab profile selection. Production build: **985,234 bytes** first-load code; the local test server is stopped.
- [x] Commit and push the implementation (`dc8223f`) through [PR #4](https://github.com/buicongnguyen/Farm_village/pull/4), merged at `ab6b230`. Pages deployment **37728932775** passed; this release is live.

## Current pass — adaptive village ideas

- [x] Use 18 authored topic types for actual orders, surplus bread versus other demand, missing/working makers, ingredients, queued/finished batches, stand stock/takings/investment, queue capacity, optional fishing and three milestones.
- [x] Share topic IDs, eligibility, useful-action ranking and history between English and Vietnamese. Add 72 bilingual content/control strings and integrate June's advice with the same current-fact selection.
- [x] Keep automatic June advice waiting while a panel, modal or guide is visible; cover the unchanged read state and subsequent visible conversation in the contextual-dialogue browser regression.
- [x] Persist read and postponed topic/context IDs per farm; let players inspect and restore eligible postponed ideas, and retire stale advice. The Today count combines unread ideas and earned discoveries.
- [x] Recheck each card and its target before display/following. “Show me” opens existing controls without delivering, producing, placing, repairing or spending automatically.
- [x] Retain one-time first-bread, school and clinic celebrations in the Album, gated by real progress and character introductions. Save version 7 preserves prior farms and does not invent old celebrations or duplicate rewards.
- [x] Run rules and pace checks: **229 native tests pass** on the combined advice/art tree, steady **school day 3 / clinic day 3**. First-load code: **1,005,608 bytes** in the test build and **1,004,534 bytes** in production.
- [x] Complete all **17 component browser suites** on the advice build, including English/Vietnamese advice lifecycle and phone checks. Smoke checks: **28/28 passed on the advice build**.
- [x] Integrate Claude's AR-009 delivery and wire its three WebP icons into discovery cards and notifications. The GLB remains available for future 3D presentation and is not loaded by these views. Integration checks: **English/Vietnamese advice and discovery suites passed again after integration; 12 keepsake cards passed on phone/desktop in both languages (fit, exact 256 px icons, no extra payment, no GLB request and no errors)**.
- [x] Commit, push and open [PR #6](https://github.com/buicongnguyen/Farm_village/pull/6). Verify the PR checks and [Pages production result](https://github.com/buicongnguyen/Farm_village/actions/workflows/pages.yml) as part of delivery; merging main deploys.

This pass does not rename the cast, add a later chapter, implement covered land or introduce energy costs. The comparison report supplies observations and recommendations, not additional completed features.

## Following passes — still planned

1. Extend guidance with truthful item-use cards and selected playful/welcome moments. The initial persistent opportunity/blocker/activity/celebration advice lifecycle is implemented on the current branch; broader scene and interaction work remains planned.
2. Covered land, purchase previews, one usable revealed parcel and one discovery accessible without purchasing land.
3. One learned capability and one useful larger repair project, introducing project-only energy and free recovery.
4. Meadow/dairy, additional recipes, school activities and vehicles as individually selected releases, with final IDs and asset requests defined before production art.

AR-002 and the old v0.5 label do not automatically select the next release. Keep the existing school targets (casual ≤10 days, steady 3–4, keen ≥2) and required family access intact while evaluating optional expansion.
