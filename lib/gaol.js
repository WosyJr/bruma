const S = require('./store');
const Papers = require('./papers');

const FILE = 'gaol.json';

const PLACES = [
  { id: 'castle', name: 'The cells beneath Castle Bruma' },
  { id: 'gate', name: 'The lock-up at the North Gate' },
  { id: 'house', name: 'Kept at their own house' },
  { id: 'chapel', name: 'Given over to the Chapel' }
];
const PLACE_BY_ID = Object.fromEntries(PLACES.map(p => [p.id, p]));
const placeName = id => (PLACE_BY_ID[id] ? PLACE_BY_ID[id].name : 'The cells beneath Castle Bruma');

const GROUNDS = [
  { id: 'sentence', name: 'Serving a sentence of the court' },
  { id: 'await', name: 'Held to await the bench' },
  { id: 'surety', name: 'Held for want of surety' },
  { id: 'peace', name: 'Taken up for the peace' },
  { id: 'crown', name: 'Held at the pleasure of the County' }
];
const GROUND_BY_ID = Object.fromEntries(GROUNDS.map(g => [g.id, g]));
const groundName = id => (GROUND_BY_ID[id] ? GROUND_BY_ID[id].name : 'Held to await the bench');

function all() { return S.read(FILE, []); }
function get(id) { return all().find(r => r.id === String(id || '')) || null; }
function held() { return all().filter(r => !r.released); }
function past() { return all().filter(r => r.released); }
function forMatter(matterId) { return all().filter(r => r.matterId === String(matterId || '')); }

function nextNumber(rows) {
  return rows.reduce((m, r) => Math.max(m, Number(r.no) || 0), 0) + 1;
}

const clean = (v, n) => String(v === undefined || v === null ? '' : v).trim().slice(0, n);

function commit(body, by) {
  const who = clean(body.who, 120);
  if (!who) throw new Error('Name who is being held.');
  const ground = clean(body.account, 4000);
  if (!ground) throw new Error('Set down on what ground they are held.');

  const rows = all();
  if (rows.some(r => !r.released && r.who.toLowerCase() === who.toLowerCase())) {
    throw new Error(who + ' is already held. Release them before committing them again.');
  }

  let matter = null;
  if (body.matterId) {
    try { matter = require('./court').get(body.matterId); } catch (_) { matter = null; }
  }

  const row = {
    id: S.id(),
    no: nextNumber(rows),
    who,
    place: PLACE_BY_ID[body.place] ? body.place : 'castle',
    why: GROUND_BY_ID[body.why] ? body.why : 'await',
    account: ground,
    articles: matter && Array.isArray(matter.articles) ? matter.articles.slice(0, 12) : [],
    matterId: matter ? matter.id : '',
    matterNo: matter ? matter.no : '',
    term: clean(body.term, 160),
    due: clean(body.due, 80),
    dueIso: /^\d{4}-\d{2}-\d{2}$/.test(String(body.dueIso || '')) ? String(body.dueIso) : '',
    taken: clean(body.taken, 160),
    committedBy: by.username,
    committedByName: by.name,
    committedAt: new Date().toISOString(),
    released: false,
    releasedBy: '',
    releasedByName: '',
    releasedAt: '',
    releaseWhy: '',
    releaseNote: '',
    note: '',
    log: []
  };
  row.log.push({ id: S.id(), text: 'Committed to ' + placeName(row.place) + '.', by: by.name, at: row.committedAt });
  rows.unshift(row);
  S.write(FILE, rows);

  Papers.codeFor({
    kind: 'commitment', module: 'gaol', ref: row.id, no: 'Commitment ' + row.no,
    title: 'Commitment of ' + row.who, party: row.who,
    link: '/gaol/' + row.id, issuedBy: by.name, standing: 'held',
    facts: [['On what ground', groundName(row.why)], ['Held at', placeName(row.place)]]
  });
  return row;
}

function amend(id, body, by) {
  const rows = all();
  const r = rows.find(x => x.id === String(id || ''));
  if (!r) throw new Error('No such entry in the gaol book.');
  if (r.released) throw new Error('That person is already released. The book does not change after.');
  const was = r.place;
  if (PLACE_BY_ID[body.place]) r.place = body.place;
  if (GROUND_BY_ID[body.why]) r.why = body.why;
  if (body.term !== undefined) r.term = clean(body.term, 160);
  if (body.due !== undefined) r.due = clean(body.due, 80);
  if (body.dueIso !== undefined) r.dueIso = /^\d{4}-\d{2}-\d{2}$/.test(String(body.dueIso)) ? String(body.dueIso) : '';
  if (body.note !== undefined) r.note = clean(body.note, 1000);
  if (was !== r.place) {
    r.log.push({ id: S.id(), text: 'Moved to ' + placeName(r.place) + '.', by: by.name, at: new Date().toISOString() });
  }
  S.write(FILE, rows);
  return r;
}

function entry(id, text, by) {
  const rows = all();
  const r = rows.find(x => x.id === String(id || ''));
  if (!r) throw new Error('No such entry in the gaol book.');
  const t = clean(text, 1000);
  if (!t) throw new Error('Write something into the book.');
  r.log.push({ id: S.id(), text: t, by: by.name, at: new Date().toISOString() });
  S.write(FILE, rows);
  return r;
}

const RELEASE = [
  { id: 'served', name: 'Term served' },
  { id: 'paid', name: 'Fine paid' },
  { id: 'surety', name: 'Surety given' },
  { id: 'order', name: 'Released by order of the court' },
  { id: 'nocase', name: 'No matter to answer' },
  { id: 'pardon', name: 'Pardoned by the County' },
  { id: 'escape', name: 'Escaped' },
  { id: 'died', name: 'Died in custody' }
];
const RELEASE_BY_ID = Object.fromEntries(RELEASE.map(r => [r.id, r]));
const releaseName = id => (RELEASE_BY_ID[id] ? RELEASE_BY_ID[id].name : 'Released');

function release(id, body, by) {
  const rows = all();
  const r = rows.find(x => x.id === String(id || ''));
  if (!r) throw new Error('No such entry in the gaol book.');
  if (r.released) throw new Error('They are already out.');
  r.released = true;
  r.releaseWhy = RELEASE_BY_ID[body.why] ? body.why : 'order';
  r.releaseNote = clean(body.note, 1000);
  r.releasedBy = by.username;
  r.releasedByName = by.name;
  r.releasedAt = new Date().toISOString();
  r.log.push({ id: S.id(), text: releaseName(r.releaseWhy) + '. ' + r.releaseNote, by: by.name, at: r.releasedAt });
  S.write(FILE, rows);

  if (r.releaseWhy !== 'escape' && r.releaseWhy !== 'died') {
    Papers.codeFor({
      kind: 'release', module: 'gaol', ref: r.id + ':out', no: 'Release ' + r.no,
      title: 'Release of ' + r.who, party: r.who,
      link: '/gaol/' + r.id, issuedBy: by.name, standing: 'released',
      facts: [['Why released', releaseName(r.releaseWhy)]]
    });
  }
  return r;
}

function strike(id) {
  S.write(FILE, all().filter(r => r.id !== String(id || '')));
  Papers.drop('gaol', String(id || ''));
  Papers.drop('gaol', String(id || '') + ':out');
}

function daysHeld(r) {
  const from = new Date(r.committedAt).getTime();
  const to = r.released && r.releasedAt ? new Date(r.releasedAt).getTime() : Date.now();
  return Math.max(0, Math.floor((to - from) / 86400000));
}

function overdue() {
  const now = new Date().toISOString().slice(0, 10);
  return held().filter(r => r.dueIso && r.dueIso < now);
}

function longHeld(days) {
  const d = Number(days) || 7;
  return held().filter(r => daysHeld(r) >= d);
}

function summary() {
  const h = held();
  return {
    held: h.length,
    awaiting: h.filter(r => r.why === 'await' || r.why === 'surety').length,
    serving: h.filter(r => r.why === 'sentence').length,
    everHeld: all().length,
    longest: h.reduce((m, r) => Math.max(m, daysHeld(r)), 0)
  };
}

Papers.resolve('gaol', ref => {
  const bare = String(ref || '').replace(/:out$/, '');
  const r = get(bare);
  if (!r) return { gone: true, standing: 'Struck from the book', inForce: false };
  const out = String(ref || '').endsWith(':out');
  if (out) {
    return {
      title: 'Release of ' + r.who, party: r.who, standing: releaseName(r.releaseWhy) || 'Released',
      inForce: true,
      facts: [['Held', daysHeld(r) + (daysHeld(r) === 1 ? ' day' : ' days')], ['Released', releaseName(r.releaseWhy)]]
    };
  }
  return {
    title: 'Commitment of ' + r.who, party: r.who,
    standing: r.released ? 'Spent — ' + releaseName(r.releaseWhy) : 'In force — still held',
    inForce: !r.released,
    facts: [['On what ground', groundName(r.why)], ['Held at', placeName(r.place)],
      ['Days held', String(daysHeld(r))]]
  };
});

module.exports = {
  PLACES, PLACE_BY_ID, placeName, GROUNDS, GROUND_BY_ID, groundName,
  RELEASE, RELEASE_BY_ID, releaseName,
  all, get, held, past, forMatter, commit, amend, entry, release, strike,
  daysHeld, overdue, longHeld, summary
};
