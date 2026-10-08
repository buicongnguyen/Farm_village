// Authored advice is language-neutral data. core/advice.mjs owns eligibility, priorities and persistence.
// Keys are stable save IDs. A card opens a preview; neither reading nor following it spends resources.
// Display-name parameters (good, ingredient, building) are localized with tParams() by the UI.
export const ADVICE_TOPICS = {
  'order-ready': {
    type: 'opportunity', person: 'june', icon: 'ui:orders',
    title: 'An order we can finish',
    line: 'We have everything for this order, love. Shall we send it?',
    reason: 'The available goods cover this order. Delivery pays {coins} coins; opening the order board does not deliver it.',
  },
  'order-make': {
    type: 'opportunity', person: 'june', icon: 'bakery',
    title: 'A useful next batch',
    line: 'This order needs {good}, love. We have what we need to start the next batch.',
    reason: 'The recipe is unlocked, the ingredients are available, and a working maker has room in its queue.',
  },
  'order-bread-surplus': {
    type: 'opportunity', person: 'june', icon: 'corn_bread',
    title: 'Something different for the oven',
    line: 'We have bread ready or on the way, love. This order needs {good}. Shall we change the next batch?',
    reason: 'Bread in stock and in production exceeds current project and order needs. This request needs a different product, and its next batch can be started now.',
  },
  'order-ingredient': {
    type: 'blocker', person: 'june', icon: 'ui:barn',
    title: 'An ingredient to look for',
    line: 'We still need {ingredient} for {good}, love. Let us check where it comes from.',
    reason: 'This recipe is missing an ingredient. Its source may need repairs or another unlock; the order can wait.',
  },
  'order-gather': {
    type: 'blocker', person: 'june', icon: 'ui:barn',
    title: 'Goods to gather first',
    line: 'This request still needs {good}, love. Let us look at what we can gather.',
    reason: 'The requested goods are not yet available beyond current project needs. Check their source before planning delivery.',
  },
  'order-queued': {
    type: 'opportunity', person: 'june', icon: 'bakery',
    title: 'That batch is on its way',
    line: 'The {good} for this request is already in the queue, love. Let us check that batch before we make more.',
    reason: 'The missing product is already queued. Check the batch and barn space before making more.',
  },
  'order-collect': {
    type: 'opportunity', person: 'june', icon: 'tool:harvest',
    title: 'Ready to collect for an order',
    line: 'The {good} is ready, love. Let us collect it and take another look at the order.',
    reason: 'Finished output can help with a current request. Collecting it puts the goods in the barn; delivery is a separate choice.',
  },
  'order-unlock': {
    type: 'blocker', person: 'june', icon: 'ui:xp',
    title: 'A recipe for later',
    line: 'The recipe for {good} opens at level {level}, love. We can leave this request for later.',
    reason: 'This recipe is not unlocked yet. Choose another order or activity while the farm grows.',
  },
  'maker-broken': {
    type: 'blocker', person: 'june', icon: 'tool:build',
    title: 'Check the repairs first',
    line: 'The {building} needs attention before we can make {good}, love. Let us check how the repairs are going.',
    reason: 'The maker for this request is out of use or still being repaired. Check its requirements and progress before planning another batch.',
  },
  'maker-missing': {
    type: 'blocker', person: 'june', icon: 'tool:build',
    title: 'A place to make it',
    line: 'We need a {building} to make {good}, love. Let us check how to bring one back.',
    reason: 'There is no maker for this product on the farm. Check stored buildings and construction requirements before deciding what to place.',
  },
  'stand-empty': {
    type: 'opportunity', person: 'june', icon: 'fruit_stand',
    title: 'Fruit for the empty stand',
    line: 'Our fruit stand is empty, love, and we have spare {good}. Shall we choose a basket for it?',
    reason: 'The stand is working, and some fruit remains beyond current project and order needs. Check the displayed batch size against those needs before listing it.',
  },
  'stand-collect': {
    type: 'opportunity', person: 'june', icon: 'ui:coin',
    title: 'A little income to collect',
    line: 'The fruit stand has earned {coins} coins, love. They are there whenever we want to collect them.',
    reason: 'These are completed sales waiting to be collected. Opening the stand does not collect or spend the coins.',
  },
  'stand-invest': {
    type: 'opportunity', person: 'june', icon: 'fruit_stand',
    title: 'An option for our spare fruit',
    line: 'A fruit stand could earn a little more from our spare {good}, love. Shall we look at the cost?',
    reason: 'The stand costs {cost} coins. Each {good} earns {extra} coins more than a direct barn sale, covering that cost after {sales} sales. This assumes steady stocking and excludes orchard costs and other selling options.',
  },
  'queue-full': {
    type: 'opportunity', person: 'june', icon: 'bakery',
    title: 'Room for another batch',
    line: 'The {building} queue is full, love. Another slot costs {cost} coins if we want to line up more work.',
    reason: 'An extra tray makes another batch at the same time. You can also wait and collect a finished batch to free its tray.',
  },
  'fishing-break': {
    type: 'activity', person: 'pip', icon: 'pond',
    title: 'A little time by the pond',
    line: 'Can we go fishing? I want to see what comes up this time!',
    reason: 'The pond is open for a new cast. Bait is optional, and the other jobs can wait.',
  },
  'first-bread': {
    type: 'celebration', person: 'ada', icon: 'bread',
    title: 'Our first loaf from the oven',
    line: 'Your first loaf from the oven, dear! Ellis always claimed the end piece. Shall we save it for him?',
    reason: 'You collected the first bread made on this farm. A small beginning worth remembering.',
  },
  'school-open': {
    type: 'celebration', person: 'cora', icon: 'school',
    title: 'A classroom full of possibility',
    line: 'A bell and a classroom, all ready again. Thank you. Now the children have a school to come to.',
    reason: 'You reopened the school and gave Hollowbrook a place for its children to learn again. A day to remember.',
  },
  'clinic-open': {
    type: 'celebration', person: 'hazel', icon: 'clinic',
    title: 'Care close to home',
    line: 'A clinic in Hollowbrook again. You have given us somewhere to care for one another.',
    reason: 'Four families came home, and you reopened the clinic. That day began a new chapter of village life.',
  },
};

export const adviceTopicOf = id => Object.hasOwn(ADVICE_TOPICS, id) ? ADVICE_TOPICS[id] : null;
