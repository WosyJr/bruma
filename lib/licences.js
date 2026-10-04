const S = require('./store');
const Papers = require('./papers');

const FILE = 'licences.json';

const TRADES = [
  { id: 'stall', name: 'A stall in the market', fee: 150 },
  { id: 'shop', name: 'A shop within the walls', fee: 400 },
  { id: 'inn', name: 'An inn or taproom', fee: 600 },
  { id: 'smith', name: 'A forge or smithy', fee: 350 },
  { id: 'carter', name: 'Carriage and haulage', fee: 250 },
  { id: 'pelts', name: 'Pelts, game and hides', fee: 200 },
  { id: 'drink', name: 'Brewing and strong drink', fee: 500 },
  { id: 'alchemy', name: 'Alchemy and physic', fee: 450 },
  { id: 'moneys', name: 'Lending and changing coin', fee: 800 },
  { id: 'pedlar', name: 'A pedlar upon the roads', fee: 100 }
];
const TRADE_BY_ID = Object.fromEntries(TRADES.map(t => [t.id, t]));
const tradeName = id => (TRADE_BY_ID[id] ? TRADE_BY_ID[id].name : 'Trade within the County');
const feeFor = id => (TRADE_BY_ID[id] ? TRADE_BY_ID[id].fee : 150);

const STATES = [
  { id: 'current', name: 'Current', tag: 'in' },
  { id: 'lapsed', name: 'Lapsed', tag: 'out' },
  { id: 'revoked', name: 'Revoked', tag: 'out' },
  { id: 'suspended', name: 'Suspended', tag: 'gold' }
];
const STATE_BY_ID = Object.fromEntries(STATES.map(s => [s.id, s]));
const stateName = id => (STATE_BY_ID[id] ? STATE_BY_ID[id].name : 'Current');

const clean = (v, n) => String(v === undefined || v === null ? '' : v).trim().slice(0, n);
const isoDate = v => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : '');

function all() { return S.read(FILE, []); }
function get(id) { return all().find(l => l.id === String(id || '')) || null; }

function nextNumber(rows) {
  return rows.reduce((m, r) => Math.max(m, Number(r.no) || 0), 0) + 1;
}

function stateOf(l) {
  if (l.state === 'revoked' || l.state === 'suspended') return l.state;
  if (l.untilIso && l.untilIso < new Date().toISOString().slice(0, 10)) return 'lapsed';
  return 'current';
}

function withState(rows) {
  return (rows || all()).map(l => ({ ...l, state: stateOf(l), standing: stateName(stateOf(l)) }));
}

function current() { return withState().filter(l => l.state === 'current'); }
function expiring(days) {
  const n = Number(days) || 14;
  const edge = new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  return withState().filter(l => l.state === 'current' && l.untilIso && l.untilIso <= edge && l.untilIso >= today);
}

function search(q) {
  const needle = String(q || '').trim().toLowerCase();
  const rows = withState();
  if (!needle) return rows;
  return rows.filter(l => (l.holder + ' ' + l.sign + ' ' + l.place + ' ' + tradeName(l.trade)).toLowerCase().includes(needle));
}

function grant(body, by) {
  const holder = clean(body.holder, 120);
  if (!holder) throw new Error('Name who is licensed.');
  const trade = TRADE_BY_ID[body.trade] ? body.trade : 'stall';
  const fee = Math.max(0, Math.round(Number(body.fee === undefined || body.fee === '' ? feeFor(trade) : body.fee) || 0));
  if (fee > 1000000) throw new Error('That is more than any licence in the County is worth. Check the figure.');

  const rows = all();
  const row = {
    id: S.id(),
    no: nextNumber(rows),
    holder,
    sign: clean(body.sign, 120),
    trade,
    place: clean(body.place, 140),
    holdingId: clean(body.holdingId, 60),
    fee,
    from: clean(body.from, 80),
    until: clean(body.until, 80),
    untilIso: isoDate(body.untilIso),
    terms: clean(body.terms, 2000),
    state: 'current',
    grantedBy: by.username,
    grantedByName: by.name,
    grantedAt: new Date().toISOString(),
    treasuryNo: 0,
    renewals: [],
    note: ''
  };
  rows.unshift(row);
  S.write(FILE, rows);

  if (fee > 0) takeFee(row.id, fee, by, 'Licence to trade no. ' + row.no + ' — ' + tradeName(trade));
  Papers.codeFor({
    kind: 'licence', module: 'licences', ref: row.id, no: 'Licence ' + row.no,
    title: 'Licence to trade — ' + (row.sign || row.holder), party: row.holder,
    link: '/licences/' + row.id, issuedBy: by.name, standing: 'Current',
    facts: [['What is licensed', tradeName(trade)], ['Where', row.place]]
  });
  return get(row.id) || row;
}

function takeFee(id, amount, by, reason) {
  try {
    const T = require('./treasury');
    const l = get(id);
    if (!l) return null;
    const entryRow = T.enter({
      way: 'in', amount, party: l.holder, cat: 'trade',
      reason: reason || ('Licence fee, no. ' + l.no), licence: l.id
    }, by);
    const rows = all();
    const mine = rows.find(x => x.id === id);
    if (mine) { mine.treasuryNo = entryRow.no; S.write(FILE, rows); }
    return entryRow;
  } catch (_) { return null; }
}

function renew(id, body, by) {
  const rows = all();
  const l = rows.find(x => x.id === String(id || ''));
  if (!l) throw new Error('No such licence.');
  const fee = Math.max(0, Math.round(Number(body.fee === undefined || body.fee === '' ? l.fee : body.fee) || 0));
  l.renewals.push({
    id: S.id(), at: new Date().toISOString(), by: by.name,
    fee, until: clean(body.until, 80), untilIso: isoDate(body.untilIso)
  });
  if (body.until !== undefined) l.until = clean(body.until, 80);
  if (body.untilIso !== undefined) l.untilIso = isoDate(body.untilIso);
  if (l.state === 'lapsed' || l.state === 'suspended') l.state = 'current';
  S.write(FILE, rows);
  if (fee > 0) takeFee(l.id, fee, by, 'Renewal of licence no. ' + l.no);
  Papers.codeFor({
    kind: 'licence', module: 'licences', ref: l.id, no: 'Licence ' + l.no,
    title: 'Licence to trade — ' + (l.sign || l.holder), party: l.holder,
    link: '/licences/' + l.id, issuedBy: by.name, standing: 'Current'
  });
  return l;
}

function amend(id, body, by) {
  const rows = all();
  const l = rows.find(x => x.id === String(id || ''));
  if (!l) throw new Error('No such licence.');
  if (body.holder !== undefined && clean(body.holder, 120)) l.holder = clean(body.holder, 120);
  if (body.sign !== undefined) l.sign = clean(body.sign, 120);
  if (body.place !== undefined) l.place = clean(body.place, 140);
  if (body.terms !== undefined) l.terms = clean(body.terms, 2000);
  if (body.note !== undefined) l.note = clean(body.note, 1000);
  if (body.until !== undefined) l.until = clean(body.until, 80);
  if (body.untilIso !== undefined) l.untilIso = isoDate(body.untilIso);
  if (TRADE_BY_ID[body.trade]) l.trade = body.trade;
  l.amended = { by: by.name, at: new Date().toISOString() };
  S.write(FILE, rows);
  return l;
}

function setState(id, state, why, by) {
  const rows = all();
  const l = rows.find(x => x.id === String(id || ''));
  if (!l) throw new Error('No such licence.');
  if (!STATE_BY_ID[state]) throw new Error('No such standing for a licence.');
  l.state = state;
  l.note = clean(why, 1000) || l.note;
  l.amended = { by: by.name, at: new Date().toISOString() };
  S.write(FILE, rows);
  Papers.codeFor({
    kind: 'licence', module: 'licences', ref: l.id, no: 'Licence ' + l.no,
    title: 'Licence to trade — ' + (l.sign || l.holder), party: l.holder,
    link: '/licences/' + l.id, issuedBy: by.name, standing: stateName(state)
  });
  return l;
}

function strike(id) {
  S.write(FILE, all().filter(l => l.id !== String(id || '')));
  Papers.drop('licences', String(id || ''));
}

function summary() {
  const rows = withState();
  return {
    total: rows.length,
    current: rows.filter(l => l.state === 'current').length,
    lapsed: rows.filter(l => l.state === 'lapsed').length,
    revoked: rows.filter(l => l.state === 'revoked').length,
    taken: rows.reduce((n, l) => n + (Number(l.fee) || 0) + l.renewals.reduce((m, r) => m + (Number(r.fee) || 0), 0), 0)
  };
}

function byTrade() {
  const out = new Map();
  withState().forEach(l => {
    const row = out.get(l.trade) || { trade: l.trade, name: tradeName(l.trade), count: 0, current: 0, taken: 0 };
    row.count += 1;
    if (l.state === 'current') row.current += 1;
    row.taken += (Number(l.fee) || 0) + l.renewals.reduce((m, r) => m + (Number(r.fee) || 0), 0);
    out.set(l.trade, row);
  });
  return Array.from(out.values()).sort((a, b) => b.count - a.count);
}

Papers.resolve('licences', ref => {
  const l = get(ref);
  if (!l) return { gone: true, standing: 'Struck from the roll', inForce: false };
  const st = stateOf(l);
  return {
    title: 'Licence to trade — ' + (l.sign || l.holder), party: l.holder,
    standing: stateName(st), inForce: st === 'current',
    facts: [['What is licensed', tradeName(l.trade)], ['Where', l.place],
      ['Runs until', l.until], ['Standing', stateName(st)]].filter(f => f[1])
  };
});

module.exports = {
  TRADES, TRADE_BY_ID, tradeName, feeFor, STATES, STATE_BY_ID, stateName,
  all, get, withState, current, expiring, search, stateOf,
  grant, renew, amend, setState, strike, summary, byTrade
};
