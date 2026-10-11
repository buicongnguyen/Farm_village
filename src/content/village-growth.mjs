// Optional civic growth. Existing goods keep their identity; a brand is only the delivery label.
export const GROWTH = {
  hospital: { level: 10, coins: 1800, need: { herb: 6, ginseng: 2 } },
  police: { level: 12, coins: 2200 }, company: { level: 15, coins: 3000, factories: 2 },
  hiring: { worker: 120, manager: 180 }, workerFactor: 0.9,
};
export const COMPANY_BRANDS = { brook: 'Brook Basket', sunshine: 'Sunshine Pantry', clover: 'Clover Kitchen' };
export const BULK_REQUESTS = [
  { id: 'pantry', title: 'A pantry for the next town', need: { carrot_juice: 6, noodles: 8 }, coins: 600,
    text: 'Pack the familiar bottles and noodles under your own village brand.',
    memory: [{ who: 'lan', text: 'Our noodles have a label now! There is still a little flour on mine.' },
      { who: 'minh', text: 'A straight shelf, a sturdy box, and room for another good idea.' },
      { who: 'pip', text: 'Can our next box have a drawing of a carrot?' }] },
  { id: 'care', title: 'The hospital pantry', need: { herb: 6, ginseng: 2, carrot_juice: 4 }, coins: 930, hospital: true,
    text: 'The hospital orders supplies for its pantry and garden. There is no deadline.',
    memory: [{ who: 'hazel', text: 'The pantry is ready, and the garden has room to grow. Thank you, dear.' },
      { who: 'marisol', text: 'Everything on this little list has a place. Even the empty baskets.' },
      { who: 'pip', text: 'I can stack the baskets. The small one goes on top!' }] },
  { id: 'lunch', title: 'Lunch for the makers', need: { instant_noodles: 8, orange_juice: 4 }, coins: 1560,
    text: 'A shared lunch for the people making useful things in the next town.',
    memory: [{ who: 'lan', text: 'Eight noodle cups and four bottles. A cheerful table is waiting for them.' },
      { who: 'minh', text: 'Good work deserves a proper lunch. And a chair that does not wobble.' },
      { who: 'pip', text: 'I drew a tiny chair on the box. That should help!' }] },
];
export const HOSPITAL_MEMORY = {
  title: 'A little more room to care',
  lines: [{ who: 'hazel', text: 'The clinic has grown into our little hospital. There is room for everyone to sit.' },
    { who: 'marisol', text: 'New shelves, a quiet corner, and a shorter list. That is a lovely morning.' },
    { who: 'pip', text: 'I saved the chair by the window for the next visitor!' }],
};
