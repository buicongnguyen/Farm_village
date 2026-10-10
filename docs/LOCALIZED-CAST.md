# Localized character names

Follow-up: [LANGUAGE-EDITIONS.md](LANGUAGE-EDITIONS.md) adds full Korean and Japanese catalogs and selectable editions.
The naming-only scope and verification below describe PR #34, before that follow-up.

Implementation: 2026-10-09, `codex/localized-cast`, from deployed main `7cccfbf`.
The user requested implementation of the playful cast in [CHARACTER-NAMING-PLAN.md](CHARACTER-NAMING-PLAN.md).
Release: [PR #34](https://github.com/buicongnguyen/Farm_village/pull/34), which records CI, Pages deployment and live acceptance.

## What players see

English and Vietnamese each use their own friendly names throughout the current cast. For example, the home
family is Granny Maple, Grandpa Oak, Rosie and Sunny in English; Bà Mận, Ông Quế, Mơ and Bắp in Vietnamese.
Vietnamese speaker labels retain appropriate titles. Bắp calls the elders cụ Mận and cụ Quế in dialogue; the
partner still addresses the player as mình. Cô Trà, Cô Bông and Bác sĩ Sen remain three distinct people with their
existing roles and relationships.

The dog is Biscuit / Cún Đậu, with Đậu used in ordinary Vietnamese sentences. The two named hens are Cloud and
Drizzle / Mây and Mưa. Household labels use a member's localized name without changing who belongs to the family.
The old two-letter desk joke is rewritten to work with each name; letters use localized signatures.

Switching language clears earlier speech bubbles and toasts; a delayed visitor message translates when displayed.
Settings preserves literal entities in imported player names. Story cards stay inside the viewport at enlarged text,
and the phone Friends layout leaves room for names, hearts, liked items and the gift button.

Korean and Japanese aliases are prepared in the same registry for all 19 current people and five named/planned
pets. They do not add Korean or Japanese to the language menu: complete UI/dialogue translations and native review
are still separate work. The planned cat's alias does not implement the cat or meadow.

## How references and old saves work

`src/content/character-names.mjs` keeps localized names behind stable person, pet and household IDs. Authored text
uses explicit references such as `{person:pip:short}`, `{person:ada:display}`, `{pet:dog:short}` and `{family:tran}`.
Short and display forms let each language place titles naturally. Translation runs first, name resolution second,
and ordinary parameter substitution last. Player-entered text stays literal, including text that resembles a name
or a reference token. Ordinary words such as Vietnamese mai, mơ and bắp are not searched and replaced.

Old orders and wishes can contain complete sentences with former names. Fourteen exact authored sentences map to
their current translation keys in `src/content/legacy-name-text.mjs`. Rendering them does not rewrite the saved
sentence, reroll an order, change a price, or advance progress. Unknown prose and near matches are left alone.
Saved person/family IDs, portraits, models, mail IDs, read/deferred history and reward ledgers remain unchanged.
Save version 11 and all three profiles remain compatible.

## Verification and publication

Implementation and local validation are complete. Publication and live verification are recorded in the release PR.

- **417/417 native tests** and `npm run sim` pass. Steady school and clinic remain on day 3; all pace targets pass.
- **All 32 component browser suites** and **28/28 smoke checks** pass, including draw/triangle limits at all tested zooms.
  After the final grandmother-wording clarification, the native and bilingual story browser checks passed again.
- **14/14 production checks** pass: six naming contexts and eight compact-HUD contexts through the normal menu,
  without test hooks. English/Vietnamese cover phone/desktop and 130% text; HUD checks also cover landscape.
- Production first-load code is **1,091,913 bytes**, below 1,100,000; test build is **1,092,764 bytes**.

Coverage includes all four name registries, fallback, referenced-identity parity, Vietnamese kinship/pronouns,
legacy orders/wishes, arbitrary saved prose, literal player input, all three profiles, repeated language switches,
transient speech/toasts and reload without economy/progress changes. Named UI checks include story, advice, orders,
letters/signatures, families, pets, memories, roadmap and Settings. Screenshots were reviewed at 390 px and 130% text.
These are browser viewport checks, not physical-device tests.

No model, icon, palette or lighting changes belong to this release. Meadow/dairy gameplay, further regions, vehicle
restoration and later chapters remain separate items in the larger plan.
