# Farm work board: first implementation

Date: 2026-10-12. Branch: `codex/helper-work-board`, based on `70fea6e`. Implementation commit: `f5e160d`. Status: implemented and validated on the feature branch; awaiting review, not deployed.

## Delivered scope

- A work/hiring board beside the farmhouse at cell 27,68, using the existing order-board model as a stand-in. Reach it through a world tap, the farmhouse menu, Explore or Friends. No new permanent HUD button or binary artwork. Its free cell blocks walking; the adjacent road remains open. If an older save already places an object there, preserve it and use the farmhouse/Friends entry instead.
- Family crop controls become available at level 3. Hiring keeps the existing school requirement and fees. The company and already hired workers are retained.
- The early family routine continues until the player explicitly chooses the new board controls or hires a field hand. Adopting the controls protects every unassigned bed. A first choice can therefore leave every crop for the player.
- Choose up to 12 currently planted beds and family help or a hired field worker. Each assignment snapshots those exact crop batches, harvests once and stops. It never silently replants, spends on seed, repeats or selects replacement beds.
- Default pause: 45 seconds after ripe crops are observed in play, plus the existing helper round interval. The player can explicitly choose harvest-when-ready. A long absence starts a new viewing window on return.
- Hired workers collect up to three beds per round, costing one coin per successful bed. Family help collects up to its existing four-bed round without wages. The quoted maximum wage is a limit, not an advance payment or escrow. Other spending may leave the assignment paused.
- Manual harvesting, replanting a crop batch or removing a bed makes that target skip without wages. Targets match the bed, crop and ripening time; using a hurry changes that batch and leaves it for manual collection too. Helpers leave unrelated beds alone. Full storage pauses rather than auto-selling; wage shortages cause no debt. Cancel safely leaves the remaining crops and records them as left for the player. Releasing a field worker also closes their assignment without losing its result.
- Jobs, protection preferences and results survive saves/profiles. Malformed new records are disabled during normalization. Existing saves are initialized without a reward or a new hire.
- Panel content follows the existing lazy renderer. New messages have Vietnamese, Korean and Japanese catalogs.

## Deliberately later

Tractors and 300-space fields, new animals/quality, orchards, playground business, company gate changes, training, optional replanting and new walk-before-harvest animations are not delivered here. Animal, orchard, workshop, driver and fishing helpers retain their current rules. The user's latest machinery decision is recorded in [the expansion plan](FARM-EXPANSION-IMPLEMENTATION-PLAN.md): machinery belongs to newly acquired/developed fields, not the existing garden.

## Validation

- `npm test`: 722/722 passed, including backward-clock recovery, cancellation accounting, old hires, exact wages, storage pauses, manual priority and save normalization.
- `npm run sim`: passed; the steady profile reaches school on day 3. Native pace tests cover the other profiles too.
- All 44 `tests/*.browser.mjs` suites passed. After review fixes, the dedicated work-board checks passed again in eight language/viewport combinations (en/vi/ko/ja, 390/1280 px), including real taps, cancellation, manual protection and reload. Explore entry/exit, controls and furniture checks also passed.
- The final `tests/browser.mjs` run passed 50/50, including chapters 1-20. Its chapter-10 setup now assigns beds through the board, and still verifies visible hired work and the evening report.
- `npm run build:test`: 1,262,782 first-load bytes. `npm run build`: 1,262,433 first-load bytes, below the 1,300,000 limit. New panel content stays in the later renderer chunk.
- Browser rendering checks passed the 120-draw / 300,000-triangle limits. The Vietnamese 390 px screenshot was inspected for readable controls and layout.
- Testing limitation: the optional WebKit engine is not installed on this machine. Browser results cover Chrome phone emulation and desktop, not a physical iPhone/Safari run.

Review fixes included moving the board clear of the market cart, truthful helper notices, accurate cancellation totals, removing a guaranteed hiring-payback claim, and preventing backward clocks from repeatedly restarting the harvest pause or stranding the hired-work timer. The live game is unchanged until this branch is reviewed and merged.


## Integration follow-up - 2026-10-13

Latest main through `73fa8f5` was merged in `51165b2`. The work-board handlers, observation before helper work and save normalization coexist with the new notebook and lucky-event systems. The orchard, reward and home-activity fixes are recorded in [the review](plan/95-review.md). PR #111 remains the review branch; it is not deployed.

Integration validation: 757/757 unit tests, all 45 browser suites, five affected suites repeated on the final build, and 50/50 full-game smoke checks passed. The final production first load is 1,296,097 / 1,300,000 bytes; school and clinic remain day 3 for steady play. See the dated review for limitations.
