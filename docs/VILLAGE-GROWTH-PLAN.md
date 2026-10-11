# Village growth plan: from a simple farm to a rich town

The user's direction (2026-10-08): "at first everything is simple and low gain, but we will gain more money and make
more things which have more benefit, like ginseng or special medicine herbs, that are expensive and earn more. Based
on that, build the first school, then a hospital, police station, supermarket, department store and tall buildings,
then streets for cars, then entertainment, also upgraded gradually."

**The rule:** each stage's income pays for the next stage's buildings. Tools that only raise volume (trucks, barn
space) stay cheap. The big money goes to civic buildings and their upgrades, which make the village visibly richer.

| Stage | Level | New income | What it pays for | Status |
|---|---|---|---|---|
| 1. Home farm | 1–6 | wheat, carrot, corn, pumpkin, eggs, milk, bread, fruit and fish; values vary by good | repairs, barn, feed mill, coop, bakery, trucks (400 / 900) | live |
| 2. Premium crops | 7–10 | **healing herb** (45, 15 min, level 7), **ginseng** (120, 40 min, level 9) | the school (restored), clinic upgrades | live |
| 3. Services | 10–14 | hospital supply requests; later herbal remedies and school-trained helpers | **hospital** (clinic upgrade), **police station** | bounded hospital/police implementation on the current branch; remedies/training remain planned |
| 3b. Food factories | **6: juice press; 8: noodle factory; 9: instant noodles** | Apple/carrot/orange juice; wheat + egg → noodles → instant noodles. Snack and herbal-tea products remain later proposals | Higher-value requests and later civic investment; purchased production trays | **first slice live**; independent trays with legacy-save compatibility implemented on the current branch |
| Existing village customers | **2: fish; 4: snacks/plaza; 7: garden** | Explicit small-basket sales at the existing lake kiosks and plaza stalls, at `ceil(base unit value × 1.35)` per unit | Optional extra value for spare goods; no background selling | implemented on the current branch; distinct from the future supermarket/department store |
| 4a. Company | 15–18 | company labels on existing goods; three repeating truck-delivered requests | staff, more factories, the village's big buildings | first office, two staff roles and repeatable truck requests implemented on the current branch; later tiers remain planned |
| 4. Shops | 14–18 | shop takings: supermarket and department store sell your goods at a markup | **supermarket**, **department store** | planned |
| 5. Town | 18–24 | rent from apartments | **tall buildings** (apartments), **paved streets with cars** | planned |
| 6. Leisure | 24+ | visitors' spending | **entertainment**: park and playground, cinema, fair | planned |

The long-term proposal gives major new buildings 2–3 upgrade tiers so the village grows gradually. Those tiers are
not implemented across every building: current production buildings buy individual trays (two initially, up to
six), and this branch adds one hospital upgrade plus the first police/company tier. Higher civic tiers and their
art need separate rules and delivery decisions.

## Lanes

- **Art (Claude):** premium crops and the first juice/noodle factory models/icons are delivered. AR-011 covers
  dedicated civic icons and the hospital tier. Supermarket, department store, snack factories/products, apartment
  blocks, road/car sets, leisure buildings and later visual tiers remain separate art scopes.
- **Logic (Codex):** costs, unlock levels and payoffs for stages 3–6; recipes (remedies, noodles, snacks), shop income, rent, the
  roadmap entries and Vietnamese text. Codex may retune the stage 2 numbers below.

## Stage 2 numbers (as shipped)

| Crop | Grow time | Sell value | Unlock | Seed cost (if none in the barn) |
|---|---|---|---|---|
| Healing herb (Cây thuốc nam) | 15 min | 45 | level 7 | 45 |
| Ginseng (Nhân sâm) | 40 min | 120 | level 9 | 120 |

Per bed and hour that is about 180 (herb) and 180 (ginseng) coins against about 216 for pumpkin, but in far fewer
taps, so they suit a player who checks in now and then; their real role is high-value order and shop goods for
stages 3–4.

See `PRODUCT-CHAINS.md` for what each farm good can be processed into, and the factory ladder.

## Stage 4a: the company (longer-term direction, 2026-10-08)

The implemented first tier requires level 15, chapter 5 read, an office and two different working food factories.
The list below retains the broader direction; exact first-tier behavior is specified in the following section.

1. **Company office.** Rebuild it at its village site using the existing `company` model in `town.glb`, then choose
   one of three translated labels. A free-text name and office upgrades with additional staff/contracts are future work.
2. **Hiring villagers.** People become workers or managers, each keeping their own story and lines:
   - a **worker** makes newly started batches at one assigned factory faster;
   - a **manager** helps confirm a bounded batch plan. Ingredients are shown and consumed only when the player confirms.
   - Unlimited automatic restocking is not part of the implementation: an absent player never loses an unbounded amount of stock.
3. **Products and contracts.** The current branch attaches the company label to deliveries of existing goods;
   inventory items keep their identities. Three repeating requests use the existing trucks. Separate branded
   products and customers inside future supermarket/department-store buildings remain proposals.
4. **Giving back.** Company profits pay for the hospital, tall buildings and roads, so the village visibly grows
   because of the player's company (the "farmer to billionaire" goal).

Lanes: art makes the office and its upgrade tiers, worker outfits, branded product icons and the factory buildings;
logic makes hiring, contracts, staff effects, balance and Vietnamese text.

## Current bounded implementation — 2026-10-09

These rules are implemented and validated. **355/355 native tests, all pace targets, all 23 component suites,
28/28 smoke checks and eight production contexts pass**, including all 20 new bilingual phone/desktop checks.
The component result includes the corrected cast fixture (9/9) after the initial 22/23 run and affected final-build
reruns. Production contexts cover four new growth and four existing optional flows in English/Vietnamese at
390/1280 px. Steady school/clinic remain day 3; production first-load code is 1,094,983 bytes. The release PR records
CI, Pages deployment and live verification against the integrated main baseline `1add9a4`. These mechanics do not
implement chapters 6–9, introduce Pearl or Bea early, bring Ellis home, resolve the water agreement or restore the
Harvest Festival. The board opens as an optional later activity; it does not change the school-day pace targets.

| Step | Requirement and exact cost | Useful result |
|---|---|---|
| Hospital | Level 10, read chapter 5, working clinic; **1,800 coins + 6 healing herbs + 2 ginseng**, respecting goods held for projects | Upgrade the clinic in place, earn one bilingual family memory, and enable the hospital supply request |
| Police post | Level 12, read chapter 5; **2,200 coins**, rebuilt at its existing civic site | A working post adds **5%** to company delivery payment; the quote is fixed when a truck leaves |
| Company office | Level 15, read chapter 5; **3,000 coins**, existing civic site; **two different working food factories** | A company label, one worker, one manager and one bulk request at a time |
| Worker | An adult from a household that has actually arrived; **120 coins per hire**; assign one working food factory | **10% shorter duration** for newly started batches there; existing timers remain unchanged |
| Manager | Another arrived adult; **180 coins per hire** | Explicitly confirm **1–3 batches** with aggregate ingredient and tray checks; the UI offers one or three |

The feed mill and bakery do not count as the two company factories. The juice press and noodle factory qualify, as do
later genuine production buildings. Children, absent relatives and families still travelling cannot be hired. One
person cannot hold both roles. Releasing a role is free; hiring again pays the stated invitation fee. There are no
daily wages, penalties, staff departures or automatic recurring plans. A stored/broken factory pauses its benefit.

The clinic keeps its current hospital model and footprint; this first upgrade has a changed label and rules, not a new
art tier. Police and company reuse their existing `town.glb` models. Dedicated upgrade models and icons are art-lane
follow-ups in AR-011. The current logic branch includes two authorized placeholder icon copies: `police.webp` from
`clinic.webp`, and `company.webp` from `market.webp`; the asset queue records their provenance and replacement request.
No new character outfit or branded inventory SKU is introduced.

### Delivery loop and price preview

The existing market fleet, truck capacity, repaired street, travel timer and collection action remain authoritative.
Each dispatch needs **one idle empty truck** and all goods at once. Goods leave the barn only on confirmation and
respect project reservations. There is no additional truck inventory and no automatic dispatch. The next request
appears after the current payment has been collected at the market.

| Repeating request | Cargo | Base payment | With working police at dispatch |
|---|---|---|---|
| A pantry for the next town | 6 carrot juice + 8 noodles | **600** | **630** |
| The hospital pantry | 6 healing herbs + 2 ginseng + 4 carrot juice; hospital upgrade required | **930** | **977** |
| Lunch for the makers | 8 instant noodles + 4 orange juice | **1,560** | **1,638** |

All fit the existing starting capacity of 20 goods. After the third payment, the first template returns with a new
sequence number. Only one request is active, every one waits indefinitely, and no company XP is added. Each template
earns its short family scene on its first real delivery only; repeated deliveries pay normally but do not create new
badges. The first request pays about 1.5× the barn value, compared with the normal truck's 1.2×, and the higher-value
requests give the new civic investments a useful longer-term role.

Three translated labels — **Brook Basket**, **Sunshine Pantry**, **Clover Kitchen** — brand the same familiar goods.
Changing the label does not change stock or prices; an in-flight label and payment are retained. A free-text company
name, multiple active company contracts, staff slots beyond these two and office tiers 2–3 remain future work.

### Saves, guidance and presentation

`s.growth` stores one hospital stamp, two optional staff assignments, a label ID, bounded delivery counters and four
possible memories (hospital plus three requests). Backup counters/stamps in `firsts` prevent partial imports from
replaying a completed payment or the hospital charge. Loading never awards cash, stock or a memory. If an imported
partial save lost a shipment or its returned money, that sequence retires instead of recreating rewards or trapping
the next offer. Profiles keep separate progress.

The village board puts the current delivery before staff and batch planning. Those larger sections open on demand;
ingredient help explains missing goods and returns to the request. Only earned unread memories affect a badge.
English and Vietnamese share all the same gates, rates, queues and ledgers. Future hospital/police upgrades, trained
skills, apothecary products, staffed walking animations and the later town story still need their own work.
