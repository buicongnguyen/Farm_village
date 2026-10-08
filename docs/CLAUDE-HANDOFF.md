# Claude handoff — first art pass

Prepared: 2026-10-08 (Asia/Seoul). Scope: AR-001 only; other asset requests remain proposed. This is a brief for the user to send, not an automatic start instruction to another agent.

## Copyable message

Please take the art lane and start a scoped **AR-001 look and collection-feedback pass** for Hollowbrook. Codex will handle gameplay rules, economy, saves, interface behavior, story, Vietnamese, and tests when I separately tell it to start.

Read these latest local documents first, **read-only**, from Codex's checkout:

- `C:\Users\n\source\repos\Farm_village\AGENTS.md`
- `C:\Users\n\source\repos\Farm_village\docs\HOLLOWBROOK-IMPLEMENTATION-PLAN.md`, especially sections 6 and 16
- `C:\Users\n\source\repos\Farm_village\docs\ASSET-REQUESTS.md`, including the latest Notes between lanes
- `C:\Users\n\source\repos\Farm_village\docs\CLAUDE-RESEARCH-REVIEW.md`

These include newer decisions than the original research. They are currently local planning changes; do not assume that fetching `origin/main` provides them. Work only in `C:\Users\n\source\repos\Farm_village-art` on an `art/*` branch, preserving any existing work. Fetch origin and integrate both the latest `origin/main` and the committed v0.4 logic branch (`origin/codex/v0.4-orchard`) into your art branch before editing, so your pass includes the orchard and clinic. Do not change Codex's checkout, push to main, or merge/deploy without my instruction.

The initial art scope is:

1. **Richer color and clear shapes.** Keep strong orchard greens, terracotta roofs, turquoise water, ripe-fruit accents, and deep shadows. Test brighter warm paths/darker edges so paths and grass differ in value. Test cooler fill against warm sun. Keep cream mainly in the interface and avoid a pale wash across the farm.
2. **Readable, selective gold.** Improve existing glints and important markers. Keep the vivid gold Village news badge possible. Gold is not restricted solely to earned rewards, and red is not universally prohibited for errors. Test outlines/backing/rim highlights where useful rather than outlining everything.
3. **Collection feedback.** Give fruit picking a satisfying but restrained visual response and distinguish a notable golden-carp catch. Use existing events; do not grant rewards or change rarity, economy, or eligibility.
4. **Truthful coin movement.** `stallSold` means proceeds waiting at the stall. Coins should fly to the wallet only on actual collection/payment. Coordinate any missing source metadata with Codex.
5. **Existing restoration appearance.** Refine selected dusty/restored variants if useful; they already exist. Do not commission a duplicate ruined-building set or automatic full-screen color waves.

During this pass, you are the active writer for visual effect handlers in `src/ui/fx.mjs` and `src/view/juice.mjs`, plus the look values assigned to art in AGENTS.md. Codex will avoid concurrent edits there. Codex owns core event semantics and any necessary sound routing in `src/main.mjs`; request those changes instead of editing them silently. Record touched shared functions and the handoff commit in the asset queue.

The updated logic contract is recorded in [ASSET-REQUESTS.md](ASSET-REQUESTS.md): `picked { id, good, count, stored, sold, coins }`, `fishCaught { fish, first, rare, stored, sold, coins }`, and collection `coins { coins, source, id? }`. `stallSold { sold, coins }` still means uncollected takings. In harvest/catch events, `coins` is overflow value already paid; `barnSold` remains the single payment-feedback event. Use `stored` for barn flights, the saved-album `first` and content `rare` flags for catch emphasis, and actual collection sources for wallet flights. These fields are additive to the existing events. Do not mint rewards from animation.

The settled gameplay direction remains **500 starting coins** and **energy only for larger optional exploration/repair projects**. Everyday play stays available at zero. Do not implement energy, new recipes, skills, land gates, crop losses, or vehicle rules in this art pass.

Leave AR-002/003 for a chosen gameplay scope, AR-004 until the story facts are fixed, and AR-005 for a later character delivery. Treat AR-006 as an existing-variant refinement only if it fits this pass. No Tết release date is committed for AR-007. **Do not add crop faces (AR-008) in this pass**; it remains undecided for a future sample.

Validate on your port **5242**: required build/tests, English/Vietnamese phone layouts, reduced motion, and screenshots at matching camera/time settings. Keep ≤120 draws, ≤300k triangles at every zoom, the first-load code budget, and per-model budgets. Show before/after views of the home farm, orchard/boundary, and clinic, including dusk. Preserve a pleasant, readable scene during normal play and effects.

Deliver one focused PR with an exact file list, comparison screenshots, test/budget results, and any event contracts Codex still needs to wire. If generated assets change, include generator changes, packed GLBs, icons and registration together, and update provenance. Gameplay integration should be checked before merging to main because that deploys. Stop at the reviewable PR; I will decide when it merges.

## Coordination status

Codex merged main's coordination documents as `0e4ed21`, and the user subsequently authorized the first logic pass. Its implementation and these plans are delivered through PR #1 on `codex/v0.4-orchard`. Read the latest logic commit and event contract before integrating AR-001. Neither lane should edit or commit the other's checkout.
