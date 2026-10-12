const crypto = require('crypto');

const pick = list => list[crypto.randomInt(list.length)];

const GENERAL = [
  'Mind the candle wax. It drips on the felt.',
  'You should have seen this hall before the war. You should have seen me, come to that.',
  'Shout if the dice roll under the table.',
  'I keep the good brandy for winners. It keeps them at the table.',
  'The Jarl’s cousin once lost his boots at that very seat.',
  'Fifty years I have kept tables, and the dice still surprise me.',
  'Talos smile on you. Or at least the dealer.',
  'Hjalmar swears the dice love him. The dice have never met him.',
  'Another log on the fire, I think. The Jeralls lean close tonight.',
  'A bard offered to sing for his stake once. I paid him to stop.',
  'Drink slow, bet slower.',
  'The felt remembers every septim. So do I.',
  'My grandmother dealt cards for Tiber Septim. So she said, anyway.',
  'If your luck runs dry, the mead never does.',
  'Every table is swept and every die is weighed. By me.',
  'The chair by the fire is for whoever earned it. Tonight that is nobody.',
  'A Khajiit caravan once played through a blizzard here. Fine guests. Terrible singers.',
  'I water nothing but the plants. House rule.',
  'If the cat sits by your chair, that is a good sign. We have no cat.',
  'The rail is oak from Falkreath. It has outlasted four stools and one marriage.',
  'My ledger balances every night. One way or another.',
  'The crier works for bread and gossip. Mostly gossip.',
  'That stain on the ceiling? Ask Hjalmar. Better yet, don’t.',
  'Keep your boots off the felt and your elbows off the shoe.',
  'I remember every face that walks in. The names take a second visit.'
];

const WEATHER = [
  'Snow on the pass again. Good night to stay in.',
  'Wind’s up off the Jeralls. Hear it in the shutters?',
  'They say wolves came down near the north road. The fire is better company.',
  'Cold enough to crack a cartwheel out there.',
  'The pass was clear this morning. It never stays that way.',
  'Frost on the inside of the glass tonight. Keep your cup full.',
  'Thunder over the Jeralls. The old folk call it Kyne clearing her throat.',
  'A merchant came in with icicles in his beard. He is still thawing by the door.',
  'Clear sky tonight. You can see both moons from the stable yard.',
  'The road south is mud to the axle, so you may as well stay.'
];

const LATE = [
  'The candles are burning low. So are some purses.',
  'Past the second bell already. The night runs quick.',
  'The watch changes soon. Keep your voices friendly.',
  'Almost closing. Almost. One more round never hurt.',
  'The bard went home. Now the fire does the singing.'
];
const EARLY = [
  'Early crowd tonight. The kettles are barely warm.',
  'First through the door gets the chair by the fire. House custom.',
  'The night is young and so is your luck.',
  'The felt is still cold. Warm it kindly.'
];

const GAMEL = {
  cards: ['I stand on seventeen. It is the law and my knees.', 'Count the cards if you like. The shoe counts back.', 'Twenty-one is an honest game. It is the players I watch.', 'Six decks in the shoe. I shuffle at three quarters, same as my father did.', 'Split tens? Bold table tonight.'],
  wheel: ['That wheel came over the pass on a mule. Never once stuck.', 'The zero is green for envy.', 'Round and round. Prettiest thief in Bruma.', 'I true the wheel every morning with a level and a prayer.', 'Corners pay handsome. They land seldom. Funny, that.'],
  hazard: ['Hjalmar named this game and lost his house at it.', 'Name your main and mind your chances.', 'Seven is a friendly main. Hjalmar never learned that.', 'Nicks and outs, friend. The old game keeps old rules.'],
  bones: ['First to fifty, and no leaning on the table.', 'These bones are older than the county.', 'Bank early, laugh last. Or ride it and make a story.', 'A frost on the first throw. The bones are in a mood.'],
  cage: ['Three dice in a cage, like little prisoners.', 'The cage turns fair. I oil it myself.', 'Three alike pays thirty. I have seen it twice this year.', 'High or low, the cage does not care for your feelings.'],
  six: ['The big wheel took two men to carry up here.', 'Everyone backs the Dragon once. Once.', 'The ones pay steady. The Septim pays stories.', 'Listen to the pins. They sing before they settle.'],
  keno: ['The lottery balls are numbered by a priest of Julianos. Supposedly.', 'Pick few and win often, pick many and dream.', 'The whole hall waits on the same draw. Even me.', 'Ten picks is a poem. One pick is a plan.'],
  slots: ['That machine came from a Dwemer ruin, or a liar. I bought it from the liar.', 'The hoard grows with every pull. Listen to it.', 'Five dragons on the reels and I weep openly.', 'Free spins smell like ozone. Dwemer work, I tell you.', 'The lever sticks in the cold. Pull with feeling.'],
  mines: ['The draugr under those stones are only painted. Probably.', 'Greed wakes them. It always does.', 'Take your silver while it is yours to take.', 'One more stone, they always say. The barrow hears them.'],
  plinko: ['A real avalanche took my uncle’s barn. This one only takes stakes.', 'The snowball knows where it wants to go.', 'The edges pay a hundredfold. The middle pays for my roof.', 'Drop two at once. They never land together.'],
  scratch: ['Fresh wax this morning. Scratch gently or don’t, it is your copper.', 'I stamp every seal myself. My thumb aches of it.', 'Three dragons under the wax once. The whole hall drank free.', 'The crown turns up when you stop looking for it.', 'Wax under your nails means you played honest.'],
  crash: ['The dragon flies when it pleases. Leave before it does not.', 'I never ride past two. A coward dies rich.', 'Set your leaving height before your blood is up.', 'Some flights fall at the gate. Even dragons stumble.'],
  races: ['Ingjard is old, but the track is downhill.', 'The horses are honest. The odds are mine.', 'Watch the grey in the mud. Watch him anyway.', 'An exacta paid four hundred once. The man fainted.'],
  arena: ['I saw Gharol crack an oak shield like bread.', 'Mind the front row when the mages fight.', 'The belt changes hands the way all crowns do. Loudly.', 'Back the archer in a long bout. Arms tire; arrows don’t.']
};

const WIN = [
  'The Nine smile on you tonight. Buy them a drink.',
  'Careful, friend. Luck like that draws a crowd.',
  'That is coming out of my winter stores, you know.',
  'Well struck. I will pretend it does not hurt.',
  'Keep that up and I will have to name a chair after you.',
  'I will tell the crier. He loves a winner more than his own mother.',
  'Count it twice. Wins like that deserve the counting.',
  'The fire burns brighter for you tonight, I swear it.'
];
const LOSS = [
  'The table gives and the table takes. Mostly takes.',
  'A cold streak thaws, friend. Usually.',
  'There is no shame in a warm cup and a short walk.',
  'The dice owe you. They are poor at paying debts, mind.',
  'Even Hjalmar had nights like this. Hence the hazard.',
  'The kettle is hot and costs nothing. Sit by it a while.',
  'Luck is a tide, friend. Tides turn whether you shout at them or not.',
  'My book says the tables will still be here tomorrow. So will your chair.'
];

const RANKL = {
  silver: ['Silver standing, is it? I remember your first copper.', 'A Silver patron drinks from the clean cups.'],
  gold: ['Make way, a Gold patron at my table. The good chair, there.', 'Gold standing. I polish the rail where you lean.'],
  dragon: ['A Dragon of the house. I pour before you ask.', 'When a Dragon patron sits, even the dice sit straighter.']
};

const THEMEL = {
  newlife: ['New Life! The snowberry garlands were my mother’s idea, years back.', 'A toast to the new year, and to purses refilled.'],
  harvest: ['Harvest’s End. The bread is fresh and the odds are not.', 'Smell that? New bread and old luck.'],
  witches: ['Witches’ Festival. If a gourd winks at you, wink back.', 'Something rustled in the rafters again. Probably nothing.'],
  midyear: ['Mid Year. The old banners come down for nothing less.', 'To the old victories, and to tonight’s.']
};

function mutter(ctx) {
  const c = ctx || {};
  if (c.mood === 'win') return pick(WIN);
  if (c.mood === 'loss') return pick(LOSS);
  const pool = [];
  const add = (list, w) => { for (let i = 0; i < (w || 1); i++) pool.push(list); };
  add(GENERAL, 3);
  add(WEATHER, 2);
  if (GAMEL[c.game]) add(GAMEL[c.game], 4);
  if (c.hour >= 22 || c.hour < 4) add(LATE, 2);
  if (c.hour >= 16 && c.hour < 20) add(EARLY, 1);
  if (c.place) add(['Keep tonight’s spot to yourself: ' + c.place + ' is not on any map, and I would keep it that way.', 'Tomorrow we move again. The inn walks, as they say.'], 1);
  if (RANKL[c.rank]) add(RANKL[c.rank], 2);
  if (THEMEL[c.theme]) add(THEMEL[c.theme], 2);
  return pick(pick(pool));
}

module.exports = { mutter, GENERAL, WEATHER, GAMEL, WIN, LOSS, RANKL, THEMEL, LATE, EARLY };
