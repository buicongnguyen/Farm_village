# The plan, step by step

Written 2026-10-11. This folder is the working plan for finishing the story of Farm Village. Each file is one step,
sized to be done in one pull request (a few are two). Do them in the order of the table. When a step ships, set its
status here and add the PR number.

The story itself (acts, cast, voices, rules for writing) is in `docs/JOURNEY.md` section 3 and `docs/STORY.md`. This
folder says what to build, in which files, and how to know it is done.

## Order and status

| # | File | What it delivers | Size | Status |
|---|---|---|---|---|
| 0 | [00-tester-tools.md](00-tester-tools.md) | Tester's menu, one pace switch, project steps kept by id | 1 session | **done** (PR #80) |
| – | [01-small-fixes.md](01-small-fixes.md) | Backlog of small bugs and polish, done between chapters | ongoing | open |
| 6 | [ch06-market-day.md](ch06-market-day.md) | Market day, land that says what it is for, the dairy scenes, the baker | 1–2 | **done** (PR #81) |
| 7 | [ch07-safe-streets.md](ch07-safe-streets.md) | The officer and her old reports, the boat dock, ponds that water beds | 1 | **done** (PR #82) |
| 8 | [ch08-work-for-everyone.md](ch08-work-for-everyone.md) | The office manager, the first big contract, the sluice opens, the mill wheel turns | 1–2 | **done** (PR #83) |
| 9 | [ch09-the-village-sings-again.md](ch09-the-village-sings-again.md) | The festival stage, the Harvest Festival, Bramble's truth, Oak comes home | 2 | **done** (PR #84) |
| 10 | [ch10-hands-to-help.md](ch10-hands-to-help.md) | Named villagers take the jobs and are seen at work, the evening report | 1–2 | **done** (PR #85) |
| 11 | [ch11-the-man-from-the-city.md](ch11-the-man-from-the-city.md) | The one real choice, the valley beauty meter | 2 | **done** (PR #86) |
| 12 | [ch12-one-river-many-farms.md](ch12-one-river-many-farms.md) | Two growers from outside, the co-operative, the towpath on the far bank opens | 2 | **done** (PR #87) |
| A4 | [act4-far-bank.md](act4-far-bank.md) | Groundwork: the riverside zone, the quay, tall buildings | 2–3 | not started |
| 13 | [ch13-the-far-bank.md](ch13-the-far-bank.md) | The first riverside building, the keeper of the quay | 1 | not started |
| 14 | [ch14-rooms-with-a-view.md](ch14-rooms-with-a-view.md) | The hotel and its guests | 1–2 | not started |
| 15 | [ch15-the-evening-train.md](ch15-the-evening-train.md) | The halt, the train, train orders | 2 | not started |
| 16 | [ch16-where-the-brook-begins.md](ch16-where-the-brook-begins.md) | The walk upriver with Oak and Sunny | 1 | not started |
| 17 | [ch17-a-share-for-everyone.md](ch17-a-share-for-everyone.md) | The valley company and the valley's value | 1–2 | not started |
| 18 | [ch18-the-valley-fair.md](ch18-the-valley-fair.md) | The fair and the produce contest | 1–2 | not started |
| 19 | [ch19-the-green-valley.md](ch19-the-green-valley.md) | Beauty goals, wealth titles, the award | 1 | not started |
| 20 | [ch20-the-lights-of-two-villages.md](ch20-the-lights-of-two-villages.md) | The billion and the closing card | 1 | not started |
| R | [90-release-pass.md](90-release-pass.md) | Release pace, simulation, soundtrack, playtest, store checklist | 3–4 | not started |
| – | [99-after-the-story.md](99-after-the-story.md) | What waits until the story is done | – | parked |

**Next: the far bank's groundwork** ([act4-far-bank.md](act4-far-bank.md)), then chapter 13. Acts II and III are complete.

Done before this plan: chapters 1 to 5; from v0.5, the goat barn and dairy, the farmhouse to level 10 (garden and
room), six hired hands, sixteen parcels, twelve crops, the look of each language edition, the old-building fixes.

## How to do a step

1. Read its file and the two story documents' sections it names.
2. Branch from `main` in the worktree `Farm_village-claude`. One branch, one PR.
3. Rules first, with tests (`npm test`). Then art from the Blender generators. Then the interface. Then the four
   languages. Then `npm run build:test`, the browser suites the file names, and a look at screenshots.
4. Open the PR, wait for its check, merge, watch the Pages run, confirm the live site serves the change.
5. Update the status table above and the roadmap data (`content/journey.mjs`) in the same PR.

## Definition of done for a chapter

- The chapter card appears once, when its deed is done, and never again; it also appears for a farm that had already
  done the deed before the chapter existed.
- The deed is something the player does. No chapter waits on a clock.
- A village project step points at the deed and the roadmap names it.
- Every line is in English, Vietnamese, Korean and Japanese, with each speaker's voice and pronouns (`STORY.md` 2).
- `npm test` passes, with a rules test for the trigger and one for an old save; one browser check plays the ending.
- The tester's menu can jump to the chapter: the chapter's PR adds the `JUMPS` entry for the chapter AFTER it
  (`src/core/testmode.mjs`), which arranges this chapter's deed. The same entry powers the tester's "Finish this
  chapter" button (`testFinishChapter`), and the chapter's browser check uses it to play the ending.
- The far view stays within 120 draw calls and 300,000 triangles; first-load code within the limit in `scripts/build.mjs`, and the 4G loading check under 3.5 s.

## Decisions already made (do not reopen without the owner)

- **Story first.** A system no chapter needs waits (see `99-after-the-story.md`).
- **Testing pace stays** until the release pass. Timers are short and prices low on purpose.
- **Act IV is the riverside town**, on the north bank that is already on the map (rows 0 to 7, north of the brook,
  reached by the brook road's bridge). Pine Ridge as a second map is an expansion, not part of the story.
- **Newcomers arrive with their building**, as the teacher did with the school and the doctor with the clinic: the
  baker with market day, the officer with the police post, the office manager with the company office, the keeper of
  the quay with the far bank. They are villagers (`VILLAGERS` in `content/people.mjs`, with `arrives`), not families:
  no cottage, no heart scenes to write. Working ids `hugo`, `pearl`, `bea`, `tuyet`; display names are chosen in each
  language with the chapter, in the style of `content/character-names.mjs`.
- **No new families are needed.** `STORY.md` once asked for six, eight and ten households; the deeds below do not.
- **The mystery has two threads** (`STORY.md` 3): the water (the sluice, the flour company) ends in chapter 8; the
  fire (the lantern stage, Bramble) ends in chapter 9. Do not mix them and do not date them.
- **Nobody is a villain** and nothing is lost while the player is away.

## Where things live (quick reference)

| Thing | File |
|---|---|
| Chapter cards and short beats | `src/content/story.mjs` (`CHAPTERS`, `BEATS`); shown via `chapterSeen` in `src/core/today.mjs` |
| Chapter pictures | `public/assets/story/chN-M.webp`, made by `scripts/story-panels.mjs` |
| Village project steps | `src/content/projects.mjs` (`STEPS`; `builds: []` and `site` for steps that lock nothing). The steps after the clinic are a checklist kept by id: add new ones anywhere after the clinic, never before it |
| Roadmap | `src/content/journey.mjs` (`STAGES`, `JOURNEY_UNLOCKS`), tests in `src/core/journey.mjs` |
| Letters | `src/content/letters.mjs` |
| People, neighbours, names | `src/content/people.mjs`, `src/content/character-names.mjs` |
| Numbers | `src/content/economy.mjs`, `src/content/goods.mjs`, `src/content/buildings.mjs` |
| The map | `src/content/world.mjs` (128 x 128 cells of 2 m; farm parcels x 32–95, z 24–87; village z 92–116; brook z 8–16) |
| All actions and the tick | `src/core/act.mjs` |
| Old buildings | `RUINS` in `world.mjs`, `src/core/ruins.mjs`, `rebuildCivic` in `src/core/build.mjs` |
| Fixed sites (the story's own buildings: the dock, later the stage) | `SITES` in `world.mjs`, `src/core/sites.mjs` (`sitePlan`, `buildSite`), `src/ui/site-panel.mjs`; a building with `site: true` is never placed by hand |
| Fishing water | `src/core/pond-bank.mjs` (`waterOf`, `seatsOf`, `fishable`): built ponds and the dock |
| Hired hands | `src/core/helpers.mjs`, `HANDS` in `economy.mjs` |
| Company and contracts | `src/core/village-growth.mjs`, `src/core/contracts.mjs`, `src/content/village-growth.mjs` |
| Late models | `art/blender/build_farm_kit.py` → `decor.glb`; register in `src/view/kinds.mjs` with `late: true` |
| Icons | `art/blender/build_items.py`, `art/blender/icons.json`, `render_icons.py`, `icon_small.py`; list in `src/content/icons.mjs` |
| Strings | `src/i18n/vi*.mjs`, `ko*.mjs`, `ja*.mjs` (English is the key) |
| Test hook and test actions | `src/kit/test-hook.mjs`, `src/core/testmode.mjs` |

## Level gates the story leans on

| Thing | Level | Coins |
|---|---|---|
| Third parcel | 4 | 2,000 |
| Juice press / noodle factory | 6 / 8 | 600 / 1,200 |
| Goat barn / dairy | 8 | 450 / 750 |
| Hospital upgrade | 10 | 1,800 |
| Police post | 12 | 2,200 |
| Company office | 15 | 3,000, with two different food factories working |

These are testing numbers. Chapters 6 to 9 therefore span levels 6 to 15; later chapters should not ask for more than
level 20 until the release pass rebalances levels.
