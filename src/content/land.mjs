// One optional expansion, using the existing second-parcel price and limit. The same memory follows an older
// player's chosen second parcel; it never requires buying a third parcel or replacing a working farm.
export const LAND_BRANCH = {
  id: 'sunlit-clearing', preferredParcel: '1,2', title: 'Sunlit clearing',
  text: 'A sunny patch beyond the fence, with room for your next idea.',
  purpose: 'Room for beds, fruit trees or a quiet garden. You choose what grows here.',
  hint: 'Something small is tucked among the leaves near an old planting marker.',
  patch: { x: 1, z: 1, width: 4, depth: 4 },
  reward: { decor: 'bench', count: 1 },
  discovery: {
    id: 'planting-marker', title: 'A little sun in the soil',
    story: 'Under the leaves is an old planting marker with a little sun carved into it. Ada has kept a bench for this corner; it is now in your storage.',
    lines: [
      { who: 'ada', text: 'I grew marigolds beside my vegetables. There was always room for something cheerful.' },
      { who: 'pip', text: 'Can we leave a tiny seat for a beetle?' },
      { who: 'june', text: 'A little garden and room to grow, love. We can choose what goes here.' },
    ],
  },
};
