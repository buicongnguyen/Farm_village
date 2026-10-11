// Existing Hollowbrook services placed in the user's original Willowmere civic rooms.
export const CIVIC_INTERIORS = {
  hospital: { kind: 'clinic', name: 'Clinic', objects: {
    hospital_reception: { label: 'Reception', role: 'reception', stand: [7.4, 3], panel: 'clinic', siteArg: true },
    hospital_pharmacy: { label: 'Medicine cabinet', role: 'pharmacy', stand: [7.6, -3], text: 'Neatly labelled jars, fresh towels and a little pot of flowers. Everything is ready for the next neighbour.' },
    hospital_magazines: { label: 'Waiting-room magazines', role: 'mags', stand: [-6, 3.6], text: 'The gardening magazine opens at a page about enormous carrots. Someone has drawn a tiny crown on the biggest one.' },
  } },
  police: { kind: 'police', name: 'Police post', objects: {
    police_desk: { label: 'Front desk', role: 'desk', stand: [-5.5, 2.8], panel: 'villageGrowth' },
    police_found: { label: 'Lost and found', role: 'found', stand: [-8.6, 5.8], text: 'A mitten, a little watering can and three mismatched buttons. Every found thing is waiting to go home.' },
    police_notice: { label: 'Notice board', role: 'notice', stand: [6.7, -3.6], text: 'A cheerful reminder: close the garden gate. The goats have already read it, and remain unconvinced.' },
  } },
  company: { kind: 'company', name: 'Company office', objects: {
    company_hiring: { label: 'Hiring board', role: 'board', stand: [-8.3, 2.6], panel: 'villageGrowth' },
    company_requests: { label: 'Company request', role: 'shift', stand: [6.9, 5.8], panel: 'villageGrowth' },
    company_meeting: { label: 'Meeting room', role: 'meeting', stand: [-.9, -3.3], text: 'The next meeting has two plans: send good food to our neighbours, and leave enough time for tea.' },
  } },
  school: { kind: 'school', name: 'Village school', objects: {
    school_lesson: { label: 'Classroom blackboard', role: 'board', stand: [-6, -6.3], panel: 'schoolActivity' },
    school_art: { label: 'Art corner', role: 'easel', stand: [1.8, -3], text: 'Someone has painted a purple cow beside a golden carrot. There is room on the wall for every kind of imagination.' },
    school_library: { label: 'School library', role: 'books', stand: [7.6, -3.6], text: 'A bookmark peeks out of a story about a seed travelling down the brook. Tomorrow, another page.' },
  } },
  barn: { kind: 'barn', name: 'Barn', objects: {
    barn_store: { label: 'Feed and stores', role: 'feed', stand: [1.2, -3.6], panel: 'barn' },
    barn_hay: { label: 'Hay corner', role: 'hay', stand: [-7.6, 4], text: 'Warm wood, tidy hay and a little patch of sunlight. A feather marks the spot where a hen took her afternoon nap.' },
    barn_tools: { label: 'Tool bench', role: 'tools', stand: [2, -3.9], panel: 'learning' },
  } },
  bakery: { kind: 'bakery', name: 'Bakery', objects: {
    bakery_oven: { label: 'Bakery oven', role: 'oven', stand: [-6, -5.2], panel: 'production', siteArg: true },
    bakery_pantry: { label: 'Baking pantry', role: 'pantry', stand: [1.4, -5.6], panel: 'barn' },
    bakery_bread: { label: 'Bread shelves', role: 'bread', stand: [-6.3, 2], text: 'The shelves smell of warm bread. The little chalk sign says: made here, shared here.' },
  } },
  // Prepared reference room; no world entry until the supermarket story and shop rules are implemented.
  supermarket: { available: false, kind: 'supermarket', name: 'Village supermarket', objects: {
    supermarket_checkout: { label: 'Checkout', role: 'checkout', stand: [5.6, 3.2], text: 'A place for our village harvest. The shopkeeper is planning the first shelves.' },
    supermarket_fresh: { label: 'Fresh produce', role: 'bins', stand: [0, -3.5], text: 'Little baskets for colourful vegetables, with space for the name of the farm that grew them.' },
    supermarket_sample: { label: 'Tasting table', role: 'sample', stand: [1.6, 3.5], text: 'A tiny taste can start a big conversation. What shall we make for the neighbours next?' },
  } },
};
export const facilityKind = (s, id) => id === 'barn' ? 'barn' : Object.keys(CIVIC_INTERIORS).find(k => CIVIC_INTERIORS[k].available !== false && CIVIC_INTERIORS[k].kind === s.placed[id]?.kind) ?? null;
