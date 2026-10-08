# Hollowbrook — useful dialogue, discoveries, and village news

Date: 2026-10-08 (Asia/Seoul)

Status: design proposal with implementation notes. The first contextual dialogue pass is live through PR #1. Saved discovery memories and unread/read state are implemented on `codex/dialogue-review`, not yet live; the broader persistent advice-card lifecycle remains planned. See [PROFILES-AND-DISCOVERIES.md](PROFILES-AND-DISCOVERIES.md). This document accompanies [RESEARCH-DIRECTION.md](RESEARCH-DIRECTION.md); the demand, opening-money, housing and school proposal is evaluated in [OPENING-ECONOMY-AND-SCHOOL.md](OPENING-ECONOMY-AND-SCHOOL.md).

## 1. Evaluation of the idea

I recommend this direction. It would give Hollowbrook three useful qualities: guidance when players are unsure, variety when they want something different, and recognition when they achieve something.

The main improvement is to make these messages respond to meaningful changes in the farm. Each message should answer: **"Why is this useful or interesting to me now?"**

The user's three categories work well, with opportunities and blockers distinguished inside the first category.

| Message type | When it should appear | Example of proposed content |
|---|---|---|
| **An opportunity** | The player can make a worthwhile improvement | "You have cherries to spare. A fruit stand could earn a little more from each basket." |
| **Help with a blocker** | Something prevents the player's current goal | "The bakery is ready, but we need wheat before we can start that order." |
| **Something enjoyable** | A relevant activity or discovery is available | "Pip found a strange carving near the brook. He wants to show you." |
| **A celebration** | A meaningful milestone actually happens | "The clinic is open. Marisol has already put flowers by the door." |

These should preserve each character's personality. June can suggest ways to save effort, Lan can discuss recipes, Mai can notice opportunities with produce, and Pip can invite exploration.

## 2. Evidence from comparable games

The games researched support different parts of this idea.

| Game | What is documented | Useful lesson |
|---|---|---|
| **Animal Crossing** | Characters guide island development. Timmy and Tommy can tell players which "hot item" sells for more that day. | Combine longer development guidance with timely economic opportunities. [Nintendo-hosted guide](https://www.nintendo.com/jp/ichikara/acbaa/02_en.html) |
| **Stardew Valley** | Version 1.6 added dialogue reacting to events, custom gift responses, and variations in festival dialogue. | Conversations should acknowledge what has changed in the player's life. [Developer changelog](https://www.stardewvalley.net/stardew-valley-1-6-update-full-changelog/) |
| **Hay Day** | Town buildings offer different upgrades for capacity, coins, experience, and service time. | A smart investment depends on the player's goal and bottleneck. These documented choices do not establish that its NPCs calculate personalized investment advice. [Supercell support](https://ingame.help.supercellsupport.com/hay-day/en/articles/upgrade-service-building.html) |
| **Cozy Grove** | Hidden-object hints update after collection; a character offers more direct assistance when needed. | Let help become more specific on request, and update it as the player progresses. [Developer support](https://support.spryfox.com/hc/en-us/articles/1500006522141-General-tips-for-finding-hidden-objects-Cozy-Grove) |
| **Spiritfarer** | Fulfilling characters' requests leads players toward new areas and resources needed for construction. | Characters can naturally explain the next step in a production chain. [Developer guidance](https://thunderlotus.zendesk.com/hc/en-us/articles/28692897576468-I-can-t-find-a-resource-that-I-need-to-advance) |

These are useful precedents. They support the design approach, although they do not prove that adding notifications alone will improve retention.

## 3. Advice should explain what benefit it offers

A player might want:

- **Money sooner:** complete an available order or sell surplus goods.
- **More income over time:** invest in a useful production or selling facility.
- **Less repetitive work:** improve queues or use helpers.
- **Progress toward a village goal:** reserve materials and finish a required building.
- **Relief from a bottleneck:** resolve missing ingredients, storage constraints, or an unavailable prerequisite.

The advice should explain which benefit it offers.

### Concrete example: the current fruit stand

The current rules give these values:

- Construction costs **80 coins**.
- A cherry sells for **7 coins directly from the barn**, or **9 at the stand**.
- The stand sells **one fruit every 30 seconds**.
- Compared with direct selling, its extra earnings cover construction after **40 cherries**, or approximately **20 minutes of continuously stocked sales**.

That assumes the player already has spare cherries and refills the stand. It excludes the cost of establishing an orchard and comparisons with particular orders or other selling channels. The stand holds up to 30 fruit, so the 40-sale example requires refilling. See [orchard rules](../src/core/orchard.mjs), [economy values](../src/content/economy.mjs), and [building prices](../src/content/buildings.mjs).

A helpful character could say:

> A fruit stand would earn a little more from our spare cherries. It takes time to recover the building cost, though.

An optional **Show me why** action could reveal the numbers.

Similarly, an extra bakery queue slot lets players queue more work before leaving. It does not increase baking speed. Advice needs to preserve distinctions like this to earn the player's trust.

## 4. Dialogue should follow an opportunity through to its result

For the fruit stand, the conversation could evolve like this:

| Farm situation | Appropriate response |
|---|---|
| Spare fruit, affordable stand, no stand built | Suggest the investment and explain its benefit. |
| Stand built but empty | Offer to show where to stock it. |
| First sale completed | Acknowledge the first customer. |
| Stand stocked and working | Discuss another useful topic or offer a leisure activity. |
| Player chooses a different project | Respect that choice and suppress repeated stand advice. |

Changing only the wording would still feel repetitive. **The subject needs to change because the situation changed.**

Let the player explicitly ask a character for ideas. Ordinary conversation should still include family life, humor, memories, and personal interests.

## 5. One compact notification entry point

Extend the existing Today/Village news button into one compact place for these messages.

The badge should mean:

> You have 3 new messages.

It should count newly available, unread messages. An unfinished suggestion can remain in the panel after reading, while its contribution to the unread count disappears.

A player can read "build a fruit stand," decide to focus on the clinic, and continue without a permanent demand for attention.

### Proposed behavior

- **Group related messages.** Several buildings waiting for ingredients can produce one useful explanation of the main bottleneck.
- **Remove stale suggestions automatically.** A construction suggestion disappears when the building exists.
- **Remember what was read across sessions.**
- **Avoid repeated counts for the same topic.** Five villagers noticing one new bakery should not create five identical notifications.
- **Keep celebrations in the history or album.** Players can revisit them after the brief on-screen moment.
- **Keep an active goal visible separately.** Essential guidance should remain easy to find after its notification is read.

General badge guidance also recommends short counts attached to an existing control, with a clear accessible label explaining their meaning. This is a design reference, not a proposal to add a UI library. [MUI badge guidance](https://mui.com/material-ui/react-badge/)

### Visual treatment

Use a deep green button with a honey-gold badge and dark, readable numbers. A brief sparkle when a meaningful message arrives would fit the richer color direction. Keep the icon visually compact but give the whole button a comfortable touch area.

Inside the panel, distinguish messages with a symbol and a short label:

- Coin: opportunities.
- Tool: practical help.
- Leaf or compass: activities and discoveries.
- Star: celebrations.

Use restrained animation and respect the existing reduced-motion setting. The badge is an invitation to open the panel; it does not need to keep flashing while unread messages remain.

## 6. Celebrations should describe a consequence

"Great job!" has limited value when repeated. More satisfying proposed examples are:

> Your first loaf is ready. Lan says the whole street smells like breakfast.

> The school bell rang again today. Bo picked a desk by the window.

These lines recognize something specific and connect it to a person. Larger milestones can receive a brief golden celebration; routine production can use smaller feedback.

Statements about villagers using a place should correspond to actual game behavior or a clearly presented story scene.

## 7. Easter eggs and connected discoveries

Stardew Valley combines hidden journal pages, history, puzzles, and rewards. Its developer notes explicitly describe these connections. [Official 1.5 changelog](https://www.stardewvalley.net/stardew-valley-1-5-update-full-changelog/)

For Hollowbrook, consider three kinds:

- **Small surprises:** ringing a repaired bell makes Biscuit briefly howl along.
- **Personal discoveries:** an old postcard in Ada's seed tin starts a short family memory.
- **Connected clues:** Pip notices a carving, Ellis recognizes it, and following the clue reveals a brookside keepsake.

These are proposed examples. A notification should introduce the clue, such as "Pip wants to show you something," while letting the player discover the answer. Essential farming knowledge should remain readily available, and missed discoveries should remain accessible on later visits.

## 8. Baseline findings and implementation update

At the pre-pass baseline, the game already had news history, achievement messages, contextual tips and some anti-repeat selection, with these gaps:

- Everyday chatter mainly uses shared pools based on time of day and age, with session-only history.
- A pending order can repeatedly take priority over ordinary conversation.
- June's special advice-on-tap branch is currently bypassed by the general named-character branch. Her automatic idle tips still work.

See [dialogue selection](../src/view/people-view.mjs), [neighbor comments](../src/core/neighbours.mjs), [saved news events](../src/core/act.mjs), and the [existing HUD](../src/ui/hud.mjs).

These observations describe the baseline before the first logic pass, now live through PR #1. It routes ordinary conversation separately from orders, gives June actionable advice, and adds personal Ada chatter plus school/clinic context. The review follow-up (`b03c38c`, not yet live) waits for visitor arrival and rechecks an observation when spoken, with one observation per visit. The current branch also adds saved earned/read discovery cards in Today and the Album. Conversation history remains session-only; persistent adaptive topic history, deferral and the broader Village news redesign are still planned.

## 9. Recommended first version and success criteria

Start with one improved Village news button, a small set of trustworthy opportunity/blocker suggestions, reactions to major achievements, and a few connected discoveries.

Authored English and Vietnamese lines selected from actual farm progress would preserve character voices and make the system easier to verify. Keep speaker pronouns consistent with STORY.md. Business calculations should come from the same game rules that determine the real outcome, with saved history preventing repeated topics across reloads.

English has the same adaptive behavior as Vietnamese. Choose the topic from shared game facts first, then localize the text. Both languages must agree on blockers, useful actions, achievement status, clue order, reward eligibility and repeat suppression. Use natural language-specific wording without changing those facts. Future saved topic IDs, context versions, unread/dismissed state and cooldowns survive language switches. Existing session-only chatter is not a substitute for that persistence.

Validate before/after scenarios in both languages; assert topic IDs as well as text. In particular, a one-time introduction disappearing does not prove that a repeated advice topic has changed. Use the proposed [cast naming plan](CHARACTER-NAMING-PLAN.md) when preparing new scenes, while the current published names remain authoritative until a separate rename is implemented.

Success means players understand their options, notice that villagers remember their actions, and can comfortably ignore an optional suggestion.

This document is a design specification with implementation status notes; see [CHANGELOG.md](../CHANGELOG.md) for implemented PR changes.
