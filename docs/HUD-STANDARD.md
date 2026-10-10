# HUD standard: buttons, badges and notices

Written 2026-10-09 after the user asked for a standard like a top-grade game. It is based on research into Hay Day,
Clash Royale (Supercell), Pokémon GO, Genshin Impact, Honkai Star Rail and Stardew Valley mobile, and on Apple's and
Material Design's badge and touch guidance. New interface work follows these rules; tests check the ones marked ✓.

## 1. What is on screen, and why

| Place | What | Why it is always visible |
|---|---|---|
| Top left | Level, coins; the village banner (chapter goal); status pills | Progress and money at a glance |
| Top right | Explore (walk as your character), turn the camera, settings | Mode and view switches, not destinations |
| Right rail | Today (news), Projects, Friends, Mailbox (only with unread letters, last in the rail so nothing shifts) | The village's destinations |
| Bottom right | Barn, Orders, Build | The core loop, in thumb reach |
| Bottom middle | The Next chip: the one most useful thing to do | Help when unsure, a single surface |

Phone targets are at least 44 × 44 px ✓ (`hud-compact`). New buttons go into an existing panel before they get a HUD slot. The research
target is 5–7 always-visible buttons. We have 9, so the next new destination must replace one (for example by folding
Friends into Today).

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
| P1 | Toast (`hud.toast`) | Two on screen at most ✓ (`browser`); a repeat merges into one with ×N; ranks warn > good > info, and the lowest, oldest one leaves first; info 2.4 s, good 3 s, warn 4.5 s, tappable help 5 s |
| P2 | Coin flight / pulse | Rewards fly to the counter; never queued |
| P3 | World marker | Persists until handled |
| P4 | Today / Mailbox | Persistent; their badge is the only alert |

No toast for what the world already shows: a repair starting (scaffolding and its timer), a crop growing, a truck
leaving. Only one thing moves at a time: a biting fish bobs its pill; other ready pills glow without moving.

## 5. Guidance

The Next chip is the single "what now" surface. The village banner shows the chapter goal, and the Goals pill is a
status count. Today's advice cards explain; they do not compete for the Next chip's job.
