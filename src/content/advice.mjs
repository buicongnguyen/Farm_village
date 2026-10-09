// Authored advice is language-neutral data. core/advice.mjs owns eligibility, priorities and persistence.
// Keys are stable save IDs. A card opens a preview; neither reading nor following it spends resources.
// Display-name parameters (good, ingredient, building) are localized with tParams() by the UI.
export const ADVICE_TOPICS = {
  'picnic-porch': {
    contexts: ['picnic/porch'], type: 'activity', person: 'june', icon: 'lucky_box',
    title: 'A quiet look by the porch',
    line: 'There is an old box beside the farmhouse bench, love. Shall we have a look together?',
    reason: 'The porch trail is ready after your first order. Looking inside is free, and the farm can wait.',
  },
  'picnic-pond': {
    contexts: ['picnic/pond'], type: 'activity', person: 'june', icon: 'pond',
    title: 'Follow the picnic note',
    line: 'That picnic note mentioned a tin by the pond, love. We could look beside the dock.',
    reason: 'The note leads to the tin beside the dock. Visit it and choose when to open it.',
  },
  'picnic-share': {
    contexts: ['picnic/share'], type: 'activity', person: 'june', icon: 'trail_picnic_ribbon',
    title: 'Bring the ribbon home',
    line: 'We found the ribbon, love. Let us show Ada and hear the rest of her picnic story.',
    reason: 'The ribbon is already found. Sharing it at the farmhouse is the last free step of this little trail.',
  },
  'clearing-inspect': {
    contexts: ['clearing/branch'], type: 'activity', person: 'june', icon: 'flowers',
    title: 'A small corner to uncover',
    line: 'Our new plot has an old planting marker under the leaves, love. Shall we take a closer look?',
    reason: 'You own this plot. Take a closer look at the planting marker whenever you like; uncovering it is free.',
  },
  'clearing-room': {
    contexts: ['clearing/branch'], type: 'opportunity', person: 'june', icon: 'tool:build',
    title: 'Room for another idea',
    line: 'The plot beside us is available for {cost} coins, love. We could plan a little garden there.',
    reason: 'This adjacent plot is affordable and unlocked. Its preview shows the space and price before you decide; keeping your current farm is fine too.',
  },
  'garden-lesson': {
    contexts: ['garden/lesson'], type: 'activity', person: 'june', icon: 'tool:build',
    title: 'A little repair to learn',
    line: 'Minh can show us how to mend the old potting bench, love. His lesson is free, and we can try again whenever we like.',
    reason: 'You have met Minh. Two practical questions teach Garden repairs; no coins, farm XP or project energy are spent on the lesson.',
  },
  'garden-work': {
    contexts: ['garden/uncover', 'garden/brace', 'garden/trays'], type: 'opportunity', person: 'june', icon: 'tool:build',
    title: 'The next small repair',
    line: 'We can do the next bit of the potting bench, love: {step}. It needs {cost} coins and {energy} project energy.',
    reason: 'The lesson is learned, and this step is affordable. The project page shows its costs before you confirm; each finished step stays saved.',
  },
  'garden-save': {
    contexts: ['garden/uncover', 'garden/brace', 'garden/trays'], type: 'blocker', person: 'june', icon: 'tool:build',
    title: 'The bench can wait a little',
    line: 'We need {short} more coins for the next bench step, love. We can keep farming or enjoy a free cast at the pond while we save.',
    reason: 'This step costs {cost} coins. No progress is lost by waiting, and ordinary farming and fishing do not use project energy.',
  },
  'garden-rest': {
    contexts: ['garden/rest'], type: 'blocker', person: 'june', icon: 'home',
    title: 'A free rest before repairing',
    line: 'A little rest at home will help with that bench, love. The other farm jobs are still there if we feel like doing them.',
    reason: 'The next step needs {energy} project energy. A free 30-second rest restores up to 60 points; energy also recovers while you are away.',
  },
  'school-baskets': {
    contexts: ['school/baskets'], type: 'activity', person: 'june', icon: 'school',
    title: 'A basket game at school',
    line: 'Cora has picture baskets to count, love. We can try a game together or carry on with the one we started.',
    reason: 'The school is open and Cora has arrived. This untimed game is free, uses no barn goods or energy, and saves an unfinished round.',
  },
  'pond-curiosity': {
    contexts: ['pond/curiosity'], type: 'activity', person: 'june', icon: 'pond',
    title: 'Another quiet cast',
    line: 'Shall we try the pond again, love? A familiar place can still hold a small surprise.',
    reason: 'An unbaited cast costs nothing. Take your time and see what turns up.',
  },
  'stone-space': {
    contexts: ['stone/owned'], type: 'activity', person: 'june', icon: 'tool:clear',
    title: 'What is under that stone?',
    line: 'There is another stone on our land, love. Moving it would make room to grow something, and we can see what is underneath.',
    reason: 'This stone is on land you own and costs {cost} coins to clear. Visit it and choose whether to make room for another bed.',
  },
  'street-repair': {
    contexts: ['road/village'], type: 'opportunity', person: 'june', icon: 'tool:build',
    title: 'An easier way through the village',
    line: 'We could mend Village Street for {cost} coins, love. It would make the way through a little nicer.',
    reason: 'The street is broken and no repair is underway. The repair preview shows its cost and short wait before you choose to begin.',
  },
  'street-save': {
    contexts: ['road/village'], type: 'blocker', person: 'june', icon: 'tool:build',
    title: 'A plan for Village Street',
    line: 'Village Street needs {cost} coins to mend, love. We are {short} short; a little farming or a free fishing trip can help us save.',
    reason: 'The street can wait without getting worse. Regular farm work stays available, and an unbaited cast at the pond costs nothing.',
  },
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
