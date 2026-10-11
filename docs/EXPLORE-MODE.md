# Explore mode: farmhouse first

**First playable slice implemented — 2026-10-09.** The original design-only request was followed by explicit authorization
to implement farmhouse entry, direct movement, door exit, sofa and memory shelf using Claude's PR #43. The authoritative art delivery is
[AR-015 in ASSET-REQUESTS.md](ASSET-REQUESTS.md#ar-015-farmhouse-interior-for-explore-mode--requested-2026-10-09).

## Things to do at home — 2026-10-10 (Claude, user request: the room should be as busy as Zoo Garden's cottage)

Zoo Garden's cottage has 18 hotspots (timed buffs on cooldowns, furniture that opens panels, walls that fill with your
own things). Our six pieces of furniture now all do something:

| Furniture | Action | Rule |
|---|---|---|
| Kitchen | Brew tea | 30 min cooldown. Shared with the resident you know least: +1 heart (never past 10); alone: +5 XP |
| Desk | Open the journal; Draw in the journal | The journal opens Goals. A drawing: 8 min cooldown, +5 XP, counted on the shelf (max 99) |
| Dining table | Plan the day | A list of what is waiting: ripe crops, eggs and milk, hungry animals, finished goods, fillable orders, unread letters; Farm view |
| Wardrobe | Pick a shirt | The existing `playerColor` setting; the room's actor changes at once |
| Memory shelf | (as before) + Our collection | Fish caught, letters read, friends with three hearts, journal drawings |
| Sofa, door | unchanged | |

- State: `s.explore.used = { tea, draw }` (epoch ms) and `s.explore.drawings`, normalized with the rest of `exploreState`.
  `homeCooldown()` is capped at the cooldown length, so a clock set back cannot lock an activity.
- A waiting activity shows "Ready again in m:ss", ticking in place (the card's buttons are never rebuilt under a finger).
- Tests: `home-activities.test.mjs` (5) and an indoor check in `explore-roam.browser`.
- Not ported: buffs that change farming speed, visiting villagers posed indoors, a radio, kettle steam and fire, a
  bed and more rooms (these need new art or economy decisions).

## Explore the Zoo Garden way — 2026-10-10 (Claude, user request)

The user asked for Explore to play like Zoo Garden (repo cute_game), with more to do. Mapped from its source and
adapted (no combat, mining or planets):

- **Thumb stick** on touch screens (given on the first visit; the choice is saved): fixed bottom-left, 128 px ring,
  52 px of travel, an 18 % dead zone, full speed past it. It replaces the four direction buttons. Indoors on a narrow
  screen it sits above the panel.
- **One action pill** while roaming, instead of the card: the green pill names the nearby action (E, F or Enter).
  Farm view and the controls switch are small buttons at the top left; the welcome line steps aside after 5 s.
- **Tap a thing** (person, pet, bench, bed, tree, coop, workshop, board, mailbox): walk to a free spot beside it,
  then do its action on arrival. Open ground is just a walk.
- **Brisker walk** outdoors (`OUTDOOR_SPEED` 3.6 m/s; 2.4 indoors) and a gliding camera (`1 - exp(-9 dt)`).
- **More to do**, each calling the farm's own action: Harvest gathers every ripe bed within 7 m, 140 ms apart;
  Collect eggs/milk; Feed the animals; Pick fruit; Collect finished goods; Pet the dog or cat.
- Checks: `explore-roam.browser` is now 6 checks (the new activities, tap-to-act, the stick on a phone).
- Not ported yet: ground drops with a pickup magnet, regrowing forage nodes, auto-held tools, daily explore tasks,
  tap-to-aim casting, buffs from farmhouse furniture.

## Roaming outdoors — 2026-10-10 (Claude, at the user's request while Codex was away)

The user asked for a visible Explore button that changes the play style to the character they select. The first slice
already walked the player outdoors on the way to the door; this extends that controller (`ui/explore-mode.mjs`) rather
than adding a second one.

- **Entry:** a small round **Explore** button (compass) at the top right, beside Turn and Settings. It starts roaming
  where the character stands, with no forced walk to the door. The farmhouse menu's Go inside is unchanged. The button
  hides while exploring; **Farm view** returns. This supersedes section 2's "no permanent HUD button" at the user's
  direction; the top-right corner is not a destination row, and every target stays 44 px.
- **Who you walk as:** yourself, or the family member you tapped just before pressing Explore (`radial.explore`).
  A family member can roam, talk, sit, harvest and read the board; the farmhouse room and fishing stay with your own
  character (the room draws the player's rig, and fishing belongs to the player's line).
- **Nearby things** (`scan()`, five times a second): the one closest offers its single action on the existing
  primary button and E/Enter. Go inside (within 3 m: walks to the approach, then enters), Cast a line (anywhere on the bank of any pond: the rod comes out, a tap on
  the water is where the float lands, and the catch lies on the grass until you walk off; see POND-FISHING.md), Talk to {name} (the same `people.talk` as a tap), Read the order board,
  Open the mailbox, Sit on the bench / Stand up, Harvest (the farm's own `harvest` action). No new rules or rewards.
- **Night:** nobody roams while everyone is asleep; the button says so.
- **Cost:** about 0.7 KB of first load for the button and its glyph; everything else loads with Explore. Test build
  1,097,151 / 1,100,000 bytes after the guide was made lazy (PR #46).
- **Checks:** `tests/explore-roam.browser.mjs` (3 checks: phone start/keys/camera/return; talk, board, harvest, bench,
  Go inside from a distance; walking as a selected family member and the pond hand-over, in Vietnamese). Codex's
  `explore.browser` still passes unchanged.
- **Still open:** an analog joystick, tap-to-aim casting, other family members indoors, more outdoor actions (shops,
  animals), and other interiors.

## Implemented first slice — 2026-10-09

- **Entry:** farmhouse radial → Go inside → walk to public approach `(51, 125)` → Go inside. No purchased land or new road is required. Worn levels 1–2 remain accessible; broken/repairing houses refuse entry after rechecking on arrival.
- **Controls:** tap the ground to route around obstacles, arrows/WASD for screen-relative movement, E/Enter for the nearest interaction. Phones also offer four held direction buttons; this first slice uses an accessible direction pad, not an analog joystick. Preference uses the reserved `joystick` save value so a later analog control can replace it without migration. Dragging never issues a tap; blur, pointer cancellation, editors, IME, sheets and modals stop movement. Outdoor camera keys do not compete.
- **Exit:** Go outside walks to the real exit anchor and leaves on arrival. The nearby door action leaves immediately. Farm view safely returns outdoors from anywhere, restores the camera and resumes ordinary player behavior. Reload always starts in Farm view.
- **Sofa:** the 1.8 m rig uses Claude's measured Sit anchor. Sitting costs nothing. If the existing garden lesson permits rest, the sofa invokes its original 30-second recovery rule; leaving or reloading does not restart it or add a second reward.
- **Shelf:** the child shows `home_garden_drawing`, with a warm partner reply, translated in all four released editions. First read records discovery/read timestamps; replay grants nothing. Open album shows the existing collection panel. The new drawing remains replayable at the shelf; no new permanent HUD destination or unread badge is added.
- **Persistence:** optional `s.explore` stores version 1, introduced, control preference and the one memory. A bounded normalizer runs only when Explore is used, keeping startup lean. A WeakMap holds scene, position, routes and seating against the current state object; none is serialized. Profile replacement cancels pending loads and releases control. Existing version-11 exports round-trip the optional record without a mandatory eager migration or rewards.
- **Lazy loading:** only the radial import hook and two small view guards are eager. Neither the room JSON/GLB nor Explore rules/navigation/controller is requested at boot. The active room is rendered instead of the outdoor scene. Outdoor simulation and production clocks continue. Full detail is inexpensive enough to use throughout the fixed interior view; both art LOD contracts are checked.
- **HUD:** controls replace the farm tool cluster while active; outdoor guidance/speech is hidden, sheets/modals retain priority, actions use existing button/color tokens. There is no added permanent HUD icon. The layout follows the rules reviewed from PR #41's `docs/HUD-STANDARD.md`; unrelated HUD PRs are not merged by this work.
- **Recovery:** delayed loads can be cancelled; failed room downloads offer retry and Farm view. A late load cannot reopen a cancelled visit or a different profile. Disposed room geometry, actor material and skeleton textures do not accumulate on repeated visits.

Validation record: 501 native tests pass, including packed geometry and full/mid anchor checks, swept collisions, public access, rechecked gates, refused-action atomicity, memory/reward persistence and rest compatibility. Steady school remains day 3. Dedicated browser checks cover desktop/390 px, 130% text, all four editions, both player rigs, actual furniture taps, held touch controls, input release/editor focus, album return, real autosave/replay, exit, download failure/retry, cancelled loads and profile replacement. Interior measurement: **10 draws / at most 11,302 triangles**. Test startup: **1,099,682 / 1,100,000 bytes**; production **1,098,843 bytes**. The 37 component suites and 28 smoke checks were run; the restore suite had one initial cast timeout, passed on rerun, and its fixture now keeps random bystanders off the staged fishing spot. Final Explore UI changes were rechecked in all four editions. Production-menu acceptance also passed at Vietnamese 390×844, English 1280×844 and English 844×390, with no test hook and persistent memories. These are browser viewport checks, not physical-device certification. [PR #45](https://github.com/buicongnguyen/Farm_village/pull/45) records CI, publication and live verification.

**Still planned:** seed-packet game, wardrobe, kitchen/table/desk activities, school and other interiors, other family actors inside, analog joystick and additional room stories. The remaining design below describes that broader plan; its activities are not all delivered by the first slice.

The player can choose to become the person walking around the village: move directly, visit a real doorway, enter
a cozy room and do a small activity. Existing Farm view remains the quickest way to manage crops and business.
Exploring adds places to enjoy; it must not become a requirement for ordinary harvesting, orders or production.

## 1. Decisions and boundaries

| Area | First playable slice to implement later |
|---|---|
| Mode | Optional Explore mode; Farm view stays the default and keeps its existing controls |
| Camera | Existing tilted orthographic view outdoors; fixed cutaway camera inside |
| First interior | `farmhouse_main`: one 8 × 6 m room, three connected open zones |
| Movement | Phone tap-to-walk or optional virtual joystick; desktop arrows/WASD and mouse tap-to-walk |
| Interactions | One nearby object at a time, with a named action; proximity never spends resources |
| Activities | Small untimed seed-packet game, family-drawing discovery, album, appearance, existing advice/recipes and optional existing rest |
| Economy | Entry and movement are free; no energy use, new income loop, new recipe unlock or duplicate school reward |
| Saves | Save activity progress and earned memories; first slice deliberately returns to Farm view after reload |
| Other buildings | School next, reusing its existing activity; bakery/clinic/company interiors are later explicit deliveries |
| Art ownership | Claude: AR-015 geometry, colours, anchors and metadata. Codex: rules, UI, navigation, text and tests |

This farmhouse-first decision supersedes the older classroom-first proposal in the consolidated plan. It does not
complete JOURNEY stage 5 or authorize modeling an entire village of interiors. A rendered exterior is not evidence
that its interior is playable.

## 2. Entering Explore without crowding the HUD

Follow [HUD-STANDARD.md proposed in PR #41](https://github.com/buicongnguyen/Farm_village/blob/ui/hud-standard/docs/HUD-STANDARD.md),
including the hint treatment in PR #39. At the time of this design, #38 is merged and #39–#41 are open. Integrate
their actual final versions before implementing controls; do not copy or overwrite those branches here.

- Add **Explore** to the existing farmhouse interaction menu, not as a tenth permanent HUD destination. A later
  player action sheet may expose it too, but no such sheet is assumed to exist today.
  Make it available once the opening card can be dismissed; no new level, purchase or tutorial-completion gate.
- In Explore, replace the existing **Barn / Orders / Build** cluster with a small context cluster:
  one named primary interaction when relevant and **Farm view** as a tertiary action. This is a mode switch,
  not another row of buttons on top of the farming controls.
- Indoors, the context cluster uses **Go outside** in the same return position. A menu entry still offers
  **Farm view**, which exits safely before restoring the outdoor farming interface. Exit never depends on a puzzle.
- Keep existing top-level status/coin/level meaning. Suppress the outdoor rail/banner/Next chip inside the small
  room when they would cover it; extend the existing Settings/context sheet with return/navigation entries instead
  of assuming a general destination menu already exists or adding new floating buttons.
  Restore their state on exit. Outdoors, the existing Next chip remains the sole global recommendation.
- A nearby object can show a quiet label/outline. Only its current action appears. Do not pin six furniture buttons
  to the screen, animate every object, or badge every room with red numbers.
- Minimum phone target 44 × 44 px, including exit; respect safe-area insets and 130% text. Green commits an action;
  cream/ghost handles return and secondary choices. Blue filled navigation stays inside help cards; small optional
  help uses `.hint-link`. Red remains unread/problem status, never an action colour.
- No toast for each step, arrival or doorway crossing. Use inline loading/retry states and existing ranked toasts
  only when useful. A discovered memory creates one Today item, not a modal, toast and mailbox badge together.
  Preserve the two-toast limit, deduplication and the HUD standard's single animated attention cue.

## 3. Controls and input ownership

| Input | Farm view | Explore outdoors | Explore indoors |
|---|---|---|---|
| Phone tap / desktop click on clear ground | Existing farm selection | Walk there along a valid route | Walk there around furniture |
| Tap an object / person | Existing actions | Approach its interaction point, then offer the named action | Same; large proxy target for small props |
| Phone joystick, if enabled | Hidden | Camera-relative movement | Camera-relative movement, fixed camera |
| Arrow keys / WASD | Existing camera pan | Move the player | Move the player |
| E / Enter | Existing behavior | Use the offered nearby action | Use the offered nearby action |
| Escape | Existing close/back | Close overlay → cancel pending transition → otherwise return to Farm view | Close overlay → cancel pending transition → otherwise Go outside, without confirmation |
| Drag / pinch / wheel | Existing camera | Pan/zoom while no joystick touch owns the pointer; a drag never becomes a walking tap | Room-fit view; optional bounded zoom, no rotation in slice 1 |
| Q / E camera rotation | Existing controls | Use the existing visible Turn camera button; E belongs to interaction | Hidden/disabled, because the cutaway wall mask is fixed |

Implementation needs **one input owner**, with states `farm`, `exploreOutdoor`, `exploreIndoor`, `transition` and
`overlay`. Current camera listeners already consume arrows/WASD, so a second independent movement listener would
move the camera and player together. Route input through the active owner; do not merely add more listeners.

Phone movement preference lives in the Explore help/settings sheet: **Tap to move** or **Joystick**. Start with tap
controls, let the player choose, and remember that preference per farm. The joystick appears in a reserved lower-left
safe area only in Explore; keep it away from OS edge gestures and the right action cluster. Use a dead zone, capped
speed and camera-relative direction. Dragging a joystick cannot pan, select, enter or activate a menu. A second
finger can use a visible action; it cannot silently become another joystick pointer.

Stop movement and clear held keys on pointer cancellation, blur, hidden tab, mode switch, transition or opening an
overlay. Never intercept movement/Enter while typing a name, composing CJK text, using a focused control or reading
a dialog. Keyboard actions need visible equivalents. Use no mandatory drag puzzle, long press, precision joystick
gesture or timed input. Reduced motion removes camera easing and decorative movement without changing rewards.
Packet choices use recognizable crop pictures plus labels, never colour alone; keyboard users can select a packet
and tray with focusable buttons and hear the current choice/result through a concise live status.

## 4. Movement, collision and the player character

- Reuse the outdoor walk rules: permitted public paths and owned clear land, with water, pens, fences, buildings,
  covered land and obstacles respected. Walking through a public area never grants land ownership or building rights.
- Tap movement uses reachable routes, not straight-line teleportation or snapping to a distant road. An unreachable
  destination gives one clear message and leaves the player at a safe position. Replan when an obstacle changes.
- Direct movement needs swept collision and short bounded simulation steps, including diagonal fence/corner checks.
  Use an approximately 0.30 m player radius; do not tunnel through walls after a slow frame or returning from a tab.
  Inputs express intent; core/pure navigation validates the result before an interaction can use that position.
- Keep continuous movement/animation transient. Persist activity changes behind `act()`; do not write a whole save
  every animation frame or let a view callback award a discovery. The eventual movement/controller implementation
  must supply a validated current pose to doorway/object eligibility, rather than trust raw clicked coordinates.
- Suspend the player's autonomous chores and night-time disappearance while Explore owns that character. Other
  people keep their normal schedules. Explore does not freeze farm time or production, spend energy, cause damage,
  impose bedtime or eject the player from a room at night.
- On leaving Explore, release its input ownership and place the player safely before ordinary PeopleView routines
  resume. A pending fishing line stays saved; cancel only its transient walking callback/reservation when taking
  direct control. Returning to fishing must not consume another bait or create another line.
- Interiors use their own finer navigation grid (about 0.5 m) or validated polygons, not the outdoor 2 m cells.
  Inflate furniture colliders by the avatar radius and preserve at least 1.2 m useful aisles. Decorative rug edges,
  paper, tiny cups and wall pictures do not become collision or tiny interaction traps.

## 5. Doorways, transitions and leaving safely

Each supported entrance is content data, not a guess from a mesh name. Its record needs:

| Field | Purpose |
|---|---|
| `siteId` / `buildingId` | Stable fixed site or actual placed instance; two cottages must never share state accidentally |
| `roomId` | Registered interior definition (`farmhouse_main` first) |
| `outsideApproach` / `outsideFacing` | Validated accessible spot at the visible door |
| `insideSpawn` / `insideFacing` | Clear arrival position in room-local metres |
| `exitId` / `outsideReturn` | Authored exit plus a validated outside return candidate |
| `eligibility` | Current unlock/repair/ownership checks, independent of model download |
| `kit` / `metadataVersion` | Lazy art dependency and validated metadata contract |

**Entry sequence:** select a supported door → walk to its approach → show **Go inside** → explicit activation →
revalidate location and eligibility → load the interior → commit the transition. Direct joystick movement near a
door only reveals the action; merely crossing a threshold does not take control away. Farm-view door menus keep
Repair/Open behavior. Worn/shabby condition levels 1–2 remain enterable; broken level 3 or active repair blocks
new entry until the building is working. The starter farmhouse does not need perfect condition: exterior site
`farmhouse` maps to the existing condition/repair ID `house`. Later buildings also retain their actual unlock gates.

Keep the exterior and a working Cancel control until required assets and navigation are ready. An entry token
identifies the latest request; late loads cannot reopen a canceled visit or the previous profile. Failure leaves
the player outside, with Retry/Back and no cost. Revalidate again if the building moves, is stored or loses its
entry condition during loading. No blank screen or modal that requires a successful download to dismiss.

Inside, **Go outside** is always reachable. When possible, walk to `farmhouse_exit` and transition there. If a
navigation/asset failure would trap the player, the return control performs a validated safe exit without requiring
the broken path. Try the saved outside approach, nearby permitted clear cells, then the known public home route;
never spawn inside a fence, water, building or unowned obstructed parcel. A future movable building uses its current
door, not stale coordinates. Restore exterior camera position/yaw/span and Farm/Explore context consistently.

The existing GameCamera minimum outdoor span is too wide for an 8 × 6 m room. Use independent room framing and
bounds; do not lower global outdoor zoom limits. Render only the active scene, so the outdoor world is not drawn
behind an interior. Background rules continue, while unused outdoor animations and effects stop drawing.

## 6. First farmhouse activities and happy story

The room should feel like a family lives here. A first visit is a short welcome, followed by free movement, not a
stack of tutorials. Subsequent remarks draw from existing story/production/project facts and recent conversation
topics. Keep one observation at a time, cooldowns and saved memory IDs; do not invent a new daily chore obligation.

| Interaction ID | Activity and outcome | Save / reward policy |
|---|---|---|
| `farmhouse_table` | **Arrange seed packets:** match illustrated wheat, carrot and corn packets to their trays. Untimed, tap packet then tray, with a two-packet easy round and optional three-packet round. Wrong choices can be changed freely. | Save current round/arrangement. These are practice pieces, not barn items. No coins, XP, crop unlock or consumable cost. A completed round earns a warm line; repeats remain playable. |
| `farmhouse_memory_shelf` | Inspect a partly tucked garden drawing, read a short family exchange, then browse the existing album. | One memory ID `home_garden_drawing`; first discovery recorded once, no cash/XP or copied existing lucky reward. Later visits replay it without unread inflation. |
| `farmhouse_sofa` | Sit for a moment. If eligible, offer the existing project-rest action and timer. | Sitting gives nothing. `learningStatus.canRest` / `restForProject` retain current 30-second, +60, cap-100 rules; lesson required, no second pending rest. Leaving/reload do not reset its timer. |
| `farmhouse_wardrobe` | Existing character appearance choices in a focused sheet. | Reuse current player body/colour/name settings and literal player names; do not promise clothing items or unlock an unbuilt wardrobe economy. |
| `farmhouse_kitchen` | Browse already-known recipes and actual ingredient-source guidance; a contextual family line can mention surplus or an available order. | Read-only advice until the player deliberately opens an existing production action. No interior-only production queue or artificial supply demand. |
| `farmhouse_desk` | Open existing Village ideas and the roadmap; return to the same room. | Reuse stable advice/read/defer history. A request to visit an outdoor source first performs safe exit. No second competing Next system. |

Suggested welcome: partner notices the player has come home; the child has left space for a shared activity.
The drawing hints at a future flower corner without promising an already modeled new region. After the garden
bench memory, dialogue can acknowledge those seedlings; after the school opens, the table can mention its existing
picture-basket game. Gates come from actual saved facts, not elapsed session time or a translated sentence.

Do not place every villager inside. The first room can have the existing partner/child only when their schedule and
story permit; keep identities stable and suppress their outdoor duplicate while shown indoors. An absent person
does not block the table, album or exit. Until that actor handoff is implemented, the room works with the player
alone and authored remarks in an interaction card; no ghost copy of a family member is required.

## 7. Saves, offline behavior and recovery

Keep `exploration` (the existing picnic/discovery system) unchanged. Reserve a separate future `explore` record
for this mode's durable activity data; migration should add defaults to each profile without granting anything.

```text
explore:
  version: 1
  controls: "tap" | "joystick"
  introduced: boolean
  activities:
    seed_packets: { roundId, difficulty, packetIds, trayAssignments, completed }
  memories:
    home_garden_drawing: { discoveredAt, readAt }
```

This is a proposed schema, not a save-version change in this docs-only pass. Final implementation must validate
IDs, duplicate assignments, finite timestamps and allowed states, and reuse the established versioned save path.

- **First-slice reload rule:** resume in safe outdoor **Farm view**, with a short optional Resume activity link in
  the existing context/Today surface. Saved puzzle progress, appearances, rest, memories and other game systems
  remain intact. The player is never loaded into an unavailable room. State this clearly in help.
- Do not persist held keys, route callbacks, camera animation, mesh references, download promises, raw joystick
  deltas or an unchecked interior coordinate. Future resume-inside behavior is a separate improvement using stable
  room/building IDs plus validated anchors.
- Save on activity changes, discovered/read memories, preference/appearance changes, and existing autosave/pagehide
  paths. A failed save keeps the current session playable and shows the existing save warning; do not erase a profile.
- Three profiles remain isolated. Switching/importing/resetting profiles invalidates pending transitions and input,
  then reloads through existing safeguards. Language changes never restart a round or re-award a memory.
- Offline production, rest and waiting fish follow existing rules. No visitor leaves permanently, crop spoils or
  interior activity fails because the player was absent. Entry/exit/reload itself grants no rewards.

## 8. English and Vietnamese copy draft

These are design copy, not catalog entries yet. Use stable interaction/topic IDs and the same facts in every edition.
At implementation time the current four-edition policy also requires Korean/Japanese coverage before release;
this requested draft focuses on English/Vietnamese. Never hardcode localized names in the runtime source.

| Context / key proposal | English | Vietnamese |
|---|---|---|
| `explore.enter` | Explore | Dạo chơi |
| `explore.farm` | Farm view | Xem nông trại |
| `explore.inside` | Go inside | Vào nhà |
| `explore.outside` | Go outside | Ra ngoài |
| `explore.tap` | Tap to move | Chạm để di chuyển |
| `explore.stick` | Joystick | Cần điều khiển |
| `explore.walk_hint` | Tap a clear spot to walk there. | Chạm vào chỗ trống để đi tới đó. |
| `explore.keys_hint` | Move with the arrow keys or WASD. Press E to use the nearby object. | Dùng phím mũi tên hoặc WASD để di chuyển. Bấm E để tương tác với đồ vật ở gần. |
| `explore.blocked` | The way to the door is blocked. | Lối vào cửa đang bị chắn. |
| `explore.no_route` | There isn't a clear path there yet. | Chưa có lối đi thông tới đó. |
| `explore.loading` | Opening the room… | Đang mở căn phòng… |
| `explore.load_failed` | The room couldn't open. Try again, or stay outside. | Chưa mở được căn phòng. Thử lại hoặc ở ngoài nhé. |
| `explore.cancel` | Stay outside | Ở ngoài |
| `explore.retry` | Try again | Thử lại |
| `home.album` | Family album | Album gia đình |
| `home.packets` | Arrange seed packets | Xếp các gói hạt |
| `home.practice` | Take your time. These are practice packets; your seeds stay in the barn. | Cứ thong thả nhé. Đây là các gói hạt để chơi thử; hạt giống trong kho vẫn giữ nguyên. |
| `home.choose_tray` | Choose a tray for this packet. | Chọn một khay cho gói hạt này nhé. |
| `home.try_slot` | Try another tray. You can change your choice. | Thử khay khác nhé. Mình có thể đổi lựa chọn bất cứ lúc nào. |
| `home.complete` | All tucked in! Ready for a little garden. | Xếp gọn rồi! Sẵn sàng cho một khu vườn nhỏ. |
| `home.play_again` | Play again | Chơi lại |
| `home.keep_for_later` | Continue later | Chơi tiếp sau |
| `home.sit` | Sit for a while | Ngồi nghỉ một lát |
| `home.rest` | Rest for project energy | Nghỉ để hồi sức làm dự án |
| `home.appearance` | Change appearance | Đổi diện mạo |
| `home.recipes` | Recipe book | Sổ công thức |
| `home.ideas` | Village ideas | Gợi ý cho làng |
| `home.drawing_found` | The drawing is now in your family album. | Bức vẽ đã được lưu vào album gia đình. |
| `explore.reload_help` | Reopening the game returns you to Farm view. Your activities and memories are saved. | Khi mở lại trò chơi, màn hình nông trại sẽ hiện ra. Tiến độ hoạt động và các kỷ niệm vẫn được lưu. |

Dialogue drafts retain speaker rules from STORY.md. Runtime must use `{person:pip:short}` / other identity tokens,
not the illustrative localized names below; keep `june` and `pip` as internal IDs.

| Speaker / trigger | English draft | Vietnamese draft |
|---|---|---|
| Partner `june`, first entry | Come in, love. Sunny saved you a place. | Vào nhà đi mình. Bắp để dành chỗ cho mình rồi. |
| Child `pip`, drawing found | I drew this corner for more flowers! | Con vẽ góc này để nhà mình trồng thêm hoa! |
| Partner `june`, drawing acknowledged | I'll keep it in our album, love. | Mơ cất bức vẽ vào album nhé, mình. |
| Child `pip`, packet game complete | They all fit! Can we try another little garden? | Vừa hết rồi! Nhà mình thử xếp thêm một khu vườn nhỏ nữa nhé? |
| Partner `june`, project rest available | A little rest, then we'll see what we feel like making. | Mình nghỉ một lát rồi xem muốn làm gì tiếp nhé. |

Avoid guilt about being away, constant praise for trivial clicks, or dialogue implying a production benefit that
the rules do not provide. Name/pronoun and placeholder tests remain required.

## 9. Architecture and staged implementation

Proposed modules, to be confirmed when coding begins:

| Layer | Responsibility |
|---|---|
| `src/content/interiors.mjs` | Supported sites/rooms, eligibility references, object/action mapping, stable IDs |
| `src/content/home-activities.mjs` | Packet rounds, dialogue topics and memory definitions |
| `src/core/explore.mjs` | Validated entry/interaction/activity actions, durable progress, one-time memory accounting |
| Shared pure navigation | Outdoor restrictions plus interior collision/anchor validation; no reward side effects |
| `src/view/explore-controller.mjs` | Mode/input ownership, movement intent, camera ownership and transition tokens |
| `src/view/interior-view.mjs` | Lazy kit loading, cutaway masks, actor presentation, picking and disposal/cache rules |
| `src/ui/explore-panel.mjs` | Context controls, movement preference, activity UI and return routes |
| Existing save / i18n modules | Profile migration, validated durable state and complete translated catalogs |

**Implementation order:**

1. Verify AR-015 exterior door/inside anchors, colliders and viewport fit with a temporary room and existing rig.
   Establish one input owner and collision tests before accepting direct movement.
2. Ship the opt-in outdoor controller, safe farmhouse entry/exit, interrupted-load recovery and room-fit camera.
   Keep a temporary interior if art is pending; do not block logic on binaries.
3. Connect album, appearance, recipe/advice and optional existing rest. Add the packet activity and one drawing
   memory with save/idempotency tests. Test normal farming and fishing after returning.
4. Integrate Claude's packed room and verify visual/navigation alignment, phone targets and loading budgets.
5. After the farmhouse is played and reviewed, scope **school interior** with the existing picture-basket activity
   and Cora's saved introduction/gates. Same round/reward ledger as the existing panel, no repeat festival payout.
6. Later, separately request bakery, clinic/hospital and company rooms. Reuse their existing production, care and
   contract rules first; validate unlock/repair state per building. No assumption that AR-015 supplies this art.

## 10. Acceptance checks before an implementation release

- Native: collision/no corner cutting, public access without ownership, unreachable approach, eligibility rechecks,
  canceled/late transitions, overlapping requests, missing/stored building, safe exit search and no mutation on failure.
- Controls: arrow keys move only the intended owner; tap versus drag is unambiguous; joystick cancellation, multitouch,
  blur, hidden-tab resume, keyboard focus and CJK composition never leave movement stuck.
- Progress: packet round survives reload/language switch; practices consume no goods; memory pays/displays once;
  existing rest eligibility/cap/timer and fishing line remain unchanged; three profiles cannot share progress.
- Browser: actual door approach → Enter → use each object → Exit on 390 px and desktop, English/Vietnamese at 130%
  text, with all released editions checked before publication. Use keyboard-only and reduced-motion cases too.
- Recovery: offline/failed/slow art fetch, cancel while loading, switching profiles mid-load, hidden tab, save failure,
  removed building, blocked exit and repeated fast Enter/Exit. Reload always reaches usable Farm view.
- Art: visible exterior door alignment, every interaction stand reachable with avatar clearance, full/mid anchors
  equal, front/right wall masking, no invisible furniture collision and no inaccessible small prop targets.
- Performance: lazy room download, ≤1.1 MB first-load code, ≤120 draws / 300k triangles in either scene at every allowed
  zoom; no hidden outdoor scene draw or repeated-enter memory/GPU growth. Measure on phone-sized viewports.
- Run the repository's native tests, pace simulation, test build, all browser suites and smoke checks. A later release
  still requires PR CI, deployment and production verification; this document alone changes no playable feature.
