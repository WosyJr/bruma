const R = require('./innrng');

const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS = ['s', 'h', 'd', 'c'];
const KEEP = 0.96;
const CAP = 50;

const rank = c => c.slice(0, -1);
const val = c => RANKS.indexOf(rank(c)) + 1;
const ace = c => rank(c) === 'A';

function fresh() { return { phase: 'done', deck: [], at: 0, card: '', pot: 0, stake: 0, calls: 0, cap: 0, turned: [], result: '', say: 'Old Brannoc cuts a single deck. “Higher or lower, and mind the aces.”', tone: '' }; }

const live = g => g && g.phase === 'play';

function odds(g) {
  const rest = g.deck.slice(g.at);
  if (!rest.length || !g.card) return { hi: 0, lo: 0, left: 0 };
  const v = val(g.card);
  const hi = rest.filter(c => !ace(c) && val(c) > v).length;
  const lo = rest.filter(c => !ace(c) && val(c) < v).length;
  const m = k => k ? KEEP * rest.length / k : 0;
  return { hi: m(hi), lo: m(lo), hiN: hi, loN: lo, aces: rest.filter(ace).length, same: rest.filter(c => !ace(c) && val(c) === v).length, left: rest.length };
}

function start(g, stake, cap, rng) {
  if (live(g)) throw new Error('Finish this run first.');
  const deck = [];
  SUITS.forEach(s => RANKS.forEach(r => deck.push(r + s)));
  R.shuffle(deck, rng);
  const first = deck.findIndex(c => !ace(c));
  const [c] = deck.splice(first, 1);
  R.shuffle(deck, rng);
  g = { phase: 'play', deck, at: 0, card: c, pot: stake, stake, calls: 0, cap, turned: [c], result: '', say: 'Brannoc turns the ' + c.replace(/[shdc]$/, '') + '. Higher or lower?', tone: '' };
  return g;
}

function call(g, dir) {
  if (!live(g)) throw new Error('Put down a stake first.');
  if (dir !== 'hi' && dir !== 'lo') throw new Error('Higher or lower?');
  const o = odds(g);
  const mult = dir === 'hi' ? o.hi : o.lo;
  if (!mult) throw new Error(dir === 'hi' ? 'Nothing is higher than that.' : 'Nothing is lower than that.');
  const next = g.deck[g.at++];
  g.turned.push(next);
  const was = g.card;
  g.card = next;
  const word = c => c.replace(/[shdc]$/, '');
  if (ace(next)) return end(g, 'lose', 'An ace. It ends you. Brannoc sweeps the pot.');
  if (val(next) === val(was)) return end(g, 'lose', 'Another ' + word(next) + '. Brannoc takes the tie.');
  const right = dir === 'hi' ? val(next) > val(was) : val(next) < val(was);
  if (!right) return end(g, 'lose', 'The ' + word(next) + '. Wrong call. The pot is his.');
  g.calls++;
  g.pot = g.pot * mult;
  if (g.pot >= g.cap) { g.pot = g.cap; return end(g, 'cash', 'The ' + word(next) + '. Right again, and the house pays no more than ' + g.cap + '. Brannoc counts it out to you.'); }
  if (g.at >= g.deck.length) return end(g, 'cash', 'The last card, and right. Brannoc pays out the pot.');
  g.say = 'The ' + word(next) + '. Right. The pot is ' + Math.floor(g.pot) + '. Again, or take it?';
  g.tone = 'good';
  return g;
}

function cashOut(g) {
  if (!live(g)) throw new Error('There is nothing to take.');
  if (!g.calls) throw new Error('Make at least one call before you take the pot.');
  return end(g, 'cash', 'You take the pot of ' + Math.floor(g.pot) + '. Brannoc grunts and pays.');
}

function end(g, result, say) {
  g.phase = 'done';
  g.result = result;
  g.pot = result === 'cash' ? Math.floor(g.pot) : 0;
  g.returned = g.pot;
  g.say = say;
  g.tone = result === 'cash' ? 'good' : 'bad';
  return g;
}

module.exports = { KEEP, CAP, fresh, start, call, cashOut, odds, live, val };
