# Hollowbrook character naming plan

Status: **editorial proposal for review, 2026-10-08**. No runtime names, identifiers, saves, dialogue, translations, or assets are changed by this document. The existing story remains authoritative until an implementation pass adopts an approved name set. This proposal responds to the user's request for appealing, distinctive names, explicitly replacing **Pip** and avoiding an interchangeable collection of short, generic names.

The recommended central family is **Althea, Oswin, Sylvie, and Tavi**. The four resident households retain their surnames and existing story roles. Elin and Marisol remain because their names already give their characters clear identities. Distinctiveness here is an editorial judgment about this ensemble, not a claim about population frequency or a name's origin.

## 1. Naming direction

Use names that feel like people the player could remember after a brief meeting. Adults may have fuller names; children need names that work naturally in short, excited sentences. Mix lengths and rhythms so the cast does not sound like a list of interchangeable two- or three-letter nicknames.

The proposed set follows these rules:

- **Pip is retired as a visible character name.** The internal ID can stay `pip` for compatibility.
- Keep each established household recognizable. Retain Tran/Trần, Okafor, Lindqvist, and Reyes; change given names without rewriting family history or inventing nationalities.
- Preserve cultural cues already present in names. The Vietnamese-rooted proposals use their diacritics in both English and Vietnamese. Existing surnames suggest cultural connections; they do not establish citizenship, birthplace, ethnicity, or a complete biography.
- Give frequently interacting characters different first sounds and word shapes. The player family, children, neighbours, and clinic staff receive particular attention. Absolute uniqueness of initial letters across the entire future cast is unnecessary; distinguish people the player meets together.
- Avoid names of prominent reference-game characters where a direct collision would weaken this game's identity. **Sam and Gus** already overlap with Stardew Valley and are replaced. Complete the external reference-cast check before accepting the set; this draft does not claim exhaustive clearance.
- Take inspiration from reference games' readable ensembles and consistent naming systems, not their signature names, catchphrases, or biographies.
- Distinguish a person's name, relationship title, and role. A doctor has a name and a localized title; a child does not need a family relationship invented to justify a role label.
- Keep the player-created name. The protagonist stays silent and is addressed through the established relationship rules.
- Use one agreed name sheet for English text, Vietnamese text, story documentation, asset captions, and UI. Do not let a dialogue translation silently rename somebody.

The animal names remain a separate, intentional register: simple names a child could plausibly give a friend. Their clarity and recurring pairings are useful. The human cast carries the larger distinctiveness pass.

### What the reference games suggest

The following comparisons were checked on 2026-10-08. The game facts are sourced; the lessons for Hollowbrook are **design judgments**, not evidence that a particular name increases retention or appeals to every age group.

| Reference | Verified pattern | Lesson for this cast |
|---|---|---|
| Hay Day | Greg has a recurring identity and his farm hosts calendar-event gift boxes. [Supercell: Greg](https://support.supercell.com/hay-day/en/articles/greg.html) | An ordinary name can become memorable through repeated useful encounters. Our more distinctive names still need helpful actions, jokes and remembered history. Renaming alone cannot fix repetitive conversation. |
| Stardew Valley | The cast mixes short familiar names such as Sam and Gus with names such as Maru, Demetrius and Krobus. Villagers have individual routines and gift preferences. [Villagers, official wiki](https://wiki.stardewvalley.net/Villagers) | Vary sound and length across the ensemble. Avoid our current Sam/Gus overlap as an editorial choice, while retaining strong existing names such as Marisol. Give every person something recognizable to do. |
| Animal Crossing: New Horizons | Nintendo's guidance associates Isabelle with island advice and Tom Nook with arranging bridges and inclines. [Play Nintendo tips](https://play.nintendo.com/news-tips/tips-tricks/animal-crossing-new-horizons-discover-tips/) | Pair names with stable roles the player learns through play. Coralie belongs to the school; Leandro helps with repairs; Sylvie offers useful farm advice. Avoid making every character sound like the same task board. |

The proposed names avoid the specific named characters above and the current Stardew villagers listed in that source. This is a targeted reference check, not a claim that no game anywhere has ever used one of these names. Do not force awkward spellings merely to seek universal uniqueness.

For adults and children playing side by side, first introductions should show **name + recognizable role**, then use the name consistently. Longer names may wrap; do not automatically shorten Quang Minh to Minh or Beatrix to Bea and reintroduce the ambiguity this plan removes. Test the names aloud with readers of both languages before the final cast is adopted.

## 2. Current humans: complete inventory and recommended set

There are **19 named current humans**, including the grandfather who is present only through letters, plus the player. IDs below are existing implementation identifiers and remain stable under the proposal.

| Stable ID | Current display | Proposed display | Household and established role | Naming/story notes |
|---|---|---|---|---|
| `ada` | Ada | **Althea** | Player's grandmother; Ellis's wife; village guide and baker | Full, warm name for the village keeper. No surname is established. Preserve her memories, practical voice, and relationship to the player. |
| `ellis` | Ellis | **Oswin** | Player's grandfather; Ada's husband; away fishing upriver | Distinct from Althea and the younger family. Remains letters-only in the current game. His English signature changes from `-E` to `-O`. |
| `june` | June | **Sylvie** | Player's partner; practical, calm, teasing; helper and adviser | Keeps an adult identity beyond a month-name association. Her Vietnamese self-reference must change wherever she calls herself June. |
| `pip` | Pip | **Tavi** | Player's child; curious observer, helper, animal namer | Mandatory replacement. Short enough for school scenes and speech bubbles, with a clear shape beside the other children. Do not invent a longer legal name or new gender/history. |
| `minh` | Minh | **Quang Minh** | Tran family; carpenter; Bo's father | Retains Minh within a fuller given-name form. English and Vietnamese both display Quang Minh. |
| `lan` | Lan | **Thanh Lan** | Tran family; cook/baker; Bo's mother | Retains Lan within a fuller given-name form. Her mother's bread and Althea's recipe book stay central to her story. |
| `bo` | Bo | **Bảo Lâm** | Tran family; boy, 7; frogs, races, school desk | Replaces the very short name with a distinct given-name form. Rewrite the `B-O. Two letters` desk joke; a text replacement alone is insufficient. |
| `grace` | Grace | **Ifeoma** | Okafor family; vet; Sam's wife; Zara's mother | Preserves the household's existing cultural naming cues without assigning a nationality. Brisk, kind, dry humour stays. |
| `sam` | Sam | **Chike** | Okafor family; postman raised in Hollowbrook; future driver | Removes a prominent reference-cast overlap. Keep his red-bicycle memory, long route home, and undelivered-letter arc. |
| `zara` | Zara | **Nkiru** | Okafor family; girl, 8; reader and science enthusiast | A distinct child name within the household and ensemble. Update the joined-up-writing letter and signature. |
| `elin` | Elin | **Elin** | Lindqvist family; painter | Retain. The existing name is readable and distinctive within this cast. Her exact relationship to Olaf is not specified. |
| `olaf` | Olaf | **Rorik** | Lindqvist family; retired sailor; elder | Distinguishes the sailor while retaining the household's broad naming cues. Do not label him Elin's husband or father without a separate story decision. |
| `marisol` | Marisol | **Marisol** | Reyes family; nurse; clinic organizer; Hazel's former student | Retain. A strong existing identity connected to her organized voice and petition. |
| `tomas` | Tomas | **Leandro** | Reyes family; mechanic; Pia's father | Fuller name with a different rhythm from Marisol and Paloma. His mechanical curiosity and sluice discovery remain intact. |
| `pia` | Pia | **Paloma** | Reyes family; girl, 5; enthusiastic counter | Distinct from the other children. The review has corrected the unsupported role label `Little sister` to **Young neighbour**, without inventing a sibling. |
| `cora` | Cora | **Coralie** | Teacher; arrives with the school | An expanded, recognizable name that fits a bright, dry voice. Keep the school relationship and timing. |
| `hazel` | Dr Hazel | **Dr Vesper** | Elder doctor; returns from the coast with the clinic | Retains the existing `Dr + name` display convention. Do not invent a surname or assume Vesper is a family name. She remains the doctor; Marisol the nurse; Ifeoma the vet. |
| `mai` | Mai | **Hải Yến** | Lotus Farm neighbour; ducks, tea, barter | Fuller Vietnamese-rooted given-name form. No surname or nationality is established. Her grandmother's trading history with Althea stays. |
| `gus` | Gus | **Bramwell** | Old Mill Farm neighbour; grumbling baker; festival rescuer | Removes a prominent reference-cast overlap and gives the older neighbour a fuller identity. Keep warmth beneath the grumbling; do not turn the name into a villain cue. |
| `you` | You / player choice | **Player choice** | Silent protagonist | Preserve `settings.playerName`, the existing choice of player figure, and the localized fallback. Do not supply a fixed canonical personal or family name. |

Household labels remain **The Tran family / Gia đình Trần**, **The Okafor family / Gia đình Okafor**, **The Lindqvist family / Gia đình Lindqvist**, and **The Reyes family / Gia đình Reyes**. Their internal family IDs remain `tran`, `okafor`, `lindqvist`, and `reyes`.

Suggested ensemble checks before approval:

- The family at home: **Althea, Oswin, Sylvie, Tavi**.
- School friends: **Tavi, Bảo Lâm, Nkiru, Paloma**, taught by **Coralie**.
- Clinic: **Marisol, Ifeoma, Dr Vesper**.
- Workshop and village repairs: **Quang Minh, Leandro, Rorik**.
- Visiting growers: **Hải Yến, Bramwell**, followed later by the future neighbours below.

These groupings are reading checks, not new clubs, mechanics, or story events.

### Optional central-family alternatives

Use the recommended quartet as one set. Alternatives below are review options only, not nicknames to mix into dialogue.

| Role | Recommended | One alternative | Editorial difference |
|---|---|---|---|
| Grandmother | Althea | **Aveline** | A softer, more flowing sound; keep the same practical character. |
| Grandfather | Oswin | **Ansel** | More clipped and direct; would change the letter signature to `-A`. |
| Partner | Sylvie | **Delphine** | Longer and more formal; phone-width check becomes more important. |
| Child | Tavi | **Fenn** | More compact and earthy; requires the same complete retirement of Pip. |

Any chosen alternative must pass the same reference-cast and ensemble checks. Do not offer a second complete cast alongside this plan; settle the central family, then maintain one canonical table.

## 3. Planned humans, including both twins

These are **proposed names for future characters**, not claims that their chapters, dialogue, relationships, or mechanics are implemented. Current JOURNEY explicitly leaves Priya and the twins' identities and first meetings unfinished. Older DESIGN provides farm and surname cues; these remain useful context but do not override the master plan.

| Current planning name | Proposed display | Existing/planned ID status | Established proposed role and limits |
|---|---|---|---|
| Hugo | **Florian** | No current person ID | Baker who arrives with the market; a later dairy request. Keep his bakery role distinct from Thanh Lan's family cooking and future hired work. |
| Pearl | **Solveig** | No current person ID | Officer who reopens the police post and reads the old reports. No family or nationality is established. |
| Bea | **Beatrix** | No current person ID | Company-office manager and later adviser. The full name replaces the abbreviated display; do not alternate Bea/Beatrix without an explicit nickname rule. |
| Priya | **Kavitha** | `priya` already used for a sign/backdrop; no current people record | Future neighbouring grower. Older DESIGN associates Hilltop Orchard, fruit, honey, and a calm voice. Preserve those as planning cues, not a claim of shipped content. |
| The Nguyen twins: first individual | **Duy An** | `twins` currently identifies the shared future sign/backdrop | One of two future growers from the same holding. Older DESIGN supplies Nguyen/Nguyễn and Brookside. Individual role, age, pronouns, and introduction are still to be authored. |
| The Nguyen twins: second individual | **Linh Chi** | No individual person ID yet | Give each twin a separate person ID when implemented. Distinct names support separate identities; do not assign personality or gender solely from the names. |
| Mr Albright | **Mr Wetherby** | No current person ID | Flour-company businessman; first name remains unspecified. The opening sound is distinct from Coralie and Kavitha. He is capable of learning, not a designated villain. The business-choice design is separate from naming. |
| Nana Tuyết | **Nana Tuyết** | No current person ID | Retain the distinctive existing name. Pine Ridge keeper and Althea's old school friend. Nana is an affectionate title, not evidence that she is related to the player. |

The twins' English household label can remain **The Nguyen twins** for continuity with the existing family-label convention; Vietnamese uses **cặp song sinh nhà Nguyễn**. Their individual given names retain accents identically in both languages. Full legal-name order is unnecessary for the current UI; establish it separately if a later scene genuinely needs it.

Future Pine Ridge households, other residents needed for later household counts, and the player's absent parent do not yet have authored identities. Do not fill these gaps with extra names merely to complete a list. The master plan defers the absent-parent addition.

## 4. Named animals

The recommended animal set retains the five canonical names. They already have distinct referents and child-readable roles; keeping them also preserves the recent correction of the conflicting hen names. No character should share the dog's name.

| Canonical animal | Recommended name | Implementation identity | English / Vietnamese rule |
|---|---|---|---|
| Farm dog | **Biscuit** | Walker ID `dog`; kennel building kind `kennel` | **Biscuit** in both languages, including kennel labels, dialogue, and mail. |
| First hen | **Cloud** | No dedicated named-person ID; first hen reaction | **Cloud / Mây**. This is an intentionally translated descriptive pet name. |
| Second hen | **Drizzle** | No dedicated named-person ID; second hen reaction | **Drizzle / Mưa Phùn**. Keep the weather-name pairing with Cloud. |
| Bảo Lâm's frog | **Captain** | Mentioned in dialogue; no separate actor | **Captain / Thuyền Trưởng**. Keep the child's earnest title. |
| Future barn cat | **Miso** | Planned name in roadmap; existing decorative cat asset | **Miso** in both languages. Naming the planned cat does not implement its barn role. |

**Pancake is obsolete**, not an additional canonical animal. The review identified unused translations describing hens named Pancake and Biscuit; current English content establishes Cloud and Drizzle. Those unused keys are removed in the review follow-up rather than made part of the story. Mail stores a letter ID and resolves current content, so these retired keys are not needed to preserve old letters.

The teddy, horse, other livestock, ducks, geese, fish, and wildlife have no individual canonical names. A child says the pond fish share a name, but that name is never supplied; do not invent it in this pass.

## 5. English and Vietnamese identity sheet

Human personal names refer to the same people in both languages. Relationship words and professional titles adapt to the speaker and listener. The renaming pass must preserve the story facts in both versions, not just substitute labels in the English source.

| Character(s) | Established Vietnamese relationship rule after rename |
|---|---|
| Althea | **bà – cháu**; player role label remains **Bà nội**; the established tutorial response remains **Cháu biết rồi ạ**. |
| Oswin | **ông – cháu**; remains away upriver in current content. Review each letter's localized sign-off deliberately instead of mechanically appending `-O`. |
| Sylvie | Refers to herself as **Sylvie** and addresses the player **mình**. |
| Tavi | Uses **con**. Calls Althea and Oswin **cụ**, reflecting that they are the child's great-grandparents. English Granny/Grandpa remains the established affectionate convention unless separately rewritten. |
| Quang Minh, Chike, Leandro | **chú – cháu**. |
| Thanh Lan, Ifeoma, Marisol, Coralie | **cô – cháu**. Coralie calls pupils **các em**. |
| Bảo Lâm, Nkiru, Paloma | **cháu**, preserving the distinction from the player's own child. |
| Elin, Hải Yến | **chị – em**. |
| Rorik | **ông – cháu**. |
| Bramwell | **bác – cháu**. |
| Dr Vesper | **bà – cháu** toward the player. Marisol calls her former teacher **cô** and herself **em**; Althea addresses Vesper as a fellow elder. |

Future characters need their own speaker/listener rules before implementation. Do not infer Vietnamese pronouns for the twins, Kavitha, or other future people from their proposed names alone.

Names may receive appropriate relationship prefixes in Vietnamese display text: for example **Bà Althea**, **Cô Coralie**, **Bác Bramwell**, and **Bác sĩ Vesper**. These prefixes do not change the canonical name. Keep existing place translations, especially **Hollowbrook / Thung Suối**, outside the character rename scope.

Name-dependent lines need authored replacements:

- The desk scene must reflect Bảo Lâm's new name without the old two-letter spelling joke. Keep the joke about a proud carpenter spending all night on a small personal detail.
- Nkiru's letter should still show the child's pride in writing her name, with the same age and factual content in both languages.
- The grandfather's English letter signature must match Oswin; retain the localized letter style rather than assuming every Vietnamese letter includes a signature today.
- Tavi's self-introduction to a hen, the recipe-book inheritance line, Brook Club lines, school play, and family references all use the new names.
- Titles, apostrophes, capitalization, diacritics, and names embedded inside complete sentences must be reviewed together.

## 6. Confirmed content follow-ups

These are existing inconsistencies or unresolved facts found during the inventory. Record their treatment in the eventual implementation PR.

| Finding | Required treatment |
|---|---|
| Pia's former role was `Little sister`, but no sibling is identified | Corrected in the review to **Young neighbour / Cô bé hàng xóm**; no name or family-history change. |
| `vi-cast.mjs` retained an unused Pancake hen reaction | Removed in the review after auditing callers; preserve the canonical Cloud/Drizzle sequence. |
| `vi.mjs` retained a superseded letter describing Pancake and Biscuit as hens | Removed in the review; saved mail resolves its stable ID to current text. |
| The story test preserved Pancake as a proper name | Replaced by canonical animal-name coverage in the review. |
| Elin and Olaf share a household, but their exact kinship is unspecified | Preserve this uncertainty for Elin/Rorik; a rename must not turn them into spouses or parent/child. |
| Hazel uses `Dr` before her name, without a documented surname distinction | Preserve the display convention for Dr Vesper; avoid claiming a full legal name. |
| Priya and twins have map IDs but no implemented people records | Preserve existing sign IDs; label all proposed identity work as future. |
| Twins are grouped in old planning text | Give them individual names and later separate authored voices, while retaining the shared holding identity. |
| Several names also occur in older research or asset provenance | Update active story-facing guidance, but do not rewrite factual provenance as if source assets were originally named after the new cast. |

## 7. Technical implementation plan

This section describes a later authorized implementation. This document alone makes no runtime changes.

### 7.1 Keep identity separate from display

Preserve existing internal person IDs, family IDs, event IDs, letter IDs, beat IDs, asset IDs, and building kinds. For example, `pip` may display **Tavi**, `gus` may display **Bramwell**, and `ellis-1` remains the same letter after Oswin signs it. This avoids resetting friendships, replaying rewards, or orphaning save data.

Existing ID references include:

- `s.people`, family assignments in `s.homes`, and `s.neighbours`.
- Order senders, gift statistics such as `stats.liked.sam`, wishes, mail senders, heart-scene history, and saved news event payloads.
- Letter prerequisite chains such as `ellis-1` through `ellis-8`, and beats such as `biscuit-home` and `okafors-coming`.
- Walker identities, helper events, appearance maps, speaking rules, portrait references, and the future `priya`/`twins` signs.

If a later engineering task chooses semantic IDs, it must be a separately reviewed migration with a complete old-to-new mapping. That migration is unnecessary for this naming change.

### 7.2 Update every visible source, not just `name`

Audit at least:

- `src/content/people.mjs`: display names, orders, idle remarks, self-introductions, family references, advice.
- `src/content/story.mjs`, `hearts.mjs`, `letters.mjs`, `chatter.mjs`, and `journey.mjs`: chapter prose, speakers' text, signatures, captions, wishes, future roadmap labels.
- Other content labels containing people or pets, including `buildings.mjs`.
- UI literals in `src/ui/guide.mjs`, `hud.mjs`, `panels.mjs`, and the name lookup/rendering paths in bonds panels.
- `src/view/people-view.mjs`: the `FAMILY_NAMES` fallback and any hard-coded visible names. Keep behaviour IDs and palette keys stable.
- `src/i18n/vi.mjs` and contributing dictionaries such as `vi-cast.mjs`: complete exact-English keys and Vietnamese values, including inherited/stale entries and translated parameters.
- Story bible, journey, master plan, task list, art brief, and active asset requests so the two lanes use one cast sheet.

Where practical, route labels through the existing people data instead of adding another hard-coded name table. A broader localization architecture rewrite is outside this task.

### 7.3 Handle old saves that contain literal text

Stable IDs protect relationships and progress, but they do **not** update every already-saved visible sentence. Current save data stores:

- `orders.cards[].line`: the English source sentence selected when an order was created.
- `wishes.list[].text`: the chosen wish sentence, which can mention another character.

Create an explicit mapping from old canonical source sentences to their new versions, and normalize these supported persisted fields on load. Keep the order's sender ID, goods, amount, reward, timing, and completion state unchanged. Keep each wish's home, person, kind, and done flag unchanged. Do not regenerate cards, reroll wishes, reset letters, or grant story rewards during a text migration.

Mail content is looked up from its stable letter ID, and heart scenes are looked up from person/threshold/variant metadata; preserve those identifiers so they naturally render current names. Review saved news payloads for any exceptional literal text before claiming full coverage. Do not perform unrestricted string replacement over arbitrary saves or the player's chosen name.

Keep compatibility for old imported saves as well as the current browser save and backup. Decide whether retired translation keys are removed immediately or kept briefly for compatibility; either choice must have a documented caller and a test, not accidental duplicate lore.

### 7.4 Assets and lane coordination

Portrait icons use stable `person:<id>` and `family:<id>` identities. Shared rigs are generic models. A name-only pass should not rename `.glb` or `.webp` files, change character appearance, or rebuild binary assets.

`hana.glb` is the source rig currently used for Ada/Althea, not a second Hollowbrook character. Preserve its factual provenance. Review story pictures and captions for visible lettering; only actual text embedded in an image would need an art-lane follow-up. Do not presume that such lettering exists without inspecting it.

Logic owns content, UI behavior, Vietnamese, and compatibility. Art owns any required image or model edits under AGENTS.md. A new name does not itself authorize a visual redesign or a new model.

### 7.5 Verification and acceptance

Verify meaningful outcomes:

1. Every current and planned named character appears exactly once in the approved identity sheet, including both twins and the five named animals.
2. The home family, children, clinic staff, and neighbours are easy to distinguish when their names are read aloud and displayed together.
3. English and Vietnamese preserve relationships, ages, arrivals, story order, and the same named individuals. Diacritics render correctly.
4. New-game UI contains no retired visible human names. Remaining occurrences are deliberate stable identifiers, historical provenance, migration source strings, or tests of compatibility.
5. An old save containing an order and wish with a retired name loads with new display text and unchanged economic values, completion states, bonds, mail-read flags, and scene rewards.
6. Existing story, translation-coverage, pronoun, rules, and simulation checks pass. Follow the repository's required build and browser checks for the implementation scope.
7. Inspect phone dialogue, chapter cards, order cards, mail, neighbour labels, and family labels at 390 px in English and Vietnamese. Fuller names must wrap without covering actions or overflowing bubbles.
8. Ensure known reference-cast collisions were checked against official sources before adopting the set. A shared ordinary name is not automatically copying, but prominent avoidable collisions should be considered deliberately.
9. Add implementation notes to CHANGELOG and the journey status only when the runtime pass actually happens. Do not mark this proposal as shipped.

## 8. Source notes

Repository evidence for this draft:

- [Story bible](STORY.md): cast, pronouns, relationships, animal names, chapter boundary, and story rules.
- [Journey](JOURNEY.md): proposed later cast, Nana Tuyết, the businessman, future cat, and the twins' unsettled status.
- [Master implementation plan](HOLLOWBROOK-IMPLEMENTATION-PLAN.md): current decision precedence, deferred family expansion, language rules, and future story scope.
- [Older design](DESIGN.md): Hilltop Orchard, Brookside, and Nguyen-twins naming cues; use as context, not as current implementation status.
- `src/content/people.mjs`, `story.mjs`, `hearts.mjs`, `letters.mjs`, and `journey.mjs`: implemented names and name-dependent wording.
- `src/core/state.mjs`, `orders.mjs`, `bonds.mjs`, `src/kit/save.mjs`, and `src/view/people-view.mjs`: saved identity/text and display paths.
- `src/i18n/vi.mjs`, `vi-cast.mjs`, and `tests/story.test.mjs`: localized proper-name rules and the stale Pancake remnants.
- [Cast provenance](assets/cast-provenance.md): source-rig names and existing animal assets.

Official reference-game sources are linked in section 1. This proposal makes no claims about name rarity, meaning, etymology, or exhaustive reference-game uniqueness. The review's small consistency fixes do not constitute acceptance or implementation of the proposed human names.
