const R = require('./innrng');

const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS = ['s', 'h', 'd', 'c'];
const DECKS = 8;
const CUT = 0.8;
const BETS = { player: { key: 'player', label: 'Player', pays: 1 }, banker: { key: 'banker', label: 'Banker', pays: 0.95 }, tie: { key: 'tie', label: 'Tie', pays: 8 } };

const worth = c => { const r = c.slice(0, -1); return r === 'A' ? 1 : (['10', 'J', 'Q', 'K'].includes(r) ? 0 : Number(r)); };
const score = cards => cards.reduce((n, c) => n + worth(c), 0) % 10;

function newShoe(rng) {
  const cards = [];
  for (let d = 0; d < DECKS; d++) SUITS.forEach(s => RANKS.forEach(r => cards.push(r + s)));
  R.shuffle(cards, rng);
  const burn = worth(cards[0]) || 10;
  return { cards, at: 1 + burn };
}

function draw(t, rng) {
  if (!t.shoe || t.shoe.at >= t.shoe.cards.length * CUT) { t.shoe = newShoe(rng); t.shuffled = true; }
  return t.shoe.cards[t.shoe.at++];
}

function bankerDraws(b, p3) {
  if (p3 === null) return b <= 5;
  const v = worth(p3);
  if (b <= 2) return true;
  if (b === 3) return v !== 8;
  if (b === 4) return v >= 2 && v <= 7;
  if (b === 5) return v >= 4 && v <= 7;
  if (b === 6) return v === 6 || v === 7;
  return false;
}

function coup(t, rng) {
  t.shuffled = false;
  const P = [draw(t, rng)], B = [draw(t, rng)];
  P.push(draw(t, rng)); B.push(draw(t, rng));
  const steps = [{ P: P.slice(), B: B.slice() }];
  let p3 = null;
  const natural = score(P) >= 8 || score(B) >= 8;
  if (!natural) {
    if (score(P) <= 5) { p3 = draw(t, rng); P.push(p3); steps.push({ P: P.slice(), B: B.slice() }); }
    if (bankerDraws(score(B), p3)) { B.push(draw(t, rng)); steps.push({ P: P.slice(), B: B.slice() }); }
  }
  const ps = score(P), bs = score(B);
  return { P, B, ps, bs, natural, win: ps > bs ? 'player' : (bs > ps ? 'banker' : 'tie'), steps };
}

function clean(raw) {
  const out = {};
  Object.entries(raw || {}).forEach(([k, v]) => {
    if (!BETS[k]) throw new Error('Bet on the Player, the Banker or a Tie.');
    const a = Math.floor(Number(v));
    if (Number.isFinite(a) && a >= 1) out[k] = (out[k] || 0) + a;
  });
  return out;
}

function settle(bets, c) {
  let staked = 0, returned = 0;
  const lines = Object.entries(bets).map(([k, a]) => {
    staked += a;
    let ret = 0;
    if (c.win === 'tie') ret = k === 'tie' ? a * 9 : a;
    else if (k === c.win) ret = k === 'banker' ? a + Math.floor(a * 0.95) : a * 2;
    returned += ret;
    return { key: k, label: BETS[k].label, amount: a, won: ret > a, push: ret === a, ret };
  });
  return { staked, returned, lines };
}

function play(t, bets, rng) {
  const c = coup(t, rng);
  const s = settle(bets, c);
  t.last = Object.assign({}, c, s, { bets });
  return t.last;
}

function fresh() { return { shoe: null, last: null }; }

module.exports = { BETS, DECKS, worth, score, bankerDraws, coup, clean, settle, play, fresh, newShoe };
