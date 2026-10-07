// Icons in menus (ui package). iconHtml(id) gives the art kit's rendered icon (content/icons.mjs: goods and buildings by
// id, 'tool:*', 'ui:*', 'person:*', 'family:*'); for interface symbols the kit has no picture of (calendar, gear, letter,
// lock, close ...) it draws a small glossy SVG in the same toy style: thick brown outline, bright fill, a white shine.
// The emoji is only the last resort for an id nobody knows. 'coin' and 'xp' also find 'ui:coin' and 'ui:xp'.
import { iconUrl } from '../content/icons.mjs';
import { GOODS } from '../content/goods.mjs';

const O = '#5b3418';   // outline
const svg = body => `<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" stroke-linejoin="round" stroke-linecap="round">${body}</svg>`;
const shine = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="#fff" opacity=".55"/>`;
const HEART = 'M24 41S6 30 6 17.5C6 11.7 10.5 7.5 15.5 7.5c3.8 0 6.7 2 8.5 5 1.8-3 4.7-5 8.5-5 5 0 9.5 4.2 9.5 10C42 30 24 41 24 41z';
/** SVG symbols for the interface (48 × 48, drawn to read at 20–40 px). */
export const GLYPHS = {
  today: svg(`<rect x="7" y="10" width="34" height="31" rx="6" fill="#fffaf0" stroke="${O}" stroke-width="3"/><path d="M7 16a6 6 0 0 1 6-6h22a6 6 0 0 1 6 6v5H7z" fill="#ef5b4c" stroke="${O}" stroke-width="3"/><rect x="14" y="5" width="5" height="10" rx="2.5" fill="#ffd25a" stroke="${O}" stroke-width="2.5"/><rect x="29" y="5" width="5" height="10" rx="2.5" fill="#ffd25a" stroke="${O}" stroke-width="2.5"/><path d="M16 31l5 5 10-10" fill="none" stroke="#3fa52a" stroke-width="4.5"/>`),
  projects: svg(`<path d="M5 19L24 7l19 12z" fill="#36b3a8" stroke="${O}" stroke-width="3"/><rect x="8" y="19" width="32" height="5" fill="#fff4dc" stroke="${O}" stroke-width="3"/><rect x="11" y="24" width="5" height="13" fill="#fffaf0" stroke="${O}" stroke-width="2.5"/><rect x="21.5" y="24" width="5" height="13" fill="#fffaf0" stroke="${O}" stroke-width="2.5"/><rect x="32" y="24" width="5" height="13" fill="#fffaf0" stroke="${O}" stroke-width="2.5"/><rect x="6" y="37" width="36" height="5" rx="2" fill="#ffd25a" stroke="${O}" stroke-width="3"/><circle cx="24" cy="15" r="2.5" fill="#ffd25a"/>`),
  album: svg(`<path d="M8 9h26a6 6 0 0 1 6 6v25H14a6 6 0 0 1-6-6z" fill="#3d8fe0" stroke="${O}" stroke-width="3"/><path d="M14 34h26v6H14a3 3 0 0 1 0-6z" fill="#fffaf0" stroke="${O}" stroke-width="2.5"/><path d="M24 28s-7-4.3-7-8.6c0-2.3 1.8-3.9 3.7-3.9 1.5 0 2.6.8 3.3 2 .7-1.2 1.8-2 3.3-2 1.9 0 3.7 1.6 3.7 3.9 0 4.3-7 8.6-7 8.6z" fill="#ff6f91" stroke="${O}" stroke-width="2"/>${shine(11, 12, 3, 14)}`),
  settings: svg(`<g transform="translate(24 24)"><path d="M-3.5-19h7l1.2 4.6 4 1.7 4.2-2.4 5 5-2.4 4.2 1.7 4 4.6 1.2v7l-4.6 1.2-1.7 4 2.4 4.2-5 5-4.2-2.4-4 1.7-1.2 4.6h-7l-1.2-4.6-4-1.7-4.2 2.4-5-5 2.4-4.2-1.7-4-4.6-1.2v-7l4.6-1.2 1.7-4-2.4-4.2 5-5 4.2 2.4 4-1.7z" fill="#8fa4bd" stroke="${O}" stroke-width="3"/></g><circle cx="24" cy="24" r="6.5" fill="#ffd25a" stroke="${O}" stroke-width="3"/>`),
  mail: svg(`<rect x="5" y="12" width="38" height="26" rx="5" fill="#fffaf0" stroke="${O}" stroke-width="3"/><path d="M6 14l18 13 18-13" fill="none" stroke="${O}" stroke-width="3"/><circle cx="24" cy="27" r="5" fill="#ef5b4c" stroke="${O}" stroke-width="2.5"/>`),
  gift: svg(`<rect x="7" y="19" width="34" height="22" rx="4" fill="#ff6f91" stroke="${O}" stroke-width="3"/><rect x="5" y="13" width="38" height="8" rx="3" fill="#ff8fab" stroke="${O}" stroke-width="3"/><rect x="21" y="13" width="6" height="28" fill="#ffd25a" stroke="${O}" stroke-width="2.5"/><path d="M24 13c-3-6-11-7-10-2 1 3 6 2 10 2zm0 0c3-6 11-7 10-2-1 3-6 2-10 2z" fill="#ffd25a" stroke="${O}" stroke-width="2.5"/>`),
  charm: svg(`<path d="M24 4l4.6 13.4L42 22l-13.4 4.6L24 40l-4.6-13.4L6 22l13.4-4.6z" fill="#ffcf3f" stroke="${O}" stroke-width="3"/><path d="M38 32l1.6 4.4L44 38l-4.4 1.6L38 44l-1.6-4.4L32 38l4.4-1.6z" fill="#ff8fc7" stroke="${O}" stroke-width="2"/>`),
  clock: svg(`<circle cx="24" cy="26" r="17" fill="#fffaf0" stroke="${O}" stroke-width="3"/><circle cx="24" cy="26" r="13" fill="none" stroke="#ef5b4c" stroke-width="2.5"/><path d="M24 17v9l6 4" fill="none" stroke="${O}" stroke-width="3.5"/><rect x="20" y="4" width="8" height="5" rx="2" fill="#ef5b4c" stroke="${O}" stroke-width="2.5"/>`),
  rotate: svg(`<path d="M36.5 18A14 14 0 1 0 38 30" fill="none" stroke="${O}" stroke-width="9"/><path d="M36.5 18A14 14 0 1 0 38 30" fill="none" stroke="#45a6f0" stroke-width="5"/><path d="M42 7l-1.5 14.5L27 16z" fill="#45a6f0" stroke="${O}" stroke-width="3"/>`),
  close: svg(`<path d="M14 14l20 20M34 14L14 34" stroke="${O}" stroke-width="10"/><path d="M14 14l20 20M34 14L14 34" stroke="#fff" stroke-width="5"/>`),
  check: svg(`<path d="M10 25l9 9 19-20" fill="none" stroke="${O}" stroke-width="10"/><path d="M10 25l9 9 19-20" fill="none" stroke="#7ee04f" stroke-width="5"/>`),
  undo: svg(`<path d="M15 20h15a9 9 0 0 1 0 18H18" fill="none" stroke="${O}" stroke-width="9"/><path d="M15 20h15a9 9 0 0 1 0 18H18" fill="none" stroke="#ffb547" stroke-width="5"/><path d="M5 20l12-10v20z" fill="#ffb547" stroke="${O}" stroke-width="3"/>`),
  trash: svg(`<path d="M11 15h26l-2.5 26h-21z" fill="#a9bdd3" stroke="${O}" stroke-width="3"/><rect x="7" y="9" width="34" height="7" rx="3" fill="#cfdcea" stroke="${O}" stroke-width="3"/><path d="M19 21v15M29 21v15" stroke="${O}" stroke-width="2.5"/><rect x="19" y="5" width="10" height="5" rx="2" fill="#cfdcea" stroke="${O}" stroke-width="2.5"/>`),
  lock: svg(`<path d="M15 22v-6a9 9 0 0 1 18 0v6" fill="none" stroke="${O}" stroke-width="8"/><path d="M15 22v-6a9 9 0 0 1 18 0v6" fill="none" stroke="#c8d3de" stroke-width="4"/><rect x="9" y="21" width="30" height="21" rx="5" fill="#ffc93c" stroke="${O}" stroke-width="3"/><circle cx="24" cy="30" r="3" fill="${O}"/><rect x="22.5" y="31" width="3" height="6" rx="1.5" fill="${O}"/>${shine(13, 24, 10, 3)}`),
  camera: svg(`<rect x="5" y="14" width="38" height="26" rx="6" fill="#ff8f3c" stroke="${O}" stroke-width="3"/><path d="M16 14l3-6h10l3 6" fill="#ffc93c" stroke="${O}" stroke-width="3"/><circle cx="24" cy="27" r="8.5" fill="#bfe6ff" stroke="${O}" stroke-width="3"/><circle cx="21.5" cy="24.5" r="2.5" fill="#fff"/>`),
  up: svg(`<path d="M24 6L41 24H31v17H17V24H7z" fill="#7ee04f" stroke="${O}" stroke-width="3"/>${shine(20, 26, 3, 11)}`),
  down: svg(`<path d="M24 42L41 24H31V7H17v17H7z" fill="#45a6f0" stroke="${O}" stroke-width="3"/>`),
  open: svg(`<path d="M24 6L41 24H31v17H17V24H7z" fill="#ffb547" stroke="${O}" stroke-width="3"/>`),
  plus: svg(`<path d="M24 10v28M10 24h28" stroke="${O}" stroke-width="11"/><path d="M24 10v28M10 24h28" stroke="#7ee04f" stroke-width="6"/>`),
  play: svg(`<path d="M15 9l24 15-24 15z" fill="#ffb547" stroke="${O}" stroke-width="3"/>`),
  dot: svg(`<circle cx="24" cy="24" r="7" fill="#d9c6a8" stroke="${O}" stroke-width="2.5"/>`),
  sprout: svg(`<path d="M24 42V24" stroke="${O}" stroke-width="7"/><path d="M24 42V24" stroke="#5aa832" stroke-width="3.5"/><path d="M24 26c-2-9-10-12-17-11 0 8 7 13 17 11z" fill="#7ee04f" stroke="${O}" stroke-width="3"/><path d="M24 22c2-9 10-12 17-11 0 8-7 13-17 11z" fill="#9ae86a" stroke="${O}" stroke-width="3"/>`),
  person: svg(`<circle cx="24" cy="17" r="9" fill="#ffd3a8" stroke="${O}" stroke-width="3"/><path d="M8 43c1-10 8-15 16-15s15 5 16 15z" fill="#45a6f0" stroke="${O}" stroke-width="3"/>`),
  hand: svg(`<path d="M18 24V8a4 4 0 0 1 8 0v12h2a3.5 3.5 0 0 1 7 0v1a3.5 3.5 0 0 1 7 0v8c0 8-5 13-13 13h-3c-6 0-9-4-12-9l-4-7c-1.5-2.5 1.5-5 4-3z" fill="#ffe0b8" stroke="${O}" stroke-width="3"/><path d="M28 20v6M35 21v6M26 20v6" stroke="${O}" stroke-width="2.2" fill="none"/>${shine(20, 9, 3, 10)}`),
  heart: svg(`<path d="${HEART}" fill="#ff5c7c" stroke="${O}" stroke-width="3"/>${shine(11, 13, 7, 4)}`),
  'heart-empty': svg(`<path d="${HEART}" fill="#ead9c0" stroke="#b39674" stroke-width="3"/>`),
  bag: svg(`<path d="M12 18h24l3 22a3 3 0 0 1-3 3H12a3 3 0 0 1-3-3z" fill="#e8c38a" stroke="${O}" stroke-width="3"/><path d="M14 18c0-6 4-11 10-11s10 5 10 11" fill="none" stroke="${O}" stroke-width="3"/><circle cx="24" cy="30" r="5" fill="#7ee04f" stroke="${O}" stroke-width="2.5"/>`),
  cart: svg(`<path d="M5 16h30l-3 15H9z" fill="#d9894a" stroke="${O}" stroke-width="3"/><path d="M8 22h26M7 27h26" stroke="${O}" stroke-width="2"/><circle cx="14" cy="36" r="5" fill="#ffd25a" stroke="${O}" stroke-width="3"/><circle cx="30" cy="36" r="5" fill="#ffd25a" stroke="${O}" stroke-width="3"/><path d="M35 19l8-5" stroke="${O}" stroke-width="3"/>`),
  crate: svg(`<rect x="7" y="12" width="34" height="27" rx="3" fill="#d9894a" stroke="${O}" stroke-width="3"/><path d="M7 21h34M7 30h34" stroke="${O}" stroke-width="2.5"/><path d="M12 12l24 27" stroke="#b3672e" stroke-width="3"/>`),
  star: svg(`<path d="M24 5l5.6 12 13 1.6-9.6 9 2.5 13L24 34.2 12.5 40.6l2.5-13-9.6-9 13-1.6z" fill="#ffd23f" stroke="${O}" stroke-width="3"/>`),
  wrench: svg(`<path d="M30 6a11 11 0 0 0-9.6 15.4L6.6 35.2a4.4 4.4 0 0 0 6.2 6.2l13.8-13.8A11 11 0 0 0 42 18l-6.6 6.6-6-6L36 12z" fill="#c8d3de" stroke="${O}" stroke-width="3"/>${shine(9, 33, 3, 7)}`),
  demolish: svg(`<rect x="6" y="9" width="26" height="13" rx="3" fill="#ef7a4c" stroke="${O}" stroke-width="3" transform="rotate(25 19 15)"/><path d="M22 24l15 15" stroke="${O}" stroke-width="10"/><path d="M22 24l15 15" stroke="#d9894a" stroke-width="5"/><path d="M33 38l9 3-3 3z" fill="#ffc93c" stroke="${O}" stroke-width="2"/>`),
  home: svg(`<path d="M6 24L24 9l18 15" fill="#ef5b4c" stroke="${O}" stroke-width="3"/><rect x="11" y="22" width="26" height="19" fill="#fff4dc" stroke="${O}" stroke-width="3"/><rect x="20" y="29" width="8" height="12" fill="#c77d3e" stroke="${O}" stroke-width="2.5"/>`),
};
const ALIAS = { coin: 'ui:coin', xp: 'ui:xp', barn: 'ui:barn', orders: 'ui:orders' };
const glyphName = id => (typeof id === 'string' ? id.replace(/^(ui|glyph):/, '') : '');
/** The rendered icon for an id (an <img>), else an SVG symbol, else the emoji. `cls` is the element's class. */
export const iconHtml = (id, emoji = '', cls = 'icon') => {
  const u = id && (iconUrl(id) ?? (ALIAS[id] && iconUrl(ALIAS[id])));
  if (u) return `<img class="${cls}" src="${u}" alt="" draggable="false" decoding="async">`;
  const g = GLYPHS[glyphName(id)];
  if (g) return `<span class="${cls} glyph">${g}</span>`;
  return emoji ? `<span class="${cls} emoji">${emoji}</span>` : '';
};
/** Just the SVG symbol (for buttons and inline marks). */
export const glyph = (name, cls = 'g') => GLYPHS[name] ? `<span class="${cls}">${GLYPHS[name]}</span>` : '';
/** A person's portrait (the generic figure for someone with no portrait, such as Ellis). */
export const faceHtml = (id, cls = 'face') => iconUrl(`person:${id}`) ? iconHtml(`person:${id}`, '', cls) : `<span class="${cls} glyph">${GLYPHS.person}</span>`;
/** A good's icon. */
export const goodIcon = (g, cls = 'icon') => iconHtml(g, GOODS[g]?.icon ?? '', cls);
/** A small coin, star or heart mark before a number. */
export const coinMark = () => iconHtml('ui:coin', '', 'mark');
export const xpMark = () => iconHtml('ui:xp', '', 'mark');
