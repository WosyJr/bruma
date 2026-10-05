const S = require('./store');
const Papers = require('./papers');

const FILE = 'deeds.json';

const KINDS = [
  { id: 'grant', name: 'Grant in fee', note: 'The holding is given outright. It passes to the holder and their heirs.' },
  { id: 'lease', name: 'Lease for a term', note: 'The holding is let for a stated term at a stated rent.' },
  { id: 'tenancy', name: 'Tenancy at will', note: 'Held at the pleasure of the County, and may be ended at any time.' },
  { id: 'transfer', name: 'Transfer', note: 'The holding passes from one hand to another with the County’s leave.' },
  { id: 'charge', name: 'Charge upon the holding', note: 'A debt or duty is laid upon the holding itself, not the holder.' }
];
const KIND_BY_ID = Object.fromEntries(KINDS.map(k => [k.id, k]));
const kindName = id => (KIND_BY_ID[id] ? KIND_BY_ID[id].name : 'Grant in fee');
const kindNote = id => (KIND_BY_ID[id] ? KIND_BY_ID[id].note : '');

const STATES = [
  { id: 'force', name: 'In force', tag: 'in' },
  { id: 'surrendered', name: 'Surrendered', tag: '' },
  { id: 'expired', name: 'Expired', tag: '' },
  { id: 'revoked', name: 'Revoked', tag: 'out' },
  { id: 'void', name: 'Void from the first', tag: 'out' }
];
const STATE_BY_ID = Object.fromEntries(STATES.map(s => [s.id, s]));
const stateName = id => (STATE_BY_ID[id] ? STATE_BY_ID[id].name : 'In force');

const PERIODS = [
  { id: 'year', name: 'the year', per: 1 },
  { id: 'season', name: 'the season', per: 4 },
  { id: 'month', name: 'the month', per: 12 },
  { id: 'none', name: 'no rent', per: 0 }
];
const PERIOD_BY_ID = Object.fromEntries(PERIODS.map(p => [p.id, p]));
const periodName = id => (PERIOD_BY_ID[id] ? PERIOD_BY_ID[id].name : 'the year');

const clean = (v, n) => String(v === undefined || v === null ? '' : v).trim().slice(0, n);

function every() { return S.read(FILE, []); }
function all() { return every().slice().sort((a, b) => b.no - a.no); }
function get(id) { return every().find(d => d.id === String(id || '')) || null; }
function forHolding(propId) {
  const k = String(propId || '');
  return every().filter(d => d.prop === k).sort((a, b) => b.no - a.no);
}
function liveFor(propId) {
  return forHolding(propId).find(d => d.state === 'force') || null;
}
function inForce() { return all().filter(d => d.state === 'force'); }

function nextNumber(rows) {
  return rows.reduce((n, r) => Math.max(n, Number(r.no) || 0), 0) + 1;
}

function draw(body, by) {
  const P = require('./property');
  const prop = P.get(body.prop);
  if (!prop) throw new Error('Name the holding this deed is drawn upon.');
  const holder = clean(body.holder, 120);
  if (!holder) throw new Error('Name who takes the holding.');

  const rows = every();
  const live = liveFor(prop.id);
  const row = {
    id: S.id(),
    no: nextNumber(rows),
    prop: prop.id,
    propName: prop.name,
    holder,
    kind: KIND_BY_ID[body.kind] ? body.kind : 'grant',
    state: 'force',
    from: clean(body.from, 80),
    term: clean(body.term, 120),
    rent: Math.max(0, Math.round(Number(body.rent) || 0)),
    per: PERIOD_BY_ID[body.per] ? body.per : 'year',
    terms: clean(body.terms, 4000),
    witness: clean(body.witness, 200),
    consider: clean(body.consider, 160),
    supersedes: live ? live.id : '',
    drawnBy: by.username,
    drawnByName: by.name,
    at: new Date().toISOString(),
    endedBy: '', endedAt: '', endNote: ''
  };
  rows.push(row);
  S.write(FILE, rows);

  if (live) {
    const again = every();
    const old = again.find(d => d.id === live.id);
    if (old) {
      old.state = 'surrendered';
      old.endedBy = by.name;
      old.endedAt = row.at;
      old.endNote = 'Superseded by deed no. ' + row.no + '.';
      S.write(FILE, again);
    }
  }

  try {
    const Prop = require('./property');
    Prop.amend(prop.id, { holder, state: 'held', rent: row.rent }, by);
  } catch (_) {}

  Papers.codeFor({
    kind: 'deed', module: 'deeds', ref: row.id, no: 'Deed ' + row.no,
    title: kindName(row.kind) + ' — ' + prop.name, party: holder,
    link: '/property/deeds/' + row.id, issuedBy: by.name, standing: 'In force',
    facts: [['Holding', prop.name], ['What kind', kindName(row.kind)]]
  });
  return get(row.id) || row;
}

function amend(id, body, by) {
  const rows = every();
  const d = rows.find(x => x.id === String(id || ''));
  if (!d) throw new Error('No such deed.');
  if (d.state !== 'force') throw new Error('A deed that is no longer in force is not amended. Draw a new one.');
  if (body.holder !== undefined && clean(body.holder, 120)) d.holder = clean(body.holder, 120);
  if (KIND_BY_ID[body.kind]) d.kind = body.kind;
  if (body.from !== undefined) d.from = clean(body.from, 80);
  if (body.term !== undefined) d.term = clean(body.term, 120);
  if (body.rent !== undefined) d.rent = Math.max(0, Math.round(Number(body.rent) || 0));
  if (PERIOD_BY_ID[body.per]) d.per = body.per;
  if (body.terms !== undefined) d.terms = clean(body.terms, 4000);
  if (body.witness !== undefined) d.witness = clean(body.witness, 200);
  if (body.consider !== undefined) d.consider = clean(body.consider, 160);
  d.amended = { by: by.name, at: new Date().toISOString() };
  S.write(FILE, rows);
  try {
    require('./property').amend(d.prop, { holder: d.holder, rent: d.rent }, by);
  } catch (_) {}
  return d;
}

function end(id, body, by) {
  const rows = every();
  const d = rows.find(x => x.id === String(id || ''));
  if (!d) throw new Error('No such deed.');
  const state = STATE_BY_ID[body.state] && body.state !== 'force' ? body.state : 'surrendered';
  d.state = state;
  d.endedBy = by.name;
  d.endedAt = new Date().toISOString();
  d.endNote = clean(body.note, 1000);
  S.write(FILE, rows);
  Papers.codeFor({
    kind: 'deed', module: 'deeds', ref: d.id, no: 'Deed ' + d.no,
    title: kindName(d.kind) + ' — ' + d.propName, party: d.holder,
    link: '/property/deeds/' + d.id, issuedBy: d.drawnByName, standing: stateName(state)
  });
  if (!liveFor(d.prop)) {
    try { require('./property').amend(d.prop, { state: 'vacant', holder: '' }, by); } catch (_) {}
  }
  return d;
}

function strike(id) {
  S.write(FILE, every().filter(d => d.id !== String(id || '')));
  Papers.drop('deeds', String(id || ''));
}

function yearly(d) {
  const p = PERIOD_BY_ID[d.per] || PERIOD_BY_ID.year;
  return Math.round((Number(d.rent) || 0) * p.per);
}

function summary() {
  const rows = all();
  const live = rows.filter(d => d.state === 'force');
  const byKind = {};
  KINDS.forEach(k => { byKind[k.id] = 0; });
  live.forEach(d => { byKind[d.kind] = (byKind[d.kind] || 0) + 1; });
  return {
    total: rows.length,
    inForce: live.length,
    ended: rows.length - live.length,
    byKind,
    rentYear: live.reduce((n, d) => n + yearly(d), 0)
  };
}

function search(q) {
  const needle = String(q || '').trim().toLowerCase();
  const rows = all();
  if (!needle) return rows;
  return rows.filter(d => (d.propName + ' ' + d.holder + ' ' + kindName(d.kind) + ' ' + d.terms).toLowerCase().includes(needle));
}

Papers.resolve('deeds', ref => {
  const d = get(ref);
  if (!d) return { gone: true, standing: 'Struck from the roll', inForce: false };
  return {
    title: kindName(d.kind) + ' — ' + d.propName, party: d.holder,
    standing: stateName(d.state), inForce: d.state === 'force',
    facts: [['Holding', d.propName], ['What kind', kindName(d.kind)],
      ['Held by', d.holder],
      d.rent ? ['Rent', d.rent.toLocaleString('en-GB') + ' septims by ' + periodName(d.per)] : null,
      ['Standing', stateName(d.state)]].filter(Boolean)
  };
});

module.exports = {
  KINDS, KIND_BY_ID, kindName, kindNote, STATES, STATE_BY_ID, stateName,
  PERIODS, PERIOD_BY_ID, periodName,
  every, all, get, forHolding, liveFor, inForce, draw, amend, end, strike,
  yearly, summary, search
};
