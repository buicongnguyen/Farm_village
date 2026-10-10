# Farm hands (2026-10-10)

Once the school stands, the Friends panel offers three hired hands (rules in `core/helpers.mjs`, numbers in `HANDS`,
`content/economy.mjs`):

- **Field hand** (300 coins): harvests half of the ripe beds and sows the same crop again.
- **Animal hand** (300 coins): collects half of the ready eggs and milk and feeds half of the hungry animals.
- **Workshop hand** (500 coins): collects half of the finished trays and starts the same recipe again.

Each works once a minute while the game is open, never while it is closed, rounds half up, and is paid one coin a
task; with no coins it does nothing. The other half is left for the player. A hand can be let go at any time; the
hiring fee is not returned. Tests: `tests/hands.test.mjs`.
