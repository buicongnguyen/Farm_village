# HUD standard: buttons, badges and notices

Written 2026-10-09 after the user asked for a standard like a top-grade game. It is based on research into Hay Day,
Clash Royale (Supercell), Pokémon GO, Genshin Impact, Honkai Star Rail and Stardew Valley mobile, and on Apple's and
Material Design's badge and touch guidance. New interface work follows these rules; tests check the ones marked ✓.

## 1. What is on screen, and why

| Place | What | Why it is always visible |
|---|---|---|
| Top left | Level, coins; the village banner (chapter goal); status pills | Progress and money at a glance |
| Top right | Explore (walk as your character), turn the camera, settings | Mode and view switches, not destinations |
| Right rail | Today (news) and Friends | The village's destinations |
| Beside Goals | Notice pills that appear when there is something to act on: Project (lit when a step is ready), Letters (unread count), Rent, Truck, Fishing | Seen at a glance, one tap to the detail. They replaced the Projects and Mailbox round buttons on 2026-10-10 |
| Bottom right | Barn, Orders, Build | The core loop, in thumb reach |
| Bottom middle | The Next chip: the one most useful thing to do | Help when unsure, a single surface |

Phone targets are at least 44 × 44 px ✓ (`hud-compact`). New buttons go into an existing panel before they get a HUD slot. The research
target is 5–7 always-visible buttons. With Projects and Mailbox turned into notice pills we have 8 (Today, Friends,
Barn, Orders, Build, Explore, Turn, Settings); a new destination must replace one.

## 2. Button tiers

| Tier | Look | Use |
|---|---|---|
| Primary | Green, filled (`.btn.primary`) | The action that does or spends: Sell, Build, Collect. One per card. |
| Navigate | Blue, filled (`.btn.go`) | Only inside a help card, as that card's purpose: "Show the source", "Show me" ✓ (`art-integration`) |
| Tertiary | Cream or ghost (`.btn.ghost`, `.btn`) | Back, Later, Discard |
| Hint | Blue link text with a small ? (`.hint-link`) | "Find wheat", "Roadmap": help, never a dialog's main button |
| Icon | Round HUD button with a label under it | Destinations |

Red is never a button colour. It means unread or a problem.

## 3. Badges: one meaning each

| Badge | Meaning | Clears when | Where |
|---|---|---|---|
| Red number (`.badge`) | Unread news or letters | Read | Today, Mailbox |
| Green number or dot (`.badge.ready`) | Something you can do now | Done | Orders (sellable orders), Projects (the step can be worked), Goals pill |
| Neutral pill (`.badge.cap`) | Status, not a call to act | n/a | Barn fill. Turns amber when ≥ 90 % full, never red |
| Gold coin / red "!" in the world | Collect here / broken here | Collected / repaired | Over the building itself (marks-view) |

Counts show 1–9, then "9+". Badge only the top-level button that leads to the thing; never chain badges.

## 4. Notices: channels and priority

| Priority | Channel | Rules |
|---|---|---|
| P0 | Story card / level-up (modal) | Milestones only; never for routine events |
| P1 | Notice (`hud.toast`) | One centred lane, low in the middle (Zoo Garden's place), 14 px bold with a 28 px icon ✓ (`notices`). Two on screen at most ✓ (`browser`); a repeat merges into one with ×N; ranks warn > good > info, and the lowest, oldest one leaves first; info 2.4 s, good 3 s, warn 4.5 s. A notice with a destination (`to`) shows a chevron, stays 5 s and opens that place on a tap ✓. With a sheet open the lane sits just inside the sheet's top; on short landscape screens it sits between the status stack and the top-right buttons |
| P2 | Coin flight / pulse | Rewards fly to the counter; never queued |
| P3 | World marker | Persists until handled |
| P4 | Today / Mailbox | Persistent; their badge is the only alert. Today starts with **Recent**: the last 20 notices, each tappable to the same place ✓, so a missed notice can always be found |

No toast for what the world already shows: a repair starting (scaffolding and its timer), a crop growing, a truck
leaving. Only one thing moves at a time: a biting fish bobs its pill; other ready pills glow without moving.

## 5. Guidance

The Next chip is the single "what now" surface. The village banner shows the chapter goal, and the Goals pill is a
status count. Today's advice cards explain; they do not compete for the Next chip's job.

## 6. History of the notice lane (why it is where it is)

- 7 Oct 2026: notices were centred under the top bar, 14 px, with a tappable status list that included the project step.
- 9 Oct: moved to a narrow 12 px column at the top left and slimmed twice (PRs #38, #41). The user found them hard to see.
- 10 Oct: back to a centred 14 px lane, now low in the middle after Zoo Garden, every notice tappable to its detail, a
  Recent list in Today, and the Projects and Mailbox round buttons replaced by notice pills.
