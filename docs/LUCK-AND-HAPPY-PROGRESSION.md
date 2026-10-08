# Hollowbrook — small discoveries, meaningful progress, and happy conversations

Date: 2026-10-08 (Asia/Seoul)

Status: the user's latest design direction, with proposed reward values and dialogue revisions. This is a documentation step; the proposals have not been implemented in gameplay or localization.

This document supersedes the earlier ideas of starting with 1,000 coins, starting with zero coins, or using a 1,000-coin opening treasure. It refines [OPENING-ECONOMY-AND-SCHOOL.md](OPENING-ECONOMY-AND-SCHOOL.md) and [DIALOGUE-AND-VILLAGE-NEWS.md](DIALOGUE-AND-VILLAGE-NEWS.md). Audience and art direction remain in [RESEARCH-DIRECTION.md](RESEARCH-DIRECTION.md).

## 1. The accepted direction

**Start with 500 coins. Let small, deliberately designed discoveries reward exploration and help the player try another interest. Guide those choices toward achievable milestones, with warm reactions from the people of Hollowbrook.**

The two main principles are:

1. **Luck comes with effort and exploration.** Fishing, clearing land, noticing a clue, or helping restore a place can reveal a small surprise. Players have a reason to be curious and try things.
2. **Guidance leads to achievement and a happier village.** Characters notice opportunities, explain useful next steps, and acknowledge what the player accomplishes. The story should feel hopeful, affectionate, and alive.

The intended experience is:

> Explore or help → discover something small → consider a useful choice → achieve a goal → see people respond → notice another possibility.

The 500 coins already match the normal restored-village opening. This decision preserves that starting amount while changing the proposed way additional discoveries and guidance would work.

## 2. Why this version fits the game

The initial money lets the player begin without hunting for a required treasure. Later finds can bring a pleasant surprise and help with a modest purchase or improvement.

The reward should be connected to something the player actually did. A fishing tin, a keepsake under a stone, or a neighbor's thank-you each has a place in the world. Give those discoveries different objects, sounds, and stories, even when two happen to contain similar amounts of money.

Use designed milestones for the introductory discoveries. Their contents and presentation can feel surprising without claiming that a guaranteed event has extraordinarily rare odds. Later optional discoveries may use variation, but ordinary progression must remain possible without them.

Not every action needs a prize. Interesting outcomes also include a clue, a short exchange, an album memory, a decoration, or a visible change in someone's routine.

## 3. A small introductory reward plan

These amounts are **prototype recommendations**, not approved balance changes or measured optimal values.

| Discovery | Proposed condition | Proposed reward | Purpose |
|---|---|---:|---|
| A small tin from the pond | Second successful catch | 20 coins | Make the first attempt at fishing feel eventful |
| Something unusual in the deeper water | Tenth successful catch | 40 coins and a story clue | Recognize continued interest and introduce another discovery |
| A keepsake beneath a stone | Second rock successfully cleared on owned land | 30 coins | Connect useful farm preparation with a small surprise |
| A neighbor's thank-you | First completed restoration of Village Street | 20 coins and a warm exchange | Recognize work that helps the village |

The four rewards add at most **110 new coins per save**. They do not reset each day or repeat every ten catches. Together with the starting money, that is 610 coins from these particular sources before spending; ordinary earnings and existing rewards are additional.

Current costs give these finds some meaning: a cherry tree costs 70 coins, a fruit stand 80, and the first extra production queue slot 60. A discovery can help close a small gap without paying for several major milestones. Affordability advice must still check level, project, placement, and ingredient requirements.

Clearing a rock currently costs 10 coins and repairing a broken road costs 40. The proposed stone reward follows 20 coins of clearing costs; the road thank-you is only a partial reimbursement. The usable land and repaired road remain their main benefits. Do not describe either as a large profit opportunity.

Village Street is already a damaged starting road. School Lane exists but is not initially broken. A future school-road restoration can use the same design principle, but it needs its own explicitly designed event and budget; it should not silently add another cash payment to this introductory plan.

References: [economy values](../src/content/economy.mjs), [building prices](../src/content/buildings.mjs), [clearing rules](../src/core/build.mjs), [repairs](../src/core/condition.mjs), and [starting roads](../src/content/start.mjs).

## 4. Include the rewards the game already gives

The new discoveries must be considered alongside existing help:

- The first daily gift offers 50 coins when claimed.
- Ordinary goals pay 20 plus ten times the player's level: 30 coins at level 1 and 60 at level 4. Favours pay double.
- Weekly goals award 800 coins.
- The existing school festival awards 1,500 coins after its conditions are met.
- Tomas's three-heart scene already returns 50 coins he found under the player's old tractor seat.

That Tomas scene is a good existing example of the intended feeling: a person notices something while helping and shares the discovery with the player.

Level-ups and first-time album stamps do not automatically award money. Preserve that distinction: a meaningful achievement can be celebrated through recognition or a keepsake without another cash payout.

See [daily gifts](../src/core/today.mjs), [goal and festival rewards](../src/content/quests.mjs), [Tomas's scene](../src/content/hearts.mjs), and [first-time records](../src/core/act.mjs).

The earlier experiment with 1,000 starting coins does not validate this new reward schedule. Future testing must include the existing rewards and the proposed discoveries together.

## 5. Let a discovery open an interesting choice

After a find, offer one relevant suggestion and make it easy to continue playing freely.

| Player interest | Useful follow-up | Achievement to recognize |
|---|---|---|
| Farming and a pleasant home | An affordable crop, tree, or garden improvement | First harvest from the new planting or a completed family garden corner |
| Business | A real unmet order, a suitable selling channel, or a queue improvement | First planned batch delivered, first fruit-stand sale, or a production bottleneck resolved |
| Fishing and exploration | A clue near an accessible place or a new collection goal | A first species, a completed clue, or a fishing memory |
| School and community | The next available restoration step, preview activity, or classroom contest | A repaired route, a reopened room, or a completed optional activity |

For example, if the player has 50 coins before a 30-coin find, June could mention the 80-coin fruit stand only when it is genuinely available and the player has a useful supply of fruit. She should explain what it does and leave the player free to save the money or choose something else.

An early fishing find should not direct the player into a school activity that has not opened. Likewise, finding money should not trigger a recommendation to bake carrot cake when milk and the recipe are unavailable.

Different interests are flexible choices within the village journey. They are not permanent classes, and the current game does not yet support a complete independent progression route for each one.

## 6. Review of existing conversations

The reviewed dialogue already contains warmth, humor, and achievement reactions. The main issues are a few stern or overly economic phrases, statements that can become stale after progress, and advice that needs stronger checks against the actual game state.

The following revisions are **draft replacements for a future implementation**. They include English and Vietnamese so tone and relationships can be reviewed together. They have not been added to the live content files.

### June: make planting an invitation

Existing, in [JUNE_TIPS](../src/content/people.mjs):

> Empty beds earn nothing. Tap one, choose a crop, and drag across the rest.

The instruction is useful, but its opening makes an idle bed sound like a failure. Proposed replacement:

- **EN:** Room for something new, love. Tap an empty bed, choose a crop, then drag across the others to plant.
- **VI:** Còn chỗ để trồng thêm đấy, mình ơi. Chạm vào luống trống, chọn cây rồi kéo qua các luống còn lại nhé.

Show this only when usable empty beds exist and planting is possible. Choosing to fish, decorate, or rest should not repeatedly bring a warning about missed income.

### June: make practical help truthful

Existing, in [June's introductory tip](../src/content/people.mjs):

> Stuck, love? The order board always has one card you can fill. Start there.

The absolute promise needs a real eligibility check; being idle also does not necessarily mean the player is stuck. Proposed general replacement:

- **EN:** Fancy a little plan, love? The order board may have a use for what is already in our barn.
- **VI:** Mình cùng tính xem làm gì tiếp nhé? Biết đâu bảng đơn hàng có khách đang cần đồ sẵn trong kho.

When a particular order is actually ready, prefer a specific line naming that opportunity. If none is ready, offer an achievable next ingredient or another activity.

### Bo: remember the school opening

Existing, in [Bo's introduction](../src/content/people.mjs):

> Is the school really going to open again? I want a desk by the window!

Keep this before the school opens. Afterward, use a different line:

- **EN:** School is open! I hope my desk is by the window!
- **VI:** Trường mở rồi! Cháu mong được ngồi cạnh cửa sổ!

This keeps his excitement without claiming that a particular desk assignment has already happened.

### Marisol: let her friendship scenes follow the clinic's state

Existing, in [her three-heart scene](../src/content/hearts.mjs):

> Hollowbrook needs a proper clinic, not just me with a first-aid box. I am starting a list.

This works before the clinic opens. If the player reaches the friendship scene afterward, use a post-opening variation. Proposed line:

- **EN:** Hazel and I have the clinic ready. There is room for everyone—and Pia's collection of plasters.
- **VI:** Cô và bác sĩ Hazel đã chuẩn bị xong trạm y tế rồi. Đủ chỗ cho mọi người, và cả bộ sưu tập băng cá nhân của Pia nữa.

Her six- and nine-heart scenes also discuss gathering signatures and Hazel's future visit. Review those scenes as a sequence and provide matching post-opening variants. Replacing just one line would leave later conversations out of step with the village.

### Gus: preserve his grumble while showing trust

Existing, in [Gus's order lines](../src/content/people.mjs):

> Old Mill Farm has standards. Meet them.

Proposed replacement for a suitable baking-ingredient request:

- **EN:** Hmph. I have a new batch to bake. Your ingredients will do nicely.
- **VI:** Hừm. Bác đang làm mẻ bánh mới. Nguyên liệu của cháu được đấy.

Use a different context-matched line for requests unrelated to baking. Gus can remain proud and reserved while making it clear that the player's help is welcome.

### Shared chatter: avoid inventing chores

Existing, in [morning chatter](../src/content/chatter.mjs):

> Early start today. The beds will not water themselves.

The current crop rules do not require a watering action. The line can create unnecessary uncertainty. Proposed neutral adult line:

- **EN:** A lovely morning for the garden. There is time for a cup of tea, too.
- **VI:** Sáng nay ra vườn thì thích đấy. Vẫn kịp nhâm nhi một tách trà nữa.

Ada should continue to use her own family- and village-specific lines, as required by STORY.md, rather than fall back to interchangeable adult chatter.

## 7. Existing happy moments worth keeping

- Pip already reacts to building: "We built it! Well, you built it. I watched really hard." This is specific, playful, and appropriate for a child.
- June's first-cherry scene already suggests letting the orchard fund its next tree. Keep that practical connection, but select an acknowledgment instead if the player already has a fruit stand, and avoid implying that income is immediate.
- Tomas's 50-coin tractor-seat discovery already links help, personality, and a modest reward.
- Cora's school humor and the family letters give different kinds of warmth. Preserve their distinct voices.

A happy story can include quiet memories and a gentle mystery. Let difficult memories move toward care, repair, or companionship. Constant praise and exclamation marks would make the characters less believable.

## 8. A proposed discovery exchange

After the second rock has actually been cleared and its one-time reward granted:

**Pip**

- EN: There was a little tin under that stone! Look what was inside!
- VI: Dưới hòn đá có một hộp thiếc nhỏ! Nhìn xem bên trong có gì này!

**Ada**

- EN: A little surprise after all that digging, dear. What would you like to grow next?
- VI: Cháu đào đất vất vả mà tìm được món quà nhỏ này, vui quá nhỉ. Giờ cháu muốn trồng thêm gì nào?

**June, only if there is a suitable affordable option**

- EN: That could help with our next little project, love. Shall we have a look?
- VI: Có thêm khoản này thì mình lo được một phần cho việc tiếp theo rồi. Xem thử nhé, mình?

The final suggestion should open an explanation or preview. It should not automatically spend the reward. If no useful new option is available, let the family enjoy the discovery without immediately assigning another task.

All final dialogue must retain the pronouns and relationships in [STORY.md](STORY.md): Ada uses bà–cháu, Ellis ông–cháu, Gus bác–cháu, and June uses June for herself and mình for the player. Pip speaks as a child and uses con when referring to himself.

## 9. Present discoveries and achievements through village news

Use the existing proposed compact Village news entry point:

- A brief golden reveal and character response mark a notable discovery.
- The badge counts new unread messages, not unfinished obligations.
- The same discovery contributes one message, even if several game events or characters react to it.
- A saved card records what was found and can show a relevant next possibility.
- An album memory or keepsake remains after the player reads the message.
- Small repeated earnings use quiet feedback. Reserve stronger celebrations for first discoveries and meaningful milestones.

When the player follows advice, replace it with a specific acknowledgment. When the player chooses a different interest, leave room for that choice and avoid repeated reminders.

## 10. Rules and verification needed before implementation

1. **Count successful actions.** Fishing milestones count completed catches. Rock milestones count actual cleared rocks on owned land, not taps or weeds. The existing combined clearing statistic begins at three in restored games, so it cannot identify the player's second stone.
2. **Grant each discovery once.** Save the reward and its milestone together through the core action/tick system. Reloading, opening a message, or replaying an animation must not grant more money.
3. **Handle batch actions correctly.** Clearing several rocks together can cross a threshold, but should still create only one reward for that milestone.
4. **Scope road rewards.** Pay for the first restoration of the selected damaged segment. Neighbor-assisted completion can qualify, but must not produce a second payment. Later maintenance does not repeat the grant.
5. **Budget all reward sources together.** Include daily gifts, goals, friendship scenes, weekly rewards, and festival rewards. If discovery money contributes to an earn-coins goal, count the income once and verify the resulting combined payout.
6. **Make migration deliberate.** Existing saves need an explicit treatment of already completed milestones. Avoid accidentally paying every introductory reward at once on loading an old farm.
7. **Keep advice truthful.** Check current buildings, repairs, stock, queued goods, project reservations, recipes, costs, and player progress before offering a recommendation.
8. **Preserve memories across sessions.** Seen discoveries, recent advice topics, and achievements should not restart with every visit.
9. **Verify happy dialogue in context.** Review early and late friendship scenes, before/after school and clinic states, and both English and Vietnamese voices. No completed project should still be described as missing.
10. **Test pacing when the features are built.** Check all discoveries together and different player interests, retaining the school targets: casual by day 10, steady day 3–4, keen no earlier than day 2. The earlier 1,000-coin experiment is not evidence that these new triggers meet those targets.

## 11. Recommended first implementation scope

Keep the 500-coin restored start. Prototype the four small discoveries, a bounded saved history, relevant follow-up advice, and the contextual dialogue revisions above. Reuse the existing news and album foundations.

Evaluate whether players notice the connection between effort and discovery, understand one useful way to spend or save the reward, and remember a villager's reaction. Also check that ordinary farming remains rewarding when no treasure appears and that choosing leisure does not attract discouraging messages.

Only the starting amount and two design principles are settled here. The 110-coin reward schedule, exact triggers, and draft wording remain proposals for balance and content review.
