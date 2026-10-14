// The people you meet inside the village buildings. Each stands on open floor, turns to you, says hello and asks one
// dry question about the building's trade and about what you have actually done on the farm ({harvested}, {orders},
// {coins}… are filled from your own numbers by ui/explore-mode.mjs). No rewards and nothing saved: it is company, not a
// task. Humour rule (docs/DIALOGUE-AND-VILLAGE-NEWS.md): observation and understatement, never a pun, never at the
// player's expense. Loaded with Explore, so none of this is in the first download.
// at: where they would like to stand (metres in the room); the room finds the nearest free spot with space to walk up.
export const ROOM_PEOPLE = {
  police: [{ id: 'officer', role: 'Officer', body: 'man', kit: 'dz_navy', top: '#2f4f9a', bottom: '#1f2d55', at: [-3.4, 3.4],
    hello: ['Quiet day. The most serious case this week was a goose with opinions.', 'Nothing to report. I wrote that down, so now there is something to report.'],
    asks: [
      { q: 'For the record: {harvested} crops have left your fields. Do you know where every one of them went?',
        a: [['Sold, every one', 'A paper trail. I could weep. Most people here just say “the goats”.'], ['Mostly into me', 'Eating the evidence. I will note it down as quality control.']] },
      { q: 'You have cleared {cleared} patches of scrub. Was all of it, strictly speaking, yours to clear?',
        a: [['It was in my way', 'That is also what the brook said about the old bridge. Carry on.'], ['I have the deed', 'Nobody has ever answered that with paperwork before. I need to sit down.']] }] }],
  hospital: [{ id: 'nurse', role: 'Nurse', body: 'woman', top: '#f5f7fb', bottom: '#6fb6c9', at: [5.4, 3.6],
    hello: ['Come in. Nobody is ill. The village mostly visits for the chairs.', 'Good, you are upright. That already puts you ahead of the scarecrow.'],
    asks: [
      { q: 'A professional question: you have farmed for about {hours} hours. When did you last drink a glass of water?',
        a: [['Just now', 'A suspiciously fast answer. I will believe you, medically.'], ['What day is it?', 'As I thought. One glass of water, then you may return to your carrots.']] },
      { q: 'You have carried {harvested} harvests by hand. How is your back?',
        a: [['Fine', 'Farmers always say fine. The scarecrow says fine too, and look at his posture.'], ['It has opinions', 'Good. A back that complains is a back that is still talking to you.']] }] }],
  company: [{ id: 'clerk', role: 'Office clerk', body: 'man', top: '#e9e4d8', bottom: '#4a5568', at: [4.4, 5.8],
    hello: ['Welcome to the office. At three we have a meeting about having fewer meetings.', 'Do sit anywhere. The chairs are the only thing here without a deadline.'],
    asks: [
      { q: 'Our records say you have earned {coins} coins. Do you keep a ledger, or do you just remember?',
        a: [['I remember', 'Remarkable. We employ four people to forget things more slowly.'], ['The barn is my ledger', 'Rows of hay, columns of posts. Honestly, it is better kept than ours.']] },
      { q: 'You have filled {orders} orders without one status meeting. How?',
        a: [['I just did them', 'Please do not say that near the manager. It would undo years of process.'], ['The hens brief me at dawn', 'Daily, standing up, and very loud. Yes, that counts as a meeting.']] }] }],
  school: [{ id: 'teacher', role: 'Teacher', body: 'woman', hat: 'hat_graduate', top: '#7a4fa3', bottom: '#3a3f55', at: [-2.2, 3.2],
    hello: ['Ah, the farmer. The children think you invented carrots. I have stopped correcting them.', 'Welcome. We are between lessons, which is when most of the learning happens.'],
    asks: [
      { q: 'Arithmetic, quickly: a flock of {hens}, an egg each a day, less the ones you drop. How many eggs?',
        a: [['All of them. I never drop any', 'Confidence without evidence. You would do well in my Monday class.'], ['It depends on the stairs', 'A sum with honesty in it. Full marks.']] },
      { q: 'The class asked why you plant in rows. I said “geometry”. Was I right?',
        a: [['Yes, geometry', 'Thank you. I will not mention that I guessed.'], ['So I can find things', 'Practical. I shall call it geometry in the service of not losing a turnip.']] }] },
    { id: 'pupil', role: 'Pupil', body: 'kid', kit: 'armor_hoodie', top: '#f08a2a', bottom: '#2f4f8a', at: [3.2, 4.6],
      hello: ['I am not skipping class. I am doing independent research on this corridor.', 'Shh. If I stand very still the bell cannot see me.'],
      asks: [
        { q: 'Is it true you have caught {fish} kinds of fish? Do they know each other?',
          a: [['They are old friends', 'I knew it. Fish have a whole society and nobody tells us.'], ['They pretend not to', 'Like my brother at school. That makes sense.']] },
        { q: 'If a hen lays an egg on a hill, who owns the egg at the bottom?',
          a: [['Whoever catches it', 'That is what I said! Teacher called it “not how law works”.'], ['The hen, always', 'Even if it rolls into the next farm? You are very strict.']] }] }],
  barn: [{ id: 'farmhand', role: 'Farmhand', body: 'man', hat: 'hat_straw', kit: 'armor_leaf', top: '#4f9a4a', bottom: '#8a5a2c', at: [-3, 2.4],
    hello: ['Mind the hay. It was tidy once, for almost an hour.', 'Morning. Or afternoon. In here it is always roughly hay o’clock.'],
    asks: [
      { q: 'You have made {produced} things in the workshops. Do you ever just sit on a bale and look at nothing?',
        a: [['Every evening', 'Good. Looking at nothing is the one crop that never fails.'], ['There is no time', 'The hay disagrees. It has done nothing for weeks and look how well it turned out.']] },
      { q: 'The cows watched you rearrange this barn. Would you like their review?',
        a: [['Go on', 'Three out of five. They preferred the old corner. Cows are conservative about corners.'], ['I fear it', 'Wise. They are still discussing it.']] }] }],
  bakery: [{ id: 'helper', role: 'Baker’s helper', body: 'woman', hat: 'hat_chef', kit: 'armor_chef', top: '#fff4e2', bottom: '#b98a4e', at: [-3.6, 2.8],
    hello: ['Careful, it is warm in here. The oven and I have an understanding: it burns things and I apologise.', 'You are just in time. For what, I cannot say. Something is always nearly ready.'],
    asks: [
      { q: 'Bread is flour, water and waiting. Which of the three do you find hardest?',
        a: [['The waiting', 'Everyone says that, standing right beside the timer and staring at it.'], ['The flour gets everywhere', 'It does. I found some in a book I have not opened since spring.']] },
      { q: 'You have picked {picked} fruits. Truthfully, how many reached a pie?',
        a: [['All of them', 'Then you have more self-control than anyone who has ever worked here.'], ['A tax was collected', 'The picker’s tax. Ancient, fair and delicious.']] }] }],
  supermarket: [{ id: 'keeper', role: 'Shopkeeper', body: 'woman', top: '#e0496b', bottom: '#3a6b4a', at: [3.4, 3.8],
    hello: ['Welcome! Everything on the shelves is local. So local that some of it is yours.', 'Do look around. The baskets are free. It is the filling of them that costs.'],
    asks: [
      { q: 'People ask who grows the vegetables. May I point at you?',
        a: [['Point away', 'Splendid. I will use the whole hand. It looks more respectful.'], ['Say “a mystery farmer”', 'Mystery sells. I will not even charge extra for the intrigue.']] },
      { q: 'A customer asked for a carrot “like the ones in the pictures”. Do yours pose?',
        a: [['Only the best ones', 'I thought so. The bent ones have more character, but they refuse to be photographed.'], ['They are shy', 'Root vegetables. A whole life spent hiding, and then we expect stage presence.']] }] },
    { id: 'customer', role: 'Customer', body: 'man', top: '#6b8f3a', bottom: '#5a3a2a', at: [-3, -1.6],
      hello: ['I came in for one onion. That was forty minutes ago.', 'Do not mind me. I am comparing two identical jars.'],
      asks: [
        { q: 'They say you are level {level}. Is there a level at which you finally know what is for dinner?',
          a: [['No', 'I feared as much. I shall keep circling the shelves, then.'], ['Level one: soup', 'Soup. Of course. It was soup all along.']] },
        { q: 'Do you ever buy back your own vegetables by accident?',
          a: [['Twice', 'And were they good? Be honest. You cannot sue yourself.'], ['I recognise them', 'By face? That is either devotion or a very small farm.']] }] }],
  feed_mill: [{ id: 'miller', role: 'Miller', body: 'man', hat: 'hat_leather', kit: 'armor_leather', top: '#c9a35a', bottom: '#5a4630', at: [-2.8, 1],
    hello: ['Shout if you need me. The mill hears everything twice and understands none of it.', 'Dusty in here. We call it atmosphere and charge nothing for it.'],
    asks: [
      { q: 'I hear your hens have opinions about my feed. Favourable?',
        a: [['They eat all of it', 'The highest review a hen can give. The second highest is not pecking me.'], ['They asked for seasoning', 'Critics. Next they will want it served warm.']] },
      { q: 'One sack lasts ten collections now. Do the animals know they are being efficient?',
        a: [['Do not tell them', 'My lips are sealed. A cow who learns the word “efficient” asks for a raise.'], ['They insisted on it', 'Organised hens. I always suspected.']] }] }],
  dairy: [{ id: 'dairyhand', role: 'Dairy hand', body: 'woman', top: '#8fd0e8', bottom: '#f5f7fb', at: [-3.4, 1.4],
    hello: ['Hello! Quietly, please. The cheese is at a delicate age.', 'Come in. Everything here is either cooling or thinking about it.'],
    asks: [
      { q: 'Butter is only milk that was bothered for long enough. Do you agree?',
        a: [['Completely', 'Good. It explains why Mondays are so productive here.'], ['That seems unkind to butter', 'Butter does not mind. It came out better for it, unlike most of us.']] },
      { q: 'With the herd grazing your fields, do you ever feel the cows are managing you?',
        a: [['Sometimes', 'They are. You bring the food and open the gates, and they keep the schedule.'], ['I am in charge', 'Of course you are. The cows asked me to tell you that.']] }] }],
};
/** The room with its people in it: each gets a free place to stand, a collider and a spot in front to walk up to.
 *  `clear(room, [x, z])` and `route(room, from, to)` are core/explore-navigation's (passed in: this file is pure data). */
export function withPeople(data, kind, clear, route) {
  const list = ROOM_PEOPLE[kind]; if (!list) return data;
  const entry = [data.entry.position[0], data.entry.position[2]], taken = [entry, ...data.interactions.map(o => [o.stand[0], o.stand[2]])], people = [];
  const body = p => clear(data, p) && [[.4, 0], [-.4, 0], [0, .4], [0, -.4]].every(d => clear(data, [p[0] + d[0], p[1] + d[1]]));
  for (const who of list) {
    let found = null;
    for (let r = 0; r <= 4 && !found; r += .4) for (let k = 0; k < (r ? 12 : 1) && !found; k++) {
      const p = [who.at[0] + Math.cos(k * Math.PI / 6) * r, who.at[1] + Math.sin(k * Math.PI / 6) * r];
      if (!body(p) || taken.some(q => Math.hypot(p[0] - q[0], p[1] - q[1]) < 1.5)) continue;
      const toDoor = Math.atan2(entry[1] - p[1], entry[0] - p[0]);
      for (const turn of [0, .6, -.6, 1.2, -1.2, 2, -2, Math.PI]) {
        const stand = [p[0] + Math.cos(toDoor + turn) * 1.05, p[1] + Math.sin(toDoor + turn) * 1.05];
        if (clear(data, stand) && route(data, entry, stand).length) { found = { p, stand }; break; }
      }
    }
    if (!found) continue;
    taken.push(found.p, found.stand); people.push({ ...who, position: found.p, stand: found.stand });
  }
  return { ...data, people,
    colliders: [...data.colliders, ...people.map(w => ({ id: `person_${w.id}`, min: [w.position[0] - .28, w.position[1] - .28], max: [w.position[0] + .28, w.position[1] + .28] }))],
    interactions: [...data.interactions.slice(0, -1), ...people.map(w => ({ id: `person_${w.id}`, stand: [w.stand[0], 0, w.stand[1]], focus: [w.position[0], 1.9, w.position[1]] })), data.interactions.at(-1)] };
}
/** Your own numbers, for the questions. */
export function talkNumbers(s, fishKinds) {
  const st = s.stats ?? {}, hens = Object.values(s.animals ?? {}).flat().filter(a => a.kind === 'hen').length;
  return { harvested: st.harvested ?? 0, produced: st.produced ?? 0, orders: st.ordersFilled ?? 0, coins: st.coinsEarned ?? 0, picked: st.picked ?? 0, cleared: st.cleared ?? 0,
    level: s.level ?? 1, hens, fish: fishKinds, hours: Math.max(0, Math.floor((st.playMs ?? 0) / 3_600_000)) };
}

/** Keep a conversation on the question the player actually saw, with honest numbers and no invented history. */
export function roomConversation(person, s, fishKinds, turn) {
  const nums = talkNumbers(s, fishKinds);
  const asks = person.asks.filter(a => [...a.q.matchAll(/\{(\w+)\}/g)].every(([, key]) => nums[key] >= (key === 'hours' ? 2 : 1)));
  return { nums, hello: person.hello[turn % person.hello.length], ask: asks.length ? asks[turn % asks.length] : null };
}
