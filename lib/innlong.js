const J = require('./innjack');
const Sd = require('./innside');

const BETWIN = 20000;
const PAUSE = 6000;

function shoeDraw(st, rng) {
  if (!st.shoe || st.shoe.at >= st.shoe.cards.length * J.CUT) { st.shoe = J.newShoe(rng); st.shuffled = true; }
  return st.shoe.cards[st.shoe.at++];
}

function fresh(now) { return { phase: 'betting', round: 1, shoe: null, dealer: [], hole: true, active: null, nextAt: (now || Date.now()) + BETWIN, say: 'Place your bets.', last: null }; }

const seated = r => r.seats.filter(s => !s.left);
const inRound = s => s.hands && s.hands.length;

function placeBet(r, idx, amount) {
  const st = r.st;
  if (st.phase !== 'betting') throw new Error('Wait for the next round to bet.');
  const s = r.seats[idx];
  if (s.bet) throw new Error('Your bet is down for this round.');
  s.bet = amount;
  s.hands = [];
  st.say = s.name + ' bets ' + amount.toLocaleString('en-US') + '.';
}

function allReady(r) { const live = seated(r); return live.length > 0 && live.every(s => s.bet > 0); }

function deal(r, rng, now) {
  const st = r.st;
  st.shuffled = false;
  st.dealer = [];
  st.hole = true;
  const players = r.seats.map((s, i) => i).filter(i => r.seats[i].bet > 0);
  players.forEach(i => { const s = r.seats[i]; s.hands = [{ cards: [], bet: s.bet, doubled: false, done: false, result: '', ret: 0 }]; s.ins = 0; s.insured = null; s.staked = s.bet; s.returned = 0; });
  r.seats.forEach(s => { if (!(s.bet > 0)) { s.hands = []; s.staked = 0; s.returned = 0; } });
  for (let k = 0; k < 2; k++) { players.forEach(i => r.seats[i].hands[0].cards.push(shoeDraw(st, rng))); st.dealer.push(shoeDraw(st, rng)); }
  players.forEach(i => {
    const s = r.seats[i];
    const sb = s.sideBet || {};
    if (!(sb.pp > 0 || sb.t3 > 0)) { s.sides = null; return; }
    const c = s.hands[0].cards;
    s.sides = Sd.settle({ pp: sb.pp || 0, t3: sb.t3 || 0 }, { pp: Sd.perfectPairs(c[0], c[1]), t3: Sd.twentyOnePlus3(c[0], c[1], st.dealer[0]) });
    s.sides.lines.forEach(l => { l.name = l.key === 'pp' ? 'Perfect Pairs' : '21+3'; });
    s.staked += s.sides.staked;
  });
  const up = J.rank(st.dealer[0]);
  if (up === 'A') {
    st.phase = 'insurance';
    st.say = 'Brannoc shows an ace. Insurance?';
    st.active = null;
    return;
  }
  return afterInsurance(r, rng, now);
}

function insure(r, idx, yes) {
  const st = r.st;
  if (st.phase !== 'insurance') throw new Error('No insurance is on offer.');
  const s = r.seats[idx];
  if (!inRound(s)) throw new Error('You have no hand this round.');
  if (s.insured !== null && s.insured !== undefined) throw new Error('You have answered.');
  s.insured = !!yes;
  if (yes) { s.ins = Math.floor(s.bet / 2); s.staked += s.ins; }
}

function insuranceDone(r) { return r.seats.filter(inRound).every(s => s.insured !== null && s.insured !== undefined); }

function afterInsurance(r, rng, now) {
  const st = r.st;
  r.seats.filter(inRound).forEach(s => { if (s.insured === null || s.insured === undefined) s.insured = false; });
  if (J.natural(st.dealer)) {
    st.hole = false;
    st.say = 'Brannoc turns his card: twenty-one.';
    return settle(r, now);
  }
  r.seats.filter(inRound).forEach(s => { if (s.ins) s.insLost = true; });
  st.phase = 'play';
  st.active = null;
  return nextHand(r, rng, now);
}

function nextHand(r, rng, now) {
  const st = r.st;
  for (let i = 0; i < r.seats.length; i++) {
    const s = r.seats[i];
    if (!inRound(s)) continue;
    for (let h = 0; h < s.hands.length; h++) {
      const hd = s.hands[h];
      if (hd.done) continue;
      if (hd.cards.length < 2) hd.cards.push(shoeDraw(st, rng));
      if (J.total(hd.cards).n >= 21 || (hd.splitAces && hd.cards.length >= 2) || s.left) { hd.done = true; continue; }
      st.active = { seat: i, hand: h };
      st.say = s.name + (s.hands.length > 1 ? ', hand ' + (h + 1) : '') + ' to play.';
      return;
    }
  }
  st.active = null;
  return dealerPlays(r, rng, now);
}

function canDo(r, idx) {
  const st = r.st;
  if (st.phase !== 'play' || !st.active || st.active.seat !== idx) return null;
  const s = r.seats[idx];
  const h = s.hands[st.active.hand];
  const rules = r.rules || {};
  return {
    hit: true, stand: true,
    double: h.cards.length === 2 && !h.splitAces,
    split: J.pairable(h, rules) && s.hands.length < 4 && !h.splitAces,
    surrender: s.hands.length === 1 && h.cards.length === 2 && !h.fromSplit,
    bet: h.bet
  };
}

function act(r, idx, what, rng, now) {
  const st = r.st;
  const can = canDo(r, idx);
  if (!can) throw new Error('It is not your turn.');
  const s = r.seats[idx];
  const h = s.hands[st.active.hand];
  if (what === 'hit') {
    h.cards.push(shoeDraw(st, rng));
    const t = J.total(h.cards).n;
    st.say = s.name + ' hits: ' + t + (t > 21 ? ', bust.' : '.');
    if (t >= 21) h.done = true;
  } else if (what === 'stand') { h.done = true; st.say = s.name + ' stands on ' + J.total(h.cards).n + '.'; }
  else if (what === 'double') {
    if (!can.double) throw new Error('You can only double on two cards.');
    s.staked += h.bet; h.bet *= 2; h.doubled = true;
    h.cards.push(shoeDraw(st, rng));
    h.done = true;
    st.say = s.name + ' doubles and draws to ' + J.total(h.cards).n + '.';
  } else if (what === 'split') {
    if (!can.split) throw new Error('Only a pair can be split, up to four hands.');
    const aces = J.rank(h.cards[0]) === 'A';
    const other = { cards: [h.cards.pop()], bet: h.bet, doubled: false, done: false, result: '', ret: 0, fromSplit: true, splitAces: aces };
    h.fromSplit = true; h.splitAces = aces;
    s.staked += h.bet;
    s.hands.splice(st.active.hand + 1, 0, other);
    h.cards.push(shoeDraw(st, rng));
    st.say = s.name + ' splits.';
    if (aces || J.total(h.cards).n >= 21) h.done = true;
  } else if (what === 'surrender') {
    if (!can.surrender) throw new Error('You can only surrender your first two cards.');
    h.done = true; h.surrender = true;
    st.say = s.name + ' surrenders half.';
  } else throw new Error('Hit, stand, double, split or surrender.');
  if (h.done) return nextHand(r, rng, now);
}

function dealerPlays(r, rng, now) {
  const st = r.st;
  st.hole = false;
  const live = r.seats.some(s => inRound(s) && s.hands.some(h => !h.surrender && J.total(h.cards).n <= 21));
  const soft17 = !!(r.rules && r.rules.hitSoft17);
  if (live) {
    for (;;) {
      const t = J.total(st.dealer);
      if (t.n < 17 || (soft17 && t.n === 17 && t.soft)) st.dealer.push(shoeDraw(st, rng));
      else break;
    }
  }
  return settle(r, now);
}

function settle(r, now) {
  const st = r.st;
  const d = J.total(st.dealer).n;
  const dbj = J.natural(st.dealer);
  const out = [];
  r.seats.forEach(s => {
    if (!inRound(s)) return;
    let ret = 0;
    if (s.ins) ret += dbj ? s.ins * 3 : 0;
    s.hands.forEach(h => {
      const t = J.total(h.cards).n;
      const bj = J.natural(h.cards) && !h.fromSplit;
      let res, back = 0;
      if (h.surrender) { res = 'surrender'; back = Math.floor(h.bet / 2); }
      else if (dbj) { res = bj ? 'push' : 'lose'; back = bj ? h.bet : 0; }
      else if (t > 21) { res = 'bust'; }
      else if (bj) { res = 'blackjack'; back = h.bet + Math.floor(h.bet * 6 / 5); }
      else if (d > 21 || t > d) { res = 'win'; back = h.bet * 2; }
      else if (t === d) { res = 'push'; back = h.bet; }
      else res = 'lose';
      h.result = res; h.ret = back; h.done = true;
      ret += back;
    });
    if (s.sides) ret += s.sides.returned;
    s.returned = ret;
    out.push({ pid: s.pid, name: s.name, username: s.username || '', staked: s.staked, returned: ret, left: !!s.left });
  });
  st.phase = 'done';
  st.active = null;
  st.hole = false;
  st.nextAt = (now || Date.now()) + PAUSE;
  st.say = (dbj ? 'Brannoc has twenty-one.' : 'Brannoc ' + (d > 21 ? 'busts with ' + d : 'stands on ' + d) + '.') + ' ' + out.map(x => x.name + (x.returned > x.staked ? ' wins ' + (x.returned - x.staked).toLocaleString('en-US') : (x.returned === x.staked ? ' pushes' : ' loses ' + (x.staked - x.returned).toLocaleString('en-US')))).join(', ') + '.';
  st.last = { round: st.round, results: out };
  r.settled = out;
}

function newRound(r, now) {
  const st = r.st;
  r.seats.forEach(s => { s.bet = 0; s.hands = []; s.ins = 0; s.insured = null; s.staked = 0; s.returned = 0; s.insLost = false; s.sideBet = null; s.sides = null; });
  st.phase = 'betting';
  st.round = (st.round || 1) + 1;
  st.dealer = [];
  st.hole = true;
  st.active = null;
  st.nextAt = (now || Date.now()) + BETWIN;
  st.say = 'Place your bets.';
}

module.exports = { BETWIN, PAUSE, fresh, placeBet, allReady, deal, insure, insuranceDone, afterInsurance, canDo, act, newRound, nextHand };
