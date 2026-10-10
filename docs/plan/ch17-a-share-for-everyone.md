# Chapter 17: A share for everyone

Status: **done** (PR #92) · Depends on: chapter 16 · Size: one to two sessions

## How to play it (for the owner)

1. After the walk upriver, Penny brings the idea. Open **A company for the whole valley** in Village projects, or the
   Roadmap's **The valley company**, or the **Value** page of the Valley panel.
2. **Found the valley company**: it needs the co-operative, a working company office, a quay house and 20,000 coins.
   Every household gets a share, and a flag goes up at the office's corner by the road.
3. The valley now has **one number, its value**, shown beside the village's name in the top bar in short form
   (124.5K, 1.2M, 1B; 120만, 1.2억 in Korean; 120万, 1.2億 in Japanese). The Value page shows what it is made of:
   coins, goods in the barn, everything built, land, works and upgrades, the herd and the valley's beauty, times its
   **goodwill**.
4. **Goodwill** grows by 8 % with every deed done together: a market day sold on, a shared order, a train sent with a
   full wagon, a festival, and every five hotel guests. That is how the value reaches the marks of the last chapters.
5. **The dividend**: every ten minutes the company sets aside 0.2 % of the valley's assets; six payments at most can
   wait. Collect it on the Value page; a pill "Dividend" shows once half of what can wait is waiting.
6. Founding closes **chapter 17**.

Tester (`?tester`): "Chapter 17" jumps to the idea; "Finish this chapter" founds the company for free.

## What was built, where it differs from the plan below

- In `src/core/valley.mjs`: `assetsOf`, `deedsOf`, `goodwillOf`, `valueOf`, `titleOf`, `shareholders`,
  `companyPlan`, `dividendOf`, the actions `foundValley` and `collectDividend`. Numbers: `VALLEY` in
  `content/economy.mjs`; the titles: `VALUE_TITLES` in `content/journey.mjs`.
- **Goodwill multiplies instead of adding a capped 300 %**: the plan's cap could never reach a hundred million from
  what a farm is worth (about 150,000 at this point). Each deed multiplies the value by 1.08; four hundred deeds at
  most count. This is the dial the release pass turns.
- **The dividend is paid on the assets, not on the value**, so the goodwill that makes the big number does not also
  pour coins into the farm. It is collected on the Value page or from its pill, not at the office's till.
- `short()` and `shortIn(locale, n)` are in `kit/i18n.mjs` and use the browser's own compact numbers, so each
  language gets its convention.
- **The value is beside the village's name**, not beside the coins: the coin counter has no room on a phone.
- Founding counts the founding sum among the valley's works, so the value does not fall by it.
- The titles are data and show on the Value page; chapter 19 hands them out one by one.
- No share-certificate page: the Value page shows a face for every household that holds a share.
- Model: `company_flag`. `tests/company.test.mjs` (7), and a browser check that plays the chapter.
Story source: `JOURNEY.md` 3 (Act V), `STORY.md` 4 (row 17)

## What the player gets

- The **valley company**: the co-operative, the office and the riverside become one thing that belongs to everyone
  who works in it.
- One big number, **the valley's value**, shown in short form (1.2M, 48M), that every part of the game adds to.
- **Shares**: each household holds one, and each pays the farm a small dividend. The start of Act V.

## The deed

`when: s => !!s.valley?.founded`

Founding needs chapter 16 seen, the co-op, the office, the quay house and a founding sum of coins.

## Rules

Extend `src/core/valley.mjs`:

- `valueOf(s)` → the valley's value: coins + barn at market price + every building at cost (with upgrades) +
  parcels + herd + trees + company brands + beauty × a factor. Pure; cached per tick (`s` version stamp).
- `short(n)` in `kit/format.mjs`: `1,250` → `1,250`; `12,500` → `12.5K`; `1,200,000` → `1.2M`; `1,000,000,000` →
  `1B`. Per language where the convention differs (Korean and Japanese count in 만 / 万: `120만`, `1.2억`).
- `foundValley(ctx)`: takes the sum, stamps `s.valley = { founded: now, shares: {} }`, gives one share to each
  arrived villager and neighbour.
- Dividends: every `paced(10 * MIN)`, `valueOf(s) × 0.0005` coins are added to the office's till (collected with
  the office's other income; capped so it must be collected).
- **Value multipliers** that make the last three chapters reachable at testing pace: each of market day, co-op
  orders, train wagons and hotel guests adds a permanent `+1%` to the value's "goodwill" part per completion, capped
  at +300%. This is the lever the release pass tunes.

## Content and story

- `CHAPTERS` id 17, "A share for everyone". Text: the manager brings a ledger with one page per household and the
  same number on every page; Bramble reads his three times; Rosie signs last because she was feeding the hens.
  Maple's line: "Your grandfather would have framed it."
- Beats: `ledger`, `first-dividend` (Sunny asks if she can buy a goat with hers).
- Titles for the value in words at 100K, 1M, 10M, 100M (used in chapter 19).

## View and art

- A brass plate on the company office (a small decal piece) and a flag on its roof once founded.
- No other art.

## Interface

- The value beside the coins in the top bar (short form; tap for the Valley panel).
- Valley panel gains a "Value" tab: the parts as bars, what grew most today, the dividend rate, the next title.
- Share certificates as a keepsake page (one line per household, with portraits).

## Tests

Rules: `valueOf` parts and that it never falls when the player spends coins on a building (spending converts, it
does not destroy); `short()` at every boundary and in each language; founding once; dividends accrue and cap;
`when`. Browser: jump to chapter 17, found the company, see the value in the bar and the card.

## Risks

Players read the value as a score. Selling a building must not make it jump down sharply (count refunds); decay of
worn buildings should not subtract.
