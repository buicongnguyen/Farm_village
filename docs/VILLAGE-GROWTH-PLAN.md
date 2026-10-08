# Village growth plan: from a simple farm to a rich town

The user's direction (2026-10-08): "at first everything is simple and low gain, but we will gain more money and make
more things which have more benefit, like ginseng or special medicine herbs, that are expensive and earn more. Based
on that, build the first school, then a hospital, police station, supermarket, department store and tall buildings,
then streets for cars, then entertainment, also upgraded gradually."

**The rule:** each stage's income pays for the next stage's buildings. Tools that only raise volume (trucks, barn
space) stay cheap. The big money goes to civic buildings and their upgrades, which make the village visibly richer.

| Stage | Level | New income | What it pays for | Status |
|---|---|---|---|---|
| 1. Home farm | 1–6 | wheat, carrot, corn, pumpkin, eggs, milk, bread, fruit, fish (2–20 coins each) | repairs, barn, feed mill, coop, bakery, trucks (400 / 900) | live |
| 2. Premium crops | 7–10 | **healing herb** (45, 15 min, level 7), **ginseng** (120, 40 min, level 9) | the school (restored), clinic upgrades | **this PR** (crops, models, icons) |
| 3. Services | 10–14 | herbal remedies made from herbs (an apothecary recipe), school-trained helpers | **hospital** (clinic upgrade), **police station** | planned |
| 3b. Food factories | 12–16 | **processing the same farm goods for more profit**: a noodle factory (wheat + egg → instant noodles), a snack factory (corn, potato-style crops → chips; fruit → dried fruit), later a herbal tea packer (herb → tea) | the shop buildings below; each factory has upgrades for more slots | planned (user idea, 2026-10-08) |
| 4. Shops | 14–18 | shop takings: supermarket and department store sell your goods at a markup | **supermarket**, **department store** | planned |
| 5. Town | 18–24 | rent from apartments | **tall buildings** (apartments), **paved streets with cars** | planned |
| 6. Leisure | 24+ | visitors' spending | **entertainment**: park and playground, cinema, fair | planned |

Every building has 2–3 upgrade levels; each level costs more and earns or helps more, so the village grows
gradually instead of in jumps.

## Lanes

- **Art (Claude):** crop models and icons (done for stage 2); then the hospital tier, police station, supermarket,
  department store, noodle and snack factories (with their product icons), apartment blocks, road and car set, and park/cinema models, each with upgrade tiers and icons.
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
