const S = require('./store');
const U = require('./users');
const T = require('./town');
const J = require('./innjack');
const Wh = require('./innwheel');
const Hz = require('./innhazard');
const Hl = require('./innhilo');
const Bn = require('./bones');

const PATRONS = 'inn-patrons.json';
const HOUSE = 'inn-house.json';
const TABLES = 'inn-tables.json';
const BETS = 'inn-bets.jsonl';
const PURSE = 'inn-purse.jsonl';
const OUTCOMES = 'inn-outcomes.json';
const LUCK = 'inn-luck.json';
const KEEPER = 'Old Brannoc';

const GAMES = [
  { id: 'cards', name: 'Twenty-one', short: 'Twenty-one', theory: 'About 0.5% when played by the book; more for loose play.' },
  { id: 'wheel', name: 'The Wheel of Fortune', short: 'The Wheel', theory: '2.70% on every bet: one green zero in 37 pockets.' },
  { id: 'hazard', name: 'Hjalmar’s Hazard', short: 'Hazard', theory: 'About 1.5% on the main bet; side bets 2.8% to 16.7%.' },
  { id: 'redblack', name: 'Red or Black', short: 'Red or Black', theory: '4% on each call, so more the longer you ride.' },
  { id: 'bones', name: 'Bones', short: 'Bones', theory: 'About even: you and Brannoc take turns throwing first.' }
];
const GAME = Object.fromEntries(GAMES.map(g => [g.id, g]));
const IDS = GAMES.map(g => g.id);
const DEFAULT_LIMITS = { min: 5, max: 500 };

const clean = (v, n) => String(v === undefined || v === null ? '' : v).replace(/[\r\n]+/g, ' ').trim().slice(0, n);
const int = v => { const n = Math.floor(Number(String(v === undefined || v === null ? '' : v).replace(/[,\s]/g, ''))); return Number.isFinite(n) ? n : NaN; };
const septims = n => Number(n || 0).toLocaleString('en-US');
const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const id = () => S.id();

function house() {
  const h = S.read(HOUSE, {});
  const limits = {};
  IDS.forEach(g => { const l = (h.limits || {})[g] || {}; limits[g] = { min: l.min || DEFAULT_LIMITS.min, max: l.max || DEFAULT_LIMITS.max }; });
  return { limits, dailyCap: h.dailyCap || 0, anyTen: !!h.anyTen, hitSoft17: !!h.hitSoft17, updatedBy: h.updatedBy || '', updatedAt: h.updatedAt || '' };
}

function setHouse(b, by) {
  const out = { limits: {}, dailyCap: 0, anyTen: b.anyTen === '1' || b.anyTen === 'on', hitSoft17: b.hitSoft17 === '1' || b.hitSoft17 === 'on', updatedBy: by ? by.name : '', updatedAt: new Date().toISOString() };
  IDS.forEach(g => {
    const min = int(b['min_' + g]), max = int(b['max_' + g]);
    if (!(min >= 1) || !(max >= 1)) throw new Error('Give every table a smallest and a largest stake of at least 1.');
    if (max < min) throw new Error(GAME[g].name + ': the largest stake is smaller than the smallest.');
    if (max > 1000000) throw new Error('No table takes more than 1,000,000 at once.');
    out.limits[g] = { min, max };
  });
  const cap = b.dailyCap === '' || b.dailyCap === undefined ? 0 : int(b.dailyCap);
  if (!(cap >= 0)) throw new Error('The daily loss cap is a number of septims, or 0 for none.');
  out.dailyCap = cap;
  S.write(HOUSE, out);
  return house();
}

const patrons = () => S.read(PATRONS, []);
const savePatrons = rows => S.write(PATRONS, rows);
const find = pid => patrons().find(p => p.id === String(pid || '')) || null;
const byUser = username => patrons().find(p => p.kind === 'login' && p.username === String(username || '')) || null;

function current(req) {
  if (req.user) return byUser(req.user.username);
  const pid = req.session && req.session.innPatron;
  if (!pid) return null;
  const p = find(pid);
  return p && p.kind === 'guest' ? p : null;
}

function ask(b, user) {
  const rows = patrons();
  if (user) {
    const had = rows.find(p => p.kind === 'login' && p.username === user.username);
    if (had && had.status === 'waiting') throw new Error('You have asked already. The innkeeper will see to you.');
    if (had && had.status === 'seated') throw new Error('You have a seat already.');
    if (had) throw new Error('The innkeeper has turned you away. See the inn’s keepers in game.');
    const p = { id: id(), kind: 'login', username: user.username, name: user.name, who: clean(user.title || user.officeName || '', 80), status: 'waiting', purse: 0, at: new Date().toISOString(), day: { date: today(), net: 0 } };
    rows.push(p);
    savePatrons(rows);
    return p;
  }
  const name = clean(b.name, 40);
  const pass = String(b.pass || '');
  const who = clean(b.who, 80);
  if (name.length < 2) throw new Error('Give the innkeeper a name of at least two letters.');
  if (pass.length < 6) throw new Error('Choose a passphrase of at least six letters. You need it to sit down again.');
  if (pass.length > 100) throw new Error('That passphrase is too long.');
  const key = name.toLowerCase();
  if (rows.some(p => p.kind === 'guest' && p.key === key)) throw new Error('That name has asked already. Sign in with your passphrase, or see the innkeeper in game.');
  if (U.list().some(u => String(u.name || '').toLowerCase() === key)) throw new Error('That name belongs to an officer of the County. Officers enter the hall and sit down as themselves.');
  const p = { id: id(), kind: 'guest', name, key, pass: U.hash(pass), who, status: 'waiting', purse: 0, at: new Date().toISOString(), day: { date: today(), net: 0 } };
  rows.push(p);
  savePatrons(rows);
  return p;
}

function signIn(name, pass) {
  const key = clean(name, 40).toLowerCase();
  const p = patrons().find(x => x.kind === 'guest' && x.key === key);
  if (!p || !U.verify(String(pass || ''), p.pass)) throw new Error('The innkeeper does not know that name and passphrase.');
  return p;
}

function decide(pid, action, by) {
  const rows = patrons();
  const p = rows.find(x => x.id === String(pid || ''));
  if (!p) throw new Error('There is no such patron.');
  let pass = '';
  if (action === 'accept') { p.status = 'seated'; p.decidedAt = new Date().toISOString(); p.decidedBy = by.name; }
  else if (action === 'turn') { p.status = 'turned'; p.decidedAt = new Date().toISOString(); p.decidedBy = by.name; }
  else if (action === 'forget') {
    if (p.purse > 0) throw new Error('Their purse still holds ' + septims(p.purse) + '. Take it to nothing before you forget them.');
    const tables = S.read(TABLES, {});
    if (tables[p.id]) { delete tables[p.id]; S.write(TABLES, tables); }
    savePatrons(rows.filter(x => x !== p));
    return { patron: p, pass: '' };
  } else if (action === 'resetpass') {
    if (p.kind !== 'guest') throw new Error('Officers sign in with their hall password.');
    pass = U.tempPassword();
    p.pass = U.hash(pass);
  } else throw new Error('The ledger does not know that.');
  savePatrons(rows);
  return { patron: p, pass };
}

function purseLog(row) { S.append(PURSE, row); }
function purseLines() { return S.lines(PURSE); }

function purse(pid, kind, amount, note, by) {
  const rows = patrons();
  const p = rows.find(x => x.id === String(pid || ''));
  if (!p) throw new Error('There is no such patron.');
  const a = int(amount);
  if (!(a >= 0) || a > 100000000) throw new Error('Give a number of septims.');
  const before = p.purse;
  if (kind === 'add') { if (a < 1) throw new Error('Add at least one septim.'); p.purse += a; }
  else if (kind === 'take') { if (a < 1) throw new Error('Take at least one septim.'); if (a > p.purse) throw new Error('Their purse holds only ' + septims(p.purse) + '.'); p.purse -= a; }
  else if (kind === 'set') p.purse = a;
  else throw new Error('Add, take or set.');
  savePatrons(rows);
  purseLog({ at: new Date().toISOString(), patron: p.id, name: p.name, kind, amount: a, before, after: p.purse, by: by.username, byName: by.name, note: clean(note, 140), own: p.kind === 'login' && p.username === by.username });
  return p;
}

let cache = null;
function bets() {
  if (!cache) cache = S.lines(BETS);
  return cache;
}
function logBet(row) {
  S.append(BETS, row);
  if (cache) cache.push(row);
}
function resetCache() { cache = null; }

function outcomes() { return S.read(OUTCOMES, {}); }
function addOutcome(game, o) {
  const all = outcomes();
  all[game] = [o].concat(all[game] || []).slice(0, 20);
  S.write(OUTCOMES, all);
}

function dayRoll(p) {
  const d = today();
  if (!p.day || p.day.date !== d) p.day = { date: d, net: 0 };
}

function stake(p, amount, h) {
  if (!(amount >= 1)) throw new Error('Name a stake.');
  if (amount > p.purse) throw new Error(p.purse ? 'Your purse holds only ' + septims(p.purse) + '.' : 'Your purse is empty. See the innkeeper in game.');
  if (h.dailyCap > 0) {
    const lost = Math.max(0, -p.day.net);
    if (lost + amount > h.dailyCap) throw new Error('The house takes no more than ' + septims(h.dailyCap) + ' from anyone in a day. You are down ' + septims(lost) + ' today.');
  }
  p.purse -= amount;
  p.day.net -= amount;
}
function credit(p, amount) {
  if (!amount) return;
  p.purse += amount;
  p.day.net += amount;
}

function inLimits(lim, amount, what) {
  if (!(amount >= lim.min)) throw new Error('The smallest ' + (what || 'stake') + ' at this table is ' + septims(lim.min) + '.');
  if (amount > lim.max) throw new Error('The largest ' + (what || 'stake') + ' at this table is ' + septims(lim.max) + '.');
}

const rulesOf = h => ({ anyTen: h.anyTen, hitSoft17: h.hitSoft17 });

function playCards(p, mine, what, b, h, lim) {
  const t = mine.cards || (mine.cards = J.fresh());
  const rules = rulesOf(h);
  if (what === 'deal') {
    const bet = int(b.bet);
    inLimits(lim, bet);
    stake(p, bet, h);
    J.deal(t, bet, rules);
  } else if (what === 'insure' || what === 'noinsure') {
    if (!t.round || t.round.phase !== 'insurance') throw new Error('No insurance is on offer.');
    if (what === 'insure') { const ins = Math.floor(t.round.bet / 2); stake(p, ins, h); }
    J.insure(t, what === 'insure', rules);
  } else if (['hit', 'stand', 'double', 'split', 'surrender'].includes(what)) {
    if (!t.round || t.round.phase !== 'play') throw new Error('Place a stake and deal first.');
    const can = J.canDo(t, rules, p.purse);
    const hb = t.round.hands[t.round.active].bet;
    if (what === 'double') { if (!J.canDo(t, rules, Infinity).double) throw new Error('You can only double on two cards.'); stake(p, hb, h); }
    if (what === 'split') { if (!J.canDo(t, rules, Infinity).split) throw new Error('Only a pair can be split, up to four hands.'); stake(p, hb, h); }
    if (what === 'surrender' && !can.surrender) throw new Error('You can only surrender your first two cards.');
    J.act(t, what, rules);
  } else throw new Error('The innkeeper does not follow.');
  const r = t.round;
  if (r && r.phase === 'done' && !r.paid) {
    r.paid = true;
    credit(p, r.returned);
    return { settled: { staked: r.staked, returned: r.returned, detail: { hands: r.hands.map(x => ({ cards: x.cards, result: x.result, bet: x.bet })), dealer: r.dealer, bj: r.hands[0].result === 'blackjack' } }, outcome: J.outcome(t), streak: t.streak };
  }
  return {};
}

function playWheel(p, mine, what, b, h, lim) {
  if (what !== 'spin') throw new Error('The wheel only spins.');
  let raw = b.bets;
  if (typeof raw === 'string') { try { raw = JSON.parse(raw); } catch (_) { raw = {}; } }
  const bets = Wh.clean(raw);
  const keys = Object.keys(bets);
  if (!keys.length) throw new Error('Put a chip on the cloth first.');
  if (keys.length > 60) throw new Error('That is more places than the cloth holds.');
  keys.forEach(k => { if (bets[k] < lim.min) throw new Error('Every place needs at least ' + septims(lim.min) + ' on it.'); });
  const sum = keys.reduce((n, k) => n + bets[k], 0);
  if (sum > lim.max) throw new Error('The most on one spin is ' + septims(lim.max) + '.');
  stake(p, sum, h);
  const r = Wh.spin(bets);
  credit(p, r.returned);
  mine.wheel = { last: r, bets };
  return { settled: { staked: r.staked, returned: r.returned, detail: { n: r.n, lines: r.lines.map(l => [l.label, l.amount, l.ret]) } }, outcome: { n: r.n, c: r.colour }, spin: r.n };
}

function sideOf(b, lim) {
  const amount = int(b.sideAmount);
  const total = int(b.sideTotal);
  if (!(amount >= 1)) return null;
  if (!Hz.SIDE[total]) throw new Error('A side bet names a total from 2 to 12.');
  inLimits(lim, amount, 'side bet');
  return { total, amount };
}

function playHazard(p, mine, what, b, h, lim) {
  let g = mine.hazard || Hz.fresh();
  if (what === 'start') {
    const bet = int(b.bet);
    const main = int(b.main);
    inLimits(lim, bet);
    const side = sideOf(b, lim);
    if (!Hz.MAINS.includes(main)) throw new Error('The main must be five to nine.');
    if (Hz.live(g)) throw new Error('Finish this throw first.');
    stake(p, bet + (side ? side.amount : 0), h);
    g = Hz.start(g, bet, main, side);
  } else if (what === 'throw') {
    if (!Hz.live(g)) throw new Error('Name a main and stake to start.');
    const side = sideOf(b, lim);
    if (side) stake(p, side.amount, h);
    g = Hz.again(g, side);
  } else throw new Error('Hjalmar does not follow.');
  mine.hazard = g;
  const owed = g.returned - (g.paidSoFar || 0);
  if (owed > 0) { credit(p, owed); g.paidSoFar = (g.paidSoFar || 0) + owed; }
  if (g.phase === 'done' && !g.logged) {
    g.logged = true;
    return { settled: { staked: g.staked, returned: g.returned, detail: { main: g.main, chance: g.chance, throws: g.throws, result: g.result } }, outcome: { main: g.main, t: g.throws.map(d => d[0] + d[1]), r: g.result } };
  }
  return {};
}

function playRedBlack(p, mine, what, b, h, lim) {
  let g = mine.redblack || Hl.fresh();
  if (what === 'start') {
    const bet = int(b.bet);
    inLimits(lim, bet);
    if (Hl.live(g)) throw new Error('Finish this run first.');
    stake(p, bet, h);
    g = Hl.start(g, bet, lim.max * Hl.CAP);
  } else if (what === 'hi' || what === 'lo') g = Hl.call(g, what);
  else if (what === 'take') g = Hl.cashOut(g);
  else throw new Error('Higher, lower, or take it.');
  mine.redblack = g;
  if (g.phase === 'done' && !g.logged) {
    g.logged = true;
    credit(p, g.returned);
    return { settled: { staked: g.stake, returned: g.returned, detail: { turned: g.turned, calls: g.calls, result: g.result } }, outcome: { cards: g.turned.slice(-6), r: g.result } };
  }
  return {};
}

function playBones(p, mine, what, b, h, lim) {
  let g = mine.bones || Bn.blank();
  let steps = [];
  if (what === 'start') {
    const bet = int(b.bet);
    inLimits(lim, bet);
    if (!g.over) throw new Error('Finish this game first.');
    stake(p, bet, h);
    const r = Bn.start(g, bet);
    g = r.game; steps = r.steps;
  } else if (what === 'throw' || what === 'bank') {
    const r = Bn.act(g, what);
    g = r.game; steps = r.steps;
  } else throw new Error('The innkeeper does not follow.');
  mine.bones = g;
  const res = { steps };
  if (g.over && !g.logged) {
    g.logged = true;
    const ret = g.winner === 'you' ? g.stake * 2 : 0;
    credit(p, ret);
    res.settled = { staked: g.stake, returned: ret, detail: { you: g.you, inn: g.inn, best: g.best, won: g.winner === 'you' } };
    res.outcome = { w: g.winner, you: g.you, inn: g.inn };
  }
  return res;
}

const PLAY = { cards: playCards, wheel: playWheel, hazard: playHazard, redblack: playRedBlack, bones: playBones };

function act(pid, game, what, b) {
  if (!PLAY[game]) throw new Error('There is no such table.');
  const rows = patrons();
  const p = rows.find(x => x.id === String(pid || ''));
  if (!p) throw new Error('Ask for a seat first.');
  if (p.status !== 'seated') throw new Error(p.status === 'waiting' ? 'The innkeeper has not seated you yet.' : 'The innkeeper has turned you away.');
  const h = house();
  const tables = S.read(TABLES, {});
  const mine = tables[p.id] || (tables[p.id] = {});
  dayRoll(p);
  const out = PLAY[game](p, mine, what, b || {}, h, h.limits[game]);
  tables[p.id] = mine;
  S.write(TABLES, tables);
  savePatrons(rows);
  if (out.settled) {
    const s = out.settled;
    logBet({ id: id(), at: new Date().toISOString(), patron: p.id, name: p.name, username: p.username || '', game, staked: s.staked, returned: s.returned, net: s.returned - s.staked, detail: s.detail });
    if (out.outcome) addOutcome(game, out.outcome);
  }
  out.purse = p.purse;
  out.patron = { id: p.id, name: p.name, username: p.username || '' };
  if (game === 'cards' && out.settled && out.streak === 5) {
    out.luck = true;
    const l = S.read(LUCK, []);
    l.unshift({ at: new Date().toISOString(), patron: p.id, name: p.name, username: p.username || '' });
    S.write(LUCK, l.slice(0, 200));
  }
  return out;
}

function table(pid, game) {
  const tables = S.read(TABLES, {});
  const mine = tables[String(pid || '')] || {};
  if (game === 'cards') return mine.cards || J.fresh();
  if (game === 'wheel') return mine.wheel || Wh.fresh();
  if (game === 'hazard') return mine.hazard || Hz.fresh();
  if (game === 'redblack') return mine.redblack || Hl.fresh();
  if (game === 'bones') return mine.bones || Bn.blank();
  return null;
}

function weekBets(key) { return bets().filter(x => T.inWeek(x.at, key)); }

function week(key) {
  const list = weekBets(key);
  const staked = list.reduce((n, x) => n + x.staked, 0);
  const returned = list.reduce((n, x) => n + x.returned, 0);
  const win = list.slice().sort((a, b) => b.net - a.net)[0];
  const loss = list.slice().sort((a, b) => a.net - b.net)[0];
  const byGame = {};
  GAMES.forEach(g => {
    const l = list.filter(x => x.game === g.id);
    const st = l.reduce((n, x) => n + x.staked, 0), rt = l.reduce((n, x) => n + x.returned, 0);
    byGame[g.id] = { rounds: l.length, staked: st, returned: rt, house: st - rt, edge: st ? (st - rt) / st : 0 };
  });
  return {
    rounds: list.length, staked, returned, house: staked - returned,
    bigWin: win && win.net > 0 ? { name: win.name, game: GAME[win.game].short, net: win.net } : null,
    bigLoss: loss && loss.net < 0 ? { name: loss.name, game: GAME[loss.game].short, net: -loss.net } : null,
    byGame
  };
}

function weekLine(w) {
  if (!w || !w.rounds) return '';
  const bits = [];
  if (w.bigWin) bits.push(w.bigWin.name + ' took ' + septims(w.bigWin.net) + ' septims off the house at ' + w.bigWin.game + ', the biggest win of the week.');
  if (w.bigLoss) bits.push(w.bigLoss.name + ' lost ' + septims(w.bigLoss.net) + ' at ' + w.bigLoss.game + ', the biggest loss.');
  bits.push('The house ended the week ' + (w.house === 0 ? 'even' : septims(Math.abs(w.house)) + (w.house > 0 ? ' up' : ' down')) + ' over ' + septims(w.rounds) + (w.rounds === 1 ? ' round.' : ' rounds.'));
  return bits.join(' ');
}

function board(game, key) {
  const list = weekBets(key).filter(x => x.game === game);
  const by = {};
  list.forEach(x => {
    const k = (x.username ? 'u:' + x.username : 'g:' + x.name).toLowerCase();
    by[k] = by[k] || { name: x.name, wins: 0, hands: 0, games: 0, bj: 0, best: 0 };
    by[k].hands++; by[k].games++;
    if (x.net > 0) by[k].wins++;
    if (x.detail && x.detail.bj) by[k].bj++;
    if (x.detail && x.detail.best) by[k].best = Math.max(by[k].best, x.detail.best);
  });
  const rows = Object.values(by);
  const top = rows.filter(r => r.wins).sort((a, b) => b.wins - a.wins || a.hands - b.hands).slice(0, 10);
  const lucky = game === 'bones' ? (rows.slice().sort((a, b) => b.best - a.best)[0] || null) : (rows.filter(r => r.bj).sort((a, b) => b.bj - a.bj)[0] || null);
  return { hands: list.length, games: list.length, keeperWins: list.filter(x => x.net < 0).length, top, lucky: lucky && (lucky.bj || lucky.best) ? lucky : null };
}

function record(pid) {
  const mine = bets().filter(x => x.patron === String(pid || ''));
  const staked = mine.reduce((n, x) => n + x.staked, 0), returned = mine.reduce((n, x) => n + x.returned, 0);
  return { rounds: mine.length, staked, returned, net: returned - staked, wins: mine.filter(x => x.net > 0).length, losses: mine.filter(x => x.net < 0).length, last: mine.slice(-50).reverse(), purse: purseLines().filter(x => x.patron === String(pid || '')).slice(-20).reverse() };
}

function ledger() {
  const rows = patrons();
  const bucket = s => rows.filter(p => p.status === s).sort((a, b) => String(a.name).localeCompare(String(b.name)));
  return { waiting: rows.filter(p => p.status === 'waiting').sort((a, b) => a.at.localeCompare(b.at)), seated: bucket('seated'), turned: bucket('turned'), log: purseLines().slice(-60).reverse(), luck: S.read(LUCK, []).slice(0, 20), held: rows.reduce((n, p) => n + (p.purse || 0), 0) };
}

module.exports = { KEEPER, GAMES, GAME, IDS, house, setHouse, patrons, find, byUser, current, ask, signIn, decide, purse, act, table, outcomes, week, weekLine, board, record, ledger, septims, resetCache, rulesOf };
