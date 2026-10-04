const S = require('./store');
const Papers = require('./papers');

const FILE = 'service.json';

const KINDS = [
  { id: 'sworn', name: 'Sworn to the County', tag: 'in', weight: 0 },
  { id: 'raised', name: 'Raised to a new office', tag: 'gold', weight: 1 },
  { id: 'moved', name: 'Moved to another office', tag: '', weight: 1 },
  { id: 'posted', name: 'Given a posting', tag: '', weight: 2 },
  { id: 'commended', name: 'Commended', tag: 'in', weight: 3 },
  { id: 'reprimanded', name: 'Reprimanded', tag: 'out', weight: 3 },
  { id: 'wounded', name: 'Wounded in service', tag: 'gold', weight: 3 },
  { id: 'leave', name: 'Given leave', tag: '', weight: 4 },
  { id: 'returned', name: 'Returned to service', tag: '', weight: 4 },
  { id: 'note', name: 'Entered upon the record', tag: '', weight: 5 },
  { id: 'stood', name: 'Stood down from service', tag: 'out', weight: 9 }
];
const KIND_BY_ID = Object.fromEntries(KINDS.map(k => [k.id, k]));
const kindName = id => (KIND_BY_ID[id] ? KIND_BY_ID[id].name : 'Entered upon the record');
const PRAISE = new Set(['commended', 'wounded']);
const MARKS = new Set(['reprimanded']);

const clean = (v, n) => String(v === undefined || v === null ? '' : v).trim().slice(0, n);

function all() { return S.read(FILE, []); }
function get(id) { return all().find(r => r.id === String(id || '')) || null; }

function forWho(username) {
  const un = String(username || '');
  return all().filter(r => r.who === un).sort((a, b) => String(b.at).localeCompare(String(a.at)));
}

function enter(username, body, by) {
  const un = String(username || '').trim().toLowerCase();
  if (!un) throw new Error('Say whose record this goes upon.');
  const text = clean(body.text, 2000);
  const kind = KIND_BY_ID[body.kind] ? body.kind : 'note';
  if (!text && kind === 'note') throw new Error('Write something onto the record.');
  const rows = all();
  const row = {
    id: S.id(),
    who: un,
    name: clean(body.name, 80),
    kind,
    text,
    office: clean(body.office, 60),
    officeName: clean(body.officeName, 80),
    at: body.at || new Date().toISOString(),
    by: by && by.username ? by.username : 'county',
    byName: by && by.name ? by.name : 'The County',
    auto: !!body.auto
  };
  rows.unshift(row);
  S.write(FILE, rows.slice(0, 20000));
  return row;
}

function note(username, kind, text, extra, by) {
  try {
    return enter(username, { kind, text, auto: true, ...(extra || {}) }, by || { username: 'county', name: 'The County' });
  } catch (_) { return null; }
}

function strike(id) {
  S.write(FILE, all().filter(r => r.id !== String(id || '')));
}

function renameWho(username, name) {
  const un = String(username || '').trim().toLowerCase();
  const rows = all();
  let touched = false;
  rows.forEach(r => { if (r.who === un && r.name !== name) { r.name = name; touched = true; } });
  if (touched) S.write(FILE, rows);
}

function watchService(username) {
  try {
    const W = require('./watch');
    const mine = W.shifts().filter(s => s.who === String(username || '') && !s.struck);
    const done = mine.filter(s => s.off);
    const minutes = done.reduce((n, s) => n + (Number(s.minutes) || 0), 0);
    const posts = new Map();
    done.forEach(s => posts.set(s.post, (posts.get(s.post) || 0) + 1));
    const top = Array.from(posts.entries()).sort((a, b) => b[1] - a[1])[0];
    const first = done.reduce((m, s) => (!m || s.on < m ? s.on : m), '');
    const last = done.reduce((m, s) => (!m || s.off > m ? s.off : m), '');
    return {
      shifts: done.length, minutes, hours: Math.round(minutes / 60),
      firstShift: first, lastShift: last,
      favourite: top ? W.postName(top[0]) : '', favouriteCount: top ? top[1] : 0,
      onNow: mine.some(s => !s.off)
    };
  } catch (_) {
    return { shifts: 0, minutes: 0, hours: 0, firstShift: '', lastShift: '', favourite: '', favouriteCount: 0, onNow: false };
  }
}

function record(username, person) {
  const un = String(username || '').trim().toLowerCase();
  const rows = forWho(un);
  const sworn = rows.filter(r => r.kind === 'sworn').sort((a, b) => String(a.at).localeCompare(String(b.at)))[0];
  const since = (sworn && sworn.at) || (person && person.created) || '';
  const days = since ? Math.max(0, Math.floor((Date.now() - new Date(since)) / 86400000)) : 0;
  return {
    who: un,
    name: (person && person.name) || (rows[0] && rows[0].name) || un,
    officeName: (person && person.officeName) || '',
    style: (person && person.style) || '',
    active: person ? person.active !== false : true,
    since,
    days,
    entries: rows,
    commendations: rows.filter(r => PRAISE.has(r.kind)).length,
    marks: rows.filter(r => MARKS.has(r.kind)).length,
    offices: rows.filter(r => r.kind === 'raised' || r.kind === 'moved' || r.kind === 'sworn').length,
    watch: watchService(un)
  };
}

function roll() {
  const U = require('./users');
  return U.list().map(p => {
    const r = record(p.username, p);
    return {
      username: p.username, name: p.name, officeName: p.officeName, active: p.active,
      since: r.since, days: r.days, entries: r.entries.length,
      commendations: r.commendations, marks: r.marks,
      hours: r.watch.hours, shifts: r.watch.shifts
    };
  }).sort((a, b) => b.days - a.days);
}

function certificate(username, person, by) {
  const r = record(username, person);
  return Papers.codeFor({
    kind: 'service', module: 'service', ref: String(username || '').toLowerCase(),
    no: '', title: 'Service of ' + r.name, party: r.name,
    link: '/officers/' + username, issuedBy: (by && by.name) || 'The County',
    standing: r.active ? 'In service' : 'Stood down',
    facts: [['Office', r.officeName], ['Sworn', r.since ? r.since.slice(0, 10) : '']]
  });
}

Papers.resolve('service', ref => {
  let person = null;
  try { person = require('./users').view(ref); } catch (_) { person = null; }
  const r = record(ref, person);
  if (!person && !r.entries.length) return { gone: true, standing: 'Not upon the rolls', inForce: false };
  return {
    title: 'Service of ' + r.name, party: r.name,
    standing: r.active ? 'In service of the County' : 'Stood down',
    inForce: r.active,
    facts: [['Office', r.officeName], ['In service', r.days + (r.days === 1 ? ' day' : ' days')],
      ['Hours on the watch', String(r.watch.hours)],
      ['Commendations', String(r.commendations)]].filter(f => f[1])
  };
});

module.exports = {
  KINDS, KIND_BY_ID, kindName, PRAISE, MARKS,
  all, get, forWho, enter, note, strike, renameWho, record, roll, watchService, certificate
};
