// What people say when you tap them (v0.3e), by time of day and age, after Willowmere's house talk (3d_farmer_fish_sell
// src/house-talk.mjs, itself after Zoo Garden's cottage chatter): kids' literal logic and big wonder, grown-ups' easy
// village talk. A few kid lines are Willowmere's own. people-view deals them like cards, so none repeats until most of
// its pool has been heard.
export const CHATTER = {
  morning: {
    kid: [
      'I woke up before the rooster. I won.',
      'Carrots help you see in the dark. I am trying it now.',
      'The dew makes my boots squeak. Listen!',
      'I counted the hens. Then they moved. Now I have to start again.',
      'Is it breakfast time? It feels like breakfast time.',
      'I saw a frog on the dock. He did not say good morning.',
      'When I grow up I want to be taller. That is my whole plan.',
      'The sun is up. That means I am allowed to be loud.',
    ],
    grown: [
      'Morning! The air smells of wet grass and bread.',
      'Early start today. The morning air is lovely.',
      'A good morning for planting, if you ask me.',
      'Mist on the pond. It will be a warm day.',
      'First cup of tea, then the world.',
      'Hollowbrook looks better every morning I wake up here.',
      'Did you hear the hens? They were up before all of us.',
      'The road is quiet. I like it quiet.',
    ],
  },
  day: {
    kid: [
      'Can we have a party? A small one? With pie?',
      'I found a stone shaped like a heart. It is for you. No, it is for me.',
      'Butterflies are just flowers that learned to fly.',
      'If I dig deep enough, will I find treasure? Or worms?',
      'I am helping. I am helping by watching.',
      'The fish in the pond have names. I gave them all the same one.',
      'My shadow is short today. It must be tired.',
      'I raced a hen. The hen won. I want a rematch.',
    ],
    grown: [
      'Busy day. Busy is good.',
      'Vegetables from our own beds taste twice as nice.',
      'The market truck went by. Business is picking up!',
      'You have a green thumb. Both of them, I think.',
      'I could sit by the pond all afternoon. I might.',
      'The village sounds alive again. Hammers, hens, children.',
      'Do not work too hard. The wheat grows either way.',
      'If you need a hand, just ask. I have two.',
    ],
  },
  evening: {
    kid: [
      'I am not tired. My eyes are just resting with the lights off.',
      'The first star is out. I wished for more pie.',
      'Fireflies are bugs with lamps. Lucky bugs.',
      'Can I stay up five more minutes? Four? Three?',
      'The pond is sleeping. Shh.',
      'I heard an owl. It asked who. I told it.',
      'My legs ran all day. Now they want soup.',
      'Tomorrow I will plant the biggest pumpkin in the world.',
    ],
    grown: [
      'A quiet evening. Exactly what I ordered.',
      'The lamps are lit. Hollowbrook looks like a postcard.',
      'Long day. Good day.',
      'Smell that? Someone is baking. I hope it is for me.',
      'The hens are in, the gate is shut. Time to rest.',
      'Sunset over the brook. Never gets old.',
      'Supper, then bed. The beds outside can wait till morning.',
      'Good night, farmer. Sleep well.',
    ],
  },
};
/** The part of the day at a given hour. */
export const partOfDay = hour => (hour >= 5 && hour < 11 ? 'morning' : hour >= 11 && hour < 17 ? 'day' : 'evening');

// Fallback reactions when an event has no story-specific Pip line. Kept here for translation and voice checks.
export const PIP_LINES = {
  firstHarvest: 'We did it! Our very first harvest!',
  harvested: ['I helped! Well, I watched.', 'Crunchy! Can we keep some?', 'The barn is getting full of good things.'],
  animalArrived: ['Welcome to the farm, new friend!'],
  collected: ['Fresh from the farm!'],
  familyArrived: ['New neighbours! I hope they have a kid my age.'],
  orderFilled: ['{person:ada:short} says a thank you is the best payment. Coins are nice too.'],
  levelUp: ['Level up! Does that mean I get a bigger room?'],
  projectDone: ['Hooray! Everyone come and look!'],
};
