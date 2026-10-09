# Hollowbrook: playful names in each language

Status: **current cast selected for implementation, 2026-10-09**. The user explicitly requested the runtime change; [LOCALIZED-CAST.md](LOCALIZED-CAST.md) records its implementation and verification. The user confirmed that names should be playful and fun, and that affectionate home names are welcome. Each language may use a different native name for the same character. The previous Althea/Oswin/Sylvie/Tavi proposal and its formal-name rules are withdrawn. The current cast below is the implementation contract; the later cast remains proposed.

## 1. The direction the user chose

Aim for the feeling of meeting friendly neighbours in a storybook village. A name should be easy to say, easy to remember, and pleasant in repeated conversation. Familiar foods, plants, weather, sounds, and affectionate nicknames suit this game. Full legal names are unnecessary. Avoid making names unusual merely to make them rare.

Use three separate pieces:

- **Short name:** the everyday identity, such as Bắp, Sóc, Cốm, or Mơ.
- **Relationship or job:** the appropriate label in context, such as Bà Mận, Chú Mộc, or Bác sĩ Sen.
- **Occasional description:** an introduction or album caption that reveals a trait, such as “Sóc — chân chạy của xóm.” Do not repeat the description in every speech bubble.

These are localized aliases, not literal translations or transliterations. Changing language changes the display name, not the person, family, memories, personality, progress, or rewards. The player's chosen name stays exactly as entered.

## 2. What the Zoo Pet reference actually shows

The supplied `zoo-pet.shop` address did not resolve during this review. The user's local reference notes identify [Zoo Pet at zoo-pet.store](https://zoo-pet.store/), which redirected in the browser to its [public CDN](https://d173ysgpwor2n4.cloudfront.net/). The page title was Zoo Pet. The currently served [public game client](https://d173ysgpwor2n4.cloudfront.net/assets/index-B1RlJtWd.js) was inspected on 2026-10-08.

Verified examples from that client: **Bác Cú**, **Củ Cải Cười**, **Gà Mái Cục Tác**, **Bò Sữa Mộng Mơ**, and **Cừu Mây Bông**. The adviser is named in story UI; the other examples are crop or creature labels. These are not a verified human-neighbour cast or names taken from online players.

The useful pattern is a familiar word with a little personality, movement, sound, or affectionate address. Applying that pattern to Hollowbrook is an editorial recommendation. This inspection does not establish that particular names improve retention, nor does it justify copying Zoo Pet's full catalogue, dialogue, code, or art.

### Supporting language research

- **Vietnamese:** [Huggies' home-name guide](https://www.huggies.com.vn/dat-ten-cho-be/ten-duoc-yeu-thich/ten-o-nha-cho-be) includes food and nature names such as Mơ, Mận, Bắp, Cốm, and Mít. It supports this familiar naming style; it is an editorial guide, not population research. Applying a warm nature nickname to an older fictional villager is our own choice.
- **English:** [Nameberry's Chip entry](https://nameberry.com/name/chip) documents an established nickname form. The English set below mixes familiar short names with deliberate storybook nicknames such as Maple, Oak, and Bramble. Those creative choices are not claimed to be common legal names or names statistically preferred by players.
- **Korean:** NAMEChart records [하루](https://www.namechart.kr/name/하루) for both boys and girls and [미소](https://www.namechart.kr/name/미소) as an established personal name. These are usage references, not a cuteness ranking. [The National Institute of Korean Language](https://krdict.korean.go.kr/eng/dicSearch/SearchView?ParaWordNo=59246&nation=eng) also documents 미소 as the word for a smile. Short local aliases can work without inventing surnames or hanja meanings.
- **Japanese:** [Benesse/Tamahiyo's 2025 name survey](https://st.benesse.ne.jp/ninshin/name/) includes ひなた among readings used by both boys and girls. [Anicom's dog-name survey](https://www.anicom-sompo.co.jp/news-release/2025/20241030/) supports food-style pet names such as こむぎ and きなこ. Names below use readable kana; they do not assert a particular kanji spelling or meaning.

The individual assignments below are **creative proposals informed by those patterns**, not a list copied from any one source. Korean and Japanese need a native-speaker dialogue review before those full language editions ship.

## 3. Selected current cast

The IDs are existing identities, not words the player should see. Relationship labels in this table are display examples; dialogue must adapt them to the listener. In particular, the player's child calls Ada and Ellis **cụ** in Vietnamese, even when their player-facing cards use bà/ông.

| Stable ID | Existing role | English | Vietnamese | Korean | Japanese |
|---|---|---|---|---|---|
| `ada` | Grandmother and guide | Granny Maple | Bà Mận | 순이 할머니 | はなばあちゃん |
| `ellis` | Grandfather; letters from upriver | Grandpa Oak | Ông Quế | 덕수 할아버지 | げんじいちゃん |
| `june` | Partner and farm adviser | Rosie | Mơ | 미소 | こはる |
| `pip` | Player’s curious child | Sunny | Bắp | 하루 | ひなた |
| `minh` | Carpenter | Chip | Chú Mộc | 뚝딱 | とんとん |
| `lan` | Cook and baker | Honey | Cô Bột | 달콤 | あんず |
| `bo` | Schoolboy; frogs and races | Hopper | Sóc | 폴짝 | けろ |
| `grace` | Vet | Clover | Cô Bông | 포근 | なごみ |
| `sam` | Postman | Dash | Chú Gió | 총총 | ふみ |
| `zara` | Bookish schoolgirl | Dot | Cốm | 별이 | しおり |
| `elin` | Painter | Poppy | Chị Nắng | 노을 | いろは |
| `olaf` | Retired sailor | Skipper | Ông Buồm | 바다 | なぎ |
| `marisol` | Nurse and clinic organizer | Bonnie | Cô Trà | 다정 | ほのか |
| `tomas` | Mechanic | Rusty | Chú Đinh | 튼튼 | くるり |
| `pia` | Young neighbour; counts everything | Tilly | Su Su | 콩콩 | まめ |
| `cora` | Teacher | Winnie | Cô Mầm | 새싹 | わかば |
| `hazel` | Elder doctor | Dr Fern | Bác sĩ Sen | 온기 선생님 | すみれ先生 |
| `mai` | Neighbour; ducks and tea | Daisy | Chị Na | 도란 | ゆず |
| `gus` | Grumbling, kind-hearted baker | Bramble | Bác Khoai | 누룽지 | だいふく |

Several aliases are intentionally whimsical character handles: Korean 뚝딱 and 폴짝, for example, and Japanese とんとん and くるり. They are not presented as common legal human names. Family warmth comes from how people speak and behave as well as their names.

The home family in Vietnamese would be **Bà Mận, Ông Quế, Mơ, and Bắp**. The school children would be **Bắp, Sóc, Cốm, and Su Su**. This gives the children distinct sounds and avoids replacing Pip with another formal, unfamiliar name.

Each existing household keeps its stable identity and membership: `tran`, `okafor`, `lindqvist`, and `reyes`. Do not infer new ethnicity, nationality, marriage, or parentage from a localized alias. Where a household caption needs localization, a friendly label based on a member's name is possible, such as “Nhà chú Mộc” / “Chip's family”; treat that as display text, not a change to the saved family ID or established family history.

## 4. Named animals

| Existing identity | English | Vietnamese | Korean | Japanese |
|---|---|---|---|---|
| Farm dog (`dog`, currently Biscuit) | Biscuit | Đậu; introduce as Cún Đậu | 보리 | こむぎ |
| First named hen (currently Cloud) | Cloud | Mây | 구름 | ふわり |
| Second named hen (currently Drizzle) | Drizzle | Mưa | 이슬 | しずく |
| Schoolboy's frog (currently Captain) | Captain | Thuyền Trưởng | 대장 | たいちょう |
| Planned barn cat (currently Miso) | Miso | Mít; introduce as Mèo Mít | 두부 | きなこ |

Hen and frog aliases are editorial adaptations. The gentle pair remains recognizable without requiring identical literal meanings in all four languages. There is no dog/hen name reuse. The Korean partner alias 미소 and English cat name Miso belong to different language editions; the Korean cat is 두부, so they do not collide within one edition.

The cat's future gameplay is not implemented by naming it. Other livestock and wildlife need no individual personal names in this pass. Species/product labels remain separate: a hen called Mây still produces ordinary eggs.

## 5. Later cast: plan before introduction

The later roadmap already mentions Hugo (baker), Pearl (officer), Bea (office manager), Priya (neighbouring grower), two twins, Mr Albright (businessman), and Nana Tuyết (Pine Ridge keeper). Their old planning labels are not approved replacements for this playful set.

| Existing planning label and role | English | Vietnamese | Korean | Japanese |
|---|---|---|---|---|
| Hugo — baker | Muffin | Mạch | 호두 | こっぺ |
| Pearl — officer | Pepper | Tiêu | 반짝 | ぴかり |
| Bea — office manager | Penny | Hạt Dẻ | 차곡 | つむぎ |
| Priya — orchard neighbour | Peach | Đào | 살구 | みかん |
| First twin — individual identity pending | Pebble | Dâu | 누리 | そら |
| Second twin — individual identity pending | Sprig | Dừa | 마루 | あおい |
| Mr Albright — businessman | Mr Buttons | Ông Nút | 단추 | ひのき |
| Nana Tuyết — elder keeper | Granny Snow | Bà Tuyết | 매실 할머니 | うめばあちゃん |

Future names are optional proposals, not shipped people or authored introductions. The twins need two distinct person IDs when implemented; do not infer their age, gender, pronouns, or personality from these aliases. Elin and Olaf's exact kinship also remains unspecified. Nana is an affectionate title, not a newly invented relationship to the player. Other unauthored households should be named only when their role and first meeting are written.

## 6. How names support the happy story

Keep the short name stable. Let actual actions and dialogue make the person memorable. Descriptions should celebrate useful habits rather than belittle a character's appearance, age, ability, or circumstances.

Examples for a future writing pass, **not implemented dialogue**:

- **Bắp — người tìm kho báu tí hon.** “Con thấy gì lấp lánh bên kia kìa!” Only use an exploration hint when a real discoverable object is available; do not promise a coin reward for every action.
- **Sóc — chân chạy của xóm.** A race or frog observation can reinforce the nickname without making every line about speed.
- **Cốm — bạn nhỏ mê sách.** Give the child concrete observations and questions, not adult economic advice.
- **Chú Mộc — người giữ hộp đinh.** Practical repair suggestions must check the available project and materials.
- **Cún Đậu — đội trưởng đuổi quạ.** The description fits the dog's existing kennel role.
- **Bà Mận — bếp bánh luôn ấm.** Keep her practical care, family memories, and specific connection to the oven.

Useful business advice, discoveries, and congratulations still use the existing shared game facts and stable topic IDs. Nicknames do not justify repeated generic jokes, premature story spoilers, invented lucky rewards, or a second advice system. English and Vietnamese must remain equally adaptive.

## 7. Implementation contract

1. **One identity registry.** Store localized short names by stable character ID, with separate relationship/profession formatting. Prepare `en`, `vi`, `ko`, and `ja` values. English and Vietnamese are currently the complete UI languages; a Korean/Japanese name table alone must not expose a half-translated language option.
2. **Explicit authored references.** Use identity tokens in new source content, resolved through the selected locale. Do not globally replace words in rendered strings: “Mai” can mean tomorrow in Vietnamese, and the player's text must remain untouched.
3. **All display paths.** Cover chapter cards, speech, tutorial headers, order senders and text, arrivals, letters/signatures, heart scenes, wishes, family labels, advice/news, neighbour signs, kennel labels, and animal introductions. Keep professions, proper names, and kinship separate.
4. **Rewrite name-dependent jokes.** The old B-O desk joke needs a new short scene, not a blind substitution. Grandfather's initials/signature and partner self-reference need deliberate localized wording. Preserve scene order and the same underlying story facts.
5. **Compatible old text.** Old `orders.cards[].line` and `wishes.list[].text` can contain complete English sentences with former names. Use a narrow exact-source compatibility map at rendering or load time. Preserve goods, prices, sender IDs, progress, thresholds, and completion flags. Never reroll orders, reset mail, or pay rewards as part of a rename.
6. **Save and art stability.** Keep person/family IDs, three-profile isolation, history IDs, discovery state, model filenames, and portrait icon IDs unchanged. Source-rig names are provenance, not extra game characters. Logic owns naming text; any actually embedded image lettering belongs to Claude's art lane.
7. **Speaker review.** Preserve bà–cháu, ông–cháu, child con/cụ, other children's cháu, and each neighbour's established relationship rules. The partner can refer to herself by the new Vietnamese alias and address the player as mình. In future Korean/Japanese child dialogue, preserve the great-grandparent relationship too (증조할머니/증조할아버지; ひいばあちゃん/ひいじいちゃん), rather than substituting player-facing grandparent labels everywhere. The elder doctor remains distinct from the nurse and vet.
8. **Meaningful checks.** Test name resolution in four locales and fallback behavior, literal player input, old-save order/wish rendering, locale switches without story/reward changes, and references across all supported UI surfaces. Check duplicate names within each edition. Run existing translation, story/pronoun, rules, and simulation tests plus the required build/browser suites for the eventual code pass.
9. **Phone and release review.** Inspect 390 px chapter cards, dialogue, orders, mail, and family labels in English and Vietnamese. Check Korean/Japanese glyphs in the prepared name fixtures without advertising complete UI support. Work on `codex/*`, integrate current main, and deliver through a PR; do not push directly to main.

## 8. Current delivery status

- [x] Confirmed the user's preference for playful, fun home names and independent names per language.
- [x] Inspected the reachable Zoo Pet reference and separated observed names from our proposals.
- [x] Researched local naming patterns and prepared the revised candidate sheet.
- [x] Adopt the proposed current cast following the user’s request to implement the naming change (2026-10-09).
- [x] Implement localized name resolution and authored story updates.
- [x] Complete save-compatibility, pronoun, bilingual browser, and phone-layout checks.
- [x] Prepare the reviewed runtime release; its PR records publication and live verification.

The implementation on `codex/localized-cast` updates [STORY.md](STORY.md) alongside the authored text. Validation and publication are tracked in [LOCALIZED-CAST.md](LOCALIZED-CAST.md); do not infer that the separate later cast or full Korean/Japanese editions have shipped.
