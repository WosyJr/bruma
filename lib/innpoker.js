const R = require('./innrng');

const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const SUITS = ['s', 'h', 'd', 'c'];
const rv = c => RANKS.indexOf(c.slice(0, -1)) + 2;
const sv = c => c.slice(-1);
const ONE = { 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten', 11: 'jack', 12: 'queen', 13: 'king', 14: 'ace' };
const MANY = { 2: 'twos', 3: 'threes', 4: 'fours', 5: 'fives', 6: 'sixes', 7: 'sevens', 8: 'eights', 9: 'nines', 10: 'tens', 11: 'jacks', 12: 'queens', 13: 'kings', 14: 'aces' };

function five(cards) {
  const v = cards.map(rv).sort((a, b) => b - a);
  const flush = cards.every(c => sv(c) === sv(cards[0]));
  const uniq = Array.from(new Set(v));
  let straight = 0;
  if (uniq.length === 5) { if (v[0] - v[4] === 4) straight = v[0]; else if (v.join() === '14,5,4,3,2') straight = 5; }
  const cnt = {};
  v.forEach(x => { cnt[x] = (cnt[x] || 0) + 1; });
  const g = Object.entries(cnt).map(([r, n]) => [n, Number(r)]).sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  if (straight && flush) return [8, straight];
  if (g[0][0] === 4) return [7, g[0][1], g[1][1]];
  if (g[0][0] === 3 && g[1][0] === 2) return [6, g[0][1], g[1][1]];
  if (flush) return [5].concat(v);
  if (straight) return [4, straight];
  if (g[0][0] === 3) return [3, g[0][1]].concat(g.slice(1).map(x => x[1]));
  if (g[0][0] === 2 && g[1][0] === 2) return [2, g[0][1], g[1][1], g[2][1]];
  if (g[0][0] === 2) return [1, g[0][1]].concat(g.slice(1).map(x => x[1]));
  return [0].concat(v);
}

function cmp(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] || 0) - (b[i] || 0);
    if (d) return d;
  }
  return 0;
}

function best(cards) {
  let top = null, hand = null;
  const n = cards.length;
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) for (let c = b + 1; c < n; c++) for (let d = c + 1; d < n; d++) for (let e = d + 1; e < n; e++) {
    const h = [cards[a], cards[b], cards[c], cards[d], cards[e]];
    const s = five(h);
    if (!top || cmp(s, top) > 0) { top = s; hand = h; }
  }
  return { score: top, cards: hand };
}

function describe(s) {
  if (!s) return '';
  switch (s[0]) {
    case 8: return s[1] === 14 ? 'A royal flush' : 'A straight flush, ' + ONE[s[1]] + ' high';
    case 7: return 'Four ' + MANY[s[1]];
    case 6: return 'A full house, ' + MANY[s[1]] + ' over ' + MANY[s[2]];
    case 5: return 'A flush, ' + ONE[s[1]] + ' high';
    case 4: return 'A straight, ' + ONE[s[1]] + ' high';
    case 3: return 'Three ' + MANY[s[1]];
    case 2: return 'Two pair, ' + MANY[s[1]] + ' and ' + MANY[s[2]];
    case 1: return 'A pair of ' + MANY[s[1]];
    default: return ONE[s[1]].charAt(0).toUpperCase() + ONE[s[1]].slice(1) + ' high';
  }
}

function fresh() { return { hand: 0, buttonPid: '', deck: [], board: [], street: 'waiting', toAct: -1, currentBet: 0, minRaise: 0, nextAt: 0, last: null }; }

const live = st => ['preflop', 'flop', 'turn', 'river'].includes(st.street);
const inn = s => s.inHand && !s.folded;
const canAct = s => s.inHand && !s.folded && !s.allin;
const needs = (st, s) => canAct(s) && (!s.acted || s.bet < st.currentBet);

function nextIdx(seats, from, test) {
  for (let k = 1; k <= seats.length; k++) {
    const i = (from + k + seats.length) % seats.length;
    if (test(seats[i], i)) return i;
  }
  return -1;
}

function put(s, amount) {
  const p = Math.max(0, Math.min(amount, s.stack));
  s.stack -= p;
  s.bet += p;
  s.contrib += p;
  if (s.stack === 0) s.allin = true;
  return p;
}

const ready = s => !s.left && !s.away && s.stack > 0;
function players(room) { return room.seats.filter(ready); }

function startHand(room, rng, now) {
  const st = room.st;
  const seats = room.seats;
  if (players(room).length < 2) throw new Error('Two players with chips are needed to deal.');
  seats.forEach(s => { s.inHand = ready(s); s.hole = []; s.bet = 0; s.contrib = 0; s.folded = false; s.allin = false; s.acted = false; s.won = 0; });
  const cur = seats.findIndex(s => s.pid === st.buttonPid);
  const button = nextIdx(seats, cur >= 0 ? cur : -1, s => s.inHand);
  st.buttonPid = seats[button].pid;
  const deck = [];
  SUITS.forEach(su => RANKS.forEach(r => deck.push(r + su)));
  R.shuffle(deck, rng);
  st.deck = deck;
  st.board = [];
  st.hand += 1;
  const n = seats.filter(s => s.inHand).length;
  const sb = n === 2 ? button : nextIdx(seats, button, s => s.inHand);
  const bb = nextIdx(seats, sb, s => s.inHand);
  const bbAmt = room.bb, sbAmt = Math.max(1, Math.floor(room.bb / 2));
  put(seats[sb], sbAmt);
  put(seats[bb], bbAmt);
  for (let r = 0; r < 2; r++) { let i = button; for (let k = 0; k < n; k++) { i = nextIdx(seats, i, s => s.inHand); seats[i].hole.push(st.deck.pop()); } }
  st.currentBet = Math.max(...seats.map(s => s.bet));
  st.minRaise = room.bb;
  st.street = 'preflop';
  st.sb = sb; st.bbi = bb;
  st.last = null;
  st.say = 'Hand ' + st.hand + '. ' + seats[sb].name + ' posts ' + sbAmt + ', ' + seats[bb].name + ' posts ' + bbAmt + '.';
  const from = n === 2 ? (sb - 1 + seats.length) % seats.length : bb;
  st.toAct = nextIdx(seats, from, s => needs(st, s));
  if (st.toAct < 0) return finishStreet(room, rng, now);
  return room;
}

function act(room, idx, what, amount, rng, now) {
  const st = room.st;
  const seats = room.seats;
  if (!live(st)) throw new Error('No hand is being played.');
  if (st.toAct !== idx) throw new Error('It is not your turn.');
  const s = seats[idx];
  const toCall = st.currentBet - s.bet;
  if (what === 'fold') { s.folded = true; st.say = s.name + ' folds.'; }
  else if (what === 'check') { if (toCall > 0) throw new Error('There is a bet to call.'); st.say = s.name + ' checks.'; }
  else if (what === 'call') { if (toCall <= 0) throw new Error('Nothing to call; check instead.'); const p = put(s, toCall); st.say = s.name + (s.allin ? ' calls all in for ' + p + '.' : ' calls ' + p + '.'); }
  else if (what === 'raise' || what === 'allin') {
    let to = what === 'allin' ? s.bet + s.stack : Math.floor(Number(amount));
    if (!Number.isFinite(to)) throw new Error('Name how much to raise to.');
    const most = s.bet + s.stack;
    if (to >= most) to = most;
    if (to <= st.currentBet) {
      if (what === 'allin' && to > s.bet) { const p = put(s, to - s.bet); st.say = s.name + ' calls all in for ' + p + '.'; }
      else throw new Error('A raise has to go above ' + st.currentBet + '.');
    } else {
      const full = to - st.currentBet >= st.minRaise;
      if (!full && to < most) throw new Error('The smallest raise is to ' + (st.currentBet + st.minRaise) + '.');
      const was = st.currentBet;
      put(s, to - s.bet);
      if (full) { st.minRaise = to - was; seats.forEach((o, i) => { if (i !== idx && canAct(o)) o.acted = false; }); }
      st.currentBet = to;
      st.say = s.name + (s.allin ? ' goes all in, ' : (was ? ' raises to ' : ' bets ')) + to + (s.allin ? '.' : '.');
    }
  } else throw new Error('Fold, check, call or raise.');
  s.acted = true;
  return advance(room, rng, now);
}

function advance(room, rng, now) {
  const st = room.st;
  const seats = room.seats;
  const alive = seats.filter(inn);
  if (alive.length === 1) return award(room, rng, now, false);
  const nx = nextIdx(seats, st.toAct, s => needs(st, s));
  if (nx >= 0) { st.toAct = nx; return room; }
  return finishStreet(room, rng, now);
}

function finishStreet(room, rng, now) {
  const st = room.st;
  const seats = room.seats;
  seats.forEach(s => { s.bet = 0; s.acted = false; });
  st.currentBet = 0;
  st.minRaise = room.bb;
  const deal = k => { st.deck.pop(); for (let i = 0; i < k; i++) st.board.push(st.deck.pop()); };
  const actors = seats.filter(canAct).length;
  if (st.street === 'river') return award(room, rng, now, true);
  if (st.street === 'preflop') { deal(3); st.street = 'flop'; }
  else if (st.street === 'flop') { deal(1); st.street = 'turn'; }
  else if (st.street === 'turn') { deal(1); st.street = 'river'; }
  if (actors <= 1) {
    while (st.board.length < 5) deal(1);
    st.street = 'river';
    return award(room, rng, now, true);
  }
  const btn = seats.findIndex(s => s.pid === st.buttonPid);
  st.toAct = nextIdx(seats, btn, canAct);
  return room;
}

function pots(seats) {
  const rem = seats.map(s => s.inHand ? s.contrib : 0);
  const out = [];
  for (;;) {
    const alive = seats.map((s, i) => i).filter(i => inn(seats[i]) && rem[i] > 0);
    if (!alive.length) break;
    const lvl = Math.min(...alive.map(i => rem[i]));
    let amount = 0;
    const eligible = alive.slice();
    rem.forEach((r, i) => { const t = Math.min(r, lvl); amount += t; rem[i] -= t; });
    out.push({ amount, eligible });
  }
  const left = rem.reduce((a, b) => a + b, 0);
  if (left && out.length) out[out.length - 1].amount += left;
  return out;
}

function award(room, rng, now, showdown) {
  const st = room.st;
  const seats = room.seats;
  const ins = seats.filter(s => s.inHand).sort((x, y) => y.contrib - x.contrib);
  if (ins.length > 1 && !ins[0].folded && ins[0].contrib > ins[1].contrib) {
    const back = ins[0].contrib - ins[1].contrib;
    ins[0].contrib -= back;
    ins[0].stack += back;
  }
  const total = seats.reduce((n, s) => n + (s.inHand ? s.contrib : 0), 0);
  const rake = st.board.length >= 3 ? Math.min(Math.floor(total * (room.rake || 0) / 100), 3 * room.bb) : 0;
  const ps = pots(seats);
  let due = rake;
  ps.forEach(p => { const t = Math.min(due, p.amount); p.amount -= t; due -= t; });
  const scores = {};
  const shownAll = showdown && seats.filter(inn).length > 1;
  if (shownAll) seats.forEach((s, i) => { if (inn(s)) scores[i] = best(s.hole.concat(st.board)); });
  const btn = seats.findIndex(s => s.pid === st.buttonPid);
  const order = i => (i - btn + seats.length) % seats.length || seats.length;
  const winners = [];
  ps.forEach(p => {
    if (!(p.amount > 0)) return;
    let win = p.eligible;
    if (shownAll && win.length > 1) {
      let top = null;
      win.forEach(i => { if (!top || cmp(scores[i].score, top) > 0) top = scores[i].score; });
      win = win.filter(i => cmp(scores[i].score, top) === 0);
    }
    win.sort((a, b) => order(a) - order(b));
    const share = Math.floor(p.amount / win.length);
    let odd = p.amount - share * win.length;
    win.forEach(i => { const w = share + (odd-- > 0 ? 1 : 0); seats[i].won += w; seats[i].stack += w; });
    winners.push({ amount: p.amount, names: win.map(i => seats[i].name), desc: shownAll ? describe(scores[win[0]].score) : '' });
  });
  const settled = seats.filter(s => s.inHand).map(s => ({ pid: s.pid, name: s.name, username: s.username || '', staked: s.contrib, returned: s.won }));
  st.last = {
    hand: st.hand, board: st.board.slice(), rake, total,
    shown: shownAll ? seats.map((s, i) => inn(s) ? { name: s.name, hole: s.hole.slice(), desc: describe(scores[i].score), best: scores[i].cards } : null).filter(Boolean) : [],
    winners
  };
  st.say = winners.map((w, k) => (k ? (winners.length > 2 ? 'A side pot' : 'The side pot') : (winners.length > 1 ? 'The main pot' : 'The pot')) + ' of ' + w.amount + ' to ' + w.names.join(' and ') + (w.desc ? ' with ' + w.desc.charAt(0).toLowerCase() + w.desc.slice(1) : '') + '.').join(' ');
  st.street = 'between';
  st.toAct = -1;
  st.nextAt = (now || Date.now()) + 7000;
  room.settled = settled;
  return room;
}

function canDo(room, idx) {
  const st = room.st;
  const s = room.seats[idx];
  if (!s || !live(st) || st.toAct !== idx) return null;
  const toCall = st.currentBet - s.bet;
  return { fold: true, check: toCall <= 0, call: toCall > 0, toCall: Math.min(toCall, s.stack), raise: s.stack > toCall, minTo: Math.min(st.currentBet + st.minRaise, s.bet + s.stack), maxTo: s.bet + s.stack, bet: st.currentBet === 0 };
}

function autoMove(room, idx, rng, now) {
  const st = room.st;
  const s = room.seats[idx];
  const toCall = st.currentBet - s.bet;
  return act(room, idx, toCall > 0 ? 'fold' : 'check', 0, rng, now);
}

module.exports = { RANKS, five, best, cmp, describe, fresh, live, startHand, act, advance, award, pots, canDo, autoMove, players, inn, canAct };
