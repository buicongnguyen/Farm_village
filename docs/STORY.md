# Hollowbrook: the story bible

This file is the reference for anyone who writes a line for Farm Village. It covers the cast, how each person talks in
English and Vietnamese, the arcs, the chapter plan and the data that carries the story. The text lives in
`src/content/story.mjs`, `people.mjs`, `hearts.mjs` and `letters.mjs`, and the Vietnamese lives in `src/i18n/vi.mjs`.
`tests/story.test.mjs` checks the rules below. `tests/story.browser.mjs` checks that the cards fit a 390 px phone.

## 1. The premise

Hollowbrook was a busy mill village. Then the mill closed. The young families followed the work to the city, the
school and the shop shut, and the houses emptied one by one. Granny Maple stayed. Her husband Grandpa Oak spends most of his days
fishing upriver. Maple writes to her grandchild, the player: *"The key is under the seed tin. Bring Hollowbrook home."*
The player comes with their partner Rosie and their child Sunny.

Rules for every line:
- **Nobody refers to someone the player has not met.** People are introduced on a card, in a beat or in a letter before
  others mention them. Oak is the one exception: Maple mentions him from the first card, and his first letter explains
  where he is.
- **The player never speaks.** Scenes are three lines from the people around them.
- **Children sound like children.** They are short, concrete and funny, and they never use adult reasoning or adult
  pronouns.
- **Maple never posts a generic line.** Every one of her lines is about the oven, Oak, Sunny or the old village.
- **Nothing is mean.** Bramble grumbles, but he never insults anyone. Mysteries are sad or strange, never frightening.

## 2. Cast, voices and pronouns

The Vietnamese pronoun pair is "how they refer to themselves – how they address the player". The tests reject the
wrong forms per speaker (for example *tôi* or *bạn* used as "you"). The narrator on chapter cards uses *bạn*.

The permanent IDs below identify the same people in every profile and language. The alias registry in
`src/content/character-names.mjs` contains English, Vietnamese, Korean and Japanese forms. Only English and Vietnamese
are full interface languages. Korean/Japanese aliases are prepared data, pending native dialogue review.

| Stable ID | English / Vietnamese display | Role and voice | Vietnamese pair |
|---|---|---|---|
| `ada` | **Granny Maple / Bà Mận** | Your grandmother and guide. Warm, practical; remembers Oak and the oven. Calls the player “dear”. | **bà – cháu**. Skip: *Cháu biết rồi ạ*. |
| `ellis` | **Grandpa Oak / Ông Quế** | Your grandfather, away upriver. Short, wry letters signed with his localized display name. | **ông – cháu** |
| `june` | **Rosie / Mơ** | Your partner. Calm and teasing; calls the player “love”. | self-reference **Mơ**, addresses the player **mình** |
| `pip` | **Sunny / Bắp** | Your curious child, who names the animals. | **con**; calls Maple and Oak **cụ Mận / cụ Quế** |
| `minh` | **Chip / Chú Mộc** | Carpenter in `tran`; dry, proud of his woodwork. | **chú – cháu** |
| `lan` | **Honey / Cô Bột** | Cook in `tran`; generous, remembers her mother's bread. | **cô – cháu** |
| `bo` | **Hopper / Sóc** | Schoolboy in `tran`, 7; frogs, races, his frog Captain. | **cháu** |
| `grace` | **Clover / Cô Bông** | Vet in `okafor`; brisk, kind, dry jokes about city poodles. | **cô – cháu** |
| `sam` | **Dash / Chú Gió** | Postman in `okafor`, grew up here; chatty, loves the long way home. | **chú – cháu** |
| `zara` | **Dot / Cốm** | Schoolgirl in `okafor`, 8; bookish, “not even scientific”. | **cháu** |
| `elin` | **Poppy / Chị Nắng** | Painter in `lindqvist`; thinks in colours. | **chị – em** |
| `olaf` | **Skipper / Ông Buồm** | Retired sailor in `lindqvist`; slow, fond, sea words. | **ông – cháu** |
| `marisol` | **Bonnie / Cô Trà** | Nurse in `reyes`; organised, campaigns for the clinic. | **cô – cháu** |
| `tomas` | **Rusty / Chú Đinh** | Mechanic in `reyes`; fixes things and notices machines. | **chú – cháu** |
| `pia` | **Tilly / Su Su** | Young neighbour in `reyes`, 5; counts everything. | **cháu** |
| `cora` | **Winnie / Cô Mầm** | Teacher, arrives with the school; bright and dry (“the staff is me”). | **cô – cháu**; addresses pupils **các em** |
| `mai` | **Daisy / Chị Na** | Lotus Farm neighbour; cheerful, ducks and tea. | **chị – em** |
| `gus` | **Bramble / Bác Khoai** | Old Mill Farm neighbour; grumbles, secretly soft. | **bác – cháu** |
| `hazel` | **Dr Fern / Bác sĩ Sen** | Elder doctor, returns with chapter 5; quiet and practical. | **bà – cháu** |

Use `{person:ada:display}` for a speaker label and `{person:ada:short}` after a sentence's own title. In Vietnamese,
the child's line needs `cụ {person:ada:short}`, never `cụ {person:ada:display}`. Mơ's self-reference can be an explicit
name where the English says “I” or “we”. The doctor is distinct from both the nurse and the vet: Cô Trà addresses her
former teacher as **cô Sen**, referring to herself as **em**; Bà Mận addresses Sen by name as a fellow elder.

Family captions use `{family:tran}`, `{family:okafor}`, `{family:lindqvist}` and `{family:reyes}`. Their English labels
are Chip's, Dash's, Poppy's and Bonnie's family; Vietnamese uses Nhà chú Mộc, Nhà chú Gió, Nhà chị Nắng and Nhà cô Trà.
These labels do not change household membership, nationality or parentage. Poppy and Skipper's precise kinship
remains unspecified. Never infer it from their new aliases.

Named pets use `{pet:dog:short}` or `{pet:dog:display}`, with IDs `dog`, `hen_cloud`, `hen_drizzle`, `frog_captain` and
`cat`. The Vietnamese names are
Đậu (introduced as **Cún Đậu**), **Mây**, **Mưa**, **Thuyền Trưởng** and Mít (future introduction **Mèo Mít**). English
retains Biscuit, Cloud, Drizzle, Captain and Miso. The cat remains planned gameplay. Species, goods and model IDs stay
separate from these names.

Never replace ordinary words in rendered text. Vietnamese “Mai” can mean tomorrow, and aliases such as Bắp, Mơ or Bột
can also be ordinary words. Only explicit identity tokens resolve. Player-entered names stay literal. Exact legacy
order/wish sentences have a narrow display compatibility map; names never reroll orders or reset earned progress.
Hopper's old two-letter desk joke is now about checking each carved letter twice, so it works with every alias.
Letter signatures use display tokens, not old initials or surnames.

Place names: Hollowbrook is **Thung Suối** everywhere, including titles and posters. Brook Lane is **ngõ Suối**. The
feed mill is the **cối xay cám**, and chicken and cow feed are **cám gà** and **cám bò**.

UI glossary: the charm score is **độ hấp dẫn** (the decoration category is **Trang trí**); clinic is **trạm y tế**;
bench is **ghế dài**; hay bale is **kiện cỏ khô**; the daily-login garden is **vườn hoa điểm danh**. The cart is
**Xe hàng ra chợ**, available the day after the school opens and returning the game day after each departure.
Use the named-pet tokens above in labels, dialogue and letters. Adult player figures are **Nam / Nữ**.

Pronouns also depend on the listener: Bonnie calls her former teacher Fern **cô** and herself **em**; Maple addresses
Fern by name as a fellow elder. Shared tap-to-chat lines avoid choosing one family relationship for all speakers
(Sunny says **con**, while the other children say **cháu**). Keep Sunny's fallback reactions in `content/chatter.mjs`
so translation coverage and speaker tests include them. Translate complete source sentences before shortening them,
and translate content names in message parameters with `tParams()` before substitution.

## 3. Arcs

- **Maple:** from a lonely keeper of an empty village to a grandmother with a full street. She gets a beat at the end of
  every chapter, and in the end she gets Bramble's thanks (his arc).
- **Oak:** he remains away upriver in the current game, including after fishing unlocks and the school celebration.
  His optional letters move from fishing to low water, the locked sluice and old flour-company papers. They establish
  a mystery; they do not open the gate or bring Oak home. His return needs a later implemented story and actor.
- **Bramble:** three visits. He sees Maple's stubborn chin in you, slips that he learned on her oven, and finally admits that
  Maple taught him to bake the winter the mill froze. The letter in Dash's heart scenes (the night the stage burned) is
  the start of his chapter 9 story.
- **The water and festival mysteries are distinct:** the old flour-company papers concern the water agreement. Bramble
  did not confess to locking the sluice, and there is no playable key under the school bell. His personal story is the
  lantern-stage fire and the children he rescued, reserved for chapter 9. Do not give the incidents exact dates until
  the complete timeline is authored. The existing school celebration is not the restored Harvest Festival.
- **The families:** each has three heart scenes (3, 6 and 9 hearts), two wishes and an arrival.
  - **Chip's family:** Chip is curious about the mill wheel, Honey rebuilds Maple's recipe book, and Hopper has his frog and his
    desk.
  - **Dash's family:** Dash grew up here, and Clover makes Bramble say thank you out loud.
  - **Poppy's family:** Poppy finds the festival poster, and Skipper meets Oak upriver and decides to stay.
  - **Bonnie's family:** Bonnie builds the clinic list and recruits Dr Fern, and Rusty finds the locked sluice gate.

## 4. Chapters

Cards are data in `CHAPTERS`. Card 1 opens the game. Cards 2–4 close their chapter with Maple's line (`ada`). Card 5 closes the clinic chapter in v0.4. Each card can have up to three panels (`panels`, `public/assets/story/chN-M.webp`, made
by `scripts/story-panels.mjs`). Short beats between cards are in `BEATS`.

| # | Title | Shown when | Beat |
|---|---|---|---|
| 1 | A key and a seed tin | The game starts | Why the village emptied, and Maple's letter. Maple: "Mind the weeds…" |
| – | *First loaf* (beat) | Maple's first order is filled | Maple has flour on her hands. Sunny asks for jam. |
| 2 | Something takes root | The feed mill and coop are built and the first hens arrive | Maple's oven is warm again. Sunny names the hens Cloud and Drizzle (*Mây*, *Mưa*). Bramble watches from the lane. |
| 3 | A light in the window | The first family moves in | Chip's family on Brook Lane. Maple: Honey brought soup. |
| – | *Dash's family are coming* (beat) | The second cottage is built | Maple remembers Dash on his red bicycle. |
| – | *Welcome bread* (beat) | The five loaves for Dash's family are delivered | Honey's ribbons; "bread on the doorstep". |
| 4 | A bell for the children | The school opens (end of v0.1) | Winnie's bell. Bonnie's letter about the clinic. Maple: Oak carried the bell. |
| 5 | Someone to care for us | The clinic is built and four families have arrived | Fern returns, Clover has a vet room, Maple plants cherries; Fern remembers Bramble's burned hands. |

**Chapter 5 is complete in v0.4; chapters 6–9 are planned for later versions.** Chapters 10–20 and how each chapter opens a stage of the game are in `JOURNEY.md`.

| # | Title | Story | The mystery thread |
|---|---|---|---|
| 5 | Someone to care for us | Four households. Bonnie's petition brings Dr Fern home, and the clinic reopens. Fern is a doctor, which settles the nurse overlap: Bonnie is the nurse. | Fern remembers the night of the fire: she treated Bramble's burned hands. |
| 6 | Market day | Six households. The square and its shops come back, and Hugo the baker arrives. | Rusty and Dash learn that the upriver land, with the sluice gate, belongs to a city flour company. |
| 7 | Safe streets | Eight households. Pearl reopens the police post. | Pearl reads the old reports. The sluice was closed the summer before the mill shut, and the wheel had no water. |
| 8 | Work for everyone | Ten households. The company office reopens, and Bea runs it. | With Oak's notes, the village buys the water rights back from the office's first big contract. The sluice opens and the mill wheel turns again. |
| 9 | The village sings again | The festival stage is rebuilt. | Bramble tells the truth: a storm knocked over the lanterns he was minding, and the stage burned. Maple's undelivered letter (in Dash's scene) thanked him for saving the children that night. Bramble lights the first new lantern. |

### Optional picnic memory

`src/content/exploration.mjs` adds a three-step trail after the first order: a porch note, a ribbon in a pondside tin,
and a family recollection back home. Maple once took the picnic basket to the pond while the bread stayed at home.
Sunny volunteers to carry the bread next time; Rosie brings the blanket. Completion grants one stored flowerpot.
Steps and acknowledgment are saved independently of chapters and letters. This trail does not reveal a sluice key,
bring Oak home, or advance chapter 6. Its English and Vietnamese follow the same progression and use the current
localized aliases through explicit tokens. The Vietnamese lines live in `vi-exploration.mjs`.

## 5. Data and schemas (shared with the play and ui packages)

- `story.mjs`: `VILLAGE_NAME`. `CHAPTERS[]` = `{ id, title, subtitle, icon, text, ada, panels: [{ img, caption }], when(s), teaser? }`.
  `BEATS[]` = `{ id, chapter, when(s), lines: [{ who, text }] }`, each shown once. `TUTORIAL[]` is spoken by Maple, and
  its text has `<b>` around the action verbs.
- `people.mjs`: every poster has `orders: [4–6 lines]`. `VILLAGERS` adds `june`, `pip` and `ellis` with
  `family: true, noOrders: true` (Oak also has `away: true`). Rosie has `tip` (the stuck tip) and `tips`. Sunny has
  `says[eventType] = { first?, lines }` and `idle`. Neighbours keep `comments` (in the order of `commentFor`'s facts) and
  add `remarks: [{ fact, text }]`. `REMARK_FACTS[fact](s)` gives the `{count}` or `{family}` parameters, or null; translate
  `family` with `t()` before filling. Bramble has `arc: [{ visit: 1–3, text }]`.
- `hearts.mjs`: `HEART_SCENES[personId][3|6|9] = { lines: [{ who, text }] × 3, reward: { decor } | { coins }, variants? }`.
  A variant is `{ when: { type: 'count', key, value }, lines: [{ who, text }] × 3 }`. `sceneFor(id, at, state)` picks
  the first matching variant; without state it returns the default. Heart events carry only its numeric `variant`
  index (or null for the default), so the UI shows the context when earned without storing dialogue in save history. Dot and Rusty react to the school; Bonnie reacts to the clinic.
  These variants keep the same threshold and reward and never replay an already-earned scene.
  Rewards are decorations unless the lines hand over money (ECONOMY.md section 1 keeps coin rewards out of the pace).
  `WISHES[personId] = [{ text, need: { kind, near: 'home' } }]`. `ARRIVALS[familyId] = [{ who, text }] × 3`.
- `letters.mjs`: `LETTERS[] = { id, from, when, also?, after?: [letterId], text }`. `when` (and the optional second test `also`) is
  `{ type: 'chapter' | 'hearts' | 'level', value }` or `{ type: 'stat', key, value }` (`s.stats[key]`, a dotted key reads
  deeper, e.g. `liked.sam`) or `{ type: 'count', key, value }` (how many of a building). For `hearts`, the value is the
  hearts of `from`. **A letter only names what has happened by then:** Maple's "you sold your first wheat" waits for the
  first order (`stat ordersFilled 1`), Bramble's "your fence is crooked" for a fence and a harvest, Dash's "thank you for
  the pumpkins" for a liked gift to Dash.
  `after` requires the named earlier letters to be read before delivery or first reading. The clue order is
  `ellis-1 → ellis-2 → ellis-3 → ellis-4 → ellis-5 → ellis-6 → gus-3 → ellis-7 → ellis-8`; world milestones still apply.
  Existing read letters remain acknowledged and never grant their gift twice. An old save with unread later clues
  must read their earlier letters first. This is optional story order only: no project or activity requires reading mail.
  `letterDue` checks world milestones (also used by old-save migration); `letterReady` adds clue order, and
  `letterPrerequisite(state, id)` identifies the earliest unread predecessor for the UI. Daisy calls the hens Cloud and
  Drizzle; Biscuit is the dog.
- Heart scenes exist for everyone who can earn hearts: residents, and Maple, Winnie, Daisy and Bramble (Maple's carry the Oak
  thread: his hat, his empty place at the table, the lamp kept for the day Hollowbrook comes home; Bramble's carry the
  Harvest Festival: fence posts, the bread prize he won in Maple's oven, "somebody should start it again").
- Story order: Maple names Dash's family ("the next family is Dash's") once Chip's family live in the village and the
  second cottage is the project, and Honey's welcome bread plays only after that. Every `likes` entry is a real good
  (Poppy likes peaches, fruit for a still life).
- Rosie's urgent tips are `JUNE_TIPS` in `people.mjs` (Rosie says mình to the player); the pronoun test reads them and the
  neighbours' `comments` too.

## 6. Writing checklist

1. Write the English line in the speaker's voice (section 2) and keep it short. Chapter text has at most 340
   rendered characters, and a tutorial step at most 170. Count the resolved names, not the token source length.
2. Add the Vietnamese line to `vi.mjs` with the speaker's pronoun pair and the same `{placeholders}`. Identity forms may differ by language
   for natural kinship; the referenced person remains the same. Resolve names before inserting user-entered text.
3. Run `npm test`. Coverage, consistency and pronouns are all checked there.
4. For a new card, run `tests/story.browser.mjs` and look at the `story-*.png` screenshots at 390 px in both languages.
