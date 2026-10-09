# Korean and Japanese editions

Started 2026-10-09 on `codex/korean-japanese`, following the localized-name release (PR #34).
Release: [PR #35](https://github.com/buicongnguyen/Farm_village/pull/35), which tracks CI, Pages deployment and live acceptance.
The user requested the next work after that release. This pass completes the two remaining language editions;
meadow/dairy and the later gameplay roadmap remain separate releases.

## Scope

- Complete authored Korean and Japanese catalogs for the current interface, chapters, letters, conversations,
  state-aware advice, memories, orders, production, source help, school activity and mobile/fullscreen help.
- The same stable person/pet/family identities introduced in PR #34. Each language uses its own local aliases.
  A child addressing the elders uses the great-grandparent relationship; the player's speaker labels use grandparents.
- Four selectable languages at startup and in Settings. Browser-locale detection, saved preference, dates, numbers,
  and standalone boot-failure recovery support all four. Game clocks and daily reset rules stay unchanged.
- Independently loaded catalogs: only the selected edition is required to boot. A failed switch retains the
  current language; overlapping selections obey the latest choice. Profiles do not become selectable mid-switch.
- Existing saves, player-entered names and arbitrary saved prose retain their original data. Language changes
  do not spend resources, award discoveries, move story progress or reset advice history.

The Farm Village wordmark remains the shared art identity. Its accessible label and page title are localized.
Compact timer units `h/m/s` remain shared notation; durations and simulation logic do not depend on language.
Use the existing font fallback; inspect Hangul, kana and kanji in real browser rendering before release. No extra
CJK font download, model, icon, palette, lighting or art redesign is included.

## Writing and maintenance

English source strings remain dictionary keys. Preserve ordinary parameters, supported markup and explicit
identity references. Use natural Korean particles and Japanese counters by rephrasing around variable names/items
when necessary. Avoid mechanically carrying English pronouns or Vietnamese self-reference into either edition.
Maintain a consistent vocabulary for buildings, goods, actions and progression throughout each catalog.

Automation checks key coverage, placeholder/markup/reference integrity and fallback behavior; it cannot certify
native-speaker literary quality. Editorial review and concrete rendered examples accompany those checks. No
independent human native-speaker review is claimed.

Each new catalog contains 1,722 authored translations. Japanese batches compose into one lazy catalog; Korean's
small feature supplement does the same. English keys and the Vietnamese inventory remain the coverage contract.
Independent editorial spot checks covered kinship, ingredient guidance, energy/free rest, school retries, hospital
requirements, police/company percentages and discovery rewards. Korean economic wording was corrected from the
software term “default value” to “base selling price”. Numeric adaptations such as Japanese written numerals were
checked for equivalent quantities rather than requiring English digit formatting.

Review also fixed two typing/recovery cases: background updates and delayed locale downloads preserve a focused
name input (including composition and caret); a deferred Settings refresh completes after editing ends. The
standalone failed-entry screen sets its document language for assistive technology. Explicitly choosing English
after a failed saved-locale boot persists English, so the next visit does not retry an unwanted edition.

Visual review found enlarged-text speech extending past the phone edge. `PeopleView.placeBubbles()` now measures
physical DOM bounds and converts screen coordinates back through CSS zoom before positioning speech. This changes
placement only; the art lane's colours, bubble appearance and font-size settings stay intact.

## Verification and publication

Implementation and local validation are complete. Publication and live verification are recorded in the release PR.

- **428 native tests** and `npm run sim` pass. School/clinic pace is unchanged; the steady profile reaches both on day 3.
- All **34 component suites** pass across the full run, corrected orchard rerun and added speech suite. After the
  speech fix, orchard (13), cast (9), story (8) and HUD (16) checks passed again. The old orchard test now waits for the
  lazy panel's actual content before counting its three unlocks.
- The speech suite covers **96 edge cases**: four languages, portrait/landscape, three text sizes and four edges,
  selecting the tallest rendered authored dialogue/advice. Public HUD acceptance checks real incidental speech too.
- Loading/recovery covers **18 cases**, including each edition's cold start, stale requests, three catalog retries,
  explicit fallback preference, four failed-entry screens and Korean/Japanese composition during delayed downloads.
- Names/story acceptance covers 12 contexts; learning covers eight and HUD covers 16. Checks include existing
  profiles, literal player prose, exact legacy orders, language-independent balances/progress, number/date formatting,
  story cards, mail, advice, ingredient help and school. No selected language requires the other catalogs to download.
- Test-build first-load code is **1,093,931 / 1,100,000 bytes**. The browser budget suites remain within 120 draws and
  300,000 triangles at every tested zoom. Actual CJK fonts were checked through Chrome's font inspection: Malgun Gothic
  for Korean and Yu Gothic for Japanese. Reviewed screenshots include phone text at 130% and landscape dialogue.
- **28/28 smoke checks** pass. The Settings smoke test now waits for the requested language to finish downloading,
  retains the translated-heading assertion and checks the switch back to English.
- **54/54 local production contexts** pass: loading/recovery (18), names/story (12), HUD (16) and garden/school (8),
  all through public menus without a debug hook. Production first-load code is **1,093,080 / 1,100,000 bytes**.

Browser checks use Chrome with isolated stores and phone/desktop viewports; this does not claim testing on a physical iPhone or
Safari. Independent human Korean/Japanese literary review also remains outside the checks completed here.
