# Chapter 17: A share for everyone

Status: not started · Depends on: chapter 16 · Size: one to two sessions
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
