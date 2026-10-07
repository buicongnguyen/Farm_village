# Hollowbrook: the story bible

This file is the reference for anyone who writes a line for Farm Village. It covers the cast, how each person talks in
English and Vietnamese, the arcs, the chapter plan and the data that carries the story. The text lives in
`src/content/story.mjs`, `people.mjs`, `hearts.mjs` and `letters.mjs`, and the Vietnamese lives in `src/i18n/vi.mjs`.
`tests/story.test.mjs` checks the rules below. `tests/story.browser.mjs` checks that the cards fit a 390 px phone.

## 1. The premise

Hollowbrook was a busy mill village. Then the mill closed. The young families followed the work to the city, the
school and the shop shut, and the houses emptied one by one. Ada stayed. Her husband Ellis spends most of his days
fishing upriver. Ada writes to her grandchild, the player: *"The key is under the seed tin. Bring Hollowbrook home."*
The player comes with their partner June and their child Pip.

Rules for every line:
- **Nobody refers to someone the player has not met.** People are introduced on a card, in a beat or in a letter before
  others mention them. Ellis is the one exception: Ada mentions him from the first card, and his first letter explains
  where he is.
- **The player never speaks.** Scenes are three lines from the people around them.
- **Children sound like children.** They are short, concrete and funny, and they never use adult reasoning or adult
  pronouns.
- **Ada never posts a generic line.** Every one of her lines is about the oven, Ellis, Pip or the old village.
- **Nothing is mean.** Gus grumbles, but he never insults anyone. Mysteries are sad or strange, never frightening.

## 2. Cast, voices and pronouns

The Vietnamese pronoun pair is "how they refer to themselves – how they address the player". The tests reject the
wrong forms per speaker (for example *tôi* or *bạn* used as "you"). The narrator on chapter cards uses *bạn*.

| Person | Who | English voice | Vietnamese pair |
|---|---|---|---|
| **Ada** | Your grandmother, the guide. Role label: *Bà nội*. | Warm and practical. Remembers Ellis in every other line. Calls the player "dear". | **bà – cháu**. The skip button says *Cháu biết rồi ạ*. |
| **Ellis** | Your grandfather, away upriver (letters only, and fishing in v0.2) | Short, wry, signs "-E". | **ông – cháu** |
| **June** | Your partner. She gives a tip when you are stuck. | Calm and teasing. Calls you "love". | refers to herself as **June** and calls you **mình** |
| **Pip** | Your child | Excited and curious, and names every animal. Calls Ada "Granny Ada" and Ellis "Grandpa Ellis". | **con**. Calls Ada and Ellis **cụ** (great-grandparents). |
| **Minh** (Tran) | Carpenter | Dry, proud of his woodwork | **chú – cháu** |
| **Lan** (Tran) | Cook | Generous; she remembers her mother's bread | **cô – cháu** |
| **Bo** (Tran, 7) | Schoolboy | Frogs, races, has a frog called Captain (*Thuyền Trưởng*) | **cháu**. *Bo* stays *Bo* (never *Bơ*). |
| **Grace** (Okafor) | Vet | Brisk, kind, a dry joke about city poodles | **cô – cháu** |
| **Sam** (Okafor) | Postman. He grew up in Hollowbrook. | Chatty, loves the long way home | **chú – cháu** |
| **Zara** (Okafor, 8) | Schoolgirl | Bookish, "that is not even scientific" | **cháu** |
| **Elin** (Lindqvist) | Painter | Thinks in colours | **chị – em** |
| **Olaf** (Lindqvist) | Retired sailor | Sea words, slow and fond | **ông – cháu** |
| **Marisol** (Reyes) | Nurse. She campaigns for the clinic. | Organised: "I have a list" | **cô – cháu** |
| **Tomas** (Reyes) | Mechanic | Fixes everything and notices machines | **chú – cháu** |
| **Pia** (Reyes, 5) | Little sister | Counts everything | **cháu** |
| **Cora** | Teacher. She arrives with the school. | Bright and dry ("the staff is me") | **cô – cháu**; calls her pupils *các em* |
| **Mai** | Neighbour, Lotus Farm | Cheerful, ducks, tea | **chị – em** |
| **Gus** | Neighbour, Old Mill Farm | Grumpy-sweet. "Hmph." Secretly soft. | **bác – cháu** |
| **Dr Hazel** | Retired doctor on the coast (chapter 5) | Not yet on stage: only quoted | – |

Place names: Hollowbrook is **Thung Suối** everywhere, including titles and posters. Brook Lane is **ngõ Suối**. The
feed mill is the **cối xay cám**, and chicken and cow feed are **cám gà** and **cám bò**.

## 3. Arcs

- **Ada:** from a lonely keeper of an empty village to a grandmother with a full street. She gets a beat at the end of
  every chapter, and in the end she gets Gus's thanks (his arc).
- **Ellis:** he is never seen in v0.1. His letters move from "gone fishing" to "the brook runs low" to "a new padlock on
  the sluice gate". In v0.2 he comes home to teach fishing, and his notes on the sluice carry the mill mystery through chapters 6–8.
- **Gus:** three visits. He sees Ada's stubborn chin in you, slips that he learned on her oven, and finally admits that
  Ada taught him to bake the winter the mill froze. The letter in Sam's heart scenes (the night the stage burned) is
  the start of his chapter 9 story.
- **The families:** each has three heart scenes (3, 6 and 9 hearts), two wishes and an arrival.
  - **The Trans:** Minh is curious about the mill wheel, Lan rebuilds Ada's recipe book, and Bo has his frog and his
    desk.
  - **The Okafors:** Sam grew up here, and Grace makes Gus say thank you out loud.
  - **The Lindqvists:** Elin finds the festival poster, and Olaf meets Ellis upriver and decides to stay.
  - **The Reyes:** Marisol builds the clinic list and recruits Dr Hazel, and Tomas finds the locked sluice gate.

## 4. Chapters

Cards are data in `CHAPTERS`. Card 1 opens the game. Cards 2–4 close their chapter with Ada's line (`ada`). Card 5 is
the teaser for the next version. Each card can have up to three panels (`panels`, `public/assets/story/chN-M.webp`, made
by `scripts/story-panels.mjs`). Short beats between cards are in `BEATS`.

| # | Title | Shown when | Beat |
|---|---|---|---|
| 1 | A key and a seed tin | The game starts | Why the village emptied, and Ada's letter. Ada: "Mind the weeds…" |
| – | *First loaf* (beat) | Ada's first order is filled | Ada has flour on her hands. Pip asks for jam. |
| 2 | Something takes root | The feed mill and coop are built and the first hens arrive | Ada's oven is warm again. Pip names the hens Cloud and Drizzle (*Mây*, *Mưa Phùn*). Gus watches from the lane. |
| 3 | A light in the window | The first family moves in | The Trans on Brook Lane. Ada: Lan brought soup. |
| – | *The Okafors are coming* (beat) | The second cottage is built | Ada remembers Sam on his red bicycle. |
| – | *Welcome bread* (beat) | The five loaves for the Okafors are delivered | Lan's ribbons; "bread on the doorstep". |
| 4 | A bell for the children | The school opens (end of v0.1) | Cora's bell. Marisol's letter about the clinic. Ada: Ellis carried the bell. |
| 5 | Someone to care for us (teaser) | After card 4 | Marisol's list, Dr Hazel's reply and the burned festival poster. |

**Chapters 5–9 (the plan for later versions):**

| # | Title | Story | The mystery thread |
|---|---|---|---|
| 5 | Someone to care for us | Four households. Marisol's petition brings Dr Hazel home, and the clinic reopens. Hazel is a doctor, which settles the nurse overlap: Marisol is the nurse. | Hazel remembers the night of the fire: she treated Gus's burned hands. |
| 6 | Market day | Six households. The square and its shops come back, and Hugo the baker arrives. | Tomas and Sam learn that the upriver land, with the sluice gate, belongs to a city flour company. |
| 7 | Safe streets | Eight households. Pearl reopens the police post. | Pearl reads the old reports. The sluice was closed the summer before the mill shut, and the wheel had no water. |
| 8 | Work for everyone | Ten households. The company office reopens, and Bea runs it. | With Ellis's notes, the village buys the water rights back from the office's first big contract. The sluice opens and the mill wheel turns again. |
| 9 | The village sings again | The festival stage is rebuilt. | Gus tells the truth: a storm knocked over the lanterns he was minding, and the stage burned. Ada's undelivered letter (in Sam's scene) thanked him for saving the children that night. Gus lights the first new lantern. |

## 5. Data and schemas (shared with the play and ui packages)

- `story.mjs`: `VILLAGE_NAME`. `CHAPTERS[]` = `{ id, title, subtitle, icon, text, ada, panels: [{ img, caption }], when(s), teaser? }`.
  `BEATS[]` = `{ id, chapter, when(s), lines: [{ who, text }] }`, each shown once. `TUTORIAL[]` is spoken by Ada, and
  its text has `<b>` around the action verbs.
- `people.mjs`: every poster has `orders: [4–6 lines]`. `VILLAGERS` adds `june`, `pip` and `ellis` with
  `family: true, noOrders: true` (Ellis also has `away: true`). June has `tip` (the stuck tip) and `tips`. Pip has
  `says[eventType] = { first?, lines }` and `idle`. Neighbours keep `comments` (in the order of `commentFor`'s facts) and
  add `remarks: [{ fact, text }]`. `REMARK_FACTS[fact](s)` gives the `{count}` or `{family}` parameters, or null; translate
  `family` with `t()` before filling. Gus has `arc: [{ visit: 1–3, text }]`.
- `hearts.mjs`: `HEART_SCENES[personId][3|6|9] = { lines: [{ who, text }] × 3, reward: { decor } | { coins } }`.
  Rewards are decorations unless the lines hand over money (ECONOMY.md section 1 keeps coin rewards out of the pace).
  `WISHES[personId] = [{ text, need: { kind, near: 'home' } }]`. `ARRIVALS[familyId] = [{ who, text }] × 3`.
- `letters.mjs`: `LETTERS[] = { id, from, when, also?, text }`. `when` (and the optional second test `also`) is
  `{ type: 'chapter' | 'hearts' | 'level', value }` or `{ type: 'stat', key, value }` (`s.stats[key]`, a dotted key reads
  deeper, e.g. `liked.sam`) or `{ type: 'count', key, value }` (how many of a building). For `hearts`, the value is the
  hearts of `from`. **A letter only names what has happened by then:** Ada's "you sold your first wheat" waits for the
  first order (`stat ordersFilled 1`), Gus's "your fence is crooked" for a fence and a harvest, Sam's "thank you for
  the pumpkins" for a liked gift to Sam.
- Heart scenes exist for everyone who can earn hearts: residents, and Ada, Cora, Mai and Gus (Ada's carry the Ellis
  thread: his hat, his empty place at the table, the lamp kept for the day Hollowbrook comes home; Gus's carry the
  Harvest Festival: fence posts, the bread prize he won in Ada's oven, "somebody should start it again").
- Story order: Ada names the Okafors ("the next family is Sam Okafor's") once the Trans live in the village and the
  second cottage is the project, and Lan's welcome bread plays only after that. Every `likes` entry is a real good
  (Elin likes peaches, fruit for a still life).
- June's urgent tips are `JUNE_TIPS` in `people.mjs` (June says mình to the player); the pronoun test reads them and the
  neighbours' `comments` too.

## 6. Writing checklist

1. Write the English line in the speaker's voice (section 2) and keep it short. Chapter text has at most 340
   characters, and a tutorial step at most 170.
2. Add the Vietnamese line to `vi.mjs` with the speaker's pronoun pair and the same `{placeholders}`.
3. Run `npm test`. Coverage, consistency and pronouns are all checked there.
4. For a new card, run `tests/story.browser.mjs` and look at the `story-*.png` screenshots at 390 px in both languages.
