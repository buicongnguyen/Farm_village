// The first classroom game is optional, untimed, and independent of farm goods and money.
export const SCHOOL_ACTIVITY = {
  title: 'Cora’s basket game',
  goods: ['carrot', 'apple', 'corn', 'pumpkin', 'cherry', 'orange'],
  difficulties: { simple: 'A little counting', challenge: 'A basket challenge' },
  questions: {
    count: { text: 'Count the pictures. How many altogether?', hint: 'Touch each picture with your finger and count once for each one.' },
    match: { text: 'How many match this picture?', hint: 'Look for the matching pictures. Let the other pictures rest.' },
    add: { text: 'Two baskets together: how many pieces?', hint: 'Count the first basket, then keep counting through the second.' },
    fill: { text: 'The basket needs {total} pieces. How many more will fill it?', hint: 'Count the pictures, then count up to {total}.' },
    groups: { text: 'Each basket has {each} pieces. How many are in {groups} baskets?', hint: 'Count one basket at a time, keeping your count as you move to the next.' },
  },
};

export const SCHOOL_MEMORY = {
  id: 'basket-game', title: 'A drawing for the classroom',
  lines: [
    { who: 'cora', text: 'Three baskets, three ways to count. There is room on the classroom wall for a picture of this.' },
    { who: 'pip', text: 'I drew a carrot with a hat! It gets its own basket.' },
    { who: 'june', text: 'A very important carrot, love. Let’s keep this little afternoon in our album.' },
  ],
};
