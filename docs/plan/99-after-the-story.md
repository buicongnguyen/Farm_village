# After the story (parked)

Things worth doing that no chapter needs. They wait until chapter 20 ships, unless the owner pulls one forward. Each
line says why it is parked and what would bring it back.

## More to grow and make

| Idea | Why it waits | Start from |
|---|---|---|
| The eleven extra trees as plantable kinds | Icons and models exist; needs catalogue rows and balance only. Good filler between chapters (backlog 3) | `content/buildings.mjs`, `FRUITS` |
| Recipes for tomato, potato, cabbage, onion, chili (soup, kimchi, chips, salsa) | Chapter 6 adds none; a kitchen building fits Act III | `content/goods.mjs` |
| Rice paddies and a rice mill | Arrives naturally with the rice grower in chapter 12 if wanted | `content/goods.mjs`, decor kit |
| Ducks, geese, sheep and wool | A second animal line; the dairy is enough for the story | `core/animals.mjs` |
| Seasons that change what grows | Large: touches every crop, the art and the pace | `view/daylight.mjs`, `content/goods.mjs` |
| Weather with effects (rain waters beds) | Pretty; needs seasons first to mean something | `view/weather.mjs` |

## More to do with people

| Idea | Why it waits | Start from |
|---|---|---|
| Heart scenes for the newcomers | The plan gives them none on purpose (`README.md`) | `content/hearts.mjs` |
| Miso the cat and pets in the farmhouse | Charming, no chapter needs it | interior kit |
| Children growing up, Sunny at school | Changes fixed ages in `STORY.md` | `content/people.mjs` |
| Villager birthdays and a calendar | Needs seasons or a calendar | `core/today.mjs` |
| Visiting a neighbour's farm | A second map to draw | `view/world-view.mjs` |

## More places

| Idea | Why it waits | Start from |
|---|---|---|
| Pine Ridge, a second valley by train | The natural expansion after chapter 20 | `content/world.mjs` |
| More farmhouse rooms at levels 4 and 7 (asked for; one room extras set shipped in PR #72) | The room grows already; separate rooms need doors and camera work | `view/interior.mjs` |
| A river boat ride from the dock | Needs a path system on water | `view/brook.mjs` |
| Mine or forest for wood and stone | A new resource the economy does not need | – |

## Systems

| Idea | Why it waits | Start from |
|---|---|---|
| Land deeds as a second currency | Coins do the job; a second currency confuses | `core/parcels.mjs` |
| Daily and weekly goals beyond the present quests | The quest board covers it | `content/quests.mjs` |
| Cloud saves and accounts | Needs a server; the game is static pages | – |
| Friends' farms, gifts between players | Needs a server | – |
| Controller support in play (not only menus) | Part of a desktop release | `kit/input.mjs` |
| A photo mode | Easy and popular; do it with the chapter 20 photograph | `view/camera.mjs` |

## Rule for pulling one forward

It must fit in one PR, need no new server, and not move a chapter's deed. Add it to `README.md`'s table with its own
file when it is pulled.
