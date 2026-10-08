# Claude handoff: AR-009 discovery keepsakes

Prepared: 2026-10-08 (Asia/Seoul). This records the discovery-art brief already given to the user. **AR-009 is requested; the first delivery is assets and registration.** AR-001 is complete and live. AR-002 through AR-008 retain their existing proposed statuses, including crop faces.

Codex is working on `codex/dialogue-review`. Claude's art branch for this task is **`art/discovery-props`**, in `C:\Users\n\source\repos\Farm_village-art`. Preserve the art worktree's existing work; do not edit or commit Codex's checkout. Follow [AGENTS.md](../AGENTS.md) for lane boundaries and the normal PR workflow.

## Current baseline and reading

The discovery implementation is committed and pushed as **`dc8223f`** on `origin/codex/dialogue-review`, in [PR #4](https://github.com/buicongnguyen/Farm_village/pull/4). Use that actual revision when integrating the event contract and cards. The PR is not yet merged into production.

The current logic checkout has integrated main **`a1607de`** through merge **`7e126fb`**. That main update closes AR-001 as done; the discovery request does not reopen the completed look pass. The earlier review fix **`b03c38c`** is also in the logic branch.

Read these current sources before beginning:

- [AGENTS.md](../AGENTS.md), especially shared-file and binary ownership.
- [Asset queue](ASSET-REQUESTS.md), AR-009 and the dated notes between lanes.
- [Profiles and discoveries](PROFILES-AND-DISCOVERIES.md), for the current implementation scope.
- [Master plan](HOLLOWBROOK-IMPLEMENTATION-PLAN.md), especially the established look and event-accounting direction.
- [Small discoveries and happy progression](LUCK-AND-HAPPY-PROGRESSION.md), for the design context; current implementation and the explicit contract below take precedence over its earlier prototype wording.
- `src/content/discoveries.mjs`, `src/core/discoveries.mjs`, and `src/ui/discovery-panels.mjs` from Codex's current checkout, read-only, for the authored objects and integration points.

Merge the latest `origin/main` into the art branch before work and again before opening its PR, as the repository requires. Discovery implementation may still be local or under review on the logic branch. Obtain its actual committed revision when integration needs it; do not assume an uncommitted checkout or this document is already deployed. The models and icons can be authored from the contract below without waiting for runtime integration.

## First delivery

Create these original Blender props and matching WebP icons:

| Discovery | Exact asset ID / node | Appearance and role |
|---|---|---|
| `pond-tin` | `lucky_tin` | A little tin brought up beside a fish. A few readable coin shapes can suggest its contents without literally modeling twenty separate coins. |
| `pond-keepsake` | `lucky_button` | A brass button shaped like a fish, with a simple pond mark on the back. A cloth pouch is context for the find, not a separate asset requirement. Keep the button recognizable at icon scale. |
| `stone-keepsake` | `lucky_box` | A small keepsake box with cloth and a smooth pebble. Give it a clear silhouette distinct from the pond tin. |
| `street-thanks` | Existing assets | Reuse the envelope/mail and coin treatment for the neighbour's note. No fourth GLB or newly named icon is required. |

Each **complete prop is at most 1,200 triangles**, including its attached contents. Use the existing low-poly, vertex-colour workflow and a small handheld scale. These are keepsakes, so they have no building footprint or placement action. Use the existing front-facing convention (+z) and base origin; record actual dimensions in the delivery.

One static presentation per prop is sufficient. Opening/closing rigs, additional variants, animated lids, sounds, and new world actors are not part of this first delivery. Make the icon's object obvious at small phone sizes. Use the existing icon workflow, including a transparent background where the current icon format requires it.

Include the generator/source change, packed GLB output, and icons together. A dedicated `public/assets/models/discovery-props.glb` is a suitable packaging choice; document the actual output file and preserve the exact node IDs above. Pack with the existing meshopt workflow. Do not hand-edit generated `ANCHORS` or compiled binaries.

Add model entries in `src/view/kinds.mjs` and icon IDs in `src/content/icons.mjs` under the repository's shared-file rules. Supply:

- `public/assets/icons/lucky_tin.webp`
- `public/assets/icons/lucky_button.webp`
- `public/assets/icons/lucky_box.webp`

Record original source/provenance in `docs/ASSETS.md`. Reuse of the user's own assets is permitted with a source record; take no artwork from reference games.

## Visual treatment and runtime boundary

Build on AR-001's existing warm, rich look: clear object silhouettes, readable material changes, small bright highlights, and deeper colour in shadows. The tin, brass button and box should look like three different found objects. A restrained glint would suit a later reveal; a new screen-wide flash or a palette overhaul is unnecessary.

**Registering these assets does not instantiate them across the world.** Do not scatter all three props onto the map, add a placeable shop category, or load a new always-visible discovery scene. Codex controls when a discovery is earned and which saved card displays it. The three models provide presentation assets for deliberate use, not new gameplay objects with their own timers or rewards.

The UI already works with existing icon stand-ins:

| Discovery | Current icon | Intended integrated icon |
|---|---|---|
| `pond-tin` | `ui:coin` | `lucky_tin` |
| `pond-keepsake` | `perch` | `lucky_button` |
| `stone-keepsake` | `tool:clear` | `lucky_box` |
| `street-thanks` | `ui:coin` | Existing envelope/mail and coin treatment |

These are references to existing icons, not new placeholder binary files awaiting replacement. Art adds the real asset registrations; Codex updates the discovery-content references once the delivery is integrated. No edit to `src/content/discoveries.mjs` is needed in the initial art PR.

## Rules and events: use this exact contract

The restored-village start stays **500 coins**. Four authored discoveries pay at most **110 additional coins per save**:

| ID | Qualifying effort | Coins | Current response speaker ID |
|---|---|---:|---|
| `pond-tin` | Second successful catch | 20 | `pip` |
| `pond-keepsake` | Tenth successful catch | 40 | `june` |
| `stone-keepsake` | Second newly observed successful clearing of an owned rock | 30 | `june` |
| `street-thanks` | Completed broken restoration of Village Street, `road_south` | 20 | `gus` |

The rock count is not taps, weeds, paths, or the old combined clearing statistic. On older saves it begins from newly observed successful rock clears. The street reward follows completion, including an eligible neighbour-assisted completion; later maintenance does not repeat it. Old completed milestones receive deliberate migration treatment rather than a windfall on load.

These discoveries are one-time authored rewards, **not repeating lottery rolls**, rare-odds claims, daily streak prizes, or a payment every tenth catch. The pond button is a local keepsake, not a clue that resolves the sluice mystery or bypasses Ellis's ordered letters.

The core emits both of these for one already-accounted reward:

```js
{ type: 'discovery', id, coins, person }
{ type: 'coins', coins, source: 'discovery', id }
```

- `id` is one of the four **discovery IDs**, not a placed building ID or one of the three asset IDs.
- `person` is an existing speaker ID. It is not a guarantee that an on-screen actor occupies a usable effect origin.
- **Neither event has a position field.** Do not read guessed `x`, `z`, `position`, `target`, or placed-object coordinates from it. Ask Codex for a deliberate payload addition if a later world-space effect needs one.
- The first event supports the discovery response/card; the second records the same wallet payment for existing feedback. They are not two payouts or two separate discoveries.
- Logic grants coins, updates earned-income accounting and saves the once-only marker. Opening a card or replaying an animation grants nothing.
- Existing sound and UI subscriptions must be checked before adding any later effect, so the same coin payment does not produce duplicate sounds, flights or toasts.

Keep actual collection semantics intact for other systems. Fruit/stall proceeds waiting for collection remain distinct from wallet transfers.

## Shared-file coordination

The first AR-009 delivery reserves asset generation, binary outputs, provenance and registrations only. It **does not reserve or authorize parallel subscription edits** in `src/view/juice.mjs` or `src/ui/fx.mjs`.

Before a later effects change, add a dated note to [ASSET-REQUESTS.md](ASSET-REQUESTS.md) naming the active writer, exact shared functions, intended subscription and committed handoff revision. Claude owns how effects look; Codex owns eligibility, event payloads, accounting, UI behavior, saves, English/Vietnamese and necessary `main.mjs` orchestration. Agree a source-location contract rather than manufacturing one in the renderer.

Preserve the review fix from **`b03c38c`**:

- `PeopleView.visit` carries the visit number; `sayVisit` chooses an eligible line against the actual farm when the visitor speaks, once per visit. Do not reintroduce a stale departure-time line.
- Persisted heart/charm news stores the numeric **`threshold` separately from timestamp `at`**. Live heart/charm events retain their existing threshold in `at`. Saved history readers must not confuse these two meanings.

The proposed character naming plan has not renamed runtime identities. Use the existing speaker IDs shown above; do not rename characters or assets as a side effect of this delivery.

AR-002 through AR-008 remain separately proposed. This brief adds no meadow/dairy set, new recipes, sluice set pieces, Ellis actor, expanded ruin pass, seasonal release promise, or crop faces.

## Delivery and verification

Use the normal art-lane PR workflow on `art/discovery-props`, with test server port **5242**. Include a delivery note in the queue with:

- Source/generator file list, GLB path and node names, dimensions and triangle count for each complete prop.
- All three WebP icons, registry entries and provenance.
- Close-up and actual-size icon screenshots; phone and PC presentation checks in both languages once integrated.
- Required tests/build results and confirmation that every packed kit meets asset validation.
- Scene budgets of at most 120 draw calls and 300,000 triangles at every zoom, and the 1.1 MB first-load code budget. Do not add an eager world load just to demonstrate unused props.
- The exact art commit/PR and any remaining Codex integration work.

Codex will replace the three UI stand-in references after the assets land on an integration branch and check them in the discovery cards. A later glint/reveal subscription requires the shared-function handoff above and reduced-motion verification. Merging `main` deploys the game; the existing repository requirement for user-authorized merging remains in force.
