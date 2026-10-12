const S = require('./store');
const R = require('./innrng');
const I = require('./inn');
const P = require('./innpoker');
const Bn = require('./bones');
const L = require('./innlong');
const M = require('./innmorris');
const Rc = require('./innrace');
const Dr = require('./inndraughts');

const ROOMS = 'inn-rooms.json';
const MAXSEATS = { duel: 2, bluff: 6, poker: 6, long: 5, morris: 2, coin: 2, rps: 2, race: 4, draughts: 2 };
const TWO = ['duel', 'morris', 'coin', 'rps', 'draughts'];
const RPS = { hammer: 'spell', spell: 'shield', shield: 'hammer' };
const RPSNAME = { hammer: 'Hammer', shield: 'Shield', spell: 'Spell' };
const INS = 15000;
const GOAL = 50;
const AWAY = 5 * 60000;

const clean = (v, n) => String(v === undefined || v === null ? '' : v).replace(/[\r\n]+/g, ' ').trim().slice(0, n);
const int = v => { const n = Math.floor(Number(String(v === undefined || v === null ? '' : v).replace(/[,\s]/g, ''))); return Number.isFinite(n) ? n : NaN; };
const sep = n => Number(n || 0).toLocaleString('en-US');

function rooms() { return S.read(ROOMS, []); }
function saveAll(list) {
  const cut = Date.now() - 12 * 3600000;
  S.write(ROOMS, list.filter(r => r.status !== 'done' || Date.parse(r.updated) > cut).slice(-300));
}
function get(id) { return rooms().find(r => r.id === String(id || '')) || null; }

function bump(r, kind, extra) {
  r.v = (r.v || 0) + 1;
  r.updated = new Date().toISOString();
  if (kind) r.ev = Object.assign({ n: r.v, kind }, extra || {});
}
function note(r, text) {
  r.log.unshift({ at: new Date().toISOString(), text });
  r.log = r.log.slice(0, 30);
}

function mutate(id, fn) {
  const list = rooms();
  const r = list.find(x => x.id === String(id || ''));
  if (!r) throw new Error('That table has been cleared away.');
  const out = fn(r);
  saveAll(list);
  return out === undefined ? r : out;
}

function seatOf(r, pid) { return r.seats.findIndex(s => s.pid === pid && !s.left); }
function liveRoomOf(pid, list) { return (list || rooms()).find(r => r.status !== 'done' && r.seats.some(s => s.pid === pid && !s.left)) || null; }

function newSeat(p, stack) { return { pid: p.id, name: p.name, username: p.username || '', stack: stack || 0, dice: [], n: 0, out: false, timeouts: 0, away: false, left: false }; }

function setDeadline(r, now) {
  const t = now || Date.now();
  if (r.game === 'long') {
    const ph = r.status === 'playing' ? r.st.phase : '';
    r.deadline = ph === 'betting' || ph === 'done' ? r.st.nextAt : (ph === 'insurance' ? t + INS : (ph === 'play' ? t + (r.turn || 45) * 1000 : 0));
    return;
  }
  r.deadline = r.status === 'playing' && turnIdx(r) >= 0 ? t + (r.turn || 45) * 1000 : 0;
}

function turnIdx(r) {
  if (r.status !== 'playing') return -1;
  if (r.game === 'duel') return r.st.winner >= 0 ? -1 : r.st.turn;
  if (r.game === 'bluff') return r.st.winner >= 0 ? -1 : r.st.turn;
  if (r.game === 'poker') return P.live(r.st) ? r.st.toAct : -1;
  if (r.game === 'morris') return r.st.winner >= 0 || r.st.draw ? -1 : r.st.turn;
  if (r.game === 'coin') return r.st.winner >= 0 ? -1 : r.st.caller;
  if (r.game === 'rps') return r.st.winner >= 0 ? -1 : (r.st.pick[0] === null ? 0 : (r.st.pick[1] === null ? 1 : -1));
  if (r.game === 'long') return r.st.phase === 'play' && r.st.active ? r.st.active.seat : -1;
  if (r.game === 'race') return r.st.winner >= 0 ? -1 : r.st.turn;
  if (r.game === 'draughts') return r.st.winner >= 0 || r.st.draw ? -1 : (r.st.turn === 0 ? r.st.light : 1 - r.st.light);
  return -1;
}

function create(pid, b) {
  const p = I.find(pid);
  if (!I.seated(p)) throw new Error('Ask for a seat at the door first.');
  const game = String(b.game || '');
  if (!MAXSEATS[game]) throw new Error('Choose a game.');
  const list = rooms();
  if (liveRoomOf(pid, list)) throw new Error('You are already sitting at a table in the back room. Leave it first.');
  const h = I.house();
  if (game === 'long') return createLong(p, b, h);
  const lim = h.limits[game];
  const stake = int(b.stake);
  if (!(stake >= lim.min)) throw new Error('The smallest ' + (game === 'poker' ? 'buy-in' : 'stake') + ' is ' + sep(lim.min) + '.');
  if (stake > lim.max) throw new Error('The largest ' + (game === 'poker' ? 'buy-in' : 'stake') + ' is ' + sep(lim.max) + '.');
  let bb = 0;
  if (game === 'poker') {
    bb = b.bb === undefined || b.bb === '' ? Math.max(2, Math.floor(stake / 50)) : int(b.bb);
    if (!(bb >= 2)) throw new Error('The big blind is at least 2.');
    if (bb * 10 > stake) throw new Error('The buy-in has to be at least ten big blinds.');
  }
  const max = TWO.includes(game) ? 2 : Math.max(2, Math.min(MAXSEATS[game], int(b.seats) || MAXSEATS[game]));
  I.escrow(pid, stake);
  const r = {
    id: S.id(), game, title: clean(b.title, 40) || p.name + '’s table', stake, bb, max, rake: h.rake, turn: h.turn,
    status: 'open', host: pid, seats: [newSeat(p, game === 'poker' ? stake : 0)], st: game === 'poker' ? P.fresh() : {}, log: [], chat: [], v: 1,
    created: new Date().toISOString(), updated: new Date().toISOString(), ev: { n: 1, kind: 'join' }, deadline: 0
  };
  if (game === 'rps') r.bestof = int(b.bestof) === 5 ? 5 : 3;
  note(r, p.name + ' opens the table and puts down ' + sep(stake) + '.');
  list.push(r);
  saveAll(list);
  I.playedAt(pid, game);
  return r;
}

function createLong(p, b, h) {
  const list = rooms();
  const r = {
    id: S.id(), game: 'long', title: clean(b.title, 40) || 'The Long Table', stake: 0, bb: 0, max: Math.max(1, Math.min(5, int(b.seats) || 5)), rake: 0, turn: h.turn, rules: I.rulesOf(h),
    status: 'playing', host: p.id, seats: [newSeat(p, 0)], st: L.fresh(), log: [], chat: [], v: 1,
    created: new Date().toISOString(), updated: new Date().toISOString(), ev: { n: 1, kind: 'join' }, deadline: 0
  };
  note(r, p.name + ' pulls up a chair at Brannoc’s long table.');
  setDeadline(r);
  list.push(r);
  saveAll(list);
  I.playedAt(p.id, 'long');
  return r;
}

function join(id, pid) {
  const p = I.find(pid);
  if (!I.seated(p)) throw new Error('Ask for a seat at the door first.');
  if (liveRoomOf(pid)) throw new Error('You are already sitting at a table in the back room. Leave it first.');
  const r0 = get(id);
  if (!r0) throw new Error('That table has been cleared away.');
  if (r0.status === 'done') throw new Error('That table has finished.');
  if (r0.game === 'long') {
    return mutate(id, r => {
      if (r.seats.filter(s => !s.left).length >= r.max) throw new Error('Every seat is taken.');
      r.seats.push(newSeat(p, 0));
      note(r, p.name + ' pulls up a chair.');
      bump(r, 'join');
      I.playedAt(pid, 'long');
    });
  }
  if (r0.game !== 'poker' && r0.status !== 'open') throw new Error('That game has started without you.');
  if (r0.seats.filter(s => !s.left).length >= r0.max) throw new Error('Every seat is taken.');
  I.escrow(pid, r0.stake);
  try {
    return mutate(id, r => {
      if (r.seats.filter(s => !s.left).length >= r.max) throw new Error('Every seat is taken.');
      r.seats.push(newSeat(p, r.game === 'poker' ? r.stake : 0));
      note(r, p.name + ' sits down' + (r.game === 'poker' ? ' with ' + sep(r.stake) + ' in chips.' : ' and puts down ' + sep(r.stake) + '.'));
      bump(r, 'join');
      if (r.game === 'duel' && r.seats.length === 2) startDuel(r);
      if (r.game === 'morris' && r.seats.length === 2) startMorris(r);
      if (r.game === 'coin' && r.seats.length === 2) startCoin(r);
      if (r.game === 'rps' && r.seats.length === 2) startRps(r);
      if (r.game === 'draughts' && r.seats.length === 2) startDraughts(r);
      I.playedAt(pid, r.game);
    });
  } catch (e) { I.payback(pid, r0.stake); throw e; }
}

function start(id, pid) {
  return mutate(id, r => {
    if (r.status !== 'open') throw new Error('The game is already under way.');
    if (r.host !== pid) throw new Error('Only the one who opened the table can start it.');
    const n = r.seats.filter(s => !s.left).length;
    if (n < 2) throw new Error('Wait for at least one more player.');
    if (r.game === 'bluff') startBluff(r);
    else if (r.game === 'race') startRace(r);
    else if (r.game === 'poker') { r.status = 'playing'; P.startHand(r); bump(r, 'card'); setDeadline(r); afterPoker(r); }
  });
}

function startDuel(r) {
  r.status = 'playing';
  r.st = { scores: [0, 0], pot: 0, turn: R.int(2), last: [], winner: -1, say: '' };
  r.st.say = r.seats[r.st.turn].name + ' throws first. First to ' + GOAL + ' takes the pot of ' + sep(r.stake * 2) + '.';
  note(r, r.st.say);
  bump(r, 'turn');
  setDeadline(r);
}

function duelAct(r, idx, what) {
  const st = r.st;
  if (st.winner >= 0) throw new Error('The duel is over.');
  if (st.turn !== idx) throw new Error('It is not your throw.');
  const me = r.seats[idx];
  if (what === 'throw') {
    const d = [R.die(), R.die(), R.die()];
    const j = Bn.judge(d);
    st.last = d;
    if (j.frost) {
      st.say = me.name + ' throws ' + d.join(' ') + '. Frost' + (st.pot ? ', and a pot of ' + st.pot + ' melts.' : '.');
      st.pot = 0;
      st.turn = 1 - idx;
      note(r, st.say);
      bump(r, 'dice');
      return;
    }
    st.pot += j.gain;
    if (st.scores[idx] + st.pot >= GOAL) {
      st.scores[idx] += st.pot;
      st.pot = 0;
      st.say = me.name + ' throws ' + d.join(' ') + ' and reaches ' + st.scores[idx] + '.';
      note(r, st.say);
      return finishDuel(r, idx);
    }
    st.say = me.name + ' throws ' + d.join(' ') + (j.luck ? ': three alike, +10' : '') + '. The pot is ' + st.pot + '.';
    bump(r, 'dice');
    return;
  }
  if (what === 'bank') {
    if (!st.pot) throw new Error('There is nothing in the pot to call.');
    st.scores[idx] += st.pot;
    st.say = me.name + ' calls it and banks ' + st.pot + ', for ' + st.scores[idx] + '.';
    note(r, st.say);
    st.pot = 0;
    st.turn = 1 - idx;
    bump(r, 'chip');
    return;
  }
  throw new Error('Throw, or call it.');
}

function payout(r, winners, total) {
  const rake = Math.floor(total * (r.rake || 0) / 100);
  const each = Math.floor((total - rake) / winners.length);
  const pids = winners.map(i => r.seats[i].pid);
  r.seats.forEach(s => {
    const won = pids.includes(s.pid) ? each : 0;
    if (won) I.payback(s.pid, won);
    I.logRound({ patron: s.pid, name: s.name, username: s.username, game: r.game, staked: r.stake, returned: won, detail: { room: r.id, players: r.seats.length } });
  });
  r.result = { winners: pids, amount: each, rake, total };
  return each;
}

const WHAT = { duel: 'the duel', morris: 'the game', coin: 'the toss', rps: 'the bout', draughts: 'the game' };
function finishDuel(r, idx) {
  r.st.winner = idx;
  r.status = 'done';
  const won = payout(r, [idx], r.stake * 2);
  r.st.say = (r.st.say ? r.st.say + ' ' : '') + r.seats[idx].name + ' wins ' + (WHAT[r.game] || 'the game') + ' and takes ' + sep(won) + '.';
  note(r, r.seats[idx].name + ' wins ' + sep(won) + (r.result.rake ? ' (the house keeps ' + sep(r.result.rake) + ')' : '') + '.');
  bump(r, 'end', { winners: r.result.winners });
  r.deadline = 0;
}

const names = r => r.seats.map(s => s.name);

function startMorris(r) {
  r.status = 'playing';
  r.st = M.fresh(R.int(2));
  r.st.say = r.seats[r.st.turn].name + ' plays first, with the light pieces.';
  r.st.light = r.st.turn;
  note(r, r.st.say);
  bump(r, 'turn');
  setDeadline(r);
}
function morrisAct(r, idx, what, b) {
  M.act(r.st, idx, what, b || {}, names(r));
  afterMorris(r);
}
function afterMorris(r) {
  const st = r.st;
  if (st.winner >= 0) { note(r, st.say); return finishDuel(r, st.winner); }
  if (st.draw) {
    r.status = 'done';
    r.seats.forEach(s => { I.payback(s.pid, r.stake); I.logRound({ patron: s.pid, name: s.name, username: s.username, game: r.game, staked: r.stake, returned: r.stake, detail: { room: r.id, draw: true } }); });
    r.result = { winners: [], amount: 0, rake: 0, total: r.stake * 2, draw: true };
    note(r, st.say + ' Both stakes go back.');
    bump(r, 'end', { winners: [] });
    r.deadline = 0;
    return;
  }
  if (st.last && st.last.kind === 'take') note(r, st.say);
  bump(r, st.mustTake ? 'mill' : 'chip');
}

function stakesBack(r, why) {
  r.status = 'done';
  r.seats.forEach(s => { I.payback(s.pid, r.stake); I.logRound({ patron: s.pid, name: s.name, username: s.username, game: r.game, staked: r.stake, returned: r.stake, detail: { room: r.id, draw: true } }); });
  r.result = { winners: [], amount: 0, rake: 0, total: r.stake * r.seats.length, draw: true };
  note(r, why + ' Every stake goes back.');
  bump(r, 'end', { winners: [] });
  r.deadline = 0;
}

function startRace(r) {
  r.seats = r.seats.filter(s => !s.left);
  r.status = 'playing';
  r.st = Rc.fresh(r.seats.length);
  r.st.turn = R.int(r.seats.length);
  r.st.say = 'The gates open. ' + r.seats[r.st.turn].name + ' draws first.';
  note(r, r.st.say);
  bump(r, 'turn');
  setDeadline(r);
}
function raceAct(r, idx, what, b) {
  if (what === 'draw') { Rc.doDraw(r.st, idx, names(r)); bump(r, 'card'); }
  else if (what === 'choose') { Rc.choose(r.st, idx, (b || {}).k, names(r)); note(r, r.st.say); bump(r, /sent back|swept/.test(r.st.say) ? 'mill' : 'chip'); }
  else throw new Error('Draw a card, or choose a move.');
  afterRace(r);
}
function afterRace(r) {
  if (r.st.winner >= 0 && r.status === 'playing') {
    const w = r.st.winner;
    r.status = 'done';
    const won = payout(r, [w], r.stake * r.seats.length);
    note(r, r.seats[w].name + ' wins the race and takes ' + sep(won) + (r.result.rake ? ' (the house keeps ' + sep(r.result.rake) + ')' : '') + '.');
    bump(r, 'end', { winners: r.result.winners });
    r.deadline = 0;
  }
}

function startDraughts(r) {
  r.status = 'playing';
  r.st = Dr.fresh(R.int(2));
  r.st.light = r.st.turn;
  r.st.say = r.seats[r.st.turn].name + ' plays the light pieces and moves first.';
  note(r, r.st.say);
  bump(r, 'turn');
  setDeadline(r);
}
function draughtsAct(r, idx, what, b) {
  if (what !== 'move') throw new Error('Move a piece.');
  const mapped = idx === r.st.light ? 0 : 1;
  Dr.move(r.st, mapped === 0 ? 0 : 1, (b || {}).from, (b || {}).to, draughtsNames(r));
  afterDraughts(r);
}
function draughtsNames(r) { const l = r.st.light; return [r.seats[l].name, r.seats[1 - l].name]; }
function afterDraughts(r) {
  const st = r.st;
  if (st.winner >= 0) { const seat = st.winner === 0 ? st.light : 1 - st.light; note(r, st.say); return finishDuel(r, seat); }
  if (st.draw) return stakesBack(r, st.say);
  bump(r, st.last && st.last.take !== undefined ? 'mill' : 'chip');
}

function startCoin(r) {
  r.status = 'playing';
  r.st = { wins: [0, 0], caller: R.int(2), round: 1, flips: [], winner: -1, say: '' };
  r.st.say = r.seats[r.st.caller].name + ' calls first. First to three.';
  note(r, r.st.say);
  bump(r, 'turn');
  setDeadline(r);
}
function coinCall(r, idx, side) {
  const st = r.st;
  if (st.winner >= 0) throw new Error('The toss is over.');
  if (st.caller !== idx) throw new Error('It is not your call.');
  if (side !== 'heads' && side !== 'tails') throw new Error('Call heads or tails.');
  const fell = R.int(2) ? 'heads' : 'tails';
  const right = fell === side;
  const w = right ? idx : 1 - idx;
  st.wins[w] += 1;
  st.flips.push({ round: st.round, caller: idx, call: side, fell, winner: w });
  st.say = r.seats[idx].name + ' calls ' + side + '. It falls ' + fell + ': a point to ' + r.seats[w].name + '.';
  note(r, st.say);
  if (st.wins[w] >= 3) return finishDuel(r, w);
  st.round += 1;
  st.caller = 1 - idx;
  bump(r, 'coin');
}

function startRps(r) {
  r.status = 'playing';
  r.st = { wins: [0, 0], need: r.bestof === 5 ? 3 : 2, round: 1, pick: [null, null], history: [], winner: -1, miss: [0, 0], say: 'Choose in secret: hammer, shield or spell.' };
  note(r, 'Best of ' + (r.bestof || 3) + '. ' + r.st.say);
  bump(r, 'turn');
  setDeadline(r);
}
function rpsPick(r, idx, what) {
  const st = r.st;
  if (st.winner >= 0) throw new Error('The bout is over.');
  if (!RPS[what]) throw new Error('Choose hammer, shield or spell.');
  if (st.pick[idx] !== null) throw new Error('Your choice is made. Wait for theirs.');
  st.pick[idx] = what;
  st.miss[idx] = 0;
  if (st.pick[0] !== null && st.pick[1] !== null) return rpsReveal(r);
  st.say = r.seats[idx].name + ' has chosen.';
  bump(r, 'chip');
}
function rpsReveal(r, timedOut) {
  const st = r.st;
  const [a, b] = st.pick;
  let w = -1;
  if (a && b) w = a === b ? -1 : (RPS[a] === b ? 0 : 1);
  else if (a && !b) w = 0;
  else if (b && !a) w = 1;
  st.history.push({ round: st.round, picks: [a, b], winner: w, timedOut: !!timedOut });
  const show = i => st.pick[i] ? RPSNAME[st.pick[i]] : 'nothing';
  st.say = r.seats[0].name + ': ' + show(0) + '. ' + r.seats[1].name + ': ' + show(1) + '. ' + (w < 0 ? (a || b ? 'The same: again.' : 'Neither chose. Again.') : r.seats[w].name + ' takes the round.');
  note(r, st.say);
  st.pick = [null, null];
  if (w >= 0) {
    st.wins[w] += 1;
    if (st.wins[w] >= st.need) return finishDuel(r, w);
    st.round += 1;
  }
  bump(r, 'reveal');
}

function longBet(r, idx, amount, b) {
  const lim = I.house().limits.long;
  const a = int(amount);
  const sb = { pp: Math.max(0, int((b || {}).pp) || 0), t3: Math.max(0, int((b || {}).t3) || 0) };
  if ((sb.pp && sb.pp < lim.min) || (sb.t3 && sb.t3 < lim.min)) throw new Error('A side bet is at least ' + sep(lim.min) + '.');
  if (!(a >= lim.min)) throw new Error('The smallest bet is ' + sep(lim.min) + '.');
  if (a > lim.max) throw new Error('The largest bet is ' + sep(lim.max) + '.');
  if (r.st.phase !== 'betting') throw new Error('Wait for the next round to bet.');
  if (r.seats[idx].bet) throw new Error('Your bet is down for this round.');
  I.escrow(r.seats[idx].pid, a + sb.pp + sb.t3);
  L.placeBet(r, idx, a);
  r.seats[idx].sideBet = sb.pp || sb.t3 ? sb : null;
  if (L.allReady(r)) longDeal(r);
  else bump(r, 'chip');
}
function longDeal(r, now) {
  L.deal(r, null, now);
  bump(r, 'card');
  afterLong(r);
}
function longAct(r, idx, what, b) {
  const st = r.st;
  if (what === 'bet') return longBet(r, idx, (b || {}).amount, b);
  if (what === 'insure' || what === 'noinsure') {
    if (st.phase !== 'insurance') throw new Error('No insurance is on offer.');
    const s = r.seats[idx];
    if (!(s.hands && s.hands.length)) throw new Error('You have no hand this round.');
    if (s.insured !== null && s.insured !== undefined) throw new Error('You have answered.');
    if (what === 'insure') I.escrow(s.pid, Math.floor(s.bet / 2));
    L.insure(r, idx, what === 'insure');
    if (L.insuranceDone(r)) { L.afterInsurance(r); bump(r, 'card'); afterLong(r); }
    else bump(r, 'chip');
    return;
  }
  const can = L.canDo(r, idx);
  if (!can) throw new Error('It is not your turn.');
  if (what === 'double' || what === 'split') {
    if (!can[what]) throw new Error(what === 'double' ? 'You can only double on two cards.' : 'Only a pair can be split, up to four hands.');
    I.escrow(r.seats[idx].pid, can.bet);
  }
  L.act(r, idx, what);
  bump(r, what === 'stand' || what === 'surrender' ? 'chip' : 'card');
  afterLong(r);
}
function afterLong(r) {
  if (r.settled) {
    const winners = [];
    r.settled.forEach(x => {
      if (x.returned > 0) I.payback(x.pid, x.returned);
      I.logRound({ patron: x.pid, name: x.name, username: x.username, game: 'long', staked: x.staked, returned: x.returned, detail: { room: r.id, round: r.st.round, dealer: r.st.dealer } });
      if (x.returned > x.staked) winners.push(x.pid);
    });
    note(r, 'Round ' + r.st.round + ': ' + r.st.say);
    r.settled = null;
    bump(r, 'end', { winners });
  }
}

function roll(r) { r.seats.forEach(s => { s.dice = s.out ? [] : Array.from({ length: s.n }, () => R.die()); }); }
const aliveIdx = r => r.seats.map((s, i) => i).filter(i => !r.seats[i].out && !r.seats[i].left && r.seats[i].n > 0);
function nextAlive(r, from) {
  for (let k = 1; k <= r.seats.length; k++) { const i = (from + k) % r.seats.length; if (!r.seats[i].out && !r.seats[i].left && r.seats[i].n > 0) return i; }
  return -1;
}

function startBluff(r) {
  r.status = 'playing';
  r.seats.forEach(s => { s.n = s.left ? 0 : 5; s.out = !!s.left; });
  roll(r);
  const alive = aliveIdx(r);
  r.st = { round: 1, bid: null, turn: alive[R.int(alive.length)], reveal: null, winner: -1, say: '' };
  r.st.say = 'Cups down. ' + r.seats[r.st.turn].name + ' opens the bidding. Ones are wild.';
  note(r, r.st.say);
  bump(r, 'dice');
  setDeadline(r);
}

function totalDice(r) { return r.seats.reduce((n, s) => n + (s.out ? 0 : s.n), 0); }

function bluffBid(r, idx, q, f) {
  const st = r.st;
  if (st.winner >= 0) throw new Error('The game is over.');
  if (st.turn !== idx) throw new Error('It is not your turn to bid.');
  q = int(q); f = int(f);
  if (!(f >= 2 && f <= 6)) throw new Error('Bid on a face from two to six. Ones are wild.');
  if (!(q >= 1)) throw new Error('Bid at least one die.');
  if (q > totalDice(r)) throw new Error('There are only ' + totalDice(r) + ' dice under the cups.');
  if (st.bid && !(q > st.bid.q || (q === st.bid.q && f > st.bid.f))) throw new Error('Raise the bid: more dice, or the same number of a higher face.');
  st.bid = { q, f, by: idx };
  st.say = r.seats[idx].name + ' bids ' + q + ' × ' + f + '.';
  st.turn = nextAlive(r, idx);
  bump(r, 'chip');
}

function bluffCall(r, idx) {
  const st = r.st;
  if (st.winner >= 0) throw new Error('The game is over.');
  if (st.turn !== idx) throw new Error('It is not your turn.');
  if (!st.bid) throw new Error('There is no bid to call yet.');
  const bid = st.bid;
  const count = r.seats.reduce((n, s) => n + (s.out ? 0 : s.dice.filter(d => d === bid.f || d === 1).length), 0);
  const loser = count >= bid.q ? idx : bid.by;
  st.reveal = { round: st.round, bid, count, caller: idx, bidder: bid.by, loser, dice: r.seats.map(s => ({ name: s.name, dice: s.out ? [] : s.dice.slice() })) };
  const L = r.seats[loser];
  L.n -= 1;
  st.say = r.seats[idx].name + ' calls “Liar!” Cups up: ' + count + ' × ' + bid.f + ' on the table. ' + (loser === idx ? r.seats[idx].name + ' was wrong' : r.seats[bid.by].name + ' was bluffing') + ', and loses a die.';
  if (L.n <= 0) { L.out = true; L.dice = []; st.say += ' ' + L.name + ' is out.'; }
  note(r, st.say);
  const alive = aliveIdx(r);
  if (alive.length === 1) return finishBluff(r, alive[0]);
  st.round += 1;
  st.bid = null;
  roll(r);
  st.turn = L.out ? nextAlive(r, loser) : loser;
  bump(r, 'dice');
}

function finishBluff(r, idx) {
  r.st.winner = idx;
  r.status = 'done';
  const won = payout(r, [idx], r.stake * r.seats.length);
  r.st.say += ' ' + r.seats[idx].name + ' is the last with dice and takes ' + sep(won) + '.';
  note(r, r.seats[idx].name + ' wins ' + sep(won) + (r.result.rake ? ' (the house keeps ' + sep(r.result.rake) + ')' : '') + '.');
  bump(r, 'end', { winners: r.result.winners });
  r.deadline = 0;
}

function afterPoker(r) {
  r.seats.forEach(s => { if (s.left && s.stack > 0) { I.payback(s.pid, s.stack); s.stack = 0; } });
  if (r.settled) {
    const winners = [];
    r.settled.forEach(x => {
      I.logRound({ patron: x.pid, name: x.name, username: x.username, game: 'poker', staked: x.staked, returned: x.returned, detail: { room: r.id, hand: r.st.hand } });
      if (x.returned > x.staked) winners.push(x.pid);
    });
    note(r, 'Hand ' + r.st.hand + ': ' + r.st.say + (r.st.last && r.st.last.rake ? ' The house keeps ' + r.st.last.rake + '.' : ''));
    r.settled = null;
    bump(r, 'end', { winners });
  }
}

function act(id, pid, what, b) {
  return mutate(id, r => {
    const idx = seatOf(r, pid);
    if (idx < 0) throw new Error('You are not sitting at this table.');
    if (r.status !== 'playing') throw new Error(r.status === 'open' ? 'The game has not started.' : 'The game is over.');
    const me = r.seats[idx];
    me.timeouts = 0;
    me.away = false;
    if (r.game === 'duel') duelAct(r, idx, what);
    else if (r.game === 'morris') morrisAct(r, idx, what, b);
    else if (r.game === 'coin') { if (what !== 'call') throw new Error('Call heads or tails.'); coinCall(r, idx, String((b || {}).side || '')); }
    else if (r.game === 'rps') { if (what !== 'pick') throw new Error('Choose hammer, shield or spell.'); rpsPick(r, idx, String((b || {}).choice || '')); }
    else if (r.game === 'long') longAct(r, idx, what, b);
    else if (r.game === 'race') raceAct(r, idx, what, b);
    else if (r.game === 'draughts') draughtsAct(r, idx, what, b);
    else if (r.game === 'bluff') { if (what === 'bid') bluffBid(r, idx, (b || {}).q, (b || {}).f); else if (what === 'liar') bluffCall(r, idx); else throw new Error('Bid, or call liar.'); }
    else if (r.game === 'poker') { P.act(r, idx, what, (b || {}).to); bump(r, what === 'fold' ? 'fold' : 'chip'); afterPoker(r); runAuto(r, Date.now()); }
    setDeadline(r);
    I.playedAt(pid, r.game);
  });
}

function runAuto(r, now) {
  let changed = false;
  for (let k = 0; k < 20 && P.live(r.st) && r.st.toAct >= 0; k++) {
    const s = r.seats[r.st.toAct];
    if (!(s.away || s.left)) break;
    P.autoMove(r, r.st.toAct, null, now);
    changed = true;
    afterPoker(r);
  }
  if (changed) setDeadline(r, now);
  return changed;
}

function leave(id, pid) {
  return mutate(id, r => {
    const idx = seatOf(r, pid);
    if (idx < 0) throw new Error('You are not sitting at this table.');
    const me = r.seats[idx];
    if (r.status === 'open') {
      I.payback(pid, r.game === 'poker' ? me.stack : r.stake);
      r.seats.splice(idx, 1);
      note(r, me.name + ' gets up and takes their stake back.');
      if (!r.seats.length) { r.status = 'done'; r.result = { winners: [], amount: 0, rake: 0, total: 0, empty: true }; }
      else if (r.host === pid) r.host = r.seats[0].pid;
      bump(r, 'join');
      return;
    }
    if (r.status === 'done') { me.left = true; bump(r); return; }
    if (r.game === 'long') {
      if (r.st.phase === 'betting' && me.bet) { I.payback(pid, me.bet + (me.sideBet ? (me.sideBet.pp || 0) + (me.sideBet.t3 || 0) : 0)); me.bet = 0; me.sideBet = null; }
      me.left = true;
      note(r, me.name + ' gets up from the long table.');
      if (r.st.phase === 'play' && r.st.active && r.st.active.seat === idx) { me.hands.forEach(h => { h.done = true; }); L.nextHand(r); afterLong(r); }
      if (r.st.phase === 'insurance' && L.insuranceDone(r)) { L.afterInsurance(r); afterLong(r); }
      if (!r.seats.some(s => !s.left) && r.st.phase !== 'play' && r.st.phase !== 'insurance') { r.status = 'done'; r.result = { winners: [], amount: 0, rake: 0, total: 0, empty: true }; }
      bump(r, 'join');
      setDeadline(r);
      return;
    }
    if (r.game === 'race') {
      note(r, me.name + ' walks away from the race and forfeits the stake.');
      Rc.forfeit(r.st, idx, names(r));
      me.left = true;
      afterRace(r);
      if (r.status === 'playing') { bump(r, 'join'); setDeadline(r); }
      return;
    }
    if (TWO.includes(r.game)) {
      note(r, me.name + ' walks away and forfeits.');
      r.st.say = me.name + ' walks away.';
      if (r.st.scores) r.st.scores[idx] = Math.min(r.st.scores[idx], GOAL - 1);
      return finishDuel(r, 1 - idx);
    }
    if (r.game === 'bluff') {
      me.left = true; me.out = true; me.n = 0; me.dice = [];
      note(r, me.name + ' leaves the table and forfeits the ante.');
      const alive = aliveIdx(r);
      if (alive.length === 1) { r.st.say = me.name + ' leaves.'; return finishBluff(r, alive[0]); }
      if (r.st.turn === idx) { r.st.turn = nextAlive(r, idx); if (r.st.bid && r.st.bid.by === r.st.turn) r.st.bid = null; }
      bump(r, 'join');
      setDeadline(r);
      return;
    }
    if (r.game === 'poker') {
      if (P.live(r.st) && me.inHand && !me.folded) {
        if (r.st.toAct === idx) { P.act(r, idx, 'fold', 0); afterPoker(r); }
        else me.folded = true;
      }
      me.left = true;
      const cash = me.stack;
      me.stack = 0;
      I.payback(pid, cash);
      note(r, me.name + ' cashes in ' + sep(cash) + ' and leaves the table.');
      if (P.live(r.st) && r.seats.filter(P.inn).length === 1) { P.award(r, null, Date.now(), false); afterPoker(r); }
      if (!r.seats.some(s => !s.left)) { r.status = 'done'; r.result = { winners: [], amount: 0, rake: 0, total: 0 }; }
      runAuto(r, Date.now());
      bump(r, 'join');
      setDeadline(r);
    }
  });
}

function rebuy(id, pid) {
  const r0 = get(id);
  if (!r0 || r0.game !== 'poker' || r0.status === 'done') throw new Error('There is no table to buy into.');
  const idx = seatOf(r0, pid);
  if (idx < 0) throw new Error('You are not sitting at this table.');
  if (r0.seats[idx].stack > 0) throw new Error('You still have chips.');
  I.escrow(pid, r0.stake);
  return mutate(id, r => { const s = r.seats[seatOf(r, pid)]; s.stack += r.stake; note(r, s.name + ' buys in again for ' + sep(r.stake) + '.'); bump(r, 'chip'); });
}

function back(id, pid) { return mutate(id, r => { const i = seatOf(r, pid); if (i >= 0) { r.seats[i].away = false; r.seats[i].timeouts = 0; bump(r); } }); }

function say(id, pid, text) {
  const t = clean(text, 200);
  if (!t) throw new Error('Say something.');
  return mutate(id, r => {
    const i = r.seats.findIndex(s => s.pid === pid);
    if (i < 0) throw new Error('Only those at the table can speak at it.');
    r.chat.push({ at: new Date().toISOString(), name: r.seats[i].name, text: t });
    r.chat = r.chat.slice(-40);
    bump(r, 'talk');
  });
}

function tick(id, nowMs) {
  const now = nowMs || Date.now();
  const r0 = get(id);
  if (!r0) return null;
  const due = r0.status === 'playing' && ((r0.deadline && now > r0.deadline) || (r0.game === 'poker' && (r0.st.street === 'between' || r0.st.street === 'waiting') && now >= (r0.st.nextAt || 0)) || (r0.game === 'poker' && P.live(r0.st) && r0.st.toAct >= 0 && (r0.seats[r0.st.toAct].away || r0.seats[r0.st.toAct].left)));
  const stale = r0.status === 'open' && now - Date.parse(r0.updated) > 3 * 3600000;
  if (!due && !stale) return r0;
  return mutate(id, r => {
    if (r.status === 'open' && now - Date.parse(r.updated) > 3 * 3600000) {
      r.seats.forEach(s => I.payback(s.pid, r.game === 'poker' ? s.stack : r.stake));
      r.status = 'done';
      r.result = { winners: [], amount: 0, rake: 0, total: 0, empty: true };
      note(r, 'Nobody else came. The stakes are handed back.');
      bump(r, 'join');
      return;
    }
    if (r.status !== 'playing') return;
    if (r.game === 'poker') {
      if ((r.st.street === 'between' || r.st.street === 'waiting') && now >= (r.st.nextAt || 0)) {
        r.seats.forEach(s => {
          if (s.away && !s.left && now - (s.awayAt || now) > AWAY) {
            s.left = true;
            if (s.stack > 0) I.payback(s.pid, s.stack);
            note(r, s.name + ' has been away too long and is cashed in for ' + sep(s.stack) + '.');
            s.stack = 0;
          }
        });
        if (!r.seats.some(s => !s.left)) { r.status = 'done'; r.result = { winners: [], amount: 0, rake: 0, total: 0 }; bump(r, 'join'); return; }
        if (P.players(r).length >= 2) { P.startHand(r, null, now); bump(r, 'card'); afterPoker(r); runAuto(r, now); setDeadline(r, now); }
        else { r.st.nextAt = now + 4000; if (r.st.street !== 'waiting') { r.st.street = 'waiting'; r.st.say = 'Waiting for a second player with chips.'; bump(r); } }
        return;
      }
      if (runAuto(r, now)) { bump(r, 'chip'); return; }
      if (P.live(r.st) && r.st.toAct >= 0 && r.deadline && now > r.deadline) {
        const s = r.seats[r.st.toAct];
        s.timeouts += 1;
        if (s.timeouts >= 2) { s.away = true; s.awayAt = now; }
        note(r, s.name + ' takes too long' + (s.away ? ' and is marked away.' : '.'));
        P.autoMove(r, r.st.toAct, null, now);
        afterPoker(r);
        runAuto(r, now);
        bump(r, 'chip');
        setDeadline(r, now);
      }
      return;
    }
    if (!(r.deadline && now > r.deadline)) return;
    if (r.game === 'long') return tickLong(r, now);
    if (r.game === 'rps') {
      const st = r.st;
      [0, 1].forEach(i => { if (st.pick[i] === null) { st.miss[i] += 1; r.seats[i].timeouts += 1; } });
      const gone = [0, 1].filter(i => st.miss[i] >= 3);
      if (gone.length === 1) { note(r, r.seats[gone[0]].name + ' let three rounds pass and forfeits.'); st.say = ''; return finishDuel(r, 1 - gone[0]); }
      if (gone.length === 2) {
        r.status = 'done';
        r.seats.forEach(x => { I.payback(x.pid, r.stake); I.logRound({ patron: x.pid, name: x.name, username: x.username, game: 'rps', staked: r.stake, returned: r.stake, detail: { room: r.id, abandoned: true } }); });
        r.result = { winners: [], amount: 0, rake: 0, total: r.stake * 2, draw: true };
        note(r, 'Neither chose three times running. Both stakes go back.');
        bump(r, 'end', { winners: [] });
        r.deadline = 0;
        return;
      }
      rpsReveal(r, true);
      setDeadline(r, now);
      return;
    }
    const idx = turnIdx(r);
    if (idx < 0) return;
    const s = r.seats[idx];
    s.timeouts += 1;
    if (r.game === 'race') {
      if (s.timeouts >= 3) { note(r, s.name + ' let three turns pass and is out of the race.'); s.left = true; Rc.forfeit(r.st, idx, names(r)); afterRace(r); if (r.status === 'playing') { bump(r, 'turn'); setDeadline(r, now); } return; }
      note(r, s.name + ' takes too long; the table plays for them.');
      Rc.autoPlay(r.st, idx, names(r));
      note(r, r.st.say);
      bump(r, 'chip');
      afterRace(r);
      if (r.status === 'playing') setDeadline(r, now);
      return;
    }
    if (r.game === 'draughts') {
      if (s.timeouts >= 3) { note(r, s.name + ' let the move pass three times and forfeits.'); r.st.say = ''; return finishDuel(r, 1 - idx); }
      note(r, s.name + ' takes too long; the table moves for them.');
      const mapped = idx === r.st.light ? 0 : 1;
      do { Dr.autoMove(r.st, mapped, draughtsNames(r)); } while (r.st.chain >= 0 && r.st.winner < 0);
      afterDraughts(r);
      if (r.status === 'playing') setDeadline(r, now);
      return;
    }
    if (r.game === 'morris') {
      if (s.timeouts >= 3) { note(r, s.name + ' let the move pass three times and forfeits.'); r.st.say = ''; return finishDuel(r, 1 - idx); }
      note(r, s.name + ' takes too long; the table moves for them.');
      M.autoMove(r.st, idx, names(r));
      afterMorris(r);
      setDeadline(r, now);
      return;
    }
    if (r.game === 'coin') {
      if (s.timeouts >= 3) { note(r, s.name + ' let the call pass three times and forfeits.'); r.st.say = ''; return finishDuel(r, 1 - idx); }
      coinCall(r, idx, R.int(2) ? 'heads' : 'tails');
      if (r.status === 'playing') setDeadline(r, now);
      return;
    }
    if (r.game === 'duel') {
      if (s.timeouts >= 3) { note(r, s.name + ' let the turn pass three times and forfeits.'); r.st.say = s.name + ' forfeits.'; return finishDuel(r, 1 - idx); }
      if (r.st.pot) duelAct(r, idx, 'bank');
      else { r.st.turn = 1 - idx; r.st.say = s.name + ' lets the turn pass.'; note(r, r.st.say); bump(r, 'turn'); }
    } else if (r.game === 'bluff') {
      if (s.timeouts >= 3) {
        s.out = true; s.n = 0; s.dice = [];
        note(r, s.name + ' sat silent three times and is out.');
        const alive = aliveIdx(r);
        if (alive.length === 1) { r.st.say = s.name + ' is out.'; return finishBluff(r, alive[0]); }
        r.st.turn = nextAlive(r, idx);
        if (r.st.bid && r.st.bid.by === r.st.turn) r.st.bid = null;
        bump(r, 'turn');
      } else if (r.st.bid && r.st.bid.by !== idx) bluffCall(r, idx);
      else bluffBid(r, idx, r.st.bid ? r.st.bid.q + 1 : 1, r.st.bid ? r.st.bid.f : 2 + R.int(5));
    }
    setDeadline(r, now);
  });
}

function tickLong(r, now) {
  const st = r.st;
  if (st.phase === 'betting') {
    if (r.seats.some(s => s.bet > 0)) longDeal(r, now);
    else if (!r.seats.some(s => !s.left)) { r.status = 'done'; r.result = { winners: [], amount: 0, rake: 0, total: 0, empty: true }; bump(r, 'join'); }
    else { st.nextAt = now + L.BETWIN; r.idle = (r.idle || 0) + 1; if (r.idle >= 45) { r.status = 'done'; r.result = { winners: [], amount: 0, rake: 0, total: 0, empty: true }; note(r, 'Nobody has bet for a quarter of an hour. Brannoc clears the table.'); bump(r, 'join'); } }
  } else if (st.phase === 'insurance') { L.afterInsurance(r, null, now); bump(r, 'card'); afterLong(r); }
  else if (st.phase === 'play' && st.active) {
    const s = r.seats[st.active.seat];
    s.timeouts += 1;
    note(r, s.name + ' takes too long and stands.');
    L.act(r, st.active.seat, 'stand', null, now);
    bump(r, 'chip');
    afterLong(r);
  } else if (st.phase === 'done') {
    r.idle = r.seats.some(s => s.staked > 0) ? 0 : r.idle || 0;
    if (!r.seats.some(s => !s.left)) { r.status = 'done'; r.result = { winners: [], amount: 0, rake: 0, total: 0, empty: true }; bump(r, 'join'); }
    else { L.newRound(r, now); bump(r, 'turn'); }
  }
  setDeadline(r, now);
}

function open() { return rooms().filter(r => r.status !== 'done').sort((a, b) => b.updated.localeCompare(a.updated)); }
function recent() { return rooms().filter(r => r.status === 'done' && !(r.result && r.result.empty)).sort((a, b) => b.updated.localeCompare(a.updated)).slice(0, 8); }

module.exports = { TWO, RPS, RPSNAME, MAXSEATS, GOAL, rooms, get, open, recent, create, join, start, act, leave, rebuy, back, say, tick, seatOf, liveRoomOf, turnIdx, totalDice };
