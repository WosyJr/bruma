const crypto = require('crypto');
const S = require('./store');
const T = require('./town');

const KEEPER = 'Old Brannoc';
const GAMES = 'town-cards.json';
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS = ['s', 'h', 'd', 'c'];
const TABLES = new Map();
const TABLE_MS = 6 * 60 * 60 * 1000;

const clean = (v, max) => String(v ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, max);

function shuffle() {
  const deck = [];
  SUITS.forEach(s => RANKS.forEach(r => deck.push(r + s)));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function total(cards) {
  let n = 0, aces = 0;
  cards.forEach(c => {
    const r = c.slice(0, -1);
    if (r === 'A') { aces += 1; n += 11; }
    else if (r === 'J' || r === 'Q' || r === 'K') n += 10;
    else n += Number(r);
  });
  while (n > 21 && aces) { n -= 10; aces -= 1; }
  return { n, soft: aces > 0 };
}
const natural = cards => cards.length === 2 && total(cards).n === 21;

function table(id) {
  const t = Date.now();
  if (TABLES.size > 5000) TABLES.forEach((v, k) => { if (t - v.touched > TABLE_MS) TABLES.delete(k); });
  let h = TABLES.get(id);
  if (!h) { h = { touched: t, hand: null, streak: 0 }; TABLES.set(id, h); }
  h.touched = t;
  return h;
}

function record(hand, who) {
  const list = S.read(GAMES, []);
  list.push({ name: who.name, key: who.key, signed: who.signed, result: hand.result, bj: hand.result === 'win' && natural(hand.you), you: total(hand.you).n, inn: total(hand.inn).n, at: new Date().toISOString() });
  S.write(GAMES, list.slice(-20000));
}

function settle(hand, who, tb) {
  const y = total(hand.you).n, d = total(hand.inn).n;
  const yn = natural(hand.you), dn = natural(hand.inn);
  let result, say, tone;
  if (y > 21) { result = 'lose'; say = 'Bust at ' + y + '. ' + KEEPER + ' rakes in the cards. “The cold takes the greedy.”'; tone = 'bad'; }
  else if (yn && !dn) { result = 'win'; say = 'Twenty-one off the deal. ' + KEEPER + ' raises his cup to you. “Blackjack. The Nine smile on you.”'; tone = 'good'; }
  else if (dn && !yn) { result = 'lose'; say = KEEPER + ' turns his card: twenty-one off the deal. “The house remembers its luck.”'; tone = 'bad'; }
  else if (d > 21) { result = 'win'; say = KEEPER + ' busts at ' + d + '. He slaps the table. “Well played. Your name goes on the board.”'; tone = 'good'; }
  else if (y > d) { result = 'win'; say = 'Your ' + y + ' beats his ' + d + '. “Well played. Your name goes on the board.”'; tone = 'good'; }
  else if (y < d) { result = 'lose'; say = 'His ' + d + ' beats your ' + y + '. “The house keeps its warmth tonight.”'; tone = 'bad'; }
  else { result = 'push'; say = 'Both at ' + y + '. A push. “Again, then.”'; tone = ''; }
  hand.result = result;
  hand.say = say;
  hand.tone = tone;
  hand.over = true;
  tb.streak = result === 'win' ? tb.streak + 1 : (result === 'lose' ? 0 : tb.streak);
  if (result === 'win' && tb.streak >= 3) hand.say += ' That is ' + tb.streak + ' in a row.';
  record(hand, who);
}

function dealerTurn(h, tb, say) {
  h.say = say;
  const steps = [];
  const turned = view(tb);
  turned.inn = h.inn.slice(0, 2);
  turned.innTotal = total(turned.inn).n;
  steps.push(turned);
  while (total(h.inn).n < 17) {
    h.inn.push(h.deck.pop());
    const v = view(tb);
    v.inn = h.inn.slice();
    v.innTotal = total(h.inn).n;
    v.say = KEEPER + ' draws. He has ' + v.innTotal + '.';
    steps.push(v);
  }
  return steps;
}

function view(tb) {
  const h = tb.hand;
  if (!h) return { started: false, over: true, you: [], inn: [], youTotal: 0, innTotal: null, say: KEEPER + ' shuffles the deck. “Twenty-one, traveller? Closest without going over.”', tone: '', streak: tb.streak };
  const shown = h.over ? h.inn : [h.inn[0], '??'];
  const yt = total(h.you);
  return {
    started: true, over: !!h.over, result: h.result || '', you: h.you.slice(), inn: shown,
    youTotal: yt.n, youSoft: yt.soft && yt.n < 21, innTotal: h.over ? total(h.inn).n : total([h.inn[0]]).n,
    say: h.say, tone: h.tone || '', streak: tb.streak
  };
}

function act(id, what, who) {
  const tb = table(id);
  const steps = [];
  if (what === 'deal') {
    if (tb.hand && !tb.hand.over) throw new Error('Finish the hand on the table first.');
    const deck = shuffle();
    const h = { deck, you: [deck.pop()], inn: [deck.pop()], over: false, say: '', tone: '' };
    h.you.push(deck.pop());
    h.inn.push(deck.pop());
    tb.hand = h;
    if (natural(h.you) || natural(h.inn)) settle(h, who, tb);
    else { h.say = 'You show ' + total(h.you).n + '. ' + KEEPER + ' shows ' + total([h.inn[0]]).n + '. “Another card, or do you stand?”'; }
    return { state: view(tb), steps };
  }
  const h = tb.hand;
  if (!h || h.over) throw new Error('Ask for a new hand first.');
  if (what === 'hit') {
    h.you.push(h.deck.pop());
    const n = total(h.you).n;
    if (n > 21) settle(h, who, tb);
    else if (n === 21) { steps.push(...dealerTurn(h, tb, 'Twenty-one. You stand, and ' + KEEPER + ' turns his card.')); settle(h, who, tb); }
    else { h.say = 'You have ' + n + '. “Another, or do you stand?”'; h.tone = ''; }
    return { state: view(tb), steps };
  }
  if (what === 'stand') {
    steps.push(...dealerTurn(h, tb, 'You stand on ' + total(h.you).n + '. ' + KEEPER + ' turns his card.'));
    settle(h, who, tb);
    return { state: view(tb), steps };
  }
  throw new Error('The innkeeper does not follow.');
}

function board(key) {
  const list = S.read(GAMES, []).filter(x => x.result && T.inWeek(x.at, key));
  const by = {};
  list.forEach(x => {
    const k = x.name.toLowerCase();
    by[k] = by[k] || { name: x.name, wins: 0, hands: 0, bj: 0 };
    by[k].hands += 1;
    if (x.result === 'win') by[k].wins += 1;
    if (x.bj) by[k].bj += 1;
  });
  const rows = Object.values(by);
  const top = rows.filter(r => r.wins).sort((a, b) => b.wins - a.wins || a.hands - b.hands).slice(0, 10);
  const lucky = rows.filter(r => r.bj).sort((a, b) => b.bj - a.bj)[0] || null;
  return { hands: list.length, keeperWins: list.filter(x => x.result === 'lose').length, top, lucky };
}

module.exports = { KEEPER, act, view, table, board, total, clean, natural };
