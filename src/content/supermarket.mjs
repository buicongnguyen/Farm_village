// Optional village shop: saved, explicit baskets; never a multiplier on other sales.
export const SUPERMARKET = { level: 14, cost: 4200, sectionCost: 120, waitMs: 30 * 60_000, units: 8, premium: 1.25 };
export const SHOP_SECTIONS = {
  garden: { name: 'Garden shelves', goods: ['carrot', 'corn', 'pumpkin', 'wheat', 'apple', 'orange', 'strawberry', 'coconut', 'herb', 'ginseng'] },
  bakery: { name: 'Bakery shelves', goods: ['bread', 'corn_bread', 'apple_juice', 'carrot_juice', 'orange_juice', 'noodles', 'carrot_cake', 'apple_pie', 'butter', 'cheese'] },
  pond: { name: 'Pond shelves', goods: ['perch', 'carp', 'catfish'] },
};
export const SHOP_MEMORY_IDS = ['opening', 'variety', 'thankyou'];
