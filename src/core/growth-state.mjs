// Pure save shapes and bounded ledgers; never imports rules that depend on state.
import { COMPANY_BRANDS, BULK_REQUESTS } from '../content/village-growth.mjs';
import { FAMILIES } from '../content/people.mjs';

export const record = v => v && typeof v === 'object' && !Array.isArray(v) ? v : {};
export const stamp = v => Number.isSafeInteger(v) && v >= 0;
const count = v => stamp(v) ? v : 0;
export const owns = (o, k) => typeof k === 'string' && Object.hasOwn(o, k);
export const fleet = s => s.truck ? [s.truck, ...(Array.isArray(s.truck.fleet) ? s.truck.fleet : [])] : [];
export const requestAt = sequence => BULK_REQUESTS[(sequence - 1) % BULK_REQUESTS.length];
export const validTag = tag => tag && stamp(tag.sequence) && tag.sequence > 0 && stamp(tag.at)
  && requestAt(tag.sequence)?.id === tag.id && owns(COMPANY_BRANDS, tag.brand) && typeof tag.police === 'boolean';
export const matchingCargo = u => validTag(u.companyDelivery) && Array.isArray(u.load)
  && u.load.length === Object.keys(requestAt(u.companyDelivery.sequence).need).length
  && Object.entries(requestAt(u.companyDelivery.sequence).need).every(([good, n]) => u.load.filter(row => row.good === good && row.n === n).length === 1);
const key = id => `growth:${id}`;
export const saveStamp = (s, id, at) => { s.firsts = { ...record(s.firsts), [key(id)]: at }; };
export const newGrowth = () => ({ hospitalAt: null, brand: 'brook', staff: { worker: null, manager: null },
  sent: 0, returned: 0, settled: 0, memories: {}, read: [] });

/** Pure bounded migration. Missing cargo retires its sequence; it never recreates goods or a payment. */
export function normalizeGrowth(s) {
  const raw = record(s.growth), first = record(s.firsts), staff = record(raw.staff), memories = {};
  const hospitalAt = stamp(raw.hospitalAt) ? raw.hospitalAt : stamp(first[key('hospital')]) ? first[key('hospital')] : null;
  for (const request of BULK_REQUESTS) {
    const at = raw.memories?.[request.id] ?? first[key(`memory:${request.id}`)];
    if (stamp(at)) memories[request.id] = at;
    else if (stamp(first[key(`memory:${request.id}`)])) memories[request.id] = first[key(`memory:${request.id}`)];
  }
  const tags = fleet(s).map(u => u.companyDelivery).filter(validTag);
  const sent = Math.max(count(raw.sent), count(first[key('sent')]), ...tags.map(t => t.sequence));
  const returned = Math.min(sent, Math.max(count(raw.returned), count(first[key('returned')])));
  const pending = fleet(s).some(u => validTag(u.companyDelivery) && u.companyDelivery.sequence === sent
    && (returned >= sent ? Number.isFinite(u.coins) && u.coins > 0 : u.away === true && matchingCargo(u)));
  const settled = Math.min(sent, Math.max(count(raw.settled), count(first[key('settled')]), pending ? 0 : sent));
  const adults = new Set(FAMILIES.flatMap(f => f.people.filter(p => !p.kid).map(p => p.id)));
  const role = r => adults.has(staff[r]?.person) && (r === 'manager' || typeof staff[r]?.building === 'string')
    ? { person: staff[r].person, ...(r === 'worker' ? { building: staff[r].building } : {}) } : null;
  const worker = role('worker'), manager = role('manager');
  return { hospitalAt, brand: owns(COMPANY_BRANDS, raw.brand) ? raw.brand : 'brook',
    staff: { worker, manager: manager?.person === worker?.person ? null : manager }, sent, returned, settled, memories,
    read: [...(hospitalAt !== null ? ['hospital'] : []), ...Object.keys(memories)].filter(id => Array.isArray(raw.read) && raw.read.includes(id)) };
}

