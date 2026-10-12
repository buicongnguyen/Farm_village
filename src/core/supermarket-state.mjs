// Small eager save/reservation contract. Offers, dialogue and room code load with the shop panel.
import { GOODS } from '../content/goods.mjs';
import { SUPERMARKET, SHOP_SECTIONS, SHOP_MEMORY_IDS } from '../content/supermarket.mjs';
import { workingCount } from './working.mjs';
const stamp = n => Number.isSafeInteger(n) && n >= 0;
const counter = n => stamp(n) && n < 1_000_000 ? n : 0;
export const basketPrice = need => Math.ceil(Object.entries(need).reduce((sum, [g, n]) => sum + GOODS[g].value * n, 0) * SUPERMARKET.premium);
function validRequest(raw, serial, sections) {
  if (!raw || raw.id !== `shop:${serial}` || !Object.hasOwn(SHOP_SECTIONS, raw.section) || !sections[raw.section]
    || !raw.need || Array.isArray(raw.need) || typeof raw.need !== 'object' || !stamp(raw.offeredAt) || typeof raw.accepted !== 'boolean') return null;
  const rows = Object.entries(raw.need);
  if (rows.length < 1 || rows.length > 2 || rows.some(([g, n]) => !SHOP_SECTIONS[raw.section].goods.includes(g) || !stamp(n) || n < 1 || n > SUPERMARKET.units)
    || rows.reduce((n, [, v]) => n + v, 0) !== SUPERMARKET.units || raw.payment !== basketPrice(raw.need)) return null;
  return { id: raw.id, section: raw.section, need: Object.fromEntries(rows), payment: raw.payment, accepted: raw.accepted, offeredAt: raw.offeredAt };
}
export function normalizeSupermarket(s) {
  const raw = s.supermarket ?? {}, sections = {};
  for (const id of Object.keys(SHOP_SECTIONS)) {
    const r = raw.sections?.[id]; if (stamp(r?.restoredAt)) sections[id] = { restoredAt: r.restoredAt, suppliedAt: stamp(r.suppliedAt) ? r.suppliedAt : null };
  }
  const serial = counter(raw.serial), memories = {}, read = [];
  for (const id of SHOP_MEMORY_IDS) if (stamp(raw.memories?.[id])) { memories[id] = raw.memories[id]; if (Array.isArray(raw.read) && raw.read.includes(id)) read.push(id); }
  return { version: 1, introducedAt: stamp(raw.introducedAt) ? raw.introducedAt : null, openedAt: stamp(raw.openedAt) ? raw.openedAt : null,
    sections, serial, request: validRequest(raw.request, serial, sections), completed: counter(raw.completed),
    nextAt: stamp(raw.nextAt) ? raw.nextAt : 0, memories, read };
}
export const supermarketHeld = s => { if (!s.supermarket?.request?.accepted) return {}; const r = normalizeSupermarket(s).request; return r?.accepted ? r.need : {}; };
export const unreadSupermarket = s => { const r = normalizeSupermarket(s); return Object.keys(r.memories).filter(id => !r.read.includes(id)).length; };
export function supermarketBuildReason(s) {
  if (s.level < SUPERMARKET.level) return 'The village supermarket opens at level 14';
  if (!workingCount(s, 'market') || !workingCount(s, 'school')) return 'Keep the market square and school working first';
  if (['bakery', 'juice_press', 'noodle_factory', 'dairy', 'cannery'].filter(kind => workingCount(s, kind)).length < 2) return 'Keep two different food factories working first';
  return null;
}
