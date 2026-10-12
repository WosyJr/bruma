const S = require('./store');
const U = require('./users');
const T = require('./town');
const J = require('./innjack');
const Wh = require('./innwheel');
const Hz = require('./innhazard');
const Hl = require('./innhilo');
const Bn = require('./bones');
const Cg = require('./inncage');
const Sx = require('./innsix');
const Pu = require('./innpunto');
const Kn = require('./innkeno');
const Sl = require('./innslots');
const Mn = require('./innmines');
const Pk = require('./innplinko');
const Ev = require('./innevents');
const R = require('./innrng');
const Sd = require('./innside');
const Hh = require('./innhall');

const PATRONS = 'inn-patrons.json';
const HOUSE = 'inn-house.json';
const TABLES = 'inn-tables.json';
const BETS = 'inn-bets.jsonl';
const PURSE = 'inn-purse.jsonl';
const OUTCOMES = 'inn-outcomes.json';
const LUCK = 'inn-luck.json';
const KENO = 'inn-keno.json';
const TICKETS = 'inn-keno-tickets.json';
const KEEPER = 'Old Brannoc';

const GAMES = [
  { id: 'cards', name: 'Twenty-one', short: 'Twenty-one', theory: 'About 0.5% when played by the book; more for loose play.' },
  { id: 'wheel', name: 'The Wheel of Fortune', short: 'The Wheel', theory: '2.70% on every bet: one green zero in 37 pockets.' },
  { id: 'hazard', name: 'Hjalmar’s Hazard', short: 'Hazard', theory: 'About 1.5% on the main bet; side bets 2.8% to 16.7%.' },
  { id: 'redblack', name: 'Red or Black', short: 'Red or Black', theory: '4% on each call, so more the longer you ride.' },
  { id: 'bones', name: 'Bones', short: 'Bones', theory: 'About even: you and Brannoc take turns throwing first.' },
  { id: 'cage', name: 'The Bird Cage', short: 'Bird Cage', theory: '2.8% on high or low, 7.9% on a number, 13.9% on any three alike.' },
  { id: 'keno', name: 'The Jarl’s Lottery', short: 'Lottery', theory: 'About 10% on every ticket, whatever the count of numbers.' },
  { id: 'punto', name: 'Punto', short: 'Punto', theory: '1.2% on the Player, 1.1% on the Banker, 14.4% on a Tie.' },
  { id: 'six', name: 'The Dragon Wheel', short: 'Dragon Wheel', theory: '11.1% on the 1s up to 24.1% on the Dragon and the Septim.' },
  { id: 'slots', name: 'Pull the Lever', short: 'Slots', theory: 'About 7% over many spins; 1 septim in every 100 staked feeds the jackpot.' },
  { id: 'mines', name: 'The Barrow', short: 'Barrow', theory: '3% on every cash-out, whatever the number of draugr.' },
  { id: 'plinko', name: 'The Avalanche', short: 'Avalanche', theory: 'About 2.5% at every risk.' },
  { id: 'crash', name: 'The Dragon’s Climb', short: 'Dragon’s Climb', theory: '3% on every flight, wherever you cash out.' },
  { id: 'races', name: 'The Chorrol Downs', short: 'Chorrol Downs', theory: 'About 10%: the odds are set from the true chances, less a tenth.' },
  { id: 'arena', name: 'The Arena', short: 'Arena', theory: 'About 10% on the house’s bouts; posted bouts at the keepers’ odds.' }
];
const PVP = [
  { id: 'duel', name: 'Bones Duel', short: 'Bones Duel', pvp: true, theory: 'Patron against patron. The house keeps only its cut of each pot.' },
  { id: 'bluff', name: 'Bruma Bluff', short: 'Bruma Bluff', pvp: true, theory: 'Patrons against each other. The house keeps only its cut of each pot.' },
  { id: 'poker', name: 'Hold’em', short: 'Hold’em', pvp: true, theory: 'Patrons against each other. The house cut comes off pots that see a flop, no more than three big blinds.' },
  { id: 'long', name: 'The Long Table', short: 'Long Table', pvp: true, house: true, theory: 'About 0.5%: blackjack against Brannoc by the book, up to five at a table.' },
  { id: 'morris', name: 'Nine Men’s Morris', short: 'Morris', pvp: true, theory: 'Patron against patron, a game of skill. The house keeps only its cut.' },
  { id: 'coin', name: 'The Coin Toss', short: 'Coin Toss', pvp: true, theory: 'Patron against patron, a fair coin. The house keeps only its cut.' },
  { id: 'race', name: 'The Pale Pass Race', short: 'Pale Pass Race', pvp: true, theory: 'Patrons against each other, two to four. The house keeps only its cut.' },
  { id: 'draughts', name: 'Draughts', short: 'Draughts', pvp: true, theory: 'Patron against patron, a game of skill. The house keeps only its cut.' },
  { id: 'rps', name: 'Hammer, Shield, Spell', short: 'Hammer Shield Spell', pvp: true, theory: 'Patron against patron. The house keeps only its cut.' }
];
const ALL = GAMES.concat(PVP);
const GAME = Object.fromEntries(ALL.map(g => [g.id, g]));
const IDS = GAMES.map(g => g.id);
const ALL_IDS = ALL.map(g => g.id);
const DEFAULT_LIMITS = { min: 5, max: 500 };
const NOMAX = 1e12;
const OPEN_IDS = GAMES.map(g => g.id).concat(['long']);

const clean = (v, n) => String(v === undefined || v === null ? '' : v).replace(/[\r\n]+/g, ' ').trim().slice(0, n);
const int = v => { const n = Math.floor(Number(String(v === undefined || v === null ? '' : v).replace(/[,\s]/g, ''))); return Number.isFinite(n) ? n : NaN; };
const septims = n => Number(n || 0).toLocaleString('en-US');
const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const id = () => S.id();

function house() {
  const h = S.read(HOUSE, {});
  const limits = {};
  ALL_IDS.forEach(g => { const l = (h.limits || {})[g] || {}; limits[g] = OPEN_IDS.includes(g) ? { min: l.min || DEFAULT_LIMITS.min, max: NOMAX, open: true } : { min: l.min || DEFAULT_LIMITS.min, max: l.max || (g === 'poker' ? 2000 : DEFAULT_LIMITS.max) }; });
  return { limits, dailyCap: h.dailyCap || 0, anyTen: !!h.anyTen, hitSoft17: !!h.hitSoft17, rake: h.rake === undefined ? 5 : h.rake, turn: h.turn || 45, kenoEvery: h.kenoEvery || 3, kenoCap: h.kenoCap || 500000, raceEvery: h.raceEvery || 3, boutEvery: h.boutEvery || 4, updatedBy: h.updatedBy || '', updatedAt: h.updatedAt || '' };
}

function setHouse(b, by) {
  const out = { limits: {}, dailyCap: 0, anyTen: b.anyTen === '1' || b.anyTen === 'on', hitSoft17: b.hitSoft17 === '1' || b.hitSoft17 === 'on', updatedBy: by ? by.name : '', updatedAt: new Date().toISOString() };
  ALL_IDS.forEach(g => {
    if (b['min_' + g] === undefined && b['max_' + g] === undefined) { const was = house().limits[g]; out.limits[g] = { min: was.min, max: was.open ? DEFAULT_LIMITS.max : was.max }; return; }
    if (OPEN_IDS.includes(g)) {
      const min = int(b['min_' + g]);
      if (!(min >= 1)) throw new Error('Give every table a smallest stake of at least 1.');
      out.limits[g] = { min, max: DEFAULT_LIMITS.max };
      return;
    }
    const min = int(b['min_' + g]), max = int(b['max_' + g]);
    if (!(min >= 1) || !(max >= 1)) throw new Error('Give every table a smallest and a largest stake of at least 1.');
    if (max < min) throw new Error(GAME[g].name + ': the largest stake is smaller than the smallest.');
    if (max > 1000000) throw new Error('No table takes more than 1,000,000 at once.');
    out.limits[g] = { min, max };
  });
  const cap = b.dailyCap === '' || b.dailyCap === undefined ? 0 : int(b.dailyCap);
  if (!(cap >= 0)) throw new Error('The daily loss cap is a number of septims, or 0 for none.');
  out.dailyCap = cap;
  const rake = b.rake === undefined || b.rake === '' ? house().rake : Number(b.rake);
  if (!(rake >= 0 && rake <= 20)) throw new Error('The house cut is a share from 0 to 20 in the hundred.');
  out.rake = Math.round(rake * 10) / 10;
  const turn = b.turn === undefined || b.turn === '' ? house().turn : int(b.turn);
  if (!(turn >= 15 && turn <= 300)) throw new Error('A turn lasts from 15 to 300 seconds.');
  out.turn = turn;
  const ke = b.kenoEvery === undefined || b.kenoEvery === '' ? house().kenoEvery : Number(b.kenoEvery);
  if (!(ke >= 1 && ke <= 120)) throw new Error('The lottery draws every 1 to 120 minutes.');
  out.kenoEvery = Math.round(ke);
  const kc = b.kenoCap === undefined || b.kenoCap === '' ? house().kenoCap : int(b.kenoCap);
  if (!(kc >= 100)) throw new Error('The most the lottery pays on one ticket is at least 100.');
  out.kenoCap = kc;
  ['raceEvery', 'boutEvery'].forEach(k => {
    const v = b[k] === undefined || b[k] === '' ? house()[k] : Number(b[k]);
    if (!(v >= 2 && v <= 120)) throw new Error('Races and bouts run every 2 to 120 minutes.');
    out[k] = Math.round(v);
  });
  S.write(HOUSE, out);
  return house();
}

const patrons = () => S.read(PATRONS, []);
const savePatrons = rows => S.write(PATRONS, rows);
const find = pid => patrons().find(p => p.id === String(pid || '')) || null;
const byUser = username => patrons().find(p => p.kind === 'login' && p.username === String(username || '')) || null;

const REQUESTS = 'inn-requests.json';
const hashOf = t => require('crypto').createHash('sha256').update(String(t || '')).digest('hex');
const newToken = () => require('crypto').randomBytes(18).toString('hex');

function seen(p, token) {
  if (!p || !token) return null;
  const h = hashOf(token);
  return (p.devices || []).find(d => d.h === h) || null;
}

function current(req) {
  if (req.user) return byUser(req.user.username);
  const token = req.session && req.session.innToken;
  if (!token) return null;
  const h = hashOf(token);
  const p = patrons().find(x => x.kind === 'guest' && (x.devices || []).some(d => d.h === h));
  if (!p) return null;
  const d = (p.devices || []).find(x => x.h === h);
  if (d.ok || p.status !== 'seated') return Object.assign({}, p, { device: d.ok ? 'known' : 'new' });
  return Object.assign({}, p, { status: 'waiting', device: 'new' });
}

const seated = p => !!p && p.status === 'seated';

const loose = v => String(v || '').toLowerCase().replace(/[._\-]+/g, ' ').replace(/\s+/g, ' ').trim();
function officerFor(name) {
  const k = loose(name);
  if (!k) return null;
  const all = U.list().concat(U.listMembers ? U.listMembers() : []);
  return all.find(u => loose(u.name) === k || loose(u.username) === k) || null;
}

function mergeGuest(pid, by) {
  const g0 = find(pid);
  if (!g0 || g0.kind !== 'guest') throw new Error('Only a name given at the door can be merged.');
  const off = officerFor(g0.name);
  if (!off) throw new Error('No officer answers to that name.');
  if (require('./innpvp').liveRoomOf(g0.id)) throw new Error(g0.name + ' is sitting at a table in the back room. Wait for them to get up.');
  if (openRequests(g0.id).length) throw new Error(g0.name + ' has a purse request waiting. Settle it first.');
  if (kenoTickets().some(t => t.patron === g0.id && t.state === 'open')) throw new Error(g0.name + ' holds a lottery ticket for the next draw. Merge after the draw.');
  const rows = patrons();
  const g = rows.find(x => x.id === g0.id);
  let o = rows.find(x => x.kind === 'login' && x.username === off.username);
  const now = new Date().toISOString();
  if (!o) {
    o = { id: id(), kind: 'login', username: off.username, name: off.name, who: clean(off.officeName || '', 80), code: '', status: g.status === 'seated' ? 'seated' : 'waiting', purse: 0, at: now, decidedAt: now, decidedBy: by.name, day: { date: today(), net: 0 } };
    rows.push(o);
  }
  const amount = (g.purse || 0) + (g.held || 0);
  if (amount > 0) {
    const before = o.purse || 0;
    o.purse = before + amount;
    purseLog({ at: now, patron: o.id, name: o.name, kind: 'add', amount, before, after: o.purse, by: by.username, byName: by.name, note: 'Merged from the name ' + g.name + ' given at the door', own: false });
    purseLog({ at: now, patron: g.id, name: g.name, kind: 'take', amount, before: amount, after: 0, by: by.username, byName: by.name, note: 'Merged into ' + o.name + '’s purse', own: false });
  }
  if (g.status === 'seated' && o.status !== 'seated') { o.status = 'seated'; o.decidedAt = now; o.decidedBy = by.name; }
  const tables = S.read(TABLES, {});
  if (tables[g.id]) { if (!tables[o.id]) tables[o.id] = tables[g.id]; delete tables[g.id]; S.write(TABLES, tables); }
  savePatrons(rows.filter(x => x.id !== g.id));
  return { from: g.name, into: o.name, amount };
}

function ask(b, user, token) {
  const rows = patrons();
  const code = clean(b.code, 40);
  if (code.length < 2) throw new Error('Give the passcode you were told in game.');
  if (user) {
    const had = rows.find(p => p.kind === 'login' && p.username === user.username);
    if (had && had.status === 'waiting') throw new Error('You have asked already. The innkeeper will see to you.');
    if (had && had.status === 'seated') throw new Error('You have a seat already.');
    if (had && had.status === 'out') { const all = rows; const q = all.find(x => x.id === had.id); q.status = 'waiting'; q.code = code; q.at = new Date().toISOString(); savePatrons(all); return Object.assign({}, q, { back: true }); }
    if (had) throw new Error('The innkeeper has turned you away. See the inn’s keepers in game.');
    const p = { id: id(), kind: 'login', username: user.username, name: user.name, who: clean(user.title || user.officeName || '', 80), code, status: 'waiting', purse: 0, at: new Date().toISOString(), day: { date: today(), net: 0 } };
    rows.push(p);
    savePatrons(rows);
    return p;
  }
  const name = clean(b.name, 40);
  if (name.length < 2) throw new Error('Give the innkeeper a name of at least two letters.');
  if (!token) throw new Error('The innkeeper did not catch that. Try again.');
  const key = name.toLowerCase();
  if (officerFor(name)) throw new Error('That name belongs to someone with a login to the hall. Sign in to the hall first, and your name is filled in for you.');
  const h = hashOf(token);
  const at = new Date().toISOString();
  let p = rows.find(x => x.kind === 'guest' && x.key === key);
  if (p) {
    if (p.status === 'turned') throw new Error('The innkeeper has turned that name away. See the inn’s keepers in game.');
    if (p.status === 'out') { p.status = 'waiting'; p.at = at; p.devices = [{ h, ok: false, at, code }]; savePatrons(rows); return Object.assign({}, p, { back: true }); }
    p.devices = (p.devices || []).filter(d => d.h !== h);
    p.devices.push({ h, ok: false, at, code });
    p.devices = p.devices.slice(-12);
    savePatrons(rows);
    return Object.assign({}, p, { returning: p.status === 'seated' });
  }
  p = { id: id(), kind: 'guest', name, key, who: clean(b.who, 80), status: 'waiting', purse: 0, at, day: { date: today(), net: 0 }, devices: [{ h, ok: false, at, code }] };
  rows.push(p);
  savePatrons(rows);
  return p;
}

function decide(pid, action, by) {
  const rows = patrons();
  const p = rows.find(x => x.id === String(pid || ''));
  if (!p) throw new Error('There is no such patron.');
  const now = new Date().toISOString();
  if (action === 'accept') { p.status = 'seated'; p.decidedAt = now; p.decidedBy = by.name; (p.devices || []).forEach(d => { d.ok = true; }); }
  else if (action === 'device') { (p.devices || []).forEach(d => { if (!d.ok) { d.ok = true; d.by = by.name; } }); }
  else if (action === 'nodevice') { p.devices = (p.devices || []).filter(d => d.ok); }
  else if (action === 'turn') { p.status = 'turned'; p.decidedAt = now; p.decidedBy = by.name; p.devices = (p.devices || []).filter(d => d.ok); }
  else if (action === 'forget') {
    if (require('./innpvp').liveRoomOf(p.id)) throw new Error(p.name + ' is sitting at a table in the back room. Wait for them to get up.');
    const owed = (p.purse || 0) + (p.held || 0);
    if (owed > 0) {
      purseLog({ at: now, patron: p.id, name: p.name, kind: 'take', amount: owed, before: owed, after: 0, by: by.username, byName: by.name, note: 'Written off when the patron was forgotten', own: false });
      const reqs = requests();
      reqs.forEach(r => { if (r.patron === p.id && r.status === 'open') { r.status = 'declined'; r.closedAt = now; r.closedBy = by.name; } });
      S.write(REQUESTS, reqs);
    }
    const tickets = S.read(TICKETS, []);
    if (tickets.some(t => t.patron === p.id && t.state === 'open')) S.write(TICKETS, tickets.filter(t => !(t.patron === p.id && t.state === 'open')));
    const tables = S.read(TABLES, {});
    if (tables[p.id]) { delete tables[p.id]; S.write(TABLES, tables); }
    savePatrons(rows.filter(x => x !== p));
    return { patron: p, writtenOff: owed };
  } else throw new Error('The ledger does not know that.');
  savePatrons(rows);
  return { patron: p };
}

function requests() { return S.read(REQUESTS, []); }
function openRequests(pid) { return requests().filter(r => r.status === 'open' && (!pid || r.patron === pid)); }

function cashOut(pid, amount) {
  const rows = patrons();
  const p = rows.find(x => x.id === String(pid || ''));
  if (!seated(p)) throw new Error('Only seated patrons can cash out.');
  if (openRequests(p.id).some(r => r.kind === 'cashout')) throw new Error('You have a cash-out waiting already.');
  const a = amount === undefined || amount === '' ? p.purse : int(amount);
  if (!(a >= 1)) throw new Error('Name how much to cash out.');
  if (a > p.purse) throw new Error('Your purse holds only ' + septims(p.purse) + '.');
  const before = p.purse;
  p.purse -= a;
  p.held = (p.held || 0) + a;
  savePatrons(rows);
  purseLog({ at: new Date().toISOString(), patron: p.id, name: p.name, kind: 'hold', amount: a, before, after: p.purse, by: '', byName: p.name, note: 'Set aside to cash out' });
  const r = { id: id(), patron: p.id, name: p.name, username: p.username || '', kind: 'cashout', amount: a, note: '', at: new Date().toISOString(), status: 'open' };
  const all = requests(); all.push(r); S.write(REQUESTS, all.slice(-500));
  return r;
}

function askMore(pid, amount, note) {
  const p = find(pid);
  if (!seated(p)) throw new Error('Only seated patrons can ask for more.');
  if (openRequests(p.id).some(r => r.kind === 'more')) throw new Error('You have asked already. The innkeeper will see to you.');
  const a = amount === undefined || String(amount).trim() === '' ? 0 : int(amount);
  if (!(a >= 0) || a > 100000000) throw new Error('Name a number of septims, or leave it empty.');
  const r = { id: id(), patron: p.id, name: p.name, username: p.username || '', kind: 'more', amount: a, note: clean(note, 140), at: new Date().toISOString(), status: 'open' };
  const all = requests(); all.push(r); S.write(REQUESTS, all.slice(-500));
  return r;
}

function settle(rid, action, by, amount, pid) {
  const all = requests();
  const r = all.find(x => x.id === String(rid || ''));
  if (!r || r.status !== 'open') throw new Error('That request has been dealt with already.');
  if (pid && r.patron !== pid) throw new Error('That is not your request.');
  const rows = patrons();
  const p = rows.find(x => x.id === r.patron);
  if (!p) throw new Error('That patron is gone from the book.');
  const now = new Date().toISOString();
  if (r.kind === 'cashout') {
    if (action === 'paid') {
      p.held = Math.max(0, (p.held || 0) - r.amount);
      purseLog({ at: now, patron: p.id, name: p.name, kind: 'paid', amount: r.amount, before: p.purse, after: p.purse, by: by.username, byName: by.name, note: 'Paid out in game' + (p.purse ? '; ' + septims(p.purse) + ' left in the purse' : '') });
      r.status = 'paid';
      p.status = 'out';
      p.outAt = now;
      (p.devices || []).forEach(d => { d.ok = false; });
    } else if (action === 'back' || action === 'withdraw') {
      const before = p.purse;
      p.held = Math.max(0, (p.held || 0) - r.amount);
      p.purse += r.amount;
      purseLog({ at: now, patron: p.id, name: p.name, kind: 'back', amount: r.amount, before, after: p.purse, by: by.username || '', byName: by.name, note: action === 'withdraw' ? 'Cash-out called off' : 'Cash-out put back in the purse' });
      r.status = action === 'withdraw' ? 'withdrawn' : 'returned';
    } else throw new Error('Paid, or put it back.');
  } else {
    if (action === 'add') {
      const a = int(amount === undefined || amount === '' ? r.amount : amount);
      if (!(a >= 1)) throw new Error('Add at least one septim.');
      savePatrons(rows);
      purse(p.id, 'add', a, 'Asked for more' + (r.note ? ': ' + r.note : ''), by);
      r.status = 'added'; r.added = a; r.by = by.name; r.doneAt = now;
      S.write(REQUESTS, all);
      return r;
    } else if (action === 'decline' || action === 'withdraw') r.status = action === 'withdraw' ? 'withdrawn' : 'declined';
    else throw new Error('Add, or decline.');
  }
  r.by = by.name; r.doneAt = now;
  savePatrons(rows);
  S.write(REQUESTS, all);
  return r;
}

function nets() {
  const out = {};
  bets().forEach(x => { out[x.patron] = (out[x.patron] || 0) + x.net; });
  return out;
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
const TILL = 'inn-till.json';
function till() {
  let t = S.read(TILL, null);
  if (!t) { t = { kept: bets().reduce((n, x) => n + (x.staked - x.returned), 0) }; S.write(TILL, t, true); }
  return t;
}
function toTill(n) { const t = till(); t.kept += n; S.write(TILL, t, true); }
function logBet(row) {
  till();
  S.append(BETS, row);
  if (cache) cache.push(row);
  toTill((row.staked || 0) - (row.returned || 0));
}
function resetCache() { cache = null; }

function outcomes() { return S.read(OUTCOMES, {}); }
function addOutcome(game, o, quiet) {
  const all = outcomes();
  all[game] = [o].concat(all[game] || []).slice(0, 20);
  S.write(OUTCOMES, all, quiet);
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
    const sb = { pp: int(b.pp) || 0, t3: int(b.t3) || 0 };
    Object.keys(sb).forEach(k => { if (sb[k] < 0) sb[k] = 0; if (sb[k] && sb[k] < lim.min) throw new Error('A side bet is at least ' + septims(lim.min) + '.'); });
    stake(p, bet + sb.pp + sb.t3, h);
    J.deal(t, bet, rules);
    const c = t.round.hands[0].cards, up = t.round.dealer[0];
    const sd = Sd.settle(sb, { pp: Sd.perfectPairs(c[0], c[1]), t3: Sd.twentyOnePlus3(c[0], c[1], up) });
    sd.lines.forEach(l => { l.name = l.key === 'pp' ? 'Perfect Pairs' : '21+3'; });
    t.round.sides = sd;
    t.sideBets = sb;
    if (sd.returned) credit(p, sd.returned);
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
    const sd = r.sides || { staked: 0, returned: 0, lines: [] };
    return { settled: { staked: r.staked + sd.staked, returned: r.returned + sd.returned, detail: { hands: r.hands.map(x => ({ cards: x.cards, result: x.result, bet: x.bet })), dealer: r.dealer, bj: r.hands[0].result === 'blackjack', sides: sd.lines } }, outcome: J.outcome(t), streak: t.streak };
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
    g = Hl.start(g, bet, bet * Hl.CAP);
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

function clothBets(b, lim, cleaner, empty) {
  let raw = b.bets;
  if (typeof raw === 'string') { try { raw = JSON.parse(raw); } catch (_) { raw = {}; } }
  const bets = cleaner(raw);
  const keys = Object.keys(bets);
  if (!keys.length) throw new Error(empty);
  keys.forEach(k => { if (bets[k] < lim.min) throw new Error('Every place needs at least ' + septims(lim.min) + ' on it.'); });
  const sum = keys.reduce((n, k) => n + bets[k], 0);
  if (sum > lim.max) throw new Error('The most on one round is ' + septims(lim.max) + '.');
  return { bets, sum };
}
function playCage(p, mine, what, b, h, lim) {
  if (what !== 'throw') throw new Error('The cage only turns.');
  const { bets, sum } = clothBets(b, lim, Cg.clean, 'Put a chip on the cage cloth first.');
  stake(p, sum, h);
  const r = Cg.throwCage(bets);
  credit(p, r.returned);
  mine.cage = { last: r, bets };
  return { settled: { staked: r.staked, returned: r.returned, detail: { dice: r.dice, lines: r.lines.map(l => [l.label, l.amount, l.ret]) } }, outcome: { d: r.dice } };
}
function playSix(p, mine, what, b, h, lim) {
  if (what !== 'spin') throw new Error('The wheel only spins.');
  const { bets, sum } = clothBets(b, lim, Sx.clean, 'Put a chip on a symbol first.');
  stake(p, sum, h);
  const r = Sx.spin(bets);
  credit(p, r.returned);
  mine.six = { last: r, bets };
  return { settled: { staked: r.staked, returned: r.returned, detail: { sym: r.sym, lines: r.lines.map(l => [l.label, l.amount, l.ret]) } }, outcome: { s: r.sym }, slot: r.slot };
}
function playPunto(p, mine, what, b, h, lim) {
  if (what !== 'deal') throw new Error('The croupier only deals.');
  const { bets, sum } = clothBets(b, lim, Pu.clean, 'Bet on the Player, the Banker or a Tie first.');
  const t = mine.punto || (mine.punto = Pu.fresh());
  stake(p, sum, h);
  const r = Pu.play(t, bets);
  t.bets = bets;
  credit(p, r.returned);
  return { settled: { staked: r.staked, returned: r.returned, detail: { P: r.P, B: r.B, win: r.win, lines: r.lines.map(l => [l.label, l.amount, l.ret]) } }, outcome: { w: r.win[0].toUpperCase(), p: r.ps, b: r.bs }, steps: r.steps };
}

function kenoState() {
  const k = S.read(KENO, null) || {};
  return { no: k.no || 1, nextAt: k.nextAt || 0, last: k.last || null, history: k.history || [] };
}
function kenoTickets() { return S.read(TICKETS, []); }
function kenoDraw(now, force) {
  const t = now || Date.now();
  const k = kenoState();
  const every = house().kenoEvery * 60000;
  if (!k.nextAt) { k.nextAt = t + every; S.write(KENO, k); return null; }
  if (!force && t < k.nextAt) return null;
  let balls = Kn.drawBalls();
  const no = k.no;
  const cap = house().kenoCap;
  const tickets = kenoTickets();
  const mine = tickets.filter(x => x.draw === no && x.state === 'open');
  const kt = Math.max(tableTilt('keno'), riskOf(mine));
  if (kt) {
    const who = tableTilt('keno') ? mine : mine.filter(x => riskOf([x]));
    const cost = bl => who.reduce((n, x) => n + Kn.payFor(x.picks, bl, x.bet, cap).ret - x.bet, 0);
    for (let i = 0; i < 4 && cost(balls) > 0 && coin() < kt; i++) balls = Kn.drawBalls();
  }
  if (mine.length) {
    const rows = patrons();
    mine.forEach(x => {
      const r = Kn.payFor(x.picks, balls, x.bet, cap);
      r.ret += Hh.bonusFor('keno', x.bet, r.ret, t);
      x.state = 'settled'; x.hits = r.hits; x.mult = r.mult; x.ret = r.ret;
      const pt = rows.find(y => y.id === x.patron);
      if (pt && r.ret > 0) { dayRoll(pt); credit(pt, r.ret); }
      logBet({ id: id(), at: new Date(t).toISOString(), patron: x.patron, name: x.name, username: x.username || '', game: 'keno', staked: x.bet, returned: r.ret, net: r.ret - x.bet, detail: { draw: no, picks: x.picks, hits: r.hits } });
    });
    savePatrons(rows);
  }
  const cut = new Date(t - 7 * 86400000).toISOString();
  S.write(TICKETS, tickets.filter(x => x.state === 'open' || x.at > cut).slice(-5000));
  k.last = { no, at: new Date(t).toISOString(), balls, tickets: mine.length, paid: mine.reduce((n, x) => n + x.ret, 0) };
  k.history = [{ no, at: k.last.at, balls }].concat(k.history).slice(0, 20);
  k.no = no + 1;
  k.nextAt = t + every;
  S.write(KENO, k);
  addOutcome('keno', { no, balls: balls.slice().sort((a, b) => a - b) });
  return k.last;
}
function kenoView(pid) {
  kenoDraw();
  const k = kenoState();
  const all = kenoTickets().filter(x => x.patron === String(pid || ''));
  return { no: k.no, nextAt: k.nextAt, last: k.last, history: k.history, open: all.filter(x => x.state === 'open'), done: all.filter(x => x.state === 'settled').slice(-12).reverse(), every: house().kenoEvery };
}
function playKeno(p, mine, what, b, h, lim) {
  if (what === 'buy') {
    const picks = Kn.cleanPicks(b.picks);
    const bet = int(b.bet);
    inLimits(lim, bet);
    const k = kenoState();
    const list = kenoTickets();
    if (list.filter(x => x.patron === p.id && x.state === 'open').length >= 10) throw new Error('Ten tickets on one draw is the most the Jarl allows.');
    if (k.nextAt && k.nextAt - Date.now() < 3000) throw new Error('The balls are about to drop. Buy for the next draw.');
    stake(p, bet, h);
    const tk = { id: id(), patron: p.id, name: p.name, username: p.username || '', draw: k.no, picks, bet, at: new Date().toISOString(), state: 'open' };
    list.push(tk);
    S.write(TICKETS, list);
    mine.keno = { picks, bet };
    return { ticket: tk };
  }
  if (what === 'cancel') {
    const list = kenoTickets();
    const tk = list.find(x => x.id === String(b.ticket || '') && x.patron === p.id && x.state === 'open');
    if (!tk) throw new Error('That ticket is not yours to tear up, or it has been drawn.');
    tk.state = 'torn';
    credit(p, tk.bet);
    S.write(TICKETS, list.filter(x => x.id !== tk.id));
    return {};
  }
  throw new Error('Buy a ticket, or tear one up.');
}

const SLOTPOT = 'inn-slots.json';
function jackpot() { return S.read(SLOTPOT, { pot: Sl.SEED }).pot; }
function playSlots(p, mine, what, b, h, lim) {
  if (what !== 'spin') throw new Error('Pull the lever.');
  const g = mine.slots || (mine.slots = Sl.fresh());
  let bet, free = false;
  if (g.free > 0) { bet = g.freeBet; free = true; g.free -= 1; }
  else {
    bet = int(b.bet);
    inLimits(lim, bet);
    stake(p, bet, h);
  }
  const jp = S.read(SLOTPOT, { pot: Sl.SEED });
  if (!free) jp.pot += bet * Sl.CUT;
  const r = Sl.spin(bet);
  let won = Math.floor(r.win);
  let jackpotWon = 0;
  if (r.jackpot) { jackpotWon = Math.floor(jp.pot); won += jackpotWon; jp.pot = Sl.SEED; jp.last = { at: new Date().toISOString(), name: p.name, amount: jackpotWon }; }
  S.write(SLOTPOT, jp);
  if (r.free) { g.free += r.free; g.freeBet = bet; }
  if (won) credit(p, won);
  g.freeWon = free || r.free ? (g.freeWon || 0) + won : 0;
  g.last = { grid: r.grid, stops: r.stops, lines: r.lines, scatter: r.scatter, scatters: r.scatters, won, bet, free, freeAdded: r.free, jackpot: jackpotWon };
  g.lastBet = bet;
  return { settled: { staked: free ? 0 : bet, returned: won, detail: { grid: r.grid, free, jackpot: jackpotWon } }, outcome: { w: won, b: bet, j: jackpotWon ? 1 : 0 }, stops: r.stops };
}
function playMines(p, mine, what, b, h, lim) {
  let g = mine.mines || Mn.fresh();
  if (what === 'start') {
    if (g.phase === 'play') throw new Error('Finish this barrow first.');
    const bet = int(b.bet);
    const m = int(b.mines);
    inLimits(lim, bet);
    if (!(m >= 1 && m <= 24)) throw new Error('Choose one to twenty-four draugr.');
    stake(p, bet, h);
    g = Mn.start(bet, m);
  } else if (what === 'pick') Mn.pick(g, b.tile);
  else if (what === 'cash') Mn.cash(g);
  else throw new Error('Lift a stone, or take your winnings.');
  mine.mines = g;
  if (g.phase === 'done' && !g.logged) {
    g.logged = true;
    if (g.returned) credit(p, g.returned);
    return { settled: { staked: g.bet, returned: g.returned, detail: { mines: g.mines, opened: g.opened, hit: g.hit } }, outcome: { m: g.mines, n: g.opened.length, r: g.result, x: g.result === 'cash' ? g.mult : 0 } };
  }
  return {};
}
function playPlinko(p, mine, what, b, h, lim) {
  if (what !== 'drop') throw new Error('Drop the snowball.');
  const bet = int(b.bet);
  inLimits(lim, bet);
  const risk = Pk.TABLE[b.risk] ? String(b.risk) : 'medium';
  stake(p, bet, h);
  const r = Pk.drop(bet, risk);
  if (r.returned) credit(p, r.returned);
  mine.plinko = { last: r, risk, bet };
  return { settled: { staked: bet, returned: r.returned, detail: { risk, slot: r.slot, mult: r.mult } }, outcome: { x: r.mult, risk }, path: r.path };
}

function evPay(list, now) {
  if (!list.length) return;
  const rows = patrons();
  list.forEach(x => {
    const pt = rows.find(y => y.id === x.patron);
    const bonus = Hh.bonusFor(x.game, x.staked, x.returned, now);
    if (bonus) { x.returned += bonus; x.detail = Object.assign({}, x.detail, { happy: bonus }); }
    if (pt && x.returned > 0) { dayRoll(pt); credit(pt, x.returned); }
    logBet({ id: id(), at: new Date(now).toISOString(), patron: x.patron, name: x.name, username: x.username || '', game: x.game, staked: x.staked, returned: x.returned, net: x.returned - x.staked, detail: x.detail || {} });
  });
  savePatrons(rows);
}
function eventsTick(nowMs) {
  const now = nowMs || Date.now();
  const e = Ev.state();
  const h = house();
  let dirty = false;
  const pay = [];
  const freshCrash = () => { const c0 = Ev.newCrash(now, e.no.crash); const tt = tableTilt('crash'); if (tt && coin() < tt) { const p2 = Ev.crashPoint(); if (p2 < c0.point) { c0.point = p2; c0.crashTime = c0.flyAt + Ev.timeFor(p2); } } return c0; };
  if (!e.crash) { e.no.crash += 1; e.crash = freshCrash(); dirty = true; }
  const c = e.crash;
  if (c.phase === 'bet' && now >= c.betUntil) { c.phase = 'fly'; dirty = true; }
  if (c.phase === 'fly') {
    c.bets.forEach(bt => {
      if (bt.cashed || !bt.auto || bt.auto > c.point) return;
      if (now >= c.flyAt + Ev.timeFor(bt.auto) && now < c.crashTime && !bt.spared) { const rk = riskOf([bt]); if (rk && coin() < rk * 0.5) { c.point = Math.max(1, Math.floor((bt.auto - 0.01) * 100) / 100); c.crashTime = now; dirty = true; return; } bt.spared = true; }
      if (now >= c.flyAt + Ev.timeFor(bt.auto) || now >= c.crashTime) { bt.cashed = true; bt.at = bt.auto; bt.returned = Math.floor(bt.amount * bt.auto); pay.push({ patron: bt.patron, name: bt.name, username: bt.username, game: 'crash', staked: bt.amount, returned: bt.returned, detail: { flight: c.no, at: bt.auto, point: c.point } }); dirty = true; }
    });
    if (now >= c.crashTime) {
      c.phase = 'crashed';
      c.bets.forEach(bt => { if (!bt.cashed) { bt.returned = 0; pay.push({ patron: bt.patron, name: bt.name, username: bt.username, game: 'crash', staked: bt.amount, returned: 0, detail: { flight: c.no, point: c.point } }); } });
      e.history.crash = [c.point].concat(e.history.crash).slice(0, 20);
      addOutcome('crash', { x: c.point }, !c.bets.length);
      dirty = true;
    }
  }
  if (c.phase === 'crashed' && now >= c.crashTime + Ev.CRASH_PAUSE) { e.no.crash += 1; e.crash = freshCrash(); dirty = true; }

  if (!e.race) { e.no.race += 1; e.race = Ev.newRace(now, e.no.race, h.raceEvery * 60000); dirty = true; }
  const r = e.race;
  if (r.phase === 'bet' && now >= r.runAt) {
    const tt = Math.max(tableTilt('races'), riskOf(r.bets));
    const who = tableTilt('races') ? r.bets : r.bets.filter(bt => riskOf([bt]));
    const cost = o => who.reduce((n, bt) => n + (raceWins(bt, o) ? Math.floor(bt.amount * bt.odds) : 0) - bt.amount, 0);
    let sim = Ev.raceSim(r.horses, Ev.STEPS);
    for (let k = 0; tt && k < 4 && cost(sim.order) > 0 && coin() < tt; k++) sim = Ev.raceSim(r.horses, Ev.STEPS);
    r.frames = sim.frames; r.order = sim.order; r.phase = 'run'; dirty = true;
  }
  if (r.phase === 'run' && now >= r.endAt) {
    r.bets.forEach(bt => {
      bt.returned = raceWins(bt, r.order) ? Math.floor(bt.amount * bt.odds) : 0;
      pay.push({ patron: bt.patron, name: bt.name, username: bt.username, game: 'races', staked: bt.amount, returned: bt.returned, detail: { race: r.no, bet: raceName(r, bt), type: bt.type, odds: bt.odds, place: bt.horses ? null : r.order.indexOf(bt.horse) + 1 } });
    });
    r.phase = 'done';
    e.history.race = [{ no: r.no, order: r.order.map(i => r.horses[i].name) }].concat(e.history.race).slice(0, 20);
    addOutcome('races', { no: r.no, first: r.horses[r.order[0]].name, silk: r.horses[r.order[0]].silk, odds: r.horses[r.order[0]].odds.win }, !r.bets.length);
    dirty = true;
  }
  if (r.phase === 'done' && now >= r.nextAt) { e.no.race += 1; e.race = Ev.newRace(now, e.no.race, h.raceEvery * 60000); dirty = true; }

  if (!e.bout) { e.no.bout += 1; e.bout = Ev.newBout(now, e.no.bout, h.boutEvery * 60000); dirty = true; }
  const bo = e.bout;
  if (bo.phase === 'bet' && now >= bo.startAt) {
    const tt = Math.max(tableTilt('arena'), riskOf(bo.bets));
    const who = tableTilt('arena') ? bo.bets : bo.bets.filter(bt => riskOf([bt]));
    const cost = f => who.reduce((n, bt) => n + (Ev.propWins(bt, f, bo.props || {}) ? Math.floor(bt.amount * bt.odds) : 0) - bt.amount, 0);
    let fight = Ev.boutSim(bo.stats[0], bo.stats[1], true);
    for (let k = 0; tt && k < 4 && cost(fight) > 0 && coin() < tt; k++) fight = Ev.boutSim(bo.stats[0], bo.stats[1], true);
    bo.log = fight.log; bo.winner = fight.winner; bo.phase = 'fight'; dirty = true;
  }
  if (bo.phase === 'fight' && now >= bo.endAt) {
    bo.bets.forEach(bt => { const won = Ev.propWins(bt, bo, bo.props || {}); bt.returned = won ? Math.floor(bt.amount * bt.odds) : 0; pay.push({ patron: bt.patron, name: bt.name, username: bt.username, game: 'arena', staked: bt.amount, returned: bt.returned, detail: { bout: bo.no, on: bt.prop ? propName(bt.prop, bo) : bo.fighters[bt.side].name, odds: bt.odds, won } }); });
    bo.phase = 'done';
    e.history.bout = [{ no: bo.no, winner: bo.fighters[bo.winner].name, loser: bo.fighters[1 - bo.winner].name }].concat(e.history.bout).slice(0, 20);
    addOutcome('arena', { no: bo.no, w: bo.fighters[bo.winner].name }, !bo.bets.length);
    dirty = true;
  }
  if (bo.phase === 'done' && now >= bo.nextAt) { e.no.bout += 1; e.bout = Ev.newBout(now, e.no.bout, h.boutEvery * 60000); dirty = true; }
  if (dirty) Ev.save(e);
  evPay(pay, now);
  return e;
}

function crashNow() {
  const e = Ev.state();
  const c = e.crash;
  const now = Date.now();
  if (!c || c.phase !== 'fly' || now >= c.crashTime) return;
  const m = Math.max(1, Ev.multAt(now - c.flyAt));
  c.point = m; c.crashTime = now - 1;
  Ev.save(e);
}
function riskOf(pids) {
  const t = tilts();
  return pids.reduce((n, x) => Math.max(n, TILTS[(t.patrons[x.patron] || {}).level || 0]), 0);
}
function tableTilt(game) { return TILTS[(tilts().tables[game] || {}).level || 0]; }

function eventsView(pid) {
  const e = eventsTick();
  return { e, pid: String(pid || ''), now: Date.now(), jackpot: jackpot() };
}

function playCrash(p, mine, what, b, h, lim) {
  const e = Ev.state();
  const c = e.crash;
  if (!c) throw new Error('The dragon is not ready yet.');
  if (what === 'bet') {
    if (c.phase !== 'bet') throw new Error('The dragon is in the air. Bet on the next flight.');
    if (c.bets.some(x => x.patron === p.id)) throw new Error('You have a bet on this flight already.');
    const amount = int(b.bet);
    inLimits(lim, amount);
    let auto = b.auto === undefined || b.auto === '' ? 0 : Math.floor(Number(b.auto) * 100) / 100;
    if (auto && !(auto >= 1.01 && auto <= Ev.CRASH_CAP)) throw new Error('Cash out automatically at 1.01 or more, or leave it empty.');
    stake(p, amount, h);
    c.bets.push({ patron: p.id, name: p.name, username: p.username || '', amount, auto: auto || 0, cashed: false, at: 0, returned: 0 });
    mine.crash = { bet: amount, auto: auto || '' };
    Ev.save(e);
    return {};
  }
  if (what === 'cash') {
    const bt = c.bets.find(x => x.patron === p.id);
    if (!bt) throw new Error('You have no bet on this flight.');
    if (bt.cashed) throw new Error('You have cashed out already.');
    if (c.phase !== 'fly') throw new Error(c.phase === 'bet' ? 'The dragon has not taken off yet.' : 'Too late: the dragon has fallen.');
    const now = Date.now();
    if (now >= c.crashTime) throw new Error('Too late: the dragon has fallen.');
    const m = Math.min(Ev.multAt(now - c.flyAt), c.point);
    bt.cashed = true; bt.at = m; bt.returned = Math.floor(bt.amount * m);
    credit(p, bt.returned);
    Ev.save(e);
    return { settled: { staked: bt.amount, returned: bt.returned, detail: { flight: c.no, at: m } }, cashedAt: m };
  }
  throw new Error('Bet on a flight, or cash out.');
}
function raceWins(bt, order) {
  if (bt.type === 'exacta') return order[0] === bt.horses[0] && order[1] === bt.horses[1];
  if (bt.type === 'trifecta') return order[0] === bt.horses[0] && order[1] === bt.horses[1] && order[2] === bt.horses[2];
  const pl = order.indexOf(bt.horse);
  return bt.type === 'win' ? pl === 0 : (bt.type === 'place' ? pl <= 1 : pl <= 2);
}
function raceName(r, bt) {
  if (bt.horses) return bt.horses.map(i => r.horses[i].name).join(', then ') + (bt.type === 'exacta' ? ' (exacta)' : ' (trifecta)');
  return r.horses[bt.horse].name + ' to ' + bt.type;
}
function playRaces(p, mine, what, b, h, lim) {
  if (what !== 'bet') throw new Error('Place a bet on a horse.');
  const e = Ev.state();
  const r = e.race;
  if (!r || r.phase !== 'bet') throw new Error('They are off. Bet on the next race.');
  let bt;
  const amount = int(b.bet);
  if (b.kind === 'exacta' || b.kind === 'trifecta') {
    const n = b.kind === 'exacta' ? 2 : 3;
    const hs = [b.e1, b.e2, b.e3].slice(0, n).map(int);
    if (hs.some(x => !(x >= 0 && x < r.horses.length))) throw new Error('Choose a horse for every place.');
    if (new Set(hs).size !== n) throw new Error('Choose a different horse for each place.');
    const odds = (b.kind === 'exacta' ? r.exacta : r.trifecta)[hs.join('-')];
    if (!odds) throw new Error('The bookmaker has no price on that.');
    bt = { type: b.kind, horses: hs, odds };
  } else {
    if (String(b.pick === undefined ? (b.horse === undefined ? '' : b.horse) : b.pick).trim() === '') throw new Error('Choose a horse and the odds first.');
    const pk = String(b.pick || '').split(':');
    const horse = int(b.pick ? pk[0] : b.horse);
    const tp = b.pick ? pk[1] : b.type;
    const type = ['win', 'place', 'show'].includes(tp) ? tp : 'win';
    if (!(horse >= 0 && horse < r.horses.length)) throw new Error('Choose a horse.');
    bt = { horse, type, odds: r.horses[horse].odds[type] };
  }
  inLimits(lim, amount);
  if (r.bets.filter(x => x.patron === p.id).length >= 12) throw new Error('Twelve bets on one race is the most the bookmaker takes.');
  stake(p, amount, h);
  r.bets.push(Object.assign({ patron: p.id, name: p.name, username: p.username || '', amount, returned: 0 }, bt));
  mine.races = { bet: amount };
  Ev.save(e);
  return {};
}
function propName(prop, bo) {
  if (prop === 'over' || prop === 'under') return (prop === 'over' ? 'Over ' : 'Under ') + (bo.props ? bo.props.line : '') + ' blows';
  return 'Ends ' + (Ev.ENDS[prop] || prop);
}
function playArena(p, mine, what, b, h, lim) {
  if (what !== 'bet') throw new Error('Back a fighter.');
  const e = Ev.state();
  const side = int(b.side);
  const amount = int(b.bet);
  inLimits(lim, amount);
  if (!b.prop && !(side === 0 || side === 1)) throw new Error('Choose a fighter.');
  const prop = String(b.prop || '');
  if (prop) {
    const bo = e.bout;
    if (!bo || bo.phase !== 'bet') throw new Error('The fighters are in the ring. Bet on the next bout.');
    const pr = bo.props || { ends: {} };
    const odds = prop === 'over' || prop === 'under' ? pr[prop] : pr.ends[prop];
    if (!odds) throw new Error('The bookmaker has no price on that.');
    if (!(amount >= lim.min)) throw new Error('The smallest stake at this table is ' + septims(lim.min) + '.');
    stake(p, amount, h);
    bo.bets.push({ patron: p.id, name: p.name, username: p.username || '', side: -1, prop, amount, odds, returned: 0 });
    mine.arena = { bet: amount };
    Ev.save(e);
    return {};
  }
  const postedId = String(b.bout || '');
  if (postedId) {
    const pb = e.posted.find(x => x.id === postedId);
    if (!pb || pb.phase !== 'open') throw new Error('Betting on that bout is closed.');
    stake(p, amount, h);
    pb.bets.push({ patron: p.id, name: p.name, username: p.username || '', side, amount, odds: pb.odds[side], returned: 0 });
  } else {
    const bo = e.bout;
    if (!bo || bo.phase !== 'bet') throw new Error('The fighters are in the ring. Bet on the next bout.');
    stake(p, amount, h);
    bo.bets.push({ patron: p.id, name: p.name, username: p.username || '', side, amount, odds: bo.odds[side], returned: 0 });
  }
  mine.arena = { bet: amount };
  Ev.save(e);
  return {};
}
function postBout(b, by) {
  const e = Ev.state();
  const a = clean(b.a, 60), c2 = clean(b.b, 60);
  if (a.length < 2 || c2.length < 2) throw new Error('Name both fighters.');
  const oa = Math.round(Number(b.oddsA) * 100) / 100, ob = Math.round(Number(b.oddsB) * 100) / 100;
  if (!(oa >= 1.01 && ob >= 1.01 && oa <= 100 && ob <= 100)) throw new Error('Odds are paid back per septim staked, from 1.01 to 100.');
  e.no.posted += 1;
  const pb = { id: id(), no: e.no.posted, title: clean(b.title, 80), fighters: [{ name: a }, { name: c2 }], odds: [oa, ob], phase: 'open', bets: [], at: new Date().toISOString(), by: by.name };
  e.posted.unshift(pb);
  e.posted = e.posted.slice(0, 30);
  Ev.save(e);
  return pb;
}
function settleBout(pid, what, by) {
  const e = Ev.state();
  const pb = e.posted.find(x => x.id === String(pid || ''));
  if (!pb) throw new Error('No such bout.');
  if (what === 'close') { if (pb.phase !== 'open') throw new Error('Betting is already closed.'); pb.phase = 'closed'; Ev.save(e); return pb; }
  if (pb.phase === 'settled' || pb.phase === 'void') throw new Error('That bout is settled.');
  const now = Date.now();
  const pay = [];
  if (what === 'void') {
    pb.bets.forEach(bt => { bt.returned = bt.amount; pay.push({ patron: bt.patron, name: bt.name, username: bt.username, game: 'arena', staked: bt.amount, returned: bt.amount, detail: { posted: pb.no, void: true } }); });
    pb.phase = 'void';
  } else {
    const w = what === 'a' ? 0 : (what === 'b' ? 1 : -1);
    if (w < 0) throw new Error('Say who won, or void it.');
    pb.winner = w;
    pb.bets.forEach(bt => { bt.returned = bt.side === w ? Math.floor(bt.amount * bt.odds) : 0; pay.push({ patron: bt.patron, name: bt.name, username: bt.username, game: 'arena', staked: bt.amount, returned: bt.returned, detail: { posted: pb.no, on: pb.fighters[bt.side].name, odds: bt.odds, won: bt.side === w } }); });
    pb.phase = 'settled';
    addOutcome('arena', { no: 'P' + pb.no, w: pb.fighters[w].name });
  }
  pb.settledBy = by.name; pb.settledAt = new Date(now).toISOString();
  Ev.save(e);
  evPay(pay, now);
  return pb;
}

const PLAY = { slots: playSlots, mines: playMines, plinko: playPlinko, crash: playCrash, races: playRaces, arena: playArena, cards: playCards, wheel: playWheel, hazard: playHazard, redblack: playRedBlack, bones: playBones, cage: playCage, six: playSix, punto: playPunto, keno: playKeno };

const TILT = 'inn-tilt.json';
const TILTS = [0, 0.3, 0.6, 0.85];
const TILTNAMES = ['Fair', 'A little', 'Firmly', 'Hard'];
function tilts() { const t = S.read(TILT, {}); return { tables: t.tables || {}, patrons: t.patrons || {} }; }
function setTilt(kind, key, level, by) {
  const t = tilts();
  const lv = Math.max(0, Math.min(3, int(level) || 0));
  const box = kind === 'table' ? t.tables : t.patrons;
  if (kind === 'table' && !ALL_IDS.includes(String(key))) throw new Error('There is no such table.');
  if (kind === 'patron' && !find(key)) throw new Error('There is no such patron.');
  if (lv) box[String(key)] = { level: lv, by: by.name, at: new Date().toISOString() }; else delete box[String(key)];
  S.write(TILT, t, true);
  return lv;
}
function tiltOf(pid, game) {
  const t = tilts();
  return TILTS[Math.max((t.tables[game] || {}).level || 0, (t.patrons[String(pid || '')] || {}).level || 0)];
}
const coin = () => require('crypto').randomInt(1e6) / 1e6;
const clone = v => v === undefined ? undefined : JSON.parse(JSON.stringify(v));
function mix(list, from) { const rest = list.slice(from); R.shuffle(rest); for (let i = 0; i < rest.length; i++) list[from + i] = rest[i]; }
function reshuffle(game, mine) {
  const g = mine[game];
  if (!g) return;
  if (g.shoe && g.shoe.cards) mix(g.shoe.cards, g.shoe.at);
  if (game === 'redblack' && g.deck) mix(g.deck, g.at);
}
function favours(game, what, out, mine, before) {
  if (['mines', 'keno', 'crash', 'races', 'arena'].includes(game)) return false;
  if (game === 'redblack') return (what === 'hi' || what === 'lo') && mine.redblack && mine.redblack.phase !== 'done' ? true : !!(out.settled && out.settled.returned > out.settled.staked && what !== 'take');
  return !!(out.settled && out.settled.returned > out.settled.staked);
}
function minesTilt(g, tile, s) {
  if (!g || g.phase !== 'play' || !s || coin() >= s * 0.5) return;
  const t = Math.floor(Number(tile));
  if (g.draugr.includes(t) || g.opened.includes(t)) return;
  const free = g.draugr.filter(x => !g.opened.includes(x));
  if (!free.length) return;
  g.draugr[g.draugr.indexOf(free[0])] = t;
  g.draugr.sort((a, b) => a - b);
}

function act(pid, game, what, b) {
  if (!PLAY[game]) throw new Error('There is no such table.');
  if (game === 'keno') kenoDraw();
  if (game === 'crash' || game === 'races' || game === 'arena') eventsTick();
  const rows = patrons();
  const p = rows.find(x => x.id === String(pid || ''));
  if (!p) throw new Error('Ask for a seat first.');
  if (p.status !== 'seated') throw new Error(p.status === 'waiting' ? 'The innkeeper has not seated you yet.' : (p.status === 'out' ? 'You have cashed out. Request entry to play again.' : 'The innkeeper has turned you away.'));
  const h = house();
  const tables = S.read(TABLES, {});
  const mine = tables[p.id] || (tables[p.id] = {});
  dayRoll(p);
  const s = tiltOf(p.id, game);
  if (s && game === 'mines' && what === 'pick') minesTilt(mine.mines, (b || {}).tile, s);
  if (s && game === 'crash' && what === 'cash' && coin() < s * 0.5) crashNow();
  const snapP = s ? clone(p) : null, snapMine = s ? clone(mine) : null, snapPot = s && game === 'slots' ? S.read(SLOTPOT, null) : null;
  let out = PLAY[game](p, mine, what, b || {}, h, h.limits[game]);
  const put = (o, v) => { Object.keys(o).forEach(x => delete o[x]); Object.assign(o, clone(v)); };
  for (let k = 0; s && k < 4 && favours(game, what, out, mine, snapMine) && coin() < s; k++) {
    const good = { p: clone(p), mine: clone(mine), out, pot: snapPot ? S.read(SLOTPOT, null) : null };
    put(p, snapP); put(mine, snapMine);
    if (snapPot) S.write(SLOTPOT, snapPot);
    reshuffle(game, mine);
    try { out = PLAY[game](p, mine, what, b || {}, h, h.limits[game]); }
    catch (e) { put(p, good.p); put(mine, good.mine); out = good.out; if (good.pot) S.write(SLOTPOT, good.pot); break; }
  }
  p.lastGame = game;
  p.lastAt = new Date().toISOString();
  tables[p.id] = mine;
  S.write(TABLES, tables);
  savePatrons(rows);
  if (out.settled) {
    const bonus = Hh.bonusFor(game, out.settled.staked, out.settled.returned);
    if (bonus) { credit(p, bonus); savePatrons(rows); out.settled.returned += bonus; out.settled.detail = Object.assign({}, out.settled.detail, { happy: bonus }); out.happy = bonus; }
  }
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
  if (game === 'cage') return mine.cage || Cg.fresh();
  if (game === 'six') return mine.six || Sx.fresh();
  if (game === 'punto') return mine.punto || Pu.fresh();
  if (game === 'keno') return Object.assign(kenoView(pid), { mine: mine.keno || null });
  if (game === 'slots') return Object.assign(Sl.fresh(), mine.slots || {}, { jackpot: jackpot() });
  if (game === 'mines') return mine.mines || Mn.fresh();
  if (game === 'plinko') return mine.plinko || { last: null, risk: 'medium' };
  if (game === 'crash' || game === 'races' || game === 'arena') return Object.assign(eventsView(pid), { mine: mine[game] || null });
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
  ALL.forEach(g => {
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

function codeOf(p) {
  const codes = (p.devices || []).filter(x => !x.ok && x.code).map(x => x.code);
  if (codes.length) return Array.from(new Set(codes)).join(' · ') + (codes.length > 1 ? ' (' + codes.length + ' browsers)' : '');
  return p.code || '';
}

function live(mins) {
  const since = Date.now() - (mins || 15) * 60000;
  return patrons().filter(p => p.status === 'seated' && p.lastAt && Date.parse(p.lastAt) >= since).sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}

function feed(n) { return bets().slice(-(n || 15)).reverse(); }

function reset(scope, by) {
  const fs = require('fs'), path = require('path');
  const dir = require('./config').DATA_DIR;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const keep = name => { const f = path.join(dir, name); if (fs.existsSync(f)) fs.renameSync(f, path.join(dir, name.replace(/(\.\w+)$/, '-before-reset-' + stamp + '$1'))); };
  keep(BETS);
  S.write(OUTCOMES, {});
  S.write(LUCK, []);
  resetCache();
  const rows = patrons();
  rows.forEach(p => { p.day = { date: today(), net: 0 }; });
  if (scope === 'everything') {
    keep(PURSE); keep(PATRONS); keep(TABLES); keep(REQUESTS);
    keep(TICKETS); keep('inn-rooms.json');
    keep(Ev.FILE); keep(SLOTPOT); keep(TILL);
    S.write(PATRONS, []); S.write(TABLES, {}); S.write(REQUESTS, []); S.write(TICKETS, []); S.write('inn-rooms.json', []);
  } else {
    savePatrons(rows);
    const tables = S.read(TABLES, {});
    Object.values(tables).forEach(t => { if (t.cards) t.cards.streak = 0; });
    S.write(TABLES, tables);
  }
  S.append('inn-resets.jsonl', { at: new Date().toISOString(), scope, by: by.username, byName: by.name });
  return scope;
}

function escrow(pid, amount) {
  const rows = patrons();
  const p = rows.find(x => x.id === String(pid || ''));
  if (!seated(p)) throw new Error('Ask for a seat at the door first.');
  dayRoll(p);
  stake(p, amount, house());
  savePatrons(rows);
  return p;
}

function payback(pid, amount) {
  if (!(amount > 0)) return;
  const rows = patrons();
  const p = rows.find(x => x.id === String(pid || ''));
  if (!p) return;
  dayRoll(p);
  credit(p, amount);
  savePatrons(rows);
}

function playedAt(pid, game) {
  const rows = patrons();
  const p = rows.find(x => x.id === String(pid || ''));
  if (!p) return;
  p.lastGame = game;
  p.lastAt = new Date().toISOString();
  savePatrons(rows);
}

function logRound(row) {
  logBet(Object.assign({ id: id(), at: new Date().toISOString(), net: row.returned - row.staked }, row));
}

function tip(pid, amount) {
  const rows = patrons();
  const p = rows.find(x => x.id === String(pid || ''));
  if (!seated(p)) throw new Error('Ask for a seat at the door first.');
  const a = int(amount);
  if (!(a >= 1)) throw new Error('Name a tip of at least one septim.');
  if (a > p.purse) throw new Error('Your purse holds only ' + septims(p.purse) + '.');
  const before = p.purse;
  p.purse -= a;
  savePatrons(rows);
  const say = Hh.thanks();
  purseLog({ at: new Date().toISOString(), patron: p.id, name: p.name, kind: 'tip', amount: a, before, after: p.purse, by: '', byName: p.name, note: 'A tip for Old Brannoc' });
  return { amount: a, purse: p.purse, say };
}
const tipsList = () => purseLines().filter(x => x.kind === 'tip');
const crierItems = () => Hh.crier(bets(), GAME, tipsList());
const tonightBoards = () => Hh.boards(bets(), GAME);

function coinInHand() {
  let brought = 0, paid = 0, writtenOff = 0, tips = 0;
  purseLines().forEach(x => {
    const note = String(x.note || '');
    if (/^Merged/.test(note)) return;
    if (x.kind === 'add') brought += x.amount;
    else if (x.kind === 'set') { const d = (x.after || 0) - (x.before || 0); if (d > 0) brought += d; else paid -= d; }
    else if (x.kind === 'take') { if (/^Written off/.test(note)) writtenOff += x.amount; else paid += x.amount; }
    else if (x.kind === 'paid') paid += x.amount;
    else if (x.kind === 'tip') tips += x.amount;
  });
  const rows = patrons();
  const purses = rows.reduce((n, p) => n + (p.purse || 0), 0);
  const setAside = rows.reduce((n, p) => n + (p.held || 0), 0);
  const hoard = Math.floor(jackpot());
  const inHand = brought - paid;
  const own = till().kept + writtenOff + tips;
  const riding = Math.max(0, inHand - purses - setAside - own);
  return { brought, paid, inHand, purses, setAside, riding, owed: purses + setAside + riding, hoard, own, writtenOff, tips };
}

function ledger() {
  const rows = patrons();
  const bucket = s => rows.filter(p => p.status === s).sort((a, b) => String(a.name).localeCompare(String(b.name)));
  const returning = rows.filter(p => p.status === 'seated' && (p.devices || []).some(d => !d.ok));
  const gone = bucket('out');
  return { waiting: rows.filter(p => p.status === 'waiting').sort((a, b) => a.at.localeCompare(b.at)), returning, seated: bucket('seated'), turned: bucket('turned'), gone, requests: openRequests(), nets: nets(), log: purseLines().slice(-60).reverse(), luck: S.read(LUCK, []).slice(0, 20), held: rows.reduce((n, p) => n + (p.purse || 0), 0), setAside: rows.reduce((n, p) => n + (p.held || 0), 0) };
}

module.exports = { tip, crierItems, tonightBoards, propName, raceName, raceWins, tilts, setTilt, TILTNAMES, coinInHand, eventsTick, eventsView, postBout, settleBout, jackpot, officerFor, mergeGuest, NOMAX, OPEN_IDS, kenoDraw, kenoView, kenoState, KEEPER, GAMES, PVP, ALL, GAME, IDS, ALL_IDS, escrow, payback, playedAt, logRound, reset, house, setHouse, patrons, find, byUser, current, seated, newToken, seen, codeOf, live, feed, ask, decide, purse, requests, openRequests, cashOut, askMore, settle, nets, act, table, outcomes, week, weekLine, board, record, ledger, septims, resetCache, rulesOf };
