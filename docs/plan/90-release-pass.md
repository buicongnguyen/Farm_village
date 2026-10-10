# Release pass

Status: not started · Depends on: chapter 20 · Size: three to four sessions, one PR each

Done once, after the story is complete and before the game is shown to anyone who pays. Until then the game stays at
testing pace on purpose.

## 1. Pace

- `PACE.mode = 'release'` in `content/economy.mjs` (step 0 built the switch). Start with `time: 3`.
- Go down the comment block of eased numbers beside `PACE` and decide each: crop grow times, tray costs and count,
  truck sizes, barn limit, parcel prices, bite times on foot, farmhouse costs, hand fees and wages, market day and
  train periods, the value marks of chapters 19 and 20.
- Targets (from `docs/GAMEPLAY-PLAN.md`): chapter 1 in the first ten minutes; a chapter roughly every forty to sixty
  minutes through Act II; Acts III to V a chapter per one to two hours; the whole story in twenty-five to forty
  hours; no chapter that needs more than two sessions of waiting.
- `PACE=release npm run sim`: extend `scripts/sim.mjs` to play a scripted farmer through all twenty chapters and
  print the hour each chapter is reached, coins per hour by level, and the share of income that is idle (hotel,
  rent, dividends, hands). Idle income stays under 40% at every level.
- Levels: rebalance the XP curve so level 25 lands near chapter 20, not level 15.
- Chapter 11: Mr Albright asks as soon as chapter 10 is seen. Decide whether he should wait for level 16 and a farm
  worth 60,000 (`albrightOffer` in `core/valley.mjs`), and set the cannery's green upgrade price against release coins.
- Chapter 18: set the fair's numbers (`FAIR` in `content/economy.mjs`: fee, prizes, the rivals' climb) once real play
  shows how often gold is won; and hang the ribbons on the farmhouse wall (three decals in the interior kit, shown
  from `s.fair.best`), which the chapter left out.

## 2. Sound

- A soundtrack: four pieces (day, evening, festival, far bank) of two to three minutes, loopable. Either written
  for the game or licensed with a file of licences in `docs/licences/`. The generated pentatonic tune stays as a
  fallback.
- Sound pass: every tap has a sound, nothing louder than the music, a slider each for music and effects.

## 3. Playtest

- Five people who have not seen the game, thirty minutes each, recorded. Three questions afterwards: what was the
  last thing you were trying to do, what confused you, would you open it again tomorrow.
- Fix the top five confusions before anything else in this file.
- A second round with five new people after the fixes.

## 4. Where the art came from

- List every model, texture, sound and font with its source (`docs/PROVENANCE.md`). Everything from this repo's
  Blender generators is ours. Anything that came through Zoo Garden or another reference game must be shown to be
  our own generator's output, or replaced. No exceptions before a sale.
- Fonts: confirm the licence allows embedding in a sold game.

## 5. Size and speed

- First-load code back under 1,100,000 bytes: move `content/hearts.mjs` text and `ui/build-view.mjs` behind
  `import()` (backlog 13), then lower the limit in `scripts/build.mjs`.
- A mid-range phone (three years old) holds 30 frames a second on a full farm with the far bank built; the frame
  governor's lowest tier is still pretty.
- Save size under 200 KB for a finished farm; a save from every released version loads.

## 6. Shop checklist (only if selling)

- A desktop build (Tauri or Electron) with window, full screen, controller for menus, cloud-save-safe save folder.
- Store page: six screenshots, a 45-second trailer from the game's own cameras, a short description, the languages.
- Age rating forms, privacy note (the game sends nothing), credits.
- Price and a demo (chapters 1 to 5 free is the natural cut).
- Achievements: one per chapter, one per ribbon colour, one per value title.

## 7. Last checks

- All 39 browser suites green three times in a row (fix the three flaky checks: backlog 11).
- The four languages read through by a native speaker each, chapter cards first.
- A fresh farm played from the title screen to chapter 20 by the owner at release pace, with notes.
