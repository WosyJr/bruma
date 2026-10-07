const S = require('./store');
const Papers = require('./papers');

const FILE = 'watch-reports.json';

const KINDS = [
  { id: 'incident', name: 'Incident Report', note: 'Something happened and the Watch saw it or was called to it.' },
  { id: 'arrest', name: 'Arrest Report', note: 'A person was taken and what was done with them.' },
  { id: 'investigative', name: 'Investigative Report', note: 'What was followed up, and what came of it.' },
  { id: 'security', name: 'Security Report', note: 'A standing concern: a person, a place, a weakness.' },
  { id: 'criminal', name: 'Criminal Report', note: 'A crime laid out for the court.' },
  { id: 'patrol', name: 'Patrol Log', note: 'A round walked and what was found on it.' }
];
const KIND_BY_ID = Object.fromEntries(KINDS.map(k => [k.id, k]));
const kindName = id => (KIND_BY_ID[id] ? KIND_BY_ID[id].name : 'Incident Report');
const kindNote = id => (KIND_BY_ID[id] ? KIND_BY_ID[id].note : '');

const STATES = [
  { id: 'open', name: 'Open', tag: 'gold' },
  { id: 'investigating', name: 'Under investigation', tag: 'gold' },
  { id: 'referred', name: 'Referred to the court', tag: 'in' },
  { id: 'closed', name: 'Closed', tag: '' }
];
const STATE_BY_ID = Object.fromEntries(STATES.map(s => [s.id, s]));
const stateName = id => (STATE_BY_ID[id] ? STATE_BY_ID[id].name : 'Open');

const ROLES = [
  { id: 'suspect', name: 'Suspect', tag: 'out' },
  { id: 'arrested', name: 'Arrested', tag: 'out' },
  { id: 'victim', name: 'Victim', tag: '' },
  { id: 'witness', name: 'Witness', tag: '' },
  { id: 'involved', name: 'Involved', tag: '' },
  { id: 'officer', name: 'Officer of the Watch', tag: 'in' }
];
const ROLE_BY_ID = Object.fromEntries(ROLES.map(r => [r.id, r]));
const roleName = id => (ROLE_BY_ID[id] ? ROLE_BY_ID[id].name : 'Involved');

const clean = (v, n) => String(v === undefined || v === null ? '' : v).trim().slice(0, n);
const lines = (v, n) => String(v === undefined || v === null ? '' : v)
  .split('\n').map(x => x.trim()).filter(Boolean).slice(0, n);

function every() { return S.read(FILE, []); }
function all() { return every().slice().sort((a, b) => b.no - a.no); }
function get(id) { return every().find(r => r.id === String(id || '')) || null; }
function open() { return all().filter(r => r.state === 'open' || r.state === 'investigating'); }
function mine(username) {
  const u = String(username || '');
  return all().filter(r => r.by === u || (r.addenda || []).some(a => a.by === u));
}

function nextNumber(rows) {
  return rows.reduce((n, r) => Math.max(n, Number(r.no) || 0), 0) + 1;
}

function readPersons(body) {
  const names = lines(body.pname, 24);
  const races = lines(body.prace === undefined ? '' : body.prace, 24);
  const roles = lines(body.prole === undefined ? '' : body.prole, 24);
  if (Array.isArray(body.pname)) {
    return body.pname.map((n, i) => ({
      name: clean(n, 120),
      race: clean(Array.isArray(body.prace) ? body.prace[i] : '', 60),
      role: ROLE_BY_ID[Array.isArray(body.prole) ? body.prole[i] : ''] ? body.prole[i] : 'involved'
    })).filter(p => p.name);
  }
  return names.map((n, i) => ({
    name: clean(n, 120),
    race: clean(races[i] || '', 60),
    role: ROLE_BY_ID[roles[i]] ? roles[i] : 'involved'
  })).filter(p => p.name);
}

function file(body, by) {
  const title = clean(body.title, 180);
  if (!title) throw new Error('Give the report a heading.');
  const event = clean(body.event, 12000);
  if (!event) throw new Error('Set down what happened.');

  const rows = every();
  const row = {
    id: S.id(),
    no: nextNumber(rows),
    kind: KIND_BY_ID[body.kind] ? body.kind : 'incident',
    state: STATE_BY_ID[body.state] ? body.state : 'open',
    title,
    when: clean(body.when, 120),
    location: clean(body.location, 180),
    assisting: lines(body.assisting, 12).map(a => clean(a, 120)),
    persons: readPersons(body),
    event,
    actions: clean(body.actions, 4000),
    disposition: clean(body.disposition, 1000),
    matter: clean(body.matter, 60),
    commitment: clean(body.commitment, 60),
    addenda: [],
    by: by.username,
    byName: by.name,
    byStyle: clean(by.style || by.officeName || '', 120),
    at: new Date().toISOString()
  };
  rows.push(row);
  S.write(FILE, rows);
  register(row);
  return row;
}

function amend(id, body, by) {
  const rows = every();
  const r = rows.find(x => x.id === String(id || ''));
  if (!r) throw new Error('No such report.');
  if (body.title !== undefined && clean(body.title, 180)) r.title = clean(body.title, 180);
  if (KIND_BY_ID[body.kind]) r.kind = body.kind;
  if (STATE_BY_ID[body.state]) r.state = body.state;
  if (body.when !== undefined) r.when = clean(body.when, 120);
  if (body.location !== undefined) r.location = clean(body.location, 180);
  if (body.assisting !== undefined) r.assisting = lines(body.assisting, 12).map(a => clean(a, 120));
  if (body.pname !== undefined) r.persons = readPersons(body);
  if (body.event !== undefined && clean(body.event, 12000)) r.event = clean(body.event, 12000);
  if (body.actions !== undefined) r.actions = clean(body.actions, 4000);
  if (body.disposition !== undefined) r.disposition = clean(body.disposition, 1000);
  if (body.matter !== undefined) r.matter = clean(body.matter, 60);
  if (body.commitment !== undefined) r.commitment = clean(body.commitment, 60);
  r.amended = { by: by.name, at: new Date().toISOString() };
  S.write(FILE, rows);
  register(r);
  return r;
}

function setState(id, state, by) {
  const rows = every();
  const r = rows.find(x => x.id === String(id || ''));
  if (!r) throw new Error('No such report.');
  if (!STATE_BY_ID[state]) throw new Error('That is not a standing a report may have.');
  r.state = state;
  r.amended = { by: by.name, at: new Date().toISOString() };
  S.write(FILE, rows);
  register(r);
  return r;
}

function addendum(id, body, by) {
  const text = clean(body.text, 8000);
  if (!text) throw new Error('Write what you are adding.');
  const rows = every();
  const r = rows.find(x => x.id === String(id || ''));
  if (!r) throw new Error('No such report.');
  r.addenda = r.addenda || [];
  r.addenda.push({
    id: S.id(), text,
    by: by.username, byName: by.name,
    byStyle: clean(by.style || by.officeName || '', 120),
    when: clean(body.when, 120),
    at: new Date().toISOString()
  });
  S.write(FILE, rows);
  register(r);
  return r;
}

function removeAddendum(id, aid) {
  const rows = every();
  const r = rows.find(x => x.id === String(id || ''));
  if (!r) return null;
  r.addenda = (r.addenda || []).filter(a => a.id !== String(aid || ''));
  S.write(FILE, rows);
  return r;
}

function strike(id) {
  S.write(FILE, every().filter(r => r.id !== String(id || '')));
  Papers.drop('reports', String(id || ''));
}

// A paper names one party. A report may touch a dozen people, so the paper
// carries whoever it is chiefly about — the one taken, else the one suspected,
// else the first named — and the rest are read off the report itself.
function principal(r) {
  const ps = (r.persons || []).filter(p => p.name);
  if (!ps.length) return '';
  const order = ['arrested', 'suspect', 'victim', 'witness', 'involved', 'officer'];
  for (let i = 0; i < order.length; i++) {
    const hit = ps.find(p => p.role === order[i]);
    if (hit) return hit.name;
  }
  return ps[0].name;
}

function register(r) {
  Papers.codeFor({
    kind: 'report', module: 'reports', ref: r.id,
    no: 'Report ' + r.no, title: r.title,
    party: principal(r),
    link: '/watch/reports/' + r.id, issuedBy: r.byName,
    standing: stateName(r.state),
    facts: [['What kind', kindName(r.kind)], ['Reported by', r.byName]]
  });
}

// Papers written before a report carried one party hold every name joined
// together, which put two people on one line of the People page. Re-register
// those once, so each paper names only whoever it is chiefly about.
function mendParties() {
  let n = 0;
  all().forEach(r => {
    const paper = Papers.forRef('reports', r.id);
    if (!paper || !/,/.test(String(paper.party || ''))) return;
    register(r);
    n += 1;
  });
  return n;
}

function named(who) {
  const needle = String(who || '').trim().toLowerCase();
  if (!needle) return [];
  return all().filter(r => (r.persons || []).some(p => p.name.toLowerCase() === needle));
}

function search(q, kind, state) {
  const needle = String(q || '').trim().toLowerCase();
  return all().filter(r => {
    if (kind && r.kind !== kind) return false;
    if (state && r.state !== state) return false;
    if (!needle) return true;
    const hay = [r.title, r.location, r.when, r.event, r.actions, r.disposition, r.byName,
      (r.assisting || []).join(' '), (r.persons || []).map(p => p.name + ' ' + p.race).join(' ')].join(' ');
    return hay.toLowerCase().includes(needle);
  });
}

function summary() {
  const rows = all();
  const byKind = {};
  KINDS.forEach(k => { byKind[k.id] = 0; });
  const byState = {};
  STATES.forEach(s => { byState[s.id] = 0; });
  rows.forEach(r => {
    byKind[r.kind] = (byKind[r.kind] || 0) + 1;
    byState[r.state] = (byState[r.state] || 0) + 1;
  });
  const week = Date.now() - 7 * 86400000;
  return {
    total: rows.length,
    byKind, byState,
    live: rows.filter(r => r.state === 'open' || r.state === 'investigating').length,
    thisWeek: rows.filter(r => new Date(r.at).getTime() >= week).length,
    addenda: rows.reduce((n, r) => n + (r.addenda || []).length, 0)
  };
}

Papers.resolve('reports', ref => {
  const r = get(ref);
  if (!r) return { gone: true, standing: 'Struck from the record', inForce: false };
  const others = (r.persons || []).filter(p => p.name && p.name !== principal(r));
  return {
    title: r.title,
    party: principal(r),
    standing: stateName(r.state),
    inForce: r.state !== 'closed',
    facts: [['What kind', kindName(r.kind)], ['Reported by', r.byName],
      ['When', r.when], ['Where', r.location],
      others.length ? ['Others named', others.map(p => p.name).join(', ')] : null,
      ['Standing', stateName(r.state)]].filter(p => p && p[1])
  };
});

module.exports = {
  KINDS, KIND_BY_ID, kindName, kindNote, STATES, STATE_BY_ID, stateName,
  ROLES, ROLE_BY_ID, roleName,
  every, all, get, open, mine, file, amend, setState, addendum, removeAddendum, strike,
  named, search, summary, mendParties
};
