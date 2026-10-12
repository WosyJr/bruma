const R = require('./innrng');

const KEEPER = 'Old Brannoc';
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS = ['s', 'h', 'd', 'c'];
const DECKS = 6;
const CUT = 0.75;
const TENS = new Set(['10', 'J', 'Q', 'K']);

const rank = c => c.slice(0, -1);
const worth = r => r === 'A' ? 11 : (TENS.has(r) ? 10 : Number(r));

function total(cards) {
  let n = 0, aces = 0;
  cards.forEach(c => { const r = rank(c); n += worth(r); if (r === 'A') aces++; });
  while (n > 21 && aces) { n -= 10; aces--; }
  return { n, soft: aces > 0 };
}
const natural = cards => cards.length === 2 && total(cards).n === 21;

function newShoe(rng) {
  const cards = [];
  for (let d = 0; d < DECKS; d++) SUITS.forEach(s => RANKS.forEach(r => cards.push(r + s)));
  R.shuffle(cards, rng);
  return { cards, at: 0 };
}

function fresh() { return { shoe: null, round: null, streak: 0 }; }

function draw(t, rng) {
  if (!t.shoe || t.shoe.at >= t.shoe.cards.length) t.shoe = newShoe(rng);
  return t.shoe.cards[t.shoe.at++];
}

const live = t => t.round && t.round.phase !== 'done';
const hand = t => t.round.hands[t.round.active];

function pairable(h, rules) {
  if (h.cards.length !== 2) return false;
  const a = rank(h.cards[0]), b = rank(h.cards[1]);
  if (a === b) return true;
  return !!(rules && rules.anyTen) && TENS.has(a) && TENS.has(b);
}

function canDo(t, rules, purse) {
  const out = { deal: !live(t), insure: false, hit: false, stand: false, double: false, split: false, surrender: false };
  if (!live(t)) return out;
  const r = t.round;
  if (r.phase === 'insurance') { out.insure = true; out.insureAfford = purse >= Math.floor(r.bet / 2) && Math.floor(r.bet / 2) > 0; return out; }
  const h = hand(t);
  out.hit = out.stand = true;
  out.double = h.cards.length === 2 && !h.aces && purse >= h.bet;
  out.split = pairable(h, rules) && r.hands.length < 4 && !(h.aces && rank(h.cards[0]) === 'A') && purse >= h.bet;
  out.surrender = r.hands.length === 1 && h.cards.length === 2 && !h.split;
  return out;
}

function deal(t, bet, rules, rng) {
  if (live(t)) throw new Error('Finish the hand on the table first.');
  let shuffled = false;
  if (!t.shoe || t.shoe.at >= Math.floor(t.shoe.cards.length * CUT)) { t.shoe = newShoe(rng); shuffled = true; }
  const p1 = draw(t, rng), d1 = draw(t, rng), p2 = draw(t, rng), d2 = draw(t, rng);
  t.round = { phase: 'play', bet, hands: [{ cards: [p1, p2], bet, doubled: false, split: false, aces: false, done: false, result: '', ret: 0 }], active: 0, dealer: [d1, d2], ins: 0, insured: null, staked: bet, returned: 0, say: '', tone: '', frames: [], pre: shuffled ? KEEPER + ' feeds a fresh shoe of six decks. ' : '' };
  const r = t.round;
  if (rank(d1) === 'A') {
    r.phase = 'insurance';
    r.say = r.pre + KEEPER + ' shows an ace. “Insurance, traveller? Half your stake says I have twenty-one.”';
    r.pre = '';
    return t;
  }
  return peek(t, rules, rng);
}

function insure(t, yes, rules, rng) {
  const r = t.round;
  if (!r || r.phase !== 'insurance') throw new Error('No insurance is on offer.');
  if (yes) {
    const ins = Math.floor(r.bet / 2);
    if (ins < 1) throw new Error('The stake is too small to insure.');
    r.ins = ins;
    r.staked += ins;
  }
  r.insured = !!yes;
  r.phase = 'play';
  return peek(t, rules, rng);
}

function peek(t, rules, rng) {
  const r = t.round;
  const up = rank(r.dealer[0]);
  const you = r.hands[0];
  const pre = r.pre || '';
  r.pre = '';
  if ((up === 'A' || TENS.has(up)) && natural(r.dealer)) {
    r.dealerBJ = true;
    r.returned += r.ins ? r.ins * 3 : 0;
    if (natural(you.cards)) { you.result = 'push'; you.ret = you.bet; r.say = pre + 'Both of you show twenty-one off the deal. A push.' + (r.ins ? ' Your insurance pays two to one.' : ''); r.tone = r.ins ? 'good' : ''; }
    else { you.result = 'lose'; you.ret = 0; r.say = pre + KEEPER + ' turns his card: twenty-one off the deal.' + (r.ins ? ' Your insurance pays two to one.' : ' “The house remembers its luck.”'); r.tone = r.ins ? '' : 'bad'; }
    you.done = true;
    return finish(t, rules, rng, true);
  }
  const lost = r.insured ? KEEPER + ' peeks. No twenty-one; your insurance is his. ' : '';
  if (natural(you.cards)) {
    you.result = 'blackjack';
    you.ret = you.bet + Math.floor(you.bet * 6 / 5);
    you.done = true;
    r.say = pre + lost + 'Blackjack. ' + KEEPER + ' raises his cup to you. “The Nine smile on you.”';
    r.tone = 'good';
    return finish(t, rules, rng, true);
  }
  r.say = pre + lost + 'You show ' + total(you.cards).n + '. ' + KEEPER + ' shows ' + total([r.dealer[0]]).n + '.';
  r.tone = '';
  return t;
}

function advance(t, rules, rng) {
  const r = t.round;
  const h = hand(t);
  const n = total(h.cards).n;
  if (n > 21) { h.result = 'bust'; h.ret = 0; h.done = true; }
  else if (n === 21) h.done = true;
  if (!h.done) { r.say = (r.hands.length > 1 ? 'Hand ' + (r.active + 1) + ': ' : 'You have ') + n + '. “Another, or do you stand?”'; r.tone = ''; return t; }
  const next = r.hands.findIndex((x, i) => i > r.active && !x.done);
  if (next >= 0) {
    r.active = next;
    const nh = hand(t);
    if (nh.cards.length === 1) nh.cards.push(draw(t, rng));
    if (nh.aces) nh.done = true;
    if (total(nh.cards).n === 21) nh.done = true;
    if (nh.done) return advance(t, rules, rng);
    r.say = 'Hand ' + (r.active + 1) + ': ' + total(nh.cards).n + '.';
    r.tone = '';
    return t;
  }
  return finish(t, rules, rng, false);
}

function act(t, what, rules, rng) {
  const r = t.round;
  if (!r || r.phase === 'done') throw new Error('Place a stake and deal first.');
  if (r.phase === 'insurance') throw new Error('Take insurance or decline it first.');
  const h = hand(t);
  const can = canDo(t, rules, Infinity);
  if (what === 'hit') { h.cards.push(draw(t, rng)); return advance(t, rules, rng); }
  if (what === 'stand') { h.done = true; return advance(t, rules, rng); }
  if (what === 'double') {
    if (!can.double) throw new Error('You can only double on your first two cards.');
    r.staked += h.bet;
    h.bet *= 2;
    h.doubled = true;
    h.cards.push(draw(t, rng));
    h.done = true;
    if (total(h.cards).n > 21) { h.result = 'bust'; h.ret = 0; }
    return advance(t, rules, rng);
  }
  if (what === 'split') {
    if (!can.split) throw new Error('Only a pair can be split, up to four hands.');
    const aces = rank(h.cards[0]) === 'A';
    const second = { cards: [h.cards[1]], bet: h.bet, doubled: false, split: true, aces, done: false, result: '', ret: 0 };
    h.cards = [h.cards[0], draw(t, rng)];
    h.split = true;
    h.aces = aces;
    r.staked += second.bet;
    r.hands.splice(r.active + 1, 0, second);
    if (aces) {
      second.cards.push(draw(t, rng));
      h.done = true;
      second.done = true;
      return advance(t, rules, rng);
    }
    if (total(h.cards).n === 21) { h.done = true; return advance(t, rules, rng); }
    r.say = 'Split. Hand 1 of ' + r.hands.length + ': ' + total(h.cards).n + '.';
    r.tone = '';
    return t;
  }
  if (what === 'surrender') {
    if (!can.surrender) throw new Error('You can only surrender your first two cards.');
    h.result = 'surrender';
    h.ret = Math.floor(h.bet / 2);
    h.done = true;
    return finish(t, rules, rng, true);
  }
  throw new Error('The innkeeper does not follow.');
}

function finish(t, rules, rng, early) {
  const r = t.round;
  r.frames = [];
  const standing = r.hands.filter(h => h.result !== 'bust' && h.result !== 'surrender');
  const needDealer = !early && standing.length > 0;
  r.frames.push(r.dealer.slice(0, 2));
  if (needDealer) {
    for (;;) {
      const d = total(r.dealer);
      if (d.n < 17 || (d.n === 17 && d.soft && rules && rules.hitSoft17)) { r.dealer.push(draw(t, rng)); r.frames.push(r.dealer.slice()); }
      else break;
    }
  }
  const dn = total(r.dealer).n;
  if (!early) {
    r.hands.forEach(h => {
      if (h.result) return;
      const p = total(h.cards).n;
      if (dn > 21 || p > dn) { h.result = 'win'; h.ret = h.bet * 2; }
      else if (p === dn) { h.result = 'push'; h.ret = h.bet; }
      else { h.result = 'lose'; h.ret = 0; }
    });
  }
  r.hands.forEach(h => { r.returned += h.ret; });
  r.phase = 'done';
  r.dealerTotal = dn;
  const net = r.returned - r.staked;
  t.streak = net > 0 ? t.streak + 1 : (net < 0 ? 0 : t.streak);
  if (!early || r.hands[0].result === 'surrender') {
    const words = { win: 'won', lose: 'lost', push: 'pushed', bust: 'bust', surrender: 'surrendered', blackjack: 'blackjack' };
    const head = r.hands[0].result === 'surrender' ? 'You surrender. ' + KEEPER + ' hands back half your stake.' :
      (needDealer ? (dn > 21 ? KEEPER + ' busts at ' + dn + '.' : KEEPER + ' stands on ' + dn + '.') : 'You bust.');
    const per = r.hands.length > 1 ? ' ' + r.hands.map((h, i) => 'Hand ' + (i + 1) + ' ' + words[h.result]).join(', ') + '.' : '';
    r.say = head + per;
    r.tone = net > 0 ? 'good' : (net < 0 ? 'bad' : '');
  }
  if (net > 0 && t.streak >= 3) r.say += ' That is ' + t.streak + ' in a row.';
  return t;
}

function view(t, rules, purse) {
  const r = t.round;
  const can = canDo(t, rules, purse);
  if (!r) return { started: false, phase: 'done', hands: [], dealer: [], dealerTotal: null, say: KEEPER + ' squares a six-deck shoe. “Twenty-one, traveller? Name your stake.”', tone: '', can, streak: t.streak, left: t.shoe ? t.shoe.cards.length - t.shoe.at : DECKS * 52 };
  const done = r.phase === 'done';
  return {
    started: true, phase: r.phase, bet: r.bet, ins: r.ins, insured: r.insured,
    hands: r.hands.map((h, i) => { const tt = total(h.cards); return { cards: h.cards.slice(), total: tt.n, soft: tt.soft && tt.n < 21, bet: h.bet, doubled: h.doubled, result: h.result, ret: h.ret, active: !done && i === r.active && r.phase === 'play' }; }),
    dealer: done ? r.dealer.slice() : [r.dealer[0], '??'],
    dealerTotal: done ? total(r.dealer).n : total([r.dealer[0]]).n,
    frames: done ? r.frames.map(f => f.slice()) : [],
    staked: r.staked, returned: r.returned, say: r.say, tone: r.tone, can, streak: t.streak,
    left: t.shoe ? t.shoe.cards.length - t.shoe.at : 0
  };
}

function outcome(t) {
  const r = t.round;
  if (!r || r.phase !== 'done') return null;
  return r.dealerBJ ? 'BJ' : (r.dealerTotal > 21 ? 'bust' : String(r.dealerTotal));
}

module.exports = { KEEPER, RANKS, TENS, DECKS, CUT, total, natural, rank, fresh, deal, insure, act, view, canDo, outcome, newShoe, pairable };
