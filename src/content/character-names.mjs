// Localized aliases, keyed by permanent story/save identities. These do not add UI languages or change people.
// Short forms follow an authored title (e.g. "cụ ..."); display forms are for speaker labels and introductions.
const forms = (short, display = short) => Object.freeze({ short, display });
export const CHARACTER_NAMES = Object.freeze({
  ada: { en: forms('Maple', 'Granny Maple'), vi: forms('Mận', 'Bà Mận'), ko: forms('순이', '순이 할머니'), ja: forms('はな', 'はなばあちゃん') },
  ellis: { en: forms('Oak', 'Grandpa Oak'), vi: forms('Quế', 'Ông Quế'), ko: forms('덕수', '덕수 할아버지'), ja: forms('げん', 'げんじいちゃん') },
  june: { en: forms('Rosie'), vi: forms('Mơ'), ko: forms('미소'), ja: forms('こはる') },
  pip: { en: forms('Sunny'), vi: forms('Bắp'), ko: forms('하루'), ja: forms('ひなた') },
  minh: { en: forms('Chip'), vi: forms('Mộc', 'Chú Mộc'), ko: forms('뚝딱'), ja: forms('とんとん') },
  lan: { en: forms('Honey'), vi: forms('Bột', 'Cô Bột'), ko: forms('달콤'), ja: forms('あんず') },
  bo: { en: forms('Hopper'), vi: forms('Sóc'), ko: forms('폴짝'), ja: forms('けろ') },
  grace: { en: forms('Clover'), vi: forms('Bông', 'Cô Bông'), ko: forms('포근'), ja: forms('なごみ') },
  sam: { en: forms('Dash'), vi: forms('Gió', 'Chú Gió'), ko: forms('총총'), ja: forms('ふみ') },
  zara: { en: forms('Dot'), vi: forms('Cốm'), ko: forms('별이'), ja: forms('しおり') },
  elin: { en: forms('Poppy'), vi: forms('Nắng', 'Chị Nắng'), ko: forms('노을'), ja: forms('いろは') },
  olaf: { en: forms('Skipper'), vi: forms('Buồm', 'Ông Buồm'), ko: forms('바다'), ja: forms('なぎ') },
  marisol: { en: forms('Bonnie'), vi: forms('Trà', 'Cô Trà'), ko: forms('다정'), ja: forms('ほのか') },
  tomas: { en: forms('Rusty'), vi: forms('Đinh', 'Chú Đinh'), ko: forms('튼튼'), ja: forms('くるり') },
  pia: { en: forms('Tilly'), vi: forms('Su Su'), ko: forms('콩콩'), ja: forms('まめ') },
  cora: { en: forms('Winnie'), vi: forms('Mầm', 'Cô Mầm'), ko: forms('새싹'), ja: forms('わかば') },
  hazel: { en: forms('Fern', 'Dr Fern'), vi: forms('Sen', 'Bác sĩ Sen'), ko: forms('온기', '온기 선생님'), ja: forms('すみれ', 'すみれ先生') },
  // the baker, who comes with the first market day (chapter 6). Not 보리 or こむぎ: those are the dog's names.
  hugo: { en: forms('Barley'), vi: forms('Lúa', 'Chú Lúa'), ko: forms('고소'), ja: forms('こんがり') },
  // the man from the city, who waits for his answer in chapter 11
  albright: { en: forms('Albright', 'Mr Albright'), vi: forms('Thịnh', 'Ông Thịnh'), ko: forms('한몫', '한몫 씨'), ja: forms('やりて', 'やりてさん') },
  // the office manager, who comes with the company office (chapter 8)
  bea: { en: forms('Penny'), vi: forms('Xu', 'Cô Xu'), ko: forms('꼼꼼'), ja: forms('きっちり') },
  // the constable, who comes with the police post (chapter 7)
  pearl: { en: forms('Sage', 'Constable Sage'), vi: forms('Tre', 'Cô Tre'), ko: forms('반듯', '반듯 순경'), ja: forms('きりり', 'きりり巡査') },
  // the keeper of the quay, who comes with the first quay house (chapter 13)
  tuyet: { en: forms('Snow', 'Nana Snow'), vi: forms('Tuyết', 'Bà Tuyết'), ko: forms('매실', '매실 할머니'), ja: forms('うめ', 'うめばあちゃん') },
  // the two growers from outside the valley (chapter 12): the orchard grower from the east hill, and the twins from upstream
  priya: { en: forms('Juniper'), vi: forms('Sim', 'Chị Sim'), ko: forms('오디'), ja: forms('かりん') },
  twins: { en: forms('Pebble and Sprig'), vi: forms('Sỏi và Chồi'), ko: forms('누리와 마루'), ja: forms('そらとあおい') },
  mai: { en: forms('Daisy'), vi: forms('Na', 'Chị Na'), ko: forms('도란'), ja: forms('ゆず') },
  gus: { en: forms('Bramble'), vi: forms('Khoai', 'Bác Khoai'), ko: forms('누룽지'), ja: forms('だいふく') },
});

export const PET_NAMES = Object.freeze({
  dog: { en: forms('Biscuit'), vi: forms('Đậu', 'Cún Đậu'), ko: forms('보리'), ja: forms('こむぎ') },
  hen_cloud: { en: forms('Cloud'), vi: forms('Mây'), ko: forms('구름'), ja: forms('ふわり') },
  hen_drizzle: { en: forms('Drizzle'), vi: forms('Mưa'), ko: forms('이슬'), ja: forms('しずく') },
  frog_captain: { en: forms('Captain'), vi: forms('Thuyền Trưởng'), ko: forms('대장'), ja: forms('たいちょう') },
  // The cat is still a planned roadmap character; a name does not unlock its gameplay.
  cat: { en: forms('Miso'), vi: forms('Mít', 'Mèo Mít'), ko: forms('두부'), ja: forms('きなこ') },
});

export const FAMILY_NAMES = Object.freeze({
  tran: { en: "Chip's family", vi: 'Nhà chú Mộc', ko: '뚝딱네', ja: 'とんとんの家族' },
  okafor: { en: "Dash's family", vi: 'Nhà chú Gió', ko: '총총네', ja: 'ふみの家族' },
  lindqvist: { en: "Poppy's family", vi: 'Nhà chị Nắng', ko: '노을네', ja: 'いろはの家族' },
  reyes: { en: "Bonnie's family", vi: 'Nhà cô Trà', ko: '다정네', ja: 'ほのかの家族' },
});

const known = (table, id) => Object.hasOwn(table, id) ? table[id] : null;
const localized = (table, id, language, form) => {
  const entry = known(table, id); if (!entry) return id;
  const names = Object.hasOwn(entry, language) ? entry[language] : entry.en;
  return names[form === 'short' ? 'short' : 'display'];
};
export const personName = (id, language = 'en', form = 'display') => localized(CHARACTER_NAMES, id, language, form);
export const petName = (id, language = 'en', form = 'display') => localized(PET_NAMES, id, language, form);
export function familyName(id, language = 'en') {
  const entry = known(FAMILY_NAMES, id); return entry ? (Object.hasOwn(entry, language) ? entry[language] : entry.en) : id;
}
/** Resolve only explicit authored references. Run before substituting player-provided message parameters. */
export function resolveNames(text, language = 'en') {
  if (typeof text !== 'string') return text;
  return text.replace(/\{(?:(person|pet):([a-z_]+):(short|display)|family:([a-z_]+))\}/g, (token, type, id, form, family) => {
    if (family) return known(FAMILY_NAMES, family) ? familyName(family, language) : token;
    const table = type === 'person' ? CHARACTER_NAMES : PET_NAMES;
    return known(table, id) ? localized(table, id, language, form) : token;
  });
}
