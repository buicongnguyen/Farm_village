# Farm expansion: animals, orchards, machinery and the northwest playground

Latest owner refinement, 2026-10-12: **machines work only in newly purchased and developed expansion fields.** The existing garden remains the hand-farming/helper area. Machinery capacity does not convert existing beds or automatically enlarge the old parcel. The first implementation is the work-board slice described in [WORK-BOARD-IMPLEMENTATION.md](WORK-BOARD-IMPLEMENTATION.md), not tractors or the playground.


Date: 2026-10-12. Repository baseline: `70fea6e`, synchronized with `origin/main` during this planning pass.

**Status: consolidated design for future implementation. None of the new mechanics in this document is implemented by this documentation change.** The owner requested that the recent ideas be gathered for later development. This is the implementation starting point for this expansion; it supersedes the smaller proposals where noted. Chapters 1–20, existing purchases and current play remain intact.

Companion evidence: [economy/activity/story review](ECONOMY-ACTIVITY-STORY-REVIEW-2026-10-12.md), [animal and orchard proposal](FARM-VARIETY-AND-QUALITY-PROPOSAL.md), [machinery research and swipe proposal](FARM-MACHINERY-AND-SWIPE-PROPOSAL.md). The broader vision remains in [the master plan](HOLLOWBROOK-IMPLEMENTATION-PLAN.md). Current chapter delivery is recorded in [docs/plan](plan/README.md); older roadmap statuses must not be used to assume that goats, dairies, hired hands or chapters still need building.

## 1. Decisions and open tuning choices

| Topic | What to retain | Status |
|---|---|---|
| Farm variety | More animals, tree groups and useful products, introduced through discovery | User-requested direction |
| Better investment | Gradually improve capacity, animal care, product quality and convenience | User-requested direction |
| Machinery | Swipe to prepare and work a patch; machines make a much larger farm practical | User-requested direction |
| 30 versus 300 | The owner suggested about 30 crops per day by hand and 300 per machine | User-proposed numerical target; exact unit and reset rules require tuning |
| Northwest area | A developable playground that also becomes a business | User-requested location and direction; exact boundaries not approved |
| Implementation now | Write a detailed combined Markdown plan | Requested; no gameplay change in this pass |
| Small farm remains enjoyable | Preserve manual play, starter animals, normal products and existing shortcuts | Recommended implementation constraint, consistent with established cozy rules |
| Business model | Free basic playground with optional picnic orders, refreshments and hosted activities | Recommendation; not a confirmed pricing decision |
| Unlocks, prices, visitor counts | Set after simulation and map/performance checks | Undecided; examples are not production constants |

Earlier recommendations to keep the tractor within the existing 30-bed ceiling are superseded as the long-term target: the owner now explicitly wants substantial machine-enabled capacity expansion. A small technical prototype remains useful before enabling 300 crops. The decision still open is how to interpret “a day,” not whether machinery should enable meaningful scale.

## 2. Existing systems to preserve

- Hens, cows and goats already produce goods. Hens have eight places per coop; cows/goats four per home. Cows and goats already graze across owned fields. Do not sell an upgrade merely to restore that movement.
- The current 30 limit is a maximum number of beds, not a quota of 30 crops harvested per day. A bed can be replanted. Harvested item quantity is another unit.
- Swipe planting/harvesting and Plant All/Harvest All already exist. Machinery must provide more than a replacement animation.
- Hired roles, expandable storage, workshop trays, output upgrades, contracts, trucks, school activities, fishing and the supermarket already exist. Extend their rules rather than creating competing versions.
- Existing fruit includes apple, cherry, peach, orange and coconut. The chapter-11 meadow choice supports honey; preserve the meadow/cannery choice.
- Chapter 18 has a valley fair at the village square. A permanent northwest recreation area is an additional branch.
- Preserve 500 opening coins, small earned discoveries, safe absence and ordinary activities at zero project energy. No spoilage, distressed animals, missed-visit penalties or mandatory daily attendance.
- Production upgrades currently reach 16x output with unchanged inputs/time. Evaluate that economy before adding expanded fields and quality bonuses.

## 3. Progression and meaningful choices

Notice a place or need → choose an investment → do something useful → gain a capability → meet a real customer → see the place and its people change.

| Choice | Primary gain | What limits it |
|---|---|---|
| More animals or crop area | Volume | Land, inputs, storage and actual customers |
| Better care and quality | Distinct premium goods and requests | Habitat, learning, bounded premium demand |
| Machinery and helpers | Work capacity and convenience | Equipment, valid fields, finite plans and quoted costs |
| Recreation business | A use for farm products and social activities | Open facilities, visitor sessions, stock and service capacity |

These are combinable interests, not permanent careers. A modest family farm should still complete the established story. Larger fields and the playground provide optional goals after the opening is comfortable.

## 4. Define the 30-to-300 machine progression

### Recommended model: managed crop spaces

Use **30 hand-tended crop spaces plus up to 300 assigned crop spaces per working tractor**, subject to a separately acquired and prepared expansion field and a tested overall limit. Existing garden beds are ineligible for machine assignment. This is a recommendation for translating the owner's scale idea into the existing real-time game, not approval of a daily lockout.

- No machine: up to 30 ordinary beds, as today. Replant and harvest freely.
- One tractor: the 30-bed kitchen garden plus up to 300 field spaces; theoretical total 330 if suitable land exists.
- Two tractors, later: up to 630 total spaces under the same arithmetic, but do not ship a second machine until economy and phone tests support it.
- Seeder, cultivator and harvester attachments on the same tractor do **not** each add 300 spaces. Capacity belongs to a unique registered machine.
- The new field is a distinct land-development project: buy access, clear/prepare it, then assign a machine. Ordinary garden parcels never silently become machine fields.
- Equipment does not grant free land, clear scenery, fill fields or multiply yield. Prepare and supply the field.
- Job size and animation speed are separate from supported farm capacity.
- Output still follows crop yield and growing time. Three hundred crop spaces is neither 300 coins nor a promise of 300 harvested goods per day.

Show “Garden: 24/30 · Tractor field: 180/300,” with additional land, seed and storage needs. The recommended first scaled release permits one tractor only.

### Develop the new field gradually

Treat machinery capacity and prepared land as separate limits. A proposed first field starts with 60 prepared spaces, can extend to 150, then to 300 under one tractor; these staged sizes are tuning candidates, not shipped numbers. Each extension requires its own visible cleared area and quoted development cost. The tractor never adds a second capacity allowance when moved or fitted with another attachment.

Show the next extension only after the current patch is usable. Explain its real bottleneck: land access, seed supply, storage or buyers. A short restoration beat can uncover an old field marker, pump or tractor part, with one saved discovery reward; buying the same extension again must not replay luck. Keep the original garden attractive and sufficient for ordinary story progress. Harvesting existing crops stays possible even if a machine is sold or unassigned.

Before shipping, compare the first small patch with the full field in the economy simulation. Do not make the player pay for maximum equipment, maximum land and maximum storage at once, and do not guarantee extra profit when demand cannot absorb the harvest.

### Alternative: a daily work budget

Retain the owner's original alternative explicitly: **30 manual planting cycles and 300 machine planting cycles per machine per defined game day**. Before implementation, decide the meaning/length of a day, whether capacities are additive, and how existing farms migrate. Count successfully planted spaces, not taps, previews, failed actions, both sowing and harvesting, or harvested item quantity.

A hard 30-per-day planting stop changes current play and the earlier promise that ordinary farming remains available. Do not implement it without a deliberate product decision and new pace tests. Prefer a managed-area limit, or an assisted-job allowance while manual play remains available. Do not create artificial inconvenience just to sell a tractor.

If reset-based allowances are chosen, specify a saved monotonic period index, boundaries, clock changes, offline returns and no missed-day debt. No daily reset rule is selected here.

### Fields, machines and old saves

Represent larger fields as grouped patches with stable logical cells and shared crop batches where possible. Avoid hundreds of heavyweight interactive scene objects. Mixed crop rows must remain selectable.

Selling or moving a machine cannot strand crops: preserve plants and harvesting. Excess assigned plots become inactive for new planting until capacity is restored; explain this before confirmation. Reassignment cannot temporarily double capacity. Legacy farms retain their beds and purchased improvements.

## 5. Machine catalogue and swipe controls

| Machine/tool | Role and investment benefit | Sequence |
|---|---|---|
| Push seeder/two-wheel cultivator | Short-row convenience; optional affordable alternative | Optional after core controls |
| Compact tractor | Large managed-field capacity and a restoration story | First machine |
| Cultivator | Prepare multiple valid plots through one construction preview | First tractor release |
| Seeder | Plant rows/saved patterns; possible modest seed efficiency | First tractor release |
| Grain harvester | Harvest a ready patch; optional one-time replant | Later |
| Vegetable lifter | Distinct root-vegetable specialization | Later |
| Orchard cart | Collect chosen ripe trees without duplicate rewards | Later |
| Irrigation pump/hoses | Bounded coverage away from the pond; integrate its existing bonus | Later |
| Sorting/packing bench | Quality handling and actual premium baskets | After quality rules |
| Trained operator | Executes a finite plan while the player explores | Extend existing hired hands |

Prepare, Plant and Harvest are separate modes. Choose mode → swipe a row/rectangle → preview valid/skipped cells, total costs, seeds, held goods and output space → confirm once → see work and a compact result. Start/end taps offer a non-drag alternative. Desktop gets click-drag and Escape.

Camera gestures never spend resources. A second finger or cancelled pointer cancels an unconfirmed selection. Follow safe areas and [HUD-STANDARD.md](HUD-STANDARD.md); open tools from fields, machines or Build rather than adding another permanent button.

Validate the complete quote again before spending. Changed resources/targets require a refreshed preview, not silent partial execution. A machine and hired hand cannot claim the same crop. Reserve only accepted inputs; safely cancelling remaining work releases unused holds.

Start with a bounded plan: harvest this patch and replant once using these seeds and at most this many coins. No unlimited offline loop. A committed finite job may complete once while away; no unapproved purchases or consumption of truck, project, company or supermarket holds. Automatic harvest needs a clear pause or chosen overflow policy instead of silently selling select goods. Review manual overflow separately.

Consider seed efficiency only after balancing capacity: a candidate is one paid seed saved per ten plantings. It must not refund free wheat, exploit cancellation/reload or ignore the opportunity cost of seeds taken from inventory. This is not a selected benefit or number.

No fuel bar, random failure or daily repair chores are needed initially. Quote any operating costs before work. Major restoration may use project energy and free recovery; everyday farming does not.

## 6. Animals, care and products

Keep named starter animals. Improve their home and learned care rather than requiring replacement by a universally superior animal. Optional breeds can offer appearances or different useful roles later. The inexpensive starting coop should already feel safe and cheerful.

| Animal | Improve | Useful new branch |
|---|---|---|
| Hen | Nesting corner, shaded scratching yard, feeding lesson, optional feeder | Select eggs; bakery or school picnic request |
| Cow | Milking area, shelter, brushing lesson | Select milk; hotel breakfast and dairy recipes |
| Goat | Browsing/climbing corner and milk stand | Herb cheese and an orchard-path story |
| Duck | Own nesting shelter and safe pond/run | Duck eggs, custard, swimming and a family observation activity |
| Pig | Shade, mud patch and scent lesson | Truffles plus a bounded orchard discovery trail |
| Sheep | Shelter and shearing station | Wool → yarn → one useful blanket/scarf craft before broader recipes |
| Bee | Improve the existing meadow's flower variety | Honey specialties/tasting; preserve the chapter-11 choice |

Do not turn the public fishing pond into private animal housing or block fishing approaches. Duck habitat needs its own accessible footprint. Ordinary truffle production may repeat; an authored keepsake pays once. Sheep need a consumer before launch.

Prototype one species with two grades: regular and select. Use a visible, predictable care milestone or select-batch meter; exact frequency remains open. Consider a 20–30% premium only as a simulation candidate. Normal goods keep serving ordinary recipes and story goals.

Group grades under one item; use regular stock first and make quality-aware reservations explicit. Processing may transfer a bounded quality benefit, not multiply it at every step. Do not remove purchased 16x upgrades without a separately reviewed compatibility/compensation design. Optional petting adds warmth; ignoring it causes no distress, lost affection or output penalty.

## 7. Orchards, crops and connected item upgrades

| Group | Contents | Consumer and exploration payoff |
|---|---|---|
| Kitchen garden | Existing apple/cherry and familiar crops | Everyday food and gifts remain useful |
| Family orchard | Peach and new plum | Jam/preserves; old recipe label behind an overgrown gate |
| Citrus corner | Orange and new lemon | Juice, cake/marmalade; school and park refreshments |
| Sunny orchard | Coconut and new mango | Larger, less frequent harvests/desserts; a visiting grower's cutting |
| Remembered garden | Longan and lychee | Gift baskets and family harvest memories |
| Vine garden | Grape arbor | Raisins/picnic food; repair supports for a sitting corner |
| Shade landmarks | Maple, birch, fir, cypress, great oak | Reading, swings, wildlife and beauty; no commodity required |

Each new fruit has at least one useful buyer/recipe on arrival. Reveal groups gradually with a hint and legal clearing action. Keep landmark trees where practical; discovery need not mean cutting everything down.

Extend the same investment logic to existing items:
- Crop beds: more working area, irrigation coverage and crop plans; not repeated multipliers.
- Feed mill: predictable feed handling and useful storage/reserves; no compounding every animal bonus.
- Bakery/dairy: new menus for real customers, transparent tray capacity and bounded quality transfer.
- Barn: capacity and sorting support stock planning; no inventory lost on upgrade.
- Trucks/company: finite deliveries with actual demand and reserves preserved.
- Fishing: optional outings/recipes while retaining free public access and existing controls.
- Tools: improved coverage and clearer previews.
- Home/furniture: useful comfort and remembered achievements rather than compulsory profit.

Use existing supermarkets, shops and company requests as consumers before inventing another sales system for every product.

## 8. Northwest playground and recreation business

### Site concept and access

Working name: **Orchard Play Garden / Vườn vui chơi**. Provisional, not a canonical location name.

Current source places the brook around z=12, the west road at x=28–29, the fishing pond at x=12–17/z=40–44, and the farmhouse around x=22/z=62. Decreasing x/z is west/north in these map definitions; camera rotation does not redefine the region.

Investigate a **candidate envelope x=8–24, z=24–34**, northwest of the farm and north of the pond. This is a code-based survey area, not a verified buildable rectangle. Check procedural scenery, paths, old-save objects, elevation, dressing and model bounds in a running scene before selecting coordinates. Start small and leave room for modules.

Provide a village-owned public spur to the west road, with pathfinding permission outside purchasable parcels. Opening the area must provide its route; do not repeat the earlier pond problem where people were directed onto unbuildable ground. Protect pond banks/paths, the brook and upriver approaches. Public access cannot require players to build roads on land they cannot own.

Initially show a partly obscured gate, old sign and accessible hint. Restoration reveals specific pieces in stages. Never place permanent objects over saved player buildings; use a checked fallback layout when necessary.

### Development stages

| Stage | World change | Player activity | Business role |
|---|---|---|---|
| 0. Notice | Old sign, ribbon and child's clue | Investigate a reachable point | No revenue or cost gate |
| 1. Open the garden | Safe path, shade/seating, one play object | Optional repair and first family visit | Free basic play; community payoff |
| 2. Picnic corner | Tables, fruit basket and snack kiosk | Supply a chosen menu from actual stock | Finite picnic/refreshment sales |
| 3. Hosted afternoon | Two more activities and named host | Select event/supplies; optional small game | Limited service income and snack sales |
| 4. Village destination | Garden, craft table, group activities | School outing or visitor booking | Better visitor mix and bounded orders |
| 5. Seasonal connection | Fair-themed dressing and orchard tasting | Follow-up to existing festivals | Shared customers/memories, not another chapter-18 fair |

Core play stays available without buying food. Revenue may come from refreshments, optional hosted activities and group bookings. Do not charge twice for an activity included in a booking. Admission fees are not selected by this plan.

### Interactable objects

- Swing/rocking toy: tap to take a turn; reserve a seat and release it on exit/cancellation.
- Sand/planting table: short matching or decorating activity; wrong answers cause no loss.
- Picnic table: seat a family, choose a basket and see them share it.
- Snack kiosk: preview exact goods, quantity, payout and remaining capacity; explicitly start service.
- Craft corner, later: use wool/flower/fruit crafts and save one display.
- Nature clue trail: find three authored details; a clear path to a guaranteed first keepsake.
- Photo spot/album: remember restoration and the family's visit; reopening a photo pays nothing.

Start with one play activity and one sales activity. Furniture alone does not count as a complete activity. Reserve seats, queue places and destinations so people cannot overlap or trap one another. Plan usable arrival and departure routes.

### Business loop and accounting

Choose an available session → preview capacity, booked visitors, menu, supplies and host cost → reserve stock and confirm → serve a finite set of visits → collect an itemized result and optional memory.

For illustration, eight visitors and six snack portions are different quantities; not every visitor buys food. These are examples, not tuned values. Demand is limited by actual booked customers, capacity and stock. Decorative walkers are not extra paying customers. Saved accounting, not animations, determines completion.

Incremental contribution = service receipts + food receipts − consumed goods' alternative sale value − quoted staff/operating costs. Count each good once; separate food included in a booking from additional sales. Show cash received separately from estimated profit. A basket using scarce cheese can earn more cash but be worse than filling a company request.

Reuse stock reservations and wage/worker availability rules. One worker cannot simultaneously operate a machine and host if those roles are exclusive. No surprise wages, overdrafts or unlimited money while away. At most the committed session completes; leftovers remain safe. Low supplies produce a useful suggestion, not unhappy children or a failing-business punishment.

Save completed sales, pending proceeds and collected proceeds distinctly. Reloading, entering the area or changing language must not reroll visitors, duplicate income or charge twice.

## 9. Happy story and earned luck

Use optional side arcs attached to milestones; do not insert mandatory gates into chapters 1–20. Existing conversations mention tractor repairs, so distinguish the newly found vehicle or reconcile those lines.

1. The child notices an old wheel near a covered shed and a faded playground sign farther up the path.
2. An introduced adult remembers harvest afternoons; either clue can be followed first.
3. Restore a tractor through a school/mechanic lesson with explicit materials. A toolbox contains a photo or modest seed gift once.
4. Prepare a field; the cook suggests a real picnic basket suited to the crop. The park remains usable without buying a tractor.
5. Repair one playground object and host a family. The album gains a picture of the revived place.
6. An orchard clue or pig scent trail finds an old picnic recipe. Plum/citrus refreshments offer another investment choice.
7. A school outing, hotel group or valley-fair follow-up connects the place to the wider story.

Luck follows effort and exploration. A guaranteed first discovery prevents essential progress depending on random chance; optional repeat surprises are small and bounded. Do not reinstate a 1,000-coin starter jackpot. Each reward has a stable per-profile ID and claimed state; language changes/migrations never reset it.

## 10. Advice, notices and languages

Advice reads actual free stock, grades, queued yield, holds, working machines, crops, available customers and completed memories. Fix the known queued-output counting defect before recommending purchases.

Priorities: unblock a chosen task → useful opportunity → optional relaxing activity → recognition of an actual achievement. Save seen/deferred states to prevent repetition. Do not advertise guaranteed profit or another machine while the first is idle for lack of demand.

Use Today/news, Next and contextual panels. Follow HUD-STANDARD: red unread, green ready, blue navigation in its specified context. Badges count meaningful entries, not every crop/visitor. Congratulations appear once and stay in the album.

Draft UI copy, not final source keys:

| English | Vietnamese |
|---|---|
| Prepare a field | Chuẩn bị ruộng |
| Plant this area | Gieo trồng khu này |
| Assigned plots: {used}/{total} | Ô trồng đã giao: {used}/{total} |
| Keep seeds for replanting | Để dành hạt giống cho vụ sau |
| Open the play garden | Mở vườn vui chơi |
| Prepare a picnic basket | Chuẩn bị giỏ đồ ăn dã ngoại |
| The visit is ready | Đã chuẩn bị xong buổi tham quan |

Sample child line: “Can the ducks come to our picnic?” / “Mình cho mấy bạn vịt đi ăn cùng được không ạ?” Final speakers retain STORY.md's identity and pronoun rules. Use localized character references, not hard-coded names. Implement all four current editions with identical eligibility/rewards; this planning document need not itself be a translation catalog.

## 11. Logic, saves and art handoff

Core owns capacity, machine assignments, job reservations, habitat milestones, grades, park sessions, payouts and reward claims behind act()/tick(). Content owns catalogues, crop/tool compatibility, prices and story eligibility. Views animate committed state; they do not pay coins when a vehicle reaches a visual waypoint.

Proposed saved records:
- Unique machine IDs, attachments and field assignments.
- Field cell ownership, crop batch IDs and finite job progress/reservations.
- Permanent care upgrades, learned skills and per-grade stock.
- Playground restoration, accepted sessions, pending/collected proceeds and memory IDs.

Version migrations normalize malformed data, preserve purchased goods/upgrades and initialize new branches unopened. Three profiles remain independent. Jobs cannot spend the same stock as supermarket, company, project or truck reservations.

The asset queue already lists a tractor, duck/pig/sheep rigs and AR-014 trees. Reuse after checking geometry, rig, origin, footprint, icons and phone performance. Art availability is not delivered gameplay. Request new assets when a slice is scoped; no new AR numbers are allocated by this plan.

Provisional IDs to agree before art starts:

| Group | Proposed IDs | Required contract |
|---|---|---|
| Tractor | `machine:tractor`, `tool:cultivator`, `tool:seeder` | Footprint, turning clearance, hitch, wheels, tool width, parked/working states |
| Later tools | `tool:grain_harvester`, `tool:vegetable_lifter`, `machine:orchard_cart` | Crop compatibility and interaction anchors |
| Animal care | `habitat:hen_yard`, `habitat:duck_run`, `habitat:pig_corner` | Walk zones, shelter, feed/collection points |
| Playground | `playground:gate`, `playground:swing`, `playground:table`, `playground:kiosk` | Covered/restored states, entrance, seats and service anchors |
| Later activities | `playground:craft`, `playground:nature_board`, `playground:photo` | Reachable standing points and state variants |

These are unregistered proposals. Resolve conflicts and reuse existing IDs before creating files. Record provenance in ASSETS.md and follow the Blender generator/packing pipeline.

## 12. Economics and investment guidance

Capacity is potential production, not guaranteed profit. Calculate seed/feed costs, the value of inventory consumed, output timing, storage, wages, transport, sell-through and actual buyer capacity. A 10x increase in spaces must not quietly imply 10x profit, 10x yield per space and another 16x factory premium.

An investment card should show purchase/setup cost, what changes, required land/input/consumer, likely bottleneck and a comparable scenario. Estimate payback as purchase cost divided by additional net income per comparable visit only when that income is positive and assumptions are visible. For convenience-only benefits, show work saved instead of an invented payback.

Examples:
- Another hen helps when eggs are short and feed/coop space exist.
- A care improvement helps when a select-product buyer is available.
- A tractor helps when the player has land, inputs and demand beyond a small garden.
- A picnic kiosk helps turn a balanced menu into service income; it should not absorb unlimited unwanted bread.
- A packing bench helps a particular buyer; it should not create value through repeated packing/unpacking.

Measure the 300-space farm against current market, shop, supermarket, train and company demand. Keep ordinary sales available; any global buyer changes require separate balance review. Do not hide a sale nerf inside the tractor release.

## 13. Delivery sequence and acceptance

| Slice | Scope | Complete when |
|---|---|---|
| W0. Work board | First delivery: finite crop assignments, manual priority and harvest pause; existing board stand-in | Implemented on `codex/helper-work-board`; see [scope and validation](WORK-BOARD-IMPLEMENTATION.md). Machinery and field construction remain later slices. |
| P0. Economy baseline | Reproduce/fix queued-output advice and upgrade-valuation findings; measure existing yields | Advice uses actual tray yield, ledger reflects bought value, early pace passes, later scenarios have a usable baseline |
| P1. Field planning | Row/rectangle selection, quotes, cancellation, finite job groundwork | Phone/desktop controls are clear; refused actions leave no changes; holds/old saves work |
| P2. First machine | Restoration, cultivator/seeder, one-machine capacity expansion toward 300 | Exact capacity interpretation recorded; land/inputs/storage valid; 300 logical crops meet budgets; useful first customer |
| P3. Care/orchard | Hens' first quality path, one buyer, plum discovery/recipe | Regular goods remain useful; measured care payoff; grade/memory accounting survives reload |
| P4a. Northwest access/play | Survey site, public route, partial reveal, one repaired activity | New/old saves can enter/leave; pond/story paths work; family payoff visible |
| P4b. Picnic business | One kiosk/menu and finite family visit | Stock/capacity limits, exact-once income, no duplicate seats/wages, saved result/memory |
| P5. More farm variety | Ducks, then pig discovery; cow/goat quality; selected tree groups | Each has a distinct activity and consumer; buying every species stays optional |
| P6. Specialization | Sheep/craft, orchard cart, harvest tools, irrigation, packing, operators | Each addresses a measured need and preserves existing choices |
| P7. Destination/scale | Outings, more playground modules, further machines and orchards | Finite demand balanced; larger farm readable; full progression and human playtests pass |

P3 and playground development may proceed independently after P0. Do not require a tractor to open the playground. Split slices further when too large for one reviewable PR. Do not schedule concurrent writers on shared files without an explicit handoff.

For each implemented slice: native rules tests, relevant browser checks, npm test, pace simulation, test build and the full browser suites under the documented repository workflow. Check 390 px and desktop, four editions, current/migrated saves, three profiles, long absences, reload mid-job, insufficient funds, full barn, changed roads, occupied seats, duplicate callbacks, cancellation and simultaneous helpers.

Capacity checks: 30/300 assignments, buying/removing machines, no extra capacity from duplicate attachments, overlapping fields, harmless invalid selections and safe collection after removing equipment. Test daily boundaries only if that variant is chosen.

Playground checks: reachability before/after every restoration state, opening without privately owning the approach, changing panels/leaving during a session, exactly one occupant per activity slot, and one payout per sale/session.

Keep at most 120 draws and 300,000 triangles at every zoom. The current build script controls the first-load limit (currently 1,300,000 bytes), rather than older prose; recheck when implementing. Lazy-load machinery/park modules and assets, instance repeated crops, and cap visible actors independently of logical production/visitor counts. The 2026-10-12 dense-orchard browser check already reached 290,514 triangles at span 39.9, close to the 300,000 limit. Instancing reduces draw calls, not triangle count: expansion fields also need distance-based simpler geometry, grouped crop patches and visibility limits. Do not render 300 additional full-detail crop beds beside a mature existing farm.

Balance casual, steady, keen and overnight-return play. Compare a hand-only farm, one 300-space machine, an animal specialist, an orchard specialist and a recreation business. Include seed/feed opportunity costs, demand, storage, wages and current output multipliers. Preserve school/clinic pace targets and test a meaningful later story journey rather than inferring it from the early simulation. Human playtests should establish whether the activities are satisfying, choices understandable and changed places memorable.

## 14. References and remaining decisions

Earlier research supports useful patterns: separate machine roles in [Farming Simulator's seeding guide](https://www.farming-simulator.com/newsArticle.php?country=gb&lang=en&news_id=317), wider-area tools and connected requests in [Story of Seasons](https://www.storyofseasons.com/PoOT/lifeinolivetown/), and capacity/mastery progression in [Hay Day](https://support.supercell.com/hay-day/en/articles/production-building.html). These are design references, not proof that a 300-crop field, a particular premium or this playground is balanced.

Before each dependent implementation, settle:
1. Managed-area capacity versus daily work allowance; additive garden capacity and future machine cap.
2. Crop compatibility, first tractor unlock, land/seed/storage costs and actual consumer capacity.
3. First species/quality cadence, price and old-upgrade compatibility.
4. Exact northwest footprint/public approach after a scene survey.
5. Playground prices, session capacity, staffing, and whether later hosted activities charge separately.
6. Final art IDs, four-language copy and performance allocation.

These questions do not block documenting the vision. The 30/300 numbers and northwest direction come from the owner; the capacity interpretation, public play/private service model and release order are recommendations. No new limits, prices or releases are claimed by this plan.

## 15. Hiring-board refinement and first delivery

The owner approved a farmhouse hiring board, workers with limited capability, and a delay that leaves ripe crops visible and available to the player. Begin with finite crop help; grow the board into company management later, reusing the existing office and company progression. Existing hires, company progress and chapter gates remain intact.

The first slice uses existing board art, a maximum 12-bed harvest assignment, at most three beds per hired round, and the family's existing four-bed round. Default assigned harvesting waits at least 45 seconds after ripeness is observed in play; immediate harvesting is an explicit alternative. Manual collection always wins, with no charge or substitute crop. No repeat planting or new purchases in this first slice. Full storage and unavailable wages pause work.

Compatibility decision: opening family help keeps its established routine until the player explicitly adopts the board controls or hires a field hand. This protects the established opening pace and avoids silently opting existing players into a different family-help routine. The board explains this and offers a free, explicit switch. After switching, all unassigned crops stay manual, even after the assignment completes. Existing field hires are retained but need assignments, explained in their role description.

Later slices add training, per-area recurring permissions, optional once-only replanting with input reservations, an operator for the separate expansion field, and staged arrival/harvesting animations. Current worker walking feedback is retained; this first slice does not claim a new route-before-harvest animation system. Orchard, animal, workshop, driver and fishing helpers keep their existing behavior; protected orchard assignments need a separate slice.
