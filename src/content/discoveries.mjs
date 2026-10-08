// Four authored introductory finds. Each pays once per save; together they add at most 110 coins.
// The pond keepsake is a local memory, not evidence that advances Ellis's letters or the river mystery.
export const DISCOVERIES = [
  { id: 'pond-tin', title: 'A little tin from the pond', coins: 20, icon: 'ui:coin', person: 'pip',
    text: 'On your second catch, a little tin comes up beside the fish. There are twenty coins tucked inside.',
    line: 'A fish and a tiny treasure! Can we keep the tin for our good finds?',
    trigger: { kind: 'catch', at: 2 } },
  { id: 'pond-keepsake', title: 'The fish on the button', coins: 40, icon: 'perch', person: 'june',
    text: 'Your tenth catch brings up a cloth pouch with forty coins and a brass button shaped like a fish. A tiny pond is engraved on its back: a keepsake of someone who loved this spot.',
    line: 'Someone liked sitting by this pond as much as we do, love. Let us keep their little fish in our album.',
    trigger: { kind: 'catch', at: 10 } },
  { id: 'stone-keepsake', title: 'A keepsake beneath a stone', coins: 30, icon: 'tool:clear', person: 'june',
    text: 'As you lift a rock from your land, you find a small box with thirty coins and a smooth pebble wrapped in cloth.',
    line: 'Someone kept a little piece of this place, love. Now there is room for something of ours to grow here.',
    trigger: { kind: 'rocks', at: 2 } },
  { id: 'street-thanks', title: 'A thank-you for Village Street', coins: 20, icon: 'ui:coin', person: 'gus',
    text: 'Village Street is restored. Gus leaves twenty coins by your gate with a short note thanking you for making the way easier for everyone.',
    line: 'The cart rolled right through. Did not lose a single loaf. Good work, that.',
    trigger: { kind: 'restoration', id: 'road_south' } },
];

export const discoveryOf = id => DISCOVERIES.find(d => d.id === id) ?? null;
